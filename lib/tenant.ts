/**
 * Tenant context utilities for multi-tenant support
 */

import { headers, cookies } from 'next/headers';
import type { Database } from './supabase/database.types';
import { getBusinessBySlug, getBusinessById } from './business';

type Business = Database['public']['Tables']['businesses']['Row'];

/**
 * Tenant context that gets attached to requests
 */
export interface TenantContext {
  business: Business;
  businessId: string;
  businessSlug: string;
}

/**
 * Simplified tenant info from headers (for middleware)
 */
export interface TenantInfo {
  businessId: string;
  businessSlug: string | null;
}

/**
 * Extract business slug from URL
 * Supports:
 * - /b/[slug] - slug-based routing
 * - /booking?business=slug - query parameter
 * - subdomain.business.com - subdomain (if configured)
 */
export function extractBusinessSlug(url: URL, hostname?: string): string | null {
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  // 1. Check for /b/[slug] pattern
  const slugMatch = pathname.match(/^\/b\/([^\/]+)/);
  if (slugMatch) {
    return slugMatch[1];
  }

  // 2. Check for ?business=slug query parameter
  const businessParam = searchParams.get('business');
  if (businessParam) {
    return businessParam;
  }

  // 3. Check for subdomain (optional - if you want subdomain support)
  if (hostname) {
    const subdomainMatch = hostname.match(/^([^\.]+)\./);
    if (subdomainMatch && subdomainMatch[1] !== 'www' && subdomainMatch[1] !== 'app') {
      // You can add logic here to validate subdomain is a business slug
      // For now, we'll skip subdomain extraction unless you configure it
    }
  }

  return null;
}

/**
 * Create tenant context from business
 */
export function createTenantContext(business: Business): TenantContext {
  return {
    business,
    businessId: business.id,
    businessSlug: business.slug,
  };
}

/**
 * Get tenant context from request headers (Server Components, API Routes)
 * This reads the tenant context set by middleware
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const headersList = await headers();
  const tenantHeader = headersList.get(TENANT_CONTEXT_HEADER);

  if (!tenantHeader) {
    return null;
  }

  try {
    const tenantInfo: TenantInfo = JSON.parse(tenantHeader);

    if (!tenantInfo.businessId) {
      return null;
    }

    // Fetch full business data
    let business: Business | null = null;

    if (tenantInfo.businessSlug) {
      business = await getBusinessBySlug(tenantInfo.businessSlug);
    } else {
      business = await getBusinessById(tenantInfo.businessId);
    }

    if (!business) {
      return null;
    }

    return createTenantContext(business);
  } catch (error) {
    console.error('Error parsing tenant context:', error);
    return null;
  }
}

/**
 * Get tenant info from headers (lightweight, doesn't fetch business)
 */
export async function getTenantInfo(): Promise<TenantInfo | null> {
  const headersList = await headers();
  const tenantHeader = headersList.get(TENANT_CONTEXT_HEADER);

  if (!tenantHeader) {
    return null;
  }

  try {
    return JSON.parse(tenantHeader) as TenantInfo;
  } catch (error) {
    console.error('Error parsing tenant info:', error);
    return null;
  }
}

/**
 * Get business slug from cookie (client-side)
 */
export async function getBusinessSlugFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(BUSINESS_SLUG_COOKIE)?.value || null;
}

/**
 * Headers key for tenant context in Next.js
 */
export const TENANT_CONTEXT_HEADER = 'x-tenant-context';

/**
 * Cookie key for storing business slug (for client-side)
 */
export const BUSINESS_SLUG_COOKIE = 'business-slug';

