import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findBusinessAdminByPhone,
  findWorkerByPhoneInBusiness,
  phonesMatch,
} from '@/lib/onboarding/availability';

/**
 * POST /api/auth/check-business-access
 * Check if a phone number belongs to a worker or owner of a business
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, businessSlug } = body;

    if (!phone || !businessSlug) {
      return NextResponse.json(
        { error: 'Phone number and business slug are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const businessResult = await supabase
      .from('businesses')
      .select('id, slug, phone')
      .eq('slug', businessSlug)
      .maybeSingle() as { data: { id: string; slug: string; phone: string | null } | null; error: unknown };

    const { data: business, error: businessError } = businessResult;

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessId = business.id;

    const user = await findBusinessAdminByPhone(supabase, phone, businessId);

    if (user) {
      return NextResponse.json({
        hasAccess: true,
        role: user.role,
      });
    }

    const worker = await findWorkerByPhoneInBusiness(supabase, phone, businessId);

    if (worker) {
      const workerUserResult = await supabase
        .from('users')
        .select('id, role, email, phone')
        .eq('business_id', businessId)
        .in('role', ['admin', 'owner']) as {
          data: Array<{ id: string; role: string; email: string | null; phone: string | null }> | null;
          error: unknown;
        };

      const { data: adminUsers } = workerUserResult;

      const workerUser = adminUsers?.find(
        (adminUser) =>
          (worker.email && adminUser.email === worker.email) ||
          (worker.phone && phonesMatch(worker.phone, adminUser.phone))
      );

      if (workerUser) {
        return NextResponse.json({
          hasAccess: true,
          role: workerUser.role,
        });
      }
    }

    if (business.phone && phonesMatch(phone, business.phone)) {
      return NextResponse.json({
        hasAccess: true,
        role: 'owner',
      });
    }

    return NextResponse.json({
      hasAccess: false,
    });
  } catch (error: unknown) {
    console.error('Error checking business access:', error);
    return NextResponse.json(
      { error: 'Failed to check business access' },
      { status: 500 }
    );
  }
}
