import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { exportCustomersToCSV } from '@/lib/customers/csv-utils';
import { mapCustomerToInterface } from '@/lib/customers/utils';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

/**
 * POST /api/customers/bulk-export
 * Export selected customers to CSV
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
    const { customerIds } = body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: 'Customer IDs are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get customers
    const customersResult = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .in('id', customerIds) as {
      data: CustomerRow[] | null;
      error: any;
    };

    if (customersResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    const customers = customersResult.data || [];

    // Get tags for all customers
    const tagsResult = await supabase
      .from('customer_tags')
      .select('*')
      .in('customer_id', customers.map((c) => c.id)) as {
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

    // Generate CSV
    const csvContent = exportCustomersToCSV(mappedCustomers);

    // Return CSV as text
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`,
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


