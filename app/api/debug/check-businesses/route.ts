import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

/**
 * Debug endpoint to check if multiple slugs map to the same business_id
 * GET /api/debug/check-businesses?slug1=ui&slug2=demo-barbershop
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug1 = searchParams.get('slug1') || 'ui';
    const slug2 = searchParams.get('slug2') || 'demo-barbershop';

    const supabase = createAdminClient();

    // Get both businesses
    const business1Result = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug1)
      .single() as { data: BusinessRow | null; error: any };
    const { data: business1 } = business1Result;

    const business2Result = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug2)
      .single() as { data: BusinessRow | null; error: any };
    const { data: business2 } = business2Result;

    // Check if they have the same business_id
    const sameId = business1?.id === business2?.id;

    // Get customer counts for each
    const { count: count1 } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business1?.id || '');

    const { count: count2 } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business2?.id || '');

    // Get all businesses with their slugs
    const { data: allBusinesses } = await supabase
      .from('businesses')
      .select('id, slug, name')
      .order('slug');

    return NextResponse.json({
      success: true,
      comparison: {
        slug1: {
          slug: slug1,
          found: !!business1,
          business: business1 ? {
            id: business1.id,
            name: business1.name,
            slug: business1.slug,
          } : null,
          customerCount: count1 || 0,
        },
        slug2: {
          slug: slug2,
          found: !!business2,
          business: business2 ? {
            id: business2.id,
            name: business2.name,
            slug: business2.slug,
          } : null,
          customerCount: count2 || 0,
        },
        sameBusinessId: sameId,
        warning: sameId ? '⚠️ WARNING: Both slugs point to the SAME business_id!' : '✅ Different business_ids',
      },
      allBusinesses: allBusinesses || [],
    });
  } catch (error: any) {
    console.error('Error checking businesses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check businesses' },
      { status: 500 }
    );
  }
}

