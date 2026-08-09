import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
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
                // live wallpaper) so it never overlaps its borders. Desktop
                // layout is left completely untouched.
                if (window.innerWidth <= 720) {
                    const fleetEl = el.closest('.marine-fleet');
                    const fr = fleetEl ? fleetEl.getBoundingClientRect() : null;
                    const card = el.querySelector('.marine-vessel__card');
                    const cw = (card && card.offsetWidth ? card.offsetWidth : 184) / 2;
                    if (fr && fr.width > 0) {
                        const halfPct = (cw / fr.width) * 100;
                        const marginPct = (5 / fr.width) * 100;
                        xPct = Math.min(100 - halfPct - marginPct, Math.max(halfPct + marginPct, p.x));
                    }
                    yPct = Math.min(84, Math.max(10, p.y));
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
                {FLEET.map((vessel) => (
                    <div
                        key={vessel.id}
                        className={`marine-vessel marine-vessel--${vessel.kind}`}
                        ref={(el) => { vesselRefs.current[vessel.id] = el; }}
                        tabIndex="0"
                        role="button"
                        aria-label={t(vessel.titleKey)}
                        onClick={(event) => event.currentTarget.focus()}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') event.currentTarget.focus();
                        }}
                    >
                        <div className="marine-vessel__card">
                            <span className="marine-vessel__kicker">
                                {vessel.kind === 'jobs' ? '⚓ ' : '🧭 '}
                                {t(vessel.kickerKey)}
                            </span>
                            <strong className="marine-vessel__title">{t(vessel.titleKey)}</strong>
                            <span className="marine-vessel__meta">
                                {t(vessel.orgKey)} · {t(vessel.metaKey)}
                            </span>
                            <span className="marine-vessel__desc">{t(vessel.descKey)}</span>
                            <Link
                                className="marine-vessel__btn"
                                to={
                                    vessel.kind === 'jobs'
                                        ? `/jobs?focus=${encodeURIComponent(vessel.focus)}`
                                        : `/courses?focus=${encodeURIComponent(vessel.focus)}`
                                }
                                tabIndex="-1"
                            >
                                {vessel.kind === 'jobs' ? t('boatSeeJobs') : t('boatSeeCourses')}
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarineScene;
