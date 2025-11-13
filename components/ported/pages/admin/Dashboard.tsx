import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/PageHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { ScheduleList } from '@/components/admin/ScheduleList';
import { getMetrics, getTodaysSchedule } from '@/components/ported/lib/mockData';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { toast } from 'sonner';
import type { ScheduleItem } from '@/types/admin';

const Dashboard = () => {
  const { t } = useLocale();
  const pathname = usePathname();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [canViewAnalytics, setCanViewAnalytics] = useState(true); // Default to true to avoid blocking
  
  // Detect if we're on slug-based admin route
  const slugMatch = pathname?.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const basePath = businessSlug ? `/b/${businessSlug}/admin` : '/admin';
  
  useEffect(() => {
    // Load today's schedule from actual appointments
    const loadSchedule = () => {
      setSchedule(getTodaysSchedule());
    };
    
    loadSchedule();
    
    // Listen for appointment updates
    const handleAppointmentUpdate = () => {
      loadSchedule();
    };
    
    window.addEventListener('appointmentUpdated', handleAppointmentUpdate);
    window.addEventListener('appointmentDeleted', handleAppointmentUpdate);
    
    // Also refresh periodically (every minute) to catch date changes
    const interval = setInterval(loadSchedule, 60000);
    
    return () => {
      window.removeEventListener('appointmentUpdated', handleAppointmentUpdate);
      window.removeEventListener('appointmentDeleted', handleAppointmentUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Check feature access for viewing analytics
    fetch('/api/admin/feature-check?feature=view_analytics')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCanViewAnalytics(data.canPerform);
        }
      })
      .catch(error => {
        console.error('Error checking feature:', error);
        // Default to true if check fails to avoid blocking unnecessarily
      });
  }, []);
  
  const metrics = getMetrics(t);

  const handleViewDetails = (id: string) => {
    toast.info(t('dashboard.bookingDetailsComingSoon'), { 
      description: t('dashboard.bookingId').replace('{id}', id)
    });
  };

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.welcome')}
      />

      {canViewAnalytics ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
      ) : (
        <Card className="p-6 mb-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              Analytics are not available on your current plan.
            </p>
            <p className="text-sm text-muted-foreground">
              Upgrade to Professional or Business plan to view analytics and insights.
            </p>
          </div>
        </Card>
      )}

      <Card className="p-6 shadow-card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">{t('dashboard.todaysSchedule')}</h3>
          <Link href={`${basePath}/calendar`}>
            <Button variant="outline" size="sm">
              {t('dashboard.viewFullCalendar')}
            </Button>
          </Link>
        </div>
        <ScheduleList items={schedule} onViewDetails={handleViewDetails} />
      </Card>
    </div>
  );
};

export default Dashboard;
