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

