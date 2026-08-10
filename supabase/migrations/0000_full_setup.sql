-- =============================================================
-- PORTNOVA — FULL SETUP (run this ONCE, it's idempotent/safe)
-- -------------------------------------------------------------
-- Paste the ENTIRE file into Supabase → SQL Editor → Run.
-- It is safe to run more than once: every create/insert/policy is
-- guarded (if not exists / on conflict do nothing / drop if exists).
--
-- It sets up:
--   1. jobs + courses tables, row-level security, demo seed data
--   2. applications table (job applications + rich youth data)
--   3. CV storage bucket (private) + storage policies + cv_path
-- =============================================================

-- ------------------------------------------------------------------
-- Helper: current signed-in user's role, read from the auth JWT.
-- ------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
$$;

-- ------------------------------------------------------------------
-- 1) JOBS + COURSES
-- ------------------------------------------------------------------
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  company     text not null,
  role        text not null,
  salary      text not null,
  location    text not null,
  category    text not null default 'Tech',
  type        text not null default 'full',
  experience  text not null default 'entry',
  emoji       text not null default '💼',
  tone        text not null default 'gold',
  created_by  uuid references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.jobs enable row level security;

drop policy if exists "jobs public read" on public.jobs;
create policy "jobs public read" on public.jobs
  for select using (true);

drop policy if exists "jobs provider insert" on public.jobs;
create policy "jobs provider insert" on public.jobs
  for insert with check (
    auth.uid() is not null
    and public.current_user_role() in ('provider', 'company', 'expert')
    and created_by = auth.uid()
  );

drop policy if exists "jobs owner update" on public.jobs;
create policy "jobs owner update" on public.jobs
  for update using (auth.uid() = created_by)
  with check (
    auth.uid() = created_by
    and public.current_user_role() in ('provider', 'company', 'expert')
  );

drop policy if exists "jobs owner delete" on public.jobs;
create policy "jobs owner delete" on public.jobs
  for delete using (auth.uid() = created_by);

drop policy if exists "jobs provider delete unowned" on public.jobs;
create policy "jobs provider delete unowned" on public.jobs
  for delete using (
    auth.uid() is not null
    and public.current_user_role() in ('provider', 'company', 'expert')
    and created_by is null
  );

create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  provider    text not null,
  price       text not null,
  hours       numeric not null default 1,
  mode        text not null default 'online',
  location    text not null,
  date        text not null,
  level       text not null default 'Beginner',
  emoji       text not null default '🎓',
  tone        text not null default 'gold',
  created_by  uuid references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.courses enable row level security;

drop policy if exists "courses public read" on public.courses;
create policy "courses public read" on public.courses
  for select using (true);

drop policy if exists "courses provider insert" on public.courses;
create policy "courses provider insert" on public.courses
  for insert with check (
    auth.uid() is not null
    and public.current_user_role() in ('provider', 'company', 'expert')
    and created_by = auth.uid()
  );

drop policy if exists "courses owner update" on public.courses;
create policy "courses owner update" on public.courses
  for update using (auth.uid() = created_by)
  with check (
    auth.uid() = created_by
    and public.current_user_role() in ('provider', 'company', 'expert')
  );

drop policy if exists "courses owner delete" on public.courses;
create policy "courses owner delete" on public.courses
  for delete using (auth.uid() = created_by);

drop policy if exists "courses provider delete unowned" on public.courses;
create policy "courses provider delete unowned" on public.courses
  for delete using (
    auth.uid() is not null
    and public.current_user_role() in ('provider', 'company', 'expert')
    and created_by is null
  );

-- Demo seed data (only runs while the tables are empty)
insert into public.jobs (company, role, salary, location, category, type, experience, emoji, tone)
select * from (values
  ('Nova Labs', 'Frontend Product Intern', '$450/mo', 'Port Said', 'Tech', 'intern', 'entry', '💻', 'blue'),
  ('HarborX', 'Operations Coordinator', '$700/mo', 'Hybrid', 'Business', 'full', 'mid', '⚓', 'gold'),
  ('BlueWave', 'Community Designer', '$600/mo', 'Remote', 'Design', 'full', 'mid', '🎨', 'success'),
  ('Atlas Port', 'Business Analyst', '$900/mo', 'Onsite', 'Business', 'contract', 'senior', '📊', 'blue'),
  ('Sunrise Digital', 'Junior Marketing Specialist', '$420/mo', 'Remote', 'Marketing', 'part', 'entry', '📣', 'gold'),
  ('Porta Tech', 'Data Entry & Support', '$380/mo', 'Port Said', 'Business', 'full', 'entry', '🗂', 'blue')
) as s(company, role, salary, location, category, type, experience, emoji, tone)
where not exists (select 1 from public.jobs);

insert into public.courses (title, provider, price, hours, mode, location, date, level, emoji, tone)
select * from (values
  ('Product Design Sprint', 'PortNova Academy', 'Free', 24, 'online', 'Zoom', 'Flexible', 'Beginner', '🎨', 'blue'),
  ('Startup Operations', 'Harbor School', '$49', 32, 'offline', 'Port Said', 'Sat 10:00', 'Intermediate', '🚀', 'gold'),
  ('Career Readiness', 'FutureBridge', 'Free', 12, 'online', 'Zoom', 'Flexible', 'Foundation', '🧭', 'success'),
  ('Data Storytelling', 'Nova Labs', '$79', 20, 'online', 'Google Meet', 'Wed 18:00', 'Advanced', '📊', 'blue'),
  ('Freelance Foundations', 'PortNova Academy', 'Free', 15, 'offline', 'Youth Center', 'Sun 12:00', 'Beginner', '💼', 'success'),
  ('Digital Marketing Basics', 'Harbor School', '$39', 18, 'online', 'Zoom', 'Mon 17:00', 'Intermediate', '📣', 'gold')
) as s(title, provider, price, hours, mode, location, date, level, emoji, tone)
where not exists (select 1 from public.courses);

-- ------------------------------------------------------------------
-- 2) APPLICATIONS
-- ------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  applicant_name text not null,
  email text not null,
  phone text,
  city text,
  status text,
  app_status text not null default 'pending',
  education text,
  experience_years numeric,
  skills text,
  cover_letter text,
  expected_salary text,
  availability text,
  portfolio_url text,
  linkedin_url text,
  referral_source text,
  cv_name text,
  created_at timestamptz not null default now()
);
alter table public.applications enable row level security;

drop policy if exists "applicants insert own" on public.applications;
create policy "applicants insert own" on public.applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "applicants read own" on public.applications;
create policy "applicants read own" on public.applications
  for select using (auth.uid() = user_id);

drop policy if exists "job owner read applicants" on public.applications;
create policy "job owner read applicants" on public.applications
  for select using (
    exists (select 1 from public.jobs j where j.id = applications.job_id and j.created_by = auth.uid())
  );

drop policy if exists "job owner update applicants" on public.applications;
create policy "job owner update applicants" on public.applications
  for update using (
    exists (select 1 from public.jobs j where j.id = applications.job_id and j.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.jobs j where j.id = applications.job_id and j.created_by = auth.uid())
  );

-- ------------------------------------------------------------------
-- 3) CV STORAGE (private bucket + policies + cv_path column)
-- ------------------------------------------------------------------
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
