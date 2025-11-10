/**
 * Tenant context utilities for API routes
 */

import { NextRequest } from 'next/server';
import type { TenantContext, TenantInfo } from '../tenant';
import { getBusinessBySlug, getBusinessById } from '../business';
import { TENANT_CONTEXT_HEADER } from '../tenant';

/**
 * Get tenant context from API request headers
 * Use this in API route handlers
 */
export async function getTenantContextFromRequest(
  request: NextRequest
): Promise<TenantContext | null> {
  const tenantHeader = request.headers.get(TENANT_CONTEXT_HEADER);

  if (!tenantHeader) {
    return null;
  }

  try {
    const tenantInfo: TenantInfo = JSON.parse(tenantHeader);

    if (!tenantInfo.businessId) {
      return null;
    }

    // Fetch full business data
    let business;

    if (tenantInfo.businessSlug) {
      business = await getBusinessBySlug(tenantInfo.businessSlug);
    } else {
      business = await getBusinessById(tenantInfo.businessId);
    }

    if (!business) {
      return null;
    }

    return {
      business,
      businessId: business.id,
      businessSlug: business.slug,
    };
  } catch (error) {
    console.error('Error parsing tenant context from request:', error);
    return null;
  }
}

/**
 * Get tenant info from API request headers (lightweight)
 * Falls back to cookie or referer if header is not present (for client-side fetch calls)
 */
export async function getTenantInfoFromRequest(
  request: NextRequest
): Promise<TenantInfo | null> {
  // First try to get from header (set by middleware - this is the most reliable)
  const tenantHeader = request.headers.get(TENANT_CONTEXT_HEADER);

  if (tenantHeader) {
    try {
      const tenantInfo = JSON.parse(tenantHeader) as TenantInfo;
      // DEBUG: Log what we got from header
      console.log('[TENANT INFO] Got from header:', tenantInfo);
      return tenantInfo;
    } catch (error) {
      console.error('Error parsing tenant info from header:', error);
    }
  }

  // Fallback 1: Try to extract from Referer header (which page made the API call)
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererPath = refererUrl.pathname;
      const slugMatch = refererPath.match(/^\/b\/([^/]+)/);
      if (slugMatch) {
        const businessSlug = slugMatch[1];
        const { getBusinessBySlug } = await import('../business');
        const business = await getBusinessBySlug(businessSlug);
        
        if (business) {
          console.log('[TENANT INFO] Got from referer:', { businessId: business.id, businessSlug: business.slug });
          return {
            businessId: business.id,
            businessSlug: business.slug,
          };
        }
      }
    } catch (error) {
      console.error('Error extracting business from referer:', error);
    }
  }

  // Fallback 2: Get from cookie (for client-side fetch calls)
  // BUT: Only use cookie if it matches the referer (if referer has a slug)
  const businessSlugCookie = request.cookies.get('business-slug');
  if (businessSlugCookie?.value) {
    // If we have a referer with a slug, verify cookie matches
    let shouldUseCookie = true;
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererPath = refererUrl.pathname;
        const slugMatch = refererPath.match(/^\/b\/([^/]+)/);
        if (slugMatch) {
          const refererSlug = slugMatch[1];
          // If cookie doesn't match referer, don't use cookie
          if (businessSlugCookie.value !== refererSlug) {
            console.warn('[TENANT INFO] Cookie slug mismatch! Using referer instead.', {
              cookieSlug: businessSlugCookie.value,
              refererSlug: refererSlug,
            });
            shouldUseCookie = false;
          }
        }
      } catch (error) {
        // Ignore errors in referer parsing, continue with cookie
      }
    }
    
    if (shouldUseCookie) {
      try {
        // Import here to avoid circular dependency
        const { getBusinessBySlug } = await import('../business');
        const business = await getBusinessBySlug(businessSlugCookie.value);
        
        if (business) {
          console.log('[TENANT INFO] Got from cookie:', { businessId: business.id, businessSlug: business.slug });
          return {
            businessId: business.id,
            businessSlug: business.slug,
          };
        }
      } catch (error) {
        console.error('Error getting business from cookie:', error);
        // Continue to return null if business lookup fails
      }
    }
  }

  console.warn('[TENANT INFO] No tenant context found!', {
    hasHeader: !!tenantHeader,
    referer: referer,
    cookie: businessSlugCookie?.value,
  });

  return null;
}

/**
 * Require tenant context in API route
 * Throws error if tenant context is missing
 */
export async function requireTenantContext(
  request: NextRequest
): Promise<TenantContext> {
  const tenantContext = await getTenantContextFromRequest(request);

  if (!tenantContext) {
    throw new Error('Tenant context is required for this endpoint');
  }

  return tenantContext;
}

