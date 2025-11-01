"use client";

import en from "@/messages/en.json";
import he from "@/messages/he.json";
import ar from "@/messages/ar.json";
import ru from "@/messages/ru.json";

export type Locale = 'en' | 'he' | 'ar' | 'ru';

type Messages = Record<string, any>;

const translations: Record<Locale, Messages> = {
  en,
  he,
  ar,
  ru,
};

function getNested(messages: Messages, path: string): string {
  return path.split(".").reduce((acc: any, key: string) => (acc ? acc[key] : undefined), messages) ?? path;
}

export const t = (key: string, locale: Locale = 'en'): string => {
  const bundle = translations[locale] || translations.en;
  return String(getNested(bundle, key));
};

export const isRTL = (locale: Locale): boolean => {
  return locale === 'he' || locale === 'ar';
};

export const getLocaleDisplayName = (locale: Locale): string => {
  const names = {
    en: 'EN',
    he: 'עב',
    ar: 'عر',
    ru: 'РУ'
  };
  return names[locale];
};

export const detectBrowserLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('he')) return 'he';
  if (browserLang.startsWith('ar')) return 'ar';
  if (browserLang.startsWith('ru')) return 'ru';
  return 'en';
};

export const formatCurrency = (amount: number, currency: string, locale: Locale): string => {
  const localeMap = {
    en: 'en-US',
    he: 'he-IL',
    ar: 'ar-SA',
    ru: 'ru-RU'
  } as const;
  const resolved = (localeMap as unknown as Record<string, string>)[locale] ?? 'en-US';
  return new Intl.NumberFormat(resolved, {
    style: 'currency',
    currency: currency || 'ILS',
  }).format(amount);
};

export const formatDate = (date: string, locale: Locale): string => {
  const localeMap = { en: 'en-US', he: 'he-IL', ar: 'ar-SA', ru: 'ru-RU' } as const;
  const resolved = (localeMap as unknown as Record<string, string>)[locale] ?? 'en-US';
  return new Intl.DateTimeFormat(resolved, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};