import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getBusinessBySlug } from '@/lib/business';
import en from '@/messages/en.json';
import he from '@/messages/he.json';
import ar from '@/messages/ar.json';
import ru from '@/messages/ru.json';

type Locale = 'en' | 'he' | 'ar' | 'ru';

const translations: Record<Locale, any> = {
  en,
  he,
  ar,
  ru,
};

// Map route segments to nav translation keys
const routeToNavKey: Record<string, string> = {
  'dashboard': 'dashboard',
  'calendar': 'calendar',
  'services': 'services',
  'classes': 'classes',
  'workers': 'workers',
  'customers': 'customers',
  'trainers': 'trainers',
  'clients': 'clients',
  'activity-logs': 'activityLogs',
  'templates': 'templates',
  'qr': 'qr',
  'settings': 'settings',
  'analytics': 'analytics',
  'workout-requests': 'workoutRequests',
  'workout-types': 'workoutTypes',
};

function getLocale(): Locale {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale');
  
  if (localeCookie?.value && ['en', 'he', 'ar', 'ru'].includes(localeCookie.value)) {
    return localeCookie.value as Locale;
  }
  
  return 'he'; // Default to Hebrew
}

export async function generateAdminMetadata(
  slug: string,
  pageSegment?: string
): Promise<Metadata> {
  const business = await getBusinessBySlug(slug);
  const businessName = business?.name || 'Business';
  const locale = getLocale();
  const messages = translations[locale] || translations.he;
  
  // Get the nav key for this route
  const navKey = pageSegment ? routeToNavKey[pageSegment] : 'dashboard';
  const pageTitle = navKey && messages?.nav?.[navKey] 
    ? messages.nav[navKey] 
    : messages?.nav?.dashboard || 'Dashboard';
  
  return {
    title: `${pageTitle} - ${businessName}`,
  };
}



