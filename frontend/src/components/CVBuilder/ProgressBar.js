import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/** Step progress for the CV Builder chat — labels the current phase and
 *  shows a smooth animated bar, styled with the site's premium tokens. */
const ProgressBar = ({ value = 0, label = '' }) => {
    const { isArabic } = useLanguage();
    const pct = Math.max(0, Math.min(100, Math.round(value)));

    return (
        <div className="cv-progress">
            <div className="cv-progress__row">
                <span className="cv-progress__label">{label || (isArabic ? 'التقدم' : 'Progress')}</span>
                <strong className="cv-progress__value">{pct}%</strong>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress__bar" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

export default ProgressBar;
