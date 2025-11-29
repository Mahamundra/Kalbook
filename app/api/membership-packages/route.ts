import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

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
 * GET /api/membership-packages
 * Get all membership packages for the current business (gym_trainer only)
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
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('membership_packages')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data: packages, error } = await query as { data: MembershipPackageRow[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch membership packages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      packages: packages || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch membership packages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/membership-packages
 * Create a new membership package (gym_trainer only)
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
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Package name is required' },
        { status: 400 }
      );
    }

    if (!body.session_count || typeof body.session_count !== 'number' || body.session_count <= 0) {
      return NextResponse.json(
        { error: 'Session count must be a positive number' },
        { status: 400 }
      );
    }

    if (!body.duration_days || typeof body.duration_days !== 'number' || body.duration_days <= 0) {
      return NextResponse.json(
        { error: 'Duration days must be a positive number' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const packageData: any = {
      business_id: tenantInfo.businessId,
      name: body.name.trim(),
      session_count: body.session_count,
      duration_days: body.duration_days,
      price: body.price ? parseFloat(body.price) : 0,
      active: body.active !== undefined ? body.active : true,
    };

    if (body.description !== undefined) {
      packageData.description = body.description.trim();
    }

    if (body.discount_price !== undefined && body.discount_price !== null && body.discount_price !== '') {
      packageData.discount_price = parseFloat(body.discount_price);
    }

    const { data: newPackage, error } = await supabase
      .from('membership_packages')
      .insert(packageData)
      .select()
      .single() as { data: MembershipPackageRow | null; error: any };

    if (error || !newPackage) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create membership package' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      package: newPackage,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create membership package' },
      { status: 500 }
    );
  }
}

