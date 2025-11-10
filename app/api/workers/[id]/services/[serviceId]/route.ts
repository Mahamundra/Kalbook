import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type WorkerRow = Database['public']['Tables']['workers']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];
type WorkerServiceRow = Database['public']['Tables']['worker_services']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

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
    const workerResult = await supabase
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: WorkerRow | null; error: any };
    const { data: worker, error: workerError } = workerResult;

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Verify service exists and belongs to business
    const serviceResult = await supabase
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: ServiceRow | null; error: any };
    const { data: service, error: serviceError } = serviceResult;

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if assignment exists
    const assignmentResult = await supabase
      .from('worker_services')
      .select('*')
      .eq('worker_id', workerId)
      .eq('service_id', serviceId)
      .single() as { data: WorkerServiceRow | null; error: any };
    const { data: assignment, error: assignmentError } = assignmentResult;

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Service is not assigned to this worker' },
        { status: 404 }
      );
    }

    // Check if worker has appointments for this service
    const appointmentsResult = await supabase
      .from('appointments')
      .select('id')
      .eq('worker_id', workerId)
      .eq('service_id', serviceId)
      .in('status', ['confirmed', 'pending'])
      .limit(1) as { data: AppointmentRow[] | null; error: any };
    const { data: appointments, error: appointmentsError } = appointmentsResult;

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

