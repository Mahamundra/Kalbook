import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/customers/bulk-tags
 * Bulk add/remove tags for selected customers
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
    const { customerIds, tags, operation } = body; // operation: 'add' | 'remove'

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: 'Customer IDs are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'Tags are required' },
        { status: 400 }
      );
    }

    if (!operation || !['add', 'remove'].includes(operation)) {
      return NextResponse.json(
        { error: 'Operation must be "add" or "remove"' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify all customers belong to business
    const customersResult = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', tenantInfo.businessId)
      .in('id', customerIds) as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (customersResult.error) {
      return NextResponse.json(
        { error: 'Failed to verify customers' },
        { status: 500 }
      );
    }

    const validCustomerIds = (customersResult.data || []).map((c) => c.id);

    if (validCustomerIds.length !== customerIds.length) {
      return NextResponse.json(
        { error: 'Some customers not found or do not belong to your business' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    if (operation === 'add') {
      // Add tags
      const tagInserts = [];
      for (const customerId of validCustomerIds) {
        for (const tag of tags) {
          tagInserts.push({
            customer_id: customerId,
            tag: tag.trim(),
          });
        }
      }

      // Insert tags (ignore conflicts for existing tags)
      const insertResult = await supabase
        .from('customer_tags')
        .insert(tagInserts)
        .select();

      if (insertResult.error) {
        // Some tags might already exist, which is fine
        // Count successful inserts
        const inserted = insertResult.data?.length || 0;
        successCount = Math.floor(inserted / tags.length);
        errorCount = validCustomerIds.length - successCount;
      } else {
        successCount = validCustomerIds.length;
      }
    } else {
      // Remove tags
      for (const customerId of validCustomerIds) {
        const deleteResult = await supabase
          .from('customer_tags')
          .delete()
          .eq('customer_id', customerId)
          .in('tag', tags.map((t: string) => t.trim()));

        if (deleteResult.error) {
          errorCount++;
        } else {
          successCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        total: validCustomerIds.length,
        successful: successCount,
        failed: errorCount,
      },
    });
  } catch (error: any) {
    console.error('Error performing bulk tag operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk tag operation' },
      { status: 500 }
    );
  }
}


