import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Language = 'en' | 'hi';

interface Translations {
  [key: string]: any;
}

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLanguages: { code: Language; name: string; nativeName: string }[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

const translationsCache: Record<Language, Translations> = {
  en: {},
  hi: {}
};

let translationsLoaded = false;

async function loadTranslations(lang: Language): Promise<Translations> {
  if (Object.keys(translationsCache[lang]).length > 0) {
    return translationsCache[lang];
  }

  try {
    const response = await fetch(`/i18n/${lang}.json`);
    if (response.ok) {
      const data = await response.json();
      translationsCache[lang] = data;
      return data;
    }
  } catch (error) {
    console.warn(`Failed to load translations for ${lang}:`, error);
  }

  return {};
}

async function preloadAllTranslations(): Promise<void> {
  if (translationsLoaded) return;
  await Promise.all([
    loadTranslations('en'),
    loadTranslations('hi')
  ]);
  translationsLoaded = true;
}

function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return '';
    current = current[key];
  }

  return typeof current === 'string' ? current : '';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(params[key] ?? match);
  });
}

export function I18nProvider({
  children,
  defaultLanguage = 'en'
}: {
  children: ReactNode;
  defaultLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations on language change
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      const data = await loadTranslations(language);
      if (mounted) {
        setTranslations(data);
        setIsLoading(false);
      }
    }

    load();

    return () => { mounted = false; };
  }, [language]);

  // Preload all translations on mount
  useEffect(() => {
    preloadAllTranslations();
  }, []);

  // Persist language preference
  useEffect(() => {
    localStorage.setItem('universe-explorer-language', language);

    // Update document lang attribute
    document.documentElement.lang = language;

    // Update direction for RTL languages if needed
    document.documentElement.dir = 'ltr'; // Both en and hi are LTR
  }, [language]);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('universe-explorer-language') as Language | null;
    if (saved && (saved === 'en' || saved === 'hi')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const template = getNestedValue(translations, key);
    if (!template) {
      // Fallback to English if translation missing
      if (language !== 'en') {
        const fallback = getNestedValue(translationsCache.en, key);
        if (fallback) return interpolate(fallback, params);
      }
      return key; // Return key as last resort
    }
    return interpolate(template, params);
  }, [translations, language]);

  const availableLanguages = [
    { code: 'en' as Language, name: 'English', nativeName: 'English' },
    { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिन्दी' }
  ];

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Re-export types
export type { Translations };