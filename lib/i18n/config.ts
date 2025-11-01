export const locales = ["en", "he", "ar", "ru"] as const;
export type Locale = typeof locales[number];
export const rtlLocales = new Set<Locale>(["he", "ar"]);
export function isRTL(locale: Locale) { return rtlLocales.has(locale); }