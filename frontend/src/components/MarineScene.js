import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * MarineScene — front-view shader-style live seascape.
 *
 * Everything is drawn on a canvas with real perspective: a sky with sun and
 * drifting haze, a horizon, and animated waves that roll toward the viewer.
 * Thin sun-glitter streaks sit on the water (no glowing circles), click on
 * the sea to spawn realistic ripples, a felucca with app shortcuts sails
 * slowly across, and a flock of gulls drifts high in the sky.
 */
const MarineScene = ({ className = '' }) => {
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

        // Soft drifting clouds in the sky (translucent blobs)
        const clouds = [
            { x: 0.12, y: 0.10, w: 0.34, h: 0.05, s: 0.000008, a: 0.5 },
            { x: 0.55, y: 0.20, w: 0.42, h: 0.045, s: 0.000006, a: 0.42 },
            { x: 0.30, y: 0.29, w: 0.30, h: 0.035, s: 0.000010, a: 0.34 },
        ];

        const drawSky = (t) => {
            const hy = horizonY();
            const g = ctx.createLinearGradient(0, 0, 0, hy);
            g.addColorStop(0, '#0a2e52');
            g.addColorStop(0.55, '#1d5c8a');
            g.addColorStop(0.85, '#5a9ec0');
            g.addColorStop(1, '#a8d2e2');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, hy);

            // Sun: soft warm glow near the horizon (diffuse, not a hard disc)
            const sunX = width * 0.7;
            const sunY = hy - 4;
            const glow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, width * 0.26);
            glow.addColorStop(0, 'rgba(255,246,214,0.95)');
            glow.addColorStop(0.18, 'rgba(255,232,178,0.55)');
            glow.addColorStop(0.5, 'rgba(255,224,160,0.16)');
            glow.addColorStop(1, 'rgba(255,224,160,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, hy + 2);

            // Drifting clouds
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            for (const c of clouds) {
                const cx = (width * c.x + t * c.s * width) % (width * 1.4) - width * 0.2;
                const cy = hy * c.y;
                const cw = width * c.w;
                const ch = hy * c.h;
                const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, cw);
                grad.addColorStop(0, `rgba(250,252,255,${c.a})`);
                grad.addColorStop(1, 'rgba(250,252,255,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Haze right above the horizon
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

            // Sea base gradient
            const base = ctx.createLinearGradient(0, hy, 0, height);
            base.addColorStop(0, '#3f86ad');
            base.addColorStop(0.5, '#164a78');
            base.addColorStop(1, '#0a2c50');
            ctx.fillStyle = base;
            ctx.fillRect(0, hy, width, height - hy);

            // Perspective wave bands
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

                // Crest highlight (foam) on foreground waves
                if (d0 > 0.5) {
                    const amp = 1 + d0 * d0 * 17;
                    ctx.beginPath();
                    started = false;
                    for (let x = -6; x <= width + 6; x += 6) {
                        const y = waveY(x, d0, t);
                        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
                    }
                    const foamA = 0.05 + (d0 - 0.5) * 0.22;
                    ctx.strokeStyle = `rgba(235,248,255,${foamA})`;
                    ctx.lineWidth = 1 + d0 * 1.8;
                    ctx.stroke();
                }
            }
        };

        // Thin horizontal sun-glitter streaks on the water (not circles)
        const drawGlitter = (t) => {
            const hy = horizonY();
            const sunX = width * 0.7;
            for (let i = 0; i < 30; i++) {
                const depth = i / 29;
                const base = hy + (height - hy) * Math.pow(depth, 2.3);
                const flick = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.0022 + i * 1.9));
                const len = 6 + depth * depth * 90;
                const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
                const x = sunX + (jitter - 0.5) * depth * width * 0.22;
                const alpha = (0.05 + depth * 0.3) * flick;
                ctx.strokeStyle = `rgba(255,250,228,${alpha})`;
                ctx.lineWidth = 1 + depth * 1.4;
                ctx.beginPath();
                ctx.moveTo(x - len / 2, base);
                ctx.lineTo(x + len / 2, base);
                ctx.stroke();
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
            drawSky(t);
            drawSea(t);
            drawGlitter(t);
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

    // Realistic gull silhouette (dark, thin, two wings + body)
    const gullPath =
        'M2 16 C 7 7, 16 3, 27 9 C 30 7, 34 7, 38 10 C 46 4, 56 7, 60 15 ' +
        'C 53 11, 46 10, 41 12 C 37 12, 34 13, 31 12 C 26 10, 12 11, 2 16 Z';

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
            {/* Front-view animated seascape — sky, horizon, rolling waves, interaction */}
            <canvas ref={canvasRef} className="marine-canvas" aria-hidden="true" />

            {/* Flock of realistic gulls */}
            <div className="marine-gulls" aria-hidden="true">
                {gulls.map((g) => (
                    <span key={g.cls} className={`marine-gull ${g.cls}`} style={{ opacity: g.op }}>
                        <svg viewBox="0 0 60 24" width={g.size} height={g.size * 0.4}>
                            <path d={gullPath} fill="#1c2a3a" />
                        </svg>
                    </span>
                ))}
            </div>

            {/* Realistic felucca with app shortcuts on its deck console */}
            <div className="marine-boat">
                <svg className="marine-boat__svg" viewBox="0 0 420 210" width="420" height="210">
                    <defs>
                        <linearGradient id="feluccaSail" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f6efdd" />
                            <stop offset="60%" stopColor="#e7d9b6" />
                            <stop offset="100%" stopColor="#cbb889" />
                        </linearGradient>
                        <linearGradient id="feluccaHull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8a5a34" />
                            <stop offset="55%" stopColor="#6b4024" />
                            <stop offset="100%" stopColor="#3a2314" />
                        </linearGradient>
                        <linearGradient id="feluccaStripe" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#b03a24" />
                            <stop offset="100%" stopColor="#8a2418" />
                        </linearGradient>
                    </defs>

                    {/* Lateen sail with a gentle billow */}
                    <path
                        d="M 244 12 C 200 34, 128 96, 66 150 C 112 130, 176 122, 246 128 C 246 88, 245 50, 244 12 Z"
                        fill="url(#feluccaSail)"
                        stroke="#b8a878"
                        strokeWidth="1"
                        opacity="0.94"
                    />
                    {/* Red stripe near the sail foot */}
                    <path
                        d="M 66 150 C 112 130, 176 122, 246 128 L 246 118 C 176 112, 112 120, 72 140 Z"
                        fill="url(#feluccaStripe)"
                        opacity="0.9"
                    />
                    {/* Mast */}
                    <path d="M 244 6 L 244 152" stroke="#4a2f1a" strokeWidth="4" strokeLinecap="round" />
                    {/* Yard arm */}
                    <path d="M 244 12 L 60 156" stroke="#5a3a22" strokeWidth="3" strokeLinecap="round" />
                    {/* Small pennant */}
                    <path d="M 244 6 L 224 10 L 244 14 Z" fill="#b03a24" />

                    {/* Hull */}
                    <path
                        d="M 22 148 C 80 136, 150 132, 220 136 C 290 140, 350 146, 396 156 L 390 176 C 320 166, 150 160, 40 176 Z"
                        fill="url(#feluccaHull)"
                    />
                    {/* Gunwale */}
                    <path
                        d="M 26 148 C 84 137, 152 133, 222 137 C 290 141, 348 147, 392 157"
                        fill="none"
                        stroke="#c9a468"
                        strokeWidth="2"
                        opacity="0.85"
                    />
                    {/* Waterline */}
                    <path
                        d="M 40 166 C 150 158, 320 160, 390 168 L 390 176 C 320 166, 150 160, 40 176 Z"
                        fill="#10283c"
                        opacity="0.6"
                    />
                    {/* Bowsprit */}
                    <path d="M 22 148 L 6 156" stroke="#5a3a22" strokeWidth="3" strokeLinecap="round" />
                </svg>

                <nav className="marine-boat__icons" aria-label="Boat shortcuts">
                    <Link to="/jobs" className="marine-boat__icon" title="Jobs — الوظائف">
                        <span className="marine-boat__icon-mark">⚓</span>
                        <span className="marine-boat__icon-label">Jobs</span>
                    </Link>
                    <Link to="/courses" className="marine-boat__icon" title="Courses — الدورات">
                        <span className="marine-boat__icon-mark">🧭</span>
                        <span className="marine-boat__icon-label">Courses</span>
                    </Link>
                    <Link to="/cv-service" className="marine-boat__icon" title="CV Service — السيرة الذاتية">
                        <span className="marine-boat__icon-mark">📄</span>
                        <span className="marine-boat__icon-label">CV</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default MarineScene;
