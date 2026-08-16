-- =============================================================
-- ENSURE `cvs` storage bucket exists (idempotent)
-- -------------------------------------------------------------
-- The `cvs` bucket went missing from the live project (drift between
-- migration history and actual storage buckets), which made ALL CV
-- uploads fail with "Bucket not found" -> "Could not read that file."
-- This migration re-creates it (no-op if it already exists) and
-- re-ensures the per-user RLS policies on storage.objects.
-- Safe to run repeatedly.
-- =============================================================

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
