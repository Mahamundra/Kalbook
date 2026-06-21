'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const LEGACY_ADMIN_PATHS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/settings': 'settings',
  '/analytics': 'dashboard',
  '/trainers': 'workers',
  '/workout-types': 'services',
  '/workout-requests': 'activity-logs',
};

const LEGACY_STANDALONE_PATHS: Record<string, string> = {
  '/upgrade': '/user/dashboard',
};

interface LegacyAdminRedirectProps {
  children: React.ReactNode;
}

export function LegacyAdminRedirect({ children }: LegacyAdminRedirectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const standaloneTarget = LEGACY_STANDALONE_PATHS[pathname];
    if (standaloneTarget) {
      setRedirecting(true);
      router.replace(standaloneTarget);
      return;
    }

    const adminSection = LEGACY_ADMIN_PATHS[pathname];
    if (!adminSection) {
      return;
    }

    let cancelled = false;

    const redirectToSlugAdmin = async () => {
      setRedirecting(true);

      try {
        const response = await fetch('/api/user/profile');
        const data = await response.json();

        if (cancelled) return;

        if (data.success && data.business?.slug) {
          router.replace(`/b/${data.business.slug}/admin/${adminSection}`);
          return;
        }
      } catch (error) {
        console.error('Legacy admin redirect failed:', error);
      }

      if (!cancelled) {
        setRedirecting(false);
      }
    };

    redirectToSlugAdmin();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (redirecting) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
