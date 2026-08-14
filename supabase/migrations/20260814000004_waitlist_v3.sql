-- =============================================================
-- Waitlist v3: hard one-voucher-per-person rule + no self-referral
-- -------------------------------------------------------------
-- The user's rule: a single person can never use the same voucher
-- twice, and a person is identified ONLY by their email.
--   * Unique index on lower(email) - one row per email, guaranteed
--     at the database level (blocks double joins even under races).
--   * join_waitlist refuses to credit a voucher that belongs to the
--     same email (no self-referral / monopoly) and never re-credits
--     an email that is already on the list.
-- =============================================================

-- De-duplicate any existing rows first (keep the earliest row per email).
delete from public.waitlist a
  using public.waitlist b
  where a.id > b.id
    and lower(a.email) = lower(b.email);

-- The hard guarantee: one waitlist row per email.
create unique index if not exists waitlist_email_uniq
  on public.waitlist (lower(email));

-- ---------------------------------------------------------------------
-- JOIN the waitlist (server-side, security definer). Email is the ONLY
-- identity that counts:
--   * already on the list (same email)? -> return their row, NO credit.
--   * referral code provided? -> credit only if it belongs to someone
--     else (never your own code) and that code exists.
--   * anonymous join is allowed (user_id may be null) - it is just a
--     waitlist, no account required.
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
      'cv_session_free', v_existing.cv_session_free);
  end if;

  -- Generate a unique referral code for the new member.
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  -- Credit the inviter ONLY when the voucher exists AND belongs to a
  -- DIFFERENT email (no self-referral, no monopoly). 20 friends = free CV.
  if p_referral_code is not null and btrim(p_referral_code) <> '' then
    select * into v_referrer from public.waitlist
      where upper(referral_code) = upper(btrim(p_referral_code))
      limit 1;
    if v_referrer.id is not null
       and lower(v_referrer.email) <> lower(p_email)  -- never your own code
    then
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
