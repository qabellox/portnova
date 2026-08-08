import React, { useMemo } from 'react';

/**
 * MarineScene — realistic Port Said live-wallpaper background.
 * Real ocean photo base (Ken Burns drift) + translucent waves,
 * lens-glowing sun, cargo vessel, gulls and fish silhouettes.
 */
const MarineScene = ({ className = '' }) => {
    const gulls = useMemo(
        () =>
            Array.from({ length: 3 }, (_, index) => ({
                id: index,
                top: 8 + (index * 9) % 24,
                delay: (index * 3.4) % 9,
                duration: 14 + (index % 3) * 4,
                scale: 0.6 + (index % 3) * 0.16,
            })),
        []
    );

    const fish = useMemo(
        () =>
            Array.from({ length: 5 }, (_, index) => ({
                id: index,
                bottom: 30 + (index * 8) % 26,
                delay: (index * 5.1) % 12,
                duration: 20 + (index % 5) * 5,
                scale: 0.5 + (index % 3) * 0.22,
            })),
        []
    );

    return (
        <div className={`marine-scene ${className}`.trim()} aria-hidden="true">
            {/* Real ocean photo base with live-wallpaper drift */}
            <div
                className="marine-photo"
                style={{ backgroundImage: 'url(/images/ocean.jpg)' }}
            />
            <div className="marine-overlay" />

            {/* Sun */}
            <div className="marine-sun">
                <div className="marine-sun__core" />
                <div className="marine-sun__glow" />
            </div>

            {/* Gulls */}
            <div className="marine-gulls">
                {gulls.map((g) => (
                    <span key={g.id} className="marine-gull" style={{ top: `${g.top}%`, animationDelay: `${g.delay}s`, animationDuration: `${g.duration}s`, transform: `scale(${g.scale})` }}>
                        <svg viewBox="0 0 44 18" width="44" height="18">
                            <path d="M1 12 C 7 3, 15 3, 22 8 C 29 3, 37 3, 43 12 C 39 8, 33 8, 22 14 C 11 8, 5 8, 1 12 Z" fill="#f8fafc" opacity="0.9" />
                        </svg>
                    </span>
                ))}
            </div>

            {/* Cargo vessel — shaded, realistic */}
            <div className="marine-ship">
                <svg viewBox="0 0 320 110" width="320" height="110">
                    <defs>
                        <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2f5d73" />
                            <stop offset="45%" stopColor="#163a4d" />
                            <stop offset="100%" stopColor="#0a2230" />
                        </linearGradient>
                        <linearGradient id="hullBottom" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8a2f2f" />
                            <stop offset="100%" stopColor="#5c1e1e" />
                        </linearGradient>
                        <linearGradient id="deckGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d7e3ea" />
                            <stop offset="100%" stopColor="#9fb4c0" />
                        </linearGradient>
                        <linearGradient id="containerGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e76f51" />
                            <stop offset="100%" stopColor="#b34a32" />
                        </linearGradient>
                        <linearGradient id="containerGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3d7ea6" />
                            <stop offset="100%" stopColor="#2a5a78" />
                        </linearGradient>
                        <linearGradient id="containerGrad3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6b8f3f" />
                            <stop offset="100%" stopColor="#4a6628" />
                        </linearGradient>
                        <linearGradient id="bridgeGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#f2f6f8" />
                            <stop offset="100%" stopColor="#c3d2dc" />
                        </linearGradient>
                    </defs>

                    {/* bow wave / wake */}
                    <path d="M0 86 C 40 82, 70 90, 110 86 C 150 82, 190 90, 230 86 C 270 82, 300 90, 320 86 L 320 108 L 0 108 Z" fill="#ffffff" opacity="0.18" />

                    {/* hull */}
                    <path d="M8 62 L 312 62 L 300 96 L 20 96 Z" fill="url(#hullGrad)" />
                    {/* bottom stripe */}
                    <path d="M24 84 L 296 84 L 300 96 L 20 96 Z" fill="url(#hullBottom)" opacity="0.9" />
                    {/* deck */}
                    <rect x="16" y="58" width="288" height="6" rx="2" fill="url(#deckGrad)" />
                    {/* bow */}
                    <path d="M8 62 L 22 58 L 20 74 L 8 78 Z" fill="#123140" />
                    {/* stern */}
                    <path d="M312 62 L 312 96 L 300 96 L 298 62 Z" fill="#0d2b3c" />

                    {/* containers row 1 */}
                    <rect x="40" y="44" width="30" height="14" rx="1" fill="url(#containerGrad)" />
                    <rect x="72" y="44" width="30" height="14" rx="1" fill="url(#containerGrad2)" />
                    <rect x="104" y="44" width="30" height="14" rx="1" fill="url(#containerGrad3)" />
                    <rect x="136" y="44" width="30" height="14" rx="1" fill="url(#containerGrad)" />
                    <rect x="168" y="44" width="30" height="14" rx="1" fill="url(#containerGrad2)" />

                    {/* containers row 2 */}
                    <rect x="48" y="30" width="28" height="14" rx="1" fill="url(#containerGrad3)" />
                    <rect x="78" y="30" width="28" height="14" rx="1" fill="url(#containerGrad)" />
                    <rect x="108" y="30" width="28" height="14" rx="1" fill="url(#containerGrad2)" />

                    {/* bridge house */}
                    <rect x="206" y="26" width="78" height="30" rx="2" fill="url(#bridgeGrad)" />
                    <rect x="214" y="32" width="12" height="12" rx="1" fill="#0ea5e9" opacity="0.85" />
                    <rect x="230" y="32" width="12" height="12" rx="1" fill="#0ea5e9" opacity="0.85" />
                    <rect x="246" y="32" width="12" height="12" rx="1" fill="#0ea5e9" opacity="0.85" />
                    <rect x="262" y="32" width="12" height="12" rx="1" fill="#0ea5e9" opacity="0.85" />

                    {/* funnel */}
                    <rect x="252" y="8" width="16" height="18" rx="2" fill="#9c3d2f" />
                    <rect x="252" y="8" width="16" height="6" fill="#1e293b" />

                    {/* deck rail */}
                    <rect x="24" y="60" width="284" height="2" fill="#0a2230" opacity="0.7" />
                </svg>
            </div>

            {/* Sunlight path */}
            <div className="marine-shimmer" />

            {/* Fish silhouettes */}
            <div className="marine-gulls" style={{ position: 'absolute', inset: 0 }}>
                {fish.map((f) => (
                    <span key={f.id} className="marine-fish" style={{ bottom: `${f.bottom}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.duration}s`, transform: `scale(${f.scale})` }}>
                        <svg viewBox="0 0 34 16" width="34" height="16">
                            <path d="M2 8 C 8 3, 18 3, 24 8 C 18 13, 8 13, 2 8 Z" fill="#134e4a" />
                            <path d="M24 8 L 33 3 L 29 8 L 33 13 Z" fill="#134e4a" />
                        </svg>
                    </span>
                ))}
            </div>

            {/* Translucent waves */}
            <div className="marine-waves">
                <div className="marine-wave marine-wave--back" />
                <div className="marine-wave marine-wave--mid" />
                <div className="marine-wave marine-wave--near" />
                <div className="marine-wave marine-wave--foam" />
            </div>
        </div>
    );
};

export default MarineScene;