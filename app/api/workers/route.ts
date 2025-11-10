import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { requireAdmin } from '@/lib/auth/authorization';
import { toE164Format } from '@/lib/customers/utils';
import type { Worker } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type WorkerRow = Database['public']['Tables']['workers']['Row'];

/**
 * Map database worker row to Worker interface
 * Includes fetching worker's services and admin status
 */
async function mapWorkerToInterface(
  worker: WorkerRow,
  workerServices: string[] = [],
  supabase: any,
  businessId: string
): Promise<Worker> {
  // Check if this worker is an admin user and if they're the main admin
  let isAdmin = false;
  let isMainAdmin = false;
  let role: 'admin' | 'worker' = 'worker'; // Default to worker
  let userId: string | undefined = undefined;
  
  if (worker.email || worker.phone) {
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role, is_main_admin')
      .eq('business_id', businessId)
      .or(`email.eq.${worker.email || ''},phone.eq.${worker.phone || ''}`)
      .in('role', ['admin', 'owner'])
      .maybeSingle();
    
    if (adminUser) {
      isAdmin = true;
      isMainAdmin = adminUser.is_main_admin === true || adminUser.role === 'owner';
      role = 'admin';
      userId = adminUser.id;
    }
  }

  return {
    id: worker.id,
    name: worker.name,
    email: worker.email || undefined,
    phone: worker.phone || undefined,
    services: workerServices,
    active: worker.active,
    color: worker.color || undefined,
    isAdmin,
    isMainAdmin,
    role,
    userId,
  };
}

/**
 * GET /api/workers
 * Get all workers for the current business
 */
