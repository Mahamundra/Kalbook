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
    console.error('Error fetching services:', error);
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
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}

