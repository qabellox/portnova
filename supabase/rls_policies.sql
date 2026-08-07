alter table public.users enable row level security;
alter table public.youth_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.cv_requests enable row level security;

alter table public.cv_requests
    add column if not exists cv_url text,
    add column if not exists formatted_cv_url text,
    add column if not exists assigned_expert_id integer,
    add column if not exists assigned_expert_name text,
    add column if not exists assigned_at timestamptz,
    add column if not exists delivered_at timestamptz,
    add column if not exists request_type text,
    add column if not exists requester_name text;

drop policy if exists users_read_own on public.users;
create policy users_read_own on public.users
for select using (
    email = auth.email()
);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update using (email = auth.email());

drop policy if exists youth_profiles_read_own on public.youth_profiles;
create policy youth_profiles_read_own on public.youth_profiles
for select using (
    exists (
        select 1 from public.users u
        where u.id = youth_profiles.user_id
          and u.email = auth.email()
    )
);

drop policy if exists youth_profiles_update_own on public.youth_profiles;
create policy youth_profiles_update_own on public.youth_profiles
for update using (
    exists (
        select 1 from public.users u
        where u.id = youth_profiles.user_id
          and u.email = auth.email()
    )
);

drop policy if exists companies_read_own on public.companies;
create policy companies_read_own on public.companies
for select using (
    exists (
        select 1 from public.users u
        where u.id = companies.user_id
          and u.email = auth.email()
    )
);

drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies
for update using (
    exists (
        select 1 from public.users u
        where u.id = companies.user_id
          and u.email = auth.email()
    )
);

drop policy if exists jobs_read_active on public.jobs;
create policy jobs_read_active on public.jobs
for select using (status = 'active');

drop policy if exists jobs_manage_own on public.jobs;
create policy jobs_manage_own on public.jobs
for all using (
    exists (
        select 1
        from public.companies c
        join public.users u on u.id = c.user_id
        where c.id = jobs.company_id
          and u.email = auth.email()
    )
);

drop policy if exists job_applications_youth_manage_own on public.job_applications;
create policy job_applications_youth_manage_own on public.job_applications
for all using (
    exists (
        select 1 from public.users u
        where u.id = job_applications.user_id
          and u.email = auth.email()
    )
);

drop policy if exists job_applications_company_read_job on public.job_applications;
create policy job_applications_company_read_job on public.job_applications
for select using (
    exists (
        select 1
        from public.jobs j
        join public.companies c on c.id = j.company_id
        join public.users u on u.id = c.user_id
        where j.id = job_applications.job_id
          and u.email = auth.email()
    )
);

drop policy if exists cv_requests_youth_read_own on public.cv_requests;
create policy cv_requests_youth_read_own on public.cv_requests
for select using (
    exists (
        select 1 from public.users u
        where u.id = cv_requests.user_id
          and u.email = auth.email()
    )
);

drop policy if exists cv_requests_expert_read_update_assigned on public.cv_requests;
create policy cv_requests_expert_read_update_assigned on public.cv_requests
for select using (
    exists (
        select 1 from public.users u
        where u.email = auth.email()
          and u.role in ('expert', 'admin')
    )
    or exists (
        select 1 from public.users u
        where u.id = cv_requests.user_id
          and u.email = auth.email()
    )
);

drop policy if exists cv_requests_expert_update_assigned on public.cv_requests;
create policy cv_requests_expert_update_assigned on public.cv_requests
for update using (
    exists (
        select 1 from public.users u
        where u.email = auth.email()
          and u.role in ('expert', 'admin')
    )
);