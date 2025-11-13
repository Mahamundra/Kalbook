import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Appointment } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

/**
 * Map database appointment to Appointment interface
 */
function mapAppointmentToInterface(
  appointment: AppointmentRow & {
    services?: { name: string; description?: string };
    customers?: { name: string };
    workers?: { name: string };
  }
): Appointment & { serviceDescription?: string } {
  return {
    id: appointment.id,
    staffId: appointment.worker_id,
    workerId: appointment.worker_id,
    service: (appointment.services as any)?.name || '',
    serviceId: appointment.service_id,
    customer: (appointment.customers as any)?.name || '',
    customerId: appointment.customer_id,
    start: appointment.start,
    end: appointment.end,
    status: appointment.status,
    serviceDescription: (appointment.services as any)?.description || undefined,
  };
}

/**
 * GET /api/customers/[id]/appointments
 * Get all appointments for a customer
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = createAdminClient();

    // Verify customer exists and belongs to the business
    const customerResult = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };
    const { data: customer, error: customerError } = customerResult;

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build appointments query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        services (name, description),
        customers (name),
        workers (name)
      `)
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('start', startDate);
    }

    if (endDate) {
      query = query.lte('start', endDate);
    }

    // Order by start date
    query = query.order('start', { ascending: false });

    const appointmentsResult = await query as { data: any[] | null; error: any };
    const { data: appointments, error } = appointmentsResult;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    // Map to Appointment interface
    const mappedAppointments: Appointment[] = (appointments || []).map(
      mapAppointmentToInterface
    );

    return NextResponse.json({
      success: true,
      appointments: mappedAppointments,
      count: mappedAppointments.length,
    });
  } catch (error: any) {
    console.error('Error fetching customer appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

