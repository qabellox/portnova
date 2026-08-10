import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getCourses } from '../services/content';

const Courses = () => {
    const { t } = useLanguage();
    const { isProvider } = useAuth();
    const [searchParams] = useSearchParams();
    const focusTitle = searchParams.get('focus');
    const [courses, setCourses] = useState([]);
    const [query, setQuery] = useState('');
    const [level, setLevel] = useState('All');
    const focusRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        getCourses().then((items) => {
            if (mounted) setCourses(items);
        });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!focusTitle) return;
        setQuery('');
        setLevel('All');
        const id = window.setTimeout(() => {
            focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
        return () => window.clearTimeout(id);
    }, [focusTitle]);

    const levels = useMemo(() => ['All', ...new Set(courses.map((c) => c.level))], [courses]);

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
        [query, level, courses]
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
                            key={course.id || course.title}
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

                            {!isProvider ? (
                                <div className="inline-actions" style={{ marginTop: '1rem' }}>
                                    <PremiumButton variant="gold">{t('enroll')}</PremiumButton>
                                </div>
                            ) : null}
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