// CV Builder Agent - client for the Supabase Edge Function
// ---------------------------------------------------------------------
// All AI work (achievement polishing, summary writing, full CV generation)
// happens server-side in `supabase/functions/cv-builder` so the DeepSeek
// API key never reaches the browser. This module is the thin wrapper.
// ---------------------------------------------------------------------
import { supabase } from './supabase';

/** PortNova style rule #1: never show AI typographic quirks (em/en dashes,
 *  curly quotes, ellipsis) to the user. Clean at the client as well, so even
 *  a stale Edge Function response stays clean. */
const clean = (s) =>
    String(s ?? '')
        .replace(/\u2014/g, '-')
        .replace(/\u2013/g, '-')
        .replace(/\u2018|\u2019/g, "'")
        .replace(/\u201C|\u201D/g, '"')
        .replace(/\u2026/g, '...')
        .trim();

const cleanDeep = (v) => {
    if (typeof v === 'string') return clean(v);
    if (Array.isArray(v)) return v.map(cleanDeep);
    if (v && typeof v === 'object') {
        const out = {};
        for (const k of Object.keys(v)) out[k] = cleanDeep(v[k]);
        return out;
    }
    return v;
};

const invoke = async (action, payload) => {
    const { data, error } = await supabase.functions.invoke('cv-builder', {
        body: { action, ...payload },
    });

    if (error) {
        throw new Error(error.message || 'AI service is unavailable right now.');
    }
    if (!data?.success) {
        throw new Error(data?.error || 'AI service returned an error.');
    }
    return cleanDeep(data.data);
};

/** Rewrite a raw achievement into a quantified, ATS-friendly bullet. */
export const improveAchievement = (text, role, language = 'en') =>
    invoke('improve', { text, role, language });

/** Write a tailored 2-3 sentence professional summary. */
export const writeSummary = (data, language = 'en') =>
    invoke('summary', { data, language });

/** Generate the full structured CV for a template + collected answers. */
export const generateCV = (data, template = 'modern', language = 'en') =>
    invoke('generate', { data, template, language });

/** Deterministic, offline CV builder - assembles the exact same CV structure
 *  from the collected answers WITHOUT any AI call. Used as a graceful fallback
 *  so the flow always completes and downloads work even if the Edge Function
 *  is unreachable. When the AI is available it simply overrides this. */
export const buildLocalCV = (data, template = 'modern') => {
    const experience = (data.experience || []).map((j) => ({
        role: j.role || '',
        company: j.company || '',
        dates: j.dates || '',
        bullets: (j.bullets || []).filter(Boolean),
    }));
    const education = data.education
        ? [{ degree: data.education, institution: data.fieldOfStudy || '', years: '', gpa: '' }]
        : [];
    const fallbackSummary = `A motivated ${data.title || 'professional'} from ${data.location || 'Port Said'} seeking ${data.targetRole || 'a fitting role'} in ${data.targetIndustry || 'the field'}.`;

    return {
        header: {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            linkedin: data.linkedin || '',
            title: data.title || '',
        },
        summary: data.summary || fallbackSummary,
        skills: data.technicalSkills || [],
        softSkills: data.softSkills || [],
        experience,
        education,
        certifications: data.certifications || [],
        languages: data.languages || [],
        projects: [],
        template,
        generatedAt: new Date().toISOString(),
        source: 'local',
    };
};
