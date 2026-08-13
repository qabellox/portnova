import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { improveAchievement } from '../../services/cvBuilder';
import { PremiumButton } from '../PremiumUI';

/** Achievement Extractor — the moment the builder feels like a premium human
 *  consultant. The user types a raw achievement ("grew Instagram by 50%") and
 *  Nova rewrites it into a quantified, ATS-friendly bullet instantly. The user
 *  can accept the AI version, edit it, or keep their original. */
const AchievementExtractor = ({ role, onAccept }) => {
    const { isArabic } = useLanguage();
    const [raw, setRaw] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [edited, setEdited] = useState('');
    const [error, setError] = useState('');

    const runImprove = async () => {
        if (!raw.trim()) return;
        setLoading(true);
        setError('');
        setSuggestion(null);
        try {
            const { improved } = await improveAchievement(raw, role, isArabic ? 'ar' : 'en');
            setSuggestion(improved);
            setEdited(improved);
        } catch (err) {
            setError(err.message || 'AI service unavailable — your text was kept.');
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
                        ? 'اكتب إنجازك كما تتذكره… (مثال: زدت متابعات انستجرام 50٪ خلال 3 شهور)'
                        : 'Type your achievement as you remember it… (e.g. "grew our client\'s Instagram following by 50% in 3 months")'
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
            </div>

            {error ? <p className="muted" style={{ marginTop: '0.5rem' }}>{error}</p> : null}

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
