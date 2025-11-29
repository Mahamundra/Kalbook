import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type StudioTaskRow = Database['public']['Tables']['studio_tasks']['Row'];

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
 * GET /api/studio/tasks
 * Get all studio tasks (gym_trainer only)
 * Query params: status, priority, assigned_to_user_id
 */
export async function GET(request: NextRequest) {
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
    const priority = searchParams.get('priority');
    const assignedToUserId = searchParams.get('assigned_to_user_id');

    let query = supabase
      .from('studio_tasks')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (assignedToUserId) {
      query = query.eq('assigned_to_user_id', assignedToUserId);
    }

    const { data: tasks, error } = await query as { data: StudioTaskRow[] | null; error: any };

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
 * POST /api/studio/tasks
 * Create a new studio task (gym_trainer only)
 */
export async function POST(request: NextRequest) {
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
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current user for created_by_user_id
    const { createClient } = await import('@/lib/supabase/server');
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const createdByUserId = user?.id || null;

    const taskData = {
      business_id: tenantInfo.businessId,
      assigned_to_user_id: body.assigned_to_user_id || null,
      task_type: body.task_type || 'other',
      title: body.title.trim(),
      description: body.description || null,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      due_date: body.due_date ? new Date(body.due_date).toISOString() : null,
      created_by_user_id: createdByUserId,
    };

    const { data: newTask, error } = await supabase
      .from('studio_tasks')
      .insert(taskData)
      .select()
      .single() as { data: StudioTaskRow | null; error: any };

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

