-- =============================================================
-- Performance + idempotency hardening
-- -------------------------------------------------------------
--  * Indexes on the columns used in filters / joins / ordering
--  * A unique constraint so a seeker can apply to a job only once
-- =============================================================

create index if not exists jobs_created_by_idx on public.jobs (created_by);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

create index if not exists courses_created_by_idx on public.courses (created_by);
create index if not exists courses_created_at_idx on public.courses (created_at desc);

create index if not exists applications_job_id_idx on public.applications (job_id);
create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_created_at_idx on public.applications (created_at desc);

-- Remove any duplicate applications (keep the latest one per user+job).
delete from public.applications a
using public.applications b
where a.id < b.id
  and a.job_id = b.job_id
  and a.user_id = b.user_id
  and a.user_id is not null;

-- Idempotency: one application per user per job.
create unique index if not exists applications_one_per_user_job
on public.applications (user_id, job_id)
where user_id is not null;
