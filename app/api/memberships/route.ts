import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type MembershipRow = Database['public']['Tables']['memberships']['Row'];
type MembershipPackageRow = Database['public']['Tables']['membership_packages']['Row'];

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
 * GET /api/memberships
 * Get all memberships for the current business (gym_trainer only)
 * Query params: customer_id, status
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
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('memberships')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: memberships, error } = await query as { data: MembershipRow[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch memberships' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memberships: memberships || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch memberships' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memberships
 * Create a new membership for a customer (gym_trainer only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Validate required fields
    if (!body.customer_id || typeof body.customer_id !== 'string') {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if (!body.package_id && (!body.total_sessions || typeof body.total_sessions !== 'number' || body.total_sessions <= 0)) {
      return NextResponse.json(
        { error: 'Either package_id or total_sessions is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', body.customer_id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; business_id: string } | null; error: any };

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    let packageName = body.package_name || 'Custom Package';
    let totalSessions = body.total_sessions;
    let durationDays = body.duration_days || null;

    // If package_id provided, get package details
    if (body.package_id) {
      const { data: packageData, error: packageError } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('id', body.package_id)
        .eq('business_id', tenantInfo.businessId)
        .single() as { data: MembershipPackageRow | null; error: any };

      if (packageError || !packageData) {
        return NextResponse.json(
          { error: 'Membership package not found' },
          { status: 404 }
        );
      }

      packageName = packageData.name;
      totalSessions = packageData.session_count;
      durationDays = packageData.duration_days;
    }

    // Calculate expiration date if duration_days provided
    let expiresAt: string | null = null;
    if (durationDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + durationDays);
      expiresAt = expirationDate.toISOString();
    }

    const membershipData = {
      business_id: tenantInfo.businessId,
      customer_id: body.customer_id,
      package_id: body.package_id || null,
      package_name: packageName,
      total_sessions: totalSessions,
      remaining_sessions: totalSessions,
      purchased_at: body.purchased_at ? new Date(body.purchased_at).toISOString() : new Date().toISOString(),
      expires_at: expiresAt,
      status: 'active' as const,
      notes: body.notes || null,
    };

    const { data: newMembership, error } = await supabase
      .from('memberships')
      .insert(membershipData)
      .select()
      .single() as { data: MembershipRow | null; error: any };

    if (error || !newMembership) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create membership' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: newMembership,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create membership' },
      { status: 500 }
    );
  }
}

