"use client";
import { useDirection } from '@/components/providers/DirectionProvider';
import { getLocaleDisplayName } from '@/components/ported/lib/i18n';
import { useLocale } from '@/components/ported/hooks/useLocale';
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
  const { t } = useLocale();

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
            "group flex items-center gap-1.5 h-8 sm:h-10 rounded-md border border-input bg-background px-3 sm:px-4 py-1.5 sm:py-2 text-sm transition-all hover:bg-accent hover:border-accent-foreground/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            isRTL && "flex-row-reverse"
          )}
          aria-label="Select language"
        >
          <Languages className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
          <div className={cn("flex flex-col leading-none", isRTL ? "items-end" : "items-start")}>
            <span className="text-[10px] text-muted-foreground leading-tight group-hover:text-white">{t('common.chooseLanguage')}</span>
            <span className="text-xs font-medium leading-tight group-hover:text-white">{getLocaleDisplayName(locale)}</span>
          </div>
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
              className="group cursor-pointer data-[state=checked]:bg-[#ff421c] data-[state=checked]:text-white hover:bg-black hover:text-white focus:bg-[#ff421c] focus:text-white"
            >
              <div className={cn(
                "flex items-center justify-between w-full",
                isRTL && "flex-row-reverse"
              )}>
                <span className="group-data-[state=checked]:text-white group-hover:text-white">{getLocaleDisplayName(lang)}</span>
                <span className="text-muted-foreground text-xs group-data-[state=checked]:text-white group-hover:text-white">
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