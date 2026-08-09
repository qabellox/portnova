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
const FLEET = [
    { id: 'job-a', kind: 'jobs', w: 3.4, z: 1.6, speed: 0.7, phase: 1, dir: 1, range: 3, scale: 0.75, anchorY: 1.4, focus: 'Frontend Product Intern', titleKey: 'fleetJob1Title', descKey: 'fleetJob1Desc' },
    { id: 'course-a', kind: 'courses', w: 2.6, z: -0.5, speed: 0.85, phase: 7, dir: -1, range: 4, scale: 0.72, anchorY: 1.5, focus: 'Product Design Sprint', titleKey: 'fleetCourse1Title', descKey: 'fleetCourse1Desc' },
    { id: 'job-b', kind: 'jobs', w: 3.4, z: -3.2, speed: 0.55, phase: 13, dir: 1, range: 6, scale: 0.55, anchorY: 1.4, focus: 'Operations Coordinator', titleKey: 'fleetJob2Title', descKey: 'fleetJob2Desc' },
    { id: 'course-b', kind: 'courses', w: 2.6, z: -6.8, speed: 0.42, phase: 19, dir: -1, range: 9, scale: 0.45, anchorY: 1.5, focus: 'Startup Operations', titleKey: 'fleetCourse2Title', descKey: 'fleetCourse2Desc' },
    { id: 'course-c', kind: 'courses', w: 2.6, z: -11, speed: 0.34, phase: 27, dir: 1, range: 13, scale: 0.32, anchorY: 1.5, focus: 'Career Readiness', titleKey: 'fleetCourse3Title', descKey: 'fleetCourse3Desc' },
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
                el.style.left = `${p.x}%`;
                el.style.top = `${p.y}%`;
                el.style.width = `${p.w * 1.6}px`;
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
                                {vessel.kind === 'jobs' ? t('boatJobs') : t('boatCourses')}
                            </span>
                            <strong className="marine-vessel__title">{t(vessel.titleKey)}</strong>
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
