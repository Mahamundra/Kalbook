'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { formatDate } from '@/lib/i18n';
import { Loader2 } from 'lucide-react';

interface CustomerStatistics {
  totalAppointments: number;
  totalAppointmentsThisMonth: number;
  totalAppointmentsThisYear: number;
  totalRevenue: number;
  totalRevenueThisMonth: number;
  totalRevenueThisYear: number;
  averageVisitsPerMonth: number;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  servicePreferences: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
  }>;
  workerPreferences: Array<{
    workerId: string;
    workerName: string;
    count: number;
  }>;
  visitFrequency: {
    thisMonth: number;
    lastMonth: number;
    last3Months: number;
    last6Months: number;
    last12Months: number;
  };
  customerLifetimeValue: number;
}

interface CustomerStatisticsCardProps {
  customerId: string;
}

export function CustomerStatisticsCard({ customerId }: CustomerStatisticsCardProps) {
  const { t, locale } = useLocale();
  const [statistics, setStatistics] = useState<CustomerStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${customerId}/statistics`);
        const data = await response.json();
        if (data.success) {
          setStatistics(data.statistics);
        }
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchStatistics();
    }
  }, [customerId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('customers.statistics.totalAppointments') || 'Total Appointments'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('customers.statistics.avgVisitsPerMonth') || 'Avg Visits/Month'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.averageVisitsPerMonth.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('customers.statistics.lastVisit') || 'Last Visit'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {statistics.lastVisitDate ? formatDate(statistics.lastVisitDate, locale) : '-'}
            </div>
            {statistics.daysSinceLastVisit !== null && (
              <div className="text-xs text-muted-foreground mt-1">
                {statistics.daysSinceLastVisit} {t('customers.statistics.daysAgo') || 'days ago'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visit Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>{t('customers.statistics.visitFrequency') || 'Visit Frequency'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('customers.statistics.thisMonth') || 'This Month'}</div>
              <div className="text-lg font-semibold">{statistics.visitFrequency.thisMonth}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('customers.statistics.lastMonth') || 'Last Month'}</div>
              <div className="text-lg font-semibold">{statistics.visitFrequency.lastMonth}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('customers.statistics.last3Months') || 'Last 3 Months'}</div>
              <div className="text-lg font-semibold">{statistics.visitFrequency.last3Months}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('customers.statistics.last6Months') || 'Last 6 Months'}</div>
              <div className="text-lg font-semibold">{statistics.visitFrequency.last6Months}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('customers.statistics.last12Months') || 'Last 12 Months'}</div>
              <div className="text-lg font-semibold">{statistics.visitFrequency.last12Months}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Preferences */}
      {statistics.servicePreferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.statistics.servicePreferences') || 'Service Preferences'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.servicePreferences.slice(0, 5).map((pref) => (
                <div key={pref.serviceId} className="flex justify-between items-center">
                  <span>{pref.serviceName}</span>
                  <span className="text-sm text-muted-foreground">{pref.count} {t('customers.statistics.times') || 'times'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worker Preferences */}
      {statistics.workerPreferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.statistics.workerPreferences') || 'Worker Preferences'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.workerPreferences.slice(0, 5).map((pref) => (
                <div key={pref.workerId} className="flex justify-between items-center">
                  <span>{pref.workerName}</span>
                  <span className="text-sm text-muted-foreground">{pref.count} {t('customers.statistics.times') || 'times'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

