import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * MarineScene: 3D live seascape.
 *
 * The sea is drawn on a canvas (perspective waves rolling toward the viewer).
 * On top of it, a 3D fleet sails across at different depths:
 *   - Cargo ships (⚓) advertise JOBS, sailing left to right.
 *   - Sailboats (🧭) advertise COURSES, sailing right to left.
 * Hover (or focus) a boat to reveal its info card with a direct link.
 */

const JobShip = () => (
    <svg viewBox="0 0 460 220" width="100%" height="100%">
        <defs>
            <linearGradient id="jhull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#35506b" />
                <stop offset="55%" stopColor="#22364c" />
                <stop offset="100%" stopColor="#101c2a" />
            </linearGradient>
            <linearGradient id="jdeck" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d7e3ec" />
                <stop offset="100%" stopColor="#9fb4c4" />
            </linearGradient>
        </defs>

        {/* waterline reflection */}
        <ellipse cx="230" cy="196" rx="200" ry="14" fill="rgba(5,16,28,0.35)" />

        {/* hull */}
        <path
            d="M22 176 C 70 150, 160 138, 260 142 C 350 146, 410 158, 442 172 L 436 198 C 320 182, 150 178, 34 200 Z"
            fill="url(#jhull)"
        />
        {/* deck */}
        <path
            d="M30 170 C 130 148, 330 148, 432 170 L 436 178 C 340 160, 150 158, 34 182 Z"
            fill="url(#jdeck)"
            opacity="0.9"
        />
        {/* cargo containers */}
        <rect x="90" y="118" width="42" height="38" rx="3" fill="#d97706" />
        <rect x="138" y="118" width="42" height="38" rx="3" fill="#0ea5e9" />
        <rect x="186" y="118" width="42" height="38" rx="3" fill="#d94f4f" />
        <rect x="90" y="82" width="42" height="38" rx="3" fill="#0d9488" />
        <rect x="138" y="82" width="42" height="38" rx="3" fill="#e7d35c" />
        <rect x="90" y="48" width="42" height="36" rx="3" fill="#f8fafc" opacity="0.9" />
        {/* container top highlights for a subtle 3D feel */}
        <rect x="90" y="116" width="42" height="4" fill="rgba(255,255,255,0.35)" />
        <rect x="138" y="116" width="42" height="4" fill="rgba(255,255,255,0.35)" />
        <rect x="186" y="116" width="42" height="4" fill="rgba(255,255,255,0.35)" />
        <rect x="90" y="80" width="42" height="4" fill="rgba(255,255,255,0.35)" />
        {/* bridge + funnel */}
        <rect x="250" y="96" width="110" height="46" rx="5" fill="#eef4f8" />
        <rect x="258" y="104" width="20" height="16" rx="2" fill="#7dd3fc" />
        <rect x="284" y="104" width="20" height="16" rx="2" fill="#7dd3fc" />
        <rect x="310" y="104" width="20" height="16" rx="2" fill="#7dd3fc" />
        <rect x="332" y="60" width="26" height="42" rx="4" fill="#22364c" />
        <rect x="326" y="50" width="38" height="14" rx="6" fill="#0c4a6e" />
        {/* mast + flag */}
        <path d="M120 48 L120 20" stroke="#3a4a5c" strokeWidth="4" strokeLinecap="round" />
        <path d="M120 22 L146 30 L120 38 Z" fill="#0ea5e9" />
    </svg>
);

