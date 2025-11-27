import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseCSVFile, validateCustomerCSVRow, detectDuplicateCustomers } from '@/lib/customers/csv-utils';
import { normalizePhone } from '@/lib/customers/utils';
import { mapCustomerToInterface } from '@/lib/customers/utils';
import type { Customer } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

/**
 * POST /api/customers/import
 * Import customers from CSV
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Parse CSV
    let csvRows: Array<Record<string, string>>;
    try {
      csvRows = parseCSVFile(content);
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to parse CSV: ${error.message}` },
        { status: 400 }
      );
    }

    if (csvRows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get existing customers for duplicate detection
    const existingCustomersResult = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', tenantInfo.businessId) as {
      data: CustomerRow[] | null;
      error: any;
    };

    const existingCustomers = existingCustomersResult.data || [];
    const existingCustomersMapped: Customer[] = await Promise.all(
      existingCustomers.map(async (customer) => {
        const tagsResult = await supabase
          .from('customer_tags')
          .select('*')
          .eq('customer_id', customer.id) as {
          data: Array<{ customer_id: string; tag: string }> | null;
          error: any;
        };
        return mapCustomerToInterface(customer, tagsResult.data || []);
      })
    );

    // Validate and process rows
    const results = {
      total: csvRows.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
      warnings: [] as Array<{ row: number; warnings: string[] }>,
      duplicates: [] as Array<{ row: number; customer: string }>,
    };

    const customersToCreate: Array<{
      customer: Partial<Customer>;
      rowIndex: number;
    }> = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const validation = validateCustomerCSVRow(row, i);

      if (!validation.valid) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          errors: validation.errors,
        });
        continue;
      }

      if (validation.warnings.length > 0) {
        results.warnings.push({
          row: i + 1,
          warnings: validation.warnings,
        });
      }

      if (!validation.customer) {
        results.failed++;
        continue;
      }

      // Check for duplicates
      const duplicate = detectDuplicateCustomers(existingCustomersMapped, validation.customer);
      if (duplicate) {
        results.skipped++;
        results.duplicates.push({
          row: i + 1,
          customer: duplicate.name,
        });
        continue;
      }

      customersToCreate.push({
        customer: validation.customer,
        rowIndex: i + 1,
      });
    }

    // Create customers
    for (const { customer, rowIndex } of customersToCreate) {
      try {
        const normalizedPhone = normalizePhone(customer.phone || '');

        // Check if customer already exists (double-check)
        const existingCheck = await supabase
          .from('customers')
          .select('id')
          .eq('business_id', tenantInfo.businessId)
          .eq('phone', normalizedPhone)
          .maybeSingle() as { data: { id: string } | null; error: any };

        if (existingCheck.data) {
          results.skipped++;
          results.duplicates.push({
            row: rowIndex,
            customer: customer.name || 'Unknown',
          });
          continue;
        }

        // Create customer
        const customerData = {
          business_id: tenantInfo.businessId,
          name: customer.name!,
          phone: normalizedPhone,
          email: customer.email || null,
          notes: customer.notes || null,
          date_of_birth: customer.dateOfBirth || null,
          gender: customer.gender || null,
          consent_marketing: customer.consentMarketing ?? false,
          blocked: customer.blocked ?? false,
          last_visit: customer.lastVisit || null,
        };

        const createResult = await (supabase
          .from('customers') as any)
          .insert(customerData)
          .select()
          .single() as { data: CustomerRow | null; error: any };

        if (createResult.error || !createResult.data) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            errors: [createResult.error?.message || 'Failed to create customer'],
          });
          continue;
        }

        // Add tags if provided
        if (customer.tags && customer.tags.length > 0) {
          const tagInserts = customer.tags.map((tag: string) => ({
            customer_id: createResult.data.id,
            tag: tag.trim(),
          }));

          await supabase.from('customer_tags').insert(tagInserts);
        }

        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowIndex,
          errors: [error.message || 'Failed to create customer'],
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { error: 'Failed to import customers' },
      { status: 500 }
    );
  }
}


