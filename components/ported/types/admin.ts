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
  isGroupService?: boolean;
  maxCapacity?: number | null;
  minCapacity?: number | null;
  allowWaitlist?: boolean;
  groupPricingType?: 'per_person' | 'fixed' | null;
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
  dateOfBirth?: string;
  gender?: string;
  blocked?: boolean;
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
  registration?: RegistrationSettings;
}

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  timezone: string;
  currency: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
    youtube?: string;
  };
}

export interface Branding {
  logoUrl?: string;
  themeColor: string;
  bannerCover?: {
    type: 'upload' | 'pattern';
    uploadUrl?: string;
    videoUrl?: string;
    patternId?: string;
    position?: {
      x: number; // percentage (0-100)
      y: number; // percentage (0-100)
    };
  };
  guestMessage?: string;
  loggedInMessage?: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea';
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface RegistrationSettings {
  customFields?: CustomField[];
  defaultGender?: 'male' | 'female' | 'other' | '';
}

export interface LocaleSettings {
  language: 'en' | 'he';
  rtl: boolean;
}

export interface NotificationSettings {
  senderName: string;
  senderEmail: string;
  reminderMessage?: string;
}

export interface CalendarSettings {
  weekStartDay: number; // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  workingDays: number[]; // Array of day numbers (0-6) that are working days
  workingHours: {
    start: string; // Format: "HH:mm" (e.g., "09:00")
    end: string; // Format: "HH:mm" (e.g., "18:00")
  };
  timeSlotGap?: number; // Time slot gap in minutes (5-60), default 60
  contactMessage?: {
    enabled: boolean;
    message: string;
    showPhone: boolean;
    showWhatsApp: boolean;
  };
  reschedule?: {
    allowCustomerReschedule: boolean; // Whether customers can reschedule appointments
    requireApproval: boolean; // If true, reschedule requests need approval; if false, auto-approve
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
  isGroupAppointment?: boolean;
  currentParticipants?: number;
  maxCapacity?: number; // From service
}

export interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  customerId: string;
  customerName?: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  joinedAt: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  services: string[]; // Service IDs that this worker can provide
  active: boolean;
  color?: string; // Hex color code for the worker (e.g., "#3B82F6")
  isAdmin?: boolean; // Whether this worker has admin access (deprecated, use role instead)
  isMainAdmin?: boolean; // Whether this worker is the main admin (owner) - cannot be deleted
  role?: 'admin' | 'worker'; // Worker's role - 'admin' if they can login, 'worker' if they cannot
  userId?: string; // User ID from users table if this worker has admin access
}


