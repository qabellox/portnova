import { supabase } from './supabase';

/**
 * Job applications — the structured youth data the platform collects.
 *
 * Persists to Postgres via Supabase (`applications` table, run the
 * 0002 migration). If the table isn't deployed yet, it falls back to
 * localStorage so the flow never breaks mid-switch (same pattern as content.js).
 */

const LS_APPS = 'portnova_applications';

const readLS = (key) => {
    try {
        return JSON.parse(window.localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
};

const writeLS = (key, arr) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(arr));
    } catch {
        /* storage unavailable — ignore */
    }
};

export const submitApplication = async (application) => {
    const { data, error } = await supabase
        .from('applications')
        .insert({
            job_id: application.jobId,
            user_id: application.userId ?? null,
            applicant_name: application.fullName,
            email: application.email,
            phone: application.phone,
            city: application.city,
            status: application.status,
            education: application.education,
            experience_years: application.experienceYears,
            skills: application.skills,
            cover_letter: application.coverLetter,
            expected_salary: application.expectedSalary,
            availability: application.availability,
            portfolio_url: application.portfolioUrl,
            linkedin_url: application.linkedin,
            referral_source: application.referral,
            cv_name: application.cvName,
        })
        .select();

    if (!error && data?.[0]) {
        return { ok: true, id: data[0].id, stored: 'db' };
    }

    // Table missing / RLS denied → localStorage fallback.
    const item = {
        id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        ...application,
        createdAt: new Date().toISOString(),
    };
    writeLS(LS_APPS, [item, ...readLS(LS_APPS)]);
    return { ok: true, id: item.id, stored: 'local' };
};
