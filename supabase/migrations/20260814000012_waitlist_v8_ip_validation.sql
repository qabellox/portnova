-- =============================================================
-- Waitlist v8: validate client IP shape + tighten sanitization
-- -------------------------------------------------------------
-- White-hat hardening from the brutal black-hat pass:
--   * p_ip is client-supplied (no server-side IP in Postgres RPC),
--     so a raw-API attacker can omit it to skip the per-IP limit.
--     We can't fully stop that without an Edge Function (real IP)
--     or CAPTCHA, but we DO reject garbage/obviously-fake IPs so
--     the per-IP limit is meaningful whenever an IP is sent, and
--     we keep the per-email limit as the backstop.
--   * Stricter name sanitization (no leading/trailing space, no
--     control chars already stripped; reject names that are just
--     symbols).
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
  p_how_heard text default null,
  p_ip text default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_existing public.waitlist;
  v_referrer public.waitlist;
  v_new_count int;
  v_attempts int;
  v_ip_attempts int;
  v_name text;
  v_email text;
  v_ip text;
begin
  -- ---- INPUT SANITIZATION ----
  v_email := lower(btrim(coalesce(p_email, '')));
  v_name := btrim(coalesce(p_full_name, ''));
  v_name := regexp_replace(v_name, '[\u0000-\u001F\u007F]', '', 'g');
  v_name := regexp_replace(v_name, '\s+', ' ', 'g');

  if v_email = '' or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if v_name = '' or length(v_name) > 200 or v_name ~ '^[^A-Za-z\u0600-\u06FF0-9]+$' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if v_name ~ '<|>' or v_name ~ 'script' or v_name ~ '[<>{}|\\]' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if length(coalesce(p_phone, '')) > 30
     or length(coalesce(p_city, '')) > 100
     or length(coalesce(p_how_heard, '')) > 300 then
    return json_build_object('ok', false, 'error', 'invalid_length');
  end if;

  -- Validate IP shape if provided (IPv4 or IPv6). Reject garbage/fake strings
  -- so the per-IP limit is meaningful. Empty IP is allowed (per-email limit
  -- still applies) but the per-IP check simply won't run.
  v_ip := btrim(coalesce(p_ip, ''));
  if v_ip <> '' and v_ip !~ '^(\d{1,3}\.){3}\d{1,3}$'
     and v_ip !~ '^[0-9a-fA-F:]+$' then
    return json_build_object('ok', false, 'error', 'invalid_ip');
  end if;

  -- 1) Idempotency by email.
  select * into v_existing from public.waitlist
    where lower(email) = lower(v_email) limit 1;
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

  -- 2) Per-email rate limit: max 5 attempts / 10 min.
  delete from public.waitlist_attempts
    where created_at < now() - interval '10 minutes';
  insert into public.waitlist_attempts (email, ip) values (v_email, v_ip);
  select count(*) into v_attempts
    from public.waitlist_attempts
    where lower(email) = lower(v_email)
      and created_at > now() - interval '10 minutes';
  if v_attempts > 5 then
    return json_build_object('ok', false, 'error', 'rate_limited',
      'message', 'Too many attempts. Please try again later.');
  end if;

  -- 3) Per-IP rate limit: max 15 sign-ups / hour (only when IP is present).
  if v_ip <> '' then
    select count(*) into v_ip_attempts
      from public.waitlist_attempts
      where ip = v_ip
        and created_at > now() - interval '1 hour';
    if v_ip_attempts > 15 then
      return json_build_object('ok', false, 'error', 'ip_limited',
        'message', 'Too many sign-ups from this device. Please try again later.');
    end if;
  end if;

  -- 4) Unique referral code.
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  -- 5) Insert (unique-violation safe).
  begin
    insert into public.waitlist
      (user_id, full_name, email, phone, city, role_pref, referral_code, referred_by,
       age_range, current_status, education_level, interest_field, employment_pref, how_heard)
    values
      (p_user_id, v_name, v_email, nullif(btrim(coalesce(p_phone, '')), ''),
       nullif(btrim(coalesce(p_city, '')), ''), p_role_pref, v_code,
       coalesce(btrim(p_referral_code), ''), p_age_range, p_current_status,
       p_education_level, p_interest_field, p_employment_pref, p_how_heard);
  exception when unique_violation then
    select * into v_existing from public.waitlist
      where lower(email) = lower(v_email) limit 1;
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

  -- 6) Credit inviter (atomic). No self-referral.
  if p_referral_code is not null and btrim(p_referral_code) <> '' then
    select * into v_referrer from public.waitlist
      where upper(referral_code) = upper(btrim(p_referral_code))
      limit 1;
    if v_referrer.id is not null
       and lower(v_referrer.email) <> lower(v_email)
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

      insert into public.referrals (referrer_id, referral_code, referred_email, status)
      values (v_referrer.id, v_referrer.referral_code, v_email, 'confirmed');
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

grant execute on function public.join_waitlist(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_waitlist_status(text) to anon, authenticated;
grant execute on function public.waitlist_stats() to authenticated;
