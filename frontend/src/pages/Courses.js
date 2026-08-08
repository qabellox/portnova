import React, { useMemo, useState } from 'react';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const courses = [
    { title: 'Product Design Sprint', provider: 'PortNova Academy', price: 'Free', progress: 72, level: 'Beginner', tone: 'blue' },
    { title: 'Startup Operations', provider: 'Harbor School', price: '$49', progress: 44, level: 'Intermediate', tone: 'gold' },
    { title: 'Career Readiness', provider: 'FutureBridge', price: 'Free', progress: 88, level: 'Foundation', tone: 'success' },
    { title: 'Data Storytelling', provider: 'Nova Labs', price: '$79', progress: 61, level: 'Advanced', tone: 'blue' },
    { title: 'Freelance Foundations', provider: 'PortNova Academy', price: 'Free', progress: 55, level: 'Beginner', tone: 'success' },
    { title: 'Digital Marketing Basics', provider: 'Harbor School', price: '$39', progress: 31, level: 'Intermediate', tone: 'gold' },
];

const Courses = () => {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [level, setLevel] = useState('All');

    const levels = useMemo(() => ['All', ...new Set(courses.map((c) => c.level))], []);

    const filtered = useMemo(
        () =>
            courses.filter((course) => {
                const q = query.trim().toLowerCase();
                const matchesQuery =
                    !q ||
                    course.title.toLowerCase().includes(q) ||
                    course.provider.toLowerCase().includes(q);
                const matchesLevel = level === 'All' || course.level === level;
                return matchesQuery && matchesLevel;
            }),
        [query, level]
    );

    return (
        <div className="page-shell">
            <SectionHeading
                kicker={t('coursesKicker')}
                title={t('coursesTitle')}
                subtitle={t('coursesSubtitle')}
            />

            <GlassCard className="filter-panel">
                <div className="filter-row">
                    <div className="filter-search">
                        <span className="filter-search__icon" aria-hidden="true">⌕</span>
                        <input
                            className="field"
                            type="search"
                            placeholder={t('searchCoursePlaceholder')}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </div>
                    <div className="filter-select">
                        <label className="filter-label">{t('levelLabel')}</label>
                        <select className="select" value={level} onChange={(event) => setLevel(event.target.value)}>
                            {levels.map((lv) => (
                                <option key={lv} value={lv}>{lv}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="filter-meta">
                    <span className="muted">
                        {t('coursesAvailable', { n: filtered.length })}
                    </span>
                </div>
            </GlassCard>

            {filtered.length ? (
                <div className="card-grid card-grid--compact">
                    {filtered.map((course) => (
                        <GlassCard key={course.title} interactive>
                            <div className="card-head">
                                <div>
                                    <Badge tone={course.tone}>{course.price}</Badge>
                                    <h3 className="card-title" style={{ marginTop: '0.85rem' }}>
                                        {course.title}
                                    </h3>
                                    <BilingualLine ar={course.provider} en={course.provider} className="card-copy" />
                                </div>
                                <div className="company-mark">{course.title.slice(0, 2)}</div>
                            </div>

                            <div className="card-meta">
                                <Badge tone="blue">{t(`level${course.level}`)}</Badge>
                            </div>

                            <div className="inline-actions" style={{ marginTop: '1rem' }}>
                                <PremiumButton variant="primary">{t('enroll')}</PremiumButton>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <GlassCard className="empty-state">
                    {t('noCourses')}
                </GlassCard>
            )}
        </div>
    );
};

export default Courses;