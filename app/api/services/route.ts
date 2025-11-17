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
 * GET /api/services
 * Get all services for the current business
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

    const supabase = createAdminClient();

    // Get all services for the business
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch services' },
        { status: 500 }
      );
    }

    // Map to Service interface
    const mappedServices: Service[] = (services || []).map(mapServiceToInterface);

    return NextResponse.json({
      success: true,
      services: mappedServices,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Create a new service
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business can manage services
    const { canBusinessPerformAction, checkPlanLimit, countBusinessServices, checkPlanFeature } = await import('@/lib/trial/utils');
    const canManage = await canBusinessPerformAction(tenantInfo.businessId, 'manage_services');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Your plan does not allow managing services. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Check if trying to create group service and if plan allows it
    if (body.isGroupService) {
      const hasGroupFeature = await checkPlanFeature(tenantInfo.businessId, 'group_appointments');
      if (!hasGroupFeature) {
        return NextResponse.json(
          { error: 'Your plan does not allow creating group services. Please upgrade to Professional or Business plan.' },
          { status: 403 }
        );
      }
    }

    // Check max_services limit
    const currentServiceCount = await countBusinessServices(tenantInfo.businessId);
    const limitCheck = await checkPlanLimit(tenantInfo.businessId, 'max_services', currentServiceCount);
    
    if (!limitCheck.canProceed) {
      return NextResponse.json(
        { 
          error: `You have reached the maximum number of services (${limitCheck.limit}) for your plan. Please upgrade to add more services.`,
          limit: limitCheck.limit,
          current: currentServiceCount
        },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    if (typeof body.duration !== 'number' || body.duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof body.price !== 'number' || body.price < 0) {
      return NextResponse.json(
        { error: 'Price must be a non-negative number' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Validate group service fields
    if (body.isGroupService) {
      if (!body.maxCapacity || typeof body.maxCapacity !== 'number' || body.maxCapacity < 2) {
        return NextResponse.json(
          { error: 'Maximum participants must be at least 2 for group services' },
          { status: 400 }
        );
      }
      if (body.minCapacity && (body.minCapacity >= body.maxCapacity || body.minCapacity < 1)) {
        return NextResponse.json(
          { error: 'Minimum participants must be less than maximum and at least 1' },
          { status: 400 }
        );
      }
    }

    // Prepare service data
    const serviceData = {
      business_id: tenantInfo.businessId,
      name: body.name.trim(),
      description: body.description || null,
      category: body.category || null,
      duration: body.duration,
      price: body.price,
      tax_rate: body.taxRate ?? body.tax_rate ?? 0,
      active: body.active !== undefined ? body.active : true,
      is_group_service: body.isGroupService || false,
      max_capacity: body.isGroupService ? (body.maxCapacity ?? null) : null,
      min_capacity: body.isGroupService ? (body.minCapacity ?? null) : null,
      allow_waitlist: body.isGroupService ? (body.allowWaitlist || false) : false,
      group_pricing_type: body.isGroupService ? (body.groupPricingType || 'per_person') : null,
    };

    // Create service
    const serviceResult = await supabase
      .from('services')
      .insert(serviceData as any)
      .select()
      .single() as { data: ServiceRow | null; error: any };
    const { data: newService, error } = serviceResult;

    if (error || !newService) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create service' },
        { status: 500 }
      );
    }

    // Map to Service interface
    const mappedService = mapServiceToInterface(newService);

    return NextResponse.json(
      {
        success: true,
        service: mappedService,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}

