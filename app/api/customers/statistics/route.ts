import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

/**
 * GET /api/customers/statistics
 * Get aggregated statistics for customers
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const tags = searchParams.get('tags'); // comma-separated tags

    // Get all customers
    let customersQuery = supabase
      .from('customers')
      .select('*')
      .eq('business_id', tenantInfo.businessId);

    const customersResult = await customersQuery as {
      data: CustomerRow[] | null;
      error: any;
    };

    const customers = customersResult.data || [];

    // Filter by tags if specified
    let filteredCustomers = customers;
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      const customerIds = customers.map((c) => c.id);
      
      const tagsResult = await supabase
        .from('customer_tags')
        .select('customer_id, tag')
        .in('customer_id', customerIds)
        .in('tag', tagArray) as {
        data: Array<{ customer_id: string; tag: string }> | null;
        error: any;
      };

      const taggedCustomerIds = new Set(
        (tagsResult.data || []).map((t) => t.customer_id)
      );
      
      filteredCustomers = customers.filter((c) => taggedCustomerIds.has(c.id));
    }

    // Get all appointments for statistics
    const appointmentsResult = await supabase
      .from('appointments')
      .select('customer_id, start, status, services (price)')
      .eq('business_id', tenantInfo.businessId)
      .in('customer_id', filteredCustomers.map((c) => c.id)) as {
      data: Array<{
        customer_id: string;
        start: string;
        status: string;
        services: { price: number } | null;
      }> | null;
      error: any;
    };

    const appointments = appointmentsResult.data || [];

    // Calculate statistics
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const newCustomerDate = new Date();
    newCustomerDate.setDate(newCustomerDate.getDate() - 30); // Last 30 days

    const totalCustomers = filteredCustomers.length;
    const newCustomersThisMonth = filteredCustomers.filter((c) => {
      const createdDate = new Date(c.created_at);
      return createdDate >= newCustomerDate;
    }).length;

    // Calculate VIP customers (10+ appointments or high revenue)
    const customerAppointmentCounts = new Map<string, number>();
    const customerRevenue = new Map<string, number>();

    appointments
      .filter((apt) => apt.status !== 'cancelled')
      .forEach((apt) => {
        const count = customerAppointmentCounts.get(apt.customer_id) || 0;
        customerAppointmentCounts.set(apt.customer_id, count + 1);
        
        const revenue = customerRevenue.get(apt.customer_id) || 0;
        customerRevenue.set(apt.customer_id, revenue + (apt.services?.price || 0));
      });

    const vipCustomers = filteredCustomers.filter((c) => {
      const appointments = customerAppointmentCounts.get(c.id) || 0;
      const revenue = customerRevenue.get(c.id) || 0;
      return appointments >= 10 || revenue >= 1000;
    }).length;

    // Calculate at-risk customers (no visits in 3 months)
    const atRiskDate = new Date();
    atRiskDate.setMonth(atRiskDate.getMonth() - 3);

    const atRiskCustomers = filteredCustomers.filter((c) => {
      if (!c.last_visit) return true; // Never visited
      const lastVisit = new Date(c.last_visit);
      return lastVisit < atRiskDate;
    }).length;

    // Calculate total revenue
    const totalRevenue = Array.from(customerRevenue.values()).reduce((sum, rev) => sum + rev, 0);
    const thisMonthRevenue = appointments
      .filter((apt) => {
        const aptDate = new Date(apt.start);
        return aptDate >= thisMonthStart && apt.status !== 'cancelled';
      })
      .reduce((sum, apt) => sum + (apt.services?.price || 0), 0);

    // Calculate total appointments
    const totalAppointments = appointments.filter((apt) => apt.status !== 'cancelled').length;
    const thisMonthAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.start);
      return aptDate >= thisMonthStart && apt.status !== 'cancelled';
    }).length;

    return NextResponse.json({
      success: true,
      statistics: {
        totalCustomers,
        newCustomersThisMonth,
        vipCustomers,
        atRiskCustomers,
        totalRevenue,
        thisMonthRevenue,
        totalAppointments,
        thisMonthAppointments,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer statistics' },
      { status: 500 }
    );
  }
}


