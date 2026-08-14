import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';
import '../styles/signup-flow.css';

/* ------------------------- shared option lists ------------------------- */
const L = (ar, en) => ({ ar, en });
const OPTS = {
    gender: [L('ذكر', 'Male'), L('أنثى', 'Female'), L('أخرى', 'Other'), L('أفضل عدم الإفصاح', 'Prefer not to say')],
    nationality: [L('مصري', 'Egyptian'), L('سعودي', 'Saudi'), L('كويتي', 'Kuwaiti'), L('إماراتي', 'Emirati'), L('أردني', 'Jordanian'), L('سوري', 'Syrian'), L('فلسطيني', 'Palestinian'), L('سوداني', 'Sudanese'), L('يمني', 'Yemeni'), L('ليبي', 'Libyan'), L('تونسي', 'Tunisian'), L('جزائري', 'Algerian'), L('مغربي', 'Moroccan'), L('عراقي', 'Iraqi'), L('لبناني', 'Lebanese'), L('أخرى', 'Other')],
    city: [L('بورسعيد', 'Port Said'), L('القاهرة', 'Cairo'), L('الإسكندرية', 'Alexandria'), L('الجيزة', 'Giza'), L('الإسماعيلية', 'Ismailia'), L('السويس', 'Suez'), L('دمياط', 'Damietta'), L('المنصورة', 'Mansoura'), L('طنطا', 'Tanta'), L('الزقازيق', 'Zagazig'), L('أخرى', 'Other')],
    governorate: [L('بورسعيد', 'Port Said'), L('القاهرة', 'Cairo'), L('الجيزة', 'Giza'), L('الإسكندرية', 'Alexandria'), L('الدقهلية', 'Dakahlia'), L('الشرقية', 'Sharqia'), L('الغربية', 'Gharbia'), L('المنوفية', 'Monufia'), L('البحيرة', 'Beheira'), L('كفر الشيخ', 'Kafr El Sheikh'), L('دمياط', 'Damietta'), L('الإسماعيلية', 'Ismailia'), L('السويس', 'Suez'), L('بني سويف', 'Beni Suef'), L('الفيوم', 'Faiyum'), L('المنيا', 'Minya'), L('أسيوط', 'Assiut'), L('سوهاج', 'Sohag'), L('قنا', 'Qena'), L('الأقصر', 'Luxor'), L('أسوان', 'Aswan'), L('البحر الأحمر', 'Red Sea'), L('مطروح', 'Matruh'), L('شمال سيناء', 'North Sinai'), L('جنوب سيناء', 'South Sinai'), L('الوادي الجديد', 'New Valley')],
    education: [L('ثانوية عامة', 'High School'), L('دبلوم', 'Diploma'), L('بكالوريوس', 'Bachelor'), L('ماجستير', 'Master'), L('دكتوراه', 'PhD')],
    fieldOfStudy: [L('علوم حاسب / تكنولوجيا', 'Computer Science / IT'), L('هندسة', 'Engineering'), L('إدارة أعمال', 'Business Administration'), L('محاسبة ومالية', 'Accounting & Finance'), L('تسويق', 'Marketing'), L('تصميم', 'Design'), L('تمريض / طب', 'Nursing / Medicine'), L('تربية / تعليم', 'Education'), L('قانون', 'Law'), L('بحري / لوجستيات', 'Marine / Logistics'), L('أخرى', 'Other')],
    employment: [L('طالب', 'Student'), L('موظف', 'Employed'), L('باحث عن عمل', 'Unemployed'), L('عمل حر', 'Self-Employed'), L('أخرى', 'Other')],
    years: [L('أقل من سنة', '0-1 years'), L('1-3 سنوات', '1-3 years'), L('3-5 سنوات', '3-5 years'), L('5-10 سنوات', '5-10 years'), L('أكثر من 10 سنوات', '10+ years')],
    industry: [L('تكنولوجيا', 'Technology'), L('رعاية صحية', 'Healthcare'), L('تعليم', 'Education'), L('مالية', 'Finance'), L('بحري / شحن', 'Marine / Shipping'), L('صناعة', 'Manufacturing'), L('تجارة', 'Retail'), L('إنشاءات', 'Construction'), L('زراعة', 'Agriculture'), L('سياحة', 'Tourism'), L('حكومي', 'Government'), L('أخرى', 'Other')],
    workLoc: [L('في الموقع', 'On-site'), L('هجين', 'Hybrid'), L('عن بُعد', 'Remote')],
    salary: [L('أقل من 5,000 ج.م', '< 5,000 EGP'), L('5,000 - 10,000 ج.م', '5,000 - 10,000 EGP'), L('10,000 - 20,000 ج.م', '10,000 - 20,000 EGP'), L('20,000 - 30,000 ج.م', '20,000 - 30,000 EGP'), L('30,000 - 50,000 ج.م', '30,000 - 50,000 EGP'), L('أكثر من 50,000 ج.م', '50,000+ EGP')],
    heard: [L('وسائل التواصل', 'Social Media'), L('صديق', 'A friend'), L('فعالية', 'An event'), L('المدرسة / الجامعة', 'School / University'), L('إعلان', 'Advertisement'), L('أخرى', 'Other')],
};
const OPT_VAL = (list, label) => (list.find((o) => o.en === label) || { en: label }).en;

