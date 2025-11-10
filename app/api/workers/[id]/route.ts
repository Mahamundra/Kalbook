import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { requireAdmin } from '@/lib/auth/authorization';
import { toE164Format } from '@/lib/customers/utils';
import type { Worker } from '@/components/ported/types/admin';

/**
 * Map worker with services to Worker interface
 * Includes admin status check
 */
async function mapWorkerToInterface(
  worker: any,
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
 * GET /api/workers/[id]
 * Get a single worker by ID
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

    // Get worker and verify it belongs to the business
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Worker not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to fetch worker' },
        { status: 500 }
      );
    }

    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Get worker services
    const { data: workerServices } = await supabase
      .from('worker_services')
      .select('service_id')
      .eq('worker_id', workerId);

    const serviceIds = workerServices?.map((ws) => ws.service_id) || [];

    // Map to Worker interface
    const mappedWorker = await mapWorkerToInterface(worker, serviceIds, supabase, tenantInfo.businessId);

    return NextResponse.json({
      success: true,
      worker: mappedWorker,
    });
  } catch (error: any) {
    console.error('Error fetching worker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workers/[id]
 * Update a worker
 */
export async function PATCH(
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

    const supabase = createAdminClient();

    // Verify worker exists and belongs to the business
    const { data: existingWorker, error: checkError } = await supabase
      .from('workers')
      .select('business_id')
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (checkError || !existingWorker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json(
          { error: 'Worker name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.email !== undefined) {
      updateData.email = body.email || null;
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone || null;
    }

    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    if (body.color !== undefined) {
      // Validate hex color format
      if (typeof body.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
        return NextResponse.json(
          { error: 'Invalid color format. Use hex format: #RRGGBB' },
          { status: 400 }
        );
      }
      updateData.color = body.color;
    }

    // Handle admin status
    if (body.isAdmin !== undefined) {
      // Check if current user is admin (required to set admin status)
      try {
        await requireAdmin(request, tenantInfo.businessId);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || 'Only admin users can set admin status' },
          { status: 403 }
        );
      }
      
      // Get current worker data (including name)
      const { data: currentWorker, error: workerFetchError } = await supabase
        .from('workers')
        .select('name, email, phone')
        .eq('id', workerId)
        .single();

      if (workerFetchError || !currentWorker) {
        return NextResponse.json(
          { error: 'Failed to fetch worker data' },
          { status: 500 }
        );
      }

      if (body.isAdmin) {
        // Worker is being marked as admin
        const email = body.email !== undefined ? body.email : currentWorker.email;
        const phone = body.phone !== undefined ? body.phone : currentWorker.phone;
        const workerName = body.name !== undefined ? body.name.trim() : currentWorker.name;
        
        if (!email || !phone) {
          return NextResponse.json(
            { error: 'Email and phone are required for admin workers' },
            { status: 400 }
          );
        }

        // Convert phone to E.164 format
        let e164Phone: string;
        try {
          e164Phone = toE164Format(phone);
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid phone number format. Please use E.164 format (e.g., +972542636737)' },
            { status: 400 }
          );
        }

        // Check if user already exists (by email or phone in E.164 format)
        const { data: existingUser, error: userCheckError } = await supabase
          .from('users')
          .select('*')
          .eq('business_id', tenantInfo.businessId)
          .or(`email.eq.${email},phone.eq.${e164Phone}`)
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
              name: workerName,
              email: email,
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
          // Create new user
          // Generate a UUID for the user
          const userId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
          
          const { error: createUserError } = await supabase
            .from('users')
            .insert({
              id: userId,
              business_id: tenantInfo.businessId,
              email: email,
              phone: e164Phone,
              name: workerName,
              role: 'admin', // Workers marked as admin can login to admin panel
              is_main_admin: false, // Workers are never main admin
            } as any);

          if (createUserError) {
            console.error('Failed to create admin user:', createUserError);
            return NextResponse.json(
              { error: 'Failed to create admin user: ' + createUserError.message },
              { status: 500 }
            );
          }
        }
      } else {
        // Worker is being unmarked as admin - remove from users if role is admin
        const email = body.email !== undefined ? body.email : currentWorker.email;
        const phone = body.phone !== undefined ? body.phone : currentWorker.phone;
        
        // Try both original phone and E.164 format
        let e164Phone: string | undefined;
        try {
          if (phone) {
            e164Phone = toE164Format(phone);
          }
        } catch (error) {
          // If phone format is invalid, just use original
        }
        
        const phoneConditions = phone 
          ? (e164Phone && e164Phone !== phone ? `phone.eq.${phone},phone.eq.${e164Phone}` : `phone.eq.${phone}`)
          : '';
        
        const queryConditions = email && phoneConditions
          ? `email.eq.${email},${phoneConditions}`
          : email
          ? `email.eq.${email}`
          : phoneConditions;
        
        if (queryConditions) {
          const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id, role')
            .eq('business_id', tenantInfo.businessId)
            .or(queryConditions)
            .maybeSingle();

          if (!userCheckError && existingUser && existingUser.role === 'admin') {
            // Check if this is a main admin - cannot be deleted
            const { data: userDetails } = await supabase
              .from('users')
              .select('is_main_admin')
              .eq('id', existingUser.id)
              .single();
            
            if (!userDetails?.is_main_admin) {
              const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', existingUser.id);
              
              if (deleteError) {
                console.error('Failed to remove admin user:', deleteError);
                // Don't fail the whole request if we can't delete the user
              }
            } else {
              console.log('Cannot delete main admin user:', existingUser.id);
            }
          }
        }
      }
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      // Get current worker with services
      const { data: worker } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();

      if (worker) {
        const { data: workerServices } = await supabase
          .from('worker_services')
          .select('service_id')
          .eq('worker_id', workerId);

        const serviceIds = workerServices?.map((ws) => ws.service_id) || [];
        const mappedWorker = await mapWorkerToInterface(worker, serviceIds, supabase, tenantInfo.businessId);

        return NextResponse.json({
          success: true,
          worker: mappedWorker,
        });
      }
    }

    // Update worker
    const { data: updatedWorker, error: updateError } = await supabase
      .from('workers')
      .update(updateData)
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId)
      .select()
      .single();

    if (updateError || !updatedWorker) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update worker' },
        { status: 500 }
      );
    }

    // Get worker services
    const { data: workerServices } = await supabase
      .from('worker_services')
      .select('service_id')
      .eq('worker_id', workerId);

    const serviceIds = workerServices?.map((ws) => ws.service_id) || [];

    // Map to Worker interface
    const mappedWorker = await mapWorkerToInterface(updatedWorker, serviceIds, supabase, tenantInfo.businessId);

    return NextResponse.json({
      success: true,
      worker: mappedWorker,
    });
  } catch (error: any) {
    console.error('Error updating worker:', error);
    return NextResponse.json(
      { error: 'Failed to update worker' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workers/[id]
 * Delete a worker
 */
export async function DELETE(
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
    const { data: existingWorker, error: checkError } = await supabase
      .from('workers')
      .select('id, business_id')
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (checkError || !existingWorker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Check if worker has appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('worker_id', workerId)
      .in('status', ['confirmed', 'pending'])
      .limit(1);

    if (appointmentsError) {
      console.error('Error checking appointments:', appointmentsError);
    }

    if (appointments && appointments.length > 0) {
      // Instead of hard delete, deactivate the worker
      const { error: deactivateError } = await supabase
        .from('workers')
        .update({ active: false })
        .eq('id', workerId)
        .eq('business_id', tenantInfo.businessId);

      if (deactivateError) {
        return NextResponse.json(
          { error: 'Failed to deactivate worker' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Worker deactivated (has appointments). Set active=false instead of deleting.',
        worker: {
          id: workerId,
          active: false,
        },
      });
    }

    // Delete worker services (cascade should handle this, but being explicit)
    await supabase.from('worker_services').delete().eq('worker_id', workerId);

    // Delete worker
    const { error: deleteError } = await supabase
      .from('workers')
      .delete()
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete worker' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Worker deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting worker:', error);
    return NextResponse.json(
      { error: 'Failed to delete worker' },
      { status: 500 }
    );
  }
}

