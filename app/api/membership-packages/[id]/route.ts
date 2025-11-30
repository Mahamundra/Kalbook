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
 * PATCH /api/membership-packages/[id]
 * Update a membership package (gym_trainer only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const supabase = createAdminClient();

    // Verify package belongs to business
    const { data: existingPackage } = await supabase
      .from('membership_packages')
      .select('id, business_id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: MembershipPackageRow | null; error: any };

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Membership package not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.session_count !== undefined) {
      if (typeof body.session_count !== 'number' || body.session_count <= 0) {
        return NextResponse.json(
          { error: 'Session count must be a positive number' },
          { status: 400 }
        );
      }
      updateData.session_count = body.session_count;
    }
    if (body.duration_days !== undefined) {
      if (typeof body.duration_days !== 'number' || body.duration_days <= 0) {
        return NextResponse.json(
          { error: 'Duration days must be a positive number' },
          { status: 400 }
        );
      }
      updateData.duration_days = body.duration_days;
    }
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.discount_price !== undefined) {
      if (body.discount_price === null || body.discount_price === '') {
        updateData.discount_price = null;
      } else {
        updateData.discount_price = parseFloat(body.discount_price);
      }
    }
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.active !== undefined) updateData.active = body.active;

    const result = await (supabase
      .from('membership_packages') as any)
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    const { data: updatedPackage, error } = result as { data: MembershipPackageRow | null; error: any };

    if (error || !updatedPackage) {
      return NextResponse.json(
        { error: error?.message || 'Failed to update membership package' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      package: updatedPackage,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update membership package' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/membership-packages/[id]
 * Delete a membership package (gym_trainer only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify package belongs to business
    const { data: existingPackage } = await supabase
      .from('membership_packages')
      .select('id, business_id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: MembershipPackageRow | null; error: any };

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Membership package not found' },
        { status: 404 }
      );
    }

    // Check if package is used in any active memberships
    const { data: activeMemberships } = await supabase
      .from('memberships')
      .select('id')
      .eq('package_id', params.id)
      .eq('status', 'active')
      .limit(1) as { data: Array<{ id: string }> | null; error: any };

    if (activeMemberships && activeMemberships.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete package with active memberships. Deactivate it instead.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('membership_packages')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete membership package' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete membership package' },
      { status: 500 }
    );
  }
}

