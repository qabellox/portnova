import { supabase } from './supabase';
import { getJobs } from './content';

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

export const submitApplication = async ({ cvFile, ...application }) => {
    // Upload the CV to private Supabase Storage (folder = the applicant's id),
    // so it can actually be opened later — not just a filename. If storage
    // isn't ready yet, we still submit and just skip the file.
    let cvPath = null;
    if (cvFile && application.userId) {
        const ext = (cvFile.name.split('.').pop() || 'pdf').toLowerCase();
        const path = `${application.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('cvs').upload(path, cvFile, { upsert: false });
        if (!upErr) cvPath = path;
    }

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
            cv_path: cvPath,
        })
        .select();

    if (!error && data?.[0]) {
        return { ok: true, id: data[0].id, stored: 'db' };
    }

    // Table missing / RLS denied → localStorage fallback.
    const item = {
        id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        ...application,
        appStatus: 'new',
        createdAt: new Date().toISOString(),
    };
    writeLS(LS_APPS, [item, ...readLS(LS_APPS)]);
    return { ok: true, id: item.id, stored: 'local' };
};

const LEGACY = { pending: 'new', accepted: 'offer', rejected: 'not_selected' };

/* The professional hiring pipeline (LinkedIn-style). */
export const APP_STAGES = ['new', 'review', 'interview', 'offer', 'hired'];
export const APP_END_STAGE = 'not_selected';

export const stageTone = (s) =>
    ({ new: 'blue', review: 'gold', interview: 'gold', offer: 'success', hired: 'success', not_selected: 'danger' }[s] || 'blue');

export const stageLabelKey = (s) =>
    ({ new: 'stageNew', review: 'stageReview', interview: 'stageInterview', offer: 'stageOffer', hired: 'stageHired', not_selected: 'stageNotSelected' }[s] || 'stageNew');

const appFromRow = (row) => ({
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    fullName: row.applicant_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    status: row.status,
    education: row.education,
    experienceYears: row.experience_years,
    skills: row.skills,
    coverLetter: row.cover_letter,
    expectedSalary: row.expected_salary,
    availability: row.availability,
    portfolioUrl: row.portfolio_url,
    linkedin: row.linkedin_url,
    referral: row.referral_source,
    cvName: row.cv_name,
    cvPath: row.cv_path,
    appStatus: LEGACY[row.app_status] || row.app_status || 'new',
    stageNote: row.stage_note || '',
    createdAt: row.created_at,
});

const withJob = async (apps) => {
    const jobs = await getJobs();
    return apps.map((app) => ({ ...app, job: jobs.find((j) => j.id === app.jobId) || null }));
};

/* A seeker's own applications (RLS returns only rows where user_id = auth.uid()). */
export const getMyApplications = async () => {
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
        return withJob(data.map(appFromRow));
    }
    return withJob(readLS(LS_APPS));
};

/* A provider's applicants: RLS returns only applications for jobs they own. */
export const getJobApplicants = async () => {
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
        return withJob(data.map(appFromRow));
    }
    return [];
};

/* Open a CV via a short-lived signed URL (applicant owner / job owner only). */
export const openCv = async (cvPath) => {
    if (!cvPath) return;
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(cvPath, 3600);
    if (!error && data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
};

/* A job owner updates an applicant's status (pending → accepted/rejected). */
export const updateApplicationStatus = async (id, appStatus) => {
    const { data, error } = await supabase
        .from('applications')
        .update({ app_status: appStatus })
        .eq('id', id)
        .select();
    if (!error && data?.[0]) {
        return { ok: true, app: appFromRow(data[0]) };
    }
    return { ok: false, reason: error ? error.message : 'blocked' };
};

/* A job owner saves a private note on an application. */
export const updateApplicationNote = async (id, note) => {
    const { data, error } = await supabase
        .from('applications')
        .update({ stage_note: note })
        .eq('id', id)
        .select();
    if (!error && data?.[0]) {
        return { ok: true };
    }
    return { ok: false, reason: error ? error.message : 'blocked' };
};
