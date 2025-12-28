"use client";

import { LayoutProps } from './types';

export function ClassicLayout({
  header,
  trialBanner,
  bannerCover,
  businessInfo,
  guestMessage,
  customerAppointments,
  bookingSection,
  mainContent,
  rescheduleDialog,
  loginDialog,
  dir,
}: LayoutProps) {
  // Use mainContent if provided, otherwise combine customerAppointments and bookingSection
  const content = mainContent ?? (
    <>
      {customerAppointments}
      {bookingSection}
    </>
  );

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white" data-booking-page="true">
      {/* Header */}
      {header}

      {/* Trial Expired Banner */}
      {trialBanner}

      {/* Main Content - Centered */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Cover with Business Info positioned below on mobile */}
        <div className="relative">
          {bannerCover}
          
          {/* White background for mobile - appears behind business info under the video */}
          {businessInfo && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-64 md:hidden bg-white -mx-4 sm:-mx-6 rounded-t-3xl shadow-lg" 
              style={{ zIndex: 1 }} 
            />
          )}
          
          {/* Business Information Section - Positioned in blank space below video on mobile */}
          {businessInfo && (
            <div className="absolute bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto md:mt-6" style={{ zIndex: 2 }}>
              {businessInfo}
            </div>
          )}
        </div>

        {/* Guest Message */}
        {guestMessage}

        {/* Main Content (Appointments, Booking Section) */}
        {content}
      </main>

      {/* Dialogs */}
      {rescheduleDialog}
      {loginDialog}
    </div>
  );
}
