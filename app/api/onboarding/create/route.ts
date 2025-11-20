import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateUniqueSlugFromBusinessType, getDefaultServices, getDefaultTimezone, getDefaultCurrency, getDefaultThemeColor } from '@/lib/onboarding/utils';
import { uploadDefaultBannerImage } from '@/lib/storage/upload-server';
import { toE164Format } from '@/lib/customers/utils';
import type { BusinessType } from '@/lib/supabase/database.types';
import type { Database } from '@/lib/supabase/database.types';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type BusinessRow = Database['public']['Tables']['businesses']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type WorkerRow = Database['public']['Tables']['workers']['Row'];

/**
 * POST /api/onboarding/create
 * Create a new business with default services, settings, and admin user
 */
/**
 * Get admin session from cookie
 */
function getAdminSession(request: NextRequest): { userId: string; businessId: string; email: string; phone: string; name: string; role: string } | null {
  const adminSessionCookie = request.cookies.get('admin_session')?.value;
  if (!adminSessionCookie) {
    return null;
  }

  try {
    return JSON.parse(adminSessionCookie);
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();
    const { businessType, businessInfo, adminUser, ownerName, useAnotherAccount, plan } = body;
    
    // Check if user is logged in
    const session = getAdminSession(request);
    const isLoggedIn = !!session;

    // Validate required fields
    const validBusinessTypes = ['barbershop', 'nail_salon', 'gym_trainer', 'beauty_salon', 'makeup_artist', 'spa', 'pilates_studio', 'physiotherapy', 'life_coach', 'dietitian', 'other'];
    if (!businessType || !validBusinessTypes.includes(businessType)) {
      return NextResponse.json(
        { error: `Valid businessType is required. Allowed types: ${validBusinessTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!businessInfo?.name || typeof businessInfo.name !== 'string' || businessInfo.name.trim() === '') {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Note: English name validation removed - slug is now generated from business type

    // Email is optional - use if provided, otherwise null
    const adminEmail = adminUser?.email && typeof adminUser.email === 'string' && adminUser.email.trim() 
      ? adminUser.email.trim() 
      : null;

    // Name - use business name (required by database)
    const finalOwnerName = businessInfo.name && typeof businessInfo.name === 'string'
      ? businessInfo.name.trim()
      : 'Business Owner';

    const supabase = createAdminClient();

    // Generate unique slug from business type + random 4 digits
    const slug = await generateUniqueSlugFromBusinessType(businessType as BusinessType);

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
        return NextResponse.json(
          { error: 'Invalid phone number format. Please use E.164 format (e.g., +972542636737)' },
          { status: 400 }
        );
      }
    }

    // Validate and get selected plan (default to 'basic' if not provided or invalid)
    const validPlans = ['basic', 'professional', 'business'];
    const selectedPlanName = (plan && typeof plan === 'string' && validPlans.includes(plan.toLowerCase()))
      ? plan.toLowerCase()
      : 'basic';
    
    const planResult = await supabase
      .from('plans')
      .select('id')
      .eq('name', selectedPlanName)
      .eq('active', true)
      .single() as { data: { id: string } | null; error: any };
    
    let selectedPlan = planResult.data;
    
    if (!selectedPlan) {
      // Fallback to basic plan if selected plan not found
      const fallbackResult = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'basic')
        .eq('active', true)
        .single() as { data: { id: string } | null; error: any };
      
      const fallbackPlan = fallbackResult.data;
      if (!fallbackPlan) {
        return NextResponse.json(
          { error: 'Plan not found. Please contact support.' },
          { status: 500 }
        );
      }
      
      selectedPlan = fallbackPlan;
    }

    // Calculate trial dates (14 days from now)
    const trialStartedAt = new Date();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

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
      plan_id: selectedPlan.id,
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      subscription_status: 'trial' as const,
      previous_calendar_type: businessInfo.previousCalendarType || null,
    };

    const businessResult = await supabase
      .from('businesses')
      .insert(businessData as any)
      .select()
      .single() as { data: BusinessRow | null; error: any };
    const { data: newBusiness, error: businessError } = businessResult;

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
    let authUserId: string | undefined;
    let shouldReuseAccount = false;

    try {
        // Check if user is logged in and using same account
        if (isLoggedIn && session && e164Phone && !useAnotherAccount) {
          // Check if phone and email match logged-in user's info
          const sessionPhone = session.phone;
          const sessionEmail = session.email;
          if (sessionPhone && toE164Format(sessionPhone) === e164Phone) {
            // If email is provided, check it matches; otherwise just match phone
            if (!adminEmail || sessionEmail === adminEmail) {
              // Same phone (and email if provided) as logged-in user - reuse existing auth user
              // This allows the business to appear in user dashboard
              shouldReuseAccount = true;
              if (session.userId) {
                authUserId = session.userId;
              }
            }
          }
        }

      // If shouldReuseAccount is true but we don't have authUserId, find it by phone
      if (shouldReuseAccount && !authUserId && e164Phone) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        if (existingUsers?.users) {
          const existingAuthUserByPhone = existingUsers.users.find((u: any) => u.phone === e164Phone);
          if (existingAuthUserByPhone) {
            authUserId = existingAuthUserByPhone.id;
          } else {
            // Phone matches session but not found in auth - this shouldn't happen, but handle it
            // Reset shouldReuseAccount so we can create a new user
            // The phone will be used to create the new user
            shouldReuseAccount = false;
          }
        } else {
          // Can't list users - reset shouldReuseAccount
          // The phone will be used to create the new user
          shouldReuseAccount = false;
        }
      }
      
      // If we still don't have authUserId after all checks, we need to create a new user
      // This handles the case where shouldReuseAccount was reset to false

      // Only create new auth user if not reusing existing account and we don't have authUserId yet
      if (!shouldReuseAccount && !authUserId) {
        // Check if email already exists in auth (only if email is provided)
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        if (adminEmail) {
          const emailExists = existingUsers?.users?.some(u => u.email === adminEmail);
          
          if (emailExists) {
            // Rollback: delete business and services
            await supabase.from('services').delete().eq('business_id', businessId);
            await supabase.from('businesses').delete().eq('id', businessId);
            return NextResponse.json(
              { error: 'Email address already registered by another user' },
              { status: 409 }
            );
          }
        }
      
        // Check if phone already exists in users table (if phone is provided)
        if (e164Phone) {
          const existingUserByPhoneResult = await supabase
            .from('users')
            .select('id, email, phone')
            .eq('phone', e164Phone)
            .maybeSingle() as { data: UserRow | null; error: any };
          const { data: existingUserByPhone } = existingUserByPhoneResult;
          
          if (existingUserByPhone) {
            // Phone already registered - check if it's the same email (if email provided)
            if (adminEmail && existingUserByPhone.email === adminEmail) {
              // Same user trying to register again - allow it but skip phone in auth
            } else if (adminEmail && existingUserByPhone.email !== adminEmail) {
              // Phone belongs to different user - rollback and return error
              await supabase.from('services').delete().eq('business_id', businessId);
              await supabase.from('businesses').delete().eq('id', businessId);
              return NextResponse.json(
                { error: 'Phone number already registered by another user' },
                { status: 409 }
              );
            }
            // If no email provided, allow phone-only registration
          }
        }

        // Check if phone already exists in auth (if phone is provided)
        // If it exists and we don't have email, try to reuse that account
        let phoneForAuth: string | undefined = undefined;
        let existingAuthUserByPhone: any = null;
        if (e164Phone && existingUsers?.users) {
          existingAuthUserByPhone = existingUsers.users.find((u: any) => u.phone === e164Phone);
          if (!existingAuthUserByPhone) {
            phoneForAuth = e164Phone;
          }
          // If phone exists, phoneForAuth stays undefined - we'll reuse that account
        } else if (e164Phone) {
          // No existing users list, but we have phone - use it for auth
          phoneForAuth = e164Phone;
        }

        // If phone exists in auth, reuse that auth user (regardless of email)
        if (existingAuthUserByPhone) {
          shouldReuseAccount = true;
          authUserId = existingAuthUserByPhone.id;
        } else if (!adminEmail && !phoneForAuth) {
          // No email and phone doesn't exist in auth - can't create user
          // Rollback: delete business and services
          await supabase.from('services').delete().eq('business_id', businessId);
          await supabase.from('businesses').delete().eq('id', businessId);
          return NextResponse.json(
            { error: 'Either email or phone number is required' },
            { status: 400 }
          );
        }

        // Only create new auth user if we haven't found an existing one to reuse
        if (!authUserId) {
          // Supabase Auth requires either email or phone
          // Ensure we have at least one
          if (!adminEmail && !phoneForAuth) {
            // Rollback: delete business and services
            await supabase.from('services').delete().eq('business_id', businessId);
            await supabase.from('businesses').delete().eq('id', businessId);
            return NextResponse.json(
              { 
                error: 'Either email or phone number is required to create account',
                details: {
                  hasEmail: !!adminEmail,
                  hasPhone: !!e164Phone,
                  phoneForAuth: phoneForAuth || null,
                  e164Phone: e164Phone || null
                }
              },
              { status: 400 }
            );
          }

          // If we have phone but it's not set for auth, use e164Phone directly
          if (!phoneForAuth && e164Phone) {
            phoneForAuth = e164Phone;
          }

          // Prepare user creation data
          const createUserData: any = {
            user_metadata: {
              name: finalOwnerName,
              business_id: businessId,
              role: 'owner',
            },
            app_metadata: {
              business_id: businessId,
              role: 'owner',
            },
          };

          // Add email if provided
          if (adminEmail) {
            createUserData.email = adminEmail;
            createUserData.email_confirm = true;
          }

          // Add phone if provided
          if (phoneForAuth) {
            createUserData.phone = phoneForAuth;
            createUserData.phone_confirm = true;
          }

          const { data: authData, error: authError } = await supabase.auth.admin.createUser(createUserData);

          if (authError) {
            // Rollback: delete business and services
            await supabase.from('services').delete().eq('business_id', businessId);
            await supabase.from('businesses').delete().eq('id', businessId);
            
            // Handle specific Supabase Auth errors
            const errorMessage = authError?.message?.toLowerCase() || '';
            if (errorMessage.includes('email') || (errorMessage.includes('already exists') && errorMessage.includes('email'))) {
              return NextResponse.json(
                { error: 'Email address already registered by another user' },
                { status: 409 }
              );
            }
            
            if (errorMessage.includes('phone') || (errorMessage.includes('already registered') && errorMessage.includes('phone'))) {
              return NextResponse.json(
                { error: 'Phone number already registered by another user' },
                { status: 409 }
              );
            }
            
            return NextResponse.json(
              { 
                error: authError?.message || 'Failed to create admin user in auth', 
                details: {
                  authError,
                  createUserData: { ...createUserData, phone: createUserData.phone ? '[REDACTED]' : undefined },
                  hasEmail: !!adminEmail,
                  hasPhone: !!phoneForAuth
                }
              },
              { status: 500 }
            );
          }

          if (!authData?.user?.id) {
            // Rollback: delete business and services
            await supabase.from('services').delete().eq('business_id', businessId);
            await supabase.from('businesses').delete().eq('id', businessId);
            return NextResponse.json(
              { 
                error: 'Failed to create admin user: no user ID returned', 
                details: {
                  authData,
                  createUserData: { ...createUserData, phone: createUserData.phone ? '[REDACTED]' : undefined },
                  hasEmail: !!adminEmail,
                  hasPhone: !!phoneForAuth
                }
              },
              { status: 500 }
            );
          }
          
          authUserId = authData.user.id;
        }
      }
    } catch (authError: any) {
      // Rollback: delete business and services
      await supabase.from('services').delete().eq('business_id', businessId);
      await supabase.from('businesses').delete().eq('id', businessId);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create admin user', details: authError },
        { status: 500 }
      );
    }

    // Verify authUserId was set
    if (!authUserId) {
      // Rollback: delete business and services
      await supabase.from('services').delete().eq('business_id', businessId);
      await supabase.from('businesses').delete().eq('id', businessId);
      
      // If we were trying to reuse account but couldn't find the user, provide more context
      let errorMessage = 'Failed to create or retrieve user ID. Please ensure you have either an email or phone number.';
      if (shouldReuseAccount) {
        errorMessage = 'Failed to find existing user account. The phone number may not be registered in the authentication system.';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: {
            hasEmail: !!adminEmail,
            hasPhone: !!e164Phone,
            isLoggedIn,
            shouldReuseAccount,
            sessionUserId: session?.userId || null,
            adminEmail: adminEmail || null,
            e164Phone: e164Phone || null
          }
        },
        { status: 500 }
      );
    }

    // Create user record in users table
    // Use e164Phone (from businessInfo.phone) - it's already in E.164 format
    // If e164Phone is null, try to convert adminUser.phone
    let phoneForUser = e164Phone;
    if (!phoneForUser && adminUser?.phone) {
      try {
        phoneForUser = toE164Format(adminUser.phone);
      } catch (error) {
        // Continue without phone if conversion fails
      }
    }
    
    const userIdForRecord = shouldReuseAccount 
      ? crypto.randomUUID() // Generate new UUID for new business
      : authUserId; // Use auth user ID for new account
    
    const userData = {
      id: userIdForRecord,
      business_id: businessId,
      email: adminEmail || null,
      phone: phoneForUser,
      name: finalOwnerName,
      role: 'owner' as const,
      is_main_admin: true, // Mark as main admin - cannot be deleted
    };

    const userResult = await supabase
      .from('users')
      .insert(userData as any)
      .select()
      .single() as { data: UserRow | null; error: any };
    const { data: newUser, error: userError } = userResult;

    if (userError) {
      // Rollback: delete auth user (only if we created it), services, and business
      if (!shouldReuseAccount) {
        await supabase.auth.admin.deleteUser(authUserId);
      }
      await supabase.from('services').delete().eq('business_id', businessId);
      await supabase.from('businesses').delete().eq('id', businessId);
      return NextResponse.json(
        { error: userError.message || 'Failed to create user record' },
        { status: 500 }
      );
    }

    // Upload default banner image to Supabase Storage
    let bannerCoverUrl: string | null = null;
    const bannerUploadResult = await uploadDefaultBannerImage(businessId, businessType as BusinessType);
    if (bannerUploadResult.url) {
      bannerCoverUrl = bannerUploadResult.url;
    }

    // Get default theme color for business type
    const defaultThemeColor = getDefaultThemeColor(businessType as BusinessType);

    // Create default settings
    const defaultSettings = {
      business_id: businessId,
      branding: {
        themeColor: defaultThemeColor,
        ...(bannerCoverUrl ? {
          bannerCover: {
            type: 'upload' as const,
            uploadUrl: bannerCoverUrl,
            position: { x: 50, y: 50 },
          },
        } : {}),
      },
      locale: {
        language: 'en',
        rtl: false,
      },
      notifications: {
        senderName: businessInfo.name,
        senderEmail: businessInfo.email || adminEmail || null,
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
      // Settings creation failure is not critical
      // Don't rollback everything for settings failure
    }

    // Create first worker (admin user as worker)
    const workerData = {
      business_id: businessId,
      name: adminUser.name?.trim() || finalOwnerName,
      email: adminEmail || null,
      phone: e164Phone,
      active: true,
      color: '#3B82F6', // Default blue color
    };

    const workerResult = await supabase
      .from('workers')
      .insert(workerData as any)
      .select()
      .single() as { data: WorkerRow | null; error: any };
    const { data: newWorker, error: workerError } = workerResult;

    if (workerError) {
      // Worker creation failure is not critical
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
        // Not critical, continue
      }
    }

    // Create response with created data
    const response = NextResponse.json(
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

    // Set admin session cookie for middleware to check
    // This allows the user to access /user/dashboard after onboarding
    const sessionData = JSON.stringify({
      type: 'business_owner',
      userId: (newUser as any).id,
      businessId: businessId,
      email: (newUser as any).email,
      phone: (newUser as any).phone || null,
      name: (newUser as any).name,
      role: (newUser as any).role || 'owner',
    });

    response.cookies.set('admin_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding', details: error.stack },
      { status: 500 }
    );
  }
}

