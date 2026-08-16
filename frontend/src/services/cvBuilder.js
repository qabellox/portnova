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

/** Rewrite a raw achievement into a quantified, ATS-friendly bullet. The
 *  optional `context` is what we ACTUALLY know about the user (name/title from
 *  their CV or profile) so the agent never hallucinates or pretends to have
 *  the CV when it doesn't. */
export const improveAchievement = (text, role, language = 'en', context = '') =>
    invoke('improve', { text, role, language, context });

/** Analyze an uploaded CV: extract structured data, identify gaps, and get
 *  gap-based follow-up questions so the agent builds on the CV instead of
 *  asking the user to repeat what is already there. */
export const analyzeCV = (cvText, language = 'en', existing = {}) =>
    invoke('analyze', { cvText, language, existing });

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
const cleanWord = (s) =>
    String(s || '')
        .replace(/\s+/g, ' ')
        .trim();

const unique = (arr) => [...new Set(arr.map((s) => cleanWord(s)).filter(Boolean))];

export const buildLocalCV = (data, template = 'modern') => {
    const experience = (data.experience || []).map((j) => ({
        role: cleanWord(j.role),
        company: cleanWord(j.company),
        dates: cleanWord(j.dates),
        bullets: unique(j.bullets || []),
    }));
    const education = data.education
        ? [{ degree: cleanWord(data.education), institution: cleanWord(data.fieldOfStudy || ''), years: '', gpa: '' }]
        : [];
    const skills = unique(data.technicalSkills || []);
    const softSkills = unique(data.softSkills || []);
    const fallbackSummary = `A motivated ${data.title || 'professional'} from ${data.location || 'Port Said'} seeking ${data.targetRole || 'a fitting role'} in ${data.targetIndustry || 'the field'}.`;

    return {
        header: {
            name: cleanWord(data.name),
            email: (data.email || '').trim(),
            phone: (data.phone || '').trim(),
            location: cleanWord(data.location),
            linkedin: (data.linkedin || '').trim(),
            title: cleanWord(data.title),
        },
        summary: cleanWord(data.summary || fallbackSummary),
        skills,
        softSkills,
        experience,
        education,
        certifications: (data.certifications || []).map((c) => ({
            name: cleanWord(c.name),
            issuer: cleanWord(c.issuer || ''),
            year: (c.year || '').trim(),
        })),
        languages: (data.languages || []).map((l) => ({
            name: cleanWord(l.name),
            level: cleanWord(l.level || ''),
        })),
        projects: [],
        template,
        generatedAt: new Date().toISOString(),
        source: 'local',
    };
};
