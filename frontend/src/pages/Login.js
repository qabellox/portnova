import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge, BilingualLine, GlassCard, PremiumButton, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
    const { login } = useAuth();
    const { isArabic } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message] = useState(location.state?.message || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const { error: authError } = await login({ email, password });

        if (authError) {
            const text = authError.message || 'Login failed';
            if (text.toLowerCase().includes('email not confirmed')) {
                setError(isArabic ? 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.' : 'Please verify your email before signing in.');
            } else if (text.toLowerCase().includes('invalid login credentials')) {
                setError(isArabic ? 'بيانات الدخول غير صحيحة. راجع البريد وكلمة المرور.' : 'Invalid credentials. Check your email and password.');
            } else {
                setError(text);
            }
            setLoading(false);
            return;
        }

        navigate('/dashboard');
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
                        <div className="brand__tag">{isArabic ? 'بوابة دخول مميزة' : 'Premium access portal'}</div>
                    </div>
                </div>
                <h1 className="hero__title" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
                    {isArabic ? 'أهلًا بعودتك.' : 'Welcome back.'}
                </h1>
                <BilingualLine
                    as="p"
                    className="hero__lead"
                    ar="سجّل دخولك لتكمل رحلتك في الوظائف والدورات وخدمة السيرة الذاتية ولوحة التحكم."
                    en="Sign in to continue the vibrant flow across jobs, courses, CV service, and the dashboard."
                />
                <div className="auth-aside__stack">
                    <div className="auth-aside__stack-item">{isArabic ? 'واجهة زجاجية مع لمسات حركة ذهبية وزرقاء.' : 'Glass-morphism UI with gold and blue motion highlights.'}</div>
                    <div className="auth-aside__stack-item">{isArabic ? 'انتقالات سلسة وأزرار نابضة وتجربة دخول أنيقة.' : 'Smooth transitions, ripple buttons, and a polished login feel.'}</div>
                    <div className="auth-aside__stack-item">{isArabic ? 'مهيأة لعرض محلي موثوق ومقنع.' : 'Built for funder-facing presentation and trust.'}</div>
                </div>
            </aside>

            <GlassCard className="auth-card">
                <Badge tone="gold">{isArabic ? 'دخول آمن' : 'Secure sign-in'}</Badge>
                <SectionHeading title={isArabic ? 'تسجيل الدخول' : 'Login'} subtitle={isArabic ? 'استخدم البريد وكلمة المرور للمتابعة داخل المنصة.' : 'Use your email and password to continue into the platform.'} />
                {message ? <p className="muted">{message}</p> : null}
                {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}
                <form onSubmit={handleSubmit}>
                    <div className="field-group">
                        <input
                            className="field"
                            type="email"
                            placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                        <input
                            className="field"
                            type="password"
                            placeholder={isArabic ? 'كلمة المرور' : 'Password'}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        <PremiumButton type="submit" variant="gold" disabled={loading}>
                            {loading ? (isArabic ? 'جارٍ تسجيل الدخول...' : 'Signing in...') : isArabic ? 'تسجيل الدخول' : 'Sign in'}
                        </PremiumButton>
                    </div>
                </form>
                <p className="muted" style={{ marginTop: '1rem' }}>
                    {isArabic ? 'ليس لديك حساب بعد؟' : 'No account yet?'} <Link to="/register">{isArabic ? 'أنشئ حسابًا' : 'Create one'}</Link>
                </p>
            </GlassCard>
        </div>
    );
};

export default Login;