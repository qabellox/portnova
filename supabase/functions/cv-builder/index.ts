// ---------------------------------------------------------------------
// PortNova — AI CV Builder Agent (DeepSeek)
// ---------------------------------------------------------------------
// A Supabase Edge Function that powers the conversational CV Builder in
// the CV section. It keeps the DeepSeek API key server-side (never exposed
// to the browser) and exposes three premium actions:
//
//   * action: "improve"   — rewrite a raw achievement into a quantified,
//                           ATS-friendly bullet point (instant feedback in
//                           the chat)
//   * action: "summary"   — write a tailored 2-3 sentence professional
//                           summary from the answers collected so far
//   * action: "generate"  — produce the full structured CV (all sections)
//                           from the collected answers, in the chosen format
//
// Client calls it with:  supabase.functions.invoke('cv-builder', { body })
//
// Deploy (auto via GitHub integration, but manual is possible):
//   npx supabase functions deploy cv-builder
// Secrets (set once in the Supabase dashboard → Settings → Secrets):
//   DEEPSEEK_API_KEY = sk-...
// ---------------------------------------------------------------------
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });

/* ------------------------- DeepSeek helper ------------------------- */
const callDeepSeek = async (messages, { temperature = 0.6, maxTokens = 900, jsonMode = false } = {}) => {
    if (!DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY is not configured on this Supabase project');
    }
    const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            temperature,
            max_tokens: maxTokens,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`DeepSeek error ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    return (data?.choices?.[0]?.message?.content ?? '').trim();
};

/* ---------------- Action 1: polish an achievement ---------------- */
const improveAchievement = async (body) => {
    const { text, role, language = 'en' } = body;
    if (!text || !text.trim()) throw new Error('achievement text is required');
    const lang = language === 'ar' ? 'Arabic (modern standard, professional)' : 'English';
    const messages = [
        {
            role: 'system',
            content:
                `You are Nova, a premium CV consultant for PortNova (Port Said, Egypt). ` +
                `Rewrite the user's raw achievement into ONE crisp, quantified, ATS-friendly bullet point in ${lang}. ` +
                `Never invent numbers the user did not state — if a metric is missing, use the skills/actions they mention ` +
                `and phrase it powerfully without fabricating data. Return ONLY the bullet point (no quotes, no intro).`,
        },
        { role: 'user', content: text + (role ? `\n(role context: ${role})` : '') },
    ];
    const improved = await callDeepSeek(messages, { temperature: 0.4, maxTokens: 220 });
    return { improved };
};

/* ------------------- Action 2: write a summary ------------------- */
const writeSummary = async (body) => {
    const { data = {}, language = 'en' } = body;
    const lang = language === 'ar' ? 'Arabic' : 'English';
    const profile = [
        data.name,
        data.title,
        data.location,
        `Goal: ${data.targetRole} in ${data.targetIndustry}`,
        (data.skills || []).join(', '),
        (data.experience || []).map((e) => `${e.role} at ${e.company}`).join('; '),
    ].filter(Boolean).join('. ');
    const messages = [
        {
            role: 'system',
            content:
                `You are Nova, a premium CV consultant for PortNova (Port Said, Egypt). ` +
                `Write a compelling 2-3 sentence professional summary in ${lang} for the candidate described. ` +
                `Tailor it to their goal, highlight their strongest skills and experience, sound confident and human. ` +
                `Return ONLY the summary text.`,
        },
        { role: 'user', content: profile || 'A motivated young professional from Port Said seeking to grow.' },
    ];
    const summary = await callDeepSeek(messages, { temperature: 0.7, maxTokens: 300 });
    return { summary };
};

