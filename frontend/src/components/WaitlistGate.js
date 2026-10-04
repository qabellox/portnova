import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Waitlist from '../pages/Waitlist';
import WaitlistErrorBoundary from './WaitlistErrorBoundary';

// Owner/admin escape hatch: the site owner must ALWAYS reach the real app.
// Keep this in sync with the owner account email (or set role: 'admin' on the
// account in Supabase - both work).
const ADMIN_EMAILS = ['adonandoq@gmail.com', 'adonandoqabello@gmail.com'];

// Master switch for the launch waitlist.
//   true  -> every non-admin visitor sees the waitlist teaser instead of the app
//   false -> the site is open to anyone with the link
// The waitlist page, its edge function and its migrations are all left intact,
// so flipping this back on restores the gate with no other change. The teaser
// also stays reachable directly at /waitlist while the gate is off.
const WAITLIST_ENABLED = false;

/** Launch teaser gate. Non-admins see the beautiful waitlist page instead of
 *  the website; admins (role === 'admin' or in ADMIN_EMAILS) go straight
 *  through to the real app to edit and monitor it. Auth pages stay public. */
const WaitlistGate = ({ children }) => {
    const { user, loading } = useAuth();
    const { isArabic } = useLanguage();
    const location = useLocation();

    // Gate off: hand the real app to everyone, no sign-in or allow-list needed.
    if (!WAITLIST_ENABLED) {
        return children;
    }

    // Keep login/register public so people can create an account to secure
    // their place.
    if (location.pathname === '/login' || location.pathname === '/register') {
        return children;
    }

    if (loading) {
        return (
            <div className="page-shell">
                <div className="empty-state">{isArabic ? 'جارٍ التحميل…' : 'Loading…'}</div>
            </div>
        );
    }

    const meta = user?.user_metadata || {};
    const isAdmin =
        meta.role === 'admin' ||
        ADMIN_EMAILS.includes(String(user?.email || '').trim().toLowerCase());

    if (user && isAdmin) {
        return children; // owner/admin → the real website
    }

    // Everyone else → the waitlist teaser (account-free - just a waitlist),
    // wrapped in a crash shield so mass traffic never sees a blank page.
    return (
        <WaitlistErrorBoundary>
            <Waitlist />
        </WaitlistErrorBoundary>
    );
};

export default WaitlistGate;
