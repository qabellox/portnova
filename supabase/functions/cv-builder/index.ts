// ---------------------------------------------------------------------
// PortNova - AI CV Builder Agent (DeepSeek)
// ---------------------------------------------------------------------
// A Supabase Edge Function that powers the conversational CV Builder in
// the CV section. It keeps the DeepSeek API key server-side (never exposed
// to the browser) and exposes three premium actions:
//
//   * action: "improve"   - rewrite a raw achievement into a quantified,
//                           ATS-friendly bullet point (instant feedback in
//                           the chat)
//   * action: "summary"   - write a tailored 2-3 sentence professional
//                           summary from the answers collected so far
//   * action: "generate"  - produce the full structured CV (all sections)
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

/* ------------------- Output sanitization (Rule 1) ------------------- */
// The AI sometimes emits typographic quirks (em/en dashes, curly quotes,
// ellipsis). PortNova's style rule: never let those leak into the CV or
// chat. Replace them with clean plain-ASCII equivalents.
const clean = (s) =>
    String(s ?? '')
        .replace(/\u2014/g, '-') // - em dash -> hyphen
        .replace(/\u2013/g, '-') // - en dash -> hyphen
        .replace(/\u2018|\u2019/g, "'") // ' ' curly single quotes
        .replace(/\u201C|\u201D/g, '"') // " " curly double quotes
        .replace(/\u2026/g, '...') // … ellipsis -> dots
        .trim();

// Recursively sanitize every string inside the generated CV JSON.
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

/* ---------------- Action 1: polish an achievement ---------------- */
const improveAchievement = async (body) => {
    const { text, role, language = 'en' } = body;
    if (!text || !text.trim()) throw new Error('achievement text is required');
    const lang = language === 'ar' ? 'Arabic (modern standard, professional)' : 'English';
    const messages = [
        {
            role: 'system',
            content:
                `You are Nova, a senior CV consultant for PortNova (Port Said, Egypt). ` +
                `The user just told you a raw work achievement. Rewrite it into ONE outstanding, ` +
                `quantified, ATS-friendly bullet point in ${lang}. ` +
                `Rules: 1) start with a strong action verb (led, built, grew, reduced, launched...); ` +
                `2) silently fix grammar, spelling, punctuation and casing errors in the original; ` +
                `3) be specific and results-driven; 4) ONLY use numbers or percentages the user ` +
                `actually mentioned - never invent metrics; if no metric was given, convey impact ` +
                `through verbs and scope instead; 5) keep it a single tight line (under ~28 words). ` +
                `Return ONLY the polished bullet with no quotes, bullets, or intro. Plain ASCII punctuation only.`,
        },
        { role: 'user', content: text + (role ? `\n(role context: ${role})` : '') },
    ];
    const improved = await callDeepSeek(messages, { temperature: 0.35, maxTokens: 240 });
    return { improved: clean(improved) };
};

/* ------------------- Action 2: analyze uploaded CV ------------------- */
// Parse an uploaded CV's extracted text: pull out structured data, identify
// missing/weak sections (gaps), and generate ONLY gap-based follow-up
// questions. The user uploaded a CV to SAVE TIME, never to repeat themselves.
const analyzeCV = async (body) => {
    const { cvText = '', language = 'en', existing = {} } = body;
    const lang = language === 'ar' ? 'Arabic (modern standard, professional)' : 'English';

    if (!cvText || !cvText.trim()) {
        throw new Error('cvText is required - upload a CV first.');
    }

    const messages = [
        {
            role: 'system',
            content:
                `You are Nova, a senior CV consultant for PortNova (Port Said, Egypt). ` +
                `The user uploaded their existing CV and the raw extracted text is below. ` +
                `Your job: extract everything you can, then tell us only what is MISSING or WEAK. ` +
                `The user did the work already - NEVER ask them to repeat what is in the CV. ` +
                `Return STRICT JSON (no markdown fences) with EXACTLY this shape:\n` +
                `{\n` +
                `  "summary": "2-3 sentence friendly analysis: what you found (name, role, years of experience, key skills, education) and a warm tone",\n` +
                `  "extracted": {\n` +
                `    "name": "string",\n` +
                `    "email": "string",\n` +
                `    "phone": "string",\n` +
                `    "location": "string",\n` +
                `    "title": "current job title",\n` +
                `    "technicalSkills": ["string"],\n` +
                `    "softSkills": ["string"],\n` +
                `    "education": "highest degree, e.g. Bachelor in CS, Cairo University",\n` +
                `    "fieldOfStudy": "string",\n` +
                `    "languages": [{"name":"string","level":"string"}],\n` +
                `    "certifications": [{"name":"string","issuer":"string","year":"string"}],\n` +
                `    "experience": [{"role":"string","company":"string","dates":"string","bullets":["string"]}]\n` +
                `  },\n` +
                `  "gaps": [{"key":"string","question":"string"}]\n` +
                `}\n` +
                `For "gaps", only include sections that are genuinely missing, empty, or too weak to build a strong CV. ` +
                `Rules for gaps (ask ONLY about missing/weak items, in ${lang}):\n` +
                `- if there is NO professional summary (or it is a single line): gap "summary" -> "I noticed your CV doesn't have a professional summary. Let me draft one for you - what's your career goal and what makes you unique?"\n` +
                `- if experience is missing or has no achievements/bullets: gap "achievements" -> "I see you mentioned [role]. Can you tell me about your biggest achievement there, and ideally the measurable impact?"\n` +
                `- if fewer than 3 technical skills: gap "technicalSkills" -> "What technical skills do you actually use in your role?"\n` +
                `- if education is missing: gap "education" -> "I see the education section is missing. Can you add your degree and institution?"\n` +
                `- if targetRole/targetIndustry is missing: gap "targetRole" -> "What role are you targeting in your next move, and in which industry?"\n` +
                `- never invent facts; only use what is in the CV. Keep every array (use [] when empty).\n` +
                `- fill "extracted" with ONLY data actually found in the CV (empty string / [] when absent).\n` +
                `Keep "summary" friendly and specific, referencing what is actually in the CV. Plain ASCII punctuation only.`,
        },
        { role: 'user', content: cvText.slice(0, 12000) + (existing && Object.keys(existing).length ? `\n\n(already known from profile: ${JSON.stringify(existing)})` : '') },
    ];

    const raw = await callDeepSeek(messages, { temperature: 0.4, maxTokens: 1800, jsonMode: true });
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('Could not analyze the uploaded CV. Please try again.');
        }
        parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
    const p = cleanDeep(parsed);
    return {
        summary: typeof p.summary === 'string' ? p.summary : '',
        extracted: p.extracted || {},
        gaps: Array.isArray(p.gaps) ? p.gaps : [],
    };
};

