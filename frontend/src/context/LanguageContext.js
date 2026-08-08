import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { messages } from '../i18n';

const LanguageContext = createContext(null);

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

    // Single translation lookup: t('key') returns the active-language string.
    // Optional {var} interpolation: t('jobsAvailable', { n: 5 }).
    const t = useCallback(
        (key, vars) => {
            const table = messages[language] || messages.ar;
            let str = table[key] !== undefined ? table[key] : key;
            if (vars) {
                Object.keys(vars).forEach((name) => {
                    str = str.replace(new RegExp(`\\{${name}\\}`, 'g'), String(vars[name]));
                });
            }
            return str;
        },
        [language]
    );

    const value = useMemo(
        () => ({
            language,
            isArabic: language === 'ar',
            toggleLanguage,
            t,
        }),
        [language, t]
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
