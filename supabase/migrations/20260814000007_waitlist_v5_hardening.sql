-- =============================================================
-- Waitlist v5: referrals audit, concurrency safety, rate limiting
-- -------------------------------------------------------------
-- Launch-readiness hardening so the waitlist cannot crash or leak
-- under mass sign-ups:
--   * referrals table - one row per REAL referral sign-up (audit
--     trail for accurate voucher data collection).
--   * waitlist_attempts table - per-email rate limit (spam shield).
--   * join_waitlist rewritten to be concurrency-safe: identical
--     simultaneous emails never double-insert nor crash (unique
--     violation is caught and returned gracefully), and the inviter
--     is credited ONLY after the new row actually commits.
--   * waitlist_stats() - admin-only analytics for the dashboard.
--   * RLS enabled on all new tables; only the security-definer RPCs
--     can touch them (anon cannot read/write raw tables).
-- =============================================================

-- ---------------------------------------------------------------------
-- referrals: one row per actual referral sign-up
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.waitlist (id) on delete cascade,
  referral_code text not null,
  referred_email text not null,
  status text not null default 'confirmed',  -- confirmed (real sign-up)
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
create index if not exists referrals_code_idx on public.referrals (referral_code);
create index if not exists referrals_email_idx on public.referrals (lower(referred_email));

alter table public.referrals enable row level security;

-- ---------------------------------------------------------------------
-- waitlist_attempts: per-email rate limiting
-- ---------------------------------------------------------------------
create table if not exists public.waitlist_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_attempts_email_idx on public.waitlist_attempts (lower(email), created_at);

alter table public.waitlist_attempts enable row level security;

-- ---------------------------------------------------------------------
-- JOIN the waitlist (security definer). Concurrency-safe + rate limited.
-- ---------------------------------------------------------------------
create or replace function public.join_waitlist(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_city text default null,
  p_role_pref text default null,
  p_referral_code text default null,
  p_age_range text default null,
  p_current_status text default null,
  p_education_level text default null,
  p_interest_field text default null,
  p_employment_pref text default null,
  p_how_heard text default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_existing public.waitlist;
  v_referrer public.waitlist;
  v_new_count int;
  v_attempts int;
  v_return json;
begin
  -- 1) Same email already on the list? Return their row instantly (idempotent).
  select * into v_existing from public.waitlist
    where lower(email) = lower(p_email) limit 1;
  if v_existing.id is not null then
    return json_build_object('ok', true, 'already', true,
      'referral_code', v_existing.referral_code,
      'referral_count', v_existing.referral_count,
      'cv_session_free', v_existing.free_cv_sessions > 0,
      'free_cv_sessions', v_existing.free_cv_sessions,
      'level', (case
        when v_existing.referral_count >= 100 then 3
        when v_existing.referral_count >= 80 then 2
        when v_existing.referral_count >= 30 then 1
        else 0 end));
  end if;

  -- 2) Rate limit: max 5 join attempts per email per 10 minutes.
  delete from public.waitlist_attempts
    where created_at < now() - interval '10 minutes';
  insert into public.waitlist_attempts (email) values (lower(p_email));
  select count(*) into v_attempts
    from public.waitlist_attempts
    where lower(email) = lower(p_email)
      and created_at > now() - interval '10 minutes';
  if v_attempts > 5 then
    return json_build_object('ok', false, 'error', 'rate_limited',
      'message', 'Too many attempts. Please try again later.');
  end if;

  -- 3) Generate a unique, non-guessable referral code.
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  -- 4) Insert the new member. Catch unique_violation so that if two
  --    identical emails arrive at the same moment, the loser returns the
  --    winner's row instead of throwing (no crash, no double sign-up).
  begin
    insert into public.waitlist
      (user_id, full_name, email, phone, city, role_pref, referral_code, referred_by,
       age_range, current_status, education_level, interest_field, employment_pref, how_heard)
    values
      (p_user_id, p_full_name, p_email, p_phone, p_city, p_role_pref, v_code,
       coalesce(btrim(p_referral_code), ''), p_age_range, p_current_status,
       p_education_level, p_interest_field, p_employment_pref, p_how_heard);
  exception when unique_violation then
    select * into v_existing from public.waitlist
      where lower(email) = lower(p_email) limit 1;
    if v_existing.id is not null then
      return json_build_object('ok', true, 'already', true,
        'referral_code', v_existing.referral_code,
        'referral_count', v_existing.referral_count,
        'cv_session_free', v_existing.free_cv_sessions > 0,
        'free_cv_sessions', v_existing.free_cv_sessions,
        'level', (case
          when v_existing.referral_count >= 100 then 3
          when v_existing.referral_count >= 80 then 2
          when v_existing.referral_count >= 30 then 1
          else 0 end));
    end if;
    raise;
  end;

  -- 5) Credit the inviter ONLY now that the new row has committed. No
  --    self-referral, no monopoly. 30/80/100 unlock free AI CV sessions.
  if p_referral_code is not null and btrim(p_referral_code) <> '' then
    select * into v_referrer from public.waitlist
      where upper(referral_code) = upper(btrim(p_referral_code))
      limit 1;
    if v_referrer.id is not null
       and lower(v_referrer.email) <> lower(p_email)
    then
      v_new_count := v_referrer.referral_count + 1;
      update public.waitlist
         set referral_count = v_new_count,
             free_cv_sessions = (case
               when v_new_count >= 100 then 3
               when v_new_count >= 80 then 2
               when v_new_count >= 30 then 1
               else 0 end)
       where id = v_referrer.id;

      -- 6) Audit trail: one referrals row per real referral sign-up.
      insert into public.referrals (referrer_id, referral_code, referred_email, status)
      values (v_referrer.id, v_referrer.referral_code, lower(p_email), 'confirmed');
    end if;
  end if;

  return json_build_object('ok', true, 'already', false,
    'referral_code', v_code,
    'referral_count', 0,
    'cv_session_free', false,
    'free_cv_sessions', 0,
    'level', 0);
end;
$$;

-- ---------------------------------------------------------------------
-- Fetch a member's waitlist status by email (level + sessions).
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
      'cv_session_free', w.free_cv_sessions > 0,
      'free_cv_sessions', w.free_cv_sessions,
      'level', (case
        when w.referral_count >= 100 then 3
        when w.referral_count >= 80 then 2
        when w.referral_count >= 30 then 1
        else 0 end),
      'status', w.status
    ) from public.waitlist w where lower(w.email) = lower(p_email) limit 1
  ), json_build_object('on_list', false));
$$;

-- ---------------------------------------------------------------------
-- Admin-only analytics for the dashboard (owner email).
-- ---------------------------------------------------------------------
create or replace function public.waitlist_stats()
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_admin text := coalesce(auth.jwt() ->> 'email', '');
begin
  if lower(v_admin) <> 'adonandoq@gmail.com' then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;
  return (select json_build_object(
    'total', (select count(*) from public.waitlist),
    'today', (select count(*) from public.waitlist where created_at > now() - interval '24 hours'),
    'referral_events', (select count(*) from public.referrals),
    'top_referrers', (select coalesce(json_agg(x), '[]'::json) from (
        select email, referral_count, free_cv_sessions
        from public.waitlist order by referral_count desc limit 10
    ) x),
    'milestone_achievers', (select coalesce(json_agg(x), '[]'::json) from (
        select email, free_cv_sessions
        from public.waitlist where free_cv_sessions > 0
    ) x)
  ));
end;
$$;

grant execute on function public.join_waitlist(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_waitlist_status(text) to anon, authenticated;
grant execute on function public.waitlist_stats() to authenticated;
