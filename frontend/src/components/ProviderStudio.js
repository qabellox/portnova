import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addCourse, addJob, getCourses, getJobs, removeCourse, removeJob } from '../services/content';
import { Badge, GlassCard, PremiumButton, SectionHeading } from './PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_JOB = { company: '', role: '', salary: '', location: '', category: 'Tech', type: 'full', experience: 'entry', emoji: '💼' };
const EMPTY_COURSE = { title: '', provider: '', price: '', hours: '', mode: 'online', location: '', date: '', level: 'Beginner', emoji: '🎓' };

const ProviderStudio = () => {
    const { user } = useAuth();
    const { isArabic, t } = useLanguage();
    const [tab, setTab] = useState('jobs');
    const [job, setJob] = useState(EMPTY_JOB);
    const [course, setCourse] = useState(EMPTY_COURSE);
    const [mine, setMine] = useState({ jobs: [], courses: [] });
    const [message, setMessage] = useState('');

    const loadMine = () => {
        const me = user?.id;
        setMine({
            jobs: getJobs().filter((j) => j.source === 'custom' && j.by === me),
            courses: getCourses().filter((c) => c.source === 'custom' && c.by === me),
        });
    };

    useEffect(() => {
        loadMine();
        // load when the signed-in user changes
    }, [user]); // eslint-disable-line

    const setJobField = (key, value) => setJob((prev) => ({ ...prev, [key]: value }));
    const setCourseField = (key, value) => setCourse((prev) => ({ ...prev, [key]: value }));

    const publishJob = (event) => {
        event.preventDefault();
        addJob({ ...job, by: user?.id });
        setJob(EMPTY_JOB);
        setMessage(t('publishedJob'));
        loadMine();
    };

    const publishCourse = (event) => {
        event.preventDefault();
        addCourse({ ...course, by: user?.id });
        setCourse(EMPTY_COURSE);
        setMessage(t('publishedCourse'));
        loadMine();
    };

    const fieldLabel = (text) => (
        <label className="filter-label" style={{ textTransform: 'none' }}>{text}</label>
    );

    return (
        <GlassCard>
            <SectionHeading
                kicker="🏢"
                title={t('providerStudioTitle')}
                subtitle={t('providerStudioSubtitle')}
            />
            <p className="muted" style={{ fontSize: '0.85rem' }}>{t('providerNote')}</p>
            {message ? <p className="muted" style={{ color: '#bbf7d0' }}>{message}</p> : null}

            <div className="status-strip" style={{ marginBottom: '1rem' }}>
                <PremiumButton variant={tab === 'jobs' ? 'gold' : 'ghost'} onClick={() => setTab('jobs')}>
                    {t('tabJobs')}
                </PremiumButton>
                <PremiumButton variant={tab === 'courses' ? 'gold' : 'ghost'} onClick={() => setTab('courses')}>
                    {t('tabCourses')}
                </PremiumButton>
            </div>

            {tab === 'jobs' ? (
                <form onSubmit={publishJob}>
                    <div className="field-group split-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                            {fieldLabel(t('fieldCompany'))}
                            <input className="field" type="text" value={job.company} onChange={(e) => setJobField('company', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('fieldRole'))}
                            <input className="field" type="text" value={job.role} onChange={(e) => setJobField('role', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('fieldSalary'))}
                            <input className="field" type="text" placeholder="$500/mo" value={job.salary} onChange={(e) => setJobField('salary', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('locationLabel'))}
                            <input className="field" type="text" placeholder="Port Said" value={job.location} onChange={(e) => setJobField('location', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('categoryLabel'))}
                            <select className="select" value={job.category} onChange={(e) => setJobField('category', e.target.value)}>
                                {['Tech', 'Business', 'Design', 'Marketing'].map((c) => (
                                    <option key={c} value={c}>{t(`cat${c}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {fieldLabel(t('jobType'))}
                            <select className="select" value={job.type} onChange={(e) => setJobField('type', e.target.value)}>
                                {[['full', 'Full'], ['part', 'Part'], ['intern', 'Intern'], ['contract', 'Contract']].map(([v, k]) => (
                                    <option key={v} value={v}>{t(`jobType${k}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {fieldLabel(t('jobExperience'))}
                            <select className="select" value={job.experience} onChange={(e) => setJobField('experience', e.target.value)}>
                                {[['entry', 'Entry'], ['mid', 'Mid'], ['senior', 'Senior']].map(([v, k]) => (
                                    <option key={v} value={v}>{t(`jobExp${k}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {fieldLabel('Emoji')}
                            <input className="field" type="text" value={job.emoji} onChange={(e) => setJobField('emoji', e.target.value)} />
                        </div>
                    </div>
                    <PremiumButton type="submit" variant="primary" style={{ marginTop: '1rem' }}>
                        {t('publishBtn')}
                    </PremiumButton>
                </form>
            ) : (
                <form onSubmit={publishCourse}>
                    <div className="field-group split-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                            {fieldLabel(t('fieldTitle'))}
                            <input className="field" type="text" value={course.title} onChange={(e) => setCourseField('title', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('fieldProvider'))}
                            <input className="field" type="text" value={course.provider} onChange={(e) => setCourseField('provider', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('fieldPrice'))}
                            <input className="field" type="text" placeholder="Free" value={course.price} onChange={(e) => setCourseField('price', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('fieldHours'))}
                            <input className="field" type="number" min="1" value={course.hours} onChange={(e) => setCourseField('hours', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('fieldMode'))}
                            <select className="select" value={course.mode} onChange={(e) => setCourseField('mode', e.target.value)}>
                                <option value="online">{t('courseOnline')}</option>
                                <option value="offline">{t('courseOffline')}</option>
                            </select>
                        </div>
                        <div>
                            {fieldLabel(t('locationLabel'))}
                            <input className="field" type="text" placeholder="Zoom" value={course.location} onChange={(e) => setCourseField('location', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('fieldDate'))}
                            <input className="field" type="text" placeholder="Flexible" value={course.date} onChange={(e) => setCourseField('date', e.target.value)} required />
                        </div>
                        <div>
                            {fieldLabel(t('levelLabel'))}
                            <select className="select" value={course.level} onChange={(e) => setCourseField('level', e.target.value)}>
                                {['Beginner', 'Foundation', 'Intermediate', 'Advanced'].map((lv) => (
                                    <option key={lv} value={lv}>{t(`level${lv}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {fieldLabel('Emoji')}
                            <input className="field" type="text" value={course.emoji} onChange={(e) => setCourseField('emoji', e.target.value)} />
                        </div>
                    </div>
                    <PremiumButton type="submit" variant="primary" style={{ marginTop: '1rem' }}>
                        {t('publishBtn')}
                    </PremiumButton>
                </form>
            )}

            <div style={{ marginTop: '1.5rem' }}>
                <SectionHeading kicker={isArabic ? 'منشوراتك' : 'Your posts'} title={t('myItems')} />
                {tab === 'jobs' ? (
                    mine.jobs.length ? (
                        <div className="card-grid card-grid--wide">
                            {mine.jobs.map((item) => (
                                <GlassCard key={item.id} className="data-card">
                                    <div className="card-head">
                                        <div>
                                            <Badge tone="gold">{item.salary}</Badge>
                                            <h3 className="card-title" style={{ marginTop: '0.6rem' }}>{item.role}</h3>
                                            <span className="card-copy">{item.company} · {item.location}</span>
                                        </div>
                                        <PremiumButton variant="danger" onClick={() => { removeJob(item.id); loadMine(); }}>
                                            {t('deleteItem')}
                                        </PremiumButton>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    ) : (
                        <p className="muted">{t('emptyItems')}</p>
                    )
                ) : mine.courses.length ? (
                    <div className="card-grid card-grid--wide">
                        {mine.courses.map((item) => (
                            <GlassCard key={item.id} className="data-card">
                                <div className="card-head">
                                    <div>
                                        <Badge tone="gold">{item.price}</Badge>
                                        <h3 className="card-title" style={{ marginTop: '0.6rem' }}>{item.title}</h3>
                                        <span className="card-copy">{item.provider} · {item.location}</span>
                                    </div>
                                    <PremiumButton variant="danger" onClick={() => { removeCourse(item.id); loadMine(); }}>
                                        {t('deleteItem')}
                                    </PremiumButton>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                ) : (
                    <p className="muted">{t('emptyItems')}</p>
                )}
                <div className="inline-actions" style={{ marginTop: '1rem' }}>
                    <PremiumButton variant="ghost" to="/jobs">{t('viewJobs')}</PremiumButton>
                    <PremiumButton variant="ghost" to="/courses">{t('viewCourses')}</PremiumButton>
                </div>
            </div>
        </GlassCard>
    );
};

export default ProviderStudio;
