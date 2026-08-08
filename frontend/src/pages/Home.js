import React from 'react';
import MarineScene from '../components/MarineScene';
import { Badge, BilingualLine, GlassCard, PremiumButton, ProgressBar, SectionHeading, StatCounter } from '../components/PremiumUI';

const featureCards = [
    {
        icon: '⚓',
        title: 'وظائف',
        copyAr: 'ابحث عن وظيفة تناسبك وقدّم عليها مباشرة.',
        copyEn: 'Find a job that fits you and apply directly.',
        tone: 'blue',
    },
    {
        icon: '🧭',
        title: 'دورات',
        copyAr: 'طوّر مهاراتك بدورات عملية في مجالك.',
        copyEn: 'Build your skills with practical courses.',
        tone: 'gold',
    },
    {
        icon: '🐟',
        title: 'سيرة ذاتية',
        copyAr: 'ارفع سيرتك الذاتية وتابعها حتى التسليم.',
        copyEn: 'Upload your CV and track it to delivery.',
        tone: 'success',
    },
];

const highlightBars = [
    { label: 'Youth engagement', value: 92 },
    { label: 'Job matches', value: 88 },
    { label: 'Course enrollments', value: 79 },
];

const Home = () => (
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
                منصة بورسعيد للشباب
            </div>
            <h1 className="hero__title">
                <span className="gradient-text">PortNova</span> — بوابة شباب بورسعيد للمستقبل
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
                        ابدأ الآن / Start
                    </PremiumButton>
                    <PremiumButton to="/login" variant="ghost">
                        تسجيل الدخول / Sign in
                    </PremiumButton>
                </div>
                <div className="stats-grid stats-grid--inline">
                    <StatCounter label="شباب / Youth" value={1200} suffix="+" />
                    <StatCounter label="وظائف / Jobs" value={320} suffix="+" />
                    <StatCounter label="دورات / Courses" value={86} suffix="+" />
                    <StatCounter label="سير ذاتية / CVs" value={540} suffix="+" />
                </div>
            </div>
        </section>

        <section className="section-block">
            <SectionHeading
                kicker="ما نقدمه / What we offer"
                title="كل ما يحتاجه شاب بورسعيد في مكان واحد"
                subtitle="وظائف، دورات، وخدمة سيرة ذاتية — مصممة لتناسبك."
            />
            <div className="card-grid">
                {featureCards.map((card) => (
                    <GlassCard key={card.title} interactive>
                        <div className="nautical-tile" style={{ width: '3rem', height: '3rem', fontSize: '1.6rem', marginBottom: '0.9rem' }} aria-hidden="true">
                            {card.icon}
                        </div>
                        <h3 className="card-title" style={{ marginTop: '0.4rem' }}>
                            {card.title}
                        </h3>
                        <BilingualLine ar={card.copyAr} en={card.copyEn} className="card-copy" />
                    </GlassCard>
                ))}
            </div>
        </section>

        <section className="section-block split-grid">
            <GlassCard>
                <SectionHeading kicker="النتائج / Results" title="أرقام منصتنا" subtitle="مؤشرات حقيقية عن تفاعل شباب بورسعيد." />
                <div className="mini-bars">
                    {highlightBars.map((bar) => (
                        <div key={bar.label} className="mini-bars__row">
                            <span className="muted">{bar.label}</span>
                            <div className="mini-bars__track">
                                <div className="mini-bars__fill" style={{ width: `${bar.value}%` }} />
                            </div>
                            <strong>{bar.value}%</strong>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard>
                <SectionHeading kicker="ابدأ / Get started" title="جاهز تبدأ رحلتك؟" subtitle="أنشئ حسابك واستكشف كل ما تقدمه المنصة." />
                <div className="inline-actions">
                    <PremiumButton to="/dashboard" variant="primary">
                        استكشف اللوحة / Explore
                    </PremiumButton>
                    <PremiumButton to="/cv-service" variant="gold">
                        جرّب الخدمة / CV Service
                    </PremiumButton>
                </div>
            </GlassCard>
        </section>
    </div>
);

export default Home;