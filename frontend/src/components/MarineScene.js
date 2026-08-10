import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCourses, getJobs } from '../services/content';
import ThreeScene from './ThreeScene';

/**
 * MarineScene: cinematic 3D seascape with an interactive 3D boat fleet.
 *
 * The sea, sky, sun, moon and the boats themselves are rendered in Three.js.
 * The fleet sails across the water at different depths; each boat projects
 * its real screen position each frame, and the DOM info cards follow it.
 * Hover / tap a boat to reveal its card (real job/course name + deep link).
 */

// The fleet config is shared with ThreeScene: 3D layout + the card content.
/* Every boat sails steadily FORWARD across the sea (dir=1 right, dir=-1
   left), traversing the whole visible width and wrapping just off-screen —
   no pop, no reversal, no circling. phase is a fraction of the travel cycle
   (0..1) that spreads the boats apart; margin is how far past the screen edge
   the boat travels before wrapping (hides the wrap). lift raises the hull
   above the waterline so it floats with real freeboard. */
const FLEET = [
    { id: 'job-a', kind: 'jobs', w: 3.4, z: -2, speed: 0.6, dir: 1, phase: 0.15, margin: 2.3, scale: 0.8, lift: 0.28, anchorY: 0.5, focus: 'Frontend Product Intern', kickerKey: 'fleetJob1Kicker', orgKey: 'fleetJob1Org', metaKey: 'fleetJob1Meta', titleKey: 'fleetJob1Title', descKey: 'fleetJob1Desc' },
    { id: 'course-a', kind: 'courses', w: 2.6, z: -5.5, speed: 0.75, dir: -1, phase: 0.85, margin: 2.0, scale: 0.68, lift: 0.4, anchorY: 0.9, focus: 'Product Design Sprint', kickerKey: 'fleetCourse1Kicker', orgKey: 'fleetCourse1Org', metaKey: 'fleetCourse1Meta', titleKey: 'fleetCourse1Title', descKey: 'fleetCourse1Desc' },
    { id: 'job-b', kind: 'jobs', w: 3.4, z: -9, speed: 0.5, dir: 1, phase: 0.4, margin: 2.3, scale: 0.56, lift: 0.28, anchorY: 0.5, focus: 'Operations Coordinator', kickerKey: 'fleetJob2Kicker', orgKey: 'fleetJob2Org', metaKey: 'fleetJob2Meta', titleKey: 'fleetJob2Title', descKey: 'fleetJob2Desc' },
    { id: 'course-b', kind: 'courses', w: 2.6, z: -13, speed: 0.4, dir: -1, phase: 0.65, margin: 2.0, scale: 0.46, lift: 0.4, anchorY: 0.9, focus: 'Startup Operations', kickerKey: 'fleetCourse2Kicker', orgKey: 'fleetCourse2Org', metaKey: 'fleetCourse2Meta', titleKey: 'fleetCourse2Title', descKey: 'fleetCourse2Desc' },
    { id: 'course-c', kind: 'courses', w: 2.6, z: -18, speed: 0.3, dir: 1, phase: 0.5, margin: 2.0, scale: 0.38, lift: 0.4, anchorY: 0.9, focus: 'Career Readiness', kickerKey: 'fleetCourse3Kicker', orgKey: 'fleetCourse3Org', metaKey: 'fleetCourse3Meta', titleKey: 'fleetCourse3Title', descKey: 'fleetCourse3Desc' },
];

/* Rotation settings for the live fleet. Every ROTATE_MS the ships slide one
   position through the newest-first list, so every released job/course gets
   airtime in release order (a new release pushes items back, never drops them). */
const ROTATE_MS = 10000;
const JOB_TYPE_KEY = { full: 'jobTypeFull', part: 'jobTypePart', intern: 'jobTypeIntern', contract: 'jobTypeContract' };

/* Ship index within its own kind (job-a=0, job-b=1; course-a=0, course-b=1,
   course-c=2) — used to lay each ship onto a different slice of its list. */
const FLEET_INDEX = {};
{
    const count = {};
    FLEET.forEach((v) => {
        FLEET_INDEX[v.id] = count[v.kind] || 0;
        count[v.kind] = (count[v.kind] || 0) + 1;
    });
}

