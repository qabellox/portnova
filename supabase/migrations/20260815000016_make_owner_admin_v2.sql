-- Grant the PortNova owner the admin role so they ALWAYS bypass the
-- waitlist gate and reach the real app (regardless of email casing).
-- This covers the owner's actual account email: adonandoqabello@gmail.com.
-- Idempotent. If the owner account uses a different email, update this row.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) in ('adonandoq@gmail.com', 'adonandoqabello@gmail.com');
