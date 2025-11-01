import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { useDirection } from '@/contexts/DirectionProvider';
import { LanguageToggle } from '@/components/LanguageToggle';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminLayout = () => {
  const { dir, isTransitioning } = useDirection();

  return (
    <div dir={dir} className="min-h-screen w-full">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          
          <main className="flex-1 overflow-y-auto">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6">
              <SidebarTrigger className="md:hidden" />
              <div className="flex-1" />
              <LanguageToggle />
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
                  key="content"
                  initial={{ opacity: 0.6, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="p-6 md:p-8"
                >
                  <div className="max-w-7xl mx-auto">
                    <Outlet />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};
