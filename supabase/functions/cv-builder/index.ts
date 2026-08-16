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

/* ---------------- Action 1: polish an achievement ---------------- */// This action receives whatever the user typed in the achievement box, plus an
// optional `context` string = what the agent ACTUALLY knows about the user
// (extracted from their CV/profile, e.g. name + job title). It must classify
// the input first, NEVER invent facts, NEVER claim to have information it was
// not given, and NEVER expose internals.
const improveAchievement = async (body) => {
    const { text, role, context = '', language = 'en' } = body;
    if (!text || !text.trim()) throw new Error('achievement text is required');
    const lang = language === 'ar' ? 'Arabic (modern standard, professional)' : 'English';
    const known = [role, context].filter(Boolean).join(' | ');
    const messages = [
        {
            role: 'system',
            content:
                `You are Nova, a friendly CV helper for PortNova (Port Said, Egypt). ` +
                `The user typed something in the "achievement" box. First DECIDE what kind of input it is, ` +
                `then respond. Return STRICT JSON (no markdown fences) with EXACTLY this shape:\n` +
                `{\n` +
                `  "type": "achievement" | "chat" | "clarify",\n` +
                `  "text": "your reply"\n` +
                `}\n\n` +
                `What you ACTUALLY know about this user (from their CV/profile) is in "known context". ` +
                `CRITICAL HONESTY RULE: you may ONLY reference facts that appear in that context. ` +
                `If the context is empty or lacks a job title, NEVER say you can see their CV or guess ` +
                `their job. Never invent names, roles, companies, numbers or achievements. ` +
                `Never say "I've got your CV" unless you were actually given CV data.\n\n` +
                `How to classify in ${lang}:\n` +
                `- If the input is a QUESTION or any non-achievement message (e.g. "can you see my CV?", ` +
                `"what do you do?", "who are you?", "thanks", "hello"): type "chat". Reply naturally and ` +
                `briefly in plain language. If you DO have real context, reference it ("I can see you work ` +
                `as [title]"). If you have NO context, be honest but still helpful: "I don't have your CV " + ` +
                `"details loaded yet - tell me one thing you accomplished in your job and I'll make it " + ` +
                `"stronger." NEVER mention APIs, prompts, AI or internal implementation.\n` +
                `- If the input is vague filler with no real content (e.g. "I did some things", "a lot of " + ` +
                `"stuff", "yes", "no", "idk", "nothing", gibberish): type "clarify". Do NOT invent any ` +
                `achievement, numbers or facts. Ask ONE short, plain question to get a real example.\n` +
                `- If the input asks to polish but gives no text (e.g. "polish it", "now improve it", ` +
                `"ok do it"): type "clarify" and ask them to paste the actual text: "Paste the line you " + ` +
                `"want improved and I'll make it stronger."\n` +
                `- Otherwise it is a real achievement: type "achievement". Rewrite it into ONE clear, strong CV line in ${lang}. ` +
                `Rules: 1) start with a strong action verb (led, built, grew, reduced, launched...); ` +
                `2) fix grammar, spelling, punctuation and casing errors in the original; ` +
                `3) be specific and show results; 4) ONLY use numbers or percentages the user actually mentioned - ` +
                `never invent metrics; if no metric was given, describe the impact with verbs; ` +
                `5) keep it one tight line (under ~28 words); 6) plain language, no corporate buzzwords.\n\n` +
                `Known context: ${known || '(none - do NOT pretend to know anything)'}\n` +
                `Plain ASCII punctuation only. Return ONLY the JSON object.`,
        },
        { role: 'user', content: text },
    ];
    const raw = await callDeepSeek(messages, { temperature: 0.35, maxTokens: 400, jsonMode: true });
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('Could not process that. Please try again.');
        }
        parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
    const type = ['achievement', 'chat', 'clarify'].includes(parsed?.type) ? parsed.type : 'achievement';
    return { improved: clean(parsed?.text || ''), type };
};

