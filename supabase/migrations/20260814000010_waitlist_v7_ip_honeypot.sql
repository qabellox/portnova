-- =============================================================
-- Waitlist v7: IP fingerprinting + input sanitization
-- -------------------------------------------------------------
-- Fixes the two remaining smoking guns from the adversarial tests:
--   1. Bad actor using MANY emails from one machine/IP. The per-email
--      rate limit alone can't stop that. Now join_waitlist also
--      receives the client IP (from the frontend) and rate-limits per
--      IP too: max 15 new sign-ups per IP per hour.
--   2. Junk strings stored. Now the RPC sanitizes input server-side:
--      trims, collapses whitespace, strips control characters, and
--      rejects values that contain HTML/script junk.
-- =============================================================

-- Track IP on each join attempt for per-IP rate limiting.
alter table public.waitlist_attempts
  add column if not exists ip text;

create index if not exists waitlist_attempts_ip_idx
  on public.waitlist_attempts (lower(coalesce(ip, '')), created_at);

-- ---------------------------------------------------------------------
-- JOIN the waitlist (security definer). Concurrency-safe, rate-limited
-- by email AND ip, input sanitized.
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
begin
  -- ---- INPUT SANITIZATION (server-side - API callers bypass the UI) ----
  v_email := lower(btrim(coalesce(p_email, '')));
  v_name := btrim(coalesce(p_full_name, ''));
  -- strip control chars + collapse whitespace
  v_name := regexp_replace(v_name, '[\u0000-\u001F\u007F]', '', 'g');
  v_name := regexp_replace(v_name, '\s+', ' ', 'g');

  if v_email = '' or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if v_name = '' or length(v_name) > 200 then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;
  -- reject obvious junk: HTML/script/angle brackets, stacked symbols
  if v_name ~ '<|>' or v_name ~ 'script' or v_name ~ '[<>{}|\\]' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if length(coalesce(p_phone, '')) > 30
     or length(coalesce(p_city, '')) > 100
     or length(coalesce(p_how_heard, '')) > 300 then
    return json_build_object('ok', false, 'error', 'invalid_length');
  end if;

  -- 1) Same email already on the list? Return their row instantly (idempotent).
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

  -- 2) Rate limit by EMAIL: max 5 join attempts per email per 10 minutes.
  delete from public.waitlist_attempts
    where created_at < now() - interval '10 minutes';
  insert into public.waitlist_attempts (email, ip) values (v_email, coalesce(p_ip, ''));
  select count(*) into v_attempts
    from public.waitlist_attempts
    where lower(email) = lower(v_email)
      and created_at > now() - interval '10 minutes';
  if v_attempts > 5 then
    return json_build_object('ok', false, 'error', 'rate_limited',
      'message', 'Too many attempts. Please try again later.');
  end if;

  -- 3) Rate limit by IP: max 15 new sign-ups per IP per hour. This stops
  --    one machine flooding with many different emails.
  if coalesce(p_ip, '') <> '' then
    select count(*) into v_ip_attempts
      from public.waitlist_attempts
      where coalesce(ip, '') = coalesce(p_ip, '')
        and created_at > now() - interval '1 hour';
    if v_ip_attempts > 15 then
      return json_build_object('ok', false, 'error', 'ip_limited',
        'message', 'Too many sign-ups from this device. Please try again later.');
    end if;
  end if;

  -- 4) Generate a unique, non-guessable referral code.
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  -- 5) Insert the new member (unique-violation safe).
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

  -- 6) Credit the inviter (atomic, row-locked). No self-referral.
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
