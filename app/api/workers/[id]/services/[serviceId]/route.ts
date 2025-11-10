import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';

/**
 * DELETE /api/workers/[id]/services/[serviceId]
 * Remove service assignment from worker
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const workerId = params.id;
    const serviceId = params.serviceId;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify worker exists and belongs to business
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Verify service exists and belongs to business
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if assignment exists
    const { data: assignment, error: assignmentError } = await supabase
      .from('worker_services')
      .select('*')
      .eq('worker_id', workerId)
      .eq('service_id', serviceId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Service is not assigned to this worker' },
        { status: 404 }
      );
    }

    // Check if worker has appointments for this service
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('worker_id', workerId)
      .eq('service_id', serviceId)
      .in('status', ['confirmed', 'pending'])
      .limit(1);

    if (appointmentsError) {
      console.error('Error checking appointments:', appointmentsError);
    }

    if (appointments && appointments.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot remove service assignment',
          message: 'Worker has appointments for this service. Please cancel or complete them first.',
        },
        { status: 409 }
      );
    }

    // Remove assignment
    const { error: deleteError } = await supabase
      .from('worker_services')
      .delete()
      .eq('worker_id', workerId)
      .eq('service_id', serviceId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to remove service assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service assignment removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing service assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove service assignment' },
      { status: 500 }
    );
  }
}

