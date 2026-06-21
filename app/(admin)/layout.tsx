"use client";
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { TrialStatusBanner } from '@/components/admin/TrialStatusBanner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, LogOut, Building2, User, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getTimeBasedGreeting } from '@/lib/utils/greetings';
import { UserAccountModal } from '@/components/admin/UserAccountModal';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import { LegacyAdminRedirect } from '@/components/admin/LegacyAdminRedirect';

interface User {
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { dir, isTransitioning, isRTL } = useDirection();
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [userAccountModalOpen, setUserAccountModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser({
              name: data.user.name || 'User',
              email: data.user.email || '',
              role: data.user.role,
              avatar_url: data.user.avatar_url || null,
            });
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
  }, []);

  const handleGoToDashboard = () => {
    setDropdownOpen(false);
    setUserAccountModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok || response.redirected) {
        toast.success(t('auth.logoutSuccess') || 'Logged out successfully');
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      window.location.href = '/';
    }
  };

  return (
    <div dir={dir} className="min-h-screen w-full">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          
          <main className="flex-1 overflow-y-auto">
            <header className="sticky top-0 z-10 grid grid-cols-3 h-14 items-center gap-4 bg-background px-6 py-0">
              {/* Left side - Login/User profile */}
              <div className={`flex items-center gap-2 ${isRTL ? 'justify-end order-3' : 'justify-start order-1'}`}>
                <SidebarTrigger className="md:hidden" />
                {!loadingUser && !user && (
                  <Link href="/admin/login">
                    <Button variant="outline" size="sm" className="h-9">
                      <User className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t('auth.login') || 'Login'}
                    </Button>
                  </Link>
                )}
                {!loadingUser && user && (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 welcome-back-button ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        {isRTL && <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />}
                        <Avatar className="h-12 w-12 flex-shrink-0 border border-[#030408]">
                          {user.avatar_url ? (
                            <AvatarImage src={user.avatar_url} alt={user.name || 'User'} />
                          ) : null}
                          <AvatarFallback className={`${getTimeBasedAvatarStyle()} text-xs sm:text-sm`}>
                            {getTimeBasedEmoji()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {getTimeBasedGreeting(locale as 'en' | 'he' | 'ar' | 'ru')}, <span className="font-medium text-foreground">{user.name}</span>
                        </span>
                        {!isRTL && <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align={isRTL ? "end" : "end"} 
                      className={`${isRTL ? "text-right [&>*]:text-right" : ""} w-[var(--radix-dropdown-menu-trigger-width)]`}
                      style={{
                        direction: isRTL ? 'rtl' : 'ltr',
                        width: 'var(--radix-dropdown-menu-trigger-width)',
                      }}
                    >
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleGoToDashboard} className={`cursor-pointer hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row justify-end' : ''}`}>
                        <LayoutDashboard className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        <span className={isRTL ? 'text-right' : ''}>{t('userDashboard.title') || 'My Account'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className={`cursor-pointer text-[#030408] hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row justify-end' : ''}`}>
                        <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        <span className={isRTL ? 'text-right' : ''}>{t('userDashboard.logout') || 'Logout'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Center - Logo */}
              <div className="flex justify-center items-center order-2">
                <div className={`${isRTL ? 'ml-auto md:ml-0 md:absolute md:left-1/2 md:transform md:-translate-x-1/2' : 'mr-auto md:mr-0 md:absolute md:left-1/2 md:transform md:-translate-x-1/2'}`}>
                  <KalBookLogo size="md" variant="full" animated={false} />
                </div>
              </div>

              {/* Right side - Dark Mode Toggle and Language Toggle */}
              <div className={`flex items-center gap-2 ${isRTL ? 'justify-start order-1' : 'justify-end order-3'}`}>
                <DarkModeToggle />
                <LanguageToggle />
              </div>
            </header>
            
            <div className="border-b">
              <div className="px-6 py-2">
                <TrialStatusBanner />
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {isTransitioning ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0.6, scale: 0.98 }}
                  animate={{ opacity: 0.6, scale: 0.98 }}
                  exit={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]"
                >
                  <div className="text-center space-y-6">
                    <KalBookLogo size="xl" variant="text" />
                    <div className="max-w-7xl mx-auto space-y-4">
                      <div className="h-8 w-48 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg animate-pulse mx-auto" />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="h-32 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl animate-pulse" />
                        ))}
                      </div>
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
                  <div className="max-w-7xl mx-auto">
                    <LegacyAdminRedirect>{children}</LegacyAdminRedirect>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </SidebarProvider>
      <UserAccountModal open={userAccountModalOpen} onOpenChange={setUserAccountModalOpen} initialTab="profile" />
    </div>
  );
}

