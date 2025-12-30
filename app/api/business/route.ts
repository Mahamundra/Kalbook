import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

/**
 * GET /api/business?slug=xxx
 * Check if a business exists by slug
 * Usage: /api/business?slug=ui
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
    const businessResult = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .maybeSingle() as { data: BusinessRow | null; error: any };
    const { data: business, error } = businessResult;

    if (error) {
      return NextResponse.json({
        error: error.message,
        slug,
      }, { status: 500 });
    }

    if (!business) {
      return NextResponse.json({
        exists: false,
        slug,
        message: `Business with slug "${slug}" not found`,
      }, { status: 404 });
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
















