import React from 'react';
import { Badge, BilingualLine, GlassCard, PremiumButton, ProgressBar, SectionHeading, StatCounter } from '../components/PremiumUI';

const featureCards = [
    {
        title: 'محرك فرص يبدأ بالشباب',
        copyAr: 'ابحث عن الوظائف، تابع التعلّم، وانتقل من الملف إلى التقديم داخل مساحة عمل واحدة مرتبة.',
        copyEn: 'Search jobs, track learning, and move from profile to application in a single premium workspace.',
        tone: 'blue',
    },
    {
        title: 'لوحة أصحاب العمل بروح مميزة',
        copyAr: 'ألواح زجاجية، وحجز سلس، ومسارات ذكية لنشر الوظائف ومراجعة المتقدمين.',
        copyEn: 'Glass panels, smooth claims, and intelligent workflows for job posting and applicant review.',
        tone: 'gold',
    },
    {
        title: 'خدمة السيرة الذاتية بتسليم أنيق',
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
        <section className="hero hero--local">
            <div className="hero__grid">
                <div>
                    <div className="hero__kicker">منصة بورسعيد للشباب</div>
                    <h1 className="hero__title">
                        <span className="gradient-text">منصة PortNova</span> للشباب والوظائف والتعلم.
                    </h1>
                    <BilingualLine
                        as="p"
                        className="hero__lead"
                        ar="واجهة حيوية ودافئة بروح بورسعيد، تربط الشباب بالوظائف والدورات وخدمة السيرة الذاتية في تجربة واحدة."
                        en="A warm, lively Port Said interface that connects youth, jobs, courses, and CV support in one flow."
                    />
                    <div className="hero__actions">
                        <PremiumButton to="/register" variant="gold">
                            ابدأ الآن / Start
                        </PremiumButton>
                        <PremiumButton to="/login" variant="ghost">
                            تسجيل الدخول / Sign in
                        </PremiumButton>
                    </div>
                    <div className="status-strip">
                        <Badge tone="gold">بورسعيد أولاً / Port Said first</Badge>
                        <Badge tone="blue">الوظائف / Jobs</Badge>
                        <Badge tone="success">السيرة الذاتية / CV</Badge>
                    </div>
                </div>

                <div className="hero__visual">
                    <div className="hero__halo" />
                    <GlassCard className="hero__orbital hero__orbital--primary">
                        <div className="chip-row">
                            <Badge tone="gold">مباشر / Live</Badge>
                            <Badge tone="blue">ثقة عالية / Trust</Badge>
                        </div>
                        <h3 className="card-title" style={{ marginTop: '0.9rem' }}>
                            بورسعيد تتحرك. وهنا يبدأ الإيقاع.
                        </h3>
                        <p className="card-copy">A fresh local experience with a clean workflow story and visible momentum.</p>
                        <div style={{ marginTop: '1rem' }}>
                            <ProgressBar value={84} />
                        </div>
                    </GlassCard>
                    <GlassCard className="hero__orbital hero__orbital--secondary">
                        <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <StatCounter label="شباب / Youth" value={1200} suffix="+" />
                            <StatCounter label="وظائف / Jobs" value={320} suffix="+" />
                            <StatCounter label="دورات / Courses" value={86} suffix="+" />
                            <StatCounter label="سير ذاتية / CVs" value={540} suffix="+" />
                        </div>
                    </GlassCard>
                    <span className="hero__orbital hero__orbital--spotlight" />
                </div>
            </div>
            <div className="wave-divider" aria-hidden="true" />
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
                        <Badge tone={card.tone}>{card.title.split(' ')[0]}</Badge>
                        <h3 className="card-title" style={{ marginTop: '0.85rem' }}>
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