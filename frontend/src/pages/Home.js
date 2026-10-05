import React from 'react';
import MarineScene from '../components/MarineScene';
import VideoBackground from '../components/VideoBackground';
import { BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

// ⚓ Marine scene master switch.
// Set to `true` to bring the live 3D boats/ships back (one line, nothing else
// to change). Set to `false` to keep them hidden - the hero section is not
// rendered at all, so it takes up zero space. All the scene code stays intact.
const SHOW_MARINE_SCENE = false;

// One monochrome line-icon language across all three pillars, instead of mixing
// emoji into the glassmorphism design.
const FeatureIcon = ({ name }) => {
    const props = {
        width: 26,
        height: 26,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
    };
    if (name === 'anchor') {
        return (
            <svg {...props}>
                <circle cx="12" cy="5" r="2.4" />
                <path d="M12 7.4V21" />
                <path d="M5 12H2.5a9.5 9.5 0 0 0 19 0H19" />
            </svg>
        );
    }
    if (name === 'compass') {
        return (
            <svg {...props}>
                <circle cx="12" cy="12" r="9" />
                <path d="m15.5 8.5-2 5-5 2 2-5z" />
            </svg>
        );
    }
    return (
        <svg {...props}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9 13h6M9 17h4" />
        </svg>
    );
};

const featureCards = [
    {
        icon: 'anchor',
        titleKey: 'featureJobs',
        copyAr: 'وظائف حقيقية من شركات موثّقة في بورسعيد — لا وظائف وهمية.',
        copyEn: 'Real jobs from verified employers in Port Said — no fake listings.',
        tone: 'blue',
    },
    {
        icon: 'compass',
        titleKey: 'featureCourses',
        copyAr: 'دورات عملية تبني المهارات التي يطلبها سوق العمل.',
        copyEn: 'Practical courses that build the skills employers actually want.',
        tone: 'gold',
    },
    {
        icon: 'document',
        titleKey: 'featureCv',
        copyAr: 'سيرتك الذاتية تُحسّن بالذكاء الاصطناعي وتُبرز نقاط قوتك.',
        copyEn: 'Your CV, AI-optimized to highlight your strengths.',
        tone: 'success',
    },
];

const Home = () => {
    const { t } = useLanguage();

    return (
        <div className="page-shell page-shell__grid">
            {/* Full-height marine visual: nothing overlays the sea */}
            {SHOW_MARINE_SCENE ? (
                <section className="hero hero--local hero--marine hero--marine-scene">
                    <MarineScene />
                    <div className="marine-overlay" aria-hidden="true" />
                </section>
            ) : null}

            {/* Full-screen premium video background hero - text only, top-left */}
            <VideoBackground>
                <div className="hero-content">
                    <div className="hero__kicker">
                        <span className="nautical-tile" aria-hidden="true">🧭</span>
                        {t('homeKicker')}
                    </div>
                    <h1 className="hero__title gradient-text">
                        PortNova: {t('homeTitle')}
                    </h1>
                    <BilingualLine
                        as="p"
                        className="hero__lead"
                        ar="بوابتك للوظائف والدورات وخدمة السيرة الذاتية في بورسعيد."
                        en="your gateway to jobs, courses and CV support in Port Said."
                    />
                </div>
            </VideoBackground>

            {/* Widgets + buttons sit below the video, not on it */}
            <section className="section-block marine-welcome">
                <div className="marine-welcome__row">
                    <div className="hero__actions">
                        <PremiumButton to="/register" variant="gold">
                            {t('homeStart')}
                        </PremiumButton>
                        <PremiumButton to="/login" variant="ghost">
                            {t('homeSignIn')}
                        </PremiumButton>
                    </div>
                    <div className="why-stats">
                        <div className="why-stat">
                            <span className="why-stat__value">{t('whyStatValue1')}</span>
                            <span className="why-stat__label">{t('whyStatLabel1')}</span>
                        </div>
                        <div className="why-stat">
                            <span className="why-stat__value">{t('whyStatValue2')}</span>
                            <span className="why-stat__label">{t('whyStatLabel2')}</span>
                        </div>
                        <div className="why-stat">
                            <span className="why-stat__value">{t('whyStatValue3')}</span>
                            <span className="why-stat__label">{t('whyStatLabel3')}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-block">
                <SectionHeading
                    kicker={t('offerKicker')}
                    title={t('offerTitle')}
                    subtitle={t('offerSubtitle')}
                />
                <div className="card-grid">
                    {featureCards.map((card) => (
                        <GlassCard key={card.titleKey} interactive>
                            <div className="nautical-tile" style={{ width: '3rem', height: '3rem', marginBottom: '0.9rem', display: 'grid', placeItems: 'center' }} aria-hidden="true">
                                <FeatureIcon name={card.icon} />
                            </div>
                            <h3 className="card-title" style={{ marginTop: '0.4rem' }}>
                                {t(card.titleKey)}
                            </h3>
                            <BilingualLine ar={card.copyAr} en={card.copyEn} className="card-copy" />
                        </GlassCard>
                    ))}
                </div>
            </section>

            <section className="section-block">
                <GlassCard>
                    <SectionHeading kicker={t('startKicker')} title={t('startTitle')} subtitle={t('startSubtitle')} />
                    <div className="inline-actions">
                        <PremiumButton to="/dashboard" variant="primary">
                            {t('exploreDashboard')}
                        </PremiumButton>
                        <PremiumButton to="/cv-service" variant="gold">
                            {t('tryCv')}
                        </PremiumButton>
                    </div>
                </GlassCard>
            </section>
        </div>
    );
};

export default Home;