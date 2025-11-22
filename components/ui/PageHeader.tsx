"use client";

import { Button } from '@/components/ported/ui/button';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
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
        {/* Language Toggle - on left for desktop only */}
        <div className="hidden md:block">
          <LanguageToggle />
        </div>
        
        {/* Logo - on left for mobile, centered for desktop */}
        <div className="flex-1 flex justify-start md:justify-center">
          <KalBookLogo size="md" variant="full" animated={false} />
        </div>
        
        {/* Right side buttons - Language (mobile) + Homepage */}
        <div className="flex items-center gap-2">
          {/* Language Toggle - visible on mobile, hidden on desktop */}
          <div className="md:hidden">
            <LanguageToggle />
          </div>
          
          {/* Homepage button */}
          {showHomepageButton && (
            <Link href={homepageHref}>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          )}
          {!showHomepageButton && <div />}
        </div>
      </div>
    </div>
  );
}

