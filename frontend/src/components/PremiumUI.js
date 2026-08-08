import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const AnimatedBackdrop = () => {
    // Rising air bubbles: glassy, slow, drifting like through seawater
    const bubbles = useMemo(
        () =>
            Array.from({ length: 16 }, (_, index) => ({
                id: `bubble-${index}`,
                left: `${(index * 6.1 + 4) % 100}%`,
                delay: `${(index * 1.4) % 14}s`,
                duration: `${17 + (index % 9) * 2}s`,
                size: 6 + (index % 5) * 4,
            })),
        []
    );

    // Tiny marine glints: foam, sea-light, and sun-through-water
    const glints = useMemo(
        () =>
            Array.from({ length: 12 }, (_, index) => ({
                id: `glint-${index}`,
                left: `${(index * 8.3 + 5) % 100}%`,
                top: `${(index * 17 + 12) % 100}%`,
                delay: `${(index * 0.9) % 8}s`,
                duration: `${7 + (index % 5)}s`,
                tint: index % 3 === 0 ? 'foam' : index % 2 === 0 ? 'sea' : 'sun',
            })),
        []
    );

    return (
        <div className="backdrop" aria-hidden="true">
            {/* Deep-sea mesh: blues, teal, and a faint sun-through-water glow */}
            <div className="premium-mesh" />

            {/* Drifting underwater caustic light */}
            <div className="backdrop__light backdrop__light--a" />
            <div className="backdrop__light backdrop__light--b" />

            {/* Rising bubbles */}
            <div className="premium-particles">
                {bubbles.map((b) => (
                    <span
                        key={b.id}
                        className="premium-particle"
                        style={{
                            left: b.left,
                            width: `${b.size}px`,
                            height: `${b.size}px`,
                            animationDelay: b.delay,
                            animationDuration: b.duration,
                        }}
                    />
                ))}
            </div>

            {/* Rolling wave surface along the bottom: layered crests with foam */}
            <div className="backdrop__waves" aria-hidden="true">
                <svg className="backdrop__wave backdrop__wave--b" viewBox="0 0 1440 130" preserveAspectRatio="none">
                    <path
                        d="M0 86 C 90 74, 180 60, 270 66 C 360 72, 450 92, 540 88 C 630 84, 720 60, 810 64 C 900 68, 990 92, 1080 90 C 1170 88, 1260 66, 1350 68 C 1395 69, 1420 70, 1440 70 L 1440 130 L 0 130 Z"
                        fill="rgba(45,212,191,0.05)"
                    />
                    <path
                        d="M0 86 C 90 74, 180 60, 270 66 C 360 72, 450 92, 540 88 C 630 84, 720 60, 810 64 C 900 68, 990 92, 1080 90 C 1170 88, 1260 66, 1350 68"
                        fill="none"
                        stroke="rgba(153,246,228,0.25)"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
                <svg className="backdrop__wave backdrop__wave--a" viewBox="0 0 1440 130" preserveAspectRatio="none">
                    <path
                        d="M0 92 C 96 76, 190 62, 286 70 C 382 78, 470 102, 560 98 C 650 94, 726 66, 820 70 C 914 74, 1000 100, 1090 98 C 1180 96, 1270 72, 1360 74 C 1400 75, 1424 76, 1440 76 L 1440 130 L 0 130 Z"
                        fill="rgba(125,211,252,0.07)"
                    />
                    <path
                        d="M0 92 C 96 76, 190 62, 286 70 C 382 78, 470 102, 560 98 C 650 94, 726 66, 820 70 C 914 74, 1000 100, 1090 98 C 1180 96, 1270 72, 1360 74"
                        fill="none"
                        stroke="rgba(186,230,253,0.32)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                </svg>
            </div>

            {/* Tiny marine glints floating up */}
            {glints.map((g) => (
                <span
                    key={g.id}
                    className={`backdrop__glint backdrop__glint--${g.tint}`}
                    style={{ left: g.left, top: g.top, animationDelay: g.delay, animationDuration: g.duration }}
                />
            ))}
        </div>
    );
};

export const ClickWaves = () => {
    const layerRef = useRef(null);

    useEffect(() => {
        const layer = layerRef.current;

        if (!layer) {
            return undefined;
        }

        const activeWaves = new Set();

        const spawnWave = (event) => {
            const waves = [0, 1, 2].map((index) => {
                const wave = document.createElement('span');
                wave.className = `click-wave${index === 1 ? ' click-wave--ring2' : ''}${index === 2 ? ' click-wave--ring3' : ''}`;
                wave.style.left = `${event.clientX}px`;
                wave.style.top = `${event.clientY}px`;
                return wave;
            });

            waves.forEach((wave) => {
                activeWaves.add(wave);
                layer.appendChild(wave);
                window.setTimeout(() => {
                    wave.remove();
                    activeWaves.delete(wave);
                }, 1100);
            });
        };

        document.addEventListener('click', spawnWave);

        return () => {
            document.removeEventListener('click', spawnWave);
            activeWaves.forEach((wave) => wave.remove());
            activeWaves.clear();
        };
    }, []);

    return <div className="click-wave-layer" ref={layerRef} aria-hidden="true" />;
};

