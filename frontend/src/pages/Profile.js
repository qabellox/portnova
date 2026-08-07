import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Badge, BilingualLine, GlassCard, LoaderButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const getInitials = (name = 'PN') =>
    name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PN';

const Profile = () => {
    const { user } = useAuth();
    const { isArabic } = useLanguage();

    const meta = user?.user_metadata || {};
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
            data: {
                fullName,
                headline,
                location,
                bio,
            },
        });

        setSaving(false);

        if (updateError) {
            setError(updateError.message || 'Failed to update profile.');
            return;
        }

        setMessage(isArabic ? 'تم حفظ ملفك الشخصي بنجاح.' : 'Your profile has been saved successfully.');
    };

    return (
        <div className="page-shell page-shell__grid">
            <GlassCard className="profile-hero">
                <div className="profile-avatar">{getInitials(fullName || user?.email)}</div>
                <div>
                    <div className="badge badge--gold profile-role">{meta.role || 'youth'}</div>
                    <h1 className="card-title" style={{ fontSize: '1.6rem', marginTop: '0.5rem' }}>
                        {fullName || user?.email}
                    </h1>
                    <div className="muted">{user?.email}</div>
                </div>
            </GlassCard>

            <GlassCard>
                <SectionHeading
                    kicker={isArabic ? 'الملف الشخصي' : 'Profile'}
                    title={isArabic ? 'عدّل بياناتك' : 'Edit your details'}
                    subtitle={isArabic ? 'بياناتك تُحفظ بأمان في حسابك وتظهر في كل المنصة.' : 'Your details are stored securely on your account and used across the platform.'}
                />
                {message ? <p className="muted" style={{ color: '#bbf7d0' }}>{message}</p> : null}
                {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}
                <form onSubmit={handleSave}>
                    <div className="field-group">
                        <input
                            className="field"
                            type="text"
                            placeholder={isArabic ? 'الاسم الكامل' : 'Full name'}
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                        />
                        <input
                            className="field"
                            type="text"
                            placeholder={isArabic ? 'العنوان المهني (مثال: مطور واجهات)' : 'Headline (e.g. Frontend Developer)'}
                            value={headline}
                            onChange={(event) => setHeadline(event.target.value)}
                        />
                        <input
                            className="field"
                            type="text"
                            placeholder={isArabic ? 'الموقع' : 'Location'}
                            value={location}
                            onChange={(event) => setLocation(event.target.value)}
                        />
                        <textarea
                            className="textarea"
                            placeholder={isArabic ? 'نبذة عنك' : 'Short bio'}
                            value={bio}
                            onChange={(event) => setBio(event.target.value)}
                        />
                        <LoaderButton type="submit" variant="gold" loading={saving}>
                            {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : isArabic ? 'حفظ التغييرات' : 'Save changes'}
                        </LoaderButton>
                    </div>
                </form>
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Badge tone="blue">{isArabic ? 'دورك الحالي' : 'Current role'}</Badge>
                    <BilingualLine
                        className="card-copy"
                        ar={`لديك وصول إلى لوحة التحكم حسب دورك (${meta.role || 'youth'}).`}
                        en={`You have role-based access (${meta.role || 'youth'}).`}
                    />
                </div>
            </GlassCard>
        </div>
    );
};

export default Profile;
