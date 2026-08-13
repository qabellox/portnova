import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import CVBuilder from '../components/CVBuilder/CVBuilder';
import { BilingualLine, PremiumButton } from '../components/PremiumUI';

/** /cv-builder — the premium AI CV Builder Agent, living in the CV section. */
const CvBuilderPage = () => {
    const { t } = useLanguage();

    return (
        <div className="page-shell page-shell__grid">
            <section className="hero hero--local">
                <div className="hero__grid">
                    <div>
                        <div className="hero__kicker">
                            <span className="nautical-tile" aria-hidden="true">✨</span> {t('cvBuilderKicker')}
                        </div>
                        <h1 className="hero__title">
                            <span className="gradient-text">{t('cvBuilderTitle')}</span>
                        </h1>
                        <BilingualLine
                            as="p"
                            className="hero__lead"
                            ar="نوفا تسألك أسئلة بسيطة، تستخرج إنجازاتك، وتبني لك سيرة ذاتية احترافية جاهزة للتحميل في دقائق."
                            en="Nova asks a few simple questions, extracts your achievements, and builds you a professional CV ready to download in minutes."
                        />
                        <div className="inline-actions">
                            <PremiumButton variant="ghost" to="/cv-service">
                                ← {t('backToCv')}
                            </PremiumButton>
                        </div>
                    </div>
                </div>
            </section>

            <CVBuilder />
        </div>
    );
};

export default CvBuilderPage;
