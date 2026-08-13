import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
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
    { key: 'summary', askAr: 'اكتب سطرين أو ثلاثة عنك وعن مسارك المهني.', askEn: 'Write 2–3 sentences about who you are professionally.' },
    { key: 'education', askAr: 'ما هو أعلى مستوى تعليمي لديك؟ (ثانوية، دبلوم، بكالوريوس، ماجستير، دكتوراه)', askEn: 'What is your highest education level? (High School, Diploma, Bachelor’s, Master’s, PhD)' },
    { key: 'fieldOfStudy', askAr: 'ما هو تخصصك الدراسي؟', askEn: 'What is your field of study?' },
    { key: 'technicalSkills', askAr: 'اذكر أهم 3–5 مهارات تقنية لديك، مفصولة بفواصل.', askEn: 'List your top 3–5 technical skills, separated by commas.' },
    { key: 'softSkills', askAr: 'اذكر أهم 3–5 مهارات شخصية لديك.', askEn: 'List your top 3–5 soft skills.' },
    { key: 'certifications', askAr: 'هل لديك شهادات؟ اذكرها — أو اكتب "لا يوجد".', askEn: 'Do you have any certifications? List them — or type "none".' },
    { key: 'languages', askAr: 'ما اللغات التي تتحدثها بجانب العربية؟ اذكرها مع المستوى (أو "لا يوجد").', askEn: 'Which languages do you speak besides Arabic, and at what level? (or "none")' },
    { key: 'linkedin', askAr: 'هل لديك حساب لينكدإن؟ (اختياري — أو اكتب "لا")', askEn: 'Do you have a LinkedIn profile? (optional — or type "none")' },
    { key: 'targetRole', askAr: 'ما نوع الوظيفة التي تبحث عنها؟', askEn: 'What kind of job are you looking for?' },
    { key: 'targetIndustry', askAr: 'في أي قطاع أو مجال تفضّل العمل؟', askEn: 'Which industry or field do you prefer?' },
];

const DONE_WORDS = ['done', 'تم', 'لا', 'لا يوجد', 'none', 'n/a', 'na', 'انتهيت', 'no'];
const isDone = (v) => DONE_WORDS.includes(String(v || '').trim().toLowerCase());

