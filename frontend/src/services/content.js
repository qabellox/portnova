/**
 * Shared content store for jobs & courses.
 *
 * Providers publish jobs/courses from their dashboard; seekers see them on
 * the Jobs & Courses pages. Items are persisted in localStorage so the flow
 * works end-to-end with no backend dependency and survives reloads.
 * (Swap these functions for Supabase calls when the backend is deployed —
 *  nothing else in the app changes.)
 */

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

/* Custom posts appear above the built-in seed items (newest first). */
export const getJobs = () => [...readLS(LS_JOBS), ...SEED_JOBS];
export const getCourses = () => [...readLS(LS_COURSES), ...SEED_COURSES];

export const addJob = (job) => {
    const item = { id: uid(), source: 'custom', posted: 0, tone: 'gold', ...job };
    writeLS(LS_JOBS, [item, ...readLS(LS_JOBS)]);
    return item;
};

export const addCourse = (course) => {
    const item = { id: uid(), source: 'custom', tone: 'gold', ...course };
    writeLS(LS_COURSES, [item, ...readLS(LS_COURSES)]);
    return item;
};

export const removeJob = (id) => writeLS(LS_JOBS, readLS(LS_JOBS).filter((j) => j.id !== id));
export const removeCourse = (id) => writeLS(LS_COURSES, readLS(LS_COURSES).filter((c) => c.id !== id));
