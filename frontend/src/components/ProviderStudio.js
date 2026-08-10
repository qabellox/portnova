import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addCourse, addJob, getCourses, getJobs, removeCourse, removeJob } from '../services/content';
import { getJobApplicants, openCv, updateApplicationStatus } from '../services/applications';
import { Badge, GlassCard, PremiumButton, SectionHeading } from './PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_JOB = { company: '', role: '', salary: '', location: '', category: 'Tech', type: 'full', experience: 'entry', emoji: '💼' };
const EMPTY_COURSE = { title: '', provider: '', price: '', hours: '', mode: 'online', location: '', date: '', level: 'Beginner', emoji: '🎓' };

const ProviderStudio = () => {
    const { user } = useAuth();
    const { isArabic, t } = useLanguage();
    // A provider IS a company: their registered company name is the single
    // identity auto-filled into every job/course they publish.
    const companyName = (user?.user_metadata?.companyName || user?.user_metadata?.fullName || '').trim();
    const [tab, setTab] = useState('jobs');
    const [job, setJob] = useState(EMPTY_JOB);
    const [course, setCourse] = useState(EMPTY_COURSE);
    const [mine, setMine] = useState({ jobs: [], courses: [] });
    const [applicants, setApplicants] = useState([]);
    const [message, setMessage] = useState('');
    const [confirming, setConfirming] = useState(null);

    const loadMine = async () => {
        const me = user?.id;
        const [jobs, courses] = await Promise.all([getJobs(), getCourses()]);
        setMine({
            // own posts + unowned demo/seed items so the platform can be managed
            jobs: jobs.filter((j) => j.source === 'custom' && (j.by === me || !j.by)),
            courses: courses.filter((c) => c.source === 'custom' && (c.by === me || !c.by)),
        });
    };

    const loadApplicants = async () => {
        const apps = await getJobApplicants();
        setApplicants(apps);
    };

    const setAppStatus = async (id, status) => {
        const res = await updateApplicationStatus(id, status);
        if (res && res.ok) {
            loadApplicants();
        } else {
            setMessage(isArabic ? 'تعذّر تحديث حالة المتقدم.' : 'Could not update applicant status.');
        }
    };

    useEffect(() => {
        loadMine();
        loadApplicants();
        // load when the signed-in user changes
    }, [user]); // eslint-disable-line

    const setJobField = (key, value) => setJob((prev) => ({ ...prev, [key]: value }));
    const setCourseField = (key, value) => setCourse((prev) => ({ ...prev, [key]: value }));

    const publishJob = async (event) => {
        event.preventDefault();
        if (!companyName) {
            setMessage(isArabic ? 'أضف اسم شركتك إلى حسابك أولًا.' : 'Add your company name to your account first.');
            return;
        }
        await addJob({ ...job, company: companyName, by: user?.id });
        setJob(EMPTY_JOB);
        setMessage(t('publishedJob'));
        loadMine();
    };

    const publishCourse = async (event) => {
        event.preventDefault();
        if (!companyName) {
            setMessage(isArabic ? 'أضف اسم شركتك إلى حسابك أولًا.' : 'Add your company name to your account first.');
            return;
        }
        await addCourse({ ...course, provider: companyName, by: user?.id });
        setCourse(EMPTY_COURSE);
        setMessage(t('publishedCourse'));
        loadMine();
    };

    const fieldLabel = (text) => (
        <label className="filter-label" style={{ textTransform: 'none' }}>{text}</label>
    );

    const eduLabel = (value) =>
        ({ highschool: t('eduHigh'), diploma: t('eduDiploma'), bachelor: t('eduBachelor'), master: t('eduMaster'), other: t('eduOther') }[value] || '—');

    return (
        <>
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
                    <PremiumButton variant={tab === 'applicants' ? 'gold' : 'ghost'} onClick={() => setTab('applicants')}>
                        {t('tabApplicants')}
                    </PremiumButton>
                </div>

                {tab === 'jobs' ? (
                    <form onSubmit={publishJob}>
                        <div className="field-group split-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                {fieldLabel(t('fieldCompany'))}
                                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', color: '#fcd34d' }}>
                                    🏢 {companyName || '—'}
                                </div>
                                <p className="muted" style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>{t('companyAutoNote')}</p>
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
                ) : tab === 'courses' ? (
                    <form onSubmit={publishCourse}>
                        <div className="field-group split-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                {fieldLabel(t('fieldTitle'))}
                                <input className="field" type="text" value={course.title} onChange={(e) => setCourseField('title', e.target.value)} required />
                            </div>
                            <div>
                                {fieldLabel(t('fieldProvider'))}
                                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', color: '#fcd34d' }}>
                                    🏢 {companyName || '—'}
                                </div>
                                <p className="muted" style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>{t('companyAutoNote')}</p>
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
                ) : null}

                {tab === 'applicants' ? (
                    <div style={{ marginTop: '1.5rem' }}>
                        <SectionHeading kicker="📬" title={t('tabApplicants')} />
                        {applicants.length ? (
                            <div className="card-grid card-grid--wide">
                                {applicants.map((app) => (
                                    <GlassCard key={app.id} className="data-card">
                                        <div className="card-head">
                                            <div>
                                                <Badge tone={app.appStatus === 'accepted' ? 'success' : app.appStatus === 'rejected' ? 'danger' : 'gold'}>
                                                    {app.appStatus === 'accepted' ? `✅ ${t('statusAccepted')}` : app.appStatus === 'rejected' ? `✖️ ${t('statusRejected')}` : `⏳ ${t('applied')}`}
                                                </Badge>
                                                <h3 className="card-title" style={{ marginTop: '0.6rem' }}>{app.fullName}</h3>
                                                <span className="card-copy">{app.job ? `${app.job.role} · ${app.job.company}` : app.email}</span>
                                            </div>
                                        </div>
                                        <div className="course-detail">
                                            <span className="course-detail__item">📞 {app.phone || '—'}</span>
                                            <span className="course-detail__item">✉️ {app.email}</span>
                                            <span className="course-detail__item">📍 {app.city || '—'}</span>
                                            <span className="course-detail__item">🎓 {eduLabel(app.education)}</span>
                                        </div>
                                        <div className="card-meta">
                                            {app.cvName ? <Badge tone="blue">📄 {app.cvName}</Badge> : null}
                                        </div>
                                        {app.cvPath ? (
                                            <PremiumButton variant="ghost" onClick={() => openCv(app.cvPath)}>{t('openCv')}</PremiumButton>
                                        ) : null}
                                        <div className="inline-actions" style={{ marginTop: '0.75rem' }}>
                                            <PremiumButton variant="primary" onClick={() => setConfirming({ id: app.id, name: app.fullName, action: 'accepted' })} disabled={app.appStatus !== 'pending'}>
                                                ✅ {t('acceptBtn')}
                                            </PremiumButton>
                                            <PremiumButton variant="danger" onClick={() => setConfirming({ id: app.id, name: app.fullName, action: 'rejected' })} disabled={app.appStatus !== 'pending'}>
                                                ✖️ {t('rejectBtn')}
                                            </PremiumButton>
                                        </div>
                                        {app.skills ? <p className="muted card-copy" style={{ fontSize: '0.82rem' }}>{app.skills}</p> : null}
                                        {app.coverLetter ? <p className="muted" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{app.coverLetter}</p> : null}
                                    </GlassCard>
                                ))}
                            </div>
                        ) : (
                            <p className="muted">{t('applicantsEmpty')}</p>
                        )}
                    </div>
                ) : (
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
                                                <PremiumButton variant="danger" onClick={async () => {
                                                    const res = await removeJob(item.id);
                                                    if (res && !res.ok) setMessage(isArabic ? 'تعذّر حذف هذا العنصر.' : 'Could not delete this item.');
                                                    loadMine();
                                                }}>
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
                                            <PremiumButton variant="danger" onClick={async () => {
                                                const res = await removeCourse(item.id);
                                                if (res && !res.ok) setMessage(isArabic ? 'تعذّر حذف هذا العنصر.' : 'Could not delete this item.');
                                                loadMine();
                                            }}>
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
                )}
            </GlassCard>
            {confirming ? (
                <div
                    className="app-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setConfirming(null);
                    }}
                >
                    <GlassCard className="app-modal app-modal--small">
                        <button type="button" className="app-modal__close" onClick={() => setConfirming(null)} aria-label="Close">×</button>
                        <div className="app-modal__body app-signin">
                            <strong>{confirming.action === 'accepted' ? t('confirmAccept') : t('confirmReject')}</strong>
                            <p className="muted">{confirming.name}</p>
                            <div className="inline-actions">
                                <PremiumButton variant="primary" onClick={async () => {
                                    await setAppStatus(confirming.id, confirming.action);
                                    setConfirming(null);
                                }}>
                                    {t('confirmYes')}
                                </PremiumButton>
                                <PremiumButton variant="ghost" onClick={() => setConfirming(null)}>
                                    {t('confirmNo')}
                                </PremiumButton>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            ) : null}
        </>
    );
};

export default ProviderStudio;
