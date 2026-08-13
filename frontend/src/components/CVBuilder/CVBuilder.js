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
    { key: 'name', askAr: 'ما اسمك الكامل؟', askEn: 'What is your full name?' },
    { key: 'email', askAr: 'ما هو بريدك الإلكتروني؟', askEn: 'What is your email address?' },
    { key: 'phone', askAr: 'ما هو رقم هاتفك؟', askEn: 'What is your phone number?' },
    { key: 'location', askAr: 'أين تسكن؟ (المدينة، الدولة)', askEn: 'What is your current location? (City, Country)' },
    { key: 'title', askAr: 'ما هو مسمّاك الوظيفي الحالي؟ (أو "طالب" إن كنت تدرس)', askEn: 'What is your current job title? (or "Student")' },
    { key: 'summary', askAr: 'اكتب سطرين أو ثلاثة عنك وعن مسارك المهني.', askEn: 'Write 2-3 sentences about who you are professionally.' },
    { key: 'education', askAr: 'ما هو أعلى مستوى تعليمي لديك؟ (ثانوية، دبلوم، بكالوريوس، ماجستير، دكتوراه)', askEn: 'What is your highest education level? (High School, Diploma, Bachelor’s, Master’s, PhD)' },
    { key: 'fieldOfStudy', askAr: 'ما هو تخصصك الدراسي؟', askEn: 'What is your field of study?' },
    { key: 'technicalSkills', askAr: 'اذكر أهم 3-5 مهارات تقنية لديك، مفصولة بفواصل.', askEn: 'List your top 3-5 technical skills, separated by commas.' },
    { key: 'softSkills', askAr: 'اذكر أهم 3-5 مهارات شخصية لديك.', askEn: 'List your top 3-5 soft skills.' },
    { key: 'certifications', askAr: 'هل لديك شهادات؟ اذكرها - أو اكتب "لا يوجد".', askEn: 'Do you have any certifications? List them - or type "none".' },
    { key: 'languages', askAr: 'ما اللغات التي تتحدثها بجانب العربية؟ اذكرها مع المستوى (أو "لا يوجد").', askEn: 'Which languages do you speak besides Arabic, and at what level? (or "none")' },
    { key: 'linkedin', askAr: 'هل لديك حساب لينكدإن؟ (اختياري - أو اكتب "لا")', askEn: 'Do you have a LinkedIn profile? (optional - or type "none")' },
    { key: 'targetRole', askAr: 'ما نوع الوظيفة التي تبحث عنها؟', askEn: 'What kind of job are you looking for?' },
    { key: 'targetIndustry', askAr: 'في أي قطاع أو مجال تفضّل العمل؟', askEn: 'Which industry or field do you prefer?' },
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
                ? `أهلًا بعودتك يا ${name} 👋 أنا نوفا. بياناتك الأساسية محفوظة - لنكمل بناء سيرتك الذكية!`
                : 'أهلًا بك 👋 أنا نوفا، مستشارك الشخصي لبناء السيرة الذاتية.\nسأسألك بعض الأسئلة البسيطة ثم أصوغ لك سيرة ذاتية احترافية.'
            : name
                ? `Welcome back, ${name}! 👋 I’m Nova. Your basic details are saved - let’s keep building your CV!`
                : 'Welcome! 👋 I’m Nova, your personal CV consultant.\nI’ll ask a few simple questions, then craft you a professional CV.';

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
                            ? 'بياناتك محفوظة بالكامل 🎉 لننتقل إلى الخبرة العملية.\nأخبرني عن وظيفة: الدور @ الشركة (التواريخ). مثال: "أخصائي تسويق @ نوفا لابز (2022-2024)".\nاكتب "انتهيت" إذا لم تكن لديك خبرة.'
                            : 'Your profile is fully saved 🎉 Let’s move to experience.\nTell me about a job: role @ company (dates). e.g. "Marketing Specialist @ Nova Labs (2022-2024)".\nType "done" if you have no experience.',
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
                'هذا مختصر قليلًا - أخبرني بأكثر قليلًا عن أقوى ما تميّزت به وهدفك المهني؟ (حتى سطر إضافي يساعدني في كتابة ملخص قوي)',
                'That was a bit brief - can you tell me a little more about your strongest strengths and your career goal? Even one more line helps me write a strong summary.'
              )
            : say(
                'ممتاز - هل يمكنك إضافة مهارة أو مهارتين أخريين؟ سيرتك تصبح أقوى بمهارات أوسع.',
                'Nice - can you add one or two more skills? Your CV gets stronger with a fuller set.'
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
                            ? 'رائع! 🎉 الآن عن أي تدريب أو عمل جزئي أو مشاريع.\nأخبرني عن وظيفة: الدور @ الشركة (التواريخ). مثال: "متدرب تطوير @ نوفا لابز (2024)".\nاكتب "انتهيت" إذا لم تكن لديك خبرة.'
                            : 'رائع! 🎉 الآن عن الخبرة العملية.\nأخبرني عن وظيفة: الدور @ الشركة (التواريخ). مثال: "أخصائي تسويق @ نوفا لابز (2022-2024)".\nاكتب "انتهيت" إذا لم تكن لديك خبرة.',
                        isStudent
                            ? 'Great! 🎉 Now any internships, part-time work or projects.\nTell me about one: role @ company (dates). e.g. "Dev Intern @ Nova Labs (2024)".\nType "done" if you have none.'
                            : 'Great! 🎉 Now work experience.\nTell me about a job: role @ company (dates). e.g. "Marketing Specialist @ Nova Labs (2022-2024)".\nType "done" if you have no experience.'
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
                            'إنجازات رائعة! هل لديك وظيفة أخرى؟ أخبرني بها (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت".',
                            'Great achievements! Any other job? Tell me (role @ company (dates)) or type "done".'
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
                    ? say('رائع - سنركّز على تعليمك ومهاراتك ومسيرتك الدراسية. 🎓', 'Great - as a student we’ll emphasise your education, skills and coursework. 🎓')
                    : say(`ممتاز، ${titleCase(raw)} - سنبرز هذه الخبرة.`, `Excellent, ${titleCase(raw)} - we’ll highlight that.`),
                summary: say('ملاحظة رائعة - سنعتمد عليها في سيرتك.', 'Noted - we’ll build on that.'),
                technicalSkills: say(`ممتاز، ${splitList(raw).length} مهارات قوية. 👌`, `Nice, ${splitList(raw).length} strong skills. 👌`),
                softSkills: say('ممتاز - سنبرزها.', 'Great - we’ll highlight those.'),
                education: say('تمام - سنوثّقها بدقة في قسم التعليم.', 'Perfect - we’ll document it precisely under education.'),
                location: say('تمام، سنضع موقعك الحالي في ترويسة السيرة.', 'Got it - we’ll put your location in the CV header.'),
                targetRole: say(`واضح، ${titleCase(raw)} - سنصيغ ملخصك وسيرتك حول هذا الدور.`, `Clear - ${titleCase(raw)} - we’ll shape your summary and CV around that role.`),
                targetIndustry: say('ممتاز - سنوائم لغة السيرة مع هذا القطاع.', 'Excellent - we’ll match the CV tone to that industry.'),
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
                            `تم التسجيل! الآن أخبرني بإنجاز مميّز في "${job.role || 'هذه الوظيفة'}" وسأعيد صياغته بشكل احترافي. اكتب "تم" عند الانتهاء.`,
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
                            `في أي شركة كان "${job.role}"؟ (أو اكتب "تخطي")`,
                            `Which company was "${job.role}" at? (or type "skip")`
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
                        `تم تسجيل "${job.role}" في ${job.company} 🙌\nالآن أخبرني عن إنجاز مميّز في هذه الوظيفة - سأعيد صياغته بشكل احترافي. يمكنك إضافة أكثر من إنجاز، وعند الانتهاء اكتب "تم" لإنهاء هذه الوظيفة.`,
                        `Logged "${job.role}" at ${job.company} 🙌\nNow tell me a standout achievement in this role - I’ll rewrite it professionally. You can add more than one, and type "done" when finished with this job.`
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
                        'إنجازات رائعة! هل لديك وظيفة أخرى؟ أخبرني بها (الدور @ الشركة (التواريخ)) أو اكتب "انتهيت".',
                        'Great achievements! Any other job? Tell me (role @ company (dates)) or type "done".'
                    )
                );
            } else {
                pushBot(say('اكتب إنجازك في الصندوق أعلاه، وسأقوم بتحسينه لك ✨', 'Type your achievement in the box above and I’ll polish it ✨'));
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
                `فهمتك! ${data.name || ''}، ${data.title || 'باحث عن فرصة'} من ${data.location || 'بورسعيد'} - الهدف: ${data.targetRole || 'فرصة مناسبة'} في ${data.targetIndustry || 'مجالك'}. سأبني سيرتك حول هذه الصورة.`,
                `Got it! ${data.name || ''} - a ${data.title || 'professional'} from ${data.location || 'Port Said'}, targeting ${data.targetRole || 'a fitting role'} in ${data.targetIndustry || 'your field'}. I’ll build your CV around that.`
            )
        );
        pushBot(say('أقوم الآن بكتابة ملخصك الاحترافي…', 'Writing your professional summary…'));
        try {
            const { summary } = await writeSummary(data, isArabic ? 'ar' : 'en');
            setData((prev) => ({ ...prev, summary }));
            pushBot(say(`هذا ملخصك:`, `Here is your summary:`));
            pushBot(summary);
            pushBot(
                say(
                    'يمكنك تعديله بكتابة "تعديل: النص الجديد"، أو اكتب "متابعة" لبناء سيرتك الكاملة.',
                    'You can edit it by typing "edit: your new text", or type "continue" to build your full CV.'
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
        pushBot(say('أبني سيرتك الاحترافية الآن… 🛠️', 'Building your professional CV now… 🛠️'));
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
