"use client";

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import { Button } from '@/components/ported/ui/button';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { UpgradeModal } from './UpgradeModal';
import { useLocale } from '@/components/ported/hooks/useLocale';

interface TrialStatus {
  success: boolean;
  trialExpired: boolean;
  daysRemaining: number | null;
  planName: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled' | null;
}

export function TrialStatusBanner() {
  const { t } = useLocale();
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/admin/trial-status', {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data.success) {
          setStatus(data);
        }
      } catch (error) {
        console.error('Error fetching trial status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every hour to update countdown
    const interval = setInterval(fetchStatus, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Show loading state briefly, then show status or nothing
  if (loading) {
    return null; // Don't show anything while loading
  }

  // If no status after loading, don't show banner
  if (!status || !status.success) {
    return null;
  }

  // Active subscription - just show plan name
  if (status.subscriptionStatus === 'active') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-800 font-medium">
            {t('trial.currentPlan')}: <span className="capitalize">{status.planName}</span>
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expired
  if (status.trialExpired) {
    return (
      <>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-red-800 font-medium">
              {t('trial.trialExpired')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpgradeModal(true)}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              {t('trial.clickHereToUpgrade')}
            </Button>
          </AlertDescription>
        </Alert>
        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      </>
    );
  }

  // Active trial with countdown
  if (status.subscriptionStatus === 'trial' && status.daysRemaining !== null) {
    const daysText = status.daysRemaining === 1 ? t('trial.day') : t('trial.days');
    return (
      <>
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-yellow-800 font-medium">
              <span className="capitalize">{status.planName}</span> {t('trial.plan')} - {status.daysRemaining} {daysText} {t('trial.left')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpgradeModal(true)}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              {t('trial.upgradeNow')}
            </Button>
          </AlertDescription>
        </Alert>
        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      </>
    );
  }

  return null;
}

