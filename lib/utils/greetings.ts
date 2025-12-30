type Locale = 'en' | 'he' | 'ar' | 'ru';

/**
 * Get time-based greeting based on current hour and locale
 * @param locale - The locale to use for the greeting
 * @param userName - Optional user name to include in the greeting
 * @returns The greeting string
 */
export function getTimeBasedGreeting(locale: Locale, userName?: string): string {
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

  const baseGreeting = greetings[locale]?.[timeOfDay] || greetings.en[timeOfDay];
  
  // Add user name if provided
  if (userName) {
    // Format greeting with name based on locale
    const namePlaceholders: Record<Locale, string> = {
      en: `${baseGreeting}, {name}!`,
      he: `${baseGreeting} {name}!`,
      ar: `${baseGreeting} {name}!`,
      ru: `${baseGreeting}, {name}!`,
    };
    return namePlaceholders[locale] || namePlaceholders.en;
  }
  
  return baseGreeting;
}

/**
 * Get default guest message with time-based greeting
 * @param locale - The locale to use for the greeting
 * @returns The default guest greeting message
 */
export function getDefaultGuestMessage(locale: Locale): string {
  // Hebrew uses a static guest message
  if (locale === 'he') {
    return 'ברוכים הבאים - התחברו כדי לקבוע תור';
  }

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

  // Default guest messages with time-based greetings and emojis
  const guestMessages: Record<Locale, Record<string, string>> = {
    en: {
      morning: '🌅 Good morning',
      afternoon: '☀️ Good afternoon',
      evening: '🌆 Good evening',
      night: '🌙 Good night',
    },
    he: {
      morning: '🌅 בוקר טוב',
      afternoon: '☀️ צהריים טובים',
      evening: '🌆 ערב טוב',
      night: '🌙 לילה טוב',
    },
    ar: {
      morning: '🌅 صباح الخير',
      afternoon: '☀️ مساء الخير',
      evening: '🌆 مساء الخير',
      night: '🌙 ليلة سعيدة',
    },
    ru: {
      morning: '🌅 Доброе утро',
      afternoon: '☀️ Добрый день',
      evening: '🌆 Добрый вечер',
      night: '🌙 Спокойной ночи',
    },
  };

  return guestMessages[locale]?.[timeOfDay] || guestMessages.en[timeOfDay];
}

/**
 * Get default logged-in message with time-based greeting
 * @param locale - The locale to use for the greeting
 * @returns The default logged-in greeting message with {name} placeholder
 */
export function getDefaultLoggedInMessage(locale: Locale): string {
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

  // Default logged-in messages with time-based greetings and {name} placeholder, with emojis
  const loggedInMessages: Record<Locale, Record<string, string>> = {
    en: {
      morning: '🌅 Good morning, {name}',
      afternoon: '☀️ Good afternoon, {name}',
      evening: '🌆 Good evening, {name}',
      night: '🌙 Good night, {name}',
    },
    he: {
      morning: '🌅 בוקר טוב {name}',
      afternoon: '☀️ צהריים טובים {name}',
      evening: '🌆 ערב טוב {name}',
      night: '🌙 לילה טוב {name}',
    },
    ar: {
      morning: '🌅 صباح الخير {name}',
      afternoon: '☀️ مساء الخير {name}',
      evening: '🌆 مساء الخير {name}',
      night: '🌙 ليلة سعيدة {name}',
    },
    ru: {
      morning: '🌅 Доброе утро, {name}',
      afternoon: '☀️ Добрый день, {name}',
      evening: '🌆 Добрый вечер, {name}',
      night: '🌙 Спокойной ночи, {name}',
    },
  };

  return loggedInMessages[locale]?.[timeOfDay] || loggedInMessages.en[timeOfDay];
}

/**
 * Check if a message is one of the old static default messages
 * @param message - The message to check
 * @returns true if the message matches an old default format
 */
export function isOldDefaultMessage(message: string): boolean {
  if (!message || message.trim() === '') return false;
  
  const trimmedMessage = message.trim();
  
  // Exact matches for old defaults
  const oldDefaults = [
    'שלום אורח, ברוך הבא!',
    'שלום {name}, ברוך הבא!',
    'Hello guest, welcome!',
    'Hello {name}, welcome!',
    'مرحباً ضيف، أهلاً بك!',
    'مرحباً {name}، أهلاً بك!',
    'Привет гость, добро пожаловать!',
    'Привет {name}, добро пожаловать!',
  ];
  
  if (oldDefaults.some(oldDefault => trimmedMessage === oldDefault)) {
    return true;
  }
  
  // Pattern matches for messages where name has been replaced
  // Hebrew: "שלום [anything], ברוך הבא!"
  if (/^שלום\s+.+,\s*ברוך הבא!$/.test(trimmedMessage)) {
    return true;
  }
  
  // English: "Hello [anything], welcome!"
  if (/^Hello\s+.+,\s*welcome!$/i.test(trimmedMessage)) {
    return true;
  }
  
  // Arabic: "مرحباً [anything]، أهلاً بك!"
  if (/^مرحباً\s+.+،\s*أهلاً بك!$/.test(trimmedMessage)) {
    return true;
  }
  
  // Russian: "Привет [anything], добро пожаловать!"
  if (/^Привет\s+.+,\s*добро пожаловать!$/i.test(trimmedMessage)) {
    return true;
  }
  
  return false;
}

