import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

const translations: Record<string, any> = { fr, en, ar };

interface I18nContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string, options?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType>({
    language: 'en',
    setLanguage: () => {},
    t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        const savedLang = localStorage.getItem('language');
        return savedLang && ['fr', 'en', 'ar'].includes(savedLang) ? savedLang : 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);

    const setLanguage = useCallback((lang: string) => {
        if (['fr', 'en', 'ar'].includes(lang)) {
            setLanguageState(lang);
        }
    }, []);

    const t = useCallback((key: string, options?: Record<string, any>): string => {
        let translation = key.split('.').reduce((obj, k) => obj?.[k], translations[language]);

        if (typeof translation !== 'string') {
            // Fallback to English if key not found in current language
            translation = key.split('.').reduce((obj, k) => obj?.[k], translations['en']);
            if (typeof translation !== 'string') {
                 console.warn(`[i18n] Missing translation for key: ${key}`);
                return key; // Return the key if no translation is found
            }
        }

        if (options) {
            Object.keys(options).forEach(optKey => {
                translation = translation.replace(`{${optKey}}`, options[optKey]);
            });
        }
        
        return translation;
    }, [language]);

    const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => useContext(I18nContext);