"use client";
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/ported/admin/AdminSidebar';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import { TrialStatusBanner } from '@/components/admin/TrialStatusBanner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ported/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ported/ui/dropdown-menu';
import { LayoutDashboard, LogOut, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/ported/hooks/useLocale';
import Link from 'next/link';

interface User {
  name: string;
  email: string;
  role?: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { dir, isTransitioning, isRTL } = useDirection();
  const { t } = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

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
    window.location.href = '/user/dashboard';
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
            <header className="sticky top-0 z-10 grid grid-cols-3 h-14 items-center gap-4 border-b bg-background px-6">
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
                      <DropdownMenuItem onClick={handleGoToDashboard} className="cursor-pointer hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white">
                        <LayoutDashboard className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.title') || 'My Account'}
                      </DropdownMenuItem>
                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => window.location.href = '/user/dashboard'} 
                            className="cursor-pointer hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white"
                          >
                            <Building2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {t('dashboard.goToOwnerDashboard')}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-[#030408] hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white">
                        <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.logout') || 'Logout'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Center - Logo */}
              <div className="flex justify-center items-center order-2">
                <KalBookLogo size="lg" variant="full" animated={false} />
              </div>

              {/* Right side - Language Toggle */}
              <div className={`flex ${isRTL ? 'justify-start order-1' : 'justify-end order-3'}`}>
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
                    {children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}

