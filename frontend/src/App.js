import React, { useState } from 'react';
import { BrowserRouter as Router, NavLink, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClickWaves, LanguageToggle, PremiumButton } from './components/PremiumUI';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Courses from './pages/Courses';
import CVService from './pages/CVService';
import { RequireProfile } from './components/ProfileGate';
import WaitlistGate from './components/WaitlistGate';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import About from './pages/About';
import { useEffect } from 'react';

// `RequireProfile` (imported from ProfileGate) is the site-wide gate: every
// visitor must sign in AND complete their saved profile credentials once
// (name, phone, location). Applied to every page except /login and /register.

const navItems = [
    { to: '/', ar: 'الرئيسية', en: 'Home', end: true },
    { to: '/jobs', ar: 'الوظائف', en: 'Jobs' },
    { to: '/courses', ar: 'الدورات', en: 'Courses' },
    { to: '/cv-service', ar: 'السيرة الذاتية', en: 'CV' },
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
                {user.user_metadata?.avatarUrl ? (
                    <img className="avatar avatar--img" src={user.user_metadata.avatarUrl} alt={user.email || ''} />
                ) : (
                    <span className="avatar">{getInitials(user.email)}</span>
                )}
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

    // Keep the browser tab in sync with the UI language.
    useEffect(() => {
        document.title = isArabic ? 'PortNova | بورسعيد' : 'PortNova | Port Said';
    }, [isArabic]);

    return (
        <div className="app-shell" style={{ direction: isArabic ? 'rtl' : 'ltr' }}>
            {/* Old animated bubble/wave wallpaper - removed, the video hero on the
                home page replaced it. To restore, re-add AnimatedBackdrop to the
                PremiumUI import and uncomment the line below. */}
            {/* <AnimatedBackdrop /> */}
            <ClickWaves />
            <WaitlistGate>
                <ShellNav />
                <main className="app-main">
                    <Routes>
                    <Route path="/" element={<RequireProfile><div key={location.pathname}><Home /></div></RequireProfile>} />
                    <Route path="/jobs" element={<RequireProfile><div key={location.pathname}><Jobs /></div></RequireProfile>} />
                    <Route path="/courses" element={<RequireProfile><div key={location.pathname}><Courses /></div></RequireProfile>} />
                    <Route
                        path="/cv-service"
                        element={
                            <RequireProfile>
                                <div key={location.pathname}><CVService /></div>
                            </RequireProfile>
                        }
                    />
                    <Route path="/cv-builder" element={<Navigate to="/cv-service" replace />} />
                    <Route path="/login" element={<div key={location.pathname}><Login /></div>} />
                    <Route path="/register" element={<div key={location.pathname}><Register /></div>} />
                    <Route
                        path="/dashboard"
                        element={
                            <RequireProfile>
                                <div key={location.pathname}><Dashboard /></div>
                            </RequireProfile>
                        }
                    />
                    <Route
                        path="/about"
                        element={
                            <RequireProfile>
                                <div key={location.pathname}><About /></div>
                            </RequireProfile>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <RequireProfile>
                                <div key={location.pathname}><Admin /></div>
                            </RequireProfile>
                        }
                    />
                </Routes>
                </main>
            </WaitlistGate>
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