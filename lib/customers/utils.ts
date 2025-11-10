/**
 * Customer utility functions
 */

import type { Customer, Visit } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];
type CustomerTagRow = Database['public']['Tables']['customer_tags']['Row'];
type VisitRow = Database['public']['Tables']['visits']['Row'];

/**
 * Normalize phone number (remove spaces, dashes, parentheses)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * Convert phone number to E.164 format required by Supabase Auth
 * Supports Israeli numbers (starting with 0 or 972) and other international formats
 */
export function toE164Format(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If already in E.164 format (starts with +), return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Handle Israeli phone numbers (common format: 0542636737 or 972542636737)
  if (cleaned.startsWith('0')) {
    // Remove leading 0 and add +972 (Israel country code)
    return '+972' + cleaned.substring(1);
  }
  
  if (cleaned.startsWith('972')) {
    // Add + prefix if missing
    return '+' + cleaned;
  }
  
  // For other numbers, assume they're already in international format
  // If they're 10 digits, might be US/Canada - but we'll be conservative
  // and require explicit country code
  if (cleaned.length === 10 && !cleaned.startsWith('1')) {
    // Could be US/Canada - add +1
    return '+1' + cleaned;
  }
  
  // If no country code detected, return with + prefix (user should provide full number)
  // This is a fallback - ideally users should provide E.164 format
  return '+' + cleaned;
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  // Basic formatting - can be enhanced
  const cleaned = normalizePhone(phone);
  if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return cleaned;
}

/**
 * Map customer tags array to Customer interface
 */
function mapTagsToArray(tags: CustomerTagRow[]): string[] {
  return tags.map((tag) => tag.tag);
}

/**
 * Map visit history to Customer interface
 */
function mapVisitsToArray(visits: VisitRow[]): Visit[] {
  return visits.map((visit) => ({
    date: visit.date,
    service: visit.service_name,
    staff: visit.staff_name,
  }));
}

/**
 * Map database customer row to Customer interface
 */
export async function mapCustomerToInterface(
  customer: CustomerRow,
  tags: CustomerTagRow[] = [],
  visits: VisitRow[] = []
): Promise<Customer> {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email || '',
    lastVisit: customer.last_visit || '',
    tags: mapTagsToArray(tags),
    notes: customer.notes || undefined,
    visitHistory: mapVisitsToArray(visits),
    consentMarketing: customer.consent_marketing,
    dateOfBirth: customer.date_of_birth || undefined,
    gender: customer.gender || undefined,
    blocked: customer.blocked,
  };
}

/**
 * Map Customer interface to database insert format
 */
export function mapCustomerToDatabase(
  customer: Partial<Customer>,
  businessId: string
): Database['public']['Tables']['customers']['Insert'] {
  return {
    business_id: businessId,
    name: customer.name!,
    phone: customer.phone ? normalizePhone(customer.phone) : '',
    email: customer.email || null,
    notes: customer.notes || null,
    date_of_birth: customer.dateOfBirth || null,
    gender: customer.gender || null,
    consent_marketing: customer.consentMarketing ?? false,
    blocked: customer.blocked ?? false,
    last_visit: customer.lastVisit || null,
  };
}

