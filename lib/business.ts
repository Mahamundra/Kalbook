/**
 * Business lookup and validation utilities
 */

import { createAdminClient } from './supabase/admin';
import type { Database } from './supabase/database.types';

type Business = Database['public']['Tables']['businesses']['Row'];

/**
 * Get business by slug
 * Uses admin client to bypass RLS for public booking pages
 */
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
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

