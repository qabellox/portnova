import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

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
        const gulls = [
            { x: 0.18, y: 0.14, s: 0.0009, w: 1.0, ph: 0 },
            { x: 0.55, y: 0.09, s: 0.0012, w: 1.2, ph: 2.1 },
            { x: 0.8, y: 0.2, s: 0.0007, w: 0.85, ph: 4.2 },
        ];

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const horizon = () => height * 0.42;

        // deterministic pseudo-random for stable glitter positions
        const pseudo = (n) => {
            const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
            return s - Math.floor(s);
        };

        const drawSky = () => {
            const hz = horizon();
            // realistic sky: deep blue zenith -> cyan -> warm haze at the horizon
            const g = ctx.createLinearGradient(0, 0, 0, hz + 2);
            g.addColorStop(0, '#12568a');
            g.addColorStop(0.45, '#3f92c6');
            g.addColorStop(0.72, '#9ed0e8');
            g.addColorStop(0.9, '#f6d9aa');
            g.addColorStop(1, '#fbe3ba');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, hz + 2);

            // soft distant clouds
            ctx.save();
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < 7; i++) {
                const cx = width * (0.06 + i * 0.15);
                const cy = hz * (0.22 + pseudo(i) * 0.5);
                const rw = width * (0.09 + pseudo(i + 20) * 0.12);
                const cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, rw);
                cloud.addColorStop(0, 'rgba(255,255,255,0.6)');
                cloud.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = cloud;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rw, rw * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        };

        const drawSun = (t) => {
            const sx = width * 0.72;
            const sy = horizon() * 0.96;
            const r = Math.min(width, height) * 0.05;
            const pulse = 1 + Math.sin(t * 0.0012) * 0.03;

            // god rays sweeping from the sun
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            for (let i = 0; i < 7; i++) {
                const ang = -0.55 + i * 0.16 + Math.sin(t * 0.0004 + i * 1.3) * 0.04;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(ang);
                const ray = ctx.createLinearGradient(0, 0, 0, -hz * 0.9);
                ray.addColorStop(0, 'rgba(255,238,180,0.35)');
                ray.addColorStop(1, 'rgba(255,238,180,0)');
                ctx.fillStyle = ray;
                ctx.beginPath();
                ctx.moveTo(-r * 0.4, 0);
                ctx.lineTo(r * 0.4, 0);
                ctx.lineTo(r * 1.5, -hz * 0.9);
                ctx.lineTo(-r * 1.5, -hz * 0.9);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();

            // large atmospheric glow
            const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 6);
            glow.addColorStop(0, 'rgba(255,246,205,0.95)');
            glow.addColorStop(0.3, 'rgba(255,238,180,0.5)');
            glow.addColorStop(1, 'rgba(255,238,180,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 6, 0, Math.PI * 2);
            ctx.fill();

            // sun disc
            const disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * pulse);
            disc.addColorStop(0, '#fffef5');
            disc.addColorStop(0.55, '#fff7d6');
            disc.addColorStop(1, 'rgba(254,240,138,0.1)');
            ctx.fillStyle = disc;
            ctx.beginPath();
            ctx.arc(sx, sy, r * pulse, 0, Math.PI * 2);
            ctx.fill();
        };

        const waveY = (x, t, base, amp, freq, speed, phase) =>
            base
            + Math.sin(x * freq + t * speed + phase) * amp
            + Math.sin(x * freq * 0.53 + t * speed * 0.71 + phase * 2) * amp * 0.4
            + Math.sin(x * freq * 0.29 + t * speed * 1.3 + phase * 3) * amp * 0.2;

        const drawWaveLayer = (t, base, amp, freq, speed, phase, colorTop, colorBottom, foam, foamAlpha) => {
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 3) {
                ctx.lineTo(x, waveY(x, t, base, amp, freq, speed, phase));
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            const g = ctx.createLinearGradient(0, base - amp * 2, 0, height);
            g.addColorStop(0, colorTop);
            g.addColorStop(1, colorBottom);
            ctx.fillStyle = g;
            ctx.fill();

            if (foam) {
                ctx.beginPath();
                for (let x = 0; x <= width; x += 3) {
                    const y = waveY(x, t, base, amp, freq, speed, phase);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `rgba(248,250,252,${foamAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        };

        const drawSea = (t) => {
            const hz = horizon();

            // depth-based water: deep navy at horizon -> coastal turquoise shallows near the viewer
            const base = ctx.createLinearGradient(0, hz, 0, height);
            base.addColorStop(0, '#0b5178');
            base.addColorStop(0.35, '#0d6f8e');
            base.addColorStop(0.7, '#0e8f96');
            base.addColorStop(1, '#12b3a2');
            ctx.fillStyle = base;
            ctx.fillRect(0, hz, width, height - hz);

            // sky reflection band just below the horizon (fresnel)
            const refl = ctx.createLinearGradient(0, hz, 0, hz + height * 0.14);
            refl.addColorStop(0, 'rgba(220,240,255,0.55)');
            refl.addColorStop(1, 'rgba(220,240,255,0)');
            ctx.fillStyle = refl;
            ctx.fillRect(0, hz, width, height * 0.14);

            // lit translucent wave layers (additive for a shader feel)
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            drawWaveLayer(t, hz + height * 0.06, height * 0.018, 0.006, 0.001, 0, 'rgba(80,180,220,0.5)', 'rgba(13,148,136,0)', false, 0);
            drawWaveLayer(t, hz + height * 0.16, height * 0.026, 0.0045, 0.0008, 1.7, 'rgba(90,200,230,0.45)', 'rgba(20,184,166,0)', true, 0.35);
            drawWaveLayer(t, hz + height * 0.3, height * 0.032, 0.0038, 0.0006, 3.1, 'rgba(45,212,191,0.5)', 'rgba(13,148,136,0)', true, 0.5);
            drawWaveLayer(t, hz + height * 0.44, height * 0.036, 0.0032, 0.0005, 4.4, 'rgba(94,234,212,0.55)', 'rgba(20,184,166,0)', true, 0.65);
            drawWaveLayer(t, hz + height * 0.54, height * 0.028, 0.0026, 0.0004, 5.5, 'rgba(248,250,252,0.7)', 'rgba(248,250,252,0)', true, 0.8);
            ctx.restore();

            // sun glitter: hundreds of dancing specular highlights beneath the sun
            const sx = width * 0.72;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const rows = 26;
            for (let i = 0; i < rows; i++) {
                const p = (i + 1) / rows;
                const gy = hz + p * p * (height - hz);
                const spread = width * (0.02 + p * 0.16);
                const count = Math.max(3, Math.round(14 * (1 - p) + 6));
                for (let k = 0; k < count; k++) {
                    const seed = i * 31 + k * 7;
                    const dx = (pseudo(seed) - 0.5) * 2 * spread;
                    const flick = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.004 + seed * 1.7));
                    const gx = sx + dx;
                    const gw = (2 + p * 6) * (0.5 + flick * 0.8);
                    const gh = gw * 0.35;
                    ctx.fillStyle = `rgba(255,240,180,${0.5 * flick})`;
                    ctx.beginPath();
                    ctx.ellipse(gx, gy, gw, gh, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        };

        const drawGull = (x, y, wing, time) => {
            const flap = Math.sin(time * 0.004 + wing * 2) * 0.55;
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = 'rgba(30,41,59,0.9)';
            ctx.fillStyle = 'rgba(248,250,252,0.95)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.ellipse(0, 0, 7, 2.4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-8, -6 - flap * 6, -18, -4 - flap * 8);
            ctx.quadraticCurveTo(-10, -2, 0, 0);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(8, -6 - flap * 6, 18, -4 - flap * 8);
            ctx.quadraticCurveTo(10, -2, 0, 0);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(3, -1.5, 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        const drawGulls = (t) => {
            gulls.forEach((g) => {
                const travel = (t * g.s * 1000) % 1;
                const x = width * (0.1 + travel * 0.9);
                const y = horizon() * g.y + Math.sin(t * 0.001 + g.ph) * 8;
                drawGull(x, y, g.w, t);
            });
        };

        const drawRipples = (t) => {
            for (let i = ripples.length - 1; i >= 0; i--) {
                const r = ripples[i];
                r.age += 16;
                if (r.age > 1100) {
                    ripples.splice(i, 1);
                    continue;
                }
                const p = r.age / 1100;
                const radius = 8 + p * 42;
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, radius, radius * 0.35, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`;
                ctx.lineWidth = 1.8;
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, radius * 0.5, radius * 0.18, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(248,250,252,${0.35 * (1 - p)})`;
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }
        };

        const handleClick = (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (y > horizon()) {
                ripples.push({ x, y, age: 0 });
            }
        };

        const render = () => {
            const t = performance.now() - startTime;
            ctx.clearRect(0, 0, width, height);
            drawSky();
            drawSun(t);
            drawSea(t);
            drawGulls(t);
            drawRipples(t);
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

    return (
        <div className={`marine-scene ${className}`.trim()}>
            <canvas ref={canvasRef} className="marine-canvas" aria-hidden="true" />

            <div className="marine-boat">
                <svg className="marine-boat__svg" viewBox="0 0 360 130" width="360" height="130">
                    <defs>
                        <linearGradient id="boatHull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1f4e63" />
                            <stop offset="100%" stopColor="#0a2230" />
                        </linearGradient>
                        <linearGradient id="boatStripe" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9c3d2f" />
                            <stop offset="100%" stopColor="#5c1e1e" />
                        </linearGradient>
                        <linearGradient id="boatDeck" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#dce7ee" />
                            <stop offset="100%" stopColor="#a8bcc9" />
                        </linearGradient>
                    </defs>

                    <path d="M0 108 C 45 104, 70 112, 110 108 C 150 104, 190 112, 230 108 C 270 104, 315 112, 360 108 L 360 130 L 0 130 Z" fill="#ffffff" opacity="0.18" />

                    <path d="M10 78 L 350 78 L 338 116 L 24 116 Z" fill="url(#boatHull)" />
                    <path d="M30 104 L 330 104 L 338 116 L 24 116 Z" fill="url(#boatStripe)" />
                    <rect x="18" y="73" width="324" height="7" rx="3" fill="url(#boatDeck)" />
                    <path d="M10 78 L 26 74 L 24 92 L 10 96 Z" fill="#0f3a4f" />
                    <path d="M350 78 L 350 116 L 338 116 L 338 78 Z" fill="#0c3044" />

                    <rect x="120" y="18" width="5" height="56" fill="#6d4a2b" />
                    <path d="M125 22 L 216 60 L 125 76 Z" fill="#f8fafc" opacity="0.95" stroke="#cbd5e1" strokeWidth="1" />
                    <path d="M125 22 L 92 74 L 125 78 Z" fill="#eef2f7" opacity="0.9" />

                    <rect x="228" y="42" width="92" height="31" rx="3" fill="#e5edf3" />
                    <rect x="236" y="50" width="12" height="11" rx="1" fill="#0ea5e9" opacity="0.9" />
                    <rect x="252" y="50" width="12" height="11" rx="1" fill="#0ea5e9" opacity="0.9" />
                    <rect x="268" y="50" width="12" height="11" rx="1" fill="#0ea5e9" opacity="0.9" />
                    <rect x="26" y="76" width="314" height="2" fill="#0a2230" opacity="0.7" />
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
