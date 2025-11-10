/**
 * Session management for customers and business owners
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];
type User = Database['public']['Tables']['users']['Row'];

/**
 * Customer session data
 */
export interface CustomerSession {
  type: 'customer';
  customerId: string;
  businessId: string;
  phone: string;
  name: string;
  email?: string | null;
}

/**
 * Business owner session data
 */
export interface BusinessOwnerSession {
  type: 'business_owner';
  userId: string;
  businessId: string;
  email: string;
  phone?: string | null;
  name: string;
  role: 'owner' | 'admin';
  isMainAdmin?: boolean;
}

export type AuthSession = CustomerSession | BusinessOwnerSession;

/**
 * Create or get customer session
 * Returns customer data (will be stored in session cookie)
 */
export async function getOrCreateCustomerSession(
  businessId: string,
  phone: string
): Promise<CustomerSession> {
  const supabase = createAdminClient();

  // Check if customer exists
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .maybeSingle();

  if (existingCustomer) {
    return {
      type: 'customer',
      customerId: existingCustomer.id,
      businessId: existingCustomer.business_id,
      phone: existingCustomer.phone,
      name: existingCustomer.name,
      email: existingCustomer.email,
    };
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      business_id: businessId,
      phone,
      name: phone, // Default name to phone, user can update later
    })
    .select()
    .single();

  if (error || !newCustomer) {
    throw new Error(`Failed to create customer: ${error?.message}`);
  }

  return {
    type: 'customer',
    customerId: newCustomer.id,
    businessId: newCustomer.business_id,
    phone: newCustomer.phone,
    name: newCustomer.name,
    email: newCustomer.email,
  };
}

/**
 * Get customer by ID
 */
export async function getCustomerSession(
  customerId: string
): Promise<CustomerSession | null> {
  const supabase = createAdminClient();

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !customer) {
    return null;
  }

  return {
    type: 'customer',
    customerId: customer.id,
    businessId: customer.business_id,
    phone: customer.phone,
    name: customer.name,
    email: customer.email,
  };
}

/**
 * Get business owner session from Supabase Auth
 */
export async function getBusinessOwnerSession(): Promise<BusinessOwnerSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user record from users table
  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    return null;
  }

  return {
    type: 'business_owner',
    userId: userData.id,
    businessId: userData.business_id,
    email: userData.email,
    phone: userData.phone,
    name: userData.name,
    role: userData.role,
    isMainAdmin: userData.is_main_admin || false,
  };
}

/**
 * Get customer session from cookie (Server Components)
 */
export async function getCustomerSessionFromCookie(): Promise<CustomerSession | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('customer_session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value) as CustomerSession;
    // Verify customer still exists
    return await getCustomerSession(session.customerId);
  } catch (error) {
    return null;
  }
}

/**
 * Get current session (customer or business owner)
 * Use in Server Components
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  // Try business owner first
  const businessOwnerSession = await getBusinessOwnerSession();
  if (businessOwnerSession) {
    return businessOwnerSession;
  }

  // Try customer session from cookie
  return await getCustomerSessionFromCookie();
}

/**
 * Logout current session
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

