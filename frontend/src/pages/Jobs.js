import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getJobs } from '../services/content';

const Jobs = () => {
    const { t } = useLanguage();
    const { isProvider } = useAuth();
    const [searchParams] = useSearchParams();
    const focusRole = searchParams.get('focus');
    const [jobs, setJobs] = useState([]);
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('All');
    const [category, setCategory] = useState('All');
    const [cvName, setCvName] = useState('');
    const cvInputRef = useRef(null);
    const focusRef = useRef(null);

    useEffect(() => {
        setJobs(getJobs());
    }, []);

    useEffect(() => {
        if (!focusRole) return;
        // clear filters so the focused card is visible
        setQuery('');
        setLocation('All');
        setCategory('All');
        const id = window.setTimeout(() => {
            focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
        return () => window.clearTimeout(id);
    }, [focusRole]);

    const onPickCv = (event) => {
        const file = event.target.files?.[0];
        if (file) setCvName(file.name);
    };

    const locations = useMemo(() => ['All', ...new Set(jobs.map((j) => j.location))], [jobs]);
    const categories = useMemo(() => ['All', ...new Set(jobs.map((j) => j.category))], [jobs]);

    const filtered = useMemo(
        () =>
            jobs.filter((job) => {
                const q = query.trim().toLowerCase();
                const matchesQuery =
                    !q ||
                    job.role.toLowerCase().includes(q) ||
                    job.company.toLowerCase().includes(q) ||
                    job.category.toLowerCase().includes(q);
                const matchesLocation = location === 'All' || job.location === location;
                const matchesCategory = category === 'All' || job.category === category;
                return matchesQuery && matchesLocation && matchesCategory;
            }),
        [query, location, category, jobs]
    );

    return (
        <div className="page-shell">
            <SectionHeading
                kicker={t('jobsKicker')}
                title={t('jobsTitle')}
                subtitle={t('jobsSubtitle')}
            />

            <GlassCard className="filter-panel">
                <div className="filter-row">
                    <div className="filter-search">
                        <span className="filter-search__icon" aria-hidden="true">⌕</span>
                        <input
                            className="field"
                            type="search"
                            placeholder={t('searchJobPlaceholder')}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </div>
                    <div className="filter-select">
                        <label className="filter-label">{t('locationLabel')}</label>
                        <select className="select" value={location} onChange={(event) => setLocation(event.target.value)}>
                            {locations.map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-select">
                        <label className="filter-label">{t('categoryLabel')}</label>
                        <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="filter-meta">
                    <span className="muted">
                        {t('jobsAvailable', { n: filtered.length })}
                    </span>
                </div>
            </GlassCard>

            {/* CV upload is a seeker action — providers don't apply, so hide it */}
            {!isProvider ? (
                <GlassCard className="cv-card">
                    <SectionHeading kicker={t('cvKicker')} title={t('cvRequiredTitle')} subtitle={t('cvRequiredSubtitle')} />
                    <div className="cv-card__body">
                        <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={onPickCv} />
                        {cvName ? (
                            <div className="cv-card__attached">
                                <span className="cv-card__file-icon" aria-hidden="true">📄</span>
                                <div>
                                    <strong>{cvName}</strong>
                                    <span className="muted">{t('cvAttached')}</span>
                                </div>
                                <PremiumButton variant="ghost" onClick={() => { setCvName(''); if (cvInputRef.current) cvInputRef.current.value = ''; }}>
                                    {t('cvRemove')}
                                </PremiumButton>
                            </div>
                        ) : (
                            <div className="cv-card__empty">
                                <span className="muted">{t('cvNoFile')}</span>
                                <PremiumButton variant="gold" onClick={() => cvInputRef.current?.click()}>
                                    {t('cvUpload')}
                                </PremiumButton>
                                <span className="muted">{t('cvFileHint')}</span>
                            </div>
                        )}
                    </div>
                </GlassCard>
            ) : null}

            {filtered.length ? (
                <div className="card-grid card-grid--compact">
                    {filtered.map((job) => (
                        <GlassCard
                            key={job.id || job.role}
                            interactive
                            className={`data-card${focusRole === job.role ? ' data-card--focused' : ''}`}
                            ref={focusRole === job.role ? focusRef : undefined}
                        >
                            <div className="course-cover" aria-hidden="true">{job.emoji}</div>
                            <div className="card-head">
                                <div>
                                    <Badge tone={job.tone}>{job.salary}</Badge>
                                    <h3 className="card-title" style={{ marginTop: '0.85rem' }}>
                                        {job.role}
                                    </h3>
                                    <BilingualLine
                                        ar={`${job.company} · ${job.location}`}
                                        en={`${job.company} · ${job.location}`}
                                        className="card-copy"
                                    />
                                </div>
                            </div>

                            <div className="card-meta">
                                <Badge tone={job.tone}>{t(`cat${job.category}`)}</Badge>
                            </div>

                            <div className="course-detail">
                                <span className="course-detail__item">💼 <strong>{t(`jobType${job.type === 'intern' ? 'Intern' : job.type === 'full' ? 'Full' : job.type === 'part' ? 'Part' : 'Contract'}`)}</strong></span>
                                <span className="course-detail__item">🎓 <strong>{t(`jobExp${job.experience === 'entry' ? 'Entry' : job.experience === 'mid' ? 'Mid' : 'Senior'}`)}</strong></span>
                                <span className="course-detail__item">📍 {job.location}</span>
                                <span className="course-detail__item">📅 {job.posted === 1 ? t('jobPostedToday') : t('jobPostedDays', { n: job.posted })}</span>
                            </div>

                            {!isProvider ? (
                                <div className="inline-actions" style={{ marginTop: '1rem' }}>
                                    <PremiumButton variant="gold">{t('apply')}</PremiumButton>
                                </div>
                            ) : null}
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <GlassCard className="empty-state">
                    {t('noJobs')}
                </GlassCard>
            )}
        </div>
    );
};

export default Jobs;