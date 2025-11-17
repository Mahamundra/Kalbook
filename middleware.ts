import { createClient } from '@/lib/supabase/middleware';
import { extractBusinessSlug, BUSINESS_SLUG_COOKIE, TENANT_CONTEXT_HEADER } from '@/lib/tenant';
import { getBusinessBySlug } from '@/lib/business';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request);

    // Refresh session if expired - required for Server Components
    await supabase.auth.getUser();

  const url = request.nextUrl;
  const pathname = url.pathname;
  const hostname = request.headers.get('host') || '';

  // Skip tenant resolution for API routes that don't need it
  const isApiRoute = pathname.startsWith('/api');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isOldAdminRoute = pathname.startsWith('/admin') && !pathname.startsWith('/b/');
  const isSlugAdminRoute = pathname.match(/^\/b\/[^/]+\/admin/);
  const isMigrationRoute = pathname.startsWith('/migration');
  const isUserDashboardRoute = pathname.startsWith('/user/dashboard');
  
  // Redirect old login page to homepage
  if (pathname.match(/^\/b\/[^/]+\/admin\/login$/)) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Handle user dashboard route
  if (isUserDashboardRoute) {
    // Check for admin_session cookie
    const adminSessionCookie = request.cookies.get('admin_session')?.value;
    if (!adminSessionCookie) {
      // Not authenticated - redirect to homepage
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    try {
      const adminSession = JSON.parse(adminSessionCookie);
      // Allow access to user dashboard
      return response;
    } catch (error) {
      // Invalid session - redirect to homepage
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  // For API routes, try to get business context from cookie or Referer header
  if (isApiRoute) {
    // Try to get business slug from cookie first
    const businessSlugCookie = request.cookies.get(BUSINESS_SLUG_COOKIE)?.value;
    
    if (businessSlugCookie) {
      try {
        const business = await getBusinessBySlug(businessSlugCookie);
        if (business) {
          response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
            businessId: business.id,
            businessSlug: business.slug,
          }));
          return response;
        }
      } catch (error) {
      }
    }
    
    // Try to extract from Referer header (which page made the API call)
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererPath = refererUrl.pathname;
        const slugMatch = refererPath.match(/^\/b\/([^/]+)/);
        if (slugMatch) {
          const businessSlug = slugMatch[1];
          const business = await getBusinessBySlug(businessSlug);
          if (business) {
            response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
              businessId: business.id,
              businessSlug: business.slug,
            }));
            // Update cookie to match
            response.cookies.set(BUSINESS_SLUG_COOKIE, business.slug, {
              path: '/',
              maxAge: 60 * 60 * 24 * 365,
              sameSite: 'lax',
            });
            return response;
          }
        }
      } catch (error) {
      }
    }
  }

  // Handle slug-based admin routes FIRST (before general business validation)
  if (isSlugAdminRoute) {
    const slugMatch = pathname.match(/^\/b\/([^/]+)\/admin/);
    const businessSlug = slugMatch?.[1];

    if (businessSlug) {
      try {
        // Validate business exists
        const business = await getBusinessBySlug(businessSlug);

        if (!business) {
          return NextResponse.redirect(new URL('/404', request.url));
        }

        // Check if user is authenticated (Supabase Auth or admin_session cookie)
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Also check for admin_session cookie (for OTP-based login)
        let adminSessionUser: { userId: string; businessId: string; email: string; phone: string; name: string; role: string } | null = null;
        if (!user) {
          const adminSessionCookie = request.cookies.get('admin_session')?.value;
          if (adminSessionCookie) {
            try {
              adminSessionUser = JSON.parse(adminSessionCookie);
              // Verify the session user has access to this business
              if (adminSessionUser && adminSessionUser.businessId !== business.id) {
                adminSessionUser = null; // Business mismatch, invalidate session
              }
            } catch (error) {
              adminSessionUser = null;
            }
          }
        }

        // Skip auth check for login page itself
        const isLoginPage = pathname === `/b/${businessSlug}/admin/login` || pathname === `/b/${businessSlug}/login`;
        
        if (!user && !adminSessionUser && !isLoginPage) {
          // Not authenticated - redirect to login
          const returnUrl = encodeURIComponent(pathname);
          return NextResponse.redirect(new URL(`/b/${businessSlug}/admin/login?return=${returnUrl}`, request.url));
        }

        // For login page, just attach business context and allow access
        if (isLoginPage) {
          response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
            businessId: business.id,
            businessSlug: business.slug,
          }));
          
          response.cookies.set(BUSINESS_SLUG_COOKIE, business.slug, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax',
          });
          
          return response;
        }

        // Verify user has access to this business
        // If using admin_session cookie, we already verified business_id matches
        if (user) {
          const userDataResult = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single() as { data: { business_id: string } | null; error: any };
          const { data: userData, error: userError } = userDataResult;

          if (userError || !userData) {
            // In development, allow access even if user record doesn't exist
            const isDevelopment = process.env.NODE_ENV === 'development';
            if (isDevelopment) {
              // Attach business context anyway
              response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
                businessId: business.id,
                businessSlug: business.slug,
              }));
              
              response.cookies.set(BUSINESS_SLUG_COOKIE, business.slug, {
                path: '/',
                maxAge: 60 * 60 * 24 * 365,
                sameSite: 'lax',
              });
              
              return response;
            }
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }

          const userBusinessId = (userData as { business_id: string })?.business_id;

          // Verify user's business matches the slug's business
          if (userBusinessId !== business.id) {
            // In development, allow access even if business doesn't match
            const isDevelopment = process.env.NODE_ENV === 'development';
            if (isDevelopment) {
              // Attach business context from slug (not user's business)
              response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
                businessId: business.id,
                businessSlug: business.slug,
              }));
              
              response.cookies.set(BUSINESS_SLUG_COOKIE, business.slug, {
                path: '/',
                maxAge: 60 * 60 * 24 * 365,
                sameSite: 'lax',
              });
              
              return response;
            }
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }
        }
        // If using admin_session cookie, business_id was already verified above

        // Attach business context for admin routes
        response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
          businessId: business.id,
          businessSlug: business.slug,
        }));

        // Set cookie for client-side access
        response.cookies.set(BUSINESS_SLUG_COOKIE, business.slug, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
          sameSite: 'lax',
        });

        return response;
      } catch (error) {
        return NextResponse.redirect(new URL('/404', request.url));
      }
    }
  }

  // For booking routes (not admin), extract and validate business
  if (!isOldAdminRoute && !isApiRoute && !isOnboardingRoute && !isMigrationRoute && !isSlugAdminRoute) {
    const businessSlug = extractBusinessSlug(url, hostname);

    if (businessSlug) {
      try {
        // Validate business exists
        const business = await getBusinessBySlug(businessSlug);

        if (!business) {
          // Business not found - redirect to 404 or error page
          return NextResponse.redirect(new URL('/404', request.url));
        }

        // Attach business context to request
        // Store in header for server components
        response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
          businessId: business.id,
          businessSlug: business.slug,
        }));

        // Set cookie for client-side access
        response.cookies.set(BUSINESS_SLUG_COOKIE, business.slug, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
          sameSite: 'lax',
        });

        // If on /booking without slug in path, redirect to /b/[slug]
        if (pathname === '/booking' && !url.searchParams.get('business')) {
          return NextResponse.redirect(new URL(`/b/${businessSlug}`, request.url));
        }
      } catch (error) {
        return NextResponse.redirect(new URL('/404', request.url));
      }
    } else if (pathname === '/booking') {
      // /booking without business parameter
      // In development, allow access (for testing)
      // In production, redirect to onboarding
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // In development, try to get business from cookie or allow access
        const businessSlugFromCookie = request.cookies.get(BUSINESS_SLUG_COOKIE)?.value;
        
        if (businessSlugFromCookie) {
          // Redirect to slug-based route
          return NextResponse.redirect(new URL(`/b/${businessSlugFromCookie}`, request.url));
        }
        
        // Allow access without business in development (for testing)
        // You can manually set a test business in your database
        return response;
      } else {
        // In production, redirect to onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    }
  }


  // For old admin routes (/admin/*), validate user has access to business from session
  if (isOldAdminRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not authenticated - redirect to login (you'll create this later)
      // For now, allow access but individual pages should handle auth
      return response;
    }

    // Get user's business_id from users table
    const userDataResult = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single() as { data: { business_id: string } | null; error: any };
    const { data: userData, error: userError } = userDataResult;

    if (userError || !userData) {
      return response;
    }

    // Type assertion: business_id is always a string in the users table
    const businessId = (userData as { business_id: string })?.business_id;
    if (businessId) {
      // Attach business context for admin routes
      response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
        businessId,
        businessSlug: null, // Admin routes use business_id from session
      }));
    }
  }

  return response;
  } catch (error) {
    // Return a basic response to prevent 500 errors
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

