import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapCustomerToInterface, normalizePhone, toE164Format } from '@/lib/customers/utils';
import type { Database } from '@/lib/supabase/database.types';

type CustomerTagRow = Database['public']['Tables']['customer_tags']['Row'];
type VisitRow = Database['public']['Tables']['visits']['Row'];

/**
 * GET /api/customers/phone/[phone]
 * Get customer by phone number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { phone: string } }
) {
  try {
    const phoneParam = decodeURIComponent(params.phone);

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Try multiple phone formats to find the customer
    // Customers might be stored in different formats (E.164, normalized, or original)
    const e164Phone = toE164Format(phoneParam);
    const normalizedPhone = normalizePhone(phoneParam);
    const normalizedE164 = normalizePhone(e164Phone); // E.164 without + and spaces
    
    // Try formats in order: E.164 (most common), normalized E.164, original normalized
    const phoneFormats = [
      e164Phone,           // +972542636737
      normalizedE164,      // 972542636737
      normalizedPhone,     // 0542636737 or 542636737
      phoneParam,          // Original format
    ].filter((format, index, self) => format && self.indexOf(format) === index); // Remove duplicates

    let customer: any = null;
    let error: any = null;

    // Try each format until we find a match
    for (const phoneFormat of phoneFormats) {
      const customerResult = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', tenantInfo.businessId)
        .eq('phone', phoneFormat)
        .maybeSingle() as { data: any; error: any };
      
      ({ data: customer, error } = customerResult);
      
      if (customer) {
        break; // Found customer, stop searching
      }
      
      if (error) {
        // If there's a database error (not just "not found"), stop and return error
        break;
      }
    }

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch customer' },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get customer tags
    const tagsResult = await supabase
      .from('customer_tags')
      .select('*')
      .eq('customer_id', customer.id) as { data: CustomerTagRow[] | null; error: any };
    const { data: tags } = tagsResult;

    // Get visit history
    const visitsResult = await supabase
      .from('visits')
      .select('*')
      .eq('customer_id', customer.id)
      .order('date', { ascending: false }) as { data: VisitRow[] | null; error: any };
    const { data: visits } = visitsResult;

    // Map to Customer interface
    const mappedCustomer = await mapCustomerToInterface(
      customer,
      tags || [],
      visits || []
    );

    return NextResponse.json({
      success: true,
      customer: mappedCustomer,
    });
  } catch (error: any) {
    console.error('Error fetching customer by phone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

