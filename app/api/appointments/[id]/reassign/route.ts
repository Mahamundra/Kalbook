import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

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
 * PATCH /api/appointments/[id]/reassign
 * Reassign an appointment to a different coach (gym_trainer only)
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

    // Validate worker_id
    if (!body.worker_id || typeof body.worker_id !== 'string') {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify appointment exists and belongs to business
    const { data: existingAppointment, error: checkError } = await supabase
      .from('appointments')
      .select('id, business_id, service_id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; business_id: string; service_id: string } | null; error: any };

    if (checkError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify worker exists and belongs to business
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id, active')
      .eq('id', body.worker_id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; active: boolean } | null; error: any };

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    if (!worker.active) {
      return NextResponse.json(
        { error: 'Worker is not active' },
        { status: 400 }
      );
    }

    // Verify worker can provide the service
    const { data: workerService, error: serviceError } = await supabase
      .from('worker_services')
      .select('worker_id')
      .eq('worker_id', body.worker_id)
      .eq('service_id', existingAppointment.service_id)
      .single() as { data: { worker_id: string } | null; error: any };

    if (serviceError || !workerService) {
      return NextResponse.json(
        { error: 'Worker cannot provide this service' },
        { status: 400 }
      );
    }

    // Update appointment
    const result = await (supabase
      .from('appointments') as any)
      .update({
        worker_id: body.worker_id,
      })
      .eq('id', params.id)
      .select()
      .single();
    
    const { data: updatedAppointment, error } = result as { data: AppointmentRow | null; error: any };

    if (error || !updatedAppointment) {
      return NextResponse.json(
        { error: error?.message || 'Failed to reassign appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to reassign appointment' },
      { status: 500 }
    );
  }
}

