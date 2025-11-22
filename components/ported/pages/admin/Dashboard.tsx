import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ported/admin/PageHeader';
import { MetricCard } from '@/components/ported/admin/MetricCard';
import { ScheduleList } from '@/components/ported/admin/ScheduleList';
import { getMetrics, getTodaysSchedule } from '@/components/ported/lib/mockData';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { toast } from 'sonner';
import { Clock, TrendingUp, ArrowRight, ArrowLeft } from 'lucide-react';
import type { ScheduleItem } from '@/types/admin';

const Dashboard = () => {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const pathname = usePathname();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [canViewAnalytics, setCanViewAnalytics] = useState(true);
  
  // Detect if we're on slug-based admin route
  const slugMatch = pathname?.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const basePath = businessSlug ? `/b/${businessSlug}/admin` : '/admin';
  
  useEffect(() => {
    const loadSchedule = () => {
      setSchedule(getTodaysSchedule());
    };
    
    loadSchedule();
    
    const handleAppointmentUpdate = () => {
      loadSchedule();
    };
    
    window.addEventListener('appointmentUpdated', handleAppointmentUpdate);
    window.addEventListener('appointmentDeleted', handleAppointmentUpdate);
    
    const interval = setInterval(loadSchedule, 60000);
    
    return () => {
      window.removeEventListener('appointmentUpdated', handleAppointmentUpdate);
      window.removeEventListener('appointmentDeleted', handleAppointmentUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetch('/api/admin/feature-check?feature=view_analytics')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCanViewAnalytics(data.canPerform);
        }
      })
      .catch(error => {
        console.error('Error checking feature:', error);
      });
  }, []);
  
  const metrics = getMetrics(t);

  const handleViewDetails = (id: string) => {
    toast.info(t('dashboard.bookingDetailsComingSoon'), { 
      description: t('dashboard.bookingId').replace('{id}', id)
    });
  };

  return (
    <div dir={dir} className="space-y-6 pb-20 md:pb-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('dashboard.title') || 'Dashboard'}</h1>
        <p className="text-muted-foreground">
          {t('dashboard.welcome') || 'Welcome back! Here\'s what\'s happening today.'}
        </p>
      </div>

      {/* Analytics Section */}
      {canViewAnalytics ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('dashboard.analytics') || 'Analytics'}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>{t('dashboard.overview') || 'Overview'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              {t('dashboard.analyticsNotAvailable') || 'Analytics are not available on your current plan.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.upgradeForAnalytics') || 'Upgrade to Professional or Business plan to view analytics and insights.'}
            </p>
          </div>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t('dashboard.todaysSchedule') || 'Today\'s Schedule'}
              </CardTitle>
              <CardDescription className="mt-1">
                {t('dashboard.todaysScheduleDesc') || 'Your appointments for today'}
              </CardDescription>
            </div>
            <Link href={`${basePath}/calendar`}>
              <Button variant="outline" size="sm" className="gap-2">
                {t('dashboard.viewFullCalendar') || 'View Full Calendar'}
                {isRTL ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ScheduleList items={schedule} onViewDetails={handleViewDetails} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
