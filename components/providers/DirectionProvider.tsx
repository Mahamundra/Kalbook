"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { isRTL as checkRTL, detectBrowserLocale, getLocaleDisplayName } from '@/components/ported/lib/i18n';

type Locale = 'en' | 'he' | 'ar' | 'ru';

interface DirectionContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  isTransitioning: boolean;
}

const DirectionContext = createContext<DirectionContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'bookinghub-locale';
const LOCALE_COOKIE_KEY = 'locale';
const FIRST_VISIT_KEY = 'bookinghub-first-visit';

export const DirectionProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    
    // Check localStorage first
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && ['en', 'he', 'ar', 'ru'].includes(stored)) {
      return stored as Locale;
    }
    
    // Check cookie
    const cookieMatch = document.cookie.match(new RegExp(`${LOCALE_COOKIE_KEY}=([^;]+)`));
    if (cookieMatch && ['en', 'he', 'ar', 'ru'].includes(cookieMatch[1])) {
      return cookieMatch[1] as Locale;
    }
    
    return 'en';
  });
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const dir = checkRTL(locale) ? 'rtl' : 'ltr';

  // Detect browser language on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);
    if (isFirstVisit) {
      localStorage.setItem(FIRST_VISIT_KEY, 'false');
      const browserLocale = detectBrowserLocale();
      
      if (browserLocale !== locale) {
        const localeNames: Record<Locale, string> = {
          en: 'English',
          he: 'עברית',
          ar: 'العربية',
          ru: 'Русский'
        };
        
        toast.info(`Detected language: ${localeNames[browserLocale]}`, {
          description: 'Click to switch language',
          action: {
            label: 'Switch',
            onClick: () => setLocale(browserLocale)
          },
          duration: 8000,
        });
      }
    }
  }, []);

  // Apply direction and locale to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    if (typeof window === 'undefined') return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
      setIsTransitioning(true);
    }

    // Small delay to show transition
    await new Promise(resolve => setTimeout(resolve, prefersReducedMotion ? 0 : 400));
    
    // Update locale
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.cookie = `${LOCALE_COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // End transition
    if (!prefersReducedMotion) {
      setTimeout(() => setIsTransitioning(false), 400);
    }
  };

  return (
    <DirectionContext.Provider
      value={{
        locale,
        setLocale,
        dir,
        isRTL: checkRTL(locale),
        isTransitioning,
      }}
    >
      {children}
    </DirectionContext.Provider>
  );
};

export const useDirection = () => {
  const context = useContext(DirectionContext);
  if (!context) {
    throw new Error('useDirection must be used within DirectionProvider');
  }
  return context;
};
