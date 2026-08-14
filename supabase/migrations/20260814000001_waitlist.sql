-- =============================================================
-- Waitlist for the PortNova launch teaser
-- -------------------------------------------------------------
-- Collects names/emails/phones BEFORE the public release so the
-- platform has a warm audience the day it opens. Each member gets
-- a unique referral code; referring 3 friends unlocks a FREE CV
-- session at launch (cv_session_free = true).
--
-- Security:
--   * Server-side RPC (security definer) generates codes, counts
--     referrals and grants the reward - users can't cheat.
--   * Users can only SELECT their own row (by auth.uid()).
-- =============================================================

create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  city text,
  role_pref text,            -- what they're interested in (jobs/courses/cv)
  referral_code text unique,
  referred_by text,          -- the code they used to join
  referral_count int not null default 0,
  cv_session_free boolean not null default false,
  status text not null default 'waiting',  -- waiting | invited | active
  created_at timestamptz not null default now()
);

create index if not exists waitlist_email_idx on public.waitlist (lower(email));
create index if not exists waitlist_referral_code_idx on public.waitlist (referral_code);

alter table public.waitlist enable row level security;

drop policy if exists "waitlist select own" on public.waitlist;
create policy "waitlist select own" on public.waitlist
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- JOIN the waitlist (server-side, idempotent). Generates the member's
-- referral code, credits the inviter, and grants the free CV session
-- once an inviter reaches REFERRALS_NEEDED (3) sign-ups.
-- ---------------------------------------------------------------------
create or replace function public.join_waitlist(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_city text default null,
  p_role_pref text default null,
  p_referral_code text default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_existing public.waitlist;
  v_referrer public.waitlist;
begin
  -- Already on the list? return their row (idempotent - no duplicate signups).
  select * into v_existing from public.waitlist
    where lower(email) = lower(p_email) limit 1;
  if v_existing.id is not null then
    return json_build_object('ok', true, 'already', true,
      'referral_code', v_existing.referral_code,
      'referral_count', v_existing.referral_count,
      'cv_session_free', v_existing.cv_session_free);
  end if;

  -- Generate a unique referral code for the new member.
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  -- Credit the inviter (if a valid code was provided).
  if p_referral_code is not null and btrim(p_referral_code) <> '' then
    select * into v_referrer from public.waitlist
      where upper(referral_code) = upper(btrim(p_referral_code))
      limit 1;
    if v_referrer.id is not null then
      update public.waitlist
         set referral_count = referral_count + 1,
             cv_session_free = (referral_count + 1 >= 3)  -- 3 friends = free CV
       where id = v_referrer.id;
    end if;
  end if;

  insert into public.waitlist
    (user_id, full_name, email, phone, city, role_pref, referral_code, referred_by)
  values
    (p_user_id, p_full_name, p_email, p_phone, p_city, p_role_pref,
     v_code, coalesce(btrim(p_referral_code), ''));

  return json_build_object('ok', true, 'already', false,
    'referral_code', v_code,
    'referral_count', 0,
    'cv_session_free', false);
end;
$$;

-- ---------------------------------------------------------------------
-- Fetch a member's waitlist status by email.
-- ---------------------------------------------------------------------
create or replace function public.get_waitlist_status(p_email text)
returns json
language sql security definer set search_path = public
as $$
  select coalesce((
    select json_build_object(
      'on_list', true,
      'referral_code', w.referral_code,
      'referral_count', w.referral_count,
      'cv_session_free', w.cv_session_free,
      'status', w.status
    ) from public.waitlist w where lower(w.email) = lower(p_email) limit 1
  ), json_build_object('on_list', false));
$$;

grant execute on function public.join_waitlist(uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_waitlist_status(text) to anon, authenticated;
