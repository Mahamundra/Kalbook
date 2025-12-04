import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { getOrCreateCustomerSession } from '@/lib/auth/session';
import { BUSINESS_SLUG_COOKIE } from '@/lib/tenant';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSessionCookieName(businessSlug: string): string {
  return `customer_session_${businessSlug}`;
}

/**
 * POST /api/auth/oauth-session-customer
 * Create customer session from Supabase Auth session (for OAuth logins)
 * Checks if customer exists or creates new one, then creates session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current Supabase Auth session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get business context from middleware
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Get business slug from cookie (set by middleware)
    const businessSlug = request.cookies.get(BUSINESS_SLUG_COOKIE)?.value || tenantInfo.businessSlug;
    if (!businessSlug) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Get phone or email from OAuth user
    const userPhone = user.phone || '';
    const userEmail = user.email || '';

    if (!userPhone && !userEmail) {
      return NextResponse.json(
        { error: 'Phone or email required from OAuth provider' },
        { status: 400 }
      );
    }

    // Try to find existing customer by phone first, then email
    const adminSupabase = createAdminClient();
    let existingCustomer: CustomerRow | null = null;

    if (userPhone) {
      const { data: customerByPhone } = await adminSupabase
        .from('customers')
        .select('*')
        .eq('business_id', tenantInfo.businessId)
        .eq('phone', userPhone)
        .maybeSingle();
      
      if (customerByPhone) {
        existingCustomer = customerByPhone as CustomerRow;
      }
    }

    if (!existingCustomer && userEmail) {
      const { data: customerByEmail } = await adminSupabase
        .from('customers')
        .select('*')
        .eq('business_id', tenantInfo.businessId)
        .eq('email', userEmail)
        .maybeSingle();
      
      if (customerByEmail) {
        existingCustomer = customerByEmail as CustomerRow;
      }
    }

    // Use phone if available, otherwise use email as identifier
    const identifier = userPhone || userEmail;

    // Get or create customer session
    let customerSession;
    if (existingCustomer) {
      // Update customer with OAuth data if needed
      const updateData: CustomerUpdate = {};
      if (userEmail && !existingCustomer.email) {
        updateData.email = userEmail;
      }
      if (userPhone && existingCustomer.phone !== userPhone) {
        updateData.phone = userPhone;
      }
      if (user.user_metadata?.full_name || user.user_metadata?.name) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name;
        if (name && existingCustomer.name === existingCustomer.phone) {
          updateData.name = name;
        }
      }

      if (Object.keys(updateData).length > 0 && existingCustomer) {
        await (adminSupabase
          .from('customers') as any)
          .update(updateData)
          .eq('id', existingCustomer.id);
      }

      customerSession = {
        type: 'customer' as const,
        customerId: existingCustomer.id,
        businessId: existingCustomer.business_id,
        phone: existingCustomer.phone || userPhone,
        name: existingCustomer.name,
        email: existingCustomer.email || userEmail,
      };
    } else {
      // Create new customer session
      customerSession = await getOrCreateCustomerSession(
        tenantInfo.businessId,
        identifier
      );

      // Update with OAuth data
      const updateData: CustomerUpdate = {};
      if (userEmail) {
        updateData.email = userEmail;
      }
      if (user.user_metadata?.full_name || user.user_metadata?.name) {
        updateData.name = user.user_metadata?.full_name || user.user_metadata?.name || identifier;
      }

      if (Object.keys(updateData).length > 0) {
        await (adminSupabase
          .from('customers') as any)
          .update(updateData)
          .eq('id', customerSession.customerId);
        
        customerSession = {
          ...customerSession,
          ...updateData,
        };
      }
    }

    // Set business-specific session cookie
    const response = NextResponse.json({
      success: true,
      session: customerSession,
    });

    const sessionData = JSON.stringify(customerSession);
    const sessionCookieName = getSessionCookieName(businessSlug);
    
    // Clear any old global session cookie
    response.cookies.delete('customer_session');
    
    // Set business-specific session cookie
    response.cookies.set(sessionCookieName, sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error creating customer OAuth session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session. Please try again.' },
      { status: 500 }
    );
  }
}

