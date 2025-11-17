"use client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/ported/admin/AdminSidebar';
import { useDirection } from '@/components/providers/DirectionProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { KalBookLogo } from '@/components/ui/KalBookLogo';

export default function BusinessAdminLayout({ children }: { children: React.ReactNode }) {
  const { dir, isTransitioning } = useDirection();
  const pathname = usePathname();

  // Don't show sidebar on login page
  const isLoginPage = pathname?.includes('/admin/login');

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div dir={dir} className="min-h-screen w-full">
      <SidebarProvider defaultOpen={true}>
        <AdminSidebar />
        
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6 relative">
              <SidebarTrigger className="md:hidden" />
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <KalBookLogo size="lg" variant="full" animated={false} />
              </div>
              <div className="flex-1" />
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
                  <div className="max-w-7xl mx-auto">
                    {children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

