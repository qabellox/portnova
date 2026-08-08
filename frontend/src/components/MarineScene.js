import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * MarineScene — photoreal live wallpaper for PortNova.
 *
 * A real ocean photograph is the base layer (slow Ken Burns drift), so the
 * water is genuinely realistic, not drawn. On top of it a canvas adds subtle
 * moving sunlight shimmer + specular glints so the sea feels alive, plus
 * interactive ripples wherever you click on the water. A vessel with app
 * shortcuts sails slowly across the foreground. Gulls drift slowly and
 * naturally.
 */
const MarineScene = ({ className = '' }) => {
    const canvasRef = useRef(null);
    const boatRef = useRef(null);

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

        const pseudo = (n) => {
            const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
            return s - Math.floor(s);
        };

        // Slow sunlight shimmer + specular glints dancing on the water
        const drawWaterLife = (t) => {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            // sun glitter column (slow flicker)
            const sx = width * 0.68;
            const rows = 34;
            for (let i = 0; i < rows; i++) {
                const p = (i + 1) / rows;
                const gy = height * (0.5 + p * 0.5);
                const spread = width * (0.04 + p * 0.18);
                const count = Math.max(4, Math.round(20 * (1 - p) + 8));
                for (let k = 0; k < count; k++) {
                    const seed = i * 41 + k * 13;
                    const dx = (pseudo(seed) - 0.5) * 2 * spread;
                    const flick = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.0018 + seed * 2.3));
                    const gx = sx + dx;
                    const gw = (2 + p * 7) * (0.5 + flick * 0.9);
                    const gh = gw * 0.3;
                    ctx.fillStyle = `rgba(255,244,200,${0.5 * flick})`;
                    ctx.beginPath();
                    ctx.ellipse(gx, gy, gw, gh, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // slow moving light bands (gentle swell highlights)
            for (let b = 0; b < 3; b++) {
                const phase = t * 0.00012 + b * 2.1;
                const bandY = height * (0.55 + Math.sin(phase) * 0.16 + b * 0.12);
                const bandH = 10 + b * 8;
                const bandW = width * (0.5 + b * 0.18);
                const bandX = width * 0.5 + Math.cos(phase * 0.8) * width * 0.1 - bandW / 2;
                const grad = ctx.createLinearGradient(bandX, bandY, bandX + bandW, bandY);
                grad.addColorStop(0, 'rgba(255,255,255,0)');
                grad.addColorStop(0.5, `rgba(255,255,255,${0.12 - b * 0.03})`);
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(bandX + bandW / 2, bandY, bandW / 2, bandH, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        };

        const drawRipples = () => {
            for (let i = ripples.length - 1; i >= 0; i--) {
                const r = ripples[i];
                r.age += 16;
                if (r.age > 1300) {
                    ripples.splice(i, 1);
                    continue;
                }
                const p = r.age / 1300;
                const radius = 10 + p * 60;
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, radius, radius * 0.32, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - p)})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, radius * 0.55, radius * 0.18, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(250,250,250,${0.4 * (1 - p)})`;
                ctx.lineWidth = 1.3;
                ctx.stroke();
            }
        };

        const handleClick = (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (y > height * 0.42) {
                ripples.push({ x, y, age: 0 });
            }
        };

        const render = () => {
            const t = performance.now() - startTime;
            ctx.clearRect(0, 0, width, height);
            drawWaterLife(t);
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

    return (
        <div className={`marine-scene ${className}`.trim()}>
            {/* Real ocean photo — the live wallpaper base */}
            <div className="marine-photo" style={{ backgroundImage: 'url(/images/ocean.jpg)' }} />
            <div className="marine-photo marine-photo--tint" />

            {/* Light + interactive ripples over the photo */}
            <canvas ref={canvasRef} className="marine-canvas" aria-hidden="true" />

            {/* Slow, realistic gulls */}
            <div className="marine-gulls" aria-hidden="true">
                <span className="marine-gull marine-gull--1"><svg viewBox="0 0 60 20" width="60" height="20"><path d="M3 12 C 9 4, 18 3, 30 8 C 42 3, 51 4, 57 12 C 52 8, 46 8, 30 13 C 14 8, 8 8, 3 12 Z" fill="#1e293b" opacity="0.85"/></svg></span>
                <span className="marine-gull marine-gull--2"><svg viewBox="0 0 60 20" width="60" height="20"><path d="M3 12 C 9 4, 18 3, 30 8 C 42 3, 51 4, 57 12 C 52 8, 46 8, 30 13 C 14 8, 8 8, 3 12 Z" fill="#1e293b" opacity="0.7"/></svg></span>
                <span className="marine-gull marine-gull--3"><svg viewBox="0 0 60 20" width="60" height="20"><path d="M3 12 C 9 4, 18 3, 30 8 C 42 3, 51 4, 57 12 C 52 8, 46 8, 30 13 C 14 8, 8 8, 3 12 Z" fill="#1e293b" opacity="0.6"/></svg></span>
            </div>

            {/* Interactive vessel with app shortcuts on its deck */}
            <div className="marine-boat" ref={boatRef}>
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

                    <path d="M0 108 C 45 104, 70 112, 110 108 C 150 104, 190 112, 230 108 C 270 104, 315 112, 360 108 L 360 130 L 0 130 Z" fill="#ffffff" opacity="0.14" />

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
