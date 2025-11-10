import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/debug/businesses
 * Get all businesses (for debug page)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, slug, name')
      .order('slug');

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to load businesses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      businesses: businesses || [],
    });
  } catch (error: any) {
    console.error('Error loading businesses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load businesses' },
      { status: 500 }
    );
  }
}

