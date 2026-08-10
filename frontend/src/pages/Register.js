import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const Register = () => {
    const { register } = useAuth();
    const { isArabic } = useLanguage();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('seeker');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        // A provider IS a company: the name field holds the company name, which
        // becomes the provider's identity and auto-fills their published posts.
        const name = role === 'provider' ? companyName : fullName;

        const { data, error: authError } = await register({
            email,
            password,
            fullName: name,
            role,
            companyName: role === 'provider' ? name : undefined,
        });

        if (authError) {
            setError(authError.message || 'Registration failed');
            setLoading(false);
            return;
        }

        // If Supabase returns a session, the account is live — go straight in.
        if (data?.session) {
            navigate('/dashboard');
            return;
        }

        // Supabase hides "already registered" by returning an empty identities
        // array for an existing email — surface it instead of a silent reset.
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
            setError(
                isArabic
                    ? 'هذا البريد مسجّل بالفعل. استخدمه لتسجيل الدخول مباشرة.'
                    : 'This email is already registered. Use it to sign in instead.'
            );
            setLoading(false);
            return;
        }

        // Otherwise email confirmation is required before the first login.
        navigate('/login', {
            state: {
                message: isArabic
                    ? 'تم إنشاء الحساب. راجع بريدك الإلكتروني، اضغط رابط التأكيد، ثم سجّل الدخول.'
                    : 'Account created. Check your email, click the confirmation link, then sign in.',
            },
        });
    };

    return (
        <div className="page-shell form-shell">
            <aside className="auth-aside">
                <div className="auth-aside__logo">
                    <div className="brand__logo-wrap" style={{ width: '4rem', height: '4rem' }}>
                        <img className="brand__logo" src="/images/logo.png" alt="PortNova logo" />
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
                    title={isArabic ? 'تسجيل جديد' : 'Register'}
                    subtitle={
                        isArabic
                            ? role === 'provider'
                                ? 'استخدم اسم شركتك والبريد وكلمة المرور للبدء.'
                                : 'استخدم الاسم الكامل والبريد وكلمة المرور والدور للبدء.'
                            : role === 'provider'
                                ? 'Use your company name, email, and password to get started.'
                                : 'Use your full name, email, password, and role to get started.'
                    }
                />
                {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}
                <form onSubmit={handleSubmit}>
                    <div className="field-group">
                        <input
                            className="field"
                            type="text"
                            placeholder={
                                role === 'provider'
                                    ? isArabic ? 'اسم الشركة' : 'Company name'
                                    : isArabic ? 'الاسم الكامل' : 'Full name'
                            }
                            value={role === 'provider' ? companyName : fullName}
                            onChange={(event) => (role === 'provider' ? setCompanyName(event.target.value) : setFullName(event.target.value))}
                            required
                        />
                        <input className="field" type="email" placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'} value={email} onChange={(event) => setEmail(event.target.value)} required />
                        <input className="field" type="password" placeholder={isArabic ? 'كلمة المرور' : 'Password'} value={password} onChange={(event) => setPassword(event.target.value)} required />
                        <div className="field-group" style={{ gap: '0.5rem' }}>
                            <span className="filter-label" style={{ textTransform: 'none', letterSpacing: '0.02em' }}>
                                {isArabic ? 'نوع الحساب' : 'Account type'}
                            </span>
                            <div className="role-picker">
                                <label className={`role-option ${role === 'seeker' ? 'role-option--active' : ''}`}>
                                    <input type="radio" name="role" value="seeker" checked={role === 'seeker'} onChange={(event) => setRole(event.target.value)} />
                                    <span className="role-option__mark">🎓</span>
                                    <span className="role-option__text">
                                        <strong>{isArabic ? 'باحث' : 'Seeker'}</strong>
                                        <small>{isArabic ? 'أبحث عن وظائف ودورات وسيرة ذاتية.' : 'I look for jobs, courses, and CV support.'}</small>
                                    </span>
                                </label>
                                <label className={`role-option ${role === 'provider' ? 'role-option--active' : ''}`}>
                                    <input type="radio" name="role" value="provider" checked={role === 'provider'} onChange={(event) => setRole(event.target.value)} />
                                    <span className="role-option__mark">🏢</span>
                                    <span className="role-option__text">
                                        <strong>{isArabic ? 'مقدّم' : 'Provider'}</strong>
                                        <small>{isArabic ? 'أنشر الوظائف والدورات.' : 'I post jobs and courses.'}</small>
                                    </span>
                                </label>
                            </div>
                            <p className="muted" style={{ fontSize: '0.78rem' }}>
                                {isArabic
                                    ? 'نوع الحساب ثابت ولا يمكن تغييره لاحقًا.'
                                    : 'Your account type is fixed and cannot be changed later.'}
                            </p>
                        </div>
                        <PremiumButton type="submit" variant="primary" disabled={loading}>
                            {loading ? (isArabic ? 'جارٍ إنشاء الحساب...' : 'Creating account...') : isArabic ? 'إنشاء الحساب' : 'Create account'}
                        </PremiumButton>
                    </div>
                </form>
                <p className="muted" style={{ marginTop: '1rem' }}>
                    {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'} <Link to="/login">{isArabic ? 'تسجيل الدخول' : 'Login'}</Link>
                </p>
            </GlassCard>
        </div>
    );
};

export default Register;