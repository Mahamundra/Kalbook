import { useDirection } from '@/contexts/DirectionProvider';
import { getLocaleDisplayName } from '@/lib/i18n';
import { Languages } from 'lucide-react';

type Locale = 'en' | 'he' | 'ar' | 'ru';

const languages: Locale[] = ['en', 'he', 'ar', 'ru'];

export const LanguageToggle = () => {
  const { locale, setLocale } = useDirection();

  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
      <Languages className="w-4 h-4 text-muted-foreground mx-2" />
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
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
