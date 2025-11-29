import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type CoachTaskRow = Database['public']['Tables']['coach_tasks']['Row'];

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
 * PATCH /api/coaches/[id]/tasks/[taskId]
 * Update a task (gym_trainer only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
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

    const supabase = createAdminClient();

    // Verify task exists and belongs to business and coach
    const { data: existingTask, error: checkError } = await supabase
      .from('coach_tasks')
      .select('id')
      .eq('id', params.taskId)
      .eq('business_id', tenantInfo.businessId)
      .eq('worker_id', params.id)
      .single() as { data: { id: string } | null; error: any };

    if (checkError || !existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (body.status !== 'completed' && updateData.completed_at) {
        updateData.completed_at = null;
      }
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.task_type !== undefined) {
      updateData.task_type = body.task_type;
    }
    if (body.due_date !== undefined) {
      updateData.due_date = body.due_date ? new Date(body.due_date).toISOString() : null;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const { data: updatedTask, error } = await supabase
      .from('coach_tasks')
      .update(updateData)
      .eq('id', params.taskId)
      .select()
      .single() as { data: CoachTaskRow | null; error: any };

    if (error || !updatedTask) {
      return NextResponse.json(
        { error: error?.message || 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

