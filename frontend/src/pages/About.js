import React from 'react';
import { GlassCard, SectionHeading } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

/* About Us — placeholder page. Content to be filled together later. */
const About = () => {
    const { t } = useLanguage();

    return (
        <div className="page-shell">
            <SectionHeading
                kicker={t('aboutKicker')}
                title={t('aboutTitle')}
            />
            <GlassCard>
                <div className="empty-state">
                    {t('aboutEmpty')}
                </div>
            </GlassCard>
        </div>
    );
};

export default About;
