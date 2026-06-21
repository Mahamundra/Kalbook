"use client";

import { LayoutProps } from './types';
import { Calendar as CalendarIcon } from 'lucide-react';

export function HeroLayout({
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
  // Custom scrollbar styles for thin scrollbar in embeds/iframes
  const thinScrollbarStyles = `
    html::-webkit-scrollbar,
    body::-webkit-scrollbar,
    .thin-scrollbar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    html::-webkit-scrollbar-track,
    body::-webkit-scrollbar-track,
    .thin-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    html::-webkit-scrollbar-thumb,
    body::-webkit-scrollbar-thumb,
    .thin-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    html::-webkit-scrollbar-thumb:hover,
    body::-webkit-scrollbar-thumb:hover,
    .thin-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
    }
    html, body, .thin-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: thinScrollbarStyles }} />
      <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-background dark:to-background flex flex-col thin-scrollbar" data-booking-page="true" style={{ overflow: 'auto' }}>
      {/* Header */}
      {header}

      {/* Trial Expired Banner */}
      {trialBanner}

      {/* Hero Section - Full Width */}
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

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 sm:pt-16 sm:pb-16 md:py-20 lg:py-24">
          <div className="max-w-4xl mx-auto">
            {/* Business Name and Logo */}
            <div className="flex flex-col items-center text-center mb-8">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className={`h-16 ${logoShape === 'circle' ? 'w-16 rounded-[100%]' : 'w-auto rounded-[25%]'} object-contain mb-4 drop-shadow-lg`}
                  data-edit-id="logo"
                  data-edit-type="image"
                />
              ) : (
                <div
                  className={`h-16 w-16 ${logoShape === 'circle' ? 'rounded-[100%]' : 'rounded-[25%]'} bg-white/90 dark:bg-card/90 flex items-center justify-center mb-4 shadow-lg`}
                  data-edit-id="logo"
                  data-edit-type="image"
                >
                  <CalendarIcon className="w-8 h-8 text-primary" />
                </div>
              )}
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg mb-4"
                data-edit-id="business-name"
                data-edit-type="text"
              >
                {businessName}
              </h1>
              {businessDescription ? (
                <p
                  className="text-lg md:text-xl text-white/90 drop-shadow-md max-w-2xl"
                  data-edit-id="business-description"
                  data-edit-type="text"
                  dangerouslySetInnerHTML={{ __html: businessDescription }}
                />
              ) : (
                <p
                  className="text-lg md:text-xl text-white/90 drop-shadow-md max-w-2xl opacity-0"
                  data-edit-id="business-description"
                  data-edit-type="text"
                  style={{ minHeight: '1.5rem', marginBottom: '1rem' }}
                >
                  {' '}
                </p>
              )}
            </div>

            {/* Conditional rendering based on loginFirst - Show only ONE component in Hero */}
            {loginFirst ? (
              <>
                {/* Only Guest Message in Hero - No background */}
                <div className="flex justify-center">
                  <div className="w-full max-w-2xl [&_.bg-card]:!bg-transparent [&_.bg-card]:!border-transparent [&_.bg-card]:!shadow-none [&_*]:!text-white [&_.text-muted-foreground]:!text-white/80 [&_button]:!text-white [&_button]:!border-white/20 [&_button:hover]:!bg-white/10">
                    {guestMessage}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Only Business Info in Hero */}
                {businessInfo && (
                  <div className="flex justify-center">
                    <div 
                      className="backdrop-blur-sm rounded-lg p-6 shadow-xl overflow-hidden w-full max-w-2xl"
                      style={{ backgroundColor: 'rgb(255 255 255 / 10%)' }}
                    >
                      <div className="[&_.bg-card]:!bg-transparent [&_.bg-card]:!border-white/20 [&_.bg-card]:!shadow-none [&_*]:!text-white [&_.text-muted-foreground]:!text-white/80 [&_h2]:!text-white [&_h3]:!text-white [&_div]:!text-white [&_span]:!text-white">
                        {businessInfo}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Below Hero */}
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Show the other component below hero based on loginFirst */}
          {loginFirst ? (
            <>
              {/* Business Info Below Hero (when login is in hero) */}
              {businessInfo && (
                <div className="mb-6">
                  {businessInfo}
                </div>
              )}
              {/* Main Content (Appointments, Booking Section) */}
              {content}
            </>
          ) : (
            <>
              {/* Guest Message Below Hero (when business info is in hero) */}
              {guestMessage}
              {/* Main Content (Appointments, Booking Section) */}
              {content}
            </>
          )}
        </div>
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
    </>
  );
}