const splitList = (v) =>
    String(v || '')
        .split(/[,،;؛\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

const parseLanguages = (v) =>
    splitList(v).map((item) => {
        const m = item.match(/^(.*?)\s*[\(（](.*?)[\)）]\s*$/);
        if (m) return { name: m[1].trim(), level: m[2].trim() };
        return { name: item, level: '' };
    });

const parseJob = (v) => {
    const m = String(v).match(/^\s*(.*?)\s*(?:@| at | - | — |–)\s*(.*?)\s*(?:\(([^)]*)\))?\s*$/);
    if (m) return { role: m[1].trim(), company: m[2].trim(), dates: (m[3] || '').trim() };
    return { role: String(v).trim(), company: '', dates: '' };
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
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [busy, setBusy] = useState(false);
    const [data, setData] = useState(DEFAULT_DATA);
    const [flowIndex, setFlowIndex] = useState(0);
    const [phase, setPhase] = useState('intro'); // intro | questions | experience | achievements | summary | done
    const [cv, setCv] = useState(null);
    const [template, setTemplate] = useState('modern');
    const [error, setError] = useState('');

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
        // Use the context language (first render) — document lang isn't set yet
        // because this effect runs before the LanguageProvider's own effect.
        const arabic = isArabic;
        const first = FLOW[0];
        const welcome = arabic
            ? 'أهلًا بك 👋 أنا نوفا، مستشارك الشخصي لبناء السيرة الذاتية.\nسأسألك بعض الأسئلة البسيطة ثم أصوغ لك سيرة ذاتية احترافية جاهزة للتحميل. لنبدأ!'
            : 'Welcome! 👋 I’m Nova, your personal CV consultant.\nI’ll ask a few simple questions, then craft you a professional CV ready to download. Let’s begin!';
        setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: welcome }]);
        const timer = window.setTimeout(() => {
            setMessages((prev) => [...prev, { id: nextId(), from: 'bot', text: arabic ? first.askAr : first.askEn }]);
            setPhase('questions');
        }, 900);
        return () => window.clearTimeout(timer);
    }, []);

    /* ------------------------- store + advance flow ------------------------- */
    const storeValue = (key, raw) => {
        const next = { ...data };
        switch (key) {
            case 'technicalSkills': next.technicalSkills = splitList(raw); break;
            case 'softSkills': next.softSkills = splitList(raw); break;
            case 'certifications':
                next.certifications = isDone(raw) ? [] : splitList(raw).map((name) => ({ name, issuer: '', year: '' }));
                break;
            case 'languages': next.languages = isDone(raw) ? [] : parseLanguages(raw); break;
            case 'linkedin': next.linkedin = isDone(raw) ? '' : raw.trim(); break;
            case 'education': next.education = raw.trim(); break;
            case 'fieldOfStudy': next.fieldOfStudy = raw.trim(); break;
            case 'summary': next.summary = raw.trim(); break;
            default: next[key] = raw.trim();
        }
        setData(next);
        return next;
    };

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
                            : 'رائع! 🎉 الآن عن الخبرة العملية.\nأخبرني عن وظيفة: الدور @ الشركة (التواريخ). مثال: "أخصائي تسويق @ نوفا لابز (2022–2024)".\nاكتب "انتهيت" إذا لم تكن لديك خبرة.',
                        isStudent
                            ? 'Great! 🎉 Now any internships, part-time work or projects.\nTell me about one: role @ company (dates). e.g. "Dev Intern @ Nova Labs (2024)".\nType "done" if you have none.'
                            : 'Great! 🎉 Now work experience.\nTell me about a job: role @ company (dates). e.g. "Marketing Specialist @ Nova Labs (2022–2024)".\nType "done" if you have no experience.'
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
            storeValue(q.key, raw);

            // Friendly, response-aware acknowledgments (no API call — instant).
            const ack = {
                name: say(`تشريف يا ${raw.split(' ')[0]}!`, `Nice to meet you, ${raw.split(' ')[0]}!`),
                title: /طالب|student|متدرب|intern/i.test(raw)
                    ? say('رائع — سنركّز على تعليمك ومهاراتك ومسيرتك الدراسية. 🎓', 'Great — as a student we’ll emphasise your education, skills and coursework. 🎓')
                    : say('ممتاز — سنبرز هذه الخبرة.', 'Great — we’ll highlight that experience.'),
                summary: say('ملاحظة رائعة — سنعتمد عليها في سيرتك.', 'Noted — we’ll build on that.'),
                technicalSkills: say('ممتاز، مهارات قوية. 👌', 'Nice, strong skills. 👌'),
                softSkills: say('ممتاز — سنبرزها.', 'Great — we’ll highlight those.'),
                education: say('تمام — سنوثّقها بدقة في قسم التعليم.', 'Perfect — we’ll document it precisely under education.'),
                location: say('تمام، سنضع موقعك الحالي في ترويسة السيرة.', 'Got it — we’ll put your location in the CV header.'),
                targetRole: say('واضح — سنصيغ ملخصك وسيرتك حول هذا الدور.', 'Clear — we’ll shape your summary and CV around that role.'),
                targetIndustry: say('ممتاز — سنوائم لغة السيرة مع هذا القطاع.', 'Excellent — we’ll match the CV tone to that industry.'),
            }[q.key];
            if (ack) pushBot(ack);

            nextQuestion();
            return;
        }

        /* phase: experience (collect job descriptors) */
        if (phase === 'experience') {
            if (isDone(raw)) {
                if (!data.experience.length) {
                    pushBot(say('لا مشكلة — سنركّز على مهاراتك وتعليمك.', 'No problem — we’ll focus on your skills and education.'));
                    beginSummary();
                } else {
                    beginSummary();
                }
                return;
            }
            const job = { _id: `${Date.now()}`, ...parseJob(raw), bullets: [] };
            const updated = { ...data, experience: [...data.experience, job] };
            setData(updated);
            setPhase('achievements');
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                pushBot(
                    say(
                        `تم تسجيل "${job.role}"${job.company ? ` في ${job.company}` : ''} 🙌\nالآن أخبرني عن إنجاز مميّز في هذه الوظيفة — سأعيد صياغته بشكل احترافي. يمكنك إضافة أكثر من إنجاز، وعند الانتهاء اكتب "تم" لإنهاء هذه الوظيفة.`,
                        `Logged "${job.role}"${job.company ? ` at ${job.company}` : ''} 🙌\nNow tell me a standout achievement in this role — I’ll rewrite it professionally. You can add more than one, and type "done" when finished with this job.`
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
                `فهمتك! ${data.name || ''}، ${data.title || 'باحث عن فرصة'} من ${data.location || 'بورسعيد'} — الهدف: ${data.targetRole || 'فرصة مناسبة'} في ${data.targetIndustry || 'مجالك'}. سأبني سيرتك حول هذه الصورة.`,
                `Got it! ${data.name || ''} — a ${data.title || 'professional'} from ${data.location || 'Port Said'}, targeting ${data.targetRole || 'a fitting role'} in ${data.targetIndustry || 'your field'}. I’ll build your CV around that.`
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
            setError(err.message || 'AI summary unavailable.');
            pushBot(say('حصلت مشكلة مؤقتة مع الذكاء الاصطناعي، لكنني سأكمل ببياناتك.', 'A temporary AI hiccup — I’ll continue with your data.'));
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
                    ? 'الذكاء الاصطناعي غير متاح حاليًا — لكن سيرتك جاهزة من بياناتك، وستُحسَّن آليًا فور توفّره.'
                    : 'The AI is unavailable right now — but your CV is ready from your data, and we’ll polish it automatically once it’s back.'
            );
            pushBot(
                say(
                    'سيرتك جاهزة! 🎉 بنيتها من إجاباتك مباشرة. اختر القالب ثم حمّلها PDF أو Word — وعند توفّر الذكاء الاصطناعي ستُحسَّن تلقائيًا.',
                    'Your CV is ready! 🎉 Built directly from your answers. Pick a template and download as PDF or Word — it’ll be AI-polished automatically when the AI is available.'
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
                        <h3 className="cv-builder__name">Nova — {say('مستشار السيرة الذاتية', 'CV Consultant')}</h3>
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
                        subtitle={say('ثلاثة قوالب مميزة — كلها قابلة للتخصيص والتحميل.', 'Three premium templates — all editable and downloadable.')}
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
