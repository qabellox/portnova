import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { analyzeCV, chatTurn, writeSummary, generateCV, buildLocalCV } from '../../services/cvBuilder';
import { extractCVText } from '../../services/cvText';
import OnboardingQuestions from './OnboardingQuestions';
import AchievementExtractor from './AchievementExtractor';
import CVPreview from './CVPreview';
import CVTemplates from './CVTemplates';
import CVDownload from './CVDownload';
import ProgressBar from './ProgressBar';
import { GlassCard, SectionHeading } from '../PremiumUI';
import '../../styles/cv-builder.css';

/* ----------------------------- flow config ----------------------------- */
const FLOW = [
    { key: 'name', askAr: 'ما اسمك الكامل الذي يظهر في السيرة؟', askEn: 'What is your full name, as it should appear on the CV?' },
    { key: 'email', askAr: 'ما بريدك الإلكتروني؟', askEn: 'What is your email?' },
    { key: 'phone', askAr: 'ما رقم هاتفك؟', askEn: 'What is your phone number?' },
    { key: 'location', askAr: 'أين تسكن؟ (المدينة والمحافظة)', askEn: 'Where do you live? (City and area)' },
    { key: 'title', askAr: 'ماذا تعمل حاليًا؟', askEn: 'What do you currently do?' },
    { key: 'summary', askAr: 'أخبرني عن نفسك بجملة أو جملتين - ماذا تعمل، وما أكثر شيء تفخر به؟', askEn: 'Tell me about yourself in a line or two - what do you do, and what are you most proud of?' },
    { key: 'education', askAr: 'ما أعلى مؤهل دراسي لديك، ومن أين حصلت عليه؟', askEn: 'What is your highest qualification, and where did you get it?' },
    { key: 'fieldOfStudy', askAr: 'ماذا درست؟', askEn: 'What did you study?' },
    { key: 'technicalSkills', askAr: 'ما الأدوات أو التقنيات التي تستخدمها فعلًا أكثر في عملك أو دراستك؟ اذكر 3 إلى 5.', askEn: 'Which 3-5 tools or technologies do you actually use most in your work or study?' },
    { key: 'softSkills', askAr: 'ما نقطة القوة الشخصية التي تساعدك أكثر؟ اذكر مثالًا قصيرًا.', askEn: 'Which one personal strength helps you most? Give a short example.' },
    { key: 'certifications', askAr: 'هل لديك شهادات أو دورات؟ اذكرها، أو اكتب "لا".', askEn: 'Do you have any certifications or courses? List them, or type "none".' },
    { key: 'languages', askAr: 'ما اللغات التي تتحدثها، وبأي مستوى؟ (أو "لا")', askEn: 'Which languages do you speak, and at what level? (or "none")' },
    { key: 'linkedin', askAr: 'هل لديك حساب لينكدإن؟ (اختياري)', askEn: 'Do you have a LinkedIn profile? (optional)' },
    { key: 'targetRole', askAr: 'ما المسمى الوظيفي المحدد الذي تستهدفه؟', askEn: 'What specific job title are you aiming for next?' },
    { key: 'targetIndustry', askAr: 'في أي مجال أو قطاع؟', askEn: 'In what field or industry?' },
];

const DONE_WORDS = ['done', 'تم', 'لا', 'لا يوجد', 'none', 'n/a', 'na', 'انتهيت', 'no'];
const isDone = (v) => DONE_WORDS.includes(String(v || '').trim().toLowerCase());
const SKIP_WORDS = ['skip', 'تخطي', 'تجاوز'];

// Filler / non-answers that must NEVER land in the CV as real data, and must
// never trigger a follow-up question. E.g. "a lot", "N/A", "idk", "some".
const FILLER_WORDS = [
    'a lot', 'lots', 'lots of', 'many', 'some', 'yes', 'yep', 'yeah', 'ya',
    'no', 'n/a', 'na', 'none', 'nothing', 'idk', 'dunno', 'not sure', 'etc',
    'whatever', 'fine', 'ok', 'okay', 'كثير', 'كثيرًا', 'نعم', 'لا', 'لا شيء',
    'لا يوجد', 'مش عارف', 'مش متأكد', 'ما أدري', 'أي شيء',
];
const isFiller = (v) => FILLER_WORDS.includes(String(v || '').trim().toLowerCase());

// Pushback phrases ("is it necessary?", "do I need this?"...) deserve a
// reassuring explanation instead of a canned acknowledgment.
const PUSHBACK = /is it (necessary|required|needed)|do i (need|have to)|why (do you|are you asking|ask)|really need|لازم|ضروري|هل هذا ضروري|مش لازم|ليه|ليش|ما في داعي/i;

const cleanString = (v) => String(v || '').replace(/\s+/g, ' ').trim();

const isArabicText = (v) => /[\u0600-\u06FF]/.test(v);

// Friendly English title-casing for names and job titles (Arabic left as-is).
const titleCase = (v) => {
    const s = cleanString(v);
    if (!s || isArabicText(s)) return s;
    return s
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/\b(and|of|the|for|in|at|with|on)\b/gi, (w) => w.toLowerCase());
};

const splitList = (v) =>
    [...new Set(
        String(v || '')
            .split(/[,،;؛\n]+/)
            .map((s) => cleanString(s))
            .filter((s) => s && !isFiller(s))
    )];

const parseLanguages = (v) =>
    splitList(v).map((item) => {
        const m = item.match(/^(.*?)\s*[\(（](.*?)[\)）]\s*$/);
        if (m) return { name: cleanString(m[1]), level: cleanString(m[2]) };
        return { name: item, level: '' };
    });

