"use client";
import { useBusinessType } from '@/lib/hooks/useBusinessType';
import { useLocale } from '@/components/ported/hooks/useLocale';
import StudioKubiyotWorkoutRequestsPage from '@/components/studio-kubiyot/admin/WorkoutRequests';

export default function WorkoutRequestsPage() {
  const businessType = useBusinessType();
  const { t } = useLocale();

  if (businessType === 'loading') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('studioKubiyot.admin.loading')}</p>
      </div>
    );
  }

  if (businessType !== 'gym_trainer') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('studioKubiyot.admin.redirecting')}</p>
      </div>
    );
  }

  return <StudioKubiyotWorkoutRequestsPage />;
}

