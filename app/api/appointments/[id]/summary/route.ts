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
 * GET /api/appointments/[id]/summary
 * Get training summary for an appointment (gym_trainer only)
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

    const { data: summary, error } = await supabase
      .from('training_summaries')
      .select('*')
      .eq('appointment_id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: TrainingSummaryRow | null; error: any };

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: summary || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments/[id]/summary
 * Create or update training summary for an appointment (gym_trainer only)
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
    if (!body.summary || typeof body.summary !== 'string' || body.summary.trim() === '') {
      return NextResponse.json(
        { error: 'Summary text is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify appointment exists and belongs to business
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, business_id, customer_id, worker_id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; business_id: string; customer_id: string; worker_id: string } | null; error: any };

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('training_summaries')
      .select('id')
      .eq('appointment_id', params.id)
      .single() as { data: { id: string } | null; error: any };

    const summaryData = {
      business_id: tenantInfo.businessId,
      appointment_id: params.id,
      worker_id: appointment.worker_id,
      customer_id: appointment.customer_id,
      summary: body.summary.trim(),
      exercises_performed: body.exercises_performed || [],
      notes: body.notes || null,
    };

    let result;
    if (existingSummary) {
      // Update existing summary
      const { data: updatedSummary, error } = await supabase
        .from('training_summaries')
        .update(summaryData)
        .eq('id', existingSummary.id)
        .select()
        .single() as { data: TrainingSummaryRow | null; error: any };

      if (error || !updatedSummary) {
        return NextResponse.json(
          { error: error?.message || 'Failed to update summary' },
          { status: 500 }
        );
      }

      result = updatedSummary;
    } else {
      // Create new summary
      const { data: newSummary, error } = await supabase
        .from('training_summaries')
        .insert(summaryData)
        .select()
        .single() as { data: TrainingSummaryRow | null; error: any };

      if (error || !newSummary) {
        return NextResponse.json(
          { error: error?.message || 'Failed to create summary' },
          { status: 500 }
        );
      }

      result = newSummary;
    }

    return NextResponse.json({
      success: true,
      summary: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save summary' },
      { status: 500 }
    );
  }
}

