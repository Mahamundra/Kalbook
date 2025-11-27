"use client";
import Link from 'next/link';
import { Button } from '@/components/ported/ui/button';
import { Home } from 'lucide-react';
import { useLocale } from '@/components/ported/hooks/useLocale';

export default function NotFound() {
  const { t, isRTL, dir } = useLocale();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4" dir={dir}>
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">{t('notFound.title')}</h2>
        <p className="text-gray-600 mb-8">
          {t('notFound.description')}
        </p>
        <Link href="/">
          <Button size="lg" className="gap-2">
            <Home className="w-4 h-4" />
            {t('notFound.goHome')}
          </Button>
        </Link>
      </div>
    </div>
  );
}



