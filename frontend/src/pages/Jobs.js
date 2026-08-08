import React, { useMemo, useState } from 'react';
import { Badge, BilingualLine, GlassCard, PremiumButton, ProgressBar, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const jobs = [
    { company: 'Nova Labs', role: 'Frontend Product Intern', salary: '$450/mo', location: 'Port Said', category: 'Tech', fit: 94, tone: 'blue' },
    { company: 'HarborX', role: 'Operations Coordinator', salary: '$700/mo', location: 'Hybrid', category: 'Business', fit: 87, tone: 'gold' },
    { company: 'BlueWave', role: 'Community Designer', salary: '$600/mo', location: 'Remote', category: 'Design', fit: 91, tone: 'success' },
    { company: 'Atlas Port', role: 'Business Analyst', salary: '$900/mo', location: 'Onsite', category: 'Business', fit: 84, tone: 'blue' },
    { company: 'Sunrise Digital', role: 'Junior Marketing Specialist', salary: '$420/mo', location: 'Remote', category: 'Marketing', fit: 88, tone: 'gold' },
    { company: 'Porta Tech', role: 'Data Entry & Support', salary: '$380/mo', location: 'Port Said', category: 'Business', fit: 79, tone: 'blue' },
];

const Jobs = () => {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('All');
    const [category, setCategory] = useState('All');

    const locations = useMemo(() => ['All', ...new Set(jobs.map((j) => j.location))], []);
    const categories = useMemo(() => ['All', ...new Set(jobs.map((j) => j.category))], []);

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
        [query, location, category]
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

            {filtered.length ? (
                <div className="card-grid card-grid--compact">
                    {filtered.map((job) => (
                        <GlassCard key={job.role} interactive className="data-card">
                            <div className="card-head">
                                <div>
                                    <div className="company-mark">{job.company.slice(0, 2)}</div>
                                    <h3 className="card-title" style={{ marginTop: '0.85rem' }}>
                                        {job.role}
                                    </h3>
                                    <BilingualLine
                                        ar={`${job.company} · ${job.location}`}
                                        en={`${job.company} · ${job.location}`}
                                        className="card-copy"
                                    />
                                </div>
                                <Badge tone={job.tone}>{job.salary}</Badge>
                            </div>

                            <div className="card-meta">
                                <Badge tone={job.tone}>{t(`cat${job.category}`)}</Badge>
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <div className="upload-meter__label">
                                    <span>{t('fitScore')}</span>
                                    <strong>{job.fit}%</strong>
                                </div>
                                <ProgressBar value={job.fit} />
                            </div>

                            <div className="inline-actions" style={{ marginTop: '1rem' }}>
                                <PremiumButton variant="primary">{t('apply')}</PremiumButton>
                            </div>
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