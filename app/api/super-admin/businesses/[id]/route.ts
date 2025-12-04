import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/super-admin/businesses/[id]
 * Delete a business
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const businessId = params.id;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify business exists
    const businessResult = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single() as { data: BusinessRow | null; error: any };

    if (businessResult.error || !businessResult.data) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Delete the business
    const deleteResult = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (deleteResult.error) {
      console.error('Error deleting business:', deleteResult.error);
      return NextResponse.json(
        { error: deleteResult.error.message || 'Failed to delete business' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete business' },
      { status: 500 }
    );
  }
}

