"use client";

import { LayoutProps } from './types';
import { Calendar as CalendarIcon } from 'lucide-react';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useDirection } from '@/components/providers/DirectionProvider';
import { cn } from '@/lib/utils';

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
  businessName,
  businessDescription,
  logoUrl,
  logoShape = 'square',
  dir,
}: LayoutProps) {
  const { dir: direction } = useDirection();
  const isRTL = direction === 'rtl';
  
  // Use mainContent if provided, otherwise combine customerAppointments and bookingSection
  const content = mainContent ?? (
    <>
      {customerAppointments}
      {bookingSection}
    </>
  );
  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white" data-booking-page="true">
      {/* Trial Expired Banner */}
      {trialBanner}

      {/* Hero Section - Full Width */}
      <div className="relative w-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px] overflow-hidden">
        {/* Banner Background */}
        {bannerCover ? (
          <div className="absolute inset-0 [&>div]:!mb-0 [&>div]:!-mx-0 [&>div]:!-mt-0 [&>div]:!rounded-none [&>div>div]:!h-full [&>div>div]:!min-h-[300px] md:[&>div>div]:!min-h-[400px] lg:[&>div>div]:!min-h-[500px]">
            {bannerCover}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}

        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Language Toggle - Positioned in top corner of hero */}
        <div className={cn(
          "absolute top-4 z-20",
          isRTL ? "left-4" : "right-4"
        )}>
          <LanguageToggle />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 md:py-16 lg:py-20">
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
                  className={`h-16 w-16 ${logoShape === 'circle' ? 'rounded-[100%]' : 'rounded-[25%]'} bg-white/90 flex items-center justify-center mb-4 shadow-lg`}
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

            {/* Business Info in Hero */}
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
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Below Hero */}
      <main className="w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Guest Message */}
          {guestMessage}

          {/* Main Content (Appointments, Booking Section) */}
          {content}
        </div>
      </main>

      {/* Dialogs */}
      {rescheduleDialog}
      {loginDialog}
    </div>
  );
}
