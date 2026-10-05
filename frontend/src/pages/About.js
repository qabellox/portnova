import React from 'react';
import { GlassCard, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const About = () => {
    const { t } = useLanguage();

    return (
        <div className="page-shell">
            <SectionHeading kicker={t('aboutKicker')} title={t('aboutTitle')} />

            <GlassCard>
                <p className="about-lead">{t('aboutMission')}</p>
            </GlassCard>

            <div className="about-grid">
                <GlassCard>
                    <h3 className="card-title">{t('aboutProblemTitle')}</h3>
                    <p className="card-copy">{t('aboutProblem')}</p>
                </GlassCard>
                <GlassCard>
                    <h3 className="card-title">{t('aboutWhatTitle')}</h3>
                    <p className="card-copy">{t('aboutWhat')}</p>
                </GlassCard>
                <GlassCard>
                    <h3 className="card-title">{t('aboutVisionTitle')}</h3>
                    <p className="card-copy">{t('aboutVision')}</p>
                </GlassCard>
                <GlassCard>
                    <h3 className="card-title">{t('aboutCommunityTitle')}</h3>
                    <p className="card-copy">{t('aboutCommunity')}</p>
                </GlassCard>
            </div>
        </div>
    );
};

export default About;