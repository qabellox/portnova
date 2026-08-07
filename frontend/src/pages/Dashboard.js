import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge, BilingualLine, GlassCard, PremiumButton, ProgressBar, SectionHeading, StatCounter } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const roleContent = {
    youth: {
        ar: 'تابع الوظائف والدورات ودعم السيرة الذاتية من مساحة واحدة.',
        en: 'Track jobs, courses, and CV support from one workspace.',
    },
    expert: {
        ar: 'أدر دعم الخبراء وراجع طلبات الخدمة من مكان واحد.',
        en: 'Manage expert support and review service requests.',
    },
    company: {
        ar: 'انشر الوظائف وراجع الطلبات من لوحة التوظيف الخاصة بك.',
        en: 'Post jobs and review applications from your hiring dashboard.',
    },
    admin: {
        ar: 'اشرف على المستخدمين والمحتوى وحوكمة المنصة.',
        en: 'Oversee users, content, and platform governance.',
    },
};

const Dashboard = () => {
    const { user } = useAuth();
    const { isArabic } = useLanguage();
    const role = user?.user_metadata?.role || user?.app_metadata?.role || 'youth';
    const fullName = user?.user_metadata?.fullName || user?.email || 'User';
    const metrics = role === 'company'
        ? [
            { label: 'Active jobs', value: 18, suffix: '+' },
            { label: 'Applicants', value: 84, suffix: '+' },
            { label: 'Shortlisted', value: 27, suffix: '' },
        ]
        : role === 'expert'
            ? [
                { label: 'CV requests', value: 42, suffix: '+' },
                { label: 'Delivered', value: 33, suffix: '' },
                { label: 'Pending', value: 9, suffix: '' },
            ]
            : [
                { label: 'Jobs matched', value: 64, suffix: '+' },
                { label: 'Courses active', value: 12, suffix: '' },
                { label: 'CV score', value: 92, suffix: '%' },
            ];

    return (
        <div className="page-shell page-shell__grid">
            <section className="hero hero--local">
                <div className="hero__grid">
                    <div>
                        <div className="hero__kicker">{isArabic ? 'لوحة التحكم' : 'Dashboard'}</div>
                        <h1 className="hero__title">
                            {isArabic ? 'مركز قيادة مناسب لدور' : 'A role-aware command center for'} <span className="gradient-text">{fullName}</span>.
                        </h1>
                        <BilingualLine
                            as="p"
                            className="hero__lead"
                            ar={(roleContent[role] || roleContent.youth).ar}
                            en={(roleContent[role] || roleContent.youth).en}
                        />
                        <div className="status-strip">
                            <Badge tone="gold">{isArabic ? role : role}</Badge>
                            <Badge tone="blue">{isArabic ? 'جلسة مباشرة' : 'Live session'}</Badge>
                            <Badge tone="success">Supabase Auth</Badge>
                        </div>
                    </div>

                    <GlassCard className="hero__orbital hero__orbital--primary">
                        <div className="upload-meter__label">
                            <span>{isArabic ? 'صحة الحساب' : 'Account health'}</span>
                            <strong>94%</strong>
                        </div>
                        <ProgressBar value={94} />
                        <div className="card-copy" style={{ marginTop: '1rem' }}>
                            {isArabic
                                ? 'واجهتك مضبوطة لتدفق أنيق وحركة مصقولة ووضوح كامل للدور.'
                                : 'Your interface is tuned for premium flow, polished motion, and role clarity.'}
                        </div>
                    </GlassCard>
                </div>
            </section>

            <div className="stats-grid">
                {metrics.map((metric) => (
                    <StatCounter key={metric.label} label={metric.label} value={metric.value} suffix={metric.suffix || ''} />
                ))}
            </div>

            <div className="split-grid">
                <GlassCard>
                    <SectionHeading kicker={isArabic ? 'لقطة سريعة' : 'Snapshot'} title={isArabic ? 'النشاط الأخير' : 'Recent activity'} subtitle={isArabic ? 'تغذية مرتبة تمنح اللوحة نبضًا حيًا.' : 'A clean feed gives the dashboard a living pulse.'} />
                    <div className="activity-feed">
                        {[
                            isArabic ? 'تمت مزامنة تحديث جديد للملف مع Supabase.' : 'New profile update synced to Supabase.',
                            isArabic ? 'انتقل طلب السيرة الذاتية من معلق إلى مُسند.' : 'CV request moved from pending to assigned.',
                            isArabic ? 'تم تحديث تقدّم إكمال الدورة للمستخدم الحالي.' : 'Course completion progress updated for the current user.',
                        ].map((entry) => (
                            <div key={entry} className="activity-item">
                                <div className="activity-dot" />
                                <div>
                                    <strong>{entry}</strong>
                                    <div className="muted">{isArabic ? 'الآن' : 'Just now'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard>
                    <SectionHeading kicker={isArabic ? 'إشارة' : 'Signal'} title={isArabic ? 'أشرطة بيانات متحركة' : 'Animated data bars'} subtitle={isArabic ? 'حتى البيانات الفارغة تظهر كأنها مخطط حي.' : 'Even empty data gets a premium chart-like presentation.'} />
                    <div className="mini-bars">
                        {[
                            { label: isArabic ? 'التركيز' : 'Focus', value: 92 },
                            { label: isArabic ? 'الزخم' : 'Momentum', value: 78 },
                            { label: isArabic ? 'التسليم' : 'Delivery', value: 88 },
                        ].map((bar) => (
                            <div key={bar.label} className="mini-bars__row">
                                <span className="muted">{bar.label}</span>
                                <div className="mini-bars__track">
                                    <div className="mini-bars__fill" style={{ width: `${bar.value}%` }} />
                                </div>
                                <strong>{bar.value}%</strong>
                            </div>
                        ))}
                    </div>
                    <div className="inline-actions" style={{ marginTop: '1rem' }}>
                        <PremiumButton variant="gold" to="/cv-service">
                            {isArabic ? 'افتح خدمة السيرة الذاتية' : 'Open CV service'}
                        </PremiumButton>
                        <PremiumButton variant="ghost" to="/jobs">
                            {isArabic ? 'تصفح الوظائف' : 'Browse jobs'}
                        </PremiumButton>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default Dashboard;