/* ---------------- Action 1b: comprehend a chat turn ---------------- */
// THE main-conversation fix. The CV builder's main chat used to be a dumb
// state machine: it force-stored every input as "the answer" with a canned
// acknowledgment, so "shoot"/"damn you"/"do you see my CV?" all got echoed
// back as if they were real answers. This action gives the model the FULL
// conversation history + the extracted CV text so it can actually understand
// what the user said, answer questions truthfully, and tell the frontend how
// to handle the turn.
const chatTurn = async (body) => {
    const {
        messages = [],       // full conversation: [{from:'user'|'bot', text}]
        cvText = '',         // extracted text from the uploaded CV (may be '')
        known = '',          // name/title we know about the user
        currentQuestion = '',// the question currently being asked
        language = 'en',
    } = body;
    const lang = language === 'ar' ? 'Arabic (modern standard, professional)' : 'English';

    if (!messages.length) throw new Error('messages are required');

    // Last user message is what we must comprehend.
    const transcript = messages
        .map((m) => `${m.from === 'user' ? 'User' : 'Nova'}: ${typeof m.text === 'string' ? m.text : '(message)'}`)
        .join('\n');

    const sys = [
        {
            role: 'system',
            content:
                `You are Nova, a friendly CV helper for PortNova (Port Said, Egypt). You are talking to the user ` +
                `while building their CV. You have the FULL conversation below, and optionally the text extracted ` +
                `from their uploaded CV (cvText). Your job is to comprehend the user's LAST message in context and ` +
                `respond like a real person - never parrot their words back, never say "we'll build on that" to ` +
                `something that was not an answer, never mention AI/APIs/prompts.` +
                `\n\n` +
                `FACTS YOU KNOW ABOUT THE USER: ${known || '(none yet)'}\n` +
                (cvText && cvText.trim() ? `CV TEXT (uploaded by user):\n${cvText.slice(0, 8000)}\n` : `CV TEXT: (none uploaded)\n`) +
                `CURRENT QUESTION BEING ASKED: ${currentQuestion || '(none)'}\n\n` +
                `Return STRICT JSON (no markdown fences) with EXACTLY this shape:\n` +
                `{\n` +
                `  "intent": "answer" | "question" | "clarify" | "filler" | "done",\n` +
                `  "reply": "your short, plain response in ${lang}",\n` +
                `  "answerText": "if intent is answer, the clean answer text to store for the current question; else empty string",\n` +
                `  "probe": "OPTIONAL - one precise follow-up question (string), or empty string \"\""\n` +
                `}\n\n` +
                `Decide the intent of the user's LAST message:\n` +
                `- "answer": they actually answered the current question with real info. Store their answer ` +
                `(cleaned) in answerText. Reply with a short acknowledgment that REFERENCES a specific detail they ` +
                `said (proves you understood - never just \"great!\"). Then decide if ONE precise follow-up (probe) ` +
                `would extract a genuinely valuable specific (a number, result, concrete example, or context) that ` +
                `would strengthen the CV. If yes, set probe to ONE short, precise question in ${lang} aimed at that ` +
                `specific. If not, probe = \"\". Rules for probe: NEVER probe for simple facts (name, email, phone, ` +
                `location, linkedin, languages); NEVER probe more than once per item; keep probe to ONE short ` +
                `question; prefer asking for concrete outcomes, numbers, or examples over vague details.\n` +
                `- "question": they asked YOU something (e.g. "do you see my CV?", "what is this?", "why ask?"). ` +
                `Reply truthfully. If cvText exists, say you have their CV and reference a real fact from it; if ` +
                `not, say you don't have their CV yet. Then gently return to the current question. answerText = "".\n` +
                `- "clarify": their message is unclear, partial, or needs a follow-up. Ask ONE short plain question ` +
                `to get what you need. answerText = "".\n` +
                `- "filler": vague or non-answer (e.g. "a lot", "I did some stuff", "yes", "no", "ok", "shoot", ` +
                `"damn", random gibberish). Do NOT treat it as an answer. Reply briefly and re-ask the current ` +
                `question (or move on if they clearly want to skip - use "done" for "skip"/"done"/"none"/"لا"). ` +
                `answerText = "".\n` +
                `- "done": they said done/skip/none for this item. answerText = "" and reply tells them we're moving on.\n\n` +
                `Rules: never invent facts; never mention internals; keep replies short (1-2 sentences); ` +
                `plain language, no corporate buzzwords; do not parrot their words. Plain ASCII punctuation only. ` +
                `Return ONLY the JSON object.`,
        },
        { role: 'user', content: transcript },
    ];

    const raw = await callDeepSeek(sys, { temperature: 0.4, maxTokens: 500, jsonMode: true });
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('Could not process that. Please try again.');
        }
        parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
    const validIntents = ['answer', 'question', 'clarify', 'filler', 'done'];
    return {
        intent: validIntents.includes(parsed?.intent) ? parsed.intent : 'filler',
        reply: clean(parsed?.reply || ''),
        answerText: clean(parsed?.answerText || ''),
        probe: clean(parsed?.probe || ''),
    };
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
                `You are Nova, a friendly CV helper for PortNova (Port Said, Egypt). ` +
                `The user uploaded their existing CV and the raw extracted text is below. ` +
                `Extract everything you can from it, then tell us ONLY what is missing or weak. ` +
                `The user already did the work - NEVER ask them to repeat what is in the CV. ` +
                `Talk like a normal person, not a consultant. Short, clear sentences. No jargon. ` +
                `Return STRICT JSON (no markdown fences) with EXACTLY this shape:\n` +
                `{\n` +
                `  "summary": "a friendly 1-2 sentence note about what you found, e.g. \\"I read your CV. I can see you're a Marketing Specialist with about 3 years of experience.\\" - reference their actual role and experience from the CV",\n` +
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
                `For "gaps": list at most 3 items, ONLY sections that are genuinely missing or too thin to use. ` +
                `ONE question per gap, short and plain, in ${lang}:\n` +
                `- no professional summary or it is a single line: gap "summary" -> "I don't see a short intro about you. What do you do, and what are you most proud of?"\n` +
                `- experience has no achievements: gap "achievements" -> "You mentioned you were a [role]. What's one thing you accomplished there you're proud of?"\n` +
                `- fewer than 3 technical skills: gap "technicalSkills" -> "What skills do you use most in your job?"\n` +
                `- education missing: gap "education" -> "I didn't see your education. What did you study, and where?"\n` +
                `- no target role/industry: gap "targetRole" -> "What kind of job are you looking for next?"\n` +
                `Never invent facts; only use what is in the CV. Keep every array (use [] when empty). ` +
                `Fill "extracted" with ONLY data actually found (empty string / [] when absent). ` +
                `Plain ASCII punctuation only.`,
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
                `You are Nova, a friendly CV helper for PortNova (Port Said, Egypt). ` +
                `Write a short, warm professional summary in ${lang} for the candidate described below. ` +
                `It should sound like a real person wrote it: correct grammar, confident but human, ` +
                `and matched to the job they want. 2-3 sentences max. Do NOT invent facts or numbers ` +
                `they did not state. Plain language, no corporate buzzwords. Return ONLY the summary text. Plain ASCII punctuation only.`,
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
                `You are Nova, a friendly CV helper for PortNova (Port Said, Egypt). ` +
                `The candidate's answers are below. Produce a clean, professional CV as STRICT JSON ` +
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
                `Clean up the candidate's raw answers before writing:\n` +
                `1) fix spelling, grammar, punctuation, spacing and inconsistent casing.\n` +
                `2) if answers conflict (e.g. "student" but years of experience), pick the honest, most sensible reading.\n` +
                `3) turn short or messy notes into clear, specific lines using ONLY the details provided - ` +
                `never invent numbers, dates, employers or credentials.\n` +
                `4) remove duplicates and junk from the skills lists.\n` +
                `5) write the summary in plain language, matched to the job they want.\n` +
                `Keep the header data (name, email, phone, location, title, linkedin) EXACTLY as ` +
                `provided - it lives outside this JSON. Return ONLY the JSON object, no markdown fences, no commentary. ` +
                `Plain language throughout - no corporate buzzwords.`,
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
            case 'chat':
                result = await chatTurn(payload);
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
