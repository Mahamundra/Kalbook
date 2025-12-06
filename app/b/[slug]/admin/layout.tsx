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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ported/ui/dropdown-menu';
import { LayoutDashboard, LogOut, Building2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ported/ui/avatar';
import { getTimeBasedGreeting } from '@/lib/utils/greetings';

interface User {
  name: string;
  email: string;
}

// Helper function to get user initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper function to get time-based emoji (day/night/evening)
const getTimeBasedEmoji = (): string => {
  const hour = new Date().getHours();
  
  // Morning/Day: 5am - 6pm (sun)
  if (hour >= 5 && hour < 18) {
    return '☀️'; // Sun
  }
  // Evening: 6pm - 10pm (sunset)
  else if (hour >= 18 && hour < 22) {
    return '🌆'; // Sunset/Cityscape
  }
  // Night: 10pm - 5am (stars)
  else {
    return '✨'; // Stars
  }
};

// Helper function to get time-based avatar styling
const getTimeBasedAvatarStyle = (): string => {
  const hour = new Date().getHours();
  
  // Night: 10pm - 5am (palevioletred background with orange border)
  if (hour >= 22 || hour < 5) {
    return 'bg-[palevioletred] border-[.5px] border-solid border-[#FF6A3D] text-gray-700';
  }
  // Default: gray background
  return 'bg-gray-200 text-gray-700';
};

export default function BusinessAdminLayout({ children }: { children: React.ReactNode }) {
  const { dir, isTransitioning } = useDirection();
  const { t, isRTL, locale } = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

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
            // Check if user is owner
            if (data.user.role === 'owner') {
              setIsOwner(true);
            }
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
        
        <SidebarInset className="overflow-y-auto">
            <header className="flex min-h-[69px] items-center gap-4 border-b bg-background px-4 md:px-6 relative py-6 w-full">
              {/* Logo - centered */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <KalBookLogo size="lg" variant="full" animated={false} />
              </div>
              
              {/* Right side - User menu */}
              <div className="flex-1" />
              {!loadingUser && user && (
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 welcome-back-button ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0">
                          <AvatarFallback className={`${getTimeBasedAvatarStyle()} text-xs sm:text-sm`}>
                            {getTimeBasedEmoji()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {getTimeBasedGreeting(locale as 'en' | 'he' | 'ar' | 'ru')}, <span className="font-medium text-foreground">{user.name}</span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align={isRTL ? "end" : "end"} 
                      className={isRTL ? "text-right [&>*]:text-right" : ""}
                      style={isRTL ? { direction: 'rtl' } : { direction: 'ltr' }}
                    >
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleGoToDashboard} className={`cursor-pointer hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <LayoutDashboard className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.title') || 'My Account'}
                      </DropdownMenuItem>
                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => window.location.href = '/user/dashboard'} 
                            className={`cursor-pointer hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Building2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {t('dashboard.goToOwnerDashboard')}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className={`cursor-pointer text-[#030408] hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row-reverse' : ''}`}>
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
