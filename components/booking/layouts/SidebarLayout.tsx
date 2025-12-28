"use client";

import { useState } from 'react';
import { LayoutProps } from './types';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDirection } from '@/components/providers/DirectionProvider';
import { cn } from '@/lib/utils';

export function SidebarLayout({
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
  const isMobile = useIsMobile();
  const { dir: direction } = useDirection();
  const isRTL = direction === 'rtl';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On mobile, sidebar is collapsible
  const sidebarContent = (
    <div className="space-y-4">
      {businessInfo}
    </div>
  );

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white" data-booking-page="true">
      {/* Header */}
      {header}

      {/* Trial Expired Banner */}
      {trialBanner}

      {/* Main Layout - Two Column on Desktop, Stacked on Mobile */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar - Left on Desktop, Top on Mobile */}
        {isMobile ? (
          <div className="w-full border-b bg-white">
            <Button
              variant="ghost"
              className="w-full justify-between p-4"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="font-medium">Business Information</span>
              {sidebarOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            {sidebarOpen && (
              <div className="px-4 pb-4 border-t">
                {sidebarContent}
              </div>
            )}
          </div>
        ) : (
          <aside className={cn(
            "w-full lg:w-80 flex-shrink-0 bg-white border-r border-gray-200",
            "lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto",
            isRTL && "lg:border-l lg:border-r-0"
          )}>
            <div className="p-6">
              {sidebarContent}
            </div>
          </aside>
        )}

        {/* Main Content Area - Right on Desktop, Below on Mobile */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Banner Cover */}
            {bannerCover}

            {/* Guest Message */}
            {guestMessage}

            {/* Main Content (Appointments, Booking Section) */}
            {content}
          </div>
        </main>
      </div>

      {/* Dialogs */}
      {rescheduleDialog}
      {loginDialog}
    </div>
  );
}
