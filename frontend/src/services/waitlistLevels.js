// =============================================================
// WAITLIST LEVELS - multi-level referral ladder (pure, testable)
// -------------------------------------------------------------
// The referral game never stops at level one. The more real
// sign-ups (not just link opens) a member drives with their
// voucher, the higher they climb and the more free AI CV
// sessions they unlock:
//
//   Level 1:  30 sign-ups  ->  1 free AI CV session
//   Level 2:  80 sign-ups  ->  2 free AI CV sessions  (chase 50 more)
//   Level 3 (last): 100 sign-ups -> 3 free AI CV sessions
//
// Only ACTUAL registrations count (join_waitlist RPC increments
// referral_count), so opening the link alone never moves the bar.
// =============================================================

export const REFERRAL_LEVELS = [
    { level: 1, threshold: 30, sessions: 1 },
    { level: 2, threshold: 80, sessions: 2 },
    { level: 3, threshold: 100, sessions: 3 },
];

/** Highest milestone (kept for backward-compat with older copy). */
export const REFERRALS_NEEDED = REFERRAL_LEVELS[0].threshold;

/** Current level reached for a given referral count (0 = none yet). */
export const levelForCount = (count) => {
    let reached = 0;
    for (const l of REFERRAL_LEVELS) {
        if (count >= l.threshold) reached = l.level;
    }
    return reached;
};

/** How many free AI CV sessions the member has earned at this count. */
export const sessionsForCount = (count) => {
    let sessions = 0;
    for (const l of REFERRAL_LEVELS) {
        if (count >= l.threshold) sessions = l.sessions;
    }
    return sessions;
};

/** The next level still to be unlocked (null when fully maxed). */
export const nextLevelFor = (count) => {
    for (const l of REFERRAL_LEVELS) {
        if (count < l.threshold) return l;
    }
    return null;
};

/** Whether the member has unlocked every level (the last milestone, 100). */
export const isMaxed = (count) => nextLevelFor(count) === null;

/**
 * Progress info for a referral count:
 *   { current, next, progress, count, threshold, sessions, maxed }
 *  - current: level currently held (0..3)
 *  - next:    the next level object to chase (or null when maxed)
 *  - progress: 0-100 percentage toward the NEXT milestone
 *  - threshold: the next milestone count to reach
 *  - sessions:  free AI CV sessions earned so far
 */
export const progressForCount = (count) => {
    const current = levelForCount(count);
    const next = nextLevelFor(count);
    if (!next) {
        return {
            current,
            next: null,
            progress: 100,
            count,
            threshold: REFERRAL_LEVELS[REFERRAL_LEVELS.length - 1].threshold,
            sessions: sessionsForCount(count),
            maxed: true,
        };
    }
    const prevThreshold = current > 0 ? REFERRAL_LEVELS[current - 1].threshold : 0;
    const span = next.threshold - prevThreshold;
    const progress = span > 0 ? Math.min(100, Math.round(((count - prevThreshold) / span) * 100)) : 100;
    return {
        current,
        next,
        progress,
        count,
        threshold: next.threshold,
        sessions: sessionsForCount(count),
        maxed: false,
    };
};
