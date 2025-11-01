export interface Metric {
  label: string;
  value: string | number;
  change: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ScheduleItem {
  id: string;
  time: string;
  service: string;
  customer: string;
  staff: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration: number; // minutes
  price: number;
  taxRate: number; // percentage
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  tags: string[];
  notes?: string;
  visitHistory: Visit[];
  consentMarketing: boolean;
}

export interface Visit {
  date: string;
  service: string;
  staff: string;
}

export interface Template {
  id: string;
  channel: 'email' | 'message';
  type: 'booking_confirmation' | 'reminder' | 'cancellation';
  locale: 'en' | 'he';
  subject?: string;
  body: string;
}

export interface Settings {
  businessProfile: BusinessProfile;
  branding: Branding;
  locale: LocaleSettings;
  notifications: NotificationSettings;
  calendar: CalendarSettings;
}

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  timezone: string;
  currency: string;
}

export interface Branding {
  logoUrl?: string;
  themeColor: string;
}

export interface LocaleSettings {
  language: 'en' | 'he';
  rtl: boolean;
}

export interface NotificationSettings {
  senderName: string;
  senderEmail: string;
}

export interface CalendarSettings {
  weekStartDay: number; // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  workingDays: number[]; // Array of day numbers (0-6) that are working days
  workingHours: {
    start: string; // Format: "HH:mm" (e.g., "09:00")
    end: string; // Format: "HH:mm" (e.g., "18:00")
  };
}

export interface Appointment {
  id: string;
  staffId: string; // Worker ID
  workerId?: string; // Alias for staffId for clarity
  service: string; // Service name
  serviceId?: string; // Service ID
  customer: string; // Customer name
  customerId?: string; // Customer ID
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface Worker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  services: string[]; // Service IDs that this worker can provide
  active: boolean;
}


