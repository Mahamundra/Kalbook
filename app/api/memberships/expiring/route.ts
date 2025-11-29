import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type MembershipRow = Database['public']['Tables']['memberships']['Row'];

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
 * GET /api/memberships/expiring
 * Get memberships expiring soon (gym_trainer only)
 * Query params: days (default: 7) - number of days ahead to check
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

    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', futureDate.toISOString())
      .order('expires_at', { ascending: true }) as { data: MembershipRow[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch expiring memberships' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memberships: memberships || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch expiring memberships' },
      { status: 500 }
    );
  }
}

