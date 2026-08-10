import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { getMyApplications } from '../services/applications';
import ProviderStudio from '../components/ProviderStudio';
import { Badge, GlassCard, LoaderButton, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const getInitials = (name = 'PN') =>
    name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PN';

const roleInfo = {
    seeker: { key: 'roleSeeker', tag: 'roleSeekerTag', icon: '🎓' },
    provider: { key: 'roleProviderName', tag: 'roleProviderTag', icon: '🏢' },
};

const Dashboard = () => {
    const { user, role, isProvider } = useAuth();
    const { isArabic, t } = useLanguage();
    const fileRef = useRef(null);

    const meta = user?.user_metadata || {};
    const email = user?.email || '';
    const info = roleInfo[role] || roleInfo.seeker;

    const [fullName, setFullName] = useState(meta.fullName || '');
    const [headline, setHeadline] = useState(meta.headline || '');
    const [location, setLocation] = useState(meta.location || '');
    const [bio, setBio] = useState(meta.bio || '');
    const [avatar, setAvatar] = useState(meta.avatarUrl || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [myApps, setMyApps] = useState([]);

    useEffect(() => {
        let mounted = true;
        if (!isProvider) {
            getMyApplications().then((apps) => {
                if (mounted) setMyApps(apps);
            });
        }
        return () => {
            mounted = false;
        };
    }, [isProvider]);

    const onPickImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setAvatar(String(reader.result || ''));
        reader.readAsDataURL(file);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');

        const { error: updateError } = await supabase.auth.updateUser({
            data: { fullName, headline, location, bio, avatarUrl: avatar },
        });

        setSaving(false);

        if (updateError) {
            setError(updateError.message || (isArabic ? 'فشل حفظ الملف.' : 'Failed to save profile.'));
            return;
        }

        setMessage(t('dashSaved'));
    };

    return (
        <div className="page-shell page-shell__grid">
            <section className="hero hero--local">
                <div className="hero__grid">
                    <div>
                        <div className="hero__kicker">{isArabic ? 'لوحة التحكم' : 'Dashboard'}</div>
                        <h1 className="hero__title">
                            {isArabic ? 'أهلًا' : 'Welcome'}, <span className="gradient-text">{fullName || email}</span>.
                        </h1>
                        <p className="hero__lead">{t('dashRoleHint')}</p>
                        <div className="status-strip">
                            <Badge tone="gold">{info.icon} {t(info.key)}</Badge>
                            <Badge tone="blue">{t(info.tag)}</Badge>
                        </div>
                    </div>

                    <GlassCard className="hero__orbital hero__orbital--primary">
                        <SectionHeading kicker={t('dashProfileTitle')} title="" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {avatar ? (
                                <img className="profile-avatar profile-avatar--img" src={avatar} alt={fullName || 'avatar'} />
                            ) : (
                                <div className="profile-avatar" style={{ width: '4.5rem', height: '4.5rem', fontSize: '1.5rem' }}>
                                    {getInitials(fullName || email)}
                                </div>
                            )}
                            <div>
                                <div className="card-title">{fullName || email}</div>
                                <div className="muted">{headline || (isArabic ? 'أضف عنوانًا مهنيًا' : 'Add a headline')}</div>
                                <div className="muted">{location || email}</div>
                            </div>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                        <div className="inline-actions" style={{ marginTop: '1rem' }}>
                            <PremiumButton variant="ghost" onClick={() => fileRef.current?.click()}>
                                {t('dashUploadAvatar')}
                            </PremiumButton>
                            {avatar ? (
                                <PremiumButton variant="ghost" onClick={() => setAvatar('')}>
                                    {t('dashRemove')}
                                </PremiumButton>
                            ) : null}
                            <PremiumButton variant="gold" to="/cv-service">
                                {isArabic ? 'خدمة السيرة الذاتية' : 'CV service'}
                            </PremiumButton>
                        </div>
                    </GlassCard>
                </div>
            </section>

            <GlassCard>
                <SectionHeading
                    kicker={t('dashRoleLabel')}
                    title={t('dashRoleHint')}
                    subtitle={`${info.icon} ${t(info.key)}، ${t(info.tag)}`}
                />
                {isProvider ? (
                    <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        {isArabic ? 'دورك ثابت ولا يمكن تغييره — أنت مقدّم.' : 'Your role is fixed — you are a provider.'}
                    </p>
                ) : null}
                <div className="split-grid">
                    <div>
                        <div className="field-group">
                            <label className="filter-label" style={{ textTransform: 'none' }}>{t('dashFullName')}</label>
                            <input className="field" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                            <label className="filter-label" style={{ textTransform: 'none' }}>{t('dashHeadline')}</label>
                            <input className="field" type="text" placeholder={t('dashHeadlinePlaceholder')} value={headline} onChange={(e) => setHeadline(e.target.value)} />
                            <label className="filter-label" style={{ textTransform: 'none' }}>{t('dashLocation')}</label>
                            <input className="field" type="text" placeholder={isArabic ? 'بورسعيد' : 'Port Said'} value={location} onChange={(e) => setLocation(e.target.value)} />
                            <label className="filter-label" style={{ textTransform: 'none' }}>{t('dashBio')}</label>
                            <textarea className="textarea" placeholder={t('dashBioPlaceholder')} value={bio} onChange={(e) => setBio(e.target.value)} />
                            {message ? <p className="muted" style={{ color: '#bbf7d0' }}>{message}</p> : null}
                            {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}
                            <LoaderButton type="button" variant="gold" loading={saving} onClick={handleSave}>
                                {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : t('dashSave')}
                            </LoaderButton>
                        </div>
                    </div>
                    <GlassCard className="quick-card">
                        <SectionHeading kicker={t('dashQuick')} title={isProvider ? t('providerQuick') : (isArabic ? 'ابدأ الآن' : 'Get started')} />
                        {isProvider ? (
                            <div className="inline-actions quick-card__actions">
                                <PremiumButton variant="gold" to="/jobs">{t('viewJobs')}</PremiumButton>
                                <PremiumButton variant="gold" to="/courses">{t('viewCourses')}</PremiumButton>
                            </div>
                        ) : (
                            <div className="inline-actions quick-card__actions">
                                <PremiumButton variant="primary" to="/jobs">{isArabic ? 'تصفح الوظائف' : 'Browse jobs'}</PremiumButton>
                                <PremiumButton variant="primary" to="/courses">{isArabic ? 'تصفح الدورات' : 'Browse courses'}</PremiumButton>
                                <PremiumButton variant="gold" to="/cv-service">{isArabic ? 'خدمة السيرة الذاتية' : 'CV service'}</PremiumButton>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </GlassCard>

            {!isProvider ? (
                <GlassCard>
                    <SectionHeading kicker="📬" title={t('myApplications')} subtitle={t('myApplicationsSub')} />
                    {myApps.length ? (
                        <div className="card-grid card-grid--wide">
                            {myApps.map((app) => (
                                <GlassCard key={app.id} className="data-card">
                                    <div className="card-head">
                                        <div>
                                            <Badge tone="gold">⏳ {t('applied')}</Badge>
                                            <h3 className="card-title" style={{ marginTop: '0.6rem' }}>{app.job?.role || t('appUntitled')}</h3>
                                            <span className="card-copy">{app.job ? `${app.job.company} · ${app.job.location}` : app.email}</span>
                                        </div>
                                    </div>
                                    <div className="card-meta">
                                        {app.cvName ? <Badge tone="blue">📄 {app.cvName}</Badge> : null}
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    ) : (
                        <p className="muted">{t('noApplications')}</p>
                    )}
                </GlassCard>
            ) : null}

            {isProvider ? <ProviderStudio /> : null}
        </div>
    );
};

export default Dashboard;
