-- =============================================================
-- Public avatars bucket + policies
-- -------------------------------------------------------------
-- Profile pictures are uploaded to Supabase Storage (NOT stored as
-- base64 in user_metadata - that truncates in the auth JWT and makes
-- avatars pixelated / vanish on refresh). This bucket is PUBLIC so
-- avatars render everywhere on the site with no auth requirement.
-- Users may only upload/update/delete inside their own folder.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users upload only into their own folder.
drop policy if exists "users upload own avatars" on storage.objects;
create policy "users upload own avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Public read (bucket is public, but keep an explicit select policy).
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Owners may update/delete their own avatar.
drop policy if exists "users update own avatars" on storage.objects;
create policy "users update own avatars" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own avatars" on storage.objects;
create policy "users delete own avatars" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
