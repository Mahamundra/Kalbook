"use client";
import { useBusinessType } from '@/lib/hooks/useBusinessType';
import { useLocale } from '@/components/ported/hooks/useLocale';
import StudioKubiyotSettingsPage from './studio-kubiyot-settings';
import Component from '@/components/ported/pages/admin/Settings';

export default function SettingsPage() {
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
    return <StudioKubiyotSettingsPage />;
  }

  return <Component />;
}

