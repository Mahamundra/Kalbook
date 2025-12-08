import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Calendar, Briefcase, Users, Mail, QrCode, Settings, UserCircle, FileText } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useState, useEffect, useMemo } from 'react';
import { getSettings } from '@/lib/mockData';

const menuItemsBase = [
  { icon: Calendar, labelKey: 'nav.calendar', slug: 'calendar' },
  { icon: Briefcase, labelKey: 'nav.services', slug: 'services' },
  { icon: UserCircle, labelKey: 'nav.workers', slug: 'workers' },
  { icon: Users, labelKey: 'nav.customers', slug: 'customers' },
  { icon: FileText, labelKey: 'nav.activityLogs', slug: 'activity-logs' },
  { icon: QrCode, labelKey: 'nav.qr', slug: 'qr' },
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', slug: 'dashboard' },
  { icon: Settings, labelKey: 'nav.settings', slug: 'settings' },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [mounted, setMounted] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [businessType, setBusinessType] = useState<string | null>(null);

  // Detect if we're on slug-based admin route (/b/[slug]/admin/*)
  const slugMatch = pathname.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const basePath = businessSlug ? `/b/${businessSlug}/admin` : '/admin';
  
  // Build menu items based on business type
  const menuItems = useMemo(() => {
    const isGymTrainer = businessType === 'gym_trainer';
    
    // For gym_trainer, change labels but keep same routes (customers/workers)
    const items = menuItemsBase.map(item => {
      if (isGymTrainer) {
        if (item.slug === 'customers') {
          return { ...item, labelKey: 'nav.clients' }; // Change label but keep slug
        }
        if (item.slug === 'workers') {
          return { ...item, labelKey: 'nav.trainers' }; // Change label but keep slug
        }
      }
      return item;
    });
    
    return items.map(item => ({
      ...item,
      path: `${basePath}/${item.slug}`, // Keep original slug in path
    }));
  }, [businessType, basePath]);

  // Load settings on mount and when they change
  useEffect(() => {
    setMounted(true);
    const loadSettings = async () => {
      if (typeof window === 'undefined') return;

      // If we have a slug, fetch from API
      if (businessSlug) {
        try {
          const response = await fetch(`/api/settings?businessSlug=${businessSlug}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
              setBusinessName(data.settings.businessProfile?.name || '');
              setLogoUrl(data.settings.branding?.logoUrl || '');
              // Get business type from settings response
              if (data.businessType) {
                setBusinessType(data.businessType);
              }
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      }

      // Fallback to mock data for non-slug routes or if API fails
      const settings = getSettings();
      setBusinessName(settings.businessProfile.name || '');
      setLogoUrl(settings.branding.logoUrl || '');
    };

    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      loadSettings();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, [businessSlug]);

  return (
    <Sidebar side={isRTL ? "right" : "left"}>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          {logoUrl && mounted && (
            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Business logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {mounted && businessName ? (
              <p className="text-base font-bold truncate">{businessName}</p>
            ) : !mounted ? (
              <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
            ) : null}
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarMenu>
          {menuItems.map((item) => {
            // Check if current path matches (exact or starts with for nested routes)
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            // Hide QR codes on desktop only
            const isQRCode = item.slug === 'qr';
            return (
              <SidebarMenuItem key={item.path} className={isQRCode ? 'md:hidden' : ''}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.path} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t space-y-2">
        <Link href={businessSlug ? `/b/${businessSlug}` : '/'} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full">
            {t('nav.viewPublicSite')}
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
};
