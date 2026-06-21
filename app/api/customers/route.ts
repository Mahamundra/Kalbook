import { NextRequest, NextResponse } from 'next/server';
import { businessContextRequired, apiErrorFromMessage, internalError } from '@/lib/api/responses';
import { parseJsonBody } from '@/lib/api/parse-request-body';
import { createCustomerSchema } from '@/lib/api/validation/schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapCustomerToInterface, normalizePhone } from '@/lib/customers/utils';
import type { Customer } from '@/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

/**
 * GET /api/customers
 * Get all customers for the current business (with pagination)
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return businessContextRequired();
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const blocked = searchParams.get('blocked');
    const tags = searchParams.get('tags'); // comma-separated tags
    const consentMarketing = searchParams.get('consentMarketing');
    const lastVisitFrom = searchParams.get('lastVisitFrom');
    const lastVisitTo = searchParams.get('lastVisitTo');
    const createdDateFrom = searchParams.get('createdDateFrom');
    const createdDateTo = searchParams.get('createdDateTo');
    const dateOfBirthFrom = searchParams.get('dateOfBirthFrom');
    const dateOfBirthTo = searchParams.get('dateOfBirthTo');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    if (blocked !== null && blocked !== undefined) {
      query = query.eq('blocked', blocked === 'true');
    }

    if (consentMarketing !== null && consentMarketing !== undefined) {
      query = query.eq('consent_marketing', consentMarketing === 'true');
    }

    if (lastVisitFrom) {
      query = query.gte('last_visit', lastVisitFrom);
    }

    if (lastVisitTo) {
      query = query.lte('last_visit', lastVisitTo);
    }

    if (createdDateFrom) {
      query = query.gte('created_at', createdDateFrom);
    }

    if (createdDateTo) {
      query = query.lte('created_at', createdDateTo);
    }

    if (dateOfBirthFrom) {
      query = query.gte('date_of_birth', dateOfBirthFrom);
    }

    if (dateOfBirthTo) {
      query = query.lte('date_of_birth', dateOfBirthTo);
    }

    // Handle sorting
    // Map frontend sortBy to database column names
    const sortColumnMap: Record<string, string> = {
      'name': 'name',
      'lastVisit': 'last_visit',
      'createdDate': 'created_at',
      'created_at': 'created_at',
      'dateOfBirth': 'date_of_birth',
      'date_of_birth': 'date_of_birth',
    };

    const dbSortColumn = sortBy && sortColumnMap[sortBy] ? sortColumnMap[sortBy] : 'created_at';
    const ascending = sortOrder === 'asc';

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order(dbSortColumn, { ascending }).range(from, to);

    const queryResult = await query as { data: CustomerRow[] | null; error: any; count: number | null };
    const { data: customers, error, count } = queryResult;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Get tags for all customers
    const customerIds = (customers || []).map((c) => c.id);
    const tagsResult = await supabase
      .from('customer_tags')
      .select('*')
      .in('customer_id', customerIds) as { data: Array<{ customer_id: string; tag: string }> | null; error: any };
    const allTags = tagsResult.data;

    // Group tags by customer_id
    const tagsByCustomer = new Map<string, Array<{ customer_id: string; tag: string }>>();
    allTags?.forEach((tag) => {
      if (!tagsByCustomer.has(tag.customer_id)) {
        tagsByCustomer.set(tag.customer_id, []);
      }
      tagsByCustomer.get(tag.customer_id)!.push(tag);
    });

    // Map to Customer interface
    const mappedCustomers: Customer[] = await Promise.all(
      (customers || []).map(async (customer) => {
        const customerTags = tagsByCustomer.get(customer.id) || [];
        return mapCustomerToInterface(customer, customerTags);
      })
    );

    // Filter by tags if specified
    let filteredCustomers = mappedCustomers;
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      filteredCustomers = mappedCustomers.filter((customer) =>
        tagArray.some((tag) => customer.tags.includes(tag))
      );
    }

    // Calculate total after tag filtering if tags were applied
    let finalTotal = count || 0;
    if (tags && tags.trim()) {
      finalTotal = filteredCustomers.length;
    }

    return NextResponse.json({
      success: true,
      customers: filteredCustomers,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
        hasMore: page * limit < finalTotal,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, createCustomerSchema);
    if (!parsed.success) {
      return parsed.response;
    }
    const body = parsed.data;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return businessContextRequired();
    }

    const normalizedPhone = normalizePhone(body.phone);
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if customer with this phone already exists
    const existingCustomerResult = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', tenantInfo.businessId)
      .eq('phone', normalizedPhone)
      .maybeSingle() as { data: { id: string } | null; error: any };
    const { data: existingCustomer } = existingCustomerResult;

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 409 }
      );
    }

    // Normalize email: convert empty strings to null, trim whitespace
    const normalizedEmail = body.email 
      ? (typeof body.email === 'string' ? body.email.trim() : body.email)
      : null;
    const finalEmail = normalizedEmail && normalizedEmail.length > 0 ? normalizedEmail : null;

    // Prepare customer data
    const customerData = {
      business_id: tenantInfo.businessId,
      name: body.name.trim(),
      phone: normalizedPhone,
      email: finalEmail,
      notes: body.notes || null,
      date_of_birth: body.dateOfBirth || body.date_of_birth || null,
      gender: body.gender || null,
      consent_marketing: body.consentMarketing ?? body.consent_marketing ?? false,
      blocked: body.blocked ?? false,
    };

    // Create customer
    const createResult = await (supabase
      .from('customers') as any)
      .insert(customerData)
      .select()
      .single() as { data: CustomerRow | null; error: any };
    const { data: newCustomer, error } = createResult;

    if (error || !newCustomer) {
      return NextResponse.json(
        { 
          error: error?.message || 'Failed to create customer',
          details: process.env.NODE_ENV === 'development' ? error?.details : undefined
        },
        { status: 500 }
      );
    }

    // Add tags if provided
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      const tagInserts = body.tags.map((tag: string) => ({
        customer_id: newCustomer.id,
        tag: tag.trim(),
      }));

      await (supabase
        .from('customer_tags') as any)
        .insert(tagInserts);
    }

    // Map to Customer interface
    const customerTagsResult = await supabase
      .from('customer_tags')
      .select('*')
      .eq('customer_id', newCustomer.id) as { data: any[] | null; error: any };
    const { data: customerTags } = customerTagsResult;

    const mappedCustomer = await mapCustomerToInterface(
      newCustomer,
      customerTags || []
    );

    return NextResponse.json(
      {
        success: true,
        customer: mappedCustomer,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

