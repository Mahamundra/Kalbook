import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type ServiceRow = Database['public']['Tables']['services']['Row'];

/**
 * GET /api/workers/[id]/services
 * Get worker's assigned services
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workerId = params.id;

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

    // Get worker services with service details
    const { data: workerServices, error } = await supabase
      .from('worker_services')
      .select(`
        service_id,
        services!inner (*)
      `)
      .eq('worker_id', workerId)
      .eq('services.business_id', tenantInfo.businessId);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch worker services' },
        { status: 500 }
      );
    }

    // Map to service objects
    const services = (workerServices || []).map((ws: any) => ({
      id: ws.service_id,
      ...ws.services,
    }));

    return NextResponse.json({
      success: true,
      services,
      serviceIds: services.map((s: any) => s.id),
    });
  } catch (error: any) {
    console.error('Error fetching worker services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker services' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workers/[id]/services
 * Assign services to worker
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workerId = params.id;
    const body = await request.json();

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Validate request body
    if (!body.serviceIds || !Array.isArray(body.serviceIds)) {
      return NextResponse.json(
        { error: 'serviceIds array is required' },
        { status: 400 }
      );
    }

    if (body.serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one service ID is required' },
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

    // Verify all services exist and belong to business
    const servicesResult = await supabase
      .from('services')
      .select('id')
      .eq('business_id', tenantInfo.businessId)
      .in('id', body.serviceIds) as { data: Array<{ id: string }> | null; error: any };
    const { data: services, error: servicesError } = servicesResult;

    if (servicesError) {
      return NextResponse.json(
        { error: 'Failed to validate services' },
        { status: 500 }
      );
    }

    const validServiceIds = services?.map((s) => s.id) || [];
    const invalidServices = body.serviceIds.filter(
      (id: string) => !validServiceIds.includes(id)
    );

    if (invalidServices.length > 0) {
      return NextResponse.json(
        {
          error: 'Some services do not exist or do not belong to this business',
          invalidServices,
        },
        { status: 400 }
      );
    }

    // Get existing assignments
    const { data: existingAssignments } = await supabase
      .from('worker_services')
      .select('service_id')
      .eq('worker_id', workerId);

    const existingServiceIds = existingAssignments?.map((a) => a.service_id) || [];

    // Determine which services to add (not already assigned)
    const servicesToAdd = validServiceIds.filter(
      (id) => !existingServiceIds.includes(id)
    );

    if (servicesToAdd.length === 0) {
      // All services already assigned
      return NextResponse.json({
        success: true,
        message: 'All services are already assigned to this worker',
        serviceIds: existingServiceIds,
      });
    }

    // Insert new assignments
    const assignments = servicesToAdd.map((serviceId) => ({
      worker_id: workerId,
      service_id: serviceId,
    }));

    const { error: insertError } = await supabase
      .from('worker_services')
      .insert(assignments);

    if (insertError) {
      // Check if it's a duplicate key error (already assigned)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Some services are already assigned to this worker' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: insertError.message || 'Failed to assign services' },
        { status: 500 }
      );
    }

    // Get updated service list
    const { data: updatedAssignments } = await supabase
      .from('worker_services')
      .select('service_id')
      .eq('worker_id', workerId);

    const allServiceIds = updatedAssignments?.map((a) => a.service_id) || [];

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${servicesToAdd.length} service(s) to worker`,
      serviceIds: allServiceIds,
      added: servicesToAdd,
    });
  } catch (error: any) {
    console.error('Error assigning services to worker:', error);
    return NextResponse.json(
      { error: 'Failed to assign services to worker' },
      { status: 500 }
    );
  }
}

