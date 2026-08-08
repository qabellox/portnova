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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('youth');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const { error: authError } = await register({
            email,
            password,
            fullName,
            role,
        });

        if (authError) {
            setError(authError.message || 'Registration failed');
            setLoading(false);
            return;
        }

        navigate('/login', {
            state: {
                message: isArabic
                    ? 'تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيده ثم سجّل الدخول.'
                    : 'Registration completed. Check your email to verify your account, then sign in.',
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
                <SectionHeading title={isArabic ? 'تسجيل جديد' : 'Register'} subtitle={isArabic ? 'استخدم الاسم الكامل والبريد وكلمة المرور والدور للبدء.' : 'Use your full name, email, password, and role to get started.'} />
                {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}
                <form onSubmit={handleSubmit}>
                    <div className="field-group">
                        <input className="field" type="text" placeholder={isArabic ? 'الاسم الكامل' : 'Full name'} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                        <input className="field" type="email" placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'} value={email} onChange={(event) => setEmail(event.target.value)} required />
                        <input className="field" type="password" placeholder={isArabic ? 'كلمة المرور' : 'Password'} value={password} onChange={(event) => setPassword(event.target.value)} required />
                        <select className="select" value={role} onChange={(event) => setRole(event.target.value)}>
                            <option value="youth">{isArabic ? 'شاب' : 'Youth'}</option>
                            <option value="expert">{isArabic ? 'خبير' : 'Expert'}</option>
                            <option value="company">{isArabic ? 'شركة' : 'Company'}</option>
                            <option value="admin">{isArabic ? 'مدير' : 'Admin'}</option>
                        </select>
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