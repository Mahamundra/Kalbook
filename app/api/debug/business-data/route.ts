import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];
type WorkerRow = Database['public']['Tables']['workers']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type SettingsRow = Database['public']['Tables']['settings']['Row'];
type TemplateRow = Database['public']['Tables']['templates']['Row'];

/**
 * GET /api/debug/business-data?businessId=xxx
 * Get all data for a specific business (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Load all data in parallel
    const [
      businessResult,
      usersResult,
      customersResult,
      servicesResult,
      workersResult,
      appointmentsResult,
      settingsResult,
      templatesResult,
    ] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', businessId).single(),
      supabase.from('users').select('*').eq('business_id', businessId),
      supabase.from('customers').select('*, customer_tags(*)').eq('business_id', businessId),
      supabase.from('services').select('*').eq('business_id', businessId),
      supabase.from('workers').select('*, worker_services(*)').eq('business_id', businessId),
      supabase.from('appointments').select('*').eq('business_id', businessId),
      supabase.from('settings').select('*').eq('business_id', businessId).maybeSingle(),
      supabase.from('templates').select('*').eq('business_id', businessId),
    ]) as [
      { data: BusinessRow | null; error: any },
      { data: UserRow[] | null; error: any },
      { data: (CustomerRow & { customer_tags: any[] })[] | null; error: any },
      { data: ServiceRow[] | null; error: any },
      { data: (WorkerRow & { worker_services: any[] })[] | null; error: any },
      { data: AppointmentRow[] | null; error: any },
      { data: SettingsRow | null; error: any },
      { data: TemplateRow[] | null; error: any },
    ];

    // Get visits
    const customerIds = customersResult.data?.map(c => c.id) || [];
    const visitsResult = customerIds.length > 0
      ? await supabase.from('visits').select('*').eq('business_id', businessId).in('customer_id', customerIds)
      : { data: [], error: null };

    // Get worker services
    const workerIds = workersResult.data?.map(w => w.id) || [];
    const workerServicesResult = workerIds.length > 0
      ? await supabase.from('worker_services').select('*').in('worker_id', workerIds)
      : { data: [], error: null };

    return NextResponse.json({
      success: true,
      business: businessResult.data,
      users: usersResult.data || [],
      customers: customersResult.data || [],
      services: servicesResult.data || [],
      workers: workersResult.data || [],
      appointments: appointmentsResult.data || [],
      settings: settingsResult.data,
      templates: templatesResult.data || [],
      visits: visitsResult.data || [],
      workerServices: workerServicesResult.data || [],
      counts: {
        users: usersResult.data?.length || 0,
        customers: customersResult.data?.length || 0,
        services: servicesResult.data?.length || 0,
        workers: workersResult.data?.length || 0,
        appointments: appointmentsResult.data?.length || 0,
        templates: templatesResult.data?.length || 0,
        visits: visitsResult.data?.length || 0,
      },
      errors: {
        business: businessResult.error?.message,
        users: usersResult.error?.message,
        customers: customersResult.error?.message,
        services: servicesResult.error?.message,
        workers: workersResult.error?.message,
        appointments: appointmentsResult.error?.message,
        settings: settingsResult.error?.message,
        templates: templatesResult.error?.message,
        visits: visitsResult.error?.message,
      },
    });
  } catch (error: any) {
    console.error('Error loading business data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load business data' },
      { status: 500 }
    );
  }
}

