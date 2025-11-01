"use client";
import { useDirection } from '@/components/providers/DirectionProvider';
import { getLocaleDisplayName } from '@/components/ported/lib/i18n';
import { Languages } from 'lucide-react';
import { toast } from 'sonner';

type Locale = 'en' | 'he' | 'ar' | 'ru';

const languages: Locale[] = ['en', 'he', 'ar', 'ru'];

export const LanguageToggle = () => {
  const { locale, setLocale } = useDirection();

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    
    try {
      // Use DirectionProvider's setLocale which handles transitions
      await setLocale(newLocale);
      
      // Show success toast
      const localeNames: Record<Locale, string> = {
        en: 'English',
        he: 'עברית',
        ar: 'العربية',
        ru: 'Русский'
      };
      
      toast.success(`Language changed to ${localeNames[newLocale]}`, {
        duration: 2000,
      });
      
      // Wait for transition animation, then reload to apply RTL changes
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 400);
    } catch (error) {
      toast.error('Failed to change language');
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
      <Languages className="w-4 h-4 text-muted-foreground mx-2" />
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            locale === lang
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
          aria-label={`Switch to ${lang}`}
        >
          {getLocaleDisplayName(lang)}
        </button>
      ))}
    </div>
  );
};