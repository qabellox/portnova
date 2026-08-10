-- =============================================================
-- Application status: Pending → Accepted / Rejected
-- -------------------------------------------------------------
-- Add the app_status column and let the job-owning provider
-- update it. (app_status is separate from `status`, which holds
-- the applicant's employment status.)
-- =============================================================

alter table public.applications add column if not exists app_status text not null default 'pending';

drop policy if exists "job owner update applicants" on public.applications;
create policy "job owner update applicants" on public.applications
  for update using (
    exists (select 1 from public.jobs j where j.id = applications.job_id and j.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.jobs j where j.id = applications.job_id and j.created_by = auth.uid())
  );
