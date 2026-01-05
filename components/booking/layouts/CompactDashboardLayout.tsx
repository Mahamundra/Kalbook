"use client";

import { LayoutProps } from './types';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useDirection } from '@/components/providers/DirectionProvider';
import { cn } from '@/lib/utils';

export function CompactDashboardLayout({
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
  businessName,
  businessDescription,
  logoUrl,
  logoShape = 'square',
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
  const { dir: direction } = useDirection();
  const isRTL = direction === 'rtl';

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-x-hidden flex flex-col" data-booking-page="true">
      {/* Trial Expired Banner */}
      {trialBanner}

      {/* Hero Banner Section - Full Width (like hero layout) */}
      <div className="relative w-full min-h-[50vh] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden">
        {/* Banner Background */}
        {bannerCover ? (
          <div className="absolute inset-0 [&>div]:!mb-0 [&>div]:!-mx-0 [&>div]:!-mt-0 [&>div]:!mb-0 [&>div]:!rounded-none [&>div]:!relative [&>div]:!h-full [&>div]:!w-full [&>div>div]:!h-full [&>div>div]:!w-full [&>div>div]:!min-h-[50vh] sm:[&>div>div]:!min-h-[400px] md:[&>div>div]:!min-h-[500px] lg:[&>div>div]:!min-h-[600px] [&>div>div]:!rounded-none [&>div>div]:!h-[50vh] sm:[&>div>div]:!h-[400px] md:[&>div>div]:!h-[500px] lg:[&>div>div]:!h-[600px] [&>div>div>video]:!h-full [&>div>div>img]:!h-full [&>div>div>div]:!h-full">
            {bannerCover}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}

        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Language Toggle - Positioned in top corner */}
        <div className={cn(
          "absolute top-4 z-20 safe-area-top",
          isRTL ? "left-4" : "right-4"
        )}>
          <LanguageToggle />
        </div>

        {/* Banner Content - Logo, Name, Description (like hero layout) */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 sm:pt-16 sm:pb-16 md:py-20 lg:py-24">
          <div className="max-w-4xl mx-auto">
            {/* Business Name and Logo */}
            <div className="flex flex-col items-center text-center mb-8">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className={cn(
                    "h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 object-contain mb-3 sm:mb-4 md:mb-5 lg:mb-6 drop-shadow-lg",
                    logoShape === 'circle' ? 'rounded-[100%]' : 'rounded-[25%]'
                  )}
                  data-edit-id="logo"
                  data-edit-type="image"
                />
              ) : (
                <div
                  className={cn(
                    "h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 flex items-center justify-center mb-3 sm:mb-4 md:mb-5 lg:mb-6 shadow-lg bg-white/90",
                    logoShape === 'circle' ? 'rounded-[100%]' : 'rounded-[25%]'
                  )}
                  data-edit-id="logo"
                  data-edit-type="image"
                >
                  <CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-primary" />
                </div>
              )}
              {businessName && (
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white drop-shadow-lg mb-2 sm:mb-3 md:mb-4 px-2"
                  data-edit-id="business-name"
                  data-edit-type="text"
                >
                  {businessName}
                </h1>
              )}
              {businessDescription ? (
                <p
                  className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white/90 drop-shadow-md max-w-2xl px-4"
                  data-edit-id="business-description"
                  data-edit-type="text"
                  dangerouslySetInnerHTML={{ __html: businessDescription }}
                />
              ) : (
                <p
                  className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white/90 drop-shadow-md max-w-2xl opacity-0 px-4"
                  data-edit-id="business-description"
                  data-edit-type="text"
                  style={{ minHeight: '1.5rem' }}
                >
                  {' '}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Everything Below Banner */}
      <main className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 safe-area-bottom">
          {/* Conditional rendering based on loginFirst */}
          {loginFirst ? (
            <>
              {/* Login Component First */}
              {guestMessage && (
                <div className="mb-4 sm:mb-6">
                  {guestMessage}
                </div>
              )}
              {/* Business Info - Open Times, Address, Contact */}
              {businessInfo && (
                <Card className="mb-4 sm:mb-6 p-4 sm:p-5 md:p-6 bg-white shadow-sm border-gray-200 rounded-lg">
                  <div className="[&_.bg-card]:!bg-transparent [&_.bg-card]:!shadow-none [&_.bg-card]:!border-0">
                    {businessInfo}
                  </div>
                </Card>
              )}
              {/* Main Content (Appointments, Booking Section) */}
              <div className="space-y-4 sm:space-y-6">
                {content}
              </div>
            </>
          ) : (
            <>
              {/* Business Info - Open Times, Address, Contact First */}
              {businessInfo && (
                <Card className="mb-4 sm:mb-6 p-4 sm:p-5 md:p-6 bg-white shadow-sm border-gray-200 rounded-lg">
                  <div className="[&_.bg-card]:!bg-transparent [&_.bg-card]:!shadow-none [&_.bg-card]:!border-0">
                    {businessInfo}
                  </div>
                </Card>
              )}
              {/* Main Content (Appointments, Booking Section) */}
              <div className="space-y-4 sm:space-y-6">
                {content}
              </div>
              {/* Login Component After */}
              {guestMessage && (
                <div className="mt-4 sm:mt-6">
                  {guestMessage}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer - Always at bottom */}
      {footer && (
        <footer className="mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
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

