"use client";
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/ported/admin/AdminSidebar';
import { MobileBottomNav } from '@/components/admin/MobileBottomNav';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ported/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ported/ui/dropdown-menu';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  name: string;
  email: string;
}

export default function BusinessAdminLayout({ children }: { children: React.ReactNode }) {
  const { dir, isTransitioning } = useDirection();
  const { t, isRTL } = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Detect business slug
  const slugMatch = pathname?.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];

  // Don't show sidebar on login page
  const isLoginPage = pathname?.includes('/admin/login');

  // Fetch user data
  useEffect(() => {
    if (isLoginPage) {
      setLoadingUser(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser({
              name: data.user.name || 'User',
              email: data.user.email || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [isLoginPage]);

  const handleGoToDashboard = () => {
    window.location.href = '/user/dashboard';
  };

  const handleLogout = async () => {
    try {
      if (businessSlug) {
        const response = await fetch(`/b/${businessSlug}/admin/logout`, {
          method: 'POST',
        });
        
        if (response.ok || response.redirected) {
          toast.success(t('auth.logoutSuccess') || 'Logged out successfully');
          window.location.href = `/b/${businessSlug}/admin/login`;
        } else {
          throw new Error('Logout failed');
        }
      } else {
        // Fallback logout
        document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      // Still redirect
      if (businessSlug) {
        window.location.href = `/b/${businessSlug}/admin/login`;
      }
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div dir={dir} className="min-h-screen w-full">
      <SidebarProvider defaultOpen={true}>
        <AdminSidebar />
        
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6 relative">
              {/* Logo - centered on mobile, left on desktop */}
              <div className="absolute left-1/2 transform -translate-x-1/2 md:relative md:left-0 md:transform-none">
                <KalBookLogo size="lg" variant="text" animated={false} />
              </div>
              
              {/* Right side - User menu (mobile only) */}
              <div className="flex-1" />
              {!loadingUser && user && (
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-9 w-9"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? "start" : "end"}>
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleGoToDashboard} className="cursor-pointer hover:bg-[#ff3e1b] hover:text-white focus:bg-[#ff3e1b] focus:text-white">
                        <LayoutDashboard className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.title') || 'My Account'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-[#ff3e1b] hover:bg-[#ff3e1b] hover:text-white focus:bg-[#ff3e1b] focus:text-white">
                        <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.logout') || 'Logout'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </header>
            
            <AnimatePresence mode="wait">
              {isTransitioning ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0.6, scale: 0.98 }}
                  animate={{ opacity: 0.6, scale: 0.98 }}
                  exit={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="p-6 md:p-8"
                >
                  <div className="max-w-7xl mx-auto space-y-4">
                    <div className="h-8 w-48 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl animate-pulse" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="p-6 md:p-8"
                >
                  <div className="max-w-7xl mx-auto pb-20 md:pb-0">
                    {children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </SidebarInset>
      </SidebarProvider>
      <MobileBottomNav />
    </div>
  );
}