const STEPS = [
    { key: 'personal', title: L('المعلومات الشخصية', 'Personal information') },
    { key: 'education', title: L('التعليم والمهارات', 'Education & skills') },
    { key: 'career', title: L('التفضيلات المهنية', 'Career preferences') },
    { key: 'review', title: L('المراجعة والإنشاء', 'Review & create') },
];

const Register = () => {
    const { register } = useAuth();
    const { isArabic } = useLanguage();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    // Carry an incoming referral code (?ref=CODE) all the way through
    // registration so the inviter gets credited when the new member later
    // joins the waitlist. The join form reads the same storage key.
    const refParam = params.get('ref') || '';
    if (refParam && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('portnova_ref', refParam);
    }

    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', password: '', dob: '',
        gender: '', nationality: 'Egyptian', city: 'Port Said', governorate: 'Port Said',
        educationLevel: '', fieldOfStudy: '', skills: '', employmentStatus: '', currentJobTitle: '', yearsExperience: '', certifications: '',
        desiredRole: '', desiredIndustry: '', preferredLocation: '', salaryRange: '', willingToRelocate: '', linkedin: '', howHeard: '', referralCode: refParam || '',
    });
    const [consents, setConsents] = useState({ privacy: false, analytics: false, marketing: false });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [triedNext, setTriedNext] = useState(false);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
    const setSel = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    /* ------------------------- validation ------------------------- */
    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const isEgyptPhone = (v) => /^01[0125][0-9]{8}$/.test(String(v || '').replace(/[^0-9]/g, ''));
    const age16 = (dob) => {
        const d = new Date(dob);
        if (Number.isNaN(d.getTime())) return false;
        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
        return age >= 16;
    };

    const stepValid = (() => {
        if (step === 0) {
            return form.fullName.trim().length >= 2 && isEmail(form.email) && isEgyptPhone(form.phone) && form.password.length >= 6 && age16(form.dob) && form.gender && form.governorate;
        }
        if (step === 1) {
            if (!form.educationLevel || !form.fieldOfStudy || !form.skills.trim() || !form.employmentStatus) return false;
            if (form.employmentStatus === 'Employed' && (!form.currentJobTitle.trim() || !form.yearsExperience)) return false;
            return true;
        }
        if (step === 2) {
            return form.desiredRole.trim() && form.desiredIndustry && form.preferredLocation && form.salaryRange && form.willingToRelocate && form.howHeard;
        }
        if (step === 3) {
            return consents.privacy && consents.analytics;
        }
        return true;
    })();

    // Bilingual list of the fields the current step is still missing, so the
    // Next button can tell the user exactly what to fix instead of doing
    // nothing (previously it was disabled with zero feedback - felt broken).
    const missingFields = (() => {
        const m = [];
        if (step === 0) {
            if (form.fullName.trim().length < 2) m.push(isArabic ? 'الاسم الكامل' : 'Full name');
            if (!isEmail(form.email)) m.push(isArabic ? 'البريد الإلكتروني' : 'Email');
            if (!isEgyptPhone(form.phone)) m.push(isArabic ? 'رقم الهاتف (01xxxxxxxxx)' : 'Phone (01xxxxxxxxx)');
            if (form.password.length < 6) m.push(isArabic ? 'كلمة المرور (6 أحرف على الأقل)' : 'Password (min 6 characters)');
            if (!age16(form.dob)) m.push(isArabic ? 'تاريخ الميلاد (16 سنة فأكثر)' : 'Date of birth (16 or older)');
            if (!form.gender) m.push(isArabic ? 'الجنس' : 'Gender');
        }
        if (step === 1) {
            if (!form.educationLevel) m.push(isArabic ? 'المستوى التعليمي' : 'Education');
            if (!form.fieldOfStudy) m.push(isArabic ? 'مجال الدراسة' : 'Field of study');
            if (!form.skills.trim()) m.push(isArabic ? 'المهارات' : 'Skills');
            if (!form.employmentStatus) m.push(isArabic ? 'الحالة الوظيفية' : 'Employment status');
            if (form.employmentStatus === 'Employed' && (!form.currentJobTitle.trim() || !form.yearsExperience)) m.push(isArabic ? 'المسمى الوظيفي وسنوات الخبرة' : 'Job title & years of experience');
        }
        if (step === 2) {
            if (!form.desiredRole.trim()) m.push(isArabic ? 'الوظيفة المطلوبة' : 'Desired role');
            if (!form.desiredIndustry) m.push(isArabic ? 'القطاع' : 'Industry');
            if (!form.preferredLocation) m.push(isArabic ? 'موقع العمل' : 'Work location');
            if (!form.salaryRange) m.push(isArabic ? 'الراتب' : 'Salary');
            if (!form.willingToRelocate) m.push(isArabic ? 'الاستعداد للانتقال' : 'Relocation');
            if (!form.howHeard) m.push(isArabic ? 'كيف عرفت عنا' : 'How you heard');
        }
        if (step === 3) {
            if (!consents.privacy) m.push(isArabic ? 'الموافقة على الخصوصية' : 'Privacy consent');
            if (!consents.analytics) m.push(isArabic ? 'الموافقة على التحليلات' : 'Analytics consent');
        }
        return m;
    })();

    const next = () => {
        if (stepValid && step < STEPS.length - 1) {
            setTriedNext(false);
            setStep((s) => s + 1);
        } else if (!stepValid) {
            setTriedNext(true); // tell the user what's missing instead of staying silent
        }
    };
    const back = () => { if (step > 0) setStep((s) => s - 1); };

    const handleSubmit = async () => {
        if (!stepValid) {
            setTriedNext(true); // never silently swallow a click - show what's missing
            return;
        }
        setLoading(true);
        setError('');
        const profile = {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            dob: form.dob,
            gender: OPT_VAL(OPTS.gender, form.gender),
            nationality: OPT_VAL(OPTS.nationality, form.nationality),
            city: OPT_VAL(OPTS.city, form.city),
            governorate: OPT_VAL(OPTS.governorate, form.governorate),
            educationLevel: OPT_VAL(OPTS.education, form.educationLevel),
            fieldOfStudy: form.fieldOfStudy,
            employmentStatus: OPT_VAL(OPTS.employment, form.employmentStatus),
            currentJobTitle: form.currentJobTitle.trim(),
            yearsExperience: OPT_VAL(OPTS.years, form.yearsExperience),
            skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
            certifications: form.certifications.trim(),
            desiredRole: form.desiredRole.trim(),
            desiredIndustry: OPT_VAL(OPTS.industry, form.desiredIndustry),
            preferredLocation: OPT_VAL(OPTS.workLoc, form.preferredLocation),
            expectedSalaryRange: OPT_VAL(OPTS.salary, form.salaryRange),
            willingToRelocate: form.willingToRelocate === 'Yes',
            linkedinUrl: form.linkedin.trim(),
            howHeard: OPT_VAL(OPTS.heard, form.howHeard),
            referralCode: form.referralCode.trim(),
            marketingConsent: consents.marketing,
            profileComplete: true,
        };

        const { data, error: authError } = await register({
            email: form.email,
            password: form.password,
            fullName: form.fullName.trim(),
            role: 'seeker',
            profile,
        });

        if (authError) {
            setError(authError.message || (isArabic ? 'تعذّر إنشاء الحساب.' : 'Registration failed'));
            setLoading(false);
            return;
        }

        if (data?.session) {
            navigate('/dashboard');
            return;
        }

        if (data?.user && data.user.identities && data.user.identities.length === 0) {
            setError(isArabic ? 'هذا البريد مسجّل بالفعل. استخدمه لتسجيل الدخول مباشرة.' : 'This email is already registered. Use it to sign in instead.');
            setLoading(false);
            return;
        }

        navigate('/login', {
            state: {
                message: isArabic
                    ? 'تم إنشاء الحساب. راجع بريدك الإلكتروني، اضغط رابط التأكيد، ثم سجّل الدخول.'
                    : 'Account created. Check your email, click the confirmation link, then sign in.',
            },
        });
    };

    const renderOptions = (list) =>
        list.map((o) => (
            <option key={o.en} value={o.en}>{isArabic ? o.ar : o.en}</option>
        ));

    const step0 = (
        <div className="signup-step">
            <label className="field-label">{isArabic ? 'الاسم الكامل' : 'Full name'} *
                <input className="field" value={form.fullName} onChange={set('fullName')} placeholder={isArabic ? 'مثال: أحمد إبراهيم' : 'e.g. Ahmed Ibrahim'} />
            </label>
            <div className="field-row">
                <label className="field-label">{isArabic ? 'البريد الإلكتروني' : 'Email'} *
                    <input className="field" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                </label>
                <label className="field-label">{isArabic ? 'رقم الهاتف' : 'Phone'} *
                    <input className="field" value={form.phone} onChange={set('phone')} placeholder="01xxxxxxxxx" inputMode="tel" />
                </label>
            </div>
            <label className="field-label">{isArabic ? 'كلمة المرور' : 'Password'} *
                <input className="field" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
            </label>
            <div className="field-row">
                <label className="field-label">{isArabic ? 'تاريخ الميلاد' : 'Date of birth'} *
                    <input className="field" type="date" value={form.dob} onChange={set('dob')} />
                </label>
                <label className="field-label">{isArabic ? 'الجنس' : 'Gender'} *
                    <select className="field" value={form.gender} onChange={setSel('gender')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.gender)}
                    </select>
                </label>
            </div>
            <div className="field-row">
                <label className="field-label">{isArabic ? 'الجنسية' : 'Nationality'} *
                    <select className="field" value={form.nationality} onChange={setSel('nationality')}>
                        {renderOptions(OPTS.nationality)}
                    </select>
                </label>
                <label className="field-label">{isArabic ? 'المدينة الحالية' : 'Current city'} *
                    <select className="field" value={form.city} onChange={setSel('city')}>
                        {renderOptions(OPTS.city)}
                    </select>
                </label>
            </div>
            <label className="field-label">{isArabic ? 'المحافظة' : 'Governorate'} *
                <select className="field" value={form.governorate} onChange={setSel('governorate')}>
                    {renderOptions(OPTS.governorate)}
                </select>
            </label>
        </div>
    );

    const step1 = (
        <div className="signup-step">
            <div className="field-row">
                <label className="field-label">{isArabic ? 'أعلى مستوى تعليمي' : 'Highest education'} *
                    <select className="field" value={form.educationLevel} onChange={setSel('educationLevel')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.education)}
                    </select>
                </label>
                <label className="field-label">{isArabic ? 'مجال الدراسة' : 'Field of study'} *
                    <select className="field" value={form.fieldOfStudy} onChange={setSel('fieldOfStudy')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.fieldOfStudy)}
                    </select>
                </label>
            </div>
            <label className="field-label">{isArabic ? 'المهارات الأساسية (مفصولة بفواصل)' : 'Primary skills (comma-separated)'} *
                <input className="field" value={form.skills} onChange={set('skills')} placeholder={isArabic ? 'مثال: إكسل، تسويق رقمي، Python' : 'e.g. Excel, Digital Marketing, Python'} />
            </label>
            <div className="field-row">
                <label className="field-label">{isArabic ? 'الحالة الوظيفية' : 'Employment status'} *
                    <select className="field" value={form.employmentStatus} onChange={setSel('employmentStatus')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.employment)}
                    </select>
                </label>
                {form.employmentStatus === 'Employed' ? (
                    <label className="field-label">{isArabic ? 'المسمى الوظيفي الحالي' : 'Current job title'} *
                        <input className="field" value={form.currentJobTitle} onChange={set('currentJobTitle')} placeholder={isArabic ? 'مثال: أخصائي تسويق' : 'e.g. Marketing Specialist'} />
                    </label>
                ) : null}
            </div>
            {form.employmentStatus === 'Employed' ? (
                <label className="field-label">{isArabic ? 'سنوات الخبرة' : 'Years of experience'} *
                    <select className="field" value={form.yearsExperience} onChange={setSel('yearsExperience')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.years)}
                    </select>
                </label>
            ) : null}
            <label className="field-label">{isArabic ? 'الشهادات (اختياري)' : 'Certifications (optional)'}
                <input className="field" value={form.certifications} onChange={set('certifications')} placeholder={isArabic ? 'مثال: شهادة جوجل للتسويق الرقمي' : 'e.g. Google Digital Marketing'} />
            </label>
        </div>
    );

    const step2 = (
        <div className="signup-step">
            <div className="field-row">
                <label className="field-label">{isArabic ? 'الوظيفة المطلوبة' : 'Desired job role'} *
                    <input className="field" value={form.desiredRole} onChange={set('desiredRole')} placeholder={isArabic ? 'مثال: مطور واجهات أمامية' : 'e.g. Frontend Developer'} />
                </label>
                <label className="field-label">{isArabic ? 'القطاع المطلوب' : 'Desired industry'} *
                    <select className="field" value={form.desiredIndustry} onChange={setSel('desiredIndustry')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.industry)}
                    </select>
                </label>
            </div>
            <div className="field-row">
                <label className="field-label">{isArabic ? 'موقع العمل المفضل' : 'Preferred work location'} *
                    <select className="field" value={form.preferredLocation} onChange={setSel('preferredLocation')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.workLoc)}
                    </select>
                </label>
                <label className="field-label">{isArabic ? 'الراتب المتوقع' : 'Expected salary (EGP)'} *
                    <select className="field" value={form.salaryRange} onChange={setSel('salaryRange')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.salary)}
                    </select>
                </label>
            </div>
            <div className="field-row">
                <label className="field-label">{isArabic ? 'الاستعداد للانتقال؟' : 'Willing to relocate?'} *
                    <select className="field" value={form.willingToRelocate} onChange={setSel('willingToRelocate')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        <option value="Yes">{isArabic ? 'نعم' : 'Yes'}</option>
                        <option value="No">{isArabic ? 'لا' : 'No'}</option>
                    </select>
                </label>
                <label className="field-label">{isArabic ? 'كيف عرفت عنا؟' : 'How did you hear about us?'} *
                    <select className="field" value={form.howHeard} onChange={setSel('howHeard')}>
                        <option value="">{isArabic ? 'اختر…' : 'Select…'}</option>
                        {renderOptions(OPTS.heard)}
                    </select>
                </label>
            </div>
            <label className="field-label">{isArabic ? 'رابط لينكدإن (اختياري)' : 'LinkedIn URL (optional)'}
                <input className="field" value={form.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/..." />
            </label>
            <label className="field-label">{isArabic ? 'رمز الإحالة (اختياري)' : 'Referral code (optional)'}
                <input className="field" value={form.referralCode} onChange={set('referralCode')} placeholder={isArabic ? 'PORTNOVA-10' : 'PORTNOVA-10'} />
            </label>
        </div>
    );

    const step3 = (
        <div className="signup-step">
            <div className="signup-review">
                <div className="signup-review__row"><span>{isArabic ? 'الاسم' : 'Name'}</span><strong>{form.fullName}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'البريد' : 'Email'}</span><strong>{form.email}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'الهاتف' : 'Phone'}</span><strong>{form.phone}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'المدينة' : 'City'}</span><strong>{isArabic ? OPTS.city.find((o) => o.en === form.city)?.ar || form.city : form.city}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'المحافظة' : 'Governorate'}</span><strong>{isArabic ? OPTS.governorate.find((o) => o.en === form.governorate)?.ar || form.governorate : form.governorate}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'التعليم' : 'Education'}</span><strong>{isArabic ? OPTS.education.find((o) => o.en === form.educationLevel)?.ar || form.educationLevel : form.educationLevel}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'المهارات' : 'Skills'}</span><strong>{form.skills}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'الوظيفة المطلوبة' : 'Desired role'}</span><strong>{form.desiredRole}</strong></div>
                <div className="signup-review__row"><span>{isArabic ? 'القطاع' : 'Industry'}</span><strong>{isArabic ? OPTS.industry.find((o) => o.en === form.desiredIndustry)?.ar || form.desiredIndustry : form.desiredIndustry}</strong></div>
            </div>

            <div className="signup-consent">
                <label className="signup-consent__item"><input type="checkbox" checked={consents.privacy} onChange={(e) => setConsents((p) => ({ ...p, privacy: e.target.checked }))} />
                    <span>{isArabic ? 'أوافق على سياسة الخصوصية وشروط الخدمة.' : 'I agree to the Privacy Policy and Terms of Service.'}</span>
                </label>
                <label className="signup-consent__item"><input type="checkbox" checked={consents.analytics} onChange={(e) => setConsents((p) => ({ ...p, analytics: e.target.checked }))} />
                    <span>{isArabic ? 'أوافق على استخدام بياناتي لأغراض التحليلات ومطابقة الوظائف.' : 'I consent to my data being used for analytics and career matching.'}</span>
                </label>
                <label className="signup-consent__item"><input type="checkbox" checked={consents.marketing} onChange={(e) => setConsents((p) => ({ ...p, marketing: e.target.checked }))} />
                    <span>{isArabic ? 'أوافق على استلام توصيات وظائف ودورات مخصصة (اختياري).' : 'I agree to receive personalized job and course recommendations (optional).'}</span>
                </label>
            </div>
        </div>
    );

    const stepContent = [step0, step1, step2, step3][step];

    return (
        <div className="page-shell form-shell">
            <aside className="auth-aside">
                <div className="auth-aside__logo">
                    <div className="brand__logo-wrap" style={{ width: '4rem', height: '4rem' }}>
                        <img className="brand__logo" src="/images/logo.png" alt="PortNova" />
                    </div>
                    <div>
                        <div className="brand__name">PortNova</div>
                        <div className="brand__tag">{isArabic ? 'انضم إلى شباب بورسعيد' : 'Join Port Said youth'}</div>
                    </div>
                </div>
                <h1 className="hero__title" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
                    {isArabic ? 'انضم إلى المنصة.' : 'Join the platform.'}
                </h1>
                <BilingualLine
                    as="p"
                    className="hero__lead"
                    ar="أنشئ حسابك للوصول إلى الوظائف والدورات وخدمة السيرة الذاتية."
                    en="Create your account to access jobs, courses, and CV service."
                />
                <div className="auth-aside__stack">
                    <div className="auth-aside__stack-item">{isArabic ? 'وظائف لشباب بورسعيد.' : 'Jobs for Port Said youth.'}</div>
                    <div className="auth-aside__stack-item">{isArabic ? 'دورات عملية لتطوير مهاراتك.' : 'Practical courses to build your skills.'}</div>
                    <div className="auth-aside__stack-item">{isArabic ? 'سيرة ذاتية حتى التسليم النهائي.' : 'CV service through final delivery.'}</div>
                </div>
            </aside>

            <GlassCard className="auth-card">
                <Badge tone="gold">{isArabic ? 'إنشاء حساب' : 'Create account'}</Badge>
                <SectionHeading
                    title={STEPS[step].title[isArabic ? 'ar' : 'en']}
                    subtitle={
                        isArabic
                            ? 'املأ بياناتك خطوة بخطوة - نحتاجها لتخصيص تجربتك ومساعدتك في العثور على فرصك.'
                            : 'Fill in your details step by step - we use them to personalise your experience and match you with opportunities.'
                    }
                />
                {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}

                <>
                    <div className="signup-progress" aria-hidden="true">
                            {STEPS.map((s, i) => (
                                <span key={s.key} className={`signup-progress__dot ${i <= step ? 'signup-progress__dot--on' : ''}`} />
                            ))}
                        </div>

                        <div key={step} className="signup-flow">
                            {stepContent}
                        </div>

                        {triedNext && !stepValid ? (
                            <p className="signup-inline-error">
                                {isArabic ? 'أكمل الحقول المطلوبة:' : 'Please complete the required fields:'} {missingFields.join('، ')}
                            </p>
                        ) : null}

                        <div className="signup-actions">
                            {step > 0 ? (
                                <PremiumButton variant="ghost" onClick={back}>{isArabic ? 'رجوع' : 'Back'}</PremiumButton>
                            ) : null}
                            {step < STEPS.length - 1 ? (
                                <PremiumButton variant="gold" onClick={next}>{isArabic ? 'التالي' : 'Next'}</PremiumButton>
                            ) : (
                                <PremiumButton variant="gold" disabled={loading} onClick={handleSubmit}>
                                    {loading ? (isArabic ? 'جارٍ إنشاء الحساب...' : 'Creating account...') : isArabic ? 'إنشاء الحساب ✓' : 'Create account ✓'}
                                </PremiumButton>
                            )}
                        </div>
                    </>

                <p className="muted" style={{ marginTop: '1rem' }}>
                    {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'} <Link to="/login">{isArabic ? 'تسجيل الدخول' : 'Login'}</Link>
                </p>
            </GlassCard>
        </div>
    );
};

export default Register;