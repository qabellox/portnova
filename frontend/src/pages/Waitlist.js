import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getWaitlistStatus, joinWaitlist, referralLink, REFERRALS_NEEDED } from '../services/waitlist';
import { BilingualLine, GlassCard, LanguageToggle, LoaderButton, PremiumButton, SectionHeading } from '../components/PremiumUI';
import '../styles/waitlist.css';

/** PortNova launch teaser - the first page everyone sees (except admins).
 *  Collects the data we need pre-launch, gives each member a referral code,
 *  and rewards REFERRALS_NEEDED referrals with a FREE CV session at launch. */
const Waitlist = ({ user }) => {
    const { isArabic } = useLanguage();
    const [params] = useSearchParams();
    const refParam = params.get('ref') || '';

    // Persist any incoming referral code so it survives the journey from this
    // landing page -> register -> login -> join form (the inviter must get
    // credited even when the code only arrived in the original URL).
    useEffect(() => {
        if (refParam && typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('portnova_ref', refParam);
        }
    }, [refParam]);

    const meta = user?.user_metadata || {};
    const email = user?.email || '';
    const savedRef = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('portnova_ref') || '' : '';

    // Joined status (members who already secured their place see their code)
    const [status, setStatus] = useState(null);
    const [checking, setChecking] = useState(!!user);

    // Join form
    const [form, setForm] = useState({
        fullName: meta.fullName || '',
        phone: meta.phone || '',
        city: meta.location || '',
        rolePref: 'jobs',
        referralCode: refParam || savedRef || meta.referralCode || '',
        // Premium fields (optional) - help us match you at launch
        ageRange: '',
        currentStatus: '',
        educationLevel: '',
        interestField: '',
        employmentPref: '',
        howHeard: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    useEffect(() => {
        if (!user || !email) return;
        let mounted = true;
        getWaitlistStatus(email)
            .then((res) => { if (mounted) setStatus(res); })
            .catch(() => { if (mounted) setStatus({ on_list: false }); })
            .finally(() => { if (mounted) setChecking(false); });
        return () => { mounted = false; };
    }, [user, email]);

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await joinWaitlist({
                userId: user?.id,
                fullName: form.fullName.trim(),
                email,
                phone: form.phone.trim(),
                city: form.city.trim(),
                rolePref: form.rolePref,
                referralCode: form.referralCode.trim(),
                ageRange: form.ageRange,
                currentStatus: form.currentStatus,
                educationLevel: form.educationLevel,
                interestField: form.interestField,
                employmentPref: form.employmentPref,
                howHeard: form.howHeard,
            });
            if (!res?.ok) throw new Error(res?.error || 'Could not join');
            // Consumed the referral code - clear it so it doesn't leak to a
            // different user on a shared device.
            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('portnova_ref');
            setStatus(res);
        } catch (err) {
            setError(err.message || (isArabic ? 'تعذّر الانضمام. حاول مرة أخرى.' : 'Could not join. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const shareText = isArabic
        ? `انضم إلى قائمة انتظار PortNova معي واحصل على جلسة سيرة ذاتية مجانية عند إحالة ${REFERRALS_NEEDED} أصدقاء! 🚢 ${referralLink(status?.referral_code || '')}`
        : `Join me on the PortNova waitlist - refer ${REFERRALS_NEEDED} friends and get a FREE CV session! 🚢 ${referralLink(status?.referral_code || '')}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(referralLink(status?.referral_code || ''));
        } catch {
            // clipboard unavailable - ignore
        }
    };

    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    /* ------------------------- not signed in ------------------------- */
    if (!user) {
        return (
            <div className="page-shell waitlist-page">
                <header className="waitlist-brand">
                    <img className="brand__logo" src="/images/logo.png" alt="PortNova" />
                    <span className="brand__name">PortNova</span>
                    <LanguageToggle className="waitlist-lang" />
                </header>
                <main className="waitlist-hero">
                    <div className="waitlist-badge">{isArabic ? 'قريبًا 🚀' : 'Coming Soon 🚀'}</div>
                    <h1 className="waitlist-title gradient-text">
                        {isArabic ? 'احجز مكانك في بورسعيد القادمة' : 'Secure your place in the new Port Said'}
                    </h1>
                    <BilingualLine
                        as="p"
                        className="waitlist-lead"
                        ar={`منصة PortNova تجمع شباب بورسعيد بالوظائف والدورات وخدمة السيرة الذاتية. انضم للقائمة الآن لتكون أول من يدخل عند الإطلاق - وأحِل ${REFERRALS_NEEDED} أصدقاء لتحصل على أول جلسة سيرة ذاتية مجانًا.`}
                        en={`PortNova connects Port Said's youth with jobs, courses and CV support. Join the list now to be first in at launch - refer ${REFERRALS_NEEDED} friends and get your first CV session free.`}
                    />
                    <div className="inline-actions waitlist-cta">
                        <PremiumButton to={`/register${refParam ? `?ref=${encodeURIComponent(refParam)}` : ''}`} variant="gold">{isArabic ? 'أنشئ حسابًا واحجز مكانك' : 'Create account & secure your place'}</PremiumButton>
                        <PremiumButton to={`/login${refParam ? `?ref=${encodeURIComponent(refParam)}` : ''}`} variant="ghost">{isArabic ? 'تسجيل الدخول' : 'Login'}</PremiumButton>
                    </div>
                </main>
            </div>
        );
    }

    /* --------------------------- already on list --------------------------- */
    if (status?.on_list) {
        return (
            <div className="page-shell page-shell--narrow waitlist-page">
                <header className="waitlist-brand">
                    <img className="brand__logo" src="/images/logo.png" alt="PortNova" />
                    <span className="brand__name">PortNova</span>
                    <LanguageToggle className="waitlist-lang" />
                </header>
                <GlassCard className="waitlist-card">
                    <SectionHeading
                        kicker={isArabic ? 'أنت على القائمة ✅' : "You're on the list ✅"}
                        title={isArabic ? 'تم تأمين مكانك!' : 'Your place is secured!'}
                        subtitle={isArabic ? `شارك رابطك الخاص وأحِل ${REFERRALS_NEEDED} أصدقاء لتفعيل جلسة السيرة الذاتية المجانية عند الإطلاق.` : `Share your link and get ${REFERRALS_NEEDED} friends to join to unlock your free CV session at launch.`}
                    />
                    <div className="waitlist-code">
                        <span className="waitlist-code__label">{isArabic ? 'رمزك الخاص' : 'Your referral code'}</span>
                        <strong className="waitlist-code__value">{status.referral_code}</strong>
                    </div>
                    <div className="waitlist-progress">
                        <div className="waitlist-progress__row">
                            <span>{isArabic ? 'أصدقاؤك' : 'Friends joined'}</span>
                            <strong>{status.referral_count} / {REFERRALS_NEEDED}</strong>
                        </div>
                        <div className="progress">
                            <div className="progress__bar" style={{ width: `${Math.min(100, (status.referral_count / REFERRALS_NEEDED) * 100)}%` }} />
                        </div>
                    </div>
                    {status.cv_session_free ? (
                        <div className="waitlist-reward waitlist-reward--on">🎉 {isArabic ? 'مبروك! جلسة السيرة الذاتية المجانية مفعّلة لك عند الإطلاق.' : 'Congratulations! Your free CV session is unlocked for launch.'}</div>
                    ) : (
                        <div className="waitlist-reward">{isArabic ? `أحِل ${REFERRALS_NEEDED} أصدقاء لتفعيل جلسة السيرة الذاتية المجانية.` : `Refer ${REFERRALS_NEEDED} friends to unlock the free CV session.`}</div>
                    )}
                    <div className="waitlist-share">
                        <div className="field waitlist-share__link">{referralLink(status.referral_code)}</div>
                        <div className="inline-actions">
                            <PremiumButton variant="primary" onClick={copyLink}>{isArabic ? 'نسخ الرابط' : 'Copy link'}</PremiumButton>
                            <a className="premium-button premium-button--success" href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp</a>
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    /* ------------------------------ join form ------------------------------ */
    return (
        <div className="page-shell page-shell--narrow waitlist-page">
            <header className="waitlist-brand">
                <img className="brand__logo" src="/images/logo.png" alt="PortNova" />
                <span className="brand__name">PortNova</span>
                <LanguageToggle className="waitlist-lang" />
            </header>
            <GlassCard className="waitlist-card">
                <SectionHeading
                    kicker={isArabic ? 'قائمة الانتظار' : 'The waitlist'}
                    title={isArabic ? 'أكمل بياناتك لتأمين مكانك' : 'Complete your details to secure your place'}
                    subtitle={isArabic ? `بياناتك تبقى محفوظة وآمنة - سنخبرك أولًا عند الإطلاق، وأحِل ${REFERRALS_NEEDED} أصدقاء لتحصل على أول جلسة سيرة ذاتية مجانًا.` : `Your details stay safe - we'll tell you first at launch, and refer ${REFERRALS_NEEDED} friends for a free first CV session.`}
                />
                <form onSubmit={submit} className="waitlist-form">
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'الاسم الكامل' : 'Full name'}</label>
                        <input className="field" value={form.fullName} onChange={set('fullName')} required placeholder={isArabic ? 'مثال: أحمد إبراهيم' : 'e.g. Ahmed Ibrahim'} />
                    </div>
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
                        <input className="field" value={email} disabled />
                    </div>
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'رقم الهاتف' : 'Phone'}</label>
                        <input className="field" value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="01xxxxxxxxx" />
                    </div>
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'المدينة' : 'City'}</label>
                        <input className="field" value={form.city} onChange={set('city')} placeholder={isArabic ? 'بورسعيد' : 'Port Said'} />
                    </div>
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'أكثر ما يهمك؟' : 'What interests you most?'}</label>
                        <select className="select" value={form.rolePref} onChange={set('rolePref')}>
                            <option value="jobs">{isArabic ? 'وظائف' : 'Jobs'}</option>
                            <option value="courses">{isArabic ? 'دورات' : 'Courses'}</option>
                            <option value="cv">{isArabic ? 'سيرة ذاتية' : 'CV'}</option>
                            <option value="all">{isArabic ? 'الكل' : 'Everything'}</option>
                        </select>
                    </div>
                    <div className="waitlist-grid">
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'الفئة العمرية' : 'Age range'}</label>
                            <select className="select" value={form.ageRange} onChange={set('ageRange')}>
                                <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                                <option value="18-24">18-24</option>
                                <option value="25-30">25-30</option>
                                <option value="31+">31+</option>
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'حالتك الحالية' : 'Current status'}</label>
                            <select className="select" value={form.currentStatus} onChange={set('currentStatus')}>
                                <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                                <option value="student">{isArabic ? 'طالب' : 'Student'}</option>
                                <option value="fresh">{isArabic ? 'خريج حديث' : 'Fresh graduate'}</option>
                                <option value="employed">{isArabic ? 'موظف' : 'Employed'}</option>
                                <option value="seeking">{isArabic ? 'باحث عن عمل' : 'Job seeker'}</option>
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'المؤهل الدراسي' : 'Education level'}</label>
                            <select className="select" value={form.educationLevel} onChange={set('educationLevel')}>
                                <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                                <option value="secondary">{isArabic ? 'ثانوية' : 'Secondary'}</option>
                                <option value="diploma">{isArabic ? 'دبلوم' : 'Diploma'}</option>
                                <option value="bachelor">{isArabic ? 'بكالوريوس' : 'Bachelor'}</option>
                                <option value="master">{isArabic ? 'ماجستير' : 'Master'}</option>
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'المجال المهني' : 'Field of interest'}</label>
                            <select className="select" value={form.interestField} onChange={set('interestField')}>
                                <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                                <option value="tech">{isArabic ? 'تقنية' : 'Technology'}</option>
                                <option value="business">{isArabic ? 'أعمال' : 'Business'}</option>
                                <option value="design">{isArabic ? 'تصميم' : 'Design'}</option>
                                <option value="maritime">{isArabic ? 'بحري' : 'Maritime'}</option>
                                <option value="other">{isArabic ? 'أخرى' : 'Other'}</option>
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'تفضيل العمل' : 'Work preference'}</label>
                            <select className="select" value={form.employmentPref} onChange={set('employmentPref')}>
                                <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                                <option value="full">{isArabic ? 'دوام كامل' : 'Full-time'}</option>
                                <option value="part">{isArabic ? 'دوام جزئي' : 'Part-time'}</option>
                                <option value="intern">{isArabic ? 'تدريب' : 'Internship'}</option>
                                <option value="remote">{isArabic ? 'عن بُعد' : 'Remote'}</option>
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'كيف سمعت عنا؟' : 'How did you hear about us?'}</label>
                            <select className="select" value={form.howHeard} onChange={set('howHeard')}>
                                <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                                <option value="friend">{isArabic ? 'صديق' : 'Friend'}</option>
                                <option value="facebook">Facebook</option>
                                <option value="instagram">Instagram</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="other">{isArabic ? 'أخرى' : 'Other'}</option>
                            </select>
                        </div>
                    </div>
                    {refParam ? (
                        <div className="waitlist-ref-hint">🔗 {isArabic ? `دُعيت بواسطة الرمز ${refParam}` : `Invited via code ${refParam}`}</div>
                    ) : null}
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'رمز إحالة (اختياري)' : 'Referral code (optional)'}</label>
                        <input className="field" value={form.referralCode} onChange={set('referralCode')} placeholder="XXXXXXX" />
                    </div>
                    {error ? <p className="muted waitlist-error">{error}</p> : null}
                    <LoaderButton variant="gold" loading={submitting} type="submit" className="waitlist-submit">
                        {submitting ? (isArabic ? 'جارٍ الحجز…' : 'Securing…') : (isArabic ? 'أكّد مكاني 🚢' : 'Secure my place 🚢')}
                    </LoaderButton>
                    <p className="waitlist-note">
                        {isArabic
                            ? 'هذه التفاصيل تساعدنا على توصيلك بالوظائف والدورات المناسبة لك فور الإطلاق - نجمعها لنخدمك بشكل أفضل، لا لنزعجك.'
                            : 'These details help us put the right jobs and courses in front of you the moment we launch - we collect them to serve you better, not to bother you.'}
                    </p>
                </form>
            </GlassCard>
        </div>
    );
};

export default Waitlist;
