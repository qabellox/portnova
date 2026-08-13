import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { improveAchievement } from '../../services/cvBuilder';
import { PremiumButton } from '../PremiumUI';

/** Achievement Extractor — the moment the builder feels like a premium human
 *  consultant. The user types a raw achievement ("grew Instagram by 50%") and
 *  Nova rewrites it into a quantified, ATS-friendly bullet instantly. The user
 *  can accept the AI version, edit it, or keep their original. */
const DONE_WORDS = ['done', 'تم', 'انتهيت', 'لا', 'لا يوجد', 'none', 'no', 'n/a'];

const AchievementExtractor = ({ role, onAccept, onDone }) => {
    const { isArabic } = useLanguage();
    const [raw, setRaw] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [edited, setEdited] = useState('');
    const [error, setError] = useState('');

    const isDoneWord = DONE_WORDS.includes(String(raw || '').trim().toLowerCase());

    const runImprove = async () => {
        const text = String(raw || '').trim();
        if (!text) return;

        // A "done" word means the user is finishing this job — don't waste an
        // API call polishing it.
        if (isDoneWord) {
            if (onDone) onDone();
            return;
        }

        setLoading(true);
        setError('');
        setSuggestion(null);
        try {
            const { improved } = await improveAchievement(text, role, isArabic ? 'ar' : 'en');
            setSuggestion(improved);
            setEdited(improved);
        } catch (err) {
            setError(
                isArabic
                    ? 'تعذّر وصول الذكاء الاصطناعي الآن، لكن يمكنك إضافة إنجازك مباشرة وسنحسّنه لاحقًا.'
                    : 'The AI is unavailable right now — but you can still add your achievement as-is and we’ll polish it later.'
            );
        } finally {
            setLoading(false);
        }
    };

    const accept = (value) => {
        onAccept(value);
        setRaw('');
        setSuggestion(null);
        setEdited('');
    };

    return (
        <div className="cv-achievement">
            <textarea
                className="textarea"
                rows={3}
                placeholder={
                    isArabic
                        ? 'اكتب إنجازك كما تتذكره… (مثال: زدت متابعات انستجرام 50٪ خلال 3 شهور) — أو اكتب "تم" لإنهاء هذه الوظيفة'
                        : 'Type your achievement as you remember it… (e.g. "grew our client\'s Instagram following by 50% in 3 months") — or type "done" to finish this job'
                }
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) runImprove();
                }}
            />

            <div className="inline-actions" style={{ marginTop: '0.6rem' }}>
                <PremiumButton type="button" variant="gold" disabled={loading || !raw.trim()} onClick={runImprove}>
                    {loading ? (isArabic ? 'يُحسّن نوفا…' : 'Nova is polishing…') : isArabic ? '✨ حسّن بالإبداع' : '✨ Polish with AI'}
                </PremiumButton>
                <PremiumButton type="button" variant="ghost" onClick={onDone}>
                    {isArabic ? 'انتهيت من هذه الوظيفة ✓' : 'Done with this job ✓'}
                </PremiumButton>
            </div>

            {error ? (
                <div className="cv-achievement__fallback">
                    <p className="muted" style={{ margin: '0.25rem 0' }}>{error}</p>
                    {raw.trim() && !suggestion ? (
                        <PremiumButton type="button" variant="primary" onClick={() => accept(raw.trim())}>
                            {isArabic ? 'أضفها كما هي' : 'Add it as-is'}
                        </PremiumButton>
                    ) : null}
                </div>
            ) : null}

            {suggestion ? (
                <div className="cv-achievement__result">
                    <div className="cv-achievement__label">
                        {isArabic ? 'نسخة نوفا المقترحة:' : 'Nova’s polished version:'}
                    </div>
                    <textarea
                        className="textarea"
                        rows={3}
                        value={edited}
                        onChange={(event) => setEdited(event.target.value)}
                    />
                    <div className="inline-actions">
                        <PremiumButton type="button" variant="primary" onClick={() => accept(edited)}>
                            {isArabic ? 'استخدم هذه النسخة' : 'Use this version'}
                        </PremiumButton>
                        <PremiumButton type="button" variant="ghost" onClick={() => accept(raw)}>
                            {isArabic ? 'احتفظ بنصّي الأصلي' : 'Keep my original'}
                        </PremiumButton>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default AchievementExtractor;
