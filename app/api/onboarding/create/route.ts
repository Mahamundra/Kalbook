import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateUniqueSlug, getDefaultServices, getDefaultTimezone, getDefaultCurrency } from '@/lib/onboarding/utils';
import { toE164Format } from '@/lib/customers/utils';
import type { BusinessType } from '@/lib/supabase/database.types';
import type { Database } from '@/lib/supabase/database.types';

type Business = Database['public']['Tables']['businesses']['Row'];
type User = Database['public']['Tables']['users']['Row'];

/**
 * POST /api/onboarding/create
 * Create a new business with default services, settings, and admin user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessType, businessInfo, adminUser } = body;

    // Validate required fields
    if (!businessType || !['barbershop', 'nail_salon', 'gym_trainer', 'other'].includes(businessType)) {
      return NextResponse.json(
        { error: 'Valid businessType is required (barbershop, nail_salon, gym_trainer, other)' },
        { status: 400 }
      );
    }

    if (!businessInfo?.name || typeof businessInfo.name !== 'string' || businessInfo.name.trim() === '') {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Validate English name for slug (required)
    if (!businessInfo.englishName || typeof businessInfo.englishName !== 'string' || businessInfo.englishName.trim() === '') {
      return NextResponse.json(
        { error: 'English name is required for creating the business URL' },
        { status: 400 }
      );
    }

    // Validate English name contains only English characters
    const englishRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!englishRegex.test(businessInfo.englishName.trim())) {
      return NextResponse.json(
        { error: 'English name must contain only English letters, numbers, spaces, hyphens, and underscores' },
        { status: 400 }
      );
    }

    if (!adminUser?.email || typeof adminUser.email !== 'string') {
      return NextResponse.json(
        { error: 'Admin user email is required' },
        { status: 400 }
      );
    }

    if (!adminUser?.name || typeof adminUser.name !== 'string') {
      return NextResponse.json(
        { error: 'Admin user name is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate unique slug from English name (for URL), fallback to business name if not provided
    const nameForSlug = businessInfo.englishName?.trim() || businessInfo.name.trim();
    const slug = await generateUniqueSlug(nameForSlug);

    // Convert phone to E.164 format if provided
    let e164Phone: string | null = null;
    if (businessInfo.phone) {
      try {
        e164Phone = toE164Format(businessInfo.phone);
        // Validate E.164 format (should start with + and have at least 10 digits)
        if (!e164Phone.startsWith('+') || e164Phone.length < 10) {
          return NextResponse.json(
            { error: 'Invalid phone number format. Please use E.164 format (e.g., +972542636737)' },
            { status: 400 }
          );
        }
      } catch (error: any) {
        console.error('Phone format conversion error:', error);
        return NextResponse.json(
          { error: 'Invalid phone number format. Please use E.164 format (e.g., +972542636737)' },
          { status: 400 }
        );
      }
    }

    // Create business
    const businessData = {
      slug,
      name: businessInfo.name.trim(),
      email: businessInfo.email || null,
      phone: e164Phone,
      whatsapp: e164Phone,
      address: businessInfo.address || null,
      timezone: businessInfo.timezone || getDefaultTimezone(businessType as BusinessType),
      currency: businessInfo.currency || getDefaultCurrency(businessType as BusinessType),
      business_type: businessType as BusinessType,
    };

    const { data: newBusiness, error: businessError } = await supabase
      .from('businesses')
      .insert(businessData as any)
      .select()
      .single();

    if (businessError) {
      if (businessError.code === '23505') {
        return NextResponse.json(
          { error: 'Business with this slug already exists. Please try again.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: businessError.message || 'Failed to create business' },
        { status: 500 }
      );
    }

    const businessId = (newBusiness as any).id;

    // Create services - use custom services if provided, otherwise use defaults
    const servicesToCreate = body.services && Array.isArray(body.services) && body.services.length > 0
      ? body.services
      : getDefaultServices(businessType as BusinessType);
    
    // Validate services
    if (!Array.isArray(servicesToCreate) || servicesToCreate.length === 0) {
      return NextResponse.json(
        { error: 'At least one service is required' },
        { status: 400 }
      );
    }

    const servicesData = servicesToCreate.map((service: any) => ({
      business_id: businessId,
      name: service.name?.trim() || '',
      description: service.description?.trim() || '',
      category: service.category?.trim() || '',
      duration: typeof service.duration === 'number' ? service.duration : 30,
      price: typeof service.price === 'number' ? service.price : 0,
      tax_rate: 0,
      active: true,
    }));

    const { data: createdServices, error: servicesError } = await supabase
      .from('services')
      .insert(servicesData as any)
      .select();

    if (servicesError) {
      // Rollback: delete business if services creation fails
      await supabase.from('businesses').delete().eq('id', businessId);
      return NextResponse.json(
        { error: servicesError.message || 'Failed to create default services' },
        { status: 500 }
      );
    }

    // Create admin user via Supabase Auth
    // Note: We'll create the auth user first, then the user record
    let authUserId: string;

    try {
      // Check if email already exists in auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(u => u.email === adminUser.email);
      
      if (emailExists) {
        // Rollback: delete business and services
        await supabase.from('services').delete().eq('business_id', businessId);
        await supabase.from('businesses').delete().eq('id', businessId);
        return NextResponse.json(
          { error: 'Email address already registered by another user' },
          { status: 409 }
        );
      }

      // Check if phone already exists in users table (if phone is provided)
      if (e164Phone) {
        const { data: existingUserByPhone } = await supabase
          .from('users')
          .select('id, email, phone')
          .eq('phone', e164Phone)
          .maybeSingle();
        
        if (existingUserByPhone) {
          // Phone already registered - check if it's the same email
          if (existingUserByPhone.email === adminUser.email) {
            // Same user trying to register again - allow it but skip phone in auth
            console.log('Phone already registered to same email, continuing without phone in auth');
          } else {
            // Phone belongs to different user - rollback and return error
            await supabase.from('services').delete().eq('business_id', businessId);
            await supabase.from('businesses').delete().eq('id', businessId);
            return NextResponse.json(
              { error: 'Phone number already registered by another user' },
              { status: 409 }
            );
          }
        }
      }

      // Check if phone already exists in auth (if phone is provided)
      // If it exists, we'll create the user without phone in auth, but still store it in users table
      let phoneForAuth: string | undefined = undefined;
      if (e164Phone) {
        const phoneExists = existingUsers?.users?.some(u => u.phone === e164Phone);
        if (!phoneExists) {
          phoneForAuth = e164Phone;
        }
        // If phone exists, phoneForAuth stays undefined - we'll skip adding it to auth
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminUser.email,
        phone: phoneForAuth, // Only include if phone doesn't already exist
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: adminUser.name,
          business_id: businessId,
          role: 'owner',
        },
        app_metadata: {
          business_id: businessId,
          role: 'owner',
        },
      });

      if (authError || !authData.user) {
        // Rollback: delete business and services
        await supabase.from('services').delete().eq('business_id', businessId);
        await supabase.from('businesses').delete().eq('id', businessId);
        console.error('Auth error details:', authError);
        console.error('Attempted email:', adminUser.email);
        console.error('Attempted phone:', e164Phone);
        
        // Handle specific Supabase Auth errors
        const errorMessage = authError?.message?.toLowerCase() || '';
        if (errorMessage.includes('email') || (errorMessage.includes('already exists') && errorMessage.includes('email'))) {
          return NextResponse.json(
            { error: 'Email address already registered by another user' },
            { status: 409 }
          );
        }
        
        if (errorMessage.includes('phone') || (errorMessage.includes('already registered') && errorMessage.includes('phone'))) {
          // Phone conflict - we already checked, but Supabase Auth might still complain
          // Try creating without phone
          const { data: retryAuthData, error: retryAuthError } = await supabase.auth.admin.createUser({
            email: adminUser.email,
            // Skip phone
            email_confirm: true,
            user_metadata: {
              name: adminUser.name,
              business_id: businessId,
              role: 'owner',
            },
            app_metadata: {
              business_id: businessId,
              role: 'owner',
            },
          });
          
          if (retryAuthError || !retryAuthData.user) {
            // Still failed - rollback
            await supabase.from('services').delete().eq('business_id', businessId);
            await supabase.from('businesses').delete().eq('id', businessId);
            return NextResponse.json(
              { error: 'Phone number already registered by another user' },
              { status: 409 }
            );
          }
          
          authUserId = retryAuthData.user.id;
        } else {
          return NextResponse.json(
            { error: authError?.message || 'Failed to create admin user in auth', details: authError },
            { status: 500 }
          );
        }
      } else {
        authUserId = authData.user.id;
      }
    } catch (authError: any) {
      // Rollback: delete business and services
      await supabase.from('services').delete().eq('business_id', businessId);
      await supabase.from('businesses').delete().eq('id', businessId);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create admin user' },
        { status: 500 }
      );
    }

    // Create user record in users table
    // Use e164Phone (from businessInfo.phone) - it's already in E.164 format
    // If e164Phone is null, try to convert adminUser.phone
    let phoneForUser = e164Phone;
    if (!phoneForUser && adminUser.phone) {
      try {
        phoneForUser = toE164Format(adminUser.phone);
      } catch (error) {
        console.error('Failed to convert adminUser.phone to E.164:', error);
        // Continue without phone if conversion fails
      }
    }
    
    const userData = {
      id: authUserId,
      business_id: businessId,
      email: adminUser.email,
      phone: phoneForUser,
      name: adminUser.name.trim(),
      role: 'owner' as const,
      is_main_admin: true, // Mark as main admin - cannot be deleted
    };

    console.log('Creating user in users table:', {
      id: userData.id,
      email: userData.email,
      phone: userData.phone,
      business_id: userData.business_id,
      role: userData.role,
      e164Phone,
      adminUserPhone: adminUser.phone,
    });

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(userData as any)
      .select()
      .single();

    if (userError) {
      console.error('Failed to create user in users table:', {
        userData,
        error: userError,
      });
      // Rollback: delete auth user, services, and business
      await supabase.auth.admin.deleteUser(authUserId);
      await supabase.from('services').delete().eq('business_id', businessId);
      await supabase.from('businesses').delete().eq('id', businessId);
      return NextResponse.json(
        { error: userError.message || 'Failed to create user record' },
        { status: 500 }
      );
    }

    console.log('User created successfully in users table:', {
      userId: newUser?.id,
      email: newUser?.email,
      phone: newUser?.phone,
      businessId: newUser?.business_id,
      role: newUser?.role,
    });

    // Create default settings
    const defaultSettings = {
      business_id: businessId,
      branding: {
        themeColor: '#0EA5E9',
      },
      locale: {
        language: 'en',
        rtl: false,
      },
      notifications: {
        senderName: businessInfo.name,
        senderEmail: businessInfo.email || adminUser.email,
      },
      calendar: {
        weekStartDay: 0,
        workingDays: [0, 1, 2, 3, 4, 5, 6], // All days
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
        timeSlotGap: 30,
      },
      registration: {
        customFields: [],
      },
    };

    const { error: settingsError } = await supabase
      .from('settings')
      .insert(defaultSettings as any);

    if (settingsError) {
      // Settings creation failure is not critical, but log it
      console.error('Failed to create default settings:', settingsError);
      // Don't rollback everything for settings failure
    }

    // Create first worker (admin user as worker)
    const workerData = {
      business_id: businessId,
      name: adminUser.name.trim(),
      email: adminUser.email,
      phone: e164Phone,
      active: true,
      color: '#3B82F6', // Default blue color
    };

    const { data: newWorker, error: workerError } = await supabase
      .from('workers')
      .insert(workerData as any)
      .select()
      .single();

    if (workerError) {
      // Worker creation failure is not critical, but log it
      console.error('Failed to create default worker:', workerError);
      // Don't rollback everything for worker failure
    } else if (newWorker && createdServices && createdServices.length > 0) {
      // Link worker to all services
      const workerServiceLinks = createdServices.map((service: any) => ({
        worker_id: (newWorker as any).id,
        service_id: service.id,
      }));

      const { error: linkError } = await supabase
        .from('worker_services')
        .insert(workerServiceLinks as any);

      if (linkError) {
        console.error('Failed to link worker to services:', linkError);
        // Not critical, continue
      }
    }

    // Return created data
    return NextResponse.json(
      {
        success: true,
        business: newBusiness,
        slug: slug,
        adminUser: {
          id: (newUser as any).id,
          email: (newUser as any).email,
          name: (newUser as any).name,
          phone: (newUser as any).phone,
          role: (newUser as any).role,
          businessId: businessId,
        },
        services: createdServices || [],
        message: 'Business onboarding completed successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in onboarding:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify({ businessType, businessInfo, adminUser, services: body.services?.length }, null, 2));
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding', details: error.stack },
      { status: 500 }
    );
  }
}

