"use client";
import { useDirection } from '@/components/providers/DirectionProvider';
import { t } from '@/components/ported/lib/i18n';

export const useLocale = () => {
  const { locale, setLocale, dir, isRTL } = useDirection();
  const translate = (key: string) => t(key, locale);

  return {
    locale,
    setLocale,
    t: translate,
    isRTL,
    dir,
  };
};