/**
 * Booking page with slug-based routing: /b/[slug]
 * 
 * Usage: /b/your-business-slug
 * Example: /b/demo-barbershop
 * 
 * The middleware extracts the slug, validates the business exists,
 * and attaches business context to the request headers.
 */

import BookingPage from '@/app/booking/page';

export default function SlugBookingPage({
  params,
}: {
  params: { slug: string };
}) {
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

