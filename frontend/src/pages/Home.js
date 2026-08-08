import React from 'react';
import MarineScene from '../components/MarineScene';
import { Badge, BilingualLine, GlassCard, PremiumButton, ProgressBar, SectionHeading, StatCounter } from '../components/PremiumUI';

const featureCards = [
    {
        icon: '⚓',
        title: 'ميناء الفرص',
        copyAr: 'من قلب الميناء، ابحث عن الوظائف وتابع التعلّم وانتقل من ملفك إلى التقديم في مساحة واحدة.',
        copyEn: 'From the heart of the port, find jobs, track learning, and go from profile to application in one place.',
        tone: 'blue',
    },
    {
        icon: '🧭',
        title: 'بوصلة أصحاب العمل',
        copyAr: 'انشر وظائفك وراجع المتقدمين بمسارات ذكية واضحة، تمامًا مثل إدارة سفينة في ميناء.',
        copyEn: 'Post jobs and review applicants with smart, clear workflows — like steering a ship into harbor.',
        tone: 'gold',
    },
    {
        icon: '🐟',
        title: 'سيرة ذاتية تُصطاد وتُسلَّم',
        copyAr: 'ارفع، وأسنِد، ونسّق، وسلّم عبر خط زمني يمنح المستخدم ثقة في كل خطوة.',
        copyEn: 'Upload, assign, format, and deliver with a timeline that gives users confidence at every step.',
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
                kicker="التجربة / Experience"
                title="مظهر يجمع الدفء المحلي مع الإحساس بالفخامة"
                subtitle="كل سطح هنا فيه حركة ولمعان وعمق، لكن بروح بورسعيد الشبابية وليس ببرود الشركات التقنية."
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
                <SectionHeading kicker="الإيقاع / Momentum" title="إشارات حية للمنصة" subtitle="إحصاءات متحركة تمنح الصفحة طاقة فورية من دون ازدحام بصري." />
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
                <SectionHeading kicker="ابدأ / Call to action" title="خلّي PortNova هو الانطباع الأول" subtitle="أزرار الدعوة هنا مضيئة ودافئة وواضحة عبر كل الصفحات." />
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