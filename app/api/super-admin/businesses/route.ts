import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];
type PlanRow = Database['public']['Tables']['plans']['Row'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/businesses
 * Get all businesses with plan information
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get businesses with plan info (left join so businesses without plans still show)
    const businessesResult = await supabase
      .from('businesses')
      .select(`
        *,
        plans (*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1) as { data: Array<BusinessRow & { plans: PlanRow | null }> | null; error: any; count: number | null };

    const { data: businesses, error, count } = businessesResult;

    if (error) {
      console.error('Error fetching businesses:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch businesses', details: error },
        { status: 500 }
      );
    }

    console.log(`Fetched ${businesses?.length || 0} businesses`);

    // Get total count
    const { count: totalCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      businesses: businesses || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

