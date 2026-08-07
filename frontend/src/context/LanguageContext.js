import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext(null);

const languageLabels = {
    ar: '🇪🇬 عربي',
    en: '🇬🇧 English',
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => localStorage.getItem('portnova-language') || 'ar');

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('lang', language === 'ar' ? 'ar' : 'en');
        root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        document.body.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        localStorage.setItem('portnova-language', language);
    }, [language]);

    const toggleLanguage = () => {
        setLanguage((current) => (current === 'ar' ? 'en' : 'ar'));
    };

    const value = useMemo(
        () => ({
            language,
            isArabic: language === 'ar',
            toggleLanguage,
            languageLabels,
        }),
        [language]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }

    return context;
};
