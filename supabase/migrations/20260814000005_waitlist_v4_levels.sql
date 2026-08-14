-- =============================================================
-- Waitlist v4: multi-level referral rewards
-- -------------------------------------------------------------
-- The referral ladder never stops at level one:
--   Level 1:  30 sign-ups  -> 1 free AI CV session
--   Level 2:  80 sign-ups  -> 2 free AI CV sessions (chase 50 more)
--   Level 3 (last): 100 sign-ups -> 3 free AI CV sessions
--
-- * Adds free_cv_sessions (count of earned AI CV sessions).
-- * join_waitlist grants the sessions when a member crosses each
--   milestone. Only ACTUAL registrations count (referral_count is
--   bumped only when a real person joins), never mere link opens.
-- * get_waitlist_status returns level + free_cv_sessions so the
--   UI can show the ladder.
-- =============================================================

alter table public.waitlist
  add column if not exists free_cv_sessions int not null default 0;

-- ---------------------------------------------------------------------
-- JOIN the waitlist (server-side, security definer). Email is the ONLY
-- identity that counts; a voucher can never be used twice by the same
-- person; self-referral is never credited.
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
begin
  -- Same email already on the list? Return their row - the same person
  -- (same email) can never join again, so a voucher can never be used twice
  -- by the same person.
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

  -- Generate a unique referral code for the new member.
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  -- Credit the inviter ONLY when the voucher exists AND belongs to a
  -- DIFFERENT email (no self-referral, no monopoly).
  if p_referral_code is not null and btrim(p_referral_code) <> '' then
    select * into v_referrer from public.waitlist
      where upper(referral_code) = upper(btrim(p_referral_code))
      limit 1;
    if v_referrer.id is not null
       and lower(v_referrer.email) <> lower(p_email)  -- never your own code
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
    'cv_session_free', false,
    'free_cv_sessions', 0,
    'level', 0);
end;
$$;

-- ---------------------------------------------------------------------
-- Fetch a member's waitlist status by email (now with level info).
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

grant execute on function public.join_waitlist(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_waitlist_status(text) to anon, authenticated;
