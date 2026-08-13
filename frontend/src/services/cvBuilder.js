// CV Builder Agent — client for the Supabase Edge Function
// ---------------------------------------------------------------------
// All AI work (achievement polishing, summary writing, full CV generation)
// happens server-side in `supabase/functions/cv-builder` so the DeepSeek
// API key never reaches the browser. This module is the thin wrapper.
// ---------------------------------------------------------------------
import { supabase } from './supabase';

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
    return data.data;
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