/**
 * Get the appropriate greeting message, replacing old defaults with time-based greetings
 * @param savedMessage - The saved message from settings
 * @param locale - The locale to use
 * @param isLoggedIn - Whether the user is logged in
 * @returns The message to display
 */
export function getGreetingMessage(
  savedMessage: string | undefined | null,
  locale: Locale,
  isLoggedIn: boolean
): string {
  // If message is empty or matches old default, use time-based greeting
  if (!savedMessage || savedMessage.trim() === '' || isOldDefaultMessage(savedMessage)) {
    return isLoggedIn 
      ? getDefaultLoggedInMessage(locale)
      : getDefaultGuestMessage(locale);
  }
  
  // Otherwise use the saved message
  return savedMessage;
}

/**
 * Get available guest message templates for a locale
 * @param locale - The locale to use
 * @returns Array of template objects with id, label, and value
 */
export function getGuestMessageTemplates(locale: Locale): Array<{ id: string; label: string; value: string }> {
  const templates: Record<Locale, Array<{ id: string; label: string; value: string }>> = {
    en: [
      { id: 'welcome', label: 'Welcome - Log in to continue', value: 'Welcome - Log in to continue' },
      { id: 'welcome-book', label: 'Welcome - Log in to book an appointment', value: 'Welcome - Log in to book an appointment' },
      { id: 'welcome-simple', label: 'Welcome!', value: 'Welcome!' },
      { id: 'hello-welcome', label: 'Hello! Welcome to our booking system', value: 'Hello! Welcome to our booking system' },
      { id: 'sign-in', label: 'Please sign in to access your account', value: 'Please sign in to access your account' },
      { id: 'create-account', label: 'New here? Create an account to get started', value: 'New here? Create an account to get started' },
      { id: 'book-now', label: 'Ready to book? Sign in to get started', value: 'Ready to book? Sign in to get started' },
    ],
    he: [
      { id: 'welcome', label: 'ברוכים הבאים - התחברו כדי להמשיך', value: 'ברוכים הבאים - התחברו כדי להמשיך' },
      { id: 'welcome-book', label: 'ברוכים הבאים - התחברו כדי לקבוע תור', value: 'ברוכים הבאים - התחברו כדי לקבוע תור' },
      { id: 'welcome-simple', label: 'ברוכים הבאים!', value: 'ברוכים הבאים!' },
      { id: 'hello-welcome', label: 'שלום! ברוכים הבאים למערכת הזמנות שלנו', value: 'שלום! ברוכים הבאים למערכת הזמנות שלנו' },
      { id: 'sign-in', label: 'אנא התחברו כדי לגשת לחשבון שלכם', value: 'אנא התחברו כדי לגשת לחשבון שלכם' },
      { id: 'create-account', label: 'חדש כאן? צרו חשבון כדי להתחיל', value: 'חדש כאן? צרו חשבון כדי להתחיל' },
      { id: 'book-now', label: 'מוכנים לקבוע? התחברו כדי להתחיל', value: 'מוכנים לקבוע? התחברו כדי להתחיל' },
    ],
    ar: [
      { id: 'welcome', label: 'مرحباً - سجل الدخول للمتابعة', value: 'مرحباً - سجل الدخول للمتابعة' },
      { id: 'welcome-book', label: 'مرحباً - سجل الدخول لحجز موعد', value: 'مرحباً - سجل الدخول لحجز موعد' },
      { id: 'welcome-simple', label: 'مرحباً!', value: 'مرحباً!' },
      { id: 'hello-welcome', label: 'مرحباً! أهلاً بك في نظام الحجز لدينا', value: 'مرحباً! أهلاً بك في نظام الحجز لدينا' },
      { id: 'sign-in', label: 'يرجى تسجيل الدخول للوصول إلى حسابك', value: 'يرجى تسجيل الدخول للوصول إلى حسابك' },
      { id: 'create-account', label: 'جديد هنا؟ أنشئ حساباً للبدء', value: 'جديد هنا؟ أنشئ حساباً للبدء' },
      { id: 'book-now', label: 'جاهز للحجز؟ سجل الدخول للبدء', value: 'جاهز للحجز؟ سجل الدخول للبدء' },
    ],
    ru: [
      { id: 'welcome', label: 'Добро пожаловать - Войдите, чтобы продолжить', value: 'Добро пожаловать - Войдите, чтобы продолжить' },
      { id: 'welcome-book', label: 'Добро пожаловать - Войдите, чтобы записаться', value: 'Добро пожаловать - Войдите, чтобы записаться' },
      { id: 'welcome-simple', label: 'Добро пожаловать!', value: 'Добро пожаловать!' },
      { id: 'hello-welcome', label: 'Здравствуйте! Добро пожаловать в нашу систему бронирования', value: 'Здравствуйте! Добро пожаловать в нашу систему бронирования' },
      { id: 'sign-in', label: 'Пожалуйста, войдите, чтобы получить доступ к вашему аккаунту', value: 'Пожалуйста, войдите, чтобы получить доступ к вашему аккаунту' },
      { id: 'create-account', label: 'Впервые здесь? Создайте аккаунт, чтобы начать', value: 'Впервые здесь? Создайте аккаунт, чтобы начать' },
      { id: 'book-now', label: 'Готовы записаться? Войдите, чтобы начать', value: 'Готовы записаться? Войдите, чтобы начать' },
    ],
  };

  return templates[locale] || templates.en;
}














