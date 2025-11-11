import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessBySlug } from '@/lib/supabase/helpers';
import type { Business } from '@/lib/supabase/database.types';

/**
 * Test API route to verify Supabase connection
 * Visit: http://localhost:3000/api/test-db
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test 1: Get business by slug
    const business = await getBusinessBySlug('demo-barbershop') as Business | null;
    
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }
    
    // Test 2: Get services
    const servicesResult = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id) as { data: any[] | null; error: any };
    const { data: services, error: servicesError } = servicesResult;
    
    // Test 3: Get workers
    const workersResult = await supabase
      .from('workers')
      .select('*')
      .eq('business_id', business.id) as { data: any[] | null; error: any };
    const { data: workers, error: workersError } = workersResult;

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working!',
      data: {
        business,
        services: services || [],
        servicesError: servicesError?.message,
        workers: workers || [],
        workersError: workersError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        details: error,
      },
      { status: 500 }
    );
  }
}

