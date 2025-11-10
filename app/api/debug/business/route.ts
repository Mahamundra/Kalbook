import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/debug/business
 * Debug endpoint to check if a business exists
 * Usage: /api/debug/business?slug=ui
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({
        error: 'Please provide a slug parameter: ?slug=your-business-slug',
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if business exists
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        error: error.message,
        slug,
      }, { status: 500 });
    }

      if (!business) {
      // List all businesses to help user
      const { data: allBusinesses } = await supabase
        .from('businesses')
        .select('slug, name, id')
        .order('created_at', { ascending: false })
        .limit(20);

      return NextResponse.json({
        exists: false,
        slug,
        message: `Business with slug "${slug}" not found`,
        availableBusinesses: (allBusinesses || []).map((b: any) => ({
          slug: b.slug,
          name: b.name,
          adminUrl: `/b/${b.slug}/admin/dashboard`,
          bookingUrl: `/b/${b.slug}`,
        })),
        hint: 'Use one of the available slugs above, or visit /api/businesses for full list',
      });
    }

    return NextResponse.json({
      exists: true,
      business: {
        id: business.id,
        slug: business.slug,
        name: business.name,
        email: business.email,
        phone: business.phone,
      },
      adminUrl: `/b/${business.slug}/admin/dashboard`,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Failed to check business',
    }, { status: 500 });
  }
}

