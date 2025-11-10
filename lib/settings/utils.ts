/**
 * Settings utility functions for merging and mapping
 */

import type { Settings, BusinessProfile, Branding, LocaleSettings, NotificationSettings, CalendarSettings, RegistrationSettings } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];
type SettingsRow = Database['public']['Tables']['settings']['Row'];

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {} as any, source[key] as any) as any;
    } else if (source[key] !== undefined) {
      output[key] = source[key] as T[Extract<keyof T, string>];
    }
  }

  return output;
}

/**
 * Map business row to BusinessProfile
 */
function mapBusinessToProfile(business: BusinessRow): BusinessProfile {
  return {
    name: business.name,
    email: business.email || '',
    phone: business.phone || '',
    whatsapp: business.whatsapp || '',
    address: business.address || '',
    timezone: business.timezone,
    currency: business.currency,
    // Social links would need to be stored separately or in a JSONB column
    // For now, we'll return empty object
    socialLinks: {},
  };
}

/**
 * Map database settings to Settings interface
 */
export function mapSettingsToInterface(
  business: BusinessRow,
  settings: SettingsRow | null
): Settings {
  const businessProfile = mapBusinessToProfile(business);

  // Default settings structure
  const defaultSettings: Settings = {
    businessProfile,
    branding: {
      themeColor: '#0EA5E9',
      logoUrl: undefined,
    },
    locale: {
      language: 'en',
      rtl: false,
    },
    notifications: {
      senderName: business.name,
      senderEmail: business.email || '',
      reminderMessage: undefined,
    },
    calendar: {
      weekStartDay: 0,
      workingDays: [0, 1, 2, 3, 4],
      workingHours: {
        start: '09:00',
        end: '18:00',
      },
    },
    registration: {
      customFields: [],
      defaultGender: undefined,
    },
  };

  if (!settings) {
    return defaultSettings;
  }

  // Merge database settings with defaults
  return {
    businessProfile,
    branding: deepMerge(defaultSettings.branding, settings.branding || {}),
    locale: deepMerge(defaultSettings.locale, settings.locale || {}),
    notifications: deepMerge(defaultSettings.notifications, settings.notifications || {}),
    calendar: deepMerge(defaultSettings.calendar, settings.calendar || {}),
    registration: deepMerge(defaultSettings.registration || {}, settings.registration || {}),
  };
}

/**
 * Prepare settings update for database
 * Separates businessProfile (goes to businesses table) from other settings
 */
export function prepareSettingsUpdate(
  settingsUpdate: Partial<Settings>,
  businessId: string
): {
  businessUpdate: Partial<BusinessRow>;
  settingsUpdate: Partial<SettingsRow>;
} {
  const businessUpdate: Partial<BusinessRow> = {};
  const settingsDbUpdate: Partial<SettingsRow> = {};

  // Extract businessProfile fields to businesses table
  if (settingsUpdate.businessProfile) {
    const profile = settingsUpdate.businessProfile;
    if (profile.name !== undefined) businessUpdate.name = profile.name;
    if (profile.email !== undefined) businessUpdate.email = profile.email;
    if (profile.phone !== undefined) businessUpdate.phone = profile.phone;
    if (profile.whatsapp !== undefined) businessUpdate.whatsapp = profile.whatsapp;
    if (profile.address !== undefined) businessUpdate.address = profile.address;
    if (profile.timezone !== undefined) businessUpdate.timezone = profile.timezone;
    if (profile.currency !== undefined) businessUpdate.currency = profile.currency;
    // Note: socialLinks would need to be stored in a JSONB column or separate table
  }

  // Extract other settings to settings table JSONB columns
  if (settingsUpdate.branding !== undefined) {
    settingsDbUpdate.branding = settingsUpdate.branding as any;
  }

  if (settingsUpdate.locale !== undefined) {
    settingsDbUpdate.locale = settingsUpdate.locale as any;
  }

  if (settingsUpdate.notifications !== undefined) {
    settingsDbUpdate.notifications = settingsUpdate.notifications as any;
  }

  if (settingsUpdate.calendar !== undefined) {
    settingsDbUpdate.calendar = settingsUpdate.calendar as any;
  }

  if (settingsUpdate.registration !== undefined) {
    settingsDbUpdate.registration = settingsUpdate.registration as any;
  }

  return {
    businessUpdate,
    settingsUpdate: settingsDbUpdate,
  };
}

/**
 * Merge settings updates (for partial updates)
 */
export function mergeSettingsUpdate(
  currentSettings: Settings,
  update: Partial<Settings>
): Settings {
  return {
    businessProfile: deepMerge(currentSettings.businessProfile, update.businessProfile || {}),
    branding: deepMerge(currentSettings.branding, update.branding || {}),
    locale: deepMerge(currentSettings.locale, update.locale || {}),
    notifications: deepMerge(currentSettings.notifications, update.notifications || {}),
    calendar: deepMerge(currentSettings.calendar, update.calendar || {}),
    registration: deepMerge(currentSettings.registration || {}, update.registration || {}),
  };
}

