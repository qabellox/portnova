-- =============================================================
-- Waitlist cleanup: remove IP-limit verification test rows
-- -------------------------------------------------------------
-- Owner's standing rule: clear all registered emails after any
-- waitlist test/edit so every member starts equal.
-- Children + parent truncated together (FK-safe).
-- =============================================================

truncate table public.referrals, public.waitlist_attempts, public.waitlist restart identity;
