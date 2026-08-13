import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { writeSummary, generateCV, buildLocalCV } from '../../services/cvBuilder';
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
    { key: 'name', askAr: 'لنبدأ بالأساسيات - ما اسمك الكامل الذي سيظهر في ترويسة السيرة الذاتية؟', askEn: 'Let’s start with the essentials - what is your full name, exactly as it should appear on the CV?' },
    { key: 'email', askAr: 'ما هو بريدك الإلكتروني الاحترافي؟ سأستخدمه للتواصل معك بخصوص الفرص.', askEn: 'What is your professional email? I’ll use it for any opportunity-related contact.' },
    { key: 'phone', askAr: 'ما رقم هاتفك؟ من المهم أن يصل إليك أصحاب العمل بسرعة عند الحاجة.', askEn: 'What is your phone number? It’s important that employers can reach you quickly.' },
    { key: 'location', askAr: 'أين تقيم حاليًا؟ (المدينة والمحافظة) - يساعد هذا الشركات على تقدير قربك من فرص العمل.', askEn: 'Where are you currently based? (City and area) - this helps employers gauge your proximity to opportunities.' },
    { key: 'title', askAr: 'أخبرني عن هويتك المهنية الحالية - ما المنصب الذي تشغله، وما نطاق مسؤولياتك؟', askEn: 'Tell me about your current professional identity - what role do you hold, and what is the scope of your responsibilities?' },
    { key: 'summary', askAr: 'لأكتب لك ملخصًا مهنيًا مقنعًا، أحتاج أن أفهم ما الذي يعرّف مسيرتك.\nأخبرني عن العمل الذي تفتخر به أكثر، والأثر الذي صنعته، وأين ترى نفسك في السنوات القادمة.', askEn: 'To craft a compelling professional summary, I need to understand what defines your career.\nTell me about the work you’re most proud of, the impact you made, and where you see yourself heading next.' },
    { key: 'education', askAr: 'ما أعلى مؤهل علمي حصلت عليه؟ (ثانوية، دبلوم، بكالوريوس، ماجستير، دكتوراه)', askEn: 'What is your highest level of education? (High School, Diploma, Bachelor’s, Master’s, PhD)' },
    { key: 'fieldOfStudy', askAr: 'في أي تخصص درست؟ هذا يمنح مسارك المهني مصداقية أكبر.', askEn: 'What field did you study? It adds real credibility to your career story.' },
    { key: 'technicalSkills', askAr: 'ما المهارات التقنية التي اعتمدت عليها في نجاحك المهني؟ اذكر أهم 3-5 مهارات.', askEn: 'What technical skills have defined your career success? List your top 3-5.' },
    { key: 'softSkills', askAr: 'وما نقاط القوة الشخصية التي تميّزك عن غيرك في مجالك؟ (مثل القيادة، التواصل، حل المشكلات)', askEn: 'And what personal strengths set you apart from others in your field? (e.g. leadership, communication, problem-solving)' },
    { key: 'certifications', askAr: 'هل تملك شهادات أو دورات معتمدة تقوّي ملفك؟ اذكرها - أو اكتب "لا يوجد".', askEn: 'Do you hold any certifications or courses that strengthen your profile? List them - or type "none".' },
    { key: 'languages', askAr: 'ما اللغات التي تتقنها إلى جانب العربية، وما مستواك في كل منها؟ (أو "لا يوجد")', askEn: 'Which languages do you speak besides Arabic, and at what level? (or "none")' },
    { key: 'linkedin', askAr: 'هل لديك ملف لينكدإن؟ إن وُجد، سأضيفه لتعزيز مصداقيتك أمام أصحاب العمل. (اختياري)', askEn: 'Do you have a LinkedIn profile? If so, I’ll include it to boost your credibility. (optional)' },
    { key: 'targetRole', askAr: 'ما الدور الذي تستهدفه في خطوتك المهنية القادمة؟', askEn: 'What kind of role are you targeting in your next career move?' },
    { key: 'targetIndustry', askAr: 'في أي قطاع تفضّل التقدّم؟ سأوجّه لهجة سيرتك بدقة نحو هذا المجال.', askEn: 'Which industry are you aiming for? I’ll tailor the CV tone precisely to that field.' },
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
const CVBuilder = () => {
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
            cvPath: meta.cvPath || '',
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
        if (phase === 'questions') return 12 + Math.round((flowIndex / FLOW.length) * 52);
        return 4;
    }, [phase, flowIndex]);

    const phaseLabel =
        phase === 'done' ? say('اكتمل بناء سيرتك الذاتية ✨', 'Your CV is ready ✨')
            : phase === 'summary' ? say('كتابة الملخص الاحترافي…', 'Writing your professional summary…')
                : phase === 'achievements' ? say('استخراج الإنجازات المميّزة', 'Extracting standout achievements')
                    : phase === 'experience' ? say('الخبرة العملية', 'Work experience')
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

        const timer = window.setTimeout(() => {
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
        return () => window.clearTimeout(timer);
    }, []);

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
                'هذه بداية جيدة. لأجعل ملخصك قويًا بحق، أخبرني عن أهم ما أنجزته والنتيجة المهنية التي تطمح إليها في السنتين القادمتين؟ حتى سطر إضافي يصنع فرقًا.',
                'That gives me a foundation. To make your summary truly stand out, tell me about your key differentiators and the career outcome you’re aiming for in the next 2-3 years? Even one more line helps.'
              )
            : say(
                'شكرًا لك - هل يمكنك إضافة مهارة أو مهارتين أخريين؟ كلما كانت قائمتك أغنى، كانت سيرتك أقوى أمام أصحاب العمل.',
                'Thanks - could you add one or two more skills? A fuller list makes your CV noticeably stronger to employers.'
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
                            ? 'ممتاز! 🎉 لننتقل الآن إلى ما يعزز مسيرتك - أي تدريب أو عمل جزئي أو مشاريع قمت بها.\nأخبرني عن واحدة: الدور @ الجهة (التواريخ). مثال: "متدرب تطوير @ Nova Labs (2024)".\nاكتب "انتهيت" إن لم يتوفر شيء.'
                            : 'ممتاز! 🎉 لننتقل الآن إلى مسارك المهني.\nأخبرني عن كل دور عملت فيه: الدور @ الشركة (التواريخ). مثال: "أخصائي تسويق @ Nova Labs (2022-2024)".\nاكتب "انتهيت" عند الانتهاء.',
                        isStudent
                            ? 'Excellent! 🎉 Now let’s cover what strengthens your path - any internships, part-time work or projects you’ve done.\nTell me about one: role @ organisation (dates). e.g. "Dev Intern @ Nova Labs (2024)".\nType "done" if you have none.'
                            : 'Excellent! 🎉 Now let’s walk through your career progression.\nTell me about each role: position @ company (dates). e.g. "Marketing Specialist @ Nova Labs (2022-2024)".\nType "done" when finished.'
                    )
                );
            }, 700);
        }
    };

    const askNextAchievement = (job) => {
        pushNode(
            <AchievementExtractor
                role={job?.role}
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
                            'إنجازات مميزة حقًا! هل لديك دور آخر تضيفه؟ أخبرني به (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت".',
                            'Those are strong achievements! Do you have another role to add? Tell me (role @ company (dates)) or type "done".'
                        )
                    );
                }}
            />
        );
    };

    /* ------------------------- main answer handler ------------------------- */
    const handleSend = (raw) => {
        pushUser(raw);
        setInput(''); // clear the reply box so it's ready for the next answer

        /* phase: questions */
        if (phase === 'questions') {
            const q = FLOW[flowIndex];

            // A follow-up answer was expected (thin summary / too-few skills).
            // If the user declines or gives a non-answer, keep what we have and
            // move on - never merge "N/A" or "a lot" into the CV.
            if (clarify) {
                if (isDone(raw) || isFiller(raw)) {
                    setClarify(null);
                    pushBot(say('لا مشكلة، نكمل بما لدينا. 👍', 'No problem - we’ll go with what we have. 👍'));
                } else {
                    storeValue(clarify, raw, true);
                    setClarify(null);
                    pushBot(say('شكرًا - أصبحت المعلومات أكثر دقة الآن. 👍', 'Thanks - that sharpens it. 👍'));
                }
                nextQuestion();
                return;
            }

            // If the user pushes back ("is it necessary?", "do I need this?"),
            // reassure them and let them skip - never make them feel judged.
            if (PUSHBACK.test(raw)) {
                pushBot(
                    say(
                        'سؤال وجيه. هذه المعلومة تساعدني على إبراز نقاط قوتك بدقة بدل التخمين - وإن أردت، اكتب "لا" للتخطي ونكمل. 😊',
                        'Fair question. This detail lets me highlight your strengths precisely instead of guessing - and if you prefer, type "none" to skip and we’ll move on. 😊'
                    )
                );
                nextQuestion();
                return;
            }

            storeValue(q.key, raw);

            // A non-answer ("a lot", "N/A", "idk"...) is never stored or used
            // to interrogate the user - acknowledge gently and keep moving.
            if (isFiller(raw)) {
                pushBot(say('لا مشكلة - يمكنك إضافتها لاحقًا إن أردت. 👍', 'No problem - you can add it later if you like. 👍'));
                nextQuestion();
                return;
            }

            // Friendly, response-aware acknowledgments (no API call - instant).
            // They reference the user's actual answer so it feels understood.
            const ack = {
                name: say(`تشريف يا ${raw.split(' ')[0]}!`, `Nice to meet you, ${raw.split(' ')[0]}!`),
                title: /طالب|student|متدرب|intern/i.test(raw)
                    ? say('رائع - سأركّز على تعليمك ومهاراتك ومسيرتك الدراسية. 🎓', 'Great - I’ll centre the CV on your education, skills and coursework. 🎓')
                    : say(`ممتاز، ${titleCase(raw)} - سنبرز هذا الدور في مقدمة سيرتك.`, `Excellent, ${titleCase(raw)} - I’ll position this role front and centre.`),
                summary: say('شكرًا لك - سأحوّلها إلى افتتاحية قوية لسيرتك.', 'Thank you - I’ll shape this into a strong opening for your CV.'),
                technicalSkills: say(`ممتاز - ${splitList(raw).length} مهارات نبني عليها. 👌`, `Great - ${splitList(raw).length} skills to build on. 👌`),
                softSkills: say('ممتاز - هذه النقاط الشخصية تضيف عمقًا حقيقيًا لملفك.', 'Good - these personal strengths add real depth to your profile.'),
                education: say('تمام - سأبرز هذا بوضوح في قسم التعليم.', 'Perfect - I’ll present this prominently under education.'),
                location: say('تمام - سيظهر موقعك في ترويسة السيرة.', 'Got it - your location will sit in the CV header.'),
                targetRole: say(`واضح - ${titleCase(raw)} - سأخصّص سيرتك بالكامل لهذا الدور.`, `Understood - ${titleCase(raw)} - I’ll tailor your whole CV to this role.`),
                targetIndustry: say('ممتاز - سأوائم لهجة السيرة مع هذا القطاع.', 'Excellent - I’ll match the tone to that industry.'),
            }[q.key];
            if (ack) pushBot(ack);

            // If the answer was too thin, ask one smart follow-up instead of
            // blindly moving on.
            if (needsClarify(q.key, raw)) {
                setClarify(q.key);
                pushBot(clarifyMsg(q.key));
            } else {
                nextQuestion();
            }
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
                            `تم التسجيل! الآن أخبرني بإنجاز مميّز في دور "${job.role || 'هذا الدور'}" وسأعيد صياغته بشكل احترافي. اكتب "تم" عند الانتهاء.`,
                            `Logged! Now tell me a standout achievement in "${job.role || 'this role'}" and I’ll rewrite it professionally. Type "done" when finished.`
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
                        `تم تسجيل "${job.role}" في ${job.company} 🙌\nالآن أخبرني بإنجاز مميّز في هذا الدور - سأصقله ليصبح قويًا ومقنعًا. يمكنك إضافة أكثر من إنجاز، واكتب "تم" عند الانتهاء.`,
                        `Logged "${job.role}" at ${job.company} 🙌\nNow tell me a standout achievement in this role - I’ll polish it into something powerful. You can add more than one, and type "done" when finished.`
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
                        'إنجازات مميزة حقًا! هل لديك دور آخر تضيفه؟ أخبرني به (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت".',
                        'Those are strong achievements! Do you have another role to add? Tell me (role @ company (dates)) or type "done".'
                    )
                );
            } else {
                pushBot(say('اكتب إنجازك في الصندوق أعلاه وسأعمل على صقله ليصبح مقنعًا ✨', 'Type your achievement in the box above and I’ll polish it into something compelling ✨'));
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
                `فهمتك! ${data.name || ''}، ${data.title || 'محترف'} من ${data.location || 'بورسعيد'} - الهدف: ${data.targetRole || 'دور مناسب'} في ${data.targetIndustry || 'مجالك'}. سأبني سيرتك حول هذه الصورة.`,
                `Got it! ${data.name || ''} - a ${data.title || 'professional'} from ${data.location || 'Port Said'}, targeting ${data.targetRole || 'a fitting role'} in ${data.targetIndustry || 'your field'}. I’ll build your CV around that.`
            )
        );
        pushBot(say('أكتب لك الآن ملخصًا مهنيًا يعرض أفضل ما لديك…', 'I’m writing a professional summary that showcases your strengths…'));
        try {
            const { summary } = await writeSummary(data, isArabic ? 'ar' : 'en');
            setData((prev) => ({ ...prev, summary }));
            pushBot(say(`إليك مسودّة ملخصك:`, `Here’s a draft of your summary:`));
            pushBot(summary);
            pushBot(
                say(
                    'يمكنك تعديله بكتابة "تعديل: النص الجديد"، أو اكتب "متابعة" لبناء سيرتك الكاملة.',
                    'You can refine it by typing "edit: your new text", or type "continue" to build your full CV.'
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
        pushBot(say('أصوغ سيرتك الاحترافية الآن… ✨', 'Crafting your professional CV now… ✨'));
        try {
            const result = await generateCV(data, template, isArabic ? 'ar' : 'en');
            setCv(result);
            pushBot(
                say(
                    'تم بناء سيرتك! 🎉 اختر القالب ثم عاينها وحمّلها PDF أو Word.',
                    'Your CV is ready! 🎉 Pick a template, preview it, then download as PDF or Word.'
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
                </div>

                <ProgressBar value={progress} label={phaseLabel} />

                {error ? <p className="cv-builder__error">{error}</p> : null}

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
