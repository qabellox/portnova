import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Badge, BilingualLine, GlassCard, LoaderButton, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const getInitials = (name = 'PN') =>
    name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PN';

/* Merged Dashboard + Profile.
   Keeps the real functionality: your profile details (saved to your account)
   and quick links to the services. Fake metrics are removed — real ones come
   once the backend data exists. */
const Dashboard = () => {
    const { user } = useAuth();
    const { isArabic } = useLanguage();

    const meta = user?.user_metadata || {};
    const role = meta.role || 'youth';
    const email = user?.email || '';
    const [fullName, setFullName] = useState(meta.fullName || '');
    const [headline, setHeadline] = useState(meta.headline || '');
    const [location, setLocation] = useState(meta.location || '');
    const [bio, setBio] = useState(meta.bio || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSave = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');

        const { error: updateError } = await supabase.auth.updateUser({
            data: { fullName, headline, location, bio },
        });

        setSaving(false);

        if (updateError) {
            setError(updateError.message || (isArabic ? 'فشل حفظ الملف.' : 'Failed to save profile.'));
            return;
        }

        setMessage(isArabic ? 'تم حفظ ملفك الشخصي.' : 'Your profile was saved.');
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
                        <BilingualLine
                            as="p"
                            className="hero__lead"
                            ar="هنا ملفك وروابطك السريعة — كل ما يخصك في مكان واحد."
                            en="Your profile and quick links — everything about you in one place."
                        />
                        <div className="status-strip">
                            <Badge tone="gold">{role}</Badge>
                            <Badge tone="blue">{isArabic ? 'جلسة نشطة' : 'Active session'}</Badge>
                        </div>
                    </div>

                    <GlassCard className="hero__orbital hero__orbital--primary">
                        <div className="profile-avatar" style={{ width: '4rem', height: '4rem', fontSize: '1.4rem' }}>
                            {getInitials(fullName || email)}
                        </div>
                        <div className="muted" style={{ marginTop: '0.75rem' }}>{email}</div>
                        <div className="inline-actions" style={{ marginTop: '1rem' }}>
                            <PremiumButton variant="gold" to="/cv-service">
                                {isArabic ? 'خدمة السيرة الذاتية' : 'CV service'}
                            </PremiumButton>
                            <PremiumButton variant="ghost" to="/jobs">
                                {isArabic ? 'الوظائف' : 'Jobs'}
                            </PremiumButton>
                        </div>
                    </GlassCard>
                </div>
            </section>

            <GlassCard>
                <SectionHeading
                    kicker={isArabic ? 'الملف' : 'Profile'}
                    title={isArabic ? 'عدّل بياناتك' : 'Edit your details'}
                    subtitle={isArabic ? 'بياناتك تُحفظ في حسابك وتظهر في كل المنصة.' : 'Your details are saved to your account and used across the platform.'}
                />
                {message ? <p className="muted" style={{ color: '#bbf7d0' }}>{message}</p> : null}
                {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}
                <form onSubmit={handleSave}>
                    <div className="field-group">
                        <input className="field" type="text" placeholder={isArabic ? 'الاسم الكامل' : 'Full name'} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        <input className="field" type="text" placeholder={isArabic ? 'العنوان المهني' : 'Headline'} value={headline} onChange={(e) => setHeadline(e.target.value)} />
                        <input className="field" type="text" placeholder={isArabic ? 'الموقع' : 'Location'} value={location} onChange={(e) => setLocation(e.target.value)} />
                        <textarea className="textarea" placeholder={isArabic ? 'نبذة عنك' : 'Short bio'} value={bio} onChange={(e) => setBio(e.target.value)} />
                        <LoaderButton type="submit" variant="gold" loading={saving}>
                            {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : isArabic ? 'حفظ التغييرات' : 'Save changes'}
                        </LoaderButton>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};

export default Dashboard;
