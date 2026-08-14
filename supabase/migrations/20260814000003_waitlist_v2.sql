-- =============================================================
-- Waitlist v2: premium segmentation fields + referral threshold 20
-- -------------------------------------------------------------
-- Adds richer data points (age, status, education, interest,
-- employment preference, how they heard) and raises the referral
-- reward from 3 to 20 friends for a free CV session.
-- =============================================================

alter table public.waitlist
  add column if not exists age_range text,
  add column if not exists current_status text,
  add column if not exists education_level text,
  add column if not exists interest_field text,
  add column if not exists employment_pref text,
  add column if not exists how_heard text;

-- Drop the v1 signature (7 params) so there is exactly one join_waitlist.
drop function if exists public.join_waitlist(uuid, text, text, text, text, text, text);

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
begin
  -- Already on the list? return their row (idempotent).
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

  -- Credit the inviter (if a valid code was provided). 20 friends = free CV.
  if p_referral_code is not null and btrim(p_referral_code) <> '' then
    select * into v_referrer from public.waitlist
      where upper(referral_code) = upper(btrim(p_referral_code))
      limit 1;
    if v_referrer.id is not null then
      update public.waitlist
         set referral_count = referral_count + 1,
             cv_session_free = (referral_count + 1 >= 20)
       where id = v_referrer.id;
    end if;
  end if;

  insert into public.waitlist
    (user_id, full_name, email, phone, city, role_pref, referral_code, referred_by,
     age_range, current_status, education_level, interest_field, employment_pref, how_heard)
  values
    (p_user_id, p_full_name, p_email, p_phone, p_city, p_role_pref, v_code,
     coalesce(btrim(p_referral_code), ''), p_age_range, p_current_status,
     p_education_level, p_interest_field, p_employment_pref, p_how_heard);

  return json_build_object('ok', true, 'already', false,
    'referral_code', v_code,
    'referral_count', 0,
    'cv_session_free', false);
end;
$$;

grant execute on function public.join_waitlist(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_waitlist_status(text) to anon, authenticated;
