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
 * GET /api/dashboard/monitoring-clients
 * Get clients under monitoring (gym_trainer only)
 * Returns clients with active follow-ups or tasks
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

    const supabase = createAdminClient();

    // Get customers with pending follow-ups
    const { data: customersWithFollowUps } = await supabase
      .from('follow_ups')
      .select('customer_id')
      .eq('business_id', tenantInfo.businessId)
      .eq('status', 'pending')
      .not('customer_id', 'is', null);

    const customerIdsWithFollowUps = new Set(
      (customersWithFollowUps || []).map((f: any) => f.customer_id)
    );

    // Get customers with pending tasks
    const { data: customersWithTasks } = await supabase
      .from('coach_tasks')
      .select('customer_id')
      .eq('business_id', tenantInfo.businessId)
      .eq('status', 'pending')
      .not('customer_id', 'is', null);

    const customerIdsWithTasks = new Set(
      (customersWithTasks || []).map((t: any) => t.customer_id)
    );

    // Combine customer IDs
    const allCustomerIds = Array.from(
      new Set([...customerIdsWithFollowUps, ...customerIdsWithTasks])
    );

    if (allCustomerIds.length === 0) {
      return NextResponse.json({
        success: true,
        customers: [],
      });
    }

    // Get customer details
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, phone, email')
      .eq('business_id', tenantInfo.businessId)
      .in('id', allCustomerIds);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch monitoring clients' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customers: customers || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch monitoring clients' },
      { status: 500 }
    );
  }
}

