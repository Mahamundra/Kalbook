type Locale = 'en' | 'he' | 'ar' | 'ru';

/**
 * Get time-based greeting based on current hour and locale
 * @param locale - The locale to use for the greeting
 * @returns The greeting string
 */
export function getTimeBasedGreeting(locale: Locale): string {
  const hour = new Date().getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

  // Determine time of day based on hour
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon';
  } else if (hour >= 18 && hour < 22) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  // Return greeting based on locale and time of day
  const greetings: Record<Locale, Record<string, string>> = {
    en: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      night: 'Good night',
    },
    he: {
      morning: 'בוקר טוב',
      afternoon: 'צהריים טובים',
      evening: 'ערב טוב',
      night: 'לילה טוב',
    },
    ar: {
      morning: 'صباح الخير',
      afternoon: 'مساء الخير',
      evening: 'مساء الخير',
      night: 'ليلة سعيدة',
    },
    ru: {
      morning: 'Доброе утро',
      afternoon: 'Добрый день',
      evening: 'Добрый вечер',
      night: 'Спокойной ночи',
    },
  };

  return greetings[locale]?.[timeOfDay] || greetings.en[timeOfDay];
}












