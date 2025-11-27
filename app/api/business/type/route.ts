import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/business/type
 * Get the current business's business_type
 * Uses tenant context from request (session or header)
 */
export async function GET(request: NextRequest) {
  try {
    let tenantInfo = await getTenantInfoFromRequest(request);
    console.log('[business/type] Tenant info from request:', tenantInfo);

    if (!tenantInfo?.businessId) {
      // Try to get from session if tenant context not available
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const adminSupabase = createAdminClient();
        const userDataResult = await adminSupabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single() as { data: { business_id: string } | null; error: any };

        if (userDataResult.data?.business_id) {
          tenantInfo = {
            businessId: userDataResult.data.business_id,
            businessSlug: null,
          };
          console.log('[business/type] Got businessId from user session:', tenantInfo);
        }
      }
    }

    if (!tenantInfo?.businessId) {
      console.warn('[business/type] No business context found');
      return NextResponse.json(
        { success: false, error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get business type
    const businessResult = await supabase
      .from('businesses')
      .select('business_type')
      .eq('id', tenantInfo.businessId)
      .single() as { data: { business_type: string } | null; error: any };

    if (businessResult.error || !businessResult.data) {
      console.error('[business/type] Business not found:', businessResult.error);
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessType = businessResult.data.business_type || null;
    console.log('[business/type] Business type:', businessType, 'for businessId:', tenantInfo.businessId);

    return NextResponse.json({
      success: true,
      businessType,
    });
  } catch (error: any) {
    console.error('[business/type] Error fetching business type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch business type' },
      { status: 500 }
    );
  }
}

