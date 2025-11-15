"use client";

import { Button } from '@/components/ported/ui/button';
import { KalBokLogo } from '@/components/ui/KalBookLogo';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/ported/hooks/useLocale';

interface PageHeaderProps {
  homepageButtonText?: string;
  homepageHref?: string;
  showHomepageButton?: boolean;
}

export function PageHeader({ 
  homepageButtonText,
  homepageHref = '/',
  showHomepageButton = true 
}: PageHeaderProps) {
  const { t } = useLocale();

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        {/* Language Toggle on the left */}
        <LanguageToggle />
        
        {/* Logo in the middle */}
        <div className="flex-1 flex justify-center">
          <KalBokLogo size="lg" variant="full" animated={false} />
        </div>
        
        {/* Homepage button on the right */}
        {showHomepageButton && (
          <Link href={homepageHref}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {homepageButtonText || t('userDashboard.homepage') || 'Homepage'}
            </Button>
          </Link>
        )}
        {!showHomepageButton && <div />}
      </div>
    </div>
  );
}

