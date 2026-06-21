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
  footer,
  loginFirst = false,
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
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-background dark:to-background flex flex-col" data-booking-page="true">
      {/* Header */}
      {header}

      {/* Trial Expired Banner */}
      {trialBanner}

      {/* Main Content - Centered */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Banner Cover - Centered */}
        {bannerCover && (
          <div className="relative w-full mb-6 overflow-hidden">
            {bannerCover}
          </div>
        )}

        {/* Conditional rendering based on loginFirst - swap guestMessage with businessInfo */}
        {loginFirst ? (
          <>
            {/* Guest Message First */}
            {guestMessage}
            {/* Business Information Section */}
            {businessInfo && (
              <div className="mt-6">
                {businessInfo}
              </div>
            )}
            {/* Main Content (Appointments, Booking Section) */}
            {content}
          </>
        ) : (
          <>
            {/* Business Information Section First */}
            {businessInfo && (
              <div className="mt-6">
                {businessInfo}
              </div>
            )}
            {/* Guest Message After */}
            {guestMessage}
            {/* Main Content (Appointments, Booking Section) */}
            {content}
          </>
        )}
      </main>

      {/* Footer - Always at bottom */}
      {footer && (
        <footer className="mt-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {footer}
          </div>
        </footer>
      )}

      {/* Dialogs */}
      {rescheduleDialog}
      {loginDialog}
    </div>
  );
}
