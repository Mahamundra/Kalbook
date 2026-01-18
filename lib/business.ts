/**
 * Business lookup and validation utilities
 */

import { createAdminClient } from './supabase/admin';
import type { Database } from './supabase/database.types';

type Business = Database['public']['Tables']['businesses']['Row'];

// Request-scoped cache for deduplication within the same request
// This Map will be shared across all calls to getBusinessBySlug within a single request
const requestCache = new Map<string, Promise<Business | null>>();

/**
 * Get business by slug
 * Uses admin client to bypass RLS for public booking pages
 * Cached per request to deduplicate multiple calls with the same slug
 */
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  // Check if we already have a pending request for this slug
  const cached = requestCache.get(slug);
  if (cached) {
    return cached;
  }

  // Create the fetch promise
  const promise = (async () => {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        // If business not found, return null instead of throwing
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } finally {
      // Clean up the cache after the request completes
      // This ensures the cache doesn't grow indefinitely
      requestCache.delete(slug);
    }
  })();

  // Store the promise in cache
  requestCache.set(slug, promise);

  return promise;
}

/**
 * Check if a business slug exists
 */
export async function businessExists(slug: string): Promise<boolean> {
  const business = await getBusinessBySlug(slug);
  return business !== null;
}

/**
 * Get business by ID
 */
export async function getBusinessById(id: string): Promise<Business | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Check if a business is in portfolio mode
 * Portfolio mode = portfolio plan OR is_portfolio flag
 * @param businessIdOrSlug - Business ID (UUID) or slug
 * @returns true if business is in portfolio mode
 */
export async function isPortfolioBusiness(
  businessIdOrSlug: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessIdOrSlug);
  
  // First, get the business
  let business: Business | null = null;
  
  if (isUUID) {
    business = await getBusinessById(businessIdOrSlug);
  } else {
    business = await getBusinessBySlug(businessIdOrSlug);
  }
  
  if (!business) {
    return false;
  }
  
  // Check if on portfolio plan
  if (business.plan_id) {
    const { getBusinessPlan } = await import('@/lib/trial/utils');
    const plan = await getBusinessPlan(business.id);
    if (plan?.name === 'portfolio') {
      return true;
    }
  }
  
  // Fallback to is_portfolio flag
  return business.is_portfolio ?? false;
}

/**
 * Check if business can enable booking
 * @param businessId - Business ID
 * @returns true if business can enable booking functionality
 */
export async function canEnableBooking(businessId: string): Promise<boolean> {
  const isPortfolio = await isPortfolioBusiness(businessId);
  if (isPortfolio) {
    return false;
  }
  
  // Check if trial expired
  const { isTrialExpired } = await import('@/lib/trial/utils');
  const expired = await isTrialExpired(businessId);
  if (expired) {
    return false;
  }
  
  // Check if plan has booking feature
  const { checkPlanFeature } = await import('@/lib/trial/utils');
  return await checkPlanFeature(businessId, 'create_appointments');
}
