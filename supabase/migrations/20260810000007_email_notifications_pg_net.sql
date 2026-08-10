-- =============================================================
-- PortNova — Autonomous email notifications (pure SQL, no CLI)
-- -------------------------------------------------------------
-- Uses pg_net (built into Supabase) so NO Edge Function / CLI /
-- GitHub integration is needed. Emails fire automatically:
--   * new application   -> emails the job owner (provider)
--   * status change     -> emails the applicant (accepted/rejected)
--
-- HOW TO USE:
--   1. In this file, replace RESEND_API_KEY_HERE with your Resend
--      key (it appears THREE times). Keep the quotes.
--   2. Paste the whole file into Supabase -> SQL Editor -> Run.
--
-- FREE-TIER LIMIT: the default sender onboarding@resend.dev can
--    ONLY deliver to the email you used to sign up at Resend. For
--    real delivery to anyone, add a custom domain in Resend.
--    To see WHY an email failed, after testing run:
--      select id, status_code, error_message from net._http_response order by id desc limit 5;
--    (200 = delivered / 401 = wrong API key / 403 = recipient blocked)
-- =============================================================

create extension if not exists pg_net;

-- ------------------------------------------------------------------
-- 1) New application -> email the job owner
-- ------------------------------------------------------------------
create or replace function public.notify_provider_new_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j_role text;
  j_company text;
  j_owner uuid;
  owner_email text;
begin
  select created_by, role, company into j_owner, j_role, j_company
    from public.jobs where id = new.job_id;
  if j_owner is null then return new; end if;

  select email into owner_email from auth.users where id = j_owner;
  if owner_email is null then return new; end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer RESEND_API_KEY_HERE',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'PortNova <onboarding@resend.dev>',
      'to', jsonb_build_array(owner_email),
      'subject', 'New application: ' || coalesce(new.applicant_name, 'Someone') || ' - ' || coalesce(j_role, 'a job'),
      'html',
        '<p>A new application arrived for <b>' || coalesce(j_role, '') || '</b> at ' || coalesce(j_company, '') || '.</p>' ||
        '<p><b>Applicant:</b> ' || coalesce(new.applicant_name, '') || '<br/>' ||
        '<b>Email:</b> ' || coalesce(new.email, '') || '<br/>' ||
        '<b>Phone:</b> ' || coalesce(new.phone, '-') || '<br/>' ||
        '<b>City:</b> ' || coalesce(new.city, '-') || '</p>' ||
        '<p>Review it in your Studio -> Applicants.</p>'
    )
  );
  return new;
end;
$$;

drop trigger if exists applications_notify_provider on public.applications;
create trigger applications_notify_provider
after insert on public.applications
for each row execute function public.notify_provider_new_application();

-- ------------------------------------------------------------------
-- 2) Status change (accepted / rejected) -> email the applicant
-- ------------------------------------------------------------------
create or replace function public.notify_applicant_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j_role text;
  j_company text;
begin
  if new.app_status not in ('accepted', 'rejected') or new.app_status = old.app_status then
    return new;
  end if;

  select role, company into j_role, j_company from public.jobs where id = new.job_id;

  if new.app_status = 'accepted' then
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer RESEND_API_KEY_HERE', 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'PortNova <onboarding@resend.dev>',
        'to', jsonb_build_array(new.email),
        'subject', 'Application accepted - ' || coalesce(j_role, 'the role'),
        'html', '<p>Great news! <b>' || coalesce(j_company, 'The company') || '</b> accepted your application for <b>' ||
                coalesce(j_role, 'the role') || '</b>.</p><p>They will contact you at ' || new.email || '. Good luck!</p>'
      )
    );
  else
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer RESEND_API_KEY_HERE', 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'PortNova <onboarding@resend.dev>',
        'to', jsonb_build_array(new.email),
        'subject', 'Update on your application - ' || coalesce(j_role, 'the role'),
        'html', '<p>Thank you for applying for <b>' || coalesce(j_role, 'the role') || '</b> at <b>' ||
                coalesce(j_company, 'the company') || '</b>.</p><p>Unfortunately, they moved on with other candidates this time. ' ||
                'Don''t give up - new opportunities are posted on PortNova regularly.</p>'
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists applications_notify_status on public.applications;
create trigger applications_notify_status
after update on public.applications
for each row execute function public.notify_applicant_status();

-- ------------------------------------------------------------------
-- DIAGNOSTIC (run after testing to see what Resend returned):
--   select id, status_code, error_message, created_at
--   from net._http_response order by id desc limit 5;
--   200 = delivered / 401 = bad API key / 403 = recipient not allowed
-- ------------------------------------------------------------------