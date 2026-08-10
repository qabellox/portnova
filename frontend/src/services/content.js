/**
 * Shared content store for jobs & courses.
 *
 * Phase 1 (real data layer): jobs & courses are backed by Postgres via
 * Supabase with row-level security. Providers publish from their dashboard
 * and seekers see the same records on the Jobs & Courses pages.
 *
 * The store degrades gracefully: if the `jobs`/`courses` tables are not
 * deployed yet (or a query fails), it falls back to the old localStorage +
 * seed behaviour so the app keeps working. Run the migration in
 * supabase/migrations/20260810000001_create_jobs_courses.sql to switch it on.
 */

import { supabase } from './supabase';

const SEED_JOBS = [
    { id: 'seed-job-1', company: 'Nova Labs', role: 'Frontend Product Intern', salary: '$450/mo', location: 'Port Said', category: 'Tech', type: 'intern', experience: 'entry', posted: 2, tone: 'blue', emoji: '💻' },
    { id: 'seed-job-2', company: 'HarborX', role: 'Operations Coordinator', salary: '$700/mo', location: 'Hybrid', category: 'Business', type: 'full', experience: 'mid', posted: 4, tone: 'gold', emoji: '⚓' },
    { id: 'seed-job-3', company: 'BlueWave', role: 'Community Designer', salary: '$600/mo', location: 'Remote', category: 'Design', type: 'full', experience: 'mid', posted: 1, tone: 'success', emoji: '🎨' },
    { id: 'seed-job-4', company: 'Atlas Port', role: 'Business Analyst', salary: '$900/mo', location: 'Onsite', category: 'Business', type: 'contract', experience: 'senior', posted: 6, tone: 'blue', emoji: '📊' },
    { id: 'seed-job-5', company: 'Sunrise Digital', role: 'Junior Marketing Specialist', salary: '$420/mo', location: 'Remote', category: 'Marketing', type: 'part', experience: 'entry', posted: 3, tone: 'gold', emoji: '📣' },
    { id: 'seed-job-6', company: 'Porta Tech', role: 'Data Entry & Support', salary: '$380/mo', location: 'Port Said', category: 'Business', type: 'full', experience: 'entry', posted: 8, tone: 'blue', emoji: '🗂' },
];

const SEED_COURSES = [
    { id: 'seed-course-1', title: 'Product Design Sprint', provider: 'PortNova Academy', price: 'Free', hours: 24, mode: 'online', location: 'Zoom', date: 'Flexible', level: 'Beginner', tone: 'blue', emoji: '🎨' },
    { id: 'seed-course-2', title: 'Startup Operations', provider: 'Harbor School', price: '$49', hours: 32, mode: 'offline', location: 'Port Said', date: 'Sat 10:00', level: 'Intermediate', tone: 'gold', emoji: '🚀' },
    { id: 'seed-course-3', title: 'Career Readiness', provider: 'FutureBridge', price: 'Free', hours: 12, mode: 'online', location: 'Zoom', date: 'Flexible', level: 'Foundation', tone: 'success', emoji: '🧭' },
    { id: 'seed-course-4', title: 'Data Storytelling', provider: 'Nova Labs', price: '$79', hours: 20, mode: 'online', location: 'Google Meet', date: 'Wed 18:00', level: 'Advanced', tone: 'blue', emoji: '📊' },
    { id: 'seed-course-5', title: 'Freelance Foundations', provider: 'PortNova Academy', price: 'Free', hours: 15, mode: 'offline', location: 'Youth Center', date: 'Sun 12:00', level: 'Beginner', tone: 'success', emoji: '💼' },
    { id: 'seed-course-6', title: 'Digital Marketing Basics', provider: 'Harbor School', price: '$39', hours: 18, mode: 'online', location: 'Zoom', date: 'Mon 17:00', level: 'Intermediate', tone: 'gold', emoji: '📣' },
];

const LS_JOBS = 'portnova_jobs';
const LS_COURSES = 'portnova_courses';

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

const uid = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* Only pick columns that exist on the Supabase tables (spreading the whole
   form object would include fields like `by` that are not columns). */
const JOB_COLUMNS = ['company', 'role', 'salary', 'location', 'category', 'type', 'experience', 'emoji', 'tone'];
const COURSE_COLUMNS = ['title', 'provider', 'price', 'hours', 'mode', 'location', 'date', 'level', 'emoji', 'tone'];

const pick = (obj, keys) => {
    const out = {};
    for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
    return out;
};

const jobFromRow = (row) => ({
    id: row.id,
    company: row.company,
    role: row.role,
    salary: row.salary,
    location: row.location,
    category: row.category,
    type: row.type,
    experience: row.experience,
    emoji: row.emoji,
    tone: row.tone || 'gold',
    posted: 0,
    source: 'custom',
    by: row.created_by ?? null,
});

const courseFromRow = (row) => ({
    id: row.id,
    title: row.title,
    provider: row.provider,
    price: row.price,
    hours: row.hours,
    mode: row.mode,
    location: row.location,
    date: row.date,
    level: row.level,
    emoji: row.emoji,
    tone: row.tone || 'gold',
    source: 'custom',
    by: row.created_by ?? null,
});

/* Phase 1: read/write Postgres through Supabase. If the tables aren't
   deployed yet (or a query fails), fall back to localStorage + seeds. */
export const getJobs = async () => {
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
        return data.map(jobFromRow);
    }
    return [...readLS(LS_JOBS), ...SEED_JOBS];
};

export const getCourses = async () => {
    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
        return data.map(courseFromRow);
    }
    return [...readLS(LS_COURSES), ...SEED_COURSES];
};

export const addJob = async (job) => {
    const { data, error } = await supabase
        .from('jobs')
        .insert({ ...pick(job, JOB_COLUMNS), created_by: job.by ?? null })
        .select();
    if (!error && data?.[0]) {
        return jobFromRow(data[0]);
    }
    const item = { id: uid(), source: 'custom', posted: 0, tone: 'gold', ...job };
    writeLS(LS_JOBS, [item, ...readLS(LS_JOBS)]);
    return item;
};

export const addCourse = async (course) => {
    const { data, error } = await supabase
        .from('courses')
        .insert({ ...pick(course, COURSE_COLUMNS), created_by: course.by ?? null })
        .select();
    if (!error && data?.[0]) {
        return courseFromRow(data[0]);
    }
    const item = { id: uid(), source: 'custom', tone: 'gold', ...course };
    writeLS(LS_COURSES, [item, ...readLS(LS_COURSES)]);
    return item;
};

export const removeJob = async (id) => {
    const { data, error } = await supabase.from('jobs').delete().eq('id', id).select();
    if (!error && data && data.length > 0) {
        return { ok: true };
    }
    // table missing / RLS denied, or the post only ever existed in localStorage
    writeLS(LS_JOBS, readLS(LS_JOBS).filter((j) => j.id !== id));
    return { ok: false, reason: error ? error.message : 'blocked' };
};

export const removeCourse = async (id) => {
    const { data, error } = await supabase.from('courses').delete().eq('id', id).select();
    if (!error && data && data.length > 0) {
        return { ok: true };
    }
    writeLS(LS_COURSES, readLS(LS_COURSES).filter((c) => c.id !== id));
    return { ok: false, reason: error ? error.message : 'blocked' };
};
