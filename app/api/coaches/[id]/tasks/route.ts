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
 * GET /api/coaches/[id]/tasks
 * Get all tasks for a coach (gym_trainer only)
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
    const status = searchParams.get('status');

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
      .from('coach_tasks')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .eq('worker_id', params.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tasks, error } = await query as { data: CoachTaskRow[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tasks: tasks || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coaches/[id]/tasks
 * Create a new task for a coach (gym_trainer only)
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
    if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

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

    // Get current user for created_by_user_id
    const { createClient } = await import('@/lib/supabase/server');
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const createdByUserId = user?.id || null;

    const taskData = {
      business_id: tenantInfo.businessId,
      worker_id: params.id,
      customer_id: body.customer_id || null,
      task_type: body.task_type || 'other',
      description: body.description.trim(),
      status: body.status || 'pending',
      due_date: body.due_date ? new Date(body.due_date).toISOString() : null,
      notes: body.notes || null,
      created_by_user_id: createdByUserId,
    };

    const result = await (supabase
      .from('coach_tasks') as any)
      .insert(taskData)
      .select()
      .single();
    
    const { data: newTask, error } = result as { data: CoachTaskRow | null; error: any };

    if (error || !newTask) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task: newTask,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

