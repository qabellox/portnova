import {
    REFERRAL_LEVELS,
    REFERRALS_NEEDED,
    isMaxed,
    levelForCount,
    nextLevelFor,
    progressForCount,
    sessionsForCount,
} from './waitlistLevels';

describe('waitlist referral levels (multi-level ladder)', () => {
    test('level config is exactly 30 / 80 / 100 with escalating sessions', () => {
        expect(REFERRAL_LEVELS).toEqual([
            { level: 1, threshold: 30, sessions: 1 },
            { level: 2, threshold: 80, sessions: 2 },
            { level: 3, threshold: 100, sessions: 3 },
        ]);
        // First milestone is 30, not 20.
        expect(REFERRALS_NEEDED).toBe(30);
    });

    test('levelForCount returns the current level reached', () => {
        expect(levelForCount(0)).toBe(0);
        expect(levelForCount(10)).toBe(0);
        expect(levelForCount(29)).toBe(0);
        expect(levelForCount(30)).toBe(1);
        expect(levelForCount(50)).toBe(1);
        expect(levelForCount(79)).toBe(1);
        expect(levelForCount(80)).toBe(2);
        expect(levelForCount(99)).toBe(2);
        expect(levelForCount(100)).toBe(3);
        expect(levelForCount(250)).toBe(3);
    });

    test('sessionsForCount grants 1/2/3 sessions at 30/80/100', () => {
        expect(sessionsForCount(0)).toBe(0);
        expect(sessionsForCount(29)).toBe(0);
        expect(sessionsForCount(30)).toBe(1);
        expect(sessionsForCount(79)).toBe(1);
        expect(sessionsForCount(80)).toBe(2);
        expect(sessionsForCount(99)).toBe(2);
        expect(sessionsForCount(100)).toBe(3);
        expect(sessionsForCount(1000)).toBe(3);
    });

    test('nextLevelFor returns the next milestone to chase', () => {
        expect(nextLevelFor(0)).toEqual({ level: 1, threshold: 30, sessions: 1 });
        expect(nextLevelFor(29)).toEqual({ level: 1, threshold: 30, sessions: 1 });
        expect(nextLevelFor(30)).toEqual({ level: 2, threshold: 80, sessions: 2 });
        expect(nextLevelFor(79)).toEqual({ level: 2, threshold: 80, sessions: 2 });
        expect(nextLevelFor(80)).toEqual({ level: 3, threshold: 100, sessions: 3 });
        expect(nextLevelFor(100)).toBeNull();
        expect(isMaxed(100)).toBe(true);
        expect(isMaxed(99)).toBe(false);
    });

    test('progressForCount computes 0-100 progress toward the next milestone', () => {
        // 0 of 30 -> 0%
        expect(progressForCount(0)).toMatchObject({ current: 0, threshold: 30, progress: 0, sessions: 0, maxed: false });
        // 15 of 30 -> 50%
        expect(progressForCount(15).progress).toBe(50);
        // 29 of 30 -> ~97%
        expect(progressForCount(29).progress).toBe(97);
        // just hit 30 -> next is 80, progress 0 but level 1 + 1 session
        const at30 = progressForCount(30);
        expect(at30).toMatchObject({ current: 1, threshold: 80, sessions: 1, maxed: false });
        expect(at30.progress).toBe(0);
        // 55 of [30..80] -> halfway (25/50 = 50%)
        expect(progressForCount(55).progress).toBe(50);
        // 80 -> next is 100, 2 sessions
        expect(progressForCount(80)).toMatchObject({ current: 2, threshold: 100, sessions: 2, maxed: false });
        // 100 -> maxed, 100%, 3 sessions
        expect(progressForCount(100)).toMatchObject({ current: 3, threshold: 100, sessions: 3, progress: 100, maxed: true });
        expect(progressForCount(100).next).toBeNull();
    });

    test('never regresses: a higher count always yields >= sessions', () => {
        const counts = [0, 1, 29, 30, 55, 79, 80, 99, 100, 101, 500];
        let prev = 0;
        for (const c of counts) {
            const s = sessionsForCount(c);
            expect(s).toBeGreaterThanOrEqual(prev);
            prev = s;
        }
    });
});
