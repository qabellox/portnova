import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getWaitlistStatus, joinWaitlist, referralLink, REFERRAL_LEVELS, progressForCount, sessionsForCount } from '../services/waitlist';
import { GlassCard, LanguageToggle, LoaderButton, PremiumButton, SectionHeading } from '../components/PremiumUI';
import '../styles/waitlist.css';

// All 27 Egyptian governorates (AR / EN) - the ONLY location question asked.
const GOVERNORATES = [
    ['القاهرة', 'Cairo'], ['الجيزة', 'Giza'], ['الإسكندرية', 'Alexandria'],
    ['الدقهلية', 'Dakahlia'], ['البحر الأحمر', 'Red Sea'], ['البحيرة', 'Beheira'],
    ['الفيوم', 'Faiyum'], ['الغربية', 'Gharbia'], ['الإسماعيلية', 'Ismailia'],
    ['المنوفية', 'Monufia'], ['المنيا', 'Minya'], ['القليوبية', 'Qalyubia'],
    ['الوادي الجديد', 'New Valley'], ['السويس', 'Suez'], ['أسوان', 'Aswan'],
    ['أسيوط', 'Asyut'], ['بني سويف', 'Beni Suef'], ['بورسعيد', 'Port Said'],
    ['دمياط', 'Damietta'], ['الشرقية', 'Sharqia'], ['جنوب سيناء', 'South Sinai'],
    ['كفر الشيخ', 'Kafr El Sheikh'], ['مطروح', 'Matrouh'], ['الأقصر', 'Luxor'],
    ['قنا', 'Qena'], ['شمال سيناء', 'North Sinai'], ['سوهاج', 'Sohag'],
];

/** PortNova launch teaser - the first page everyone sees (except admins).
 *  This is a WAITLIST ONLY - no account, no password. It collects the data
 *  we need pre-launch, gives each member a referral code, and runs a
 *  MULTI-LEVEL referral ladder: 30 sign-ups unlock Level 2, chase 50 more
 *  (80) then the last milestone (100) - each level earns more free AI CV
 *  sessions. Only real registrations count, never mere link opens. */
