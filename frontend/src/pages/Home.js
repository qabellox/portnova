import React from 'react';
import MarineScene from '../components/MarineScene';
import { BilingualLine, GlassCard, PremiumButton, SectionHeading, StatCounter } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const featureCards = [
    {
        icon: '⚓',
        titleKey: 'featureJobs',
        copyAr: 'ابحث عن وظيفة تناسبك وقدّم عليها مباشرة.',
        copyEn: 'Find a job that fits you and apply directly.',
        tone: 'blue',
    },
    {
        icon: '🧭',
        titleKey: 'featureCourses',
        copyAr: 'طوّر مهاراتك بدورات عملية في مجالك.',
        copyEn: 'Build your skills with practical courses.',
        tone: 'gold',
    },
    {
        icon: '🐟',
        titleKey: 'featureCv',
        copyAr: 'ارفع سيرتك الذاتية وتابعها حتى التسليم.',
        copyEn: 'Upload your CV and track it to delivery.',
        tone: 'success',
    },
];

const Home = () => {
    const { t } = useLanguage();

    return (
        <div className="page-shell page-shell__grid">
            {/* Full-height marine visual — nothing overlays the sea */}
            <section className="hero hero--local hero--marine hero--marine-scene">
                <MarineScene />
                <div className="marine-overlay" aria-hidden="true" />
            </section>

            {/* Content lives below the sea, fully clear of it */}
            <section className="section-block marine-welcome">
                <div className="hero__kicker">
                    <span className="nautical-tile" aria-hidden="true">🧭</span>
                    {t('homeKicker')}
                </div>
                <h1 className="hero__title">
                    <span className="gradient-text">PortNova</span> — {t('homeTitle')}
                </h1>
                <BilingualLine
                    as="p"
                    className="hero__lead"
                    ar="بين البحر والسوق والكورنيش، بوابتك للوظائف والدورات وخدمة السيرة الذاتية في بورسعيد."
                    en="Between the sea, the market and the corniche — your gateway to jobs, courses and CV support in Port Said."
                />
                <div className="marine-welcome__row">
                    <div className="hero__actions">
                        <PremiumButton to="/register" variant="gold">
                            {t('homeStart')}
                        </PremiumButton>
                        <PremiumButton to="/login" variant="ghost">
                            {t('homeSignIn')}
                        </PremiumButton>
                    </div>
                    <div className="stats-grid stats-grid--inline">
                        <StatCounter label={t('statYouth')} value={1200} suffix="+" />
                        <StatCounter label={t('statJobs')} value={320} suffix="+" />
                        <StatCounter label={t('statCourses')} value={86} suffix="+" />
                        <StatCounter label={t('statCvs')} value={540} suffix="+" />
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
                            <div className="nautical-tile" style={{ width: '3rem', height: '3rem', fontSize: '1.6rem', marginBottom: '0.9rem' }} aria-hidden="true">
                                {card.icon}
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