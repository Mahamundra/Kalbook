import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';

/**
 * Helper function to check if business is gym_trainer
 */
async function checkGymTrainerBusiness(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('business_type')
    .eq('id', businessId)
    .single() as { data: { business_type: string } | null; error: any };
  
  return business?.business_type === 'gym_trainer';
}

/**
 * GET /api/dashboard/expiring-memberships
 * Get clients with memberships expiring soon (gym_trainer only)
 * Query params: days (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business is gym_trainer
    const isGymTrainer = await checkGymTrainerBusiness(tenantInfo.businessId);
    if (!isGymTrainer) {
      return NextResponse.json(
        { error: 'This feature is only available for gym_trainer businesses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const supabase = createAdminClient();

    // Calculate date range
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    // Get expiring memberships
    const { data: expiringMemberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('customer_id, expires_at, remaining_sessions')
      .eq('business_id', tenantInfo.businessId)
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', futureDate.toISOString());

    if (membershipsError) {
      return NextResponse.json(
        { error: membershipsError.message || 'Failed to fetch expiring memberships' },
        { status: 500 }
      );
    }

    if (!expiringMemberships || expiringMemberships.length === 0) {
      return NextResponse.json({
        success: true,
        customers: [],
      });
    }

    // Get unique customer IDs
    const customerIds = Array.from(
      new Set(expiringMemberships.map((m: any) => m.customer_id))
    );

    // Get customer details
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, phone, email')
      .eq('business_id', tenantInfo.businessId)
      .in('id', customerIds);

    if (customersError) {
      return NextResponse.json(
        { error: customersError.message || 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Enrich customers with membership info
    const customersWithMemberships = (customers || []).map((customer: any) => {
      const customerMemberships = expiringMemberships.filter(
        (m: any) => m.customer_id === customer.id
      );
      return {
        ...customer,
        memberships: customerMemberships,
      };
    });

    return NextResponse.json({
      success: true,
      customers: customersWithMemberships,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch expiring memberships' },
      { status: 500 }
    );
  }
}

