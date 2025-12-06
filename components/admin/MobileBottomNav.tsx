"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  Users, 
  Settings,
  MoreHorizontal,
  UserCircle,
  FileText,
  Mail,
  QrCode,
  X,
  ExternalLink
} from 'lucide-react';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ported/ui/sheet';

const mobileNavItems = [
  { 
    icon: Calendar, 
    labelKey: 'nav.calendar', 
    slug: 'calendar',
    path: 'calendar'
  },
  { 
    icon: Briefcase, 
    labelKey: 'nav.services', 
    slug: 'services',
    path: 'services'
  },
  { 
    icon: Users, 
    labelKey: 'nav.customers', 
    slug: 'customers',
    path: 'customers'
  },
  { 
    icon: UserCircle, 
    labelKey: 'nav.workers', 
    slug: 'workers',
    path: 'workers'
  },
];

const moreMenuItems = [
  { 
    icon: LayoutDashboard, 
    labelKey: 'nav.dashboard', 
    slug: 'dashboard',
    path: 'dashboard'
  },
  { 
    icon: FileText, 
    labelKey: 'nav.activityLogs', 
    slug: 'activity-logs',
    path: 'activity-logs'
  },
  { 
    icon: Mail, 
    labelKey: 'nav.templates', 
    slug: 'templates',
    path: 'templates'
  },
  { 
    icon: QrCode, 
    labelKey: 'nav.qr', 
    slug: 'qr',
    path: 'qr'
  },
  { 
    icon: Settings, 
    labelKey: 'nav.settings', 
    slug: 'settings',
    path: 'settings'
  },
];

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const isGymTrainer = businessType === 'gym_trainer';

  // Detect if we're on slug-based admin route
  const slugMatch = pathname?.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const basePath = businessSlug ? `/b/${businessSlug}/admin` : '/admin';

  // Fetch business type
  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success && data.businessType) {
          setBusinessType(data.businessType);
        }
      } catch (error) {
        console.error('Failed to fetch business type:', error);
      }
    };
    if (businessSlug) {
      fetchBusinessType();
    }
  }, [businessSlug]);

  // Don't show on login page
  if (pathname?.includes('/admin/login')) {
    return null;
  }

  // Check if any "more" menu item is active (including dashboard)
  const isMoreMenuActive = moreMenuItems.some(item => {
    const itemPath = `${basePath}/${item.path}`;
    return pathname === itemPath || pathname?.startsWith(itemPath + '/');
  });

  return (
    <>
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden",
          "safe-area-inset-bottom"
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="grid grid-cols-5 h-16">
          {mobileNavItems.map((item) => {
            const itemPath = `${basePath}/${item.path}`;
            const isActive = pathname === itemPath || pathname?.startsWith(itemPath + '/');
            
            // Conditionally change label keys for gym_trainer
            let labelKey = item.labelKey;
            if (isGymTrainer) {
              if (item.labelKey === 'nav.services') {
                labelKey = 'nav.classes';
              } else if (item.labelKey === 'nav.workers') {
                labelKey = 'nav.trainers';
              }
            }
            
            return (
              <Link
                key={item.slug}
                href={itemPath}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  "hover:bg-muted/50 active:bg-muted",
                  isActive 
                    ? "text-[#030408]" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium leading-tight text-center px-1",
                  isActive && "font-semibold"
                )}>
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}
          
          {/* More Button */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  "hover:bg-muted/50 active:bg-muted",
                  isMoreMenuActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MoreHorizontal className={cn(
                  "w-5 h-5 transition-transform",
                  isMoreMenuActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium leading-tight text-center px-1",
                  isMoreMenuActive && "font-semibold"
                )}>
                  {t('nav.more') || 'More'}
                </span>
              </button>
            </SheetTrigger>
            <SheetContent 
              side={isRTL ? 'right' : 'left'} 
              className="w-[280px] sm:w-[320px] [&>button:not([data-custom-close])]:hidden"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Custom Close Button - Left side only */}
              <SheetClose asChild>
                <button
                  data-custom-close
                  className="absolute top-4 left-4 z-50 rounded-full bg-white dark:bg-gray-900 p-1.5 opacity-100 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm"
                >
                  <X className="h-4 w-4 text-black dark:text-white" />
                  <span className="sr-only">Close</span>
                </button>
              </SheetClose>
              <SheetHeader>
                <SheetTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {t('nav.more') || 'More'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                {moreMenuItems.map((item) => {
                  const itemPath = `${basePath}/${item.path}`;
                  const isActive = pathname === itemPath || pathname?.startsWith(itemPath + '/');
                  
                  return (
                    <Link
                      key={item.slug}
                      href={itemPath}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        "hover:bg-muted/50 active:bg-muted",
                        isActive && "bg-[#030408]/10 text-[#030408] font-medium"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
                {/* View My Booking Page Button */}
                {businessSlug && (
                  <Link
                    href={`/b/${businessSlug}`}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      "hover:bg-muted/50 active:bg-muted border-t mt-2 pt-4"
                    )}
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>{t('nav.viewMyBookingPage')}</span>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
};
