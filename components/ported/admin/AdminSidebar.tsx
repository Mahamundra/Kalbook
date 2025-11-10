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
import { LayoutDashboard, Calendar, Briefcase, Users, Mail, QrCode, Settings, UserCircle, LogOut } from 'lucide-react';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useState, useEffect } from 'react';
import { getSettings } from '@/components/ported/lib/mockData';
import { toast } from 'sonner';
import { KalBookLogo } from '@/components/ui/KalBookLogo';

const menuItemsBase = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', slug: 'dashboard' },
  { icon: Calendar, labelKey: 'nav.calendar', slug: 'calendar' },
  { icon: Briefcase, labelKey: 'nav.services', slug: 'services' },
  { icon: UserCircle, labelKey: 'nav.workers', slug: 'workers' },
  { icon: Users, labelKey: 'nav.customers', slug: 'customers' },
  { icon: Mail, labelKey: 'nav.templates', slug: 'templates' },
  { icon: QrCode, labelKey: 'nav.qr', slug: 'qr' },
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

  // Detect if we're on slug-based admin route (/b/[slug]/admin/*)
  const slugMatch = pathname.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const basePath = businessSlug ? `/b/${businessSlug}/admin` : '/admin';
  
  const menuItems = menuItemsBase.map(item => ({
    ...item,
    path: `${basePath}/${item.slug}`,
  }));

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
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Business logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <KalBookLogo size="lg" variant="full" />
            {mounted && businessName ? (
              <p className="text-sm text-muted-foreground mt-1 truncate">{businessName}</p>
            ) : !mounted ? (
              <div className="h-4 w-24 bg-muted animate-pulse rounded mt-1"></div>
            ) : null}
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarMenu>
          {menuItems.map((item) => {
            // Check if current path matches (exact or starts with for nested routes)
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <SidebarMenuItem key={item.path}>
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
        <Link href={businessSlug ? `/b/${businessSlug}` : '/'}>
          <Button variant="outline" className="w-full">
            {t('nav.viewPublicSite')}
          </Button>
        </Link>
        {businessSlug && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              try {
                // Call logout endpoint - it will sign out and redirect
                const response = await fetch(`/b/${businessSlug}/admin/logout`, {
                  method: 'POST',
                });
                
                // If response is a redirect (status 307/308), navigate to login
                if (response.redirected || response.ok) {
                  toast.success(t('auth.logoutSuccess') || 'Logged out successfully');
                  // Navigate to login page
                  window.location.href = `/b/${businessSlug}/admin/login`;
                } else {
                  toast.error('Failed to logout');
                  // Still redirect to login page
                  window.location.href = `/b/${businessSlug}/admin/login`;
                }
              } catch (error) {
                console.error('Logout error:', error);
                // Still redirect to login page even if there's an error
                window.location.href = `/b/${businessSlug}/admin/login`;
              }
            }}
          >
            <LogOut className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
            {t('auth.logout') || 'Logout'}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
