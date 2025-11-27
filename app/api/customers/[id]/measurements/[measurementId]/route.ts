import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';

/**
 * PATCH /api/customers/[id]/measurements/[measurementId]
 * Update a measurement
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; measurementId: string } }
) {
  try {
    const customerId = params.id;
    const measurementId = params.measurementId;
    const body = await request.json();

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify measurement exists and belongs to the business
    const { data: measurement, error: measurementError } = await supabase
      .from('client_measurements')
      .select('id, customer_id, business_id')
      .eq('id', measurementId)
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (measurementError || !measurement) {
      return NextResponse.json(
        { error: 'Measurement not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.measured_at !== undefined) {
      updateData.measured_at = body.measured_at;
    }

    if (body.weight !== undefined) {
      updateData.weight = body.weight !== null ? parseFloat(body.weight) : null;
    }

    if (body.height !== undefined) {
      updateData.height = body.height !== null ? parseFloat(body.height) : null;
    }

    if (body.body_fat_percentage !== undefined) {
      updateData.body_fat_percentage = body.body_fat_percentage !== null ? parseFloat(body.body_fat_percentage) : null;
    }

    if (body.muscle_mass !== undefined) {
      updateData.muscle_mass = body.muscle_mass !== null ? parseFloat(body.muscle_mass) : null;
    }

    if (body.measurements !== undefined) {
      updateData.measurements = body.measurements || {};
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    // Update measurement
    const { data: updatedMeasurement, error: updateError } = await supabase
      .from('client_measurements')
      .update(updateData)
      .eq('id', measurementId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update measurement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      measurement: updatedMeasurement,
    });
  } catch (error: any) {
    console.error('Error updating measurement:', error);
    return NextResponse.json(
      { error: 'Failed to update measurement' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]/measurements/[measurementId]
 * Delete a measurement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; measurementId: string } }
) {
  try {
    const customerId = params.id;
    const measurementId = params.measurementId;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify measurement exists and belongs to the business
    const { data: measurement, error: measurementError } = await supabase
      .from('client_measurements')
      .select('id')
      .eq('id', measurementId)
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (measurementError || !measurement) {
      return NextResponse.json(
        { error: 'Measurement not found' },
        { status: 404 }
      );
    }

    // Delete measurement
    const { error: deleteError } = await supabase
      .from('client_measurements')
      .delete()
      .eq('id', measurementId)
      .eq('business_id', tenantInfo.businessId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete measurement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Measurement deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting measurement:', error);
    return NextResponse.json(
      { error: 'Failed to delete measurement' },
      { status: 500 }
    );
  }
}

