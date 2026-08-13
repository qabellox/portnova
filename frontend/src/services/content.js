/**
 * Shared content store for jobs & courses.
 *
 * SINGLE SOURCE OF TRUTH: everything is read/written to Postgres via Supabase.
 * No localStorage/seed fallbacks - if a query fails we fail honestly (return
 * empty + log) instead of mixing stale browser data with the real database.
 */
import { supabase } from './supabase';

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

/* Read/write Postgres through Supabase. Failures surface honestly. */
export const getJobs = async () => {
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('getJobs failed:', error.message);
        return [];
    }
    return (data || []).map(jobFromRow);
};

export const getCourses = async () => {
    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('getCourses failed:', error.message);
        return [];
    }
    return (data || []).map(courseFromRow);
};

export const addJob = async (job) => {
    const { data, error } = await supabase
        .from('jobs')
        .insert({ ...pick(job, JOB_COLUMNS), created_by: job.by ?? null })
        .select();
    if (error || !data?.[0]) {
        throw new Error(error?.message || 'Could not publish the job');
    }
    return jobFromRow(data[0]);
};

export const addCourse = async (course) => {
    const { data, error } = await supabase
        .from('courses')
        .insert({ ...pick(course, COURSE_COLUMNS), created_by: course.by ?? null })
        .select();
    if (error || !data?.[0]) {
        throw new Error(error?.message || 'Could not publish the course');
    }
    return courseFromRow(data[0]);
};

export const removeJob = async (id) => {
    const { data, error } = await supabase.from('jobs').delete().eq('id', id).select();
    if (!error && data && data.length > 0) {
        return { ok: true };
    }
    return { ok: false, reason: error ? error.message : 'blocked' };
};

export const removeCourse = async (id) => {
    const { data, error } = await supabase.from('courses').delete().eq('id', id).select();
    if (!error && data && data.length > 0) {
        return { ok: true };
    }
    return { ok: false, reason: error ? error.message : 'blocked' };
};