const parseJob = (v) => {
    const m = String(v).match(/^\s*(.*?)\s*(?:@| at | - |-)\s*(.*?)\s*(?:\(([^)]*)\))?\s*$/);
    if (m) return { role: titleCase(m[1]), company: titleCase(m[2]), dates: cleanString(m[3]) };
    return { role: titleCase(String(v)), company: '', dates: '' };
};

const DEFAULT_DATA = {
    name: '', email: '', phone: '', location: '', title: '', summary: '',
    education: '', fieldOfStudy: '', technicalSkills: [], softSkills: [],
    certifications: [], languages: [], linkedin: '',
    targetRole: '', targetIndustry: '', experience: [],
};

let messageSeq = 1;
const nextId = () => `cv-msg-${messageSeq++}`;

/* ------------------------------ component ------------------------------ */
const CVBuilder = ({ initialCvPath = '', initialCvName = '' }) => {
    const { isArabic } = useLanguage();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [busy, setBusy] = useState(false);
    // Seed from the saved profile (ProfileGate) so the agent starts fluent:
    // name/email/phone/location are already known and their questions are skipped.
    const [data, setData] = useState(() => {
        const meta = user?.user_metadata || {};
        return {
            ...DEFAULT_DATA,
            name: meta.fullName || '',
            email: user?.email || '',
            phone: meta.phone || '',
            location: meta.location || '',
            cvPath: initialCvPath || meta.cvPath || '',
        };
    });
    const [flowIndex, setFlowIndex] = useState(0);
    const [phase, setPhase] = useState('intro'); // intro | questions | experience | achievements | summary | done
    const [cv, setCv] = useState(null);
    const [template, setTemplate] = useState('modern');
    const [error, setError] = useState('');
    // Adaptive follow-ups: which question is being clarified, and whether we're
    // waiting for a missing company name after a job was logged.
    const [clarify, setClarify] = useState(null);
    const [askCompanyFor, setAskCompanyFor] = useState(null);
    // Uploaded-CV state: gap-based questions the agent asks ONLY about missing
    // or weak sections, so the user never repeats what is already in their CV.
    const [gapQueue, setGapQueue] = useState([]);
    const [gapIndex, setGapIndex] = useState(0);
    const [cvAnalyzed, setCvAnalyzed] = useState(false);
    // Extracted text from the uploaded CV - passed to the chat action so the
    // agent can truthfully answer "do you see my CV?" and never hallucinate.
    const [cvText, setCvText] = useState('');
    // Mid-conversation CV upload (user can attach a CV they forgot earlier).
    const [attachUploading, setAttachUploading] = useState(false);
    const attachInputRef = useRef(null);
    // Precise follow-up probe from the AI: after a substantial answer it asks ONE
    // targeted question to extract valuable specifics, then returns to the core
    // flow. { key, question }
    const [probe, setProbe] = useState(null);

    const pushBot = (text) => setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text }]);
    const pushUser = (text) => setMessages((prev) => [...prev, { id: nextId(), from: 'user', text }]);
    const pushNode = (node) => setMessages((prev) => [...prev, { id: nextId(), from: 'bot', node }]);

    const say = (ar, en) => (isArabic ? ar : en);

    /* ---- progress ---- */
    const progress = useMemo(() => {
        if (phase === 'done') return 100;
        if (phase === 'summary') return 88;
        if (phase === 'achievements') return 76;
        if (phase === 'experience') return 66;
        if (phase === 'cvgaps') return 55;
        if (phase === 'questions') return 12 + Math.round((flowIndex / FLOW.length) * 52);
        return 4;
    }, [phase, flowIndex]);

    const phaseLabel =
        phase === 'done' ? say('اكتمل بناء سيرتك الذاتية ✨', 'Your CV is ready ✨')
            : phase === 'summary' ? say('كتابة الملخص الاحترافي…', 'Writing your professional summary…')
                : phase === 'achievements' ? say('استخراج الإنجازات المميّزة', 'Extracting standout achievements')
                    : phase === 'experience' ? say('الخبرة العملية', 'Work experience')
                        : phase === 'cvgaps' ? say('تحسين سيرتك المرفوعة', 'Enhancing your uploaded CV')
                            : say('أسئلة التهيئة', 'Onboarding questions');

    /* ------------------------- kick-off on mount ------------------------- */
    useEffect(() => {
        // Use the context language (first render) - document lang isn't set yet
        // because this effect runs before the LanguageProvider's own effect.
        const arabic = isArabic;
        const name = data.name;
        // Skip onboarding questions already answered in the saved profile.
        const startIndex = Math.max(0, FLOW.findIndex((q) => !String(data[q.key] || '').trim()));

        const welcome = arabic
            ? name
                ? `أهلًا بعودتك يا ${name} 👋 أنا مستشار السيرة الذاتية من PortNova. بياناتك الأساسية محفوظة - لنكمل بناء سيرتك معًا.`
                : 'أهلًا بك 👋 أنا مستشار السيرة الذاتية من PortNova.\nسأعمل معك خطوة بخطوة لأبني سيرة ذاتية تعرض أفضل ما في مسيرتك وتفتح لك الأبواب في سوق عمل بورسعيد.'
            : name
                ? `Welcome back, ${name}! 👋 I’m your PortNova CV Consultant. Your basic details are saved - let’s keep building your CV together.`
                : 'Welcome! 👋 I’m your PortNova CV Consultant.\nI’ll work with you step by step to build a CV that showcases the best of your career and opens doors in Port Said’s job market.';

        setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: welcome }]);
        setFlowIndex(startIndex);

        // If an existing CV was uploaded (cvPath saved on the CV service page),
        // extract + analyze it FIRST so the agent builds on it and only asks
        // about missing/weak sections. The user never repeats what is in the CV.
        // NOTE: fetch FRESH metadata - the user object in context may be stale
        // right after the upload (updateUser from the CV page), which is why
        // the agent used to claim it had no CV even after uploading.
        let cancelled = false;
        let cvFound = false; // set true when a CV is being processed (stops the normal timer)
        (async () => {
            let cvPath = data.cvPath;
            try {
                const { data: fresh } = await supabase.auth.getUser();
                const freshPath = fresh?.user?.user_metadata?.cvPath;
                if (freshPath) cvPath = freshPath;
            } catch { /* keep existing */ }
            if (!cvPath) return; // no CV uploaded - normal flow continues below
            cvFound = true;

            setTyping(true);
            try {
                const { data: file, error: dlErr } = await supabase.storage.from('cvs').download(cvPath);
                if (cancelled) return;
                if (dlErr || !file) throw dlErr || new Error('no file');
                // NOTE: the downloaded blob has no `.name`, so pass the storage
                // path as a hint so PDF detection works (cvPath ends in .pdf).
                const text = await extractCVText(file, cvPath);
                if (cancelled) return;
                if (!text.trim()) {
                    // Couldn't read the file - tell the user honestly, then fall
                    // back to the normal flow so they are never blocked.
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: nextId(),
                            from: 'bot',
                            text: arabic
                                ? 'استلمت ملف سيرتك، لكن لم أجد نصًا قابلًا للقراءة فيه - قد يكون نسخة ممسوحة ضوئيًا بلا طبقة نصية. لا مشكلة، سأسألك خطوة بخطوة وأبني سيرتك من إجاباتك.'
                                : 'I got your uploaded CV, but couldn’t find readable text in it - it may be a scanned image with no text layer. No problem, I’ll ask you step by step and build your CV from your answers.',
                        },
                    ]);
                    if (startIndex >= FLOW.length) {
                        setPhase('experience');
                    } else {
                        setPhase('questions');
                        const first = FLOW[startIndex];
                        setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: arabic ? first.askAr : first.askEn }]);
                    }
                    setTyping(false);
                    return;
                }
                setCvText(text); // keep the CV text for the whole conversation
                // Analyze with AI: extract structured data + gaps.
                const analysis = await analyzeCV(text, arabic ? 'ar' : 'en', {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    location: data.location,
                    title: data.title,
                });
                if (cancelled) return;
                const ex = analysis?.extracted || {};
                const gapList = Array.isArray(analysis?.gaps) ? analysis.gaps : [];

                // Seed data from the CV (only fields actually found).
                setData((prev) => ({
                    ...prev,
                    name: ex.name || prev.name,
                    email: ex.email || prev.email,
                    phone: ex.phone || prev.phone,
                    location: ex.location || prev.location,
                    title: ex.title || prev.title,
                    education: ex.education || prev.education,
                    fieldOfStudy: ex.fieldOfStudy || prev.fieldOfStudy,
                    technicalSkills: Array.isArray(ex.technicalSkills) && ex.technicalSkills.length ? ex.technicalSkills : prev.technicalSkills,
                    softSkills: Array.isArray(ex.softSkills) && ex.softSkills.length ? ex.softSkills : prev.softSkills,
                    certifications: Array.isArray(ex.certifications) && ex.certifications.length ? ex.certifications : prev.certifications,
                    languages: Array.isArray(ex.languages) && ex.languages.length ? ex.languages : prev.languages,
                    experience: Array.isArray(ex.experience) && ex.experience.length ? ex.experience : prev.experience,
                }));

                // Acknowledge what the agent found, then ask only about gaps.
                const found = analysis?.summary
                    ? analysis.summary
                    : arabic
                        ? 'حلّلت سيرتك المرفوعة ✅ سأبني عليها لنحقق أفضل نسخة منها.'
                        : 'I’ve analyzed your uploaded CV ✅ I’ll build on it to make it the best version possible.';
                setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: found }]);
                setCvAnalyzed(true);

                if (gapList.length) {
                    setGapQueue(gapList);
                    setGapIndex(0);
                    setPhase('cvgaps');
                    setTyping(true);
                    window.setTimeout(() => {
                        setTyping(false);
                        setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: gapList[0].question }]);
                    }, 900);
                } else {
                    // No gaps - the CV is complete; go straight to experience.
                    setPhase('experience');
                    setTyping(true);
                    window.setTimeout(() => {
                        setTyping(false);
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: nextId(),
                                from: 'bot',
                                text: arabic
                                    ? 'ملفك مكتمل تقريبًا 🎉 لنستعرض مسارك المهني سويًا.\nأخبرني بأي دور إضافي أو تفصيل تريد إضافته، أو اكتب "انتهيت" لنتابع.'
                                    : 'Your profile looks fairly complete 🎉 Let’s review your career path together.\nTell me about any extra role or detail you’d like to add, or type "done" to continue.',
                            },
                        ]);
                    }, 900);
                }
            } catch (err) {
                if (cancelled) return;
                // Analysis failed - never block the user; fall back gracefully.
                console.error('CV analyze failed:', err);
                if (startIndex >= FLOW.length) {
                    setPhase('experience');
                } else {
                    setPhase('questions');
                    const first = FLOW[startIndex];
                    setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: arabic ? first.askAr : first.askEn }]);
                }
            } finally {
                if (!cancelled) setTyping(false);
            }
        })();

        const timer = window.setTimeout(() => {
            if (cvFound) return; // CV analysis owns the flow - don't override it
            if (startIndex >= FLOW.length) {
                // Everything is already known from the profile - straight to experience.
                setPhase('experience');
                setMessages((prev) => [
                    ...prev,
                    {
                        id: nextId(),
                        from: 'bot',
                        text: arabic
                            ? 'بياناتك محفوظة بالكامل 🎉 لننتقل إلى مسارك المهني.\nأخبرني عن كل دور عملت فيه: الدور @ الشركة (التواريخ). مثال: "أخصائي تسويق @ Nova Labs (2022-2024)".\nاكتب "انتهيت" عند الانتهاء.'
                            : 'Your profile is fully saved 🎉 Let’s move to your career progression.\nTell me about each role: position @ company (dates). e.g. "Marketing Specialist @ Nova Labs (2022-2024)".\nType "done" when finished.',
                    },
                ]);
            } else {
                const first = FLOW[startIndex];
                setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: arabic ? first.askAr : first.askEn }]);
                setPhase('questions');
            }
        }, 900);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, []);

    /* ------------------- mid-conversation CV upload ------------------- */
    // Let the user attach a CV in the middle of the chat if they forgot to
    // upload it before starting. Uploads to the `cvs` bucket, extracts the
    // text so the agent can read it immediately, and acknowledges in chat.
    const onAttachCv = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
            pushBot(isArabic ? 'يُسمح بملفات PDF أو DOCX أو TXT فقط.' : 'Only PDF, DOCX or TXT files are allowed.');
            if (attachInputRef.current) attachInputRef.current.value = '';
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            pushBot(isArabic ? 'الملف كبير جدًا. الحد الأقصى 50 ميجابايت.' : 'File is too large. Maximum is 50MB.');
            if (attachInputRef.current) attachInputRef.current.value = '';
            return;
        }
        setAttachUploading(true);
        // Safety net: never let the loading state stick forever.
        const safety = window.setTimeout(() => setAttachUploading(false), 30000);
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${user.id}/cv_${Date.now()}_${safeName}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('cvs')
                .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true });
            if (upErr) throw upErr;
            await supabase.auth.updateUser({ data: { cvPath: path, cvName: file.name } });

            // Extract the text so the agent can actually read it.
            const text = await extractCVText(file);
            if (text.trim()) {
                setCvText(text);
                setData((prev) => ({ ...prev, cvPath: path }));
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: nextId(),
                    from: 'user',
                    text: isArabic ? `أرفقت سيرتي: ${file.name} 📄` : `Attached my CV: ${file.name} 📄`,
                },
            ]);
            pushBot(
                text.trim()
                    ? (isArabic
                        ? 'استلمت سيرتك! قرأتها وسأبني عليها. ✅'
                        : 'Got your CV! I’ve read it and I’ll build on it. ✅')
                    : (isArabic
                        ? 'استلمت الملف، لكن لم أجد نصًا قابلًا للقراءة فيه - قد يكون نسخة ممسوحة ضوئيًا بلا طبقة نصية. أخبرني ببياناتك وسأبني سيرتك منها.'
                        : 'I received the file, but couldn’t find readable text in it - it may be a scanned image with no text layer. Tell me your details and I’ll build your CV from them.')
            );
        } catch (err) {
            console.error('Attach CV failed:', err);
            // Surface the REAL error so failures are diagnosable.
            pushBot(
                isArabic
                    ? `تعذّر معالجة الملف: ${err?.message || 'خطأ غير معروف'}`
                    : `Could not process that file: ${err?.message || 'unknown error'}`
            );
        } finally {
            window.clearTimeout(safety);
            setAttachUploading(false);
            if (attachInputRef.current) attachInputRef.current.value = '';
        }
    };

    /* ------------------------- store + advance flow ------------------------- */
    const storeValue = (key, raw, append = false) => {
        const next = { ...data };
        const v = cleanString(raw);
        const isNonAnswer = isDone(raw) || isFiller(raw);
        const mergeList = (existing) => [...new Set([...(existing || []), ...splitList(raw)])];
        switch (key) {
            case 'technicalSkills': next.technicalSkills = append ? mergeList(data.technicalSkills) : splitList(raw); break;
            case 'softSkills': next.softSkills = append ? mergeList(data.softSkills) : splitList(raw); break;
            case 'certifications':
                next.certifications = isNonAnswer ? [] : splitList(raw).map((name) => ({ name, issuer: '', year: '' }));
                break;
            case 'languages': next.languages = isNonAnswer ? [] : parseLanguages(raw); break;
            case 'linkedin': next.linkedin = isNonAnswer ? '' : v; break;
            case 'education': next.education = isNonAnswer ? '' : titleCase(v); break;
            case 'fieldOfStudy': next.fieldOfStudy = isNonAnswer ? '' : titleCase(v); break;
            case 'summary':
                if (isNonAnswer) next.summary = next.summary || '';
                else if (append) next.summary = next.summary ? `${next.summary} ${v}` : v;
                else next.summary = v;
                break;
            case 'name': next.name = isNonAnswer ? '' : titleCase(v); break;
            case 'title': next.title = isNonAnswer ? '' : titleCase(v); break;
            case 'location': next.location = isNonAnswer ? '' : titleCase(v); break;
            default: next[key] = isNonAnswer ? '' : v;
        }
        setData(next);
        return next;
    };

    // Ask a gentle follow-up when an answer is too thin to build a strong CV,
    // but never when the user clearly gave a non-answer ("a lot", "N/A"...).
    const needsClarify = (key, raw) => {
        if (isDone(raw) || isFiller(raw)) return false;
        if (key === 'summary') return cleanString(raw).length < 24;
        if (key === 'technicalSkills' || key === 'softSkills') return splitList(raw).length < 2;
        return false;
    };

    const clarifyMsg = (key) =>
        key === 'summary'
            ? say(
                'هل يمكنك إضافة سطر آخر؟ مثلًا: ما أكثر إنجاز تفخر به؟',
                'Could you add one more line? Like: what accomplishment are you most proud of?'
              )
            : say(
                'هل يمكنك إضافة مهارة أو مهارتين أخريين؟',
                'Could you add one or two more skills?'
              );

    const nextQuestion = () => {
        const idx = flowIndex + 1;
        if (idx < FLOW.length) {
            setFlowIndex(idx);
            const q = FLOW[idx];
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                pushBot(say(q.askAr, q.askEn));
            }, 600);
        } else {
            // Questions done → experience (adapts to whether they're a student)
            const isStudent = /طالب|student|متدرب|intern/i.test(data.title || '');
            setPhase('experience');
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                pushBot(
                    say(
                        isStudent
                            ? 'ممتاز! 🎉 هل لديك أي تدريب أو عمل جزئي أو مشاريع؟\nأخبرني عن واحد: الدور @ الجهة (التواريخ). مثال: "متدرب تطوير @ Nova Labs (2024)".\nاكتب "انتهيت" إن لم يتوفر شيء.'
                            : 'ممتاز! 🎉 الآن عن عملك.\nأخبرني عن كل دور عملت فيه: الدور @ الشركة (التواريخ). مثال: "أخصائي تسويق @ Nova Labs (2022-2024)".\nاكتب "انتهيت" عند الانتهاء.',
                        isStudent
                            ? 'Great! 🎉 Do you have any internships, part-time work or projects?\nTell me about one: role @ organisation (dates). e.g. "Dev Intern @ Nova Labs (2024)".\nType "done" if you have none.'
                            : 'Great! 🎉 Now about your work.\nTell me about each role: position @ company (dates). e.g. "Marketing Specialist @ Nova Labs (2022-2024)".\nType "done" when finished.'
                    )
                );
            }, 700);
        }
    };

    const askNextAchievement = (job) => {
        // Pass what we ACTUALLY know (name + this role) so Nova never
        // hallucinates the user's job or pretends to have info it lacks.
        const knownContext = [data.name, job?.role, data.title].filter(Boolean).join(', ');
        pushNode(
            <AchievementExtractor
                role={job?.role}
                context={knownContext}
                onAccept={(bullet) => {
                    const next = { ...data };
                    const jobs = next.experience.map((j) => (j._id === job._id ? { ...j, bullets: [...(j.bullets || []), bullet] } : j));
                    next.experience = jobs;
                    setData(next);
                    askNextAchievement(job);
                }}
                onDone={() => {
                    setPhase('experience');
                    pushBot(
                        say(
                            'ممتاز! هل لديك دور آخر تضيفه؟ أخبرني به (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت".',
                            'Great! Do you have another role to add? Tell me (role @ company (dates)) or type "done".'
                        )
                    );
                }}
            />
        );
    };

    /* ------------------------- main answer handler ------------------------- */
    // Enrich a stored field with the probe answer (merges lists, appends to
    // summary, adds an experience row for achievements).
    const appendToField = (key, value) => {
        const v = cleanString(value);
        if (!v || isFiller(v) || isDone(v)) return;
        if (key === 'technicalSkills' || key === 'softSkills') {
            setData((prev) => ({ ...prev, [key]: [...new Set([...(prev[key] || []), ...splitList(v)])] }));
        } else if (key === 'certifications' || key === 'languages') {
            setData((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...splitList(v).map((n) => (key === 'certifications' ? { name: n, issuer: '', year: '' } : { name: n, level: '' }))] }));
        } else if (key === 'summary') {
            setData((prev) => ({ ...prev, summary: prev.summary ? `${prev.summary} ${v}` : v }));
        } else if (key === 'achievements' || key === 'experience') {
            const job = { _id: `${Date.now()}`, ...parseJob(v), bullets: [] };
            setData((prev) => ({ ...prev, experience: job.role ? [...prev.experience, job] : prev.experience }));
        } else {
            setData((prev) => ({ ...prev, [key]: prev[key] ? `${prev[key]} ${v}` : v }));
        }
    };

    // Move to the next gap question (or into the career phase) after a probe.
    const advanceGap = () => {
        const nextGap = gapIndex + 1;
        if (nextGap < gapQueue.length) {
            setGapIndex(nextGap);
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                pushBot(gapQueue[nextGap].question);
            }, 700);
        } else {
            setGapIndex(nextGap);
            setPhase('experience');
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                pushBot(
                    say(
                        'ممتاز - سأدمج كل هذا في سيرتك. 🎉 لننتقل الآن إلى مسارك المهني.\nأخبرني بأي دور إضافي تريد إضافته (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت" لنكمل.',
                        'Excellent - I’ll fold all of that into your CV. 🎉 Now let’s cover your career path.\nTell me about any extra role to add (role @ company (dates)) or type "done" to continue.'
                    )
                );
            }, 700);
        }
    };

    const handleSend = (raw) => {
        pushUser(raw);
        setInput(''); // clear the reply box so it's ready for the next answer

        // If a precise follow-up (probe) is pending, this message answers it:
        // enrich the field, then return to the core flow.
        if (probe) {
            const probeKey = probe.key;
            const probeQuestion = probe.question;
            setProbe(null);
            const known = [data.name, data.title, data.location].filter(Boolean).join(', ');
            const history = [...messages, { from: 'user', text: raw }];
            setTyping(true);
            chatTurn({
                messages: history,
                cvText,
                known,
                currentQuestion: probeQuestion,
                language: isArabic ? 'ar' : 'en',
            })
                .then((res) => {
                    setTyping(false);
                    const intent = res?.intent || 'filler';
                    const reply = res?.reply || '';
                    const answerText = res?.answerText || '';
                    if (intent === 'answer' && (answerText || raw.trim()) && !isFiller(raw) && !isDone(raw)) {
                        appendToField(probeKey, answerText || raw);
                        if (reply) pushBot(reply);
                    } else if (intent === 'done') {
                        if (reply) pushBot(reply);
                    } else {
                        if (reply) pushBot(reply);
                        else pushBot(isArabic ? 'فهمتك - لنكمل.' : 'Got it - let’s keep going.');
                    }
                    // Return to the core flow.
                    if (phase === 'cvgaps') advanceGap();
                    else nextQuestion();
                })
                .catch(() => {
                    setTyping(false);
                    if (phase === 'cvgaps') advanceGap();
                    else nextQuestion();
                });
            return;
        }

        /* phase: cv gaps (built on the uploaded CV - only missing/weak items) */
        if (phase === 'cvgaps') {
            const gap = gapQueue[gapIndex];
            if (!gap) {
                // All gaps addressed - move to career progression.
                setPhase('experience');
                setTyping(true);
                setTimeout(() => {
                    setTyping(false);
                    pushBot(
                        say(
                            'ممتاز - سأدمج كل هذا في سيرتك. 🎉 لننتقل الآن إلى مسارك المهني.\nأخبرني بأي دور إضافي تريد إضافته (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت" لنكمل.',
                            'Excellent - I’ll fold all of that into your CV. 🎉 Now let’s cover your career path.\nTell me about any extra role to add (role @ company (dates)) or type "done" to continue.'
                        )
                    );
                }, 600);
                return;
            }

            // Comprehension-first for gap answers too: send the conversation
            // INCLUDING the current user message + CV text so questions ("do
            // you see my CV?") and off-topic inputs are understood instead of
            // force-stored as answers.
            const known = [data.name, data.title, data.location].filter(Boolean).join(', ');
            const history = [...messages, { from: 'user', text: raw }];
            setTyping(true);
            chatTurn({
                messages: history,
                cvText,
                known,
                currentQuestion: gap.question,
                language: isArabic ? 'ar' : 'en',
            })
                .then((res) => {
                    setTyping(false);
                    const intent = res?.intent || 'filler';
                    const reply = res?.reply || '';
                    const answerText = res?.answerText || '';
                    const key = gap.key;

                    const storeGapAnswer = () => {
                        const value = answerText || raw;
                        if (isFiller(value) || isDone(value)) return;
                        if (key === 'achievements' || key === 'experience') {
                            const job = { _id: `${Date.now()}`, ...parseJob(value), bullets: [] };
                            setData((prev) => ({
                                ...prev,
                                experience: key === 'experience' && job.role ? [...prev.experience, job] : prev.experience,
                            }));
                        } else if (key === 'summary' || key === 'targetRole' || key === 'targetIndustry') {
                            setData((prev) => ({ ...prev, [key]: cleanString(value) }));
                        } else {
                            storeValue(key, value);
                        }
                    };

                    if (intent === 'answer') {
                        storeGapAnswer();
                        if (reply) pushBot(reply);
                        // Precise follow-up to enrich the gap answer before moving on.
                        if (res?.probe) {
                            setProbe({ key, question: res.probe });
                            pushBot(res.probe);
                            return; // wait for the probe answer, then advance
                        }
                    } else if (intent === 'done') {
                        if (reply) pushBot(reply);
                    } else {
                        // question / clarify / filler: don't advance, just reply.
                        if (reply) pushBot(reply);
                        else pushBot(isArabic ? 'لم أفهم تمامًا - هل يمكنك توضيح ذلك؟' : 'Sorry - could you clarify that?');
                        return; // stay on this gap
                    }

                    const nextGap = gapIndex + 1;
                    if (nextGap < gapQueue.length) {
                        setGapIndex(nextGap);
                        setTyping(true);
                        setTimeout(() => {
                            setTyping(false);
                            pushBot(gapQueue[nextGap].question);
                        }, 700);
                    } else {
                        setGapIndex(nextGap);
                        setPhase('experience');
                        setTyping(true);
                        setTimeout(() => {
                            setTyping(false);
                            pushBot(
                                say(
                                    'ممتاز - سأدمج كل هذا في سيرتك. 🎉 لننتقل الآن إلى مسارك المهني.\nأخبرني بأي دور إضافي تريد إضافته (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت" لنكمل.',
                                    'Excellent - I’ll fold all of that into your CV. 🎉 Now let’s cover your career path.\nTell me about any extra role to add (role @ company (dates)) or type "done" to continue.'
                                )
                            );
                        }, 700);
                    }
                })
                .catch(() => {
                    setTyping(false);
                    // Fallback: store plainly and move on so the flow never blocks.
                    const key = gap.key;
                    if (key === 'achievements' || key === 'experience') {
                        const job = { _id: `${Date.now()}`, ...parseJob(raw), bullets: [] };
                        setData((prev) => ({ ...prev, experience: key === 'experience' && job.role ? [...prev.experience, job] : prev.experience }));
                    } else if (key === 'summary' || key === 'targetRole' || key === 'targetIndustry') {
                        setData((prev) => ({ ...prev, [key]: cleanString(raw) }));
                    } else {
                        storeValue(key, raw);
                    }
                    const nextGap = gapIndex + 1;
                    if (nextGap < gapQueue.length) {
                        setGapIndex(nextGap);
                        setTimeout(() => pushBot(gapQueue[nextGap].question), 600);
                    } else {
                        setGapIndex(nextGap);
                        setPhase('experience');
                    }
                });
            return;
        }

        /* phase: questions */
        if (phase === 'questions') {
            const q = FLOW[flowIndex];

            // Comprehension-first: send the full conversation + the CURRENT
            // user message + CV text to the agent so it actually UNDERSTANDS
            // what the user said (answer / question / clarify / filler / done)
            // instead of blindly treating every input as an answer.
            // NOTE: `pushUser` updates state async, so we must build the
            // history INCLUDING this message ourselves - otherwise the agent
            // only ever sees the bot's last question and gets confused.
            const known = [data.name, data.title, data.location].filter(Boolean).join(', ');
            const history = [...messages, { from: 'user', text: raw }];
            setTyping(true);
            chatTurn({
                messages: history,
                cvText,
                known,
                currentQuestion: isArabic ? q.askAr : q.askEn,
                language: isArabic ? 'ar' : 'en',
            })
                .then((res) => {
                    setTyping(false);
                    const intent = res?.intent || 'filler';
                    const reply = res?.reply || '';
                    const answerText = res?.answerText || '';

                    if (intent === 'answer') {
                        // Real answer - store it, ack, and move on.
                        if (answerText || raw.trim()) {
                            storeValue(q.key, answerText || raw);
                        }
                        if (reply) pushBot(reply);
                        if (res?.probe) {
                            // Ask the AI's precise follow-up, then return to the core flow.
                            setProbe({ key: q.key, question: res.probe });
                            pushBot(res.probe);
                        } else if (needsClarify(q.key, raw)) {
                            setClarify(q.key);
                            pushBot(clarifyMsg(q.key));
                        } else {
                            nextQuestion();
                        }
                    } else if (intent === 'done') {
                        // User wants to skip this item.
                        if (reply) pushBot(reply);
                        nextQuestion();
                    } else {
                        // question / clarify / filler: do NOT store, do NOT
                        // advance - the agent answered or re-asked. Just show it.
                        if (reply) pushBot(reply);
                        else {
                            // No reply came back - re-ask politely.
                            pushBot(isArabic ? 'لم أفهم تمامًا - هل يمكنك توضيح ذلك؟' : 'Sorry - could you clarify that?');
                        }
                    }
                })
                .catch(() => {
                    setTyping(false);
                    // Fallback if the AI is unreachable - store it plainly and
                    // move on so the flow never dead-ends.
                    storeValue(q.key, raw);
                    nextQuestion();
                });
            return;
        }

        /* phase: experience (collect job descriptors) */
        if (phase === 'experience') {
            if (isDone(raw)) {
                if (!data.experience.length) {
                    pushBot(say('لا مشكلة - سنركّز على مهاراتك وتعليمك.', 'No problem - we’ll focus on your skills and education.'));
                }
                beginSummary();
                return;
            }

            // We're waiting for a missing company name for the job just logged.
            if (askCompanyFor) {
                const comp = isDone(raw) || SKIP_WORDS.includes(cleanString(raw).toLowerCase())
                    ? ''
                    : cleanString(raw).replace(/^at\s+/i, '');
                setData((prev) => ({
                    ...prev,
                    experience: prev.experience.map((j) => (j._id === askCompanyFor ? { ...j, company: titleCase(comp) } : j)),
                }));
                setAskCompanyFor(null);
                const job = data.experience.find((j) => j._id === askCompanyFor) || { _id: askCompanyFor, role: '' };
                setPhase('achievements');
                setTyping(true);
                setTimeout(() => {
                    setTyping(false);
                    pushBot(
                        say(
                            `تم التسجيل! أخبرني الآن بإنجاز واحد في دور "${job.role || 'هذا الدور'}" تفخر به. اكتب "تم" عند الانتهاء.`,
                            `Logged! Now tell me one achievement in "${job.role || 'this role'}" you’re proud of. Type "done" when finished.`
                        )
                    );
                    askNextAchievement(job);
                }, 600);
                return;
            }

            const job = { _id: `${Date.now()}`, ...parseJob(raw), bullets: [] };
            const updated = { ...data, experience: [...data.experience, job] };
            setData(updated);

            // If no company came with the role, ask for it - a real consultant would.
            if (!job.company) {
                setAskCompanyFor(job._id);
                setTyping(true);
                setTimeout(() => {
                    setTyping(false);
                    pushBot(
                        say(
                            `في أي جهة عملت بدور "${job.role}"؟ (أو اكتب "تخطي")`,
                            `Which company did you work for as "${job.role}"? (or type "skip")`
                        )
                    );
                }, 600);
                return;
            }

            setPhase('achievements');
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                pushBot(
                    say(
                        `تم تسجيل "${job.role}" في ${job.company} 🙌\nأخبرني بإنجاز واحد تفخر به في هذا الدور، أو اكتب "تم" للانتهاء.`,
                        `Logged "${job.role}" at ${job.company} 🙌\nTell me one achievement you’re proud of in this role, or type "done" to finish.`
                    )
                );
                askNextAchievement(job);
            }, 600);
            return;
        }

        /* phase: achievements (user says "done" to close the current job) */
        if (phase === 'achievements') {
            if (isDone(raw)) {
                setPhase('experience');
                pushBot(
                    say(
                        'ممتاز! هل لديك دور آخر تضيفه؟ أخبرني به (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت".',
                        'Great! Do you have another role to add? Tell me (role @ company (dates)) or type "done".'
                    )
                );
            } else {
                pushBot(say('اكتب إنجازك في الصندوق أعلاه وسأجعله أفضل ✨', 'Type your achievement in the box above and I’ll make it better ✨'));
            }
            return;
        }

        /* phase: summary (allow "تعديل: ...") */
        if (phase === 'summary') {
            const lower = raw.toLowerCase();
            if (lower.startsWith('تعديل') || lower.startsWith('edit:')) {
                const newSummary = raw.replace(/^(تعديل\s*[:：]?|edit\s*[:：]?)/i, '').trim();
                setData((prev) => ({ ...prev, summary: newSummary }));
                pushBot(say('تم تحديث الملخص ✅', 'Summary updated ✅'));
            }
            finishToGenerate();
            return;
        }
    };

    /* ------------------------- summary + generate ------------------------- */
    const beginSummary = async () => {
        setPhase('summary');
        setBusy(true);
        pushBot(
            say(
                `فهمتك! ${data.name || ''}، ${data.title || 'محترف'} من ${data.location || 'بورسعيد'} - تبحث عن ${data.targetRole || 'وظيفة'} في ${data.targetIndustry || 'مجالك'}.`,
                `Got it! ${data.name || ''} - a ${data.title || 'professional'} from ${data.location || 'Port Said'}, looking for ${data.targetRole || 'a job'} in ${data.targetIndustry || 'your field'}.`
            )
        );
        pushBot(say('أكتب لك الآن سطرًا قصيرًا عنك…', 'I’m writing a short intro about you…'));
        try {
            const { summary } = await writeSummary(data, isArabic ? 'ar' : 'en');
            setData((prev) => ({ ...prev, summary }));
            pushBot(say(`إليك مسودة المقدمة:`, `Here’s a draft intro:`));
            pushBot(summary);
            pushBot(
                say(
                    'أكتب "تعديل: النص الجديد" لتغييره، أو "متابعة" لبناء سيرتك.',
                    'Type "edit: your new text" to change it, or "continue" to build your CV.'
                )
            );
        } catch (err) {
            setError(err.message || (isArabic ? 'تعذّر إنشاء الملخص.' : 'AI summary unavailable.'));
            pushBot(say('حصلت مشكلة مؤقتة مع الذكاء الاصطناعي، لكنني سأكمل ببياناتك.', 'A temporary AI hiccup - I’ll continue with your data.'));
            finishToGenerate();
        } finally {
            setBusy(false);
        }
    };

    const finishToGenerate = async () => {
        setPhase('done');
        setBusy(true);
        pushBot(say('أجهّز سيرتك الآن… ✨', 'Preparing your CV now… ✨'));
        try {
            const result = await generateCV(data, template, isArabic ? 'ar' : 'en');
            setCv(result);
            pushBot(
                say(
                    'سيرتك جاهزة! 🎉 اختر قالبًا ثم عاينها وحمّلها PDF أو Word. هل تريد تغيير أي شيء؟',
                    'Your CV is ready! 🎉 Pick a template, preview it, then download as PDF or Word. Want to change anything?'
                )
            );
        } catch (err) {
            // Graceful fallback: assemble the CV locally so the flow always
            // completes and downloads work even when the AI is unreachable.
            setCv(buildLocalCV(data, template));
            setError(
                isArabic
                    ? 'الذكاء الاصطناعي غير متاح حاليًا - لكن سيرتك جاهزة من بياناتك، وستُحسَّن آليًا فور توفّره.'
                    : 'The AI is unavailable right now - but your CV is ready from your data, and we’ll polish it automatically once it’s back.'
            );
            pushBot(
                say(
                    'سيرتك جاهزة! 🎉 بنيتها من إجاباتك مباشرة. اختر القالب ثم حمّلها PDF أو Word - وعند توفّر الذكاء الاصطناعي ستُحسَّن تلقائيًا.',
                    'Your CV is ready! 🎉 Built directly from your answers. Pick a template and download as PDF or Word - it’ll be AI-polished automatically when the AI is available.'
                )
            );
        } finally {
            setBusy(false);
        }
    };

    // Templates only change the styling of the same content, so switching is
    // instant (no AI round-trip, nothing lost).
    const changeTemplate = (nextTemplate) => {
        setTemplate(nextTemplate);
    };

    /* ------------------------------ render ------------------------------ */
    return (
        <div className="cv-builder">
            <GlassCard className="cv-builder__chat-card">
                <div className="cv-builder__head">
                    <div className="cv-builder__avatar" aria-hidden="true">🦉</div>
                    <div>
                        <h3 className="cv-builder__name">Nova - {say('مستشار السيرة الذاتية', 'CV Consultant')}</h3>
                        <span className="cv-builder__status">
                            <span className="cv-builder__pulse" /> {say('متصل · يتحدّث العربية والإنجليزية', 'Online · speaks AR & EN')}
                        </span>
                    </div>
                    <div className="cv-builder__attach">
                        <input ref={attachInputRef} type="file" accept=".pdf,.doc,.docx,.txt" hidden onChange={onAttachCv} />
                        <button
                            type="button"
                            className="premium-button premium-button--ghost"
                            onClick={() => attachInputRef.current?.click()}
                            disabled={attachUploading || busy}
                            title={isArabic ? 'ارفع سيرتك الذاتية هنا' : 'Upload your CV here'}
                            aria-label={isArabic ? 'ارفع سيرتك الذاتية هنا' : 'Upload your CV here'}
                        >
                            {attachUploading
                                ? (isArabic ? 'جارٍ الرفع…' : 'Uploading…')
                                : (<>
                                    <span className="attach-icon">🗎</span>
                                    <span>{isArabic ? 'ارفع سيرتك' : 'Attach CV'}</span>
                                </>)}
                        </button>
                    </div>
                </div>

                <ProgressBar value={progress} label={phaseLabel} />

                {error ? <p className="cv-builder__error">{error}</p> : null}

                {cvText.trim() ? (
                    <div className="cv-builder__cvbadge">
                        📄 {say('سيرتك مرفوعة ويمكن للمستشار قراءتها', 'CV attached - the consultant can read it')}
                    </div>
                ) : null}

                <OnboardingQuestions
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    typing={typing}
                    busy={busy}
                />
            </GlassCard>

            {phase === 'done' && cv ? (
                <div className="cv-builder__result">
                    <SectionHeading
                        kicker={say('الخطوة الأخيرة', 'Final step')}
                        title={say('اختر قالبك وعاين سيرتك', 'Pick your template & preview')}
                        subtitle={say('ثلاثة قوالب مميزة - كلها قابلة للتخصيص والتحميل.', 'Three premium templates - all editable and downloadable.')}
                    />
                    <CVTemplates value={template} onChange={changeTemplate} />
                    <CVDownload cv={cv} template={template} fileName={`${data.name || 'PortNova'}-CV`} />
                    <div className="cv-preview-wrap">
                        <CVPreview cv={cv} template={template} />
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default CVBuilder;
