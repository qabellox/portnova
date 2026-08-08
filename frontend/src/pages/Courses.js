import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const courses = [
    { title: 'Product Design Sprint', provider: 'PortNova Academy', price: 'Free', hours: 24, mode: 'online', location: 'Zoom', date: 'Flexible', level: 'Beginner', tone: 'blue', emoji: '🎨' },
    { title: 'Startup Operations', provider: 'Harbor School', price: '$49', hours: 32, mode: 'offline', location: 'Port Said', date: 'Sat 10:00', level: 'Intermediate', tone: 'gold', emoji: '🚀' },
    { title: 'Career Readiness', provider: 'FutureBridge', price: 'Free', hours: 12, mode: 'online', location: 'Zoom', date: 'Flexible', level: 'Foundation', tone: 'success', emoji: '🧭' },
    { title: 'Data Storytelling', provider: 'Nova Labs', price: '$79', hours: 20, mode: 'online', location: 'Google Meet', date: 'Wed 18:00', level: 'Advanced', tone: 'blue', emoji: '📊' },
    { title: 'Freelance Foundations', provider: 'PortNova Academy', price: 'Free', hours: 15, mode: 'offline', location: 'Youth Center', date: 'Sun 12:00', level: 'Beginner', tone: 'success', emoji: '💼' },
    { title: 'Digital Marketing Basics', provider: 'Harbor School', price: '$39', hours: 18, mode: 'online', location: 'Zoom', date: 'Mon 17:00', level: 'Intermediate', tone: 'gold', emoji: '📣' },
];

const Courses = () => {
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const focusTitle = searchParams.get('focus');
    const [query, setQuery] = useState('');
    const [level, setLevel] = useState('All');
    const focusRef = useRef(null);

    useEffect(() => {
        if (!focusTitle) return;
        setQuery('');
        setLevel('All');
        const id = window.setTimeout(() => {
            focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
        return () => window.clearTimeout(id);
    }, [focusTitle]);

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
                        <GlassCard
                            key={course.title}
                            interactive
                            className={`${focusTitle === course.title ? ' data-card--focused' : ''}`}
                            ref={focusTitle === course.title ? focusRef : undefined}
                        >
                            <div className="course-cover" aria-hidden="true">{course.emoji}</div>
                            <div className="card-head">
                                <div>
                                    <Badge tone={course.tone}>{course.price}</Badge>
                                    <h3 className="card-title" style={{ marginTop: '0.85rem' }}>
                                        {course.title}
                                    </h3>
                                    <BilingualLine ar={course.provider} en={course.provider} className="card-copy" />
                                </div>
                            </div>

                            <div className="card-meta">
                                <Badge tone="blue">{t(`level${course.level}`)}</Badge>
                            </div>

                            <div className="course-detail">
                                <span className="course-detail__item">⏱ <strong>{course.hours}</strong> {t('courseHours')}</span>
                                <span className="course-detail__item">📍 <strong>{course.mode === 'online' ? t('courseOnline') : t('courseOffline')}</strong></span>
                                <span className="course-detail__item">🏷 {course.location}</span>
                                <span className="course-detail__item">📅 {course.date}</span>
                            </div>

                            <div className="inline-actions" style={{ marginTop: '1rem' }}>
                                <PremiumButton variant="gold">{t('enroll')}</PremiumButton>
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