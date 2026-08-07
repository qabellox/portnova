import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const AnimatedBackdrop = () => {
    const particles = useMemo(
        () =>
            Array.from({ length: 22 }, (_, index) => ({
                id: index,
                left: `${(index * 11 + 7) % 100}%`,
                top: `${(index * 17 + 13) % 100}%`,
                delay: `${(index * 0.55) % 7}s`,
                duration: `${6 + (index % 5)}s`,
                color: index % 3 === 0 ? 'rgba(251, 191, 36, 0.75)' : 'rgba(14, 165, 233, 0.8)',
            })),
        []
    );

    const risingParticles = useMemo(
        () =>
            Array.from({ length: 14 }, (_, index) => ({
                id: `rise-${index}`,
                left: `${(index * 7.3 + 3) % 100}%`,
                delay: `${(index * 1.7) % 12}s`,
                duration: `${14 + (index % 7) * 2}s`,
                size: 4 + (index % 4) * 2,
            })),
        []
    );

    return (
        <div className="backdrop" aria-hidden="true">
            <div className="premium-mesh" />
            <div className="premium-particles">
                {risingParticles.map((p) => (
                    <span
                        key={p.id}
                        className="premium-particle"
                        style={{
                            left: p.left,
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            animationDelay: p.delay,
                            animationDuration: p.duration,
                        }}
                    />
                ))}
            </div>
            <div className="backdrop__mesh backdrop__mesh--blue" />
            <div className="backdrop__mesh backdrop__mesh--gold" />
            <div className="backdrop__mesh backdrop__mesh--ice" />
            <span className="backdrop__orb" style={{ top: '12%', left: '8%', color: 'rgba(14, 165, 233, 0.9)', animationDelay: '-2s' }} />
            <span className="backdrop__orb" style={{ top: '20%', right: '12%', color: 'rgba(251, 191, 36, 0.9)', animationDelay: '-6s' }} />
            <span className="backdrop__orb" style={{ bottom: '22%', left: '18%', color: 'rgba(224, 242, 254, 0.9)', animationDelay: '-10s' }} />
            {particles.map((particle) => (
                <span
                    key={particle.id}
                    className="backdrop__spark"
                    style={{
                        left: particle.left,
                        top: particle.top,
                        background: particle.color,
                        animationDelay: particle.delay,
                        animationDuration: particle.duration,
                    }}
                />
            ))}
        </div>
    );
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

export const GlassCard = ({ children, className = '', interactive = false, ...rest }) => (
    <div className={`glass-card ${interactive ? 'glow-border' : ''} ${className}`.trim()} {...rest}>
        {children}
    </div>
);

export const SectionHeading = ({ kicker, title, subtitle, align = 'left', className = '' }) => (
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

export const Timeline = ({ steps = [], currentIndex = 0 }) => (
    <div className="timeline">
        {steps.map((step, index) => (
            <div className="timeline__item" key={step.title}>
                <div className="timeline__marker">{step.icon || index + 1}</div>
                <div className="timeline__body">
                    <h4>
                        {step.title}{' '}
                        <span className="muted">{index === currentIndex ? 'now' : ''}</span>
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
            <span className="muted" style={{ display: 'block', marginTop: 4, fontSize: '0.9em' }}>
                {isArabic ? en : ar}
            </span>
        </Component>
    );
};

export const LanguageToggle = ({ className = '' }) => {
    const { language, toggleLanguage, languageLabels } = useLanguage();

    return (
        <button className={`nav-link ${className}`.trim()} type="button" onClick={toggleLanguage} aria-label="Toggle language">
            {language === 'ar' ? `${languageLabels.ar} | ${languageLabels.en}` : `${languageLabels.en} | ${languageLabels.ar}`}
        </button>
    );
};