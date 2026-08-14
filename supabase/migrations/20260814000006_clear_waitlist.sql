-- =============================================================
-- Waitlist cleanup: clear all registered rows
-- -------------------------------------------------------------
-- The waitlist form was just edited (removed questions). Per the
-- owner's rule, every time the waitlist changes, all previously
-- registered emails are removed so every member starts equal
-- (level 0, zero referrals, zero free sessions). This also drops
-- any test data from earlier verification runs.
-- =============================================================

truncate table public.waitlist restart identity;
