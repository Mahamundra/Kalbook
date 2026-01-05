"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { isRTL as checkRTL, detectBrowserLocale, getLocaleDisplayName } from '@/lib/i18n';

type Locale = 'en' | 'he' | 'ar' | 'ru';
type LocaleContext = 'booking' | 'admin';

interface DirectionContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  isTransitioning: boolean;
  localeReady: boolean;
}

const DirectionContext = createContext<DirectionContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY_BOOKING = 'bookinghub-locale-booking';
const LOCALE_STORAGE_KEY_ADMIN = 'bookinghub-locale-admin';
const LOCALE_COOKIE_KEY = 'locale';
const FIRST_VISIT_KEY = 'bookinghub-first-visit';

interface DirectionProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  context?: LocaleContext; // 'booking' or 'admin', auto-detected if not provided
}

// Helper to detect context from pathname
function detectContext(pathname: string | null): LocaleContext {
  if (!pathname) {
    // Fallback: check window.location if pathname is not available
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.includes('/admin') || (currentPath.startsWith('/b/') && currentPath.includes('/admin'))) {
        return 'admin';
      }
    }
    return 'booking';
  }
  // Check if pathname contains /admin
  if (pathname.includes('/admin') || (pathname.startsWith('/b/') && pathname.includes('/admin'))) {
    return 'admin';
  }
  return 'booking';
}

export const DirectionProvider = ({ children, initialLocale = 'he', context: providedContext }: DirectionProviderProps) => {
  const pathname = usePathname();
  
  // Auto-detect context from pathname if not provided
  const context = useMemo(() => {
    return providedContext || detectContext(pathname);
  }, [providedContext, pathname]);

  // Get context-specific storage key
  const LOCALE_STORAGE_KEY = useMemo(() => {
    return context === 'admin' ? LOCALE_STORAGE_KEY_ADMIN : LOCALE_STORAGE_KEY_BOOKING;
  }, [context]);

  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [localeReady, setLocaleReady] = useState(false);
  const dir = checkRTL(locale) ? 'rtl' : 'ltr';

  // Initialize locale from context-specific storage on mount and when context changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Try to get stored locale for this context first
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && ['en', 'he', 'ar', 'ru'].includes(stored)) {
      setLocaleState(stored as Locale);
    } else {
      // If no stored locale for this context, use initialLocale and store it
      localStorage.setItem(LOCALE_STORAGE_KEY, initialLocale);
      setLocaleState(initialLocale);
    }
    setLocaleReady(true);
  }, [context, LOCALE_STORAGE_KEY, initialLocale]);

  // Detect browser language on first visit (only for booking context)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (context !== 'booking') return; // Only show browser detection for booking pages
    
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
  }, [locale, context]);

  // Apply direction and locale to document (only update if changed)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.documentElement.dir !== dir) {
      document.documentElement.dir = dir;
    }
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
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
    // Store in context-specific localStorage
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    
    // Only update cookie for admin context (to maintain backward compatibility with server-side)
    // Booking context doesn't need cookie since it's client-side only
    if (context === 'admin') {
      document.cookie = `${LOCALE_COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    
    // Update document attributes immediately
    const newDir = checkRTL(newLocale) ? 'rtl' : 'ltr';
    document.documentElement.dir = newDir;
    document.documentElement.lang = newLocale;
    
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
        localeReady,
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
