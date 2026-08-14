import { supabase } from './supabase';
// Multi-level referral ladder - re-export so existing imports keep working.
export {
    REFERRAL_LEVELS,
    REFERRALS_NEEDED,
    isMaxed,
    levelForCount,
    nextLevelFor,
    progressForCount,
    sessionsForCount,
} from './waitlistLevels';

/** Join the PortNova launch waitlist. Server-side (security definer): generates
 *  the member's referral code, credits the inviter, and unlocks a free CV
 *  session for the inviter once they reach REFERRALS_NEEDED referrals. */
export const joinWaitlist = async ({
    userId, fullName, email, phone, city, rolePref, referralCode,
    ageRange, currentStatus, educationLevel, interestField, employmentPref, howHeard,
}) => {
    const { data, error } = await supabase.rpc('join_waitlist', {
        p_user_id: userId,
        p_full_name: fullName,
        p_email: email,
        p_phone: phone || null,
        p_city: city || null,
        p_role_pref: rolePref || null,
        p_referral_code: referralCode || null,
        p_age_range: ageRange || null,
        p_current_status: currentStatus || null,
        p_education_level: educationLevel || null,
        p_interest_field: interestField || null,
        p_employment_pref: employmentPref || null,
        p_how_heard: howHeard || null,
    });
    if (error) throw error;
    return data;
};

/** Fetch a member's current waitlist status (code, referral count, free CV). */
export const getWaitlistStatus = async (email) => {
    const { data, error } = await supabase.rpc('get_waitlist_status', { p_email: email });
    if (error) throw error;
    return data;
};

/** Build the shareable referral link for a member's code. Always points at
 *  the site root so the invitee lands on the waitlist landing page with the
 *  code in the URL (?ref=CODE) no matter where the sharer is. */
export const referralLink = (code) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?ref=${encodeURIComponent(code || '')}`;
};
