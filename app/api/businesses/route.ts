import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/businesses
 * Get list of all businesses
 * 
 * Query params:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createAdminClient();

    // Get businesses with count
    const businessesResult = await supabase
      .from('businesses')
      .select('id, slug, name, email, phone, business_type, created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1) as { data: any[] | null; error: any; count: number | null };
    const { data: businesses, error, count } = businessesResult;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    // Format response
    const formattedBusinesses = (businesses || []).map((business: any) => ({
      id: business.id,
      slug: business.slug,
      name: business.name,
      email: business.email,
      phone: business.phone,
      businessType: business.business_type,
      createdAt: business.created_at,
      // Admin URLs
      adminUrl: `/b/${business.slug}/admin/dashboard`,
      bookingUrl: `/b/${business.slug}`,
    }));

    return NextResponse.json({
      success: true,
      businesses: formattedBusinesses,
      count: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

