"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogoutButton } from './LogoutButton';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isLoginPage = pathname === '/super-admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setIsChecking(false);
      return;
    }

    // Check if user is super admin
    const checkAuth = async () => {
      try {
        // Get current user from Supabase
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/super-admin/login');
          return;
        }

        const response = await fetch('/api/super-admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await response.json();
        
        if (data.isSuperAdmin) {
          setIsAuthorized(true);
        } else {
          router.push('/super-admin/login');
        }
      } catch (error) {
        router.push('/super-admin/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router, isLoginPage]);

  // Show nothing while checking (prevents flash)
  if (isChecking && !isLoginPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If on login page, just show children
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If not authorized, don't render (redirect is happening)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Super Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/super-admin/businesses" className="text-sm text-gray-700 hover:text-gray-900">
                Businesses
              </a>
              <a href="/super-admin/plans" className="text-sm text-gray-700 hover:text-gray-900">
                Plans
              </a>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
