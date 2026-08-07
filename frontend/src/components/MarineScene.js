import React, { useMemo } from 'react';

/**
 * MarineScene — live animated Port Said waterfront background.
 * Pure CSS/SVG animation (no video). Layers:
 *   - Mediterranean sky + glowing sun
 *   - Sunlight shimmer on the water
 *   - A vessel sailing across the frame on a seamless loop
 *   - Optional seagulls
 *   - 4 stacked wave layers (deep blue -> turquoise -> gold -> foam)
 */
const MarineScene = ({ className = '' }) => {
    const seagulls = useMemo(
        () =>
            Array.from({ length: 4 }, (_, index) => ({
                id: index,
                top: 8 + (index * 7) % 22,
                delay: (index * 2.7) % 9,
                duration: 12 + (index % 4) * 3,
                scale: 0.7 + (index % 3) * 0.18,
            })),
        []
    );

    return (
        <div className={`marine-scene ${className}`.trim()} aria-hidden="true">
            {/* Sky gradient + sun */}
            <div className="marine-sky" />
            <div className="marine-sun">
                <div className="marine-sun__core" />
                <div className="marine-sun__glow" />
            </div>

            {/* Seagulls */}
            <div className="marine-gulls">
                {seagulls.map((g) => (
                    <span
                        key={g.id}
                        className="marine-gull"
                        style={{
                            top: `${g.top}%`,
                            animationDelay: `${g.delay}s`,
                            animationDuration: `${g.duration}s`,
                            transform: `scale(${g.scale})`,
                        }}
                    >
                        <svg viewBox="0 0 40 18" width="40" height="18">
                            <path
                                d="M2 12 C 8 2, 16 2, 20 8 C 24 2, 32 2, 38 12 C 34 8, 30 8, 20 14 C 10 8, 6 8, 2 12 Z"
                                fill="#f8fafc"
                                opacity="0.85"
                            />
                        </svg>
                    </span>
                ))}
            </div>

            {/* Sailing vessel */}
            <div className="marine-ship">
                <svg viewBox="0 0 220 90" width="220" height="90">
                    {/* hull */}
                    <path d="M10 58 L 210 58 L 188 84 L 32 84 Z" fill="#0f4c6b" stroke="#0b3a54" strokeWidth="2" />
                    {/* deck line */}
                    <path d="M20 58 L 200 58 L 200 50 L 20 50 Z" fill="#145a7d" />
                    {/* cabin / bridge */}
                    <rect x="120" y="30" width="52" height="20" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                    <rect x="126" y="34" width="12" height="10" rx="2" fill="#0ea5e9" opacity="0.9" />
                    <rect x="142" y="34" width="12" height="10" rx="2" fill="#0ea5e9" opacity="0.9" />
                    <rect x="158" y="34" width="9" height="10" rx="2" fill="#0ea5e9" opacity="0.9" />
                    {/* funnel */}
                    <rect x="156" y="12" width="14" height="18" rx="2" fill="#b91c1c" />
                    <rect x="156" y="12" width="14" height="5" fill="#1e293b" />
                    {/* mast */}
                    <rect x="48" y="8" width="4" height="42" fill="#7c4a03" />
                    {/* sail */}
                    <path d="M52 10 L 96 34 L 52 40 Z" fill="#f8fafc" opacity="0.95" stroke="#cbd5e1" strokeWidth="1" />
                    <path d="M52 10 L 40 40 L 52 46 Z" fill="#f1f5f9" opacity="0.9" />
                    {/* rope */}
                    <path d="M52 12 C 70 20, 90 26, 110 28" stroke="#e2e8f0" strokeWidth="1" fill="none" opacity="0.7" />
                    {/* waves around hull */}
                    <path d="M0 62 C 18 56, 36 66, 54 62 C 72 56, 90 66, 108 62 C 126 56, 144 66, 162 62 C 180 56, 198 66, 220 62 L 220 72 L 0 72 Z" fill="#0d9488" opacity="0.35" />
                </svg>
            </div>

            {/* Sunlight shimmer on the water */}
            <div className="marine-shimmer" />

            {/* Wave layers (bottom up: deep -> turquoise -> gold -> foam) */}
            <div className="marine-waves">
                <div className="marine-wave marine-wave--deep" />
                <div className="marine-wave marine-wave--turquoise" />
                <div className="marine-wave marine-wave--gold" />
                <div className="marine-wave marine-wave--foam" />
            </div>
        </div>
    );
};

export default MarineScene;