export async function GET(request: NextRequest) {
  try {
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
    const active = searchParams.get('active');

    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from('workers')
      .select('*')
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (active !== null && active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    query = query.order('name', { ascending: true });

    const { data: workers, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch workers' },
        { status: 500 }
      );
    }

    // Get all worker services
    const workerIds = (workers || []).map((w: any) => w.id);
    const allWorkerServicesResult = await supabase
      .from('worker_services')
      .select('worker_id, service_id')
      .in('worker_id', workerIds) as { data: Array<{ worker_id: string; service_id: string }> | null; error: any };
    const { data: allWorkerServices } = allWorkerServicesResult;

    // Group services by worker_id
    const servicesByWorker = new Map<string, string[]>();
    (allWorkerServices || []).forEach((ws: any) => {
      if (!servicesByWorker.has(ws.worker_id)) {
        servicesByWorker.set(ws.worker_id, []);
      }
      servicesByWorker.get(ws.worker_id)!.push(ws.service_id);
    });

    // Map to Worker interface
    const mappedWorkers: Worker[] = await Promise.all(
      (workers || []).map(async (worker: any) => {
        const workerServices = servicesByWorker.get(worker.id) || [];
        return mapWorkerToInterface(worker, workerServices, supabase, tenantInfo.businessId);
      })
    );

    return NextResponse.json({
      success: true,
      workers: mappedWorkers,
    });
  } catch (error: any) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workers
 * Create a new worker
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Worker name is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Prepare worker data
    const workerData = {
      business_id: tenantInfo.businessId,
      name: body.name.trim(),
      email: body.email || null,
      phone: body.phone || null,
      active: body.active !== undefined ? body.active : true,
      color: body.color || '#3B82F6', // Default color
    };

    // Create worker
    const { data: newWorker, error } = await supabase
      .from('workers')
      .insert(workerData as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create worker' },
        { status: 500 }
      );
    }

    // If worker is marked as admin, require admin permission
    if (body.isAdmin) {
      // Check if current user is admin
      try {
        await requireAdmin(request, tenantInfo.businessId);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || 'Only admin users can create admin workers' },
          { status: 403 }
        );
      }
      
      if (!body.email || !body.phone) {
        return NextResponse.json(
          { error: 'Email and phone are required for admin workers' },
          { status: 400 }
        );
      }

      // Convert phone to E.164 format
      let e164Phone: string;
      try {
        e164Phone = toE164Format(body.phone);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Please use E.164 format (e.g., +972542636737)' },
          { status: 400 }
        );
      }

      // Check if user already exists for this worker (by email or phone in E.164 format)
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', tenantInfo.businessId)
        .or(`email.eq.${body.email},phone.eq.${e164Phone}`)
        .maybeSingle();

      if (userCheckError) {
        console.error('Error checking for existing user:', userCheckError);
        return NextResponse.json(
          { error: 'Failed to check for existing user' },
          { status: 500 }
        );
      }

      if (existingUser) {
        // Update existing user
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            name: body.name.trim(),
            email: body.email,
            phone: e164Phone,
            role: 'admin', // Workers marked as admin can login to admin panel
            is_main_admin: false, // Ensure workers are never marked as main admin
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);

        if (updateUserError) {
          console.error('Failed to update admin user:', updateUserError);
          return NextResponse.json(
            { error: 'Failed to update admin user: ' + updateUserError.message },
            { status: 500 }
          );
        }
      } else {
        // Create new user in users table (without Supabase Auth for now)
        // We'll create the auth user when they first login via OTP
        // Generate a UUID for the user (users.id doesn't have to match auth user ID)
        // Use crypto.randomUUID() for proper UUID v4 generation
        const userId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
        
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: userId,
            business_id: tenantInfo.businessId,
            email: body.email,
            phone: e164Phone,
            name: body.name.trim(),
            role: 'admin', // Workers marked as admin can login to admin panel
            is_main_admin: false, // Workers are never main admin
          } as any);

        if (userError) {
          console.error('Failed to create admin user:', userError);
          return NextResponse.json(
            { error: 'Failed to create admin user: ' + userError.message },
            { status: 500 }
          );
        }
      }
    } else {
      // If worker is not admin, remove from users table if exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('business_id', tenantInfo.businessId)
        .or(`email.eq.${body.email || ''},phone.eq.${body.phone || ''}`)
        .maybeSingle();

      if (existingUser) {
        // Only remove if this user was created from a worker (not an owner)
        const { data: userCheck } = await supabase
          .from('users')
          .select('role')
          .eq('id', existingUser.id)
          .single();

        if (userCheck?.role === 'admin') {
          // Check if this is a main admin - cannot be deleted
          const { data: userDetails } = await supabase
            .from('users')
            .select('is_main_admin')
            .eq('id', existingUser.id)
            .single();
          
          if (!userDetails?.is_main_admin) {
            await supabase.from('users').delete().eq('id', existingUser.id);
          } else {
            console.log('Cannot delete main admin user:', existingUser.id);
          }
        }
      }
    }

    // Assign services if provided
    if (body.services && Array.isArray(body.services) && body.services.length > 0) {
      // Verify all services belong to the business
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('business_id', tenantInfo.businessId)
        .in('id', body.services);

      if (servicesError) {
        return NextResponse.json(
          { error: 'Failed to validate services' },
          { status: 500 }
        );
      }

      const validServiceIds = (services || []).map((s: any) => s.id);
      const invalidServices = body.services.filter(
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

      // Insert worker-service relationships
      const workerServiceInserts = validServiceIds.map((serviceId: string) => ({
        worker_id: (newWorker as any).id,
        service_id: serviceId,
      }));

      const { error: assignError } = await supabase
        .from('worker_services')
        .insert(workerServiceInserts as any);

      if (assignError) {
        // Rollback: delete the worker if service assignment fails
        await supabase.from('workers').delete().eq('id', (newWorker as any).id);
        return NextResponse.json(
          { error: 'Failed to assign services to worker' },
          { status: 500 }
        );
      }
    }

    // Get worker services for response
    const workerServicesResult = await supabase
      .from('worker_services')
      .select('service_id')
      .eq('worker_id', (newWorker as any).id) as { data: Array<{ service_id: string }> | null; error: any };
    const { data: workerServices } = workerServicesResult;

    const serviceIds = (workerServices || []).map((ws) => ws.service_id);

    // Map to Worker interface
    const mappedWorker = await mapWorkerToInterface(newWorker as any, serviceIds, supabase, tenantInfo.businessId);

    return NextResponse.json(
      {
        success: true,
        worker: mappedWorker,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating worker:', error);
    return NextResponse.json(
      { error: 'Failed to create worker' },
      { status: 500 }
    );
  }
}