/* ------------------- Action 2: write a summary ------------------- */const writeSummary = async (body) => {
    const { data = {}, language = 'en' } = body;
    const lang = language === 'ar' ? 'Arabic' : 'English';
    const profile = [
        data.name,
        data.title,
        data.location,
        `Goal: ${data.targetRole} in ${data.targetIndustry}`,
        (data.technicalSkills || data.skills || []).join(', '),
        (data.experience || []).map((e) => `${e.role} at ${e.company}`).join('; '),
    ].filter(Boolean).join('. ');
    const messages = [
        {
            role: 'system',
            content:
                `You are Nova, a senior CV consultant for PortNova (Port Said, Egypt). ` +
                `Write a persuasive, polished professional summary in ${lang} for the candidate described. ` +
                `It must read like a senior consultant wrote it: correct grammar and punctuation, ` +
                `confident yet human tone, tailored to their target role and industry, and weaving ` +
                `in their strongest skills and experience. 2-3 sentences max. Do NOT invent facts ` +
                `or numbers they did not state. Return ONLY the summary text. Plain ASCII punctuation only.`,
        },
        { role: 'user', content: profile || 'A motivated young professional from Port Said seeking to grow.' },
    ];
    const summary = await callDeepSeek(messages, { temperature: 0.65, maxTokens: 320 });
    return { summary: clean(summary) };
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
        skills: Array.isArray(data.technicalSkills) ? data.technicalSkills : (Array.isArray(data.skills) ? data.skills : []),
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
                `You are Nova, a senior CV consultant for PortNova (Port Said, Egypt). ` +
                `The candidate's raw answers are below. Produce a polished, professional CV as STRICT JSON ` +
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
                `Work like a senior CV editor before you write anything:\n` +
                `1) PROOFREAD every string - fix spelling, grammar, punctuation, spacing and inconsistent casing.\n` +
                `2) RESOLVE CONTRADICTIONS - if the answers conflict (e.g. "student" but years of experience, ` +
                `or a role that does not match the company), pick the honest, most sensible reading and reword.\n` +
                `3) EXPAND terse or messy bullets into compelling, quantified, action-led sentences using ONLY ` +
                `the details provided - never invent numbers, dates, employers or credentials.\n` +
                `4) DEDUPE and tidy the skills lists; drop empty or junk entries.\n` +
                `5) Write the summary so it is tailored to the target role and industry, confident and human.\n` +
                `Keep the candidate's header data (name, email, phone, location, title, linkedin) EXACTLY as ` +
                `provided - they live outside this JSON. Return ONLY the JSON object, no markdown fences, no commentary.`,
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
    const p = cleanDeep(parsed); // Rule 1: strip em dashes / curly punctuation
    return {
        header: {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            linkedin: data.linkedin || '',
            title: data.title || '',
        },
        summary: typeof p.summary === 'string' ? p.summary : (data.summary || ''),
        skills: ensureArray(p.skills),
        softSkills: ensureArray(p.softSkills),
        experience: ensureArray(p.experience),
        education: ensureArray(p.education),
        certifications: ensureArray(p.certifications),
        languages: ensureArray(p.languages),
        projects: ensureArray(p.projects),
        template,
        generatedAt: new Date().toISOString(),
    };
};

/* ------------------------------ Router ------------------------------ */
serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    // Lightweight health check - lets us verify the function is live and
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
            case 'analyze':
                result = await analyzeCV(payload);
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