const createRipple = (event) => {
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    const ripple = document.createElement('span');

    ripple.className = 'btn__ripple';
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    node.appendChild(ripple);

    window.setTimeout(() => {
        ripple.remove();
    }, 760);
};

export const PremiumButton = ({
    children,
    to,
    href,
    onClick,
    className = '',
    variant = 'primary',
    type = 'button',
    disabled = false,
    ...rest
}) => {
    const classes = `premium-button btn btn--${variant} premium-button--${variant} ${className}`.trim();
    const handlePointerDown = (event) => {
        if (disabled) {
            return;
        }

        createRipple(event);
    };

    const content = <span className="btn__content">{children}</span>;

    if (to) {
        return (
            <Link className={classes} to={to} onPointerDown={handlePointerDown} {...rest}>
                {content}
            </Link>
        );
    }

    if (href) {
        return (
            <a className={classes} href={href} onPointerDown={handlePointerDown} {...rest}>
                {content}
            </a>
        );
    }

    return (
        <button className={classes} onPointerDown={handlePointerDown} onClick={onClick} type={type} disabled={disabled} {...rest}>
            {content}
        </button>
    );
};

export const GlassCard = forwardRef(({ children, className = '', interactive = false, ...rest }, ref) => (
    <div ref={ref} className={`glass-card ${interactive ? 'glow-border' : ''} ${className}`.trim()} {...rest}>
        {children}
    </div>
));
GlassCard.displayName = 'GlassCard';

export const SectionHeading = ({ kicker, title, subtitle, align = 'start', className = '' }) => (
    <div className={`section-header ${className}`.trim()} style={{ textAlign: align }}>
        <div>
            {kicker ? <div className="section-kicker">{kicker}</div> : null}
            <h2 className="section-title gradient-text">{title}</h2>
            {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
        </div>
    </div>
);

export const StatCounter = ({ value, suffix = '', decimals = 0, duration = 1400, className = '', label }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let rafId;
        const start = performance.now();

        const tick = (now) => {
            const progress = Math.min(Math.max((now - start) / duration, 0), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(value * eased);

            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            }
        };

        rafId = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafId);
    }, [value, duration]);

    const formatted = Number(displayValue).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    return (
        <div className={`stat-card ${className}`.trim()}>
            {label ? <div className="stat-card__label">{label}</div> : null}
            <div className="stat-card__value">
                {formatted}
                {suffix}
            </div>
        </div>
    );
};

export const Timeline = ({ steps = [], currentIndex = 0, nowLabel = 'now' }) => (
    <div className="timeline">
        {steps.map((step, index) => (
            <div className="timeline__item" key={step.title}>
                <div className="timeline__marker">{step.icon || index + 1}</div>
                <div className="timeline__body">
                    <h4>
                        {step.title}{' '}
                        <span className="muted">{index === currentIndex ? nowLabel : ''}</span>
                    </h4>
                    <p>{step.description}</p>
                </div>
            </div>
        ))}
    </div>
);

export const ProgressBar = ({ value = 0 }) => (
    <div className="progress">
        <div className="progress__bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
);

export const MetricCard = ({ label, value, note, className = '' }) => (
    <div className={`metric-card ${className}`.trim()}>
        <div className="metric-card__label">{label}</div>
        <div className="metric-card__value">{value}</div>
        {note ? <div className="metric-card__note">{note}</div> : null}
    </div>
);

export const Badge = ({ children, tone = 'blue', className = '' }) => (
    <span className={`badge badge--${tone} ${className}`.trim()}>{children}</span>
);

export const LoaderButton = ({ children, loading = false, ...props }) => (
    <PremiumButton className={loading ? 'loader-shimmer' : ''} disabled={loading} {...props}>
        {children}
    </PremiumButton>
);

export const BilingualLine = ({ ar, en, className = '', emphasize = false, as: Component = 'p' }) => {
    const { isArabic } = useLanguage();

    return (
        <Component className={className}>
            <span className={emphasize ? 'gradient-text' : ''}>{isArabic ? ar : en}</span>
        </Component>
    );
};

export const LanguageToggle = ({ className = '' }) => {
    const { language, toggleLanguage, t } = useLanguage();

    return (
        <button className={`nav-link ${className}`.trim()} type="button" onClick={toggleLanguage} aria-label={t('switchTo')}>
            <span aria-hidden="true" style={{ marginInlineEnd: '0.35rem' }}>🌐</span>
            {t('switchTo')}
        </button>
    );
};