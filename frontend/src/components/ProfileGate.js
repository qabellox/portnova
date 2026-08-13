import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useLanguage } from '../context/LanguageContext';
import { GlassCard, LoaderButton, PremiumButton, SectionHeading } from './PremiumUI';
import '../styles/profile-gate.css';

const STEPS = [
    { key: 'fullName' },
    { key: 'phone' },
    { key: 'location' },
    { key: 'cv' },
];

/** Gate that persists the user's identity + core credentials before they use
 *  the CV agent (and, as a follow-up, the rest of the site). Smooth, step-by-
 *  step, no AI calls. Everything is saved to the Supabase profile metadata so
 *  the CV builder can start from real data and ask smarter questions. */
const ProfileGate = ({ children }) => {
    const { user, loading } = useAuth();
    const { isArabic } = useLanguage();

    if (loading) {
        return <div className="page-shell"><div className="empty-state">{isArabic ? 'جارٍ التحقق من الحساب…' : 'Checking your account…'}</div></div>;
    }

    if (!user) {
        return (
            <div className="page-shell page-shell--narrow">
                <GlassCard className="profile-gate">
                    <div className="profile-gate__icon" aria-hidden="true">🔐</div>
                    <SectionHeading
                        kicker={isArabic ? 'تسجيل الدخول' : 'Sign in'}
                        title={isArabic ? 'سجّل الدخول لمتابعة بناء سيرتك' : 'Sign in to keep building your CV'}
                        subtitle={isArabic ? 'بياناتك الشخصية تبقى محفوظة وآمنة — سنستخدمها لتخصيص سيرتك الذكية.' : 'Your details stay saved and private — we use them to personalise your AI CV.'}
                    />
                    <div className="inline-actions">
                        <PremiumButton variant="gold" to="/login">{isArabic ? 'تسجيل الدخول' : 'Login'}</PremiumButton>
                        <PremiumButton variant="primary" to="/register">{isArabic ? 'إنشاء حساب' : 'Create account'}</PremiumButton>
                    </div>
                </GlassCard>
            </div>
        );
    }

    const meta = user.user_metadata || {};
    const complete = Boolean(meta.fullName && meta.phone && meta.location);

    if (!complete) {
        return <ProfileForm existing={meta} />;
    }

    return children;
};

const ProfileForm = ({ existing = {} }) => {
    const { user } = useAuth();
    const { isArabic } = useLanguage();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        fullName: existing.fullName || '',
        phone: existing.phone || '',
        location: existing.location || '',
        cvPath: existing.cvPath || '',
        cvName: existing.cvName || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const fileInputRef = useRef(null);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
    const isLast = step === STEPS.length - 1;

    const valid = (() => {
        const key = STEPS[step].key;
        if (key === 'cv') return true; // CV is optional
        return String(form[key] || '').trim().length > 1;
    })();

    const next = () => {
        if (!valid) return;
        if (isLast) {
            save();
        } else {
            setStep((s) => s + 1);
        }
    };

    const pickCv = async (file) => {
        if (!file) return;
        try {
            const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${user.id}/profile_cv_${Date.now()}_${safe}.${ext}`;
            const { error } = await supabase.storage.from('cvs').upload(path, file, { contentType: file.type, upsert: false });
            if (error) throw error;
            setForm((prev) => ({ ...prev, cvPath: path, cvName: file.name }));
        } catch (err) {
            setError(err.message || 'Upload failed.');
        }
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    location: form.location.trim(),
                    cvPath: form.cvPath,
                    cvName: form.cvName,
                    profileComplete: true,
                },
            });
            if (error) throw error;
            setDone(true);
        } catch (err) {
            setError(err.message || 'Could not save your details.');
        } finally {
            setSaving(false);
        }
    };

    const skip = () => save();

    if (done) {
        return (
            <div className="page-shell page-shell--narrow">
                <GlassCard className="profile-gate">
                    <div className="profile-gate__icon profile-gate__icon--success" aria-hidden="true">✓</div>
                    <SectionHeading
                        kicker={isArabic ? 'تم' : 'Done'}
                        title={isArabic ? 'شكرًا! بياناتك محفوظة 🎉' : 'Thanks — your details are saved 🎉'}
                        subtitle={isArabic ? 'يمكنك الآن مواصلة بناء سيرتك الذكية مع نوفا.' : 'You can now continue building your CV with Nova.'}
                    />
                </GlassCard>
            </div>
        );
    }

    const stepKey = STEPS[step].key;

    return (
        <div className="page-shell page-shell--narrow">
            <GlassCard className="profile-gate profile-gate--form">
                <div className="profile-gate__steps" aria-hidden="true">
                    {STEPS.map((s, i) => (
                        <span key={s.key} className={`profile-gate__dot ${i <= step ? 'profile-gate__dot--on' : ''}`} />
                    ))}
                </div>
                <SectionHeading
                    kicker={isArabic ? `الخطوة ${step + 1} من ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}
                    title={t(`pgTitle_${stepKey}`)}
                    subtitle={t(`pgSub_${stepKey}`)}
                />

                <div key={step} className="profile-gate__step">
                    {stepKey === 'fullName' ? (
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'الاسم الكامل' : 'Full name'}</label>
                            <input className="input" value={form.fullName} onChange={set('fullName')} placeholder={isArabic ? 'مثال: أحمد إبراهيم' : 'e.g. Ahmed Ibrahim'} autoFocus />
                        </div>
                    ) : null}

                    {stepKey === 'phone' ? (
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'رقم الهاتف' : 'Phone number'}</label>
                            <input className="input" value={form.phone} onChange={set('phone')} placeholder={isArabic ? 'مثال: 01012345678' : 'e.g. 01012345678'} inputMode="tel" autoFocus />
                        </div>
                    ) : null}

                    {stepKey === 'location' ? (
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'الموقع' : 'Location'}</label>
                            <input className="input" value={form.location} onChange={set('location')} placeholder={isArabic ? 'مثال: بورسعيد، مصر' : 'e.g. Port Said, Egypt'} autoFocus />
                        </div>
                    ) : null}

                    {stepKey === 'cv' ? (
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'سيرتك الذاتية (اختياري)' : 'Your CV (optional)'}</label>
                            <button type="button" className="dropzone profile-gate__cv" onClick={() => fileInputRef.current?.click()}>
                                <span className="icon-circle" aria-hidden="true">CV</span>
                                <span>{form.cvName || (isArabic ? 'اضغط لرفع سيرة ذاتية — أو تابع بدونها' : 'Tap to upload a CV — or continue without one')}</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(event) => pickCv(event.target.files?.[0])}
                            />
                        </div>
                    ) : null}

                    {error ? <p className="muted profile-gate__error">{error}</p> : null}

                    <div className="inline-actions profile-gate__actions">
                        {step > 0 && !saving ? (
                            <PremiumButton type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
                                {isArabic ? 'رجوع' : 'Back'}
                            </PremiumButton>
                        ) : null}
                        <LoaderButton variant="gold" loading={saving} disabled={!valid} onClick={next}>
                            {isLast ? (saving ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : isArabic ? 'حفظ والمتابعة ✓' : 'Save & continue ✓') : isArabic ? 'التالي' : 'Next'}
                        </LoaderButton>
                        {stepKey === 'cv' && !form.cvPath ? (
                            <PremiumButton type="button" variant="ghost" onClick={skip} disabled={saving}>
                                {isArabic ? 'تخطي' : 'Skip'}
                            </PremiumButton>
                        ) : null}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default ProfileGate;
