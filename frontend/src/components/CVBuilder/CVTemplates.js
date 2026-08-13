import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/** The three premium CV templates, shared by the picker, the preview and the
 *  downloader. `id` drives the CSS class on the CV sheet. */
export const TEMPLATES = [
    {
        id: 'modern',
        nameAr: 'عصري',
        nameEn: 'Modern',
        descAr: 'تخطيط أحادي نظيف، اسم بارز، ومهارات على شكل أزرار - مثالي للتقني والمجالات الإبداعية.',
        descEn: 'Clean single column with a bold name and pill skills - ideal for tech and creative fields.',
        accent: 'teal',
    },
    {
        id: 'professional',
        nameAr: 'احترافي',
        nameEn: 'Professional',
        descAr: 'عمودان احترافيان: شريط جانبي داكن للمهارات والتواصل، وقسم رئيسي للخبرة والتعليم - مثالي للشركات والحكومة.',
        descEn: 'Two professional columns: a dark sidebar for skills and contact, plus a main column for experience and education - ideal for corporate and government.',
        accent: 'blue',
    },
    {
        id: 'marine',
        nameAr: 'بحري',
        nameEn: 'Marine',
        descAr: 'شريط علوي بحري مع لمسات ذهبية وقواعد ذهبية للأقسام - بصمة بورسعيد لدى أرباب العمل.',
        descEn: 'A nautical top band with gold accents and gold section rules - the Port Said touch for local employers.',
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
