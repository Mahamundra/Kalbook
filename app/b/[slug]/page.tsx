/**
 * Booking page with slug-based routing: /b/[slug]
 * 
 * Usage: /b/your-business-slug
 * Example: /b/demo-barbershop
 * 
 * The middleware extracts the slug, validates the business exists,
 * and attaches business context to the request headers.
 */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import BookingPage from '@/app/booking/page';
import { validateWorkerInvite } from '@/lib/workers/invites';
import { getBusinessBySlug, isPortfolioBusiness } from '@/lib/business';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapSettingsToInterface } from '@/lib/settings/utils';

/**
 * Generate metadata for WhatsApp link previews
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    // Get business data
    const business = await getBusinessBySlug(params.slug);
    
    if (!business) {
      return {
        title: 'Booking Page',
      };
    }

    // Get settings to fetch logo URL
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle();

    // Map settings to get branding info
    const mappedSettings = mapSettingsToInterface(business, settings);
    const logoUrl = mappedSettings.branding?.logoUrl;
    const businessName = business.name;
    const businessDescription = mappedSettings.businessProfile?.description;

    // Get absolute URL for the page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const pageUrl = `${baseUrl}/b/${params.slug}`;

    // Ensure logo URL is absolute
    let absoluteLogoUrl: string | undefined;
    if (logoUrl) {
      // If logo URL is already absolute (starts with http:// or https://), use it as is
      if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
        absoluteLogoUrl = logoUrl;
      } else {
        // If relative, make it absolute (assuming it's from Supabase Storage)
        // Supabase Storage URLs are already absolute, but handle relative paths just in case
        absoluteLogoUrl = logoUrl.startsWith('/') 
          ? `${baseUrl}${logoUrl}` 
          : logoUrl;
      }
    }

    return {
      title: `${businessName} - Book Now`,
      description: businessDescription || `Book an appointment with ${businessName}`,
      openGraph: {
        title: businessName,
        description: businessDescription || `Book an appointment with ${businessName}`,
        url: pageUrl,
        siteName: 'KalBook',
        images: absoluteLogoUrl ? [
          {
            url: absoluteLogoUrl,
            width: 1200,
            height: 630,
            alt: `${businessName} Logo`,
          },
        ] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: businessName,
        description: businessDescription || `Book an appointment with ${businessName}`,
        images: absoluteLogoUrl ? [absoluteLogoUrl] : [],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Booking Page',
    };
  }
}

export default async function SlugBookingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { invite?: string };
}) {
  // Check for invite parameter
  if (searchParams.invite) {
    // Validate the invite token
    const inviteData = await validateWorkerInvite(searchParams.invite, params.slug);
    
    if (inviteData) {
      // Valid invite - redirect to setup page
      redirect(`/b/${params.slug}/worker/setup?invite=${searchParams.invite}`);
    } else {
      // Invalid or expired invite - redirect to booking page with error
      redirect(`/b/${params.slug}?invite_error=invalid`);
    }
  }

  // The middleware has already:
  // 1. Extracted the slug from the URL path (/b/[slug]) - available as params.slug
  // 2. Validated the business exists in the database
  // 3. Attached business context to headers (businessId, businessSlug)
  // 4. Set business slug in cookie for client-side access
  // 
  // Check if business is in portfolio mode
  const business = await getBusinessBySlug(params.slug);
  const isPortfolio = business ? await isPortfolioBusiness(business.id) : false;
  
  // Pass portfolio flag to booking page
  return <BookingPage isPortfolio={isPortfolio} />;
}

