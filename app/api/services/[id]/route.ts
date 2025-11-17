import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Service } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type ServiceRow = Database['public']['Tables']['services']['Row'];

/**
 * Convert database service row to Service interface
 */
function mapServiceToInterface(service: ServiceRow): Service {
  return {
    id: service.id,
    name: service.name,
    description: service.description || undefined,
    category: service.category || '',
    duration: service.duration,
    price: Number(service.price),
    taxRate: Number(service.tax_rate),
    active: service.active,
    isGroupService: service.is_group_service || false,
    maxCapacity: service.max_capacity ?? null,
    minCapacity: service.min_capacity ?? null,
    allowWaitlist: service.allow_waitlist || false,
    groupPricingType: service.group_pricing_type || null,
  };
}

/**
 * GET /api/services/[id]
 * Get a single service by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get service and verify it belongs to the business
    const serviceResult = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: ServiceRow | null; error: any };
    const { data: service, error } = serviceResult;

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to fetch service' },
        { status: 500 }
      );
    }

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Map to Service interface
    const mappedService = mapServiceToInterface(service);

    return NextResponse.json({
      success: true,
      service: mappedService,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/services/[id]
 * Update a service
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceId = params.id;
    const body = await request.json();

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business can manage services
    const { canBusinessPerformAction } = await import('@/lib/trial/utils');
    const canManage = await canBusinessPerformAction(tenantInfo.businessId, 'manage_services');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Your plan does not allow managing services. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Verify service exists and belongs to the business
    const checkResult = await supabase
      .from('services')
      .select('business_id')
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: ServiceRow | null; error: any };
    const { data: existingService, error: checkError } = checkResult;

    if (checkError || !existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Build update object (only include fields that are provided)
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json(
          { error: 'Service name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }

    if (body.category !== undefined) {
      updateData.category = body.category || null;
    }

    if (body.duration !== undefined) {
      if (typeof body.duration !== 'number' || body.duration <= 0) {
        return NextResponse.json(
          { error: 'Duration must be a positive number' },
          { status: 400 }
        );
      }
      updateData.duration = body.duration;
    }

    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        return NextResponse.json(
          { error: 'Price must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.price = body.price;
    }

    if (body.taxRate !== undefined || body.tax_rate !== undefined) {
      const taxRate = body.taxRate ?? body.tax_rate ?? 0;
      if (typeof taxRate !== 'number' || taxRate < 0) {
        return NextResponse.json(
          { error: 'Tax rate must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.tax_rate = taxRate;
    }

    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    // Handle group service fields
    if (body.isGroupService !== undefined) {
      updateData.is_group_service = body.isGroupService;
      
      // If disabling group service, clear related fields
      if (!body.isGroupService) {
        updateData.max_capacity = null;
        updateData.min_capacity = null;
        updateData.allow_waitlist = false;
        updateData.group_pricing_type = null;
      } else {
        // Validate group service fields if enabling
        if (body.maxCapacity !== undefined) {
          if (!body.maxCapacity || body.maxCapacity < 2) {
            return NextResponse.json(
              { error: 'Maximum participants must be at least 2 for group services' },
              { status: 400 }
            );
          }
          updateData.max_capacity = body.maxCapacity;
        }
        
        if (body.minCapacity !== undefined) {
          if (body.minCapacity !== null) {
            const maxCap = body.maxCapacity ?? existingService.max_capacity;
            if (maxCap && body.minCapacity >= maxCap) {
              return NextResponse.json(
                { error: 'Minimum participants must be less than maximum participants' },
                { status: 400 }
              );
            }
            if (body.minCapacity < 1) {
              return NextResponse.json(
                { error: 'Minimum participants must be at least 1' },
                { status: 400 }
              );
            }
          }
          updateData.min_capacity = body.minCapacity;
        }
        
        if (body.allowWaitlist !== undefined) {
          updateData.allow_waitlist = body.allowWaitlist;
        }
        
        if (body.groupPricingType !== undefined) {
          updateData.group_pricing_type = body.groupPricingType;
        }
      }
    } else if (body.maxCapacity !== undefined || body.minCapacity !== undefined || body.allowWaitlist !== undefined) {
      // If group service fields are provided but isGroupService is not, validate that service is already a group service
      if (!existingService.is_group_service) {
        return NextResponse.json(
          { error: 'Service must be enabled as group service before setting capacity fields' },
          { status: 400 }
        );
      }
      
      if (body.maxCapacity !== undefined) {
        if (!body.maxCapacity || body.maxCapacity < 2) {
          return NextResponse.json(
            { error: 'Maximum participants must be at least 2' },
            { status: 400 }
          );
        }
        updateData.max_capacity = body.maxCapacity;
      }
      
      if (body.minCapacity !== undefined) {
        const maxCap = body.maxCapacity ?? existingService.max_capacity;
        if (body.minCapacity !== null) {
          if (maxCap && body.minCapacity >= maxCap) {
            return NextResponse.json(
              { error: 'Minimum participants must be less than maximum participants' },
              { status: 400 }
            );
          }
          if (body.minCapacity < 1) {
            return NextResponse.json(
              { error: 'Minimum participants must be at least 1' },
              { status: 400 }
            );
          }
        }
        updateData.min_capacity = body.minCapacity;
      }
      
      if (body.allowWaitlist !== undefined) {
        updateData.allow_waitlist = body.allowWaitlist;
      }
      
      if (body.groupPricingType !== undefined) {
        updateData.group_pricing_type = body.groupPricingType;
      }
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided for update' },
        { status: 400 }
      );
    }

    // Update service
    const updateResult = await (supabase
      .from('services') as any)
      .update(updateData)
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .select()
      .single() as { data: ServiceRow | null; error: any };
    const { data: updatedService, error: updateError } = updateResult;

    if (updateError || !updatedService) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update service' },
        { status: 500 }
      );
    }

    // Map to Service interface
    const mappedService = mapServiceToInterface(updatedService);

    return NextResponse.json({
      success: true,
      service: mappedService,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/[id]
 * Delete a service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business can manage services
    const { canBusinessPerformAction } = await import('@/lib/trial/utils');
    const canManage = await canBusinessPerformAction(tenantInfo.businessId, 'manage_services');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Your plan does not allow managing services. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Verify service exists and belongs to the business
    const checkResult = await supabase
      .from('services')
      .select('id, business_id')
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: ServiceRow | null; error: any };
    const { data: existingService, error: checkError } = checkResult;

    if (checkError || !existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if service is used in appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('service_id', serviceId)
      .limit(1);

    if (appointmentsError) {
      // Continue with deletion even if check fails
    }

    if (appointments && appointments.length > 0) {
      // Instead of hard delete, soft delete by setting active to false
      const deactivateResult = await (supabase
        .from('services') as any)
        .update({ active: false })
        .eq('id', serviceId)
        .eq('business_id', tenantInfo.businessId) as { error: any };
      const { error: deactivateError } = deactivateResult;

      if (deactivateError) {
        return NextResponse.json(
          { error: 'Failed to deactivate service' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Service deactivated (has appointments). Set active=false instead of deleting.',
        service: {
          id: serviceId,
          active: false,
        },
      });
    }

    // Delete service (no appointments, safe to delete)
    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}

