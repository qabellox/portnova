-- =============================================================
-- CV requests table (Supabase-native) — replaces the Express-only
-- cv_requests flow so the CV page works fully on the deployed site.
-- -------------------------------------------------------------
-- * youth can create / view / delete their OWN requests
-- * experts (user_metadata.role = 'expert') can view pending
--   requests and update them (assign / mark formatted)
-- * stores storage paths (not public URLs) for the private `cvs` bucket;
--   the client creates signed URLs to view/download
-- =============================================================

create table if not exists public.cv_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending',
    notes text,
    cv_path text,
    request_type text not null default 'upload',
    requester_name text,
    assigned_expert_id uuid references auth.users(id) on delete set null,
    assigned_expert_name text,
    assigned_at timestamptz,
    formatted_cv_path text,
    completed_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.cv_requests enable row level security;

drop policy if exists "users create own cv requests" on public.cv_requests;
create policy "users create own cv requests" on public.cv_requests
    for insert with check (auth.uid() = user_id);

drop policy if exists "users read own cv requests" on public.cv_requests;
create policy "users read own cv requests" on public.cv_requests
    for select using (auth.uid() = user_id);

drop policy if exists "experts read cv requests" on public.cv_requests;
create policy "experts read cv requests" on public.cv_requests
    for select using (
        auth.jwt() -> 'user_metadata' ->> 'role' = 'expert'
        or auth.jwt() -> 'app_metadata' ->> 'role' = 'expert'
    );

drop policy if exists "users update own cv requests" on public.cv_requests;
create policy "users update own cv requests" on public.cv_requests
    for update using (auth.uid() = user_id);

drop policy if exists "experts update cv requests" on public.cv_requests;
create policy "experts update cv requests" on public.cv_requests
    for update using (
        auth.jwt() -> 'user_metadata' ->> 'role' = 'expert'
        or auth.jwt() -> 'app_metadata' ->> 'role' = 'expert'
    );

drop policy if exists "users delete own cv requests" on public.cv_requests;
create policy "users delete own cv requests" on public.cv_requests
    for delete using (auth.uid() = user_id);

-- useful index for the youth dashboard + expert pending queue
create index if not exists cv_requests_user_idx on public.cv_requests (user_id);
create index if not exists cv_requests_status_idx on public.cv_requests (status);
