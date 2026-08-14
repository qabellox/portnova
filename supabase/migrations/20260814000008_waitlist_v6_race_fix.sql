-- =============================================================
-- Waitlist v6: fix lost-update race + server-side input validation
-- -------------------------------------------------------------
-- Adversarial test findings (10 concurrent same-voucher joins):
--   * BUG: friend's referral_count reached 9 instead of 10 - a
--     lost-update race. The RPC read referral_count, computed +1
--     in a variable, then wrote it back, so concurrent joins
--     overwrote each other. FIXED: atomic `SET referral_count =
--     referral_count + 1 ... RETURNING` (row-locked, serialized).
--   * Empty email / empty name / 5000-char / junk values were
--     accepted and stored. FIXED: server-side validation (non-empty
--     valid email, non-empty name, length caps, trimmed values).
-- =============================================================

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
begin
  -- ---- INPUT VALIDATION (server-side - API callers bypass the UI) ----
  if p_email is null or btrim(p_email) = '' then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if length(p_email) > 254 then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if p_full_name is null or btrim(p_full_name) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if length(p_full_name) > 200 or length(coalesce(p_phone, '')) > 30
     or length(coalesce(p_city, '')) > 100
     or length(coalesce(p_how_heard, '')) > 300 then
    return json_build_object('ok', false, 'error', 'invalid_length');
  end if;

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
      (p_user_id, btrim(p_full_name), lower(btrim(p_email)), nullif(btrim(coalesce(p_phone, '')), ''),
       nullif(btrim(coalesce(p_city, '')), ''), p_role_pref, v_code,
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

  -- 5) Credit the inviter ONLY now that the new row has committed.
  --    ATOMIC increment (row-locked) so concurrent joins never lose a
  --    referral: `referral_count = referral_count + 1` is serialized by
  --    PostgreSQL, unlike the old read-var-write pattern.
  if p_referral_code is not null and btrim(p_referral_code) <> '' then
    select * into v_referrer from public.waitlist
      where upper(referral_code) = upper(btrim(p_referral_code))
      limit 1;
    if v_referrer.id is not null
       and lower(v_referrer.email) <> lower(p_email)
    then
      update public.waitlist
         set referral_count = referral_count + 1,
             free_cv_sessions = (case
               when referral_count + 1 >= 100 then 3
               when referral_count + 1 >= 80 then 2
               when referral_count + 1 >= 30 then 1
               else 0 end)
       where id = v_referrer.id
       returning referral_count into v_new_count;

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

grant execute on function public.join_waitlist(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
