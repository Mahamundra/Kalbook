"use client";
import { useDirection } from '@/components/providers/DirectionProvider';
import { getLocaleDisplayName } from '@/components/ported/lib/i18n';
import { Languages } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ported/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Locale = 'en' | 'he' | 'ar' | 'ru';

const languages: Locale[] = ['en', 'he', 'ar', 'ru'];

const localeNames: Record<Locale, string> = {
  en: 'English',
  he: 'עברית',
  ar: 'العربية',
  ru: 'Русский'
};

export const LanguageToggle = () => {
  const { locale, setLocale, isRTL } = useDirection();

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    
    try {
      // Use DirectionProvider's setLocale which handles transitions and updates
      await setLocale(newLocale);
      
      // Show success toast
      toast.success(`Language changed to ${localeNames[newLocale]}`, {
        duration: 2000,
      });
    } catch (error) {
      toast.error('Failed to change language');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            isRTL && "flex-row-reverse"
          )}
          aria-label="Select language"
        >
          <Languages className="w-4 h-4" />
          <span>{getLocaleDisplayName(locale)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isRTL ? "start" : "end"}
        className="min-w-[160px]"
      >
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => handleLanguageChange(value as Locale)}>
          {languages.map((lang) => (
            <DropdownMenuRadioItem
              key={lang}
              value={lang}
              className="cursor-pointer"
            >
              <div className={cn(
                "flex items-center justify-between w-full",
                isRTL && "flex-row-reverse"
              )}>
                <span>{getLocaleDisplayName(lang)}</span>
                <span className="text-muted-foreground text-xs">
                  {localeNames[lang]}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};