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
import BookingPage from '@/app/booking/page';
import { validateWorkerInvite } from '@/lib/workers/invites';

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
  // Just render the booking page - it will use the business context
  // The slug is available if needed: params.slug
  return <BookingPage />;
}

