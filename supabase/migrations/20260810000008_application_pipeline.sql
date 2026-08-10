-- =============================================================
-- Professional hiring pipeline (LinkedIn-style stages)
-- -------------------------------------------------------------
--  * adds a private `stage_note` column
--  * app_status now uses the pipeline stages:
--      new -> review -> interview -> offer -> hired
--    plus the gentle end-state `not_selected`
--  * migrates old values (pending/accepted/rejected)
--  * updates the email trigger for the new stages
-- =============================================================

alter table public.applications add column if not exists stage_note text;

alter table public.applications alter column app_status set default 'new';

update public.applications set app_status = 'new'          where app_status = 'pending';
update public.applications set app_status = 'offer'        where app_status = 'accepted';
update public.applications set app_status = 'not_selected' where app_status = 'rejected';

-- ------------------------------------------------------------------
-- Email trigger for the new stages (placeholder key — replace it)
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
  subject text;
  html text;
begin
  if new.app_status = old.app_status then
    return new;
  end if;

  select role, company into j_role, j_company from public.jobs where id = new.job_id;

  if new.app_status = 'not_selected' then
    subject := 'Update on your application - ' || coalesce(j_role, 'the role');
    html := '<p>Thank you for applying for <b>' || coalesce(j_role, 'the role') || '</b> at <b>' ||
            coalesce(j_company, 'the company') || '</b>.</p><p>They have decided not to move forward with your application this time. ' ||
            'Don''t give up - new opportunities are posted on PortNova regularly.</p>';
  elsif new.app_status = 'interview' then
    subject := 'Great news - you''ve been shortlisted! - ' || coalesce(j_role, 'the role');
    html := '<p>Congratulations! <b>' || coalesce(j_company, 'The company') || '</b> has shortlisted your application for <b>' ||
            coalesce(j_role, 'the role') || '</b> and would like to invite you to an <b>interview</b>.</p>' ||
            '<p>Keep an eye on your inbox - they will contact you at ' || new.email || '.</p>';
  elsif new.app_status in ('offer', 'hired') then
    subject := 'Excellent news! - ' || coalesce(j_role, 'the role');
    html := '<p>Great news! <b>' || coalesce(j_company, 'The company') || '</b> wants to move forward with your application for <b>' ||
            coalesce(j_role, 'the role') || '</b>.</p><p>They will contact you at ' || new.email || ' to discuss the next steps. Good luck!</p>';
  else
    return new;
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer RESEND_API_KEY_HERE', 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'PortNova <onboarding@resend.dev>',
      'to', jsonb_build_array(new.email),
      'subject', subject,
      'html', html
    )
  );
  return new;
end;
$$;

drop trigger if exists applications_notify_status on public.applications;
create trigger applications_notify_status
after update on public.applications
for each row execute function public.notify_applicant_status();
