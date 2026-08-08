import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * MarineScene: 3D live seascape.
 *
 * The sea is drawn on a canvas as a perspective field of rolling waves with
 * smooth shaded crests and soft specular glints (no hard lines or dashes).
 * On top of it, a 3D fleet sails across at different depths:
 *   - Cargo ships (⚓) advertise JOBS, sailing left to right.
 *   - Sailboats (🧭) advertise COURSES, sailing right to left.
 * Each boat rides the swells (bobbing + rocking that matches wave magnitude).
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
        const clamp01 = (v) => Math.max(0, Math.min(1, v));
        const rand = (seed) => {
            const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
            return x - Math.floor(x);
        };

        const horizonY = () => height * 0.36;

        const getDayLight = () => {
            const now = new Date();
            const mins = now.getHours() * 60 + now.getMinutes();
            const t = mins / 1440;
            return (Math.cos((t - 0.5) * Math.PI * 2) + 1) / 2;
        };

        const skyDay = [[10, 46, 82], [29, 92, 138], [90, 158, 192], [168, 210, 226]];
        const skyNight = [[2, 5, 13], [7, 18, 36], [16, 39, 66], [28, 58, 88]];

        const skyGradient = (dayLight) => {
            const g = ctx.createLinearGradient(0, 0, 0, horizonY());
            g.addColorStop(0, rgba(mix(skyNight[0], skyDay[0], dayLight), 1));
            g.addColorStop(0.4, rgba(mix(skyNight[1], skyDay[1], dayLight), 1));
            g.addColorStop(0.75, rgba(mix(skyNight[2], skyDay[2], dayLight), 1));
            g.addColorStop(1, rgba(mix(skyNight[3], skyDay[3], dayLight), 1));
            return g;
        };

        const drawSparkle = (x, y, r, alpha) => {
            const pr = r * 2.6;
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            ctx.moveTo(0, -pr);
            ctx.quadraticCurveTo(r, -r * 0.6, pr, 0);
            ctx.quadraticCurveTo(r, r * 0.6, 0, pr);
            ctx.quadraticCurveTo(-r, r * 0.6, -pr, 0);
            ctx.quadraticCurveTo(-r, -r * 0.6, 0, -pr);
            ctx.closePath();
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fill();
            ctx.restore();
        };

        const drawStars = (t, moonAlpha) => {
            const hy = horizonY();
            for (let i = 0; i < 26; i++) {
                const sx = rand(i) * width;
                const sy = rand(i + 50) * hy * 0.85;
                const size = 1 + (i % 4) * 1.1;
                const tw = 0.55 + 0.45 * Math.sin(t * 0.0012 + i * 2.1);
                const alpha = (0.35 + 0.65 * tw) * moonAlpha;
                if (i % 5 === 0) {
                    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 9);
                    glow.addColorStop(0, `rgba(200,220,255,${0.5 * alpha})`);
                    glow.addColorStop(1, 'rgba(200,220,255,0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(sx, sy, size * 9, 0, Math.PI * 2);
                    ctx.fill();
                }
                drawSparkle(sx, sy, size, alpha);
            }
            for (let i = 0; i < 120; i++) {
                const sx = rand(i + 200) * width;
                const sy = rand(i + 300) * hy * 0.8;
                const tw = 0.5 + 0.5 * Math.sin(t * 0.0018 + i * 3.1);
                const alpha = (0.18 + 0.4 * tw) * moonAlpha;
                drawSparkle(sx, sy, 0.55 + (i % 3) * 0.3, alpha);
            }
        };

        const drawSky = (t, dayLight) => {
            const hy = horizonY();
            ctx.fillStyle = skyGradient(dayLight);
            ctx.fillRect(0, 0, width, hy);

            const moonAlpha = clamp01((0.55 - dayLight) / 0.22);
            if (moonAlpha > 0.02) {
                const moonX = width * 0.24;
                const moonY = hy * 0.4;
                const mr = Math.max(24, width * 0.027);
                const glow = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, width * 0.2);
                glow.addColorStop(0, `rgba(226,236,252,${0.6 * moonAlpha})`);
                glow.addColorStop(0.35, `rgba(190,210,240,${0.2 * moonAlpha})`);
                glow.addColorStop(1, 'rgba(190,210,240,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, width, hy + 2);
                ctx.fillStyle = `rgba(244,248,255,${0.98 * moonAlpha})`;
                ctx.beginPath();
                ctx.arc(moonX, moonY, mr, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(160,180,210,${0.22 * moonAlpha})`;
                ctx.beginPath();
                ctx.arc(moonX - mr * 0.25, moonY + mr * 0.18, mr * 0.24, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(moonX + mr * 0.22, moonY - mr * 0.22, mr * 0.17, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(moonX + mr * 0.34, moonY + mr * 0.3, mr * 0.12, 0, Math.PI * 2);
                ctx.fill();
            }

            const sunAlpha = clamp01((dayLight - 0.45) / 0.22);
            if (sunAlpha > 0.02) {
                const sunX = width * 0.72;
                const sunY = hy - 6;
                const glow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, width * 0.26);
                glow.addColorStop(0, `rgba(255,246,214,${0.95 * sunAlpha})`);
                glow.addColorStop(0.18, `rgba(255,232,178,${0.55 * sunAlpha})`);
                glow.addColorStop(0.5, `rgba(255,224,160,${0.16 * sunAlpha})`);
                glow.addColorStop(1, 'rgba(255,224,160,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, width, hy + 2);
                ctx.fillStyle = `rgba(255,250,232,${0.98 * sunAlpha})`;
                ctx.beginPath();
                ctx.arc(sunX, sunY, Math.max(18, width * 0.022), 0, Math.PI * 2);
                ctx.fill();
            }

            if (moonAlpha > 0.04) {
                drawStars(t, moonAlpha);
            }

            // Soft haze at the horizon (never a hard white line)
            const haze = ctx.createLinearGradient(0, hy - 20, 0, hy + 12);
            haze.addColorStop(0, 'rgba(180,205,225,0)');
            haze.addColorStop(0.5, `rgba(190,214,232,${0.28 * (0.35 + dayLight * 0.65)})`);
            haze.addColorStop(1, 'rgba(180,205,225,0)');
            ctx.fillStyle = haze;
            ctx.fillRect(0, hy - 20, width, 32);
        };

        /**
         * Ocean surface height at (x, depth d in 0..1, time t).
         * Layers of swells + chop for an organic, non-cubic surface.
         */
        const waveY = (x, d, t) => {
            const hy = horizonY();
            const base = hy + (height - hy) * Math.pow(d, 2.15);
            const amp = 2.5 + d * d * 34;
            const wl = 90 + d * d * 330;
            const speed = 0.00036 + d * 0.001;
            const phase = t * speed + d * 5.2;
            const a = Math.sin((x / wl) * Math.PI * 2 + phase);
            const b = Math.sin((x / (wl * 0.42)) * Math.PI * 2 + phase * 1.45 + 1.3) * 0.42;
            const c = Math.sin((x / (wl * 0.16)) * Math.PI * 2 + phase * 2.2 + 3.1) * 0.16;
            return base + (a + b + c) * amp;
        };

        /** Filled, shaded 3D sea: soft crest gradients, no strokes or dashes. */
        const drawSea = (t, dayLight) => {
            const hy = horizonY();
            const moonAlpha = clamp01((0.55 - dayLight) / 0.22);
            const nightAmt = 1 - dayLight;

            const horizonC = mix([150, 198, 220], [44, 82, 112], nightAmt);
            const deepC = mix([8, 36, 68], [3, 12, 28], nightAmt);
            const crestC = mix([196, 228, 240], [92, 132, 164], nightAmt);

            const base = ctx.createLinearGradient(0, hy, 0, height);
            base.addColorStop(0, rgba(mix([63, 134, 173], [30, 70, 104], nightAmt), 1));
            base.addColorStop(0.5, rgba(mix([22, 74, 120], [9, 28, 54], nightAmt), 1));
            base.addColorStop(1, rgba(mix([10, 44, 80], [4, 14, 30], nightAmt), 1));
            ctx.fillStyle = base;
            ctx.fillRect(0, hy, width, height - hy);

            // Perspective wave bands drawn as TRANSLUCENT layers that fade to
            // transparent at the top of each band, so every wave blends into the
            // one behind it. No opaque color seams: just one continuous rolling
            // ocean with a lit crest on each wave facing the viewer.
            const rows = 46;
            for (let i = 0; i < rows; i++) {
                const d0 = i / rows;
                const d1 = (i + 1) / rows;
                const y0 = waveY(0, d0, t);
                const y1 = waveY(0, d1, t);
                const bandA = (0.04 + d0 * 0.22) * (0.5 + 0.5 * dayLight + 0.2 * moonAlpha);
                if (bandA < 0.02) continue;

                ctx.beginPath();
                for (let x = -10; x <= width + 10; x += 5) {
                    const y = waveY(x, d0, t);
                    if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                for (let x = width + 10; x >= -10; x -= 5) {
                    ctx.lineTo(x, waveY(x, d1, t));
                }
                ctx.closePath();

                const g = ctx.createLinearGradient(0, y0, 0, y1 + 2);
                g.addColorStop(0, rgba(deepC, 0));
                g.addColorStop(0.55, rgba(deepC, bandA * 0.35));
                g.addColorStop(1, rgba(crestC, bandA));
                ctx.fillStyle = g;
                ctx.fill();
            }

            // Soft specular glints on the wave faces (gentle sheen, not lines)
            const glintC = dayLight > 0.5 ? '255,255,255' : '190,215,245';
            for (let i = 0; i < 60; i++) {
                const rx = rand(i);
                const ry = rand(i + 60);
                const x = rx * width;
                const y = hy + Math.pow(ry, 1.4) * (height - hy) * 0.95;
                const d = ry;
                const tw = 0.5 + 0.5 * Math.sin(t * 0.0024 + i * 1.9);
                const r = (2 + d * 12) * (0.6 + 0.4 * tw);
                const alpha = (0.03 + 0.12 * d) * (0.3 + 0.7 * dayLight) * tw;
                if (alpha < 0.02) continue;
                const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
                gl.addColorStop(0, `rgba(${glintC},${alpha})`);
                gl.addColorStop(1, `rgba(${glintC},0)`);
                ctx.fillStyle = gl;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
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
            const dayLight = getDayLight();
            ctx.clearRect(0, 0, width, height);
            drawSky(t, dayLight);
            drawSea(t, dayLight);
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

    // Each boat rides the swells: bob amplitude grows with depth (wave magnitude)
    const fleet = [
        { kind: 'jobs', cls: 'marine-vessel--job-a', w: 340, h: 166, dur: 60, delay: -8, depth: 1, focus: 'Frontend Product Intern', titleKey: 'fleetJob1Title', descKey: 'fleetJob1Desc' },
        { kind: 'courses', cls: 'marine-vessel--course-a', w: 296, h: 148, dur: 78, delay: -30, depth: 0.8, focus: 'Product Design Sprint', titleKey: 'fleetCourse1Title', descKey: 'fleetCourse1Desc' },
        { kind: 'jobs', cls: 'marine-vessel--job-b', w: 224, h: 112, dur: 100, delay: -46, depth: 0.58, focus: 'Operations Coordinator', titleKey: 'fleetJob2Title', descKey: 'fleetJob2Desc' },
        { kind: 'courses', cls: 'marine-vessel--course-b', w: 188, h: 96, dur: 118, delay: -66, depth: 0.45, focus: 'Startup Operations', titleKey: 'fleetCourse2Title', descKey: 'fleetCourse2Desc' },
        { kind: 'courses', cls: 'marine-vessel--course-c', w: 132, h: 68, dur: 142, delay: -88, depth: 0.32, focus: 'Career Readiness', titleKey: 'fleetCourse3Title', descKey: 'fleetCourse3Desc' },
    ];

    return (
        <div className={`marine-scene ${className}`.trim()}>
            <canvas ref={canvasRef} className="marine-canvas" aria-hidden="true" />

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

            <div className="marine-fleet" aria-hidden="true">
                {fleet.map((vessel) => (
                    <div
                        key={vessel.cls}
                        className={`marine-vessel marine-vessel--${vessel.kind} ${vessel.cls}`}
                        style={{ '--dur': `${vessel.dur}s`, '--delay': `${vessel.delay}s`, '--depth': vessel.depth, '--bob': `${6 + vessel.depth * 12}px` }}
                    >
                        <div className="marine-vessel__rig">
                            <div className="marine-vessel__svg" style={{ width: vessel.w, height: vessel.h }}>
                                {vessel.kind === 'jobs' ? <JobShip /> : <CourseBoat />}
                            </div>
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
                                    tabIndex="0"
                                >
                                    {vessel.kind === 'jobs' ? t('boatSeeJobs') : t('boatSeeCourses')}
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarineScene;
