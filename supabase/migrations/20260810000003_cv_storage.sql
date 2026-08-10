-- =============================================================
-- CV file storage (Supabase Storage) — real files, not filenames
-- -------------------------------------------------------------
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run
-- (run AFTER the 0002 applications migration)
--
-- * Creates a PRIVATE `cvs` bucket
-- * Users can upload/read/update/delete only their OWN files
--   (files live under a folder named with the user's id)
-- * The provider who owns a job can READ that job's applicants' CVs
-- * Adds cv_path to applications so each application points at its file
-- =============================================================

alter table storage.objects enable row level security;

insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false)
on conflict (id) do nothing;

drop policy if exists "users upload own cvs" on storage.objects;
create policy "users upload own cvs" on storage.objects
  for insert with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users read own cvs" on storage.objects;
create policy "users read own cvs" on storage.objects
  for select using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own cvs" on storage.objects;
create policy "users update own cvs" on storage.objects
  for update using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own cvs" on storage.objects;
create policy "users delete own cvs" on storage.objects
  for delete using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "job owner read applicant cvs" on storage.objects;
create policy "job owner read applicant cvs" on storage.objects
  for select using (
    bucket_id = 'cvs'
    and exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.user_id::text = (storage.foldername(name))[1]
        and j.created_by = auth.uid()
    )
  );

alter table public.applications add column if not exists cv_path text;
