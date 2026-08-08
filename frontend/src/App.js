import React, { useState } from 'react';
import { BrowserRouter as Router, NavLink, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnimatedBackdrop, ClickWaves, LanguageToggle, PremiumButton } from './components/PremiumUI';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Courses from './pages/Courses';
import CVService from './pages/CVService';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import About from './pages/About';
import { useEffect } from 'react';

const RequireAuth = ({ children }) => {
    const { session, loading } = useAuth();
    const { isArabic } = useLanguage();

    if (loading) {
        return <div className="empty-state">{isArabic ? 'جارٍ فحص الجلسة...' : 'Checking session...'}</div>;
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const navItems = [
    { to: '/', ar: 'الرئيسية', en: 'Home', end: true },
    { to: '/jobs', ar: 'الوظائف', en: 'Jobs' },
    { to: '/courses', ar: 'الدورات', en: 'Courses' },
    { to: '/cv-service', ar: 'خدمة السيرة الذاتية', en: 'CV Service' },
    { to: '/dashboard', ar: 'لوحة التحكم', en: 'Dashboard' },
    { to: '/about', ar: 'من نحن', en: 'About' },
];

const getInitials = (email = 'PN') =>
    email
        .split('@')[0]
        .split(/[._-]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PN';

const UserMenu = () => {
    const { user, logout } = useAuth();
    const { isArabic } = useLanguage();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const closeMenu = () => setOpen(false);
        window.addEventListener('scroll', closeMenu, { passive: true });
        return () => window.removeEventListener('scroll', closeMenu);
    }, []);

    if (!user) {
        return null;
    }

    return (
        <div className="user-menu">
            <button className="nav-link user-menu__trigger" type="button" onClick={() => setOpen((current) => !current)}>
                <span className="avatar">{getInitials(user.email)}</span>
                <span>
                    <span style={{ display: 'block', fontWeight: 700, color: '#fff', textAlign: 'inherit' }}>{isArabic ? 'الحساب' : 'Account'}</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'inherit' }}>{isArabic ? 'وصول مميز' : 'Premium access'}</span>
                </span>
            </button>
            {open ? (
                <div className="user-menu__panel">
                    <div className="badge badge--gold">{user.user_metadata?.role || 'youth'}</div>
                    <p className="user-menu__email">{user.email}</p>
                    <div className="user-menu__links">
                        <NavLink to="/dashboard" className="user-menu__link" onClick={() => setOpen(false)}>
                            {isArabic ? 'لوحة التحكم' : 'Dashboard'}
                        </NavLink>
                        {user.user_metadata?.role === 'admin' ? (
                            <NavLink to="/admin" className="user-menu__link" onClick={() => setOpen(false)}>
                                {isArabic ? 'الإدارة' : 'Admin'}
                            </NavLink>
                        ) : null}
                    </div>
                    <PremiumButton
                        variant="danger"
                        onClick={async () => {
                            await logout();
                            setOpen(false);
                        }}
                    >
                        {isArabic ? 'تسجيل الخروج' : 'Sign out'}
                    </PremiumButton>
                </div>
            ) : null}
        </div>
    );
};

const ShellNav = () => {
    const { session } = useAuth();
    const { isArabic } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const closeMenu = () => setMenuOpen(false);
        window.addEventListener('scroll', closeMenu, { passive: true });
        return () => window.removeEventListener('scroll', closeMenu);
    }, []);

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="shell-nav">
            <NavLink className="brand" to="/" style={{ flexDirection: isArabic ? 'row-reverse' : 'row' }}>
                <div className="brand__logo-wrap">
                    <img className="brand__logo" src="/images/logo.png" alt="PortNova logo" />
                </div>
                <span className="brand__text">
                    <span className="brand__name">PortNova</span>
                    <span className="brand__tag">{isArabic ? 'شباب • وظائف • تعلم' : 'Youth, Jobs, Learning'}</span>
                </span>
            </NavLink>

            <nav className="nav-links" aria-label="Primary">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}
                    >
                        {isArabic ? item.ar : item.en}
                    </NavLink>
                ))}
                <LanguageToggle />
            </nav>

            <button
                className="nav-burger"
                type="button"
                aria-label={isArabic ? 'القائمة' : 'Menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
            >
                <span className="nav-burger__bar" />
                <span className="nav-burger__bar" />
                <span className="nav-burger__bar" />
            </button>

            {menuOpen ? (
                <div className="nav-mobile">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `nav-mobile__link ${isActive ? 'nav-mobile__link--active' : ''}`.trim()}
                            onClick={closeMenu}
                        >
                            {isArabic ? item.ar : item.en}
                        </NavLink>
                    ))}
                    <div className="nav-mobile__toggle">
                        <LanguageToggle />
                    </div>
                </div>
            ) : null}

            <div className="nav-actions">
                {session ? (
                    <UserMenu />
                ) : (
                    <>
                        <PremiumButton variant="ghost" to="/login">
                            {isArabic ? 'تسجيل الدخول' : 'Login'}
                        </PremiumButton>
                        <PremiumButton variant="gold" to="/register">
                            {isArabic ? 'إنشاء حساب' : 'Join PortNova'}
                        </PremiumButton>
                    </>
                )}
            </div>
        </header>
    );
};

function Shell() {
    const location = useLocation();
    const { isArabic } = useLanguage();

    return (
        <div className="app-shell" style={{ direction: isArabic ? 'rtl' : 'ltr' }}>
            <AnimatedBackdrop />
            <ClickWaves />
            <ShellNav />
            <main className="app-main">
                <Routes>
                    <Route path="/" element={<div key={location.pathname}><Home /></div>} />
                    <Route path="/jobs" element={<div key={location.pathname}><Jobs /></div>} />
                    <Route path="/courses" element={<div key={location.pathname}><Courses /></div>} />
                    <Route path="/cv-service" element={<div key={location.pathname}><CVService /></div>} />
                    <Route path="/login" element={<div key={location.pathname}><Login /></div>} />
                    <Route path="/register" element={<div key={location.pathname}><Register /></div>} />
                    <Route
                        path="/dashboard"
                        element={
                            <RequireAuth>
                                <div key={location.pathname}><Dashboard /></div>
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/about"
                        element={
                            <div key={location.pathname}><About /></div>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <RequireAuth>
                                <div key={location.pathname}><Admin /></div>
                            </RequireAuth>
                        }
                    />
                </Routes>
            </main>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <LanguageProvider>
                <Router>
                    <Shell />
                </Router>
            </LanguageProvider>
        </AuthProvider>
    );
}

export default App;