/* ------------------- Action 3: full CV generation ------------------- */
const generateCV = async (body) => {
    const { data = {}, template = 'modern', language = 'en' } = body;
    const lang = language === 'ar' ? 'Arabic' : 'English';

    const cvInput = {
        header: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            location: data.location,
            linkedin: data.linkedin || '',
            title: data.title,
        },
        summary: data.summary || '',
        skills: Array.isArray(data.skills) ? data.skills : [],
        softSkills: Array.isArray(data.softSkills) ? data.softSkills : [],
        experience: Array.isArray(data.experience) ? data.experience : [],
        education: Array.isArray(data.education) ? data.education : [],
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        languages: Array.isArray(data.languages) ? data.languages : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        targetRole: data.targetRole || '',
        targetIndustry: data.targetIndustry || '',
        template,
    };

    const messages = [
        {
            role: 'system',
            content:
                `You are Nova, a premium CV consultant for PortNova (Port Said, Egypt). ` +
                `Given the candidate's raw answers below, produce a polished, professional CV as STRICT JSON ` +
                `in ${lang}. The JSON must match EXACTLY this shape (keep every key, use arrays even when empty):\n` +
                `{\n` +
                `  "summary": "string",\n` +
                `  "skills": ["string"],\n` +
                `  "softSkills": ["string"],\n` +
                `  "experience": [{"role":"string","company":"string","dates":"string","bullets":["string"]}],\n` +
                `  "education": [{"institution":"string","degree":"string","years":"string","gpa":"string"}],\n` +
                `  "certifications": [{"name":"string","issuer":"string","year":"string"}],\n` +
                `  "languages": [{"name":"string","level":"string"}],\n` +
                `  "projects": [{"name":"string","description":"string"}]\n` +
                `}\n` +
                `Rewrite every bullet to be quantified and compelling where the user gave enough detail; keep it ` +
                `honest (do not invent numbers). Keep the candidate's header data (name, email, phone, location, ` +
                `title, linkedin) EXACTLY as provided — they live outside this JSON. Return ONLY the JSON object, ` +
                `no markdown fences, no commentary.`,
        },
        { role: 'user', content: JSON.stringify(cvInput) },
    ];

    const raw = await callDeepSeek(messages, { temperature: 0.5, maxTokens: 2200, jsonMode: true });

    // Defensive parse: strip markdown fences if the model wrapped them.
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        // Find the first '{' ... last '}' as a last resort.
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('Could not parse the generated CV. Please try again.');
        }
        parsed = JSON.parse(cleaned.slice(start, end + 1));
    }

    const ensureArray = (v) => (Array.isArray(v) ? v : []);
    return {
        header: {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            linkedin: data.linkedin || '',
            title: data.title || '',
        },
        summary: typeof parsed.summary === 'string' ? parsed.summary : (data.summary || ''),
        skills: ensureArray(parsed.skills),
        softSkills: ensureArray(parsed.softSkills),
        experience: ensureArray(parsed.experience),
        education: ensureArray(parsed.education),
        certifications: ensureArray(parsed.certifications),
        languages: ensureArray(parsed.languages),
        projects: ensureArray(parsed.projects),
        template,
        generatedAt: new Date().toISOString(),
    };
};

/* ------------------------------ Router ------------------------------ */
serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    // Lightweight health check — lets us verify the function is live and
    // reachable from anywhere (used by CI and the deploy check).
    if (req.method === 'GET') {
        return json({ success: true, service: 'cv-builder', deployed: true, hasKey: !!DEEPSEEK_API_KEY });
    }

    let payload;
    try {
        payload = await req.json();
    } catch {
        return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const { action } = payload || {};
    if (action === 'health') {
        return json({ success: true, service: 'cv-builder', deployed: true, hasKey: !!DEEPSEEK_API_KEY });
    }

    try {
        let result;
        switch (action) {
            case 'improve':
                result = await improveAchievement(payload);
                break;
            case 'summary':
                result = await writeSummary(payload);
                break;
            case 'generate':
                result = await generateCV(payload);
                break;
            default:
                return json({ success: false, error: `Unknown action: ${action}` }, 400);
        }
        return json({ success: true, data: result });
    } catch (error) {
        console.error('cv-builder error:', error);
        return json({ success: false, error: error.message || 'Internal error' }, 500);
    }
});
