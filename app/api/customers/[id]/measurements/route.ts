import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type MeasurementRow = Database['public']['Tables']['client_measurements']['Row'];

/**
 * GET /api/customers/[id]/measurements
 * Get all measurements for a customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify customer exists and belongs to the business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Get measurements
    const { data: measurements, error: measurementsError, count } = await supabase
      .from('client_measurements')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .order('measured_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (measurementsError) {
      return NextResponse.json(
        { error: measurementsError.message || 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      measurements: measurements || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/[id]/measurements
 * Add a new measurement for a customer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
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

    // Verify customer exists and belongs to the business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build measurement data
    const measurementData: any = {
      business_id: tenantInfo.businessId,
      customer_id: customerId,
      measured_at: body.measured_at || new Date().toISOString(),
    };

    if (body.weight !== undefined && body.weight !== null) {
      measurementData.weight = parseFloat(body.weight);
    }

    if (body.height !== undefined && body.height !== null) {
      measurementData.height = parseFloat(body.height);
    }

    if (body.body_fat_percentage !== undefined && body.body_fat_percentage !== null) {
      measurementData.body_fat_percentage = parseFloat(body.body_fat_percentage);
    }

    if (body.muscle_mass !== undefined && body.muscle_mass !== null) {
      measurementData.muscle_mass = parseFloat(body.muscle_mass);
    }

    if (body.measurements !== undefined) {
      measurementData.measurements = body.measurements || {};
    }

    if (body.notes !== undefined) {
      measurementData.notes = body.notes || null;
    }

    // Insert measurement
    const insertResult = await (supabase
      .from('client_measurements') as any)
      .insert(measurementData)
      .select()
      .single() as { data: any; error: any };
    const { data: measurement, error: insertError } = insertResult;

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || 'Failed to create measurement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      measurement,
    });
  } catch (error: any) {
    console.error('Error creating measurement:', error);
    return NextResponse.json(
      { error: 'Failed to create measurement' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/customers/[id]/measurements/[measurementId]
 * Update a measurement
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; measurementId?: string } }
) {
  try {
    const customerId = params.id;
    const measurementId = params.measurementId || new URL(request.url).pathname.split('/').pop();
    const body = await request.json();

    if (!measurementId) {
      return NextResponse.json(
        { error: 'Measurement ID required' },
        { status: 400 }
      );
    }

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
    const updateResult = await (supabase
      .from('client_measurements') as any)
      .update(updateData)
      .eq('id', measurementId)
      .select()
      .single() as { data: any; error: any };
    const { data: updatedMeasurement, error: updateError } = updateResult;

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
  { params }: { params: { id: string; measurementId?: string } }
) {
  try {
    const customerId = params.id;
    const measurementId = params.measurementId || new URL(request.url).pathname.split('/').pop();

    if (!measurementId) {
      return NextResponse.json(
        { error: 'Measurement ID required' },
        { status: 400 }
      );
    }

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