const Waitlist = () => {
    const { isArabic } = useLanguage();
    const [params] = useSearchParams();
    const refParam = params.get('ref') || '';

    // The voucher is LOCKED: it comes ONLY from the shared link and can never
    // be chosen or edited, so there is no bias or monopoly over who uses a code.
    useEffect(() => {
        if (refParam && typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('portnova_ref', refParam);
        }
    }, [refParam]);

    const savedRef = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('portnova_ref') || '' : '';
    const lockedVoucher = refParam || savedRef;

    // Remember the email of anyone who already joined (no account exists, so
    // this is how we recognise a returning member and show their code again).
    const joinedEmail = typeof localStorage !== 'undefined' ? localStorage.getItem('portnova_joined_email') || '' : '';

    const [status, setStatus] = useState(null);
    const [joined, setJoined] = useState(null); // set after a successful join (shows the thank-you screen)
    const [checking, setChecking] = useState(false);

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        governorate: '',
        rolePref: 'jobs',
        currentStatus: '',
        educationLevel: '',
        howHeard: '',
        howHeardOther: '', // forced text when the user picks "Other"
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    // If this device already joined (or a signed-in user is on the list), load
    // their status so returning members see their code instead of the form.
    const loadedRef = useRef(false);
    useEffect(() => {
        if (loadedRef.current || joined || status) return;
        const checkEmail = joinedEmail;
        if (!checkEmail) return;
        loadedRef.current = true;
        let mounted = true;
        setChecking(true);
        getWaitlistStatus(checkEmail)
            .then((res) => { if (mounted) setStatus(res); })
            .catch(() => { if (mounted) setStatus({ on_list: false }); })
            .finally(() => { if (mounted) setChecking(false); });
        return () => { mounted = false; };
    }, [joinedEmail, joined, status]);

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await joinWaitlist({
                userId: null, // no account - this is just a waitlist
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                city: form.governorate,
                rolePref: form.rolePref,
                referralCode: lockedVoucher, // locked - from the link only
                currentStatus: form.currentStatus,
                educationLevel: form.educationLevel,
                // If the user picked "Other", store their written answer instead.
                howHeard: form.howHeard === 'Other' ? form.howHeardOther.trim() : form.howHeard,
            });
            if (!res?.ok) throw new Error(res?.error || 'Could not join');
            // Remember this email so a returning visitor sees their code again.
            if (typeof localStorage !== 'undefined') localStorage.setItem('portnova_joined_email', form.email.trim().toLowerCase());
            // Consumed the voucher - clear it so it doesn't leak to another person.
            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('portnova_ref');
            setJoined(res);
            setStatus(res);
        } catch (err) {
            setError(err.message || (isArabic ? 'تعذّر الانضمام. حاول مرة أخرى.' : 'Could not join. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const myCode = joined?.referral_code || status?.referral_code || '';
    const myCount = joined?.referral_count ?? status?.referral_count ?? 0;
    const ladder = progressForCount(myCount);

    const shareText = isArabic
        ? `انضم إلى قائمة انتظار PortNova معي - كل إحالة حقيقية تقربنا من المزيد من جلسات السيرة الذاتية المجانية بالذكاء الاصطناعي! 🚢 ${referralLink(myCode)}`
        : `Join me on the PortNova waitlist - every real sign-up unlocks more FREE AI CV sessions as the ladder climbs! 🚢 ${referralLink(myCode)}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(referralLink(myCode));
        } catch {
            // clipboard unavailable - ignore
        }
    };

    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    /* ------------------------- still loading status ------------------------- */
    if (checking) {
        return (
            <div className="page-shell page-shell--narrow waitlist-page">
                <header className="waitlist-brand">
                    <img className="brand__logo" src="/images/logo.png" alt="PortNova" />
                    <span className="brand__name">PortNova</span>
                    <LanguageToggle className="waitlist-lang" />
                </header>
                <GlassCard className="waitlist-card">
                    <div className="empty-state">{isArabic ? 'جارٍ التحقق…' : 'Checking…'}</div>
                </GlassCard>
            </div>
        );
    }

    /* ------------ just joined: culminating thank-you confirmation ----------- */
    if (joined) {
        return (
            <div className="page-shell page-shell--narrow waitlist-page">
                <header className="waitlist-brand">
                    <img className="brand__logo" src="/images/logo.png" alt="PortNova" />
                    <span className="brand__name">PortNova</span>
                    <LanguageToggle className="waitlist-lang" />
                </header>
                <GlassCard className="waitlist-card">
                    <div className="waitlist-celebrate">🎉</div>
                    <SectionHeading
                        kicker={isArabic ? 'تم بنجاح ✅' : 'Success ✅'}
                        title={isArabic ? 'شكرًا لك! تم تأكيد مكانك' : 'Thank you! Your place is confirmed'}
                        subtitle={isArabic
                            ? `لقد استلمنا بياناتك بنجاح وتم تسجيلك في قائمة الانتظار. سنخبرك أولًا عند الإطلاق. شارك رمزك - كل ${REFERRAL_LEVELS.map((l) => l.threshold).join(' / ')} تسجيلًا حقيقيًا يرفع مستواك ويمنحك المزيد من جلسات السيرة الذاتية المجانية بالذكاء الاصطناعي.`
                            : `We have successfully received your details and added you to the waitlist. We will reach out first at launch. Share your code - every ${REFERRAL_LEVELS.map((l) => l.threshold).join(' / ')} real sign-ups climbs your level and earns more free AI CV sessions.`}
                    />
                    <div className="waitlist-code">
                        <span className="waitlist-code__label">{isArabic ? 'رمزك الخاص' : 'Your referral code'}</span>
                        <strong className="waitlist-code__value">{joined.referral_code}</strong>
                    </div>
                    <div className="waitlist-levels" aria-label={isArabic ? 'مستويات الإحالة' : 'Referral levels'}>
                        {REFERRAL_LEVELS.map((l) => (
                            <div key={l.level} className={`waitlist-level ${l.threshold === 30 ? 'waitlist-level--on' : ''}`}>
                                <span className="waitlist-level__badge">{isArabic ? `مستوى ${l.level}` : `Level ${l.level}`}</span>
                                <span className="waitlist-level__goal">{l.threshold} {isArabic ? 'تسجيل' : 'sign-ups'}</span>
                                <span className="waitlist-level__reward">🎓 {l.sessions} {isArabic ? 'جلسة سيرة ذاتية مجانية' : 'free AI CV session'}{l.sessions > 1 ? 's' : ''}</span>
                            </div>
                        ))}
                    </div>
                    <div className="waitlist-reward waitlist-reward--on">🎉 {isArabic ? 'شكرًا لانضمامك إلينا! بياناتك بأمان وسنكون معك عند الإطلاق.' : 'Thanks for joining us! Your details are safe and we will be with you at launch.'}</div>
                    <div className="waitlist-share">
                        <div className="field waitlist-share__link">{referralLink(joined.referral_code)}</div>
                        <div className="inline-actions">
                            <PremiumButton variant="primary" onClick={copyLink}>{isArabic ? 'نسخ الرابط' : 'Copy link'}</PremiumButton>
                            <a className="premium-button premium-button--success" href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp</a>
                        </div>
                    </div>
                </GlassCard>
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
                        subtitle={isArabic
                            ? `شارك رابطك الخاص - كل تسجيل حقيقي يرفع مستواك نحو ${REFERRAL_LEVELS.map((l) => l.threshold).join(' / ')} ويمنحك المزيد من جلسات السيرة الذاتية المجانية بالذكاء الاصطناعي.`
                            : `Share your link - every real sign-up climbs you toward ${REFERRAL_LEVELS.map((l) => l.threshold).join(' / ')} and earns more free AI CV sessions.`}
                    />
                    <div className="waitlist-code">
                        <span className="waitlist-code__label">{isArabic ? 'رمزك الخاص' : 'Your referral code'}</span>
                        <strong className="waitlist-code__value">{status.referral_code}</strong>
                    </div>
                    <div className="waitlist-progress">
                        <div className="waitlist-progress__row">
                            <span>{isArabic ? 'أصدقاؤك' : 'Friends joined'}</span>
                            <strong>{status.referral_count} / {ladder.threshold}</strong>
                        </div>
                        <div className="progress">
                            <div className="progress__bar" style={{ width: `${Math.min(100, ladder.progress)}%` }} />
                        </div>
                    </div>
                    <div className="waitlist-levels" aria-label={isArabic ? 'مستويات الإحالة' : 'Referral levels'}>
                        {REFERRAL_LEVELS.map((l) => {
                            const reached = status.referral_count >= l.threshold;
                            const active = ladder.next && l.threshold === ladder.next.threshold;
                            return (
                                <div key={l.level} className={`waitlist-level ${reached ? 'waitlist-level--on' : ''} ${active ? 'waitlist-level--active' : ''}`}>
                                    <span className="waitlist-level__badge">{isArabic ? `مستوى ${l.level}` : `Level ${l.level}`}</span>
                                    <span className="waitlist-level__goal">{l.threshold} {isArabic ? 'تسجيل' : 'sign-ups'}</span>
                                    <span className="waitlist-level__reward">🎓 {l.sessions} {isArabic ? 'جلسة مجانية' : 'free CV session'}{l.sessions > 1 ? 's' : ''}</span>
                                </div>
                            );
                        })}
                    </div>
                    {sessionsForCount(status.referral_count) > 0 ? (
                        <div className="waitlist-reward waitlist-reward--on">🎉 {isArabic
                            ? `مبروك! لديك الآن ${sessionsForCount(status.referral_count)} جلسات سيرة ذاتية مجانية بالذكاء الاصطناعي عند الإطلاق.`
                            : `Congratulations! You now have ${sessionsForCount(status.referral_count)} free AI CV session${sessionsForCount(status.referral_count) > 1 ? 's' : ''} unlocked for launch.`}
                        </div>
                    ) : (
                        <div className="waitlist-reward">{isArabic
                            ? `أحِل ${ladder.threshold} أصدقاء لتفعيل أول جلسة سيرة ذاتية مجانية بالذكاء الاصطناعي.`
                            : `Refer ${ladder.threshold} friends to unlock your first free AI CV session.`}
                        </div>
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
                    subtitle={isArabic
                        ? `بياناتك تبقى محفوظة وآمنة - سنخبرك أولًا عند الإطلاق. شارك رمزك وارتقِ بمستواك: ${REFERRAL_LEVELS.map((l) => `${l.threshold} تسجيل`).join(' / ')} يمنحك المزيد من جلسات السيرة الذاتية المجانية بالذكاء الاصطناعي.`
                        : `Your details stay safe - we'll tell you first at launch. Share your code and climb: ${REFERRAL_LEVELS.map((l) => `${l.threshold} sign-ups`).join(' / ')} earns more free AI CV sessions.`}
                />
                <form onSubmit={submit} className="waitlist-form">
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'الاسم الكامل' : 'Full name'}</label>
                        <input className="field" value={form.fullName} onChange={set('fullName')} required placeholder={isArabic ? 'مثال: أحمد إبراهيم' : 'e.g. Ahmed Ibrahim'} />
                    </div>
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
                        <input className="field" type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
                    </div>
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'رقم الهاتف' : 'Phone'}</label>
                        <input className="field" value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="01xxxxxxxxx" />
                    </div>
                    <div className="field-group">
                        <label className="field-label">{isArabic ? 'المحافظة' : 'Governorate'}</label>
                        <select className="select" value={form.governorate} onChange={set('governorate')} required>
                            <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                            {GOVERNORATES.map(([ar, en]) => (
                                <option key={en} value={en}>{isArabic ? ar : en}</option>
                            ))}
                        </select>
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
                    {form.howHeard === 'Other' ? (
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'اكتب إجابتك' : 'Write your answer'} *</label>
                            <input className="field" value={form.howHeardOther} onChange={set('howHeardOther')} required placeholder={isArabic ? 'مثال: قناة يوتيوب' : 'e.g. a YouTube channel'} />
                        </div>
                    ) : null}
                    {lockedVoucher ? (
                        <div className="field-group">
                            <label className="field-label">{isArabic ? 'رمز الدعوة (مقفول)' : 'Invite code (locked)'}</label>
                            <input className="field" value={lockedVoucher} readOnly aria-readonly="true" placeholder="XXXXXXX" />
                        </div>
                    ) : null}
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
