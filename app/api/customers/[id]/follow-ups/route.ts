import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type FollowUpRow = Database['public']['Tables']['follow_ups']['Row'];

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
 * GET /api/customers/[id]/follow-ups
 * Get all follow-ups for a customer (gym_trainer only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const supabase = createAdminClient();

    // Verify customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; business_id: string } | null; error: any };

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('follow_ups')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .eq('customer_id', params.id)
      .order('scheduled_for', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: followUps, error } = await query as { data: FollowUpRow[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch follow-ups' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      followUps: followUps || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/[id]/follow-ups
 * Create a new follow-up for a customer (gym_trainer only)
 */
export async function POST(
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

    // Validate required fields
    if (!body.scheduled_for || typeof body.scheduled_for !== 'string') {
      return NextResponse.json(
        { error: 'Scheduled date is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; business_id: string } | null; error: any };

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get current user for created_by_user_id
    const { createClient } = await import('@/lib/supabase/server');
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const createdByUserId = user?.id || null;

    const followUpData = {
      business_id: tenantInfo.businessId,
      customer_id: params.id,
      type: body.type || 'check_in',
      scheduled_for: new Date(body.scheduled_for).toISOString(),
      status: 'pending',
      notes: body.notes || null,
      created_by_user_id: createdByUserId,
    };

    const result = await (supabase
      .from('follow_ups') as any)
      .insert(followUpData)
      .select()
      .single();
    
    const { data: newFollowUp, error } = result as { data: FollowUpRow | null; error: any };

    if (error || !newFollowUp) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create follow-up' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      followUp: newFollowUp,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create follow-up' },
      { status: 500 }
    );
  }
}

