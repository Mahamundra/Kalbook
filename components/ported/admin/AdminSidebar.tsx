import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { LayoutDashboard, Calendar, Briefcase, Users, Mail, QrCode, Settings, UserCircle } from 'lucide-react';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useState, useEffect } from 'react';
import { getSettings } from '@/components/ported/lib/mockData';

const menuItems = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/admin/dashboard' },
  { icon: Calendar, labelKey: 'nav.calendar', path: '/admin/calendar' },
  { icon: Briefcase, labelKey: 'nav.services', path: '/admin/services' },
  { icon: UserCircle, labelKey: 'nav.workers', path: '/admin/workers' },
  { icon: Users, labelKey: 'nav.customers', path: '/admin/customers' },
  { icon: Mail, labelKey: 'nav.templates', path: '/admin/templates' },
  { icon: QrCode, labelKey: 'nav.qr', path: '/admin/qr' },
  { icon: Settings, labelKey: 'nav.settings', path: '/admin/settings' },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [businessName, setBusinessName] = useState('Style Studio');
  const [logoUrl, setLogoUrl] = useState('');

  // Load settings on mount and when they change
  useEffect(() => {
    const loadSettings = () => {
      if (typeof window !== 'undefined') {
        const settings = getSettings();
        setBusinessName(settings.businessProfile.name || 'Style Studio');
        setLogoUrl(settings.branding.logoUrl || '');
      }
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
  }, []);

  return (
    <Sidebar side={isRTL ? "right" : "left"}>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Business logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-primary">BookingHub</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">{businessName}</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={pathname === item.path}>
                <Link href={item.path} className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t">
        <Link href="/">
          <Button variant="outline" className="w-full">
            {t('nav.viewPublicSite')}
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
};
