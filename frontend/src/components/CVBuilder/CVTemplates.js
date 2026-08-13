import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/** The three premium CV templates, shared by the picker, the preview and the
 *  downloader. `id` drives the CSS class on the CV sheet. */
export const TEMPLATES = [
    {
        id: 'modern',
        nameAr: 'عصري',
        nameEn: 'Modern',
        descAr: 'نظيف، بسيط، ومساحة بيضاء واسعة — مثالي للتقني والمجالات الإبداعية.',
        descEn: 'Clean, minimal, lots of white space — ideal for tech and creative fields.',
        accent: 'teal',
    },
    {
        id: 'professional',
        nameAr: 'احترافي',
        nameEn: 'Professional',
        descAr: 'تقليدي ومنظم ومفصّل — مثالي للشركات والحكومة.',
        descEn: 'Traditional, structured, detailed — ideal for corporate and government.',
        accent: 'blue',
    },
    {
        id: 'marine',
        nameAr: 'بحري',
        nameEn: 'Marine',
        descAr: 'أزرق وذهبي بطابع بحري — بصمة بورسعيد لدى أرباب العمل.',
        descEn: 'Blue and gold with nautical accents — the Port Said touch for local employers.',
        accent: 'gold',
    },
];

const CVTemplates = ({ value, onChange }) => {
    const { isArabic } = useLanguage();

    return (
        <div className="cv-templates">
            {TEMPLATES.map((template) => {
                const active = value === template.id;
                return (
                    <button
                        key={template.id}
                        type="button"
                        className={`cv-template cv-template--${template.accent} ${active ? 'cv-template--active' : ''}`}
                        onClick={() => onChange(template.id)}
                        aria-pressed={active}
                    >
                        <span className="cv-template__swatch" aria-hidden="true">
                            <span className="cv-template__swatch-head" />
                            <span className="cv-template__swatch-line" />
                            <span className="cv-template__swatch-line" />
                            <span className="cv-template__swatch-line" />
                        </span>
                        <span className="cv-template__body">
                            <strong>{isArabic ? template.nameAr : template.nameEn}</strong>
                            <span>{isArabic ? template.descAr : template.descEn}</span>
                        </span>
                        <span className="cv-template__check" aria-hidden="true">
                            {active ? '✓' : ''}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default CVTemplates;
