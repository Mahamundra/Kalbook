import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

/**
 * POST /api/customers/merge
 * Merge two customers
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
    const { primaryCustomerId, secondaryCustomerId } = body;

    if (!primaryCustomerId || !secondaryCustomerId) {
      return NextResponse.json(
        { error: 'Both primary and secondary customer IDs are required' },
        { status: 400 }
      );
    }

    if (primaryCustomerId === secondaryCustomerId) {
      return NextResponse.json(
        { error: 'Cannot merge a customer with itself' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify both customers belong to business
    const customersResult = await supabase
      .from('customers')
      .select('id, name')
      .eq('business_id', tenantInfo.businessId)
      .in('id', [primaryCustomerId, secondaryCustomerId]) as {
      data: Array<{ id: string; name: string }> | null;
      error: any;
    };

    if (customersResult.error || !customersResult.data || customersResult.data.length !== 2) {
      return NextResponse.json(
        { error: 'One or both customers not found' },
        { status: 404 }
      );
    }

    const primaryCustomer = customersResult.data.find((c) => c.id === primaryCustomerId);
    const secondaryCustomer = customersResult.data.find((c) => c.id === secondaryCustomerId);

    if (!primaryCustomer || !secondaryCustomer) {
      return NextResponse.json(
        { error: 'Customers not found' },
        { status: 404 }
      );
    }

    // Merge operations
    // 1. Move appointments from secondary to primary
    await (supabase
      .from('appointments') as any)
      .update({ customer_id: primaryCustomerId })
      .eq('customer_id', secondaryCustomerId)
      .eq('business_id', tenantInfo.businessId);

    // 2. Move tags from secondary to primary (avoid duplicates)
    const secondaryTagsResult = await supabase
      .from('customer_tags')
      .select('tag')
      .eq('customer_id', secondaryCustomerId) as {
      data: Array<{ tag: string }> | null;
      error: any;
    };

    const primaryTagsResult = await supabase
      .from('customer_tags')
      .select('tag')
      .eq('customer_id', primaryCustomerId) as {
      data: Array<{ tag: string }> | null;
      error: any;
    };

    const primaryTags = new Set((primaryTagsResult.data || []).map((t) => t.tag));
    const tagsToAdd = (secondaryTagsResult.data || [])
      .map((t) => t.tag)
      .filter((tag) => !primaryTags.has(tag))
      .map((tag) => ({
        customer_id: primaryCustomerId,
        tag,
      }));

    if (tagsToAdd.length > 0) {
      await (supabase
        .from('customer_tags') as any)
        .insert(tagsToAdd);
    }

    // Delete secondary customer tags
    await supabase
      .from('customer_tags')
      .delete()
      .eq('customer_id', secondaryCustomerId);

    // 3. Move communications from secondary to primary
    await (supabase
      .from('customer_communications') as any)
      .update({ customer_id: primaryCustomerId })
      .eq('customer_id', secondaryCustomerId)
      .eq('business_id', tenantInfo.businessId);

    // 4. Move notes history from secondary to primary
    await (supabase
      .from('customer_notes_history') as any)
      .update({ customer_id: primaryCustomerId })
      .eq('customer_id', secondaryCustomerId)
      .eq('business_id', tenantInfo.businessId);

    // 5. Move visits from secondary to primary
    await (supabase
      .from('visits') as any)
      .update({ customer_id: primaryCustomerId })
      .eq('customer_id', secondaryCustomerId)
      .eq('business_id', tenantInfo.businessId);

    // 6. Update primary customer with best data from secondary
    // (keep primary's data, but update if secondary has better data)
    const secondaryCustomerData = await supabase
      .from('customers')
      .select('*')
      .eq('id', secondaryCustomerId)
      .single() as {
      data: Database['public']['Tables']['customers']['Row'] | null;
      error: any;
    };

    if (secondaryCustomerData.data) {
      const updates: Partial<Database['public']['Tables']['customers']['Update']> = {};

      // Merge notes (combine if both exist)
      const primaryCustomerData = await supabase
        .from('customers')
        .select('notes')
        .eq('id', primaryCustomerId)
        .single() as {
        data: { notes: string | null } | null;
        error: any;
      };

      if (primaryCustomerData.data) {
        const primaryNotes = primaryCustomerData.data.notes || '';
        const secondaryNotes = secondaryCustomerData.data.notes || '';
        if (secondaryNotes && !primaryNotes.includes(secondaryNotes)) {
          updates.notes = primaryNotes
            ? `${primaryNotes}\n\n--- Merged from ${secondaryCustomer.name} ---\n${secondaryNotes}`
            : secondaryNotes;
        }
      }

      // Update last visit if secondary's is more recent
      if (secondaryCustomerData.data.last_visit) {
        const primaryLastVisit = primaryCustomerData.data?.notes ? 
          new Date((primaryCustomerData.data as any).last_visit || 0) : null;
        const secondaryLastVisit = new Date(secondaryCustomerData.data.last_visit);
        
        if (!primaryLastVisit || secondaryLastVisit > primaryLastVisit) {
          updates.last_visit = secondaryCustomerData.data.last_visit;
        }
      }

      // Update email if primary doesn't have one
      if (!primaryCustomerData.data?.notes && secondaryCustomerData.data.email) {
        updates.email = secondaryCustomerData.data.email;
      }

      if (Object.keys(updates).length > 0) {
        await (supabase
          .from('customers') as any)
          .update(updates)
          .eq('id', primaryCustomerId);
      }
    }

    // 7. Delete secondary customer
    await supabase
      .from('customers')
      .delete()
      .eq('id', secondaryCustomerId)
      .eq('business_id', tenantInfo.businessId);

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${secondaryCustomer.name} into ${primaryCustomer.name}`,
      primaryCustomerId,
    });
  } catch (error: any) {
    console.error('Error merging customers:', error);
    return NextResponse.json(
      { error: 'Failed to merge customers' },
      { status: 500 }
    );
  }
}


