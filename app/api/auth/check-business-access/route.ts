import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';

/**
 * POST /api/auth/check-business-access
 * Check if a phone number belongs to a worker or owner of a business
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, businessSlug } = body;

    // Validate inputs
    if (!phone || !businessSlug) {
      return NextResponse.json(
        { error: 'Phone number and business slug are required' },
        { status: 400 }
      );
    }

    // Convert to E.164 format
    const e164Phone = toE164Format(phone);
    const normalizedPhone = e164Phone.trim();

    const supabase = createAdminClient();

    // Get business by slug (include phone for owner check)
    const businessResult = await supabase
      .from('businesses')
      .select('id, slug, phone')
      .eq('slug', businessSlug)
      .maybeSingle() as { data: { id: string; slug: string; phone: string | null } | null; error: any };
    
    const { data: business, error: businessError } = businessResult;

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessId = business.id;
    const businessPhone = business.phone;

    // Check users table for owner or admin with this phone
    const userResult = await supabase
      .from('users')
      .select('id, phone, role')
      .eq('phone', normalizedPhone)
      .eq('business_id', businessId)
      .in('role', ['admin', 'owner'])
      .maybeSingle() as { data: { id: string; phone: string | null; role: string } | null; error: any };
    
    let { data: user, error: userError } = userResult;

    // If not found, try alternative phone formats
    if (userError || !user) {
      const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;
      const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

      const formats = [phoneWithoutPlus, phoneWithPlus];
      for (const phoneFormat of formats) {
        if (phoneFormat === normalizedPhone) continue;

        const userAltResult = await supabase
          .from('users')
          .select('id, phone, role')
          .eq('phone', phoneFormat.trim())
          .eq('business_id', businessId)
          .in('role', ['admin', 'owner'])
          .maybeSingle() as { data: { id: string; phone: string | null; role: string } | null; error: any };
        
        const { data: userAlt } = userAltResult;

        if (userAlt) {
          user = userAlt;
          break;
        }
      }
    }

    // If still not found, try manual matching (case-insensitive, whitespace-agnostic)
    if (!user) {
      const allUsersResult = await supabase
        .from('users')
        .select('id, phone, role')
        .eq('business_id', businessId)
        .in('role', ['admin', 'owner']) as { data: Array<{ id: string; phone: string | null; role: string }> | null; error: any };
      
      const { data: allUsers } = allUsersResult;

      if (allUsers) {
        const normalizedSearched = normalizedPhone.replace(/\s/g, '').toLowerCase();
        for (const dbUser of allUsers) {
          const dbPhone = (dbUser.phone || '').replace(/\s/g, '').toLowerCase();
          if (dbPhone === normalizedSearched) {
            user = dbUser;
            break;
          }
        }
      }
    }

    // If found in users table, they have access
    if (user) {
      console.log('Access granted - found in users table:', { phone: normalizedPhone, role: user.role });
      return NextResponse.json({
        hasAccess: true,
        role: user.role,
      });
    }

    // Check workers table - workers with admin access are in users table
    // So if not found in users, check if worker exists and has admin access
    const workerResult = await supabase
      .from('workers')
      .select('id, phone, email')
      .eq('phone', normalizedPhone)
      .eq('business_id', businessId)
      .maybeSingle() as { data: { id: string; phone: string | null; email: string | null } | null; error: any };
    
    const { data: worker } = workerResult;

    if (worker) {
      // Check if this worker has admin access (exists in users table)
      const workerUserResult = await supabase
        .from('users')
        .select('id, role')
        .eq('business_id', businessId)
        .or(`email.eq.${worker.email || ''},phone.eq.${worker.phone || ''}`)
        .in('role', ['admin', 'owner'])
        .maybeSingle() as { data: { id: string; role: string } | null; error: any };
      
      const { data: workerUser } = workerUserResult;

      if (workerUser) {
        console.log('Access granted - found worker with admin access:', { phone: normalizedPhone, role: workerUser.role });
        return NextResponse.json({
          hasAccess: true,
          role: workerUser.role,
        });
      }
    }

    // Fallback: Check if phone matches business phone (owner's phone)
    // This handles cases where the owner record might not exist in users table yet
    if (businessPhone) {
      // Normalize both phones to E.164 format to ensure consistency
      const normalizedBusinessPhone = toE164Format(businessPhone).trim();
      const normalizedSearchedPhone = toE164Format(normalizedPhone).trim();
      
      // Remove whitespace and convert to lowercase for comparison
      const businessPhoneForCompare = normalizedBusinessPhone.replace(/\s/g, '').toLowerCase();
      const searchedPhoneForCompare = normalizedSearchedPhone.replace(/\s/g, '').toLowerCase();
      
      // Also try comparing without the + prefix (in case one has it and the other doesn't)
      const businessWithoutPlus = businessPhoneForCompare.replace(/^\+/, '');
      const searchedWithoutPlus = searchedPhoneForCompare.replace(/^\+/, '');
      
      // Try multiple comparison methods
      const exactMatch = businessPhoneForCompare === searchedPhoneForCompare;
      const matchWithoutPlus = businessWithoutPlus === searchedWithoutPlus;
      const matchWithDigitsOnly = businessWithoutPlus.replace(/\D/g, '') === searchedWithoutPlus.replace(/\D/g, '');
      
      if (exactMatch || matchWithoutPlus || matchWithDigitsOnly) {
        console.log('Access granted - phone matches business owner phone:', { 
          searchedPhone: normalizedPhone,
          normalizedSearchedPhone: searchedPhoneForCompare,
          businessPhone: businessPhone,
          normalizedBusinessPhone: businessPhoneForCompare,
          matchType: exactMatch ? 'exact' : (matchWithoutPlus ? 'without-plus' : 'digits-only')
        });
        return NextResponse.json({
          hasAccess: true,
          role: 'owner',
        });
      } else {
        // Log failed comparison for debugging
        console.log('Phone comparison failed in fallback:', {
          searchedPhone: normalizedPhone,
          normalizedSearchedPhone: searchedPhoneForCompare,
          businessPhone: businessPhone,
          normalizedBusinessPhone: businessPhoneForCompare,
          businessWithoutPlus,
          searchedWithoutPlus,
        });
      }
    }

    // Debug: Log all users and workers for this business
    const allUsersResult = await supabase
      .from('users')
      .select('id, phone, email, name, role')
      .eq('business_id', businessId) as { data: Array<{ id: string; phone: string | null; email: string | null; name: string | null; role: string }> | null; error: any };
    
    const { data: allUsers } = allUsersResult;
    
    const allWorkersResult = await supabase
      .from('workers')
      .select('id, phone, email, name')
      .eq('business_id', businessId) as { data: Array<{ id: string; phone: string | null; email: string | null; name: string | null }> | null; error: any };
    
    const { data: allWorkers } = allWorkersResult;

    console.log('Access denied - debug info:', {
      searchedPhone: normalizedPhone,
      businessId,
      businessSlug,
      businessPhone,
      usersInBusiness: allUsers || [],
      workersInBusiness: allWorkers || [],
    });

    // No access found
    return NextResponse.json({
      hasAccess: false,
    });
  } catch (error: any) {
    console.error('Error checking business access:', error);
    return NextResponse.json(
      { error: 'Failed to check business access' },
      { status: 500 }
    );
  }
}

