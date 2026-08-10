-- =============================================================
-- Phase 1 — Real data layer: jobs & courses backed by Postgres
-- -------------------------------------------------------------
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor → New query
--   3. Paste this whole file and click RUN (it is idempotent)
--   4. The frontend auto-detects the tables on the next load.
--
-- Security model (row level security):
--   * Anyone (even anonymous) can READ jobs/courses (public marketplace)
--   * Only signed-in PROVIDERS can INSERT/UPDATE their own rows
--   * Providers can only DELETE their own rows
--   * System-seeded demo rows (created_by = null) are read-only
-- =============================================================

-- Helper: current signed-in user's role, read from the auth JWT.
-- Supports the two fixed roles ('provider'/'seeker') plus legacy names.
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
-- JOBS
-- ------------------------------------------------------------------
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  company     text not null,
  role        text not null,
  salary      text not null,
  location    text not null,
  category    text not null default 'Tech',
  type        text not null default 'full',          -- full | part | intern | contract
  experience  text not null default 'entry',         -- entry | mid | senior
  emoji       text not null default '💼',
  tone        text not null default 'gold',          -- blue | gold | success
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

-- ------------------------------------------------------------------
-- COURSES
-- ------------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  provider    text not null,
  price       text not null,
  hours       numeric not null default 1,
  mode        text not null default 'online',        -- online | offline
  location    text not null,
  date        text not null,
  level       text not null default 'Beginner',      -- Beginner | Foundation | Intermediate | Advanced
  emoji       text not null default '🎓',
  tone        text not null default 'gold',          -- blue | gold | success
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

-- ------------------------------------------------------------------
-- Seed demo data (idempotent: only runs while the tables are empty)
-- ------------------------------------------------------------------
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
