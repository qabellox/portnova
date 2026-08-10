-- =============================================================
-- Job applications (rich structured youth data + CV)
-- -------------------------------------------------------------
-- HOW TO RUN:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this whole file and click RUN (idempotent)
--
-- Security:
--   * Any signed-in user can INSERT only their OWN application
--     (user_id is forced to equal auth.uid())
--   * Applicants can read their own applications
--   * The provider who owns a job can read that job's applicants
-- =============================================================

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  applicant_name text not null,
  email text not null,
  phone text,
  city text,
  status text,              -- looking | student | graduate | employed
  education text,           -- highschool | diploma | bachelor | master | other
  experience_years numeric,
  skills text,
  cover_letter text,
  expected_salary text,
  availability text,        -- immediate | 2weeks | 1month
  portfolio_url text,
  linkedin_url text,
  referral_source text,     -- social | friend | school | other
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
