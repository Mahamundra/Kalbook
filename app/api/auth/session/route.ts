import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBusinessOwnerSession } from '@/lib/auth/session';
import { getCustomerSession } from '@/lib/auth/session';
import { BUSINESS_SLUG_COOKIE } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

// Get business-specific session cookie name
function getSessionCookieName(businessSlug: string): string {
  return `customer_session_${businessSlug}`;
}

/**
 * GET /api/auth/session
 * Get current session (customer or business owner)
 */
export async function GET(request: NextRequest) {
  try {
    // Check for business owner session (Supabase Auth)
    const businessOwnerSession = await getBusinessOwnerSession();
    if (businessOwnerSession) {
      return NextResponse.json({
        success: true,
        session: businessOwnerSession,
      });
    }

    // Check for customer session (business-specific cookie)
    const cookieStore = await cookies();
    
    // Get business slug from cookie (set by middleware)
    const businessSlug = cookieStore.get(BUSINESS_SLUG_COOKIE)?.value;
    
    if (businessSlug) {
      const sessionCookieName = getSessionCookieName(businessSlug);
      const sessionCookie = cookieStore.get(sessionCookieName);

      if (sessionCookie?.value) {
        try {
          const customerSession = JSON.parse(sessionCookie.value);

          // Verify customer still exists and belongs to current business
          const verifiedSession = await getCustomerSession(customerSession.customerId);
          if (verifiedSession && verifiedSession.businessId === customerSession.businessId) {
            return NextResponse.json({
              success: true,
              session: verifiedSession,
            });
          }
        } catch (error) {
          // Invalid session cookie
        }
      }
    }

    return NextResponse.json({
      success: false,
      session: null,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

