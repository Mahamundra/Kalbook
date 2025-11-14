import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type PlanRow = Database['public']['Tables']['plans']['Row'];

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/super-admin/plans/[id]/price
 * Update plan price
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const planId = params.id;
    const body = await request.json();
    const { price } = body;

    if (price === undefined || price === null) {
      return NextResponse.json(
        { error: 'price is required' },
        { status: 400 }
      );
    }

    const priceNumber = Number(price);
    if (isNaN(priceNumber) || priceNumber < 0) {
      return NextResponse.json(
        { error: 'price must be a valid positive number' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Update plan price
    const updateResult = await (supabase
      .from('plans') as any)
      .update({ price: priceNumber })
      .eq('id', planId)
      .select()
      .single() as { data: PlanRow | null; error: any };

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message || 'Failed to update plan price' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: updateResult.data,
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    console.error('Error updating plan price:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plan price' },
      { status: 500 }
    );
  }
}