const CourseBoat = () => (
    <svg viewBox="0 0 460 220" width="100%" height="100%">
        <defs>
            <linearGradient id="csail" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f6efdd" />
                <stop offset="60%" stopColor="#e7d9b6" />
                <stop offset="100%" stopColor="#c9b789" />
            </linearGradient>
            <linearGradient id="chull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8a5a34" />
                <stop offset="55%" stopColor="#6b4024" />
                <stop offset="100%" stopColor="#3a2314" />
            </linearGradient>
        </defs>

        {/* waterline reflection */}
        <ellipse cx="230" cy="196" rx="185" ry="13" fill="rgba(5,16,28,0.3)" />

        {/* billowing lateen sail */}
        <path
            d="M258 14 C 200 40, 120 96, 54 158 C 108 132, 178 122, 258 132 C 258 92, 258 54, 258 14 Z"
            fill="url(#csail)"
            stroke="#b8a878"
            strokeWidth="1"
            opacity="0.95"
        />
        {/* red stripe on the sail */}
        <path
            d="M54 158 C 108 132, 178 122, 258 132 L 258 122 C 178 112, 112 122, 62 146 Z"
            fill="#b03a24"
            opacity="0.85"
        />
        {/* mast + yard */}
        <path d="M258 8 L258 152" stroke="#4a2f1a" strokeWidth="4" strokeLinecap="round" />
        <path d="M258 14 L48 164" stroke="#5a3a22" strokeWidth="3" strokeLinecap="round" />
        {/* pennant */}
        <path d="M258 8 L236 12 L258 16 Z" fill="#b03a24" />
        {/* hull */}
        <path
            d="M18 150 C 76 138, 150 132, 230 136 C 306 140, 368 148, 418 158 L 410 178 C 330 168, 150 162, 34 178 Z"
            fill="url(#chull)"
        />
        {/* gunwale */}
        <path
            d="M22 150 C 78 139, 152 133, 232 137 C 306 141, 366 149, 414 159"
            fill="none"
            stroke="#c9a468"
            strokeWidth="2"
            opacity="0.85"
        />
        {/* waterline */}
        <path
            d="M36 168 C 150 160, 330 162, 410 170 L 410 178 C 330 168, 150 162, 34 178 Z"
            fill="#10283c"
            opacity="0.6"
        />
        {/* bowsprit */}
        <path d="M18 150 L 4 158" stroke="#5a3a22" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

const MarineScene = ({ className = '' }) => {
    const { t } = useLanguage();
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const ctx = canvas.getContext('2d');
        let width = 0;
        let height = 0;
        let rafId = 0;
        const startTime = performance.now();
        const ripples = [];

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const mix = (c1, c2, t) => [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t),
        ];
        const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

        const horizonY = () => height * 0.36;

        const drawSky = () => {
            const hy = horizonY();
            const g = ctx.createLinearGradient(0, 0, 0, hy);
            g.addColorStop(0, '#0a2e52');
            g.addColorStop(0.55, '#1d5c8a');
            g.addColorStop(0.85, '#5a9ec0');
            g.addColorStop(1, '#a8d2e2');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, hy);

            const sunX = width * 0.7;
            const sunY = hy - 4;
            const glow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, width * 0.26);
            glow.addColorStop(0, 'rgba(255,246,214,0.95)');
            glow.addColorStop(0.18, 'rgba(255,232,178,0.55)');
            glow.addColorStop(0.5, 'rgba(255,224,160,0.16)');
            glow.addColorStop(1, 'rgba(255,224,160,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, hy + 2);

            const haze = ctx.createLinearGradient(0, hy - 14, 0, hy + 6);
            haze.addColorStop(0, 'rgba(200,226,238,0)');
            haze.addColorStop(0.5, 'rgba(214,236,244,0.5)');
            haze.addColorStop(1, 'rgba(214,236,244,0)');
            ctx.fillStyle = haze;
            ctx.fillRect(0, hy - 14, width, 20);
        };

        const waveY = (x, depth, t) => {
            const hy = horizonY();
            const base = hy + (height - hy) * Math.pow(depth, 2.5);
            const amp = 1 + depth * depth * 17;
            const wl = 46 + depth * depth * 230;
            const speed = 0.00055 + depth * 0.0011;
            const phase = t * speed + depth * 6.3;
            return base + Math.sin((x / wl) * Math.PI * 2 + phase) * amp;
        };

        const drawSea = (t) => {
            const hy = horizonY();
            const rows = 36;
            const horizonC = [150, 198, 220];
            const deepC = [8, 36, 68];

            const base = ctx.createLinearGradient(0, hy, 0, height);
            base.addColorStop(0, '#3f86ad');
            base.addColorStop(0.5, '#164a78');
            base.addColorStop(1, '#0a2c50');
            ctx.fillStyle = base;
            ctx.fillRect(0, hy, width, height - hy);

            for (let i = 0; i < rows; i++) {
                const d0 = i / (rows - 1);
                const d1 = (i + 1) / (rows - 1);
                const colTop = mix(horizonC, deepC, d0);
                const colBot = mix(horizonC, deepC, d1);

                ctx.beginPath();
                let started = false;
                for (let x = -6; x <= width + 6; x += 6) {
                    const y = waveY(x, d0, t);
                    if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
                }
                for (let x = width + 6; x >= -6; x -= 6) {
                    ctx.lineTo(x, waveY(x, d1, t));
                }
                ctx.closePath();
                const band = ctx.createLinearGradient(0, waveY(0, d0, t), 0, waveY(0, d1, t) + 2);
                band.addColorStop(0, rgba(colTop, 0.96));
                band.addColorStop(1, rgba(colBot, 1));
                ctx.fillStyle = band;
                ctx.fill();
            }
        };

        const drawRipples = () => {
            for (let i = ripples.length - 1; i >= 0; i--) {
                const r = ripples[i];
                r.age += 16;
                if (r.age > 1500) { ripples.splice(i, 1); continue; }
                const p = r.age / 1500;
                const rx = 8 + p * 74;
                const ry = rx * 0.28;
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`;
                ctx.lineWidth = 1.4;
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(240,250,255,${0.3 * (1 - p)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        };

        const handleClick = (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (y > horizonY() + 8) ripples.push({ x, y, age: 0 });
        };

        const render = () => {
            const t = performance.now() - startTime;
            ctx.clearRect(0, 0, width, height);
            drawSky();
            drawSea(t);
            drawRipples();
            rafId = requestAnimationFrame(render);
        };

        resize();
        window.addEventListener('resize', resize);
        canvas.addEventListener('click', handleClick);
        rafId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('click', handleClick);
        };
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

    // The 3D fleet: job cargo ships sail left→right, course sailboats sail right→left,
    // each at a different depth (scale + translateZ) so the sea feels deep.
    const fleet = [
        { kind: 'jobs', cls: 'marine-vessel--job-a', w: 260, h: 128, dur: 64, delay: -8, depth: 1 },
        { kind: 'courses', cls: 'marine-vessel--course-a', w: 230, h: 118, dur: 82, delay: -30, depth: 0.78 },
        { kind: 'jobs', cls: 'marine-vessel--job-b', w: 180, h: 92, dur: 104, delay: -46, depth: 0.55 },
        { kind: 'courses', cls: 'marine-vessel--course-b', w: 150, h: 78, dur: 122, delay: -70, depth: 0.42 },
    ];

    return (
        <div className={`marine-scene ${className}`.trim()}>
            <canvas ref={canvasRef} className="marine-canvas" aria-hidden="true" />

            {/* Flock of gulls: wings swing with life while gliding */}
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

            {/* 3D fleet of boats advertising jobs & courses */}
            <div className="marine-fleet" aria-hidden="true">
                {fleet.map((vessel) => (
                    <div
                        key={vessel.cls}
                        className={`marine-vessel marine-vessel--${vessel.kind} ${vessel.cls}`}
                        style={{ '--dur': `${vessel.dur}s`, '--delay': `${vessel.delay}s`, '--depth': vessel.depth }}
                    >
                        <div className="marine-vessel__rig">
                            <div className="marine-vessel__svg" style={{ width: vessel.w, height: vessel.h }}>
                                {vessel.kind === 'jobs' ? <JobShip /> : <CourseBoat />}
                            </div>
                        </div>
                        <div className="marine-vessel__card">
                            <span className="marine-vessel__kicker">
                                {vessel.kind === 'jobs' ? '⚓ ' : '🧭 '}
                                {vessel.kind === 'jobs' ? t('boatJobs') : t('boatCourses')}
                            </span>
                            <strong className="marine-vessel__title">
                                {vessel.kind === 'jobs' ? t('jobBoatTitle') : t('courseBoatTitle')}
                            </strong>
                            <span className="marine-vessel__desc">
                                {vessel.kind === 'jobs' ? t('jobBoatDesc') : t('courseBoatDesc')}
                            </span>
                            <Link
                                className="marine-vessel__btn"
                                to={vessel.kind === 'jobs' ? '/jobs' : '/courses'}
                                tabIndex="0"
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
