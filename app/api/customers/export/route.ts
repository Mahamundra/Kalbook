import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapCustomerToInterface } from '@/lib/customers/utils';
import { exportCustomersToCSV } from '@/lib/customers/csv-utils';
import type { Database } from '@/lib/supabase/database.types';
import type { Customer } from '@/components/ported/types/admin';

/**
 * POST /api/customers/export
 * Export customers to CSV
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const filters = body.filters || {}; // Apply same filters as GET endpoint

    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.blocked !== undefined) queryParams.append('blocked', String(filters.blocked));
    if (filters.tags) queryParams.append('tags', filters.tags);
    if (filters.consentMarketing !== undefined) queryParams.append('consentMarketing', String(filters.consentMarketing));
    if (filters.lastVisitFrom) queryParams.append('lastVisitFrom', filters.lastVisitFrom);
    if (filters.lastVisitTo) queryParams.append('lastVisitTo', filters.lastVisitTo);
    if (filters.createdDateFrom) queryParams.append('createdDateFrom', filters.createdDateFrom);
    if (filters.createdDateTo) queryParams.append('createdDateTo', filters.createdDateTo);
    if (filters.dateOfBirthFrom) queryParams.append('dateOfBirthFrom', filters.dateOfBirthFrom);
    if (filters.dateOfBirthTo) queryParams.append('dateOfBirthTo', filters.dateOfBirthTo);

    // Fetch all customers matching filters (no pagination limit for export)
    queryParams.append('limit', '10000'); // Large limit for export
    queryParams.append('page', '1');

    const supabase = createAdminClient();

    // Build query same as GET endpoint
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    if (filters.blocked !== undefined) {
      query = query.eq('blocked', filters.blocked);
    }

    if (filters.consentMarketing !== undefined) {
      query = query.eq('consent_marketing', filters.consentMarketing);
    }

    if (filters.lastVisitFrom) {
      query = query.gte('last_visit', filters.lastVisitFrom);
    }

    if (filters.lastVisitTo) {
      query = query.lte('last_visit', filters.lastVisitTo);
    }

    if (filters.createdDateFrom) {
      query = query.gte('created_at', filters.createdDateFrom);
    }

    if (filters.createdDateTo) {
      query = query.lte('created_at', filters.createdDateTo);
    }

    if (filters.dateOfBirthFrom) {
      query = query.gte('date_of_birth', filters.dateOfBirthFrom);
    }

    if (filters.dateOfBirthTo) {
      query = query.lte('date_of_birth', filters.dateOfBirthTo);
    }

    // Get all customers (no pagination for export)
    const customersResult = await query as {
      data: Array<Database['public']['Tables']['customers']['Row']> | null;
      error: any;
    };

    if (customersResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch customers for export' },
        { status: 500 }
      );
    }

    const customers = customersResult.data || [];

    // Get tags for all customers
    const customerIds = customers.map((c) => c.id);
    const tagsResult = await supabase
      .from('customer_tags')
      .select('*')
      .in('customer_id', customerIds) as {
      data: Array<{ customer_id: string; tag: string }> | null;
      error: any;
    };

    const allTags = tagsResult.data || [];
    const tagsByCustomer = new Map<string, Array<{ customer_id: string; tag: string }>>();
    allTags.forEach((tag) => {
      if (!tagsByCustomer.has(tag.customer_id)) {
        tagsByCustomer.set(tag.customer_id, []);
      }
      tagsByCustomer.get(tag.customer_id)!.push(tag);
    });

    // Map to Customer interface
    const mappedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const customerTags = tagsByCustomer.get(customer.id) || [];
        return mapCustomerToInterface(customer, customerTags);
      })
    );

    // Filter by tags if specified
    let filteredCustomers = mappedCustomers;
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      filteredCustomers = mappedCustomers.filter((customer) =>
        filters.tags!.some((tag: string) => customer.tags.includes(tag))
      );
    }

    // Generate CSV
    const csvContent = exportCustomersToCSV(filteredCustomers);

    // Return CSV as text
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}

