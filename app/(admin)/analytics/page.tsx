"use client";
import { useBusinessType } from '@/lib/hooks/useBusinessType';
import { useLocale } from '@/components/ported/hooks/useLocale';
import StudioKubiyotAnalyticsPage from './studio-kubiyot-analytics';

export default function AnalyticsPage() {
  const businessType = useBusinessType();
  const { t } = useLocale();

  if (businessType === 'loading') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('studioKubiyot.admin.loading')}</p>
      </div>
    );
  }

  if (businessType === 'gym_trainer') {
    return <StudioKubiyotAnalyticsPage />;
  }

  return (
    <div className="p-6">
      <p>Analytics coming soon...</p>
    </div>
  );
}

