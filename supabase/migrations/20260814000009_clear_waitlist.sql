-- =============================================================
-- Waitlist cleanup: remove all adversarial-test sign-ups
-- -------------------------------------------------------------
-- The owner's standing rule: every time the waitlist changes (or
-- test data is created), all registered emails are cleared so every
-- member starts equal (level 0, 0 referrals, 0 free sessions).
-- This clears the rows created by the adversarial load tests.
-- Children (referrals) must be truncated before the parent
-- (waitlist) because of the foreign-key reference.
-- =============================================================

-- Children and parent truncated together so the FK between
-- referrals.referrer_id and waitlist.id is satisfied.
truncate table public.referrals, public.waitlist_attempts, public.waitlist restart identity;
