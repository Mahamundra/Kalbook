"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Users, UserCircle, Briefcase, BarChart3, FileText } from 'lucide-react';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useBusinessType } from '@/lib/hooks/useBusinessType';
import Component from "@/components/ported/pages/admin/Dashboard";

/**
 * Admin Dashboard Page
 * Shows Studio Kubiyot dashboard for gym_trainer businesses
 * Shows regular dashboard for other business types
 */
export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLocale();
  const businessType = useBusinessType();
  const [stats, setStats] = useState({
    clients: 0,
    trainers: 0,
    workoutTypes: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    // Fetch Studio Kubiyot stats if gym_trainer
    if (businessType === 'gym_trainer') {
      Promise.all([
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/studio-kubiyot/admin/trainers').then(r => r.json()),
        fetch('/api/studio-kubiyot/admin/workout-types').then(r => r.json()),
        fetch('/api/studio-kubiyot/admin/workout-requests?status=pending').then(r => r.json()),
      ]).then(([clients, trainers, workoutTypes, requests]) => {
        setStats({
          clients: clients.success ? clients.customers?.length || 0 : 0,
          trainers: trainers.success ? trainers.trainers?.length || 0 : 0,
          workoutTypes: workoutTypes.success ? workoutTypes.workoutTypes?.length || 0 : 0,
          pendingRequests: requests.success ? requests.requests?.length || 0 : 0,
        });
      }).catch(console.error);
    }
  }, [businessType]);

  // Show Studio Kubiyot dashboard for gym_trainer businesses
  if (businessType === 'gym_trainer') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('studioKubiyot.admin.dashboard')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('studioKubiyot.admin.dashboardDescription')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('studioKubiyot.admin.clients')}
                </p>
                <p className="text-2xl font-bold">{stats.clients}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('studioKubiyot.admin.trainers')}
                </p>
                <p className="text-2xl font-bold">{stats.trainers}</p>
              </div>
              <UserCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('studioKubiyot.admin.workoutTypes')}
                </p>
                <p className="text-2xl font-bold">{stats.workoutTypes}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('studioKubiyot.admin.pendingRequests')}
                </p>
                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state
  if (businessType === 'loading') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('studioKubiyot.admin.loading')}</p>
      </div>
    );
  }

  // Show regular dashboard for other business types
  return <Component />;
}

