import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';
import CVBuilder from '../components/CVBuilder/CVBuilder';

const CVService = () => {
    const { user } = useAuth();
    const { t, isArabic } = useLanguage();
    const cvInputRef = useRef(null);
    const [cvName, setCvName] = useState(user?.user_metadata?.cvName || '');
    const [started, setStarted] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');

    // Pre-conversation step: let the user attach an existing CV (if they have
    // one) so the agent can build on it with more accurate data. Stored in the
    // private `cvs` bucket + saved to user_metadata (cvPath/cvName) which the
    // CV builder already reads to seed the conversation.
    const onPickCv = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCvName(file.name);
        setMessage('');
        if (!user) return;
        setUploading(true);
        try {
            const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${user.id}/cv_${Date.now()}_${safeName}.${ext}`;
            const { error: storageError } = await supabase.storage
                .from('cvs')
                .upload(path, file, { contentType: file.type, upsert: false });
            if (storageError) throw storageError;
            const { error: updateError } = await supabase.auth.updateUser({
                data: { cvPath: path, cvName: file.name },
            });
            if (updateError) throw updateError;
            setMessage(isArabic ? 'تم حفظ سيرتك - سيبني عليها المستشار بدقة.' : 'Your CV is saved - the consultant will build on it.');
        } catch (err) {
            setMessage(err.message || t('uploadFailed'));
        } finally {
            setUploading(false);
        }
    };

    const start = () => setStarted(true);

    return (
        <div className="page-shell page-shell__grid">
            <section className="hero hero--local">
                <div>
                    <div className="hero__kicker">
                        <span className="nautical-tile" aria-hidden="true">🧭</span> {t('cvKicker')}
                    </div>
                    <h1 className="hero__title">
                        {t('cvTitle')}
                    </h1>
                    <BilingualLine
                        as="p"
                        className="hero__lead"
                        ar="سيرتك الذاتية تُصاغ وتُنقّح بعناية احترافية وبأسلوب أنيق ومتقن."
                        en="Your CV is tailored and curated professionally and in a pristine manner."
                    />
                    <div className="status-strip">
                        <Badge tone="gold">✨ {t('aiAgent')}</Badge>
                    </div>
                </div>
            </section>

            {!started ? (
                <GlassCard className="auth-card">
                    <SectionHeading
                        kicker={isArabic ? 'مستشار السيرة الذاتية' : 'CV Consultant'}
                        title={isArabic ? 'نوفا تبني سيرتك معك' : 'Nova builds your CV with you'}
                        subtitle={isArabic
                            ? 'قبل أن نبدأ، هل لديك سيرة ذاتية سابقة؟ ارفعها ليبني عليها المستشار ببيانات أكثر دقة - أو ابدأ مباشرة.'
                            : 'Before we start, do you have an existing CV? Upload it so the consultant builds on it with accurate data - or start right away.'}
                    />
                    <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={onPickCv} />
                    <div className="inline-actions" style={{ marginTop: '0.75rem' }}>
                        <PremiumButton variant="ghost" onClick={() => cvInputRef.current?.click()} disabled={uploading}>
                            {uploading
                                ? (isArabic ? 'جارٍ الرفع…' : 'Uploading…')
                                : (cvName
                                    ? (isArabic ? 'تغيير السيرة المرفوعة' : 'Change uploaded CV')
                                    : (isArabic ? 'ارفع سيرتك الحالية (اختياري)' : 'Upload your existing CV (optional)'))}
                        </PremiumButton>
                        <PremiumButton variant="gold" onClick={start}>
                            {isArabic ? 'ابدأ المحادثة 🦉' : 'Start the conversation 🦉'}
                        </PremiumButton>
                    </div>
                    {cvName ? (
                        <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>📄 {cvName}</p>
                    ) : null}
                    {message ? <p className="muted" style={{ marginTop: '0.5rem' }}>{message}</p> : null}
                </GlassCard>
            ) : (
                <CVBuilder />
            )}
        </div>
    );
};

export default CVService;