import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type TrainingSummaryRow = Database['public']['Tables']['training_summaries']['Row'];

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
 * GET /api/coaches/[id]/summaries
 * Get all training summaries for a coach (gym_trainer only)
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
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Verify worker exists and belongs to business
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Coach not found' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('training_summaries')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .eq('worker_id', params.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: summaries, error } = await query as { data: TrainingSummaryRow[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch summaries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summaries: summaries || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    );
  }
}