const MarineScene = ({ className = '' }) => {
    const { t } = useLanguage();
    const positionsRef = useRef({});
    const vesselRefs = useRef({});

    // Keep each DOM card glued to its 3D boat's projected screen position.
    useEffect(() => {
        let rafId = 0;
        const loop = () => {
            const pos = positionsRef.current;
            Object.keys(vesselRefs.current).forEach((id) => {
                const el = vesselRefs.current[id];
                const p = pos[id];
                if (!el || !p) return;
                let xPct = p.x;
                let yPct = p.y;
                // Phones only: keep the info card fully inside the hero (the
                // live wallpaper) so it never overlaps its borders — the card
                // opens below the boat, so it is clamped in both axes. Desktop
                // layout is left completely untouched.
                if (window.innerWidth <= 720) {
                    const fleetEl = el.closest('.marine-fleet');
                    const fr = fleetEl ? fleetEl.getBoundingClientRect() : null;
                    const card = el.querySelector('.marine-vessel__card');
                    if (fr && fr.width > 0) {
                        const cw = (card && card.offsetWidth ? card.offsetWidth : 184) / 2;
                        const halfPct = (cw / fr.width) * 100;
                        const marginPct = (5 / fr.width) * 100;
                        xPct = Math.min(100 - halfPct - marginPct, Math.max(halfPct + marginPct, p.x));
                        const ch = card && card.offsetHeight ? card.offsetHeight : 190;
                        const vHalf = (el.offsetHeight || 90) / 2;
                        const minY = ((fr.top + 6 - vHalf) / fr.height) * 100;
                        const maxY = ((fr.bottom - 6 - vHalf - ch) / fr.height) * 100;
                        yPct = Math.min(maxY, Math.max(minY, p.y));
                    }
                }
                el.style.left = `${xPct}%`;
                el.style.top = `${yPct}%`;
                el.style.width = `${Math.max(p.w * 1.6, 160)}px`;
                el.style.opacity = p.visible ? '' : '0';
                el.style.pointerEvents = p.visible ? 'auto' : 'none';
            });
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, []);

    // Live content from the shared store (newest first): each boat sails with
    // the newest job/course, so freshly published provider posts appear on the
    // front boats. Refreshes on mount and on window focus so cards never go stale.
    // Live content from the shared store, newest first (jobs/courses come back
    // sorted by release time, most recent first). The ships are a rolling
    // time-slice over that list: every ROTATE_MS the window slides forward one
    // position, so every released job/course cycles through the ships in release
    // order — a new release moves older items one ship back (never drops them),
    // and when a fresh item arrives the rotation resets so the newest sails in
    // on the front ship immediately.
    const [content, setContent] = useState({ jobs: [], courses: [] });
    const [rot, setRot] = useState(0);
    const cardsSig = useRef('');
    const lastFetchAt = useRef(0);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const [jobs, courses] = await Promise.all([getJobs(), getCourses()]);
            if (!mounted) return;
            const jl = Array.isArray(jobs) ? jobs : [];
            const cl = Array.isArray(courses) ? courses : [];
            // Minimal churn check: only reload the boats when the newest item or
            // the count changed (a new release = new front id).
            const sig = `${jl.length}:${jl[0]?.id || ''}|${cl.length}:${cl[0]?.id || ''}`;
            if (sig !== cardsSig.current) {
                cardsSig.current = sig;
                setContent({ jobs: jl, courses: cl });
                setRot(0); // newest release jumps to the front ship
            }
        };
        load();
        lastFetchAt.current = Date.now();
        // Refresh when the user returns to the tab, but never more often than
        // once every 20s, so alt-tabbing during development doesn't hammer
        // Supabase or re-render the scene on every focus event.
        const onFocus = () => {
            const now = Date.now();
            if (now - lastFetchAt.current < 20000) return;
            lastFetchAt.current = now;
            load();
        };
        window.addEventListener('focus', onFocus);
        return () => {
            mounted = false;
            window.removeEventListener('focus', onFocus);
        };
    }, [t]);

    // Time-sensitive marquee: slide the fleet window forward on a timer so
    // every released item cycles through the ships in release order.
    useEffect(() => {
        const id = window.setInterval(() => setRot((r) => r + 1), ROTATE_MS);
        return () => window.clearInterval(id);
    }, []);

    // Gull split into two wings + body so each wing can swing with life
    const gullLeft = 'M30 12 C 23 7, 14 4, 4 8 C 13 10, 22 11, 30 12 Z';
    const gullRight = 'M30 12 C 37 7, 46 4, 56 8 C 47 10, 38 11, 30 12 Z';
    const gullBody = 'M27 12 C 29 11, 31 11, 33 12 C 31 13, 29 13, 27 12 Z';

    const gulls = [
        { cls: 'marine-gull--1', size: 64, top: 7, dur: 52, delay: -6, op: 0.92 },
        { cls: 'marine-gull--2', size: 46, top: 13, dur: 66, delay: -24, op: 0.8 },
        { cls: 'marine-gull--3', size: 74, top: 4, dur: 78, delay: -40, op: 0.95 },
        { cls: 'marine-gull--4', size: 38, top: 20, dur: 60, delay: -12, op: 0.72 },
        { cls: 'marine-gull--5', size: 54, top: 10, dur: 88, delay: -55, op: 0.85 },
        { cls: 'marine-gull--6', size: 32, top: 25, dur: 70, delay: -32, op: 0.65 },
    ];

    return (
        <div className={`marine-scene ${className}`.trim()}>
            {/* Cinematic Three.js seascape with the 3D boat fleet */}
            <ThreeScene fleet={FLEET} positionsRef={positionsRef} />

            {/* Flock of gulls (DOM overlay) */}
            <div className="marine-gulls" aria-hidden="true">
                {gulls.map((g) => (
                    <span key={g.cls} className={`marine-gull ${g.cls}`} style={{ opacity: g.op }}>
                        <svg viewBox="0 0 60 24" width={g.size} height={g.size * 0.4}>
                            <path className="marine-gull__wing marine-gull__wing--l" d={gullLeft} fill="#1c2a3a" />
                            <path className="marine-gull__wing marine-gull__wing--r" d={gullRight} fill="#1c2a3a" />
                            <path className="marine-gull__body" d={gullBody} fill="#1c2a3a" />
                        </svg>
                    </span>
                ))}
            </div>

            {/* Info cards follow each 3D boat; hover/tap reveals the real
                job/course name + deep-link button. */}
            <div className="marine-fleet">
                {FLEET.map((vessel) => {
                    const list = vessel.kind === 'jobs' ? content.jobs : content.courses;
                    const item = list.length ? list[(rot + FLEET_INDEX[vessel.id]) % list.length] : null;
                    const card = item
                        ? vessel.kind === 'jobs'
                            ? {
                                kicker: t('boatJobs'),
                                title: item.role,
                                meta: `${item.company} · ${item.location}`,
                                desc: `${item.salary} · ${t(JOB_TYPE_KEY[item.type] || 'jobTypeFull')}`,
                                focus: item.role,
                            }
                            : {
                                kicker: t('boatCourses'),
                                title: item.title,
                                meta: `${item.provider} · ${item.location}`,
                                desc: `${item.price} · ${item.hours} ${t('courseHours')} · ${item.mode === 'online' ? t('courseOnline') : t('courseOffline')}`,
                                focus: item.title,
                            }
                        : null;
                    const title = card?.title ?? t(vessel.titleKey);
                    const kicker = card?.kicker ?? t(vessel.kickerKey);
                    const meta = card?.meta ?? `${t(vessel.orgKey)} · ${t(vessel.metaKey)}`;
                    const desc = card?.desc ?? t(vessel.descKey);
                    const focus = card?.focus ?? vessel.focus;
                    return (
                        <div
                            key={vessel.id}
                            className={`marine-vessel marine-vessel--${vessel.kind}`}
                            ref={(el) => { vesselRefs.current[vessel.id] = el; }}
                            tabIndex="0"
                            role="button"
                            aria-label={title}
                            onClick={(event) => event.currentTarget.focus()}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') event.currentTarget.focus();
                            }}
                        >
                            <div className="marine-vessel__card">
                                <span className="marine-vessel__kicker">
                                    {vessel.kind === 'jobs' ? '⚓ ' : '🧭 '}
                                    {kicker}
                                </span>
                                <strong className="marine-vessel__title">{title}</strong>
                                <span className="marine-vessel__meta">{meta}</span>
                                <span className="marine-vessel__desc">{desc}</span>
                                <Link
                                    className="marine-vessel__btn"
                                    to={
                                        vessel.kind === 'jobs'
                                            ? `/jobs?focus=${encodeURIComponent(focus)}`
                                            : `/courses?focus=${encodeURIComponent(focus)}`
                                    }
                                    tabIndex="-1"
                                >
                                    {vessel.kind === 'jobs' ? t('boatSeeJobs') : t('boatSeeCourses')}
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MarineScene;
