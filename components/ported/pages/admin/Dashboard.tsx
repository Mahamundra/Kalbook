import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ported/admin/PageHeader';
import { MetricCard } from '@/components/ported/admin/MetricCard';
import { ScheduleList } from '@/components/ported/admin/ScheduleList';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useBusinessType } from '@/lib/hooks/useBusinessType';
import { ClientMonitoring } from '@/components/admin/ClientMonitoring';
import { toast } from 'sonner';
import { Clock, TrendingUp, ArrowRight, ArrowLeft, Loader2, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ported/ui/dialog';
import { Switch } from '@/components/ported/ui/switch';
import { Label } from '@/components/ported/ui/label';
import type { ScheduleItem, Metric } from '@/types/admin';

interface DashboardMetricsData {
  todaysBookings: number;
  thisWeekBookings: number;
  revenueMTD: string;
  noShowRate: string;
  todaysSchedule: ScheduleItem[];
  totalCustomers: number;
  newCustomersThisMonth: number;
  returningCustomersRate: string;
  averageVisitsPerCustomer: string;
  activeCustomers: number;
  confirmedRate: string;
  pendingCount: number;
  upcomingAppointments: number;
  cancellationRate: string;
  groupAppointmentsCount: number;
  averageAppointmentsPerDay: string;
  mostPopularService: { name: string; count: number } | null;
  revenueByService: Array<{ name: string; revenue: string }>;
  averageServicePrice: string;
  mostBookedWorker: { name: string; count: number } | null;
  workerUtilization: Array<{ name: string; appointments: number }>;
  revenuePerWorker: Array<{ name: string; revenue: string }>;
  reminderDeliveryRate: string;
  reminderImpact: { sent: string; notSent: string };
  failedReminders: number;
  weekOverWeekGrowth: string;
  monthOverMonthGrowth: string;
  bookingTrend: 'up' | 'down' | 'neutral';
  revenueThisWeek: string;
  averageBookingValue: string;
  peakHours: string;
}

const METRICS_STORAGE_KEY = 'kalbook-dashboard-metrics-visibility';

interface MetricVisibility {
  [key: string]: boolean;
}

const Dashboard = () => {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const pathname = usePathname();
  const businessType = useBusinessType();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [canViewAnalytics, setCanViewAnalytics] = useState(true);
  const [metricsData, setMetricsData] = useState<DashboardMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [metricVisibility, setMetricVisibility] = useState<MetricVisibility>({});
  
  // Detect if we're on slug-based admin route
  const slugMatch = pathname?.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const basePath = businessSlug ? `/b/${businessSlug}/admin` : '/admin';
  
  // Define all metric keys
  const ALL_METRIC_KEYS = [
    'todaysBookings', 'revenueMTD', 'totalCustomers', 'upcomingAppointments',
    'thisWeekBookings', 'confirmedRate', 'mostPopularService', 'reminderDeliveryRate',
    'weekOverWeekGrowth', 'averageBookingValue', 'returningCustomersRate', 'mostBookedWorker',
    'revenueThisWeek', 'newCustomersThisMonth', 'activeCustomers', 'averageAppointmentsPerDay',
    'cancellationRate', 'groupAppointments', 'peakHours', 'averageServicePrice'
  ];
  
  // Most important metrics to show by default
  const DEFAULT_VISIBLE_METRICS = [
    'todaysBookings',        // Today's Bookings - essential daily metric
    'revenueMTD',            // Revenue MTD - key business metric
    'totalCustomers',        // Total Customers - important customer base metric
    'upcomingAppointments',  // Upcoming - what's coming next
    'thisWeekBookings',      // This Week - recent activity
    'confirmedRate',         // Confirmed Rate - appointment health
    'revenueThisWeek',       // Revenue This Week - weekly performance
    'newCustomersThisMonth', // New Customers - growth indicator
  ];
  
  // Load metric visibility preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(METRICS_STORAGE_KEY);
      if (stored) {
        setMetricVisibility(JSON.parse(stored));
      } else {
        // Default: only most important metrics visible
        const defaultVisibility: MetricVisibility = {};
        ALL_METRIC_KEYS.forEach(key => {
          defaultVisibility[key] = DEFAULT_VISIBLE_METRICS.includes(key);
        });
        setMetricVisibility(defaultVisibility);
        localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(defaultVisibility));
      }
    } catch (error) {
      console.error('Error loading metric visibility preferences:', error);
    }
  }, []);
  
  // Save metric visibility preferences to localStorage
  const saveMetricVisibility = (visibility: MetricVisibility) => {
    try {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(visibility));
      setMetricVisibility(visibility);
      toast.success(t('dashboard.metricsPreferencesSaved') || 'Metrics preferences saved');
    } catch (error) {
      console.error('Error saving metric visibility preferences:', error);
      toast.error(t('dashboard.errorSavingPreferences') || 'Error saving preferences');
    }
  };
  
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/dashboard/metrics');
        const data = await response.json();
        
        if (data.success && data.metrics) {
          setMetricsData(data.metrics);
          // Convert schedule format
          const scheduleItems: ScheduleItem[] = (data.metrics.todaysSchedule || []).map((item: any) => ({
            id: item.id,
            time: new Date(item.start).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            service: item.service,
            customer: item.customer,
            staff: item.worker,
          }));
          setSchedule(scheduleItems);
        } else {
          setError(data.error || 'Failed to load metrics');
        }
      } catch (err: any) {
        console.error('Error loading metrics:', err);
        setError(err.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    
    loadMetrics();
    
    const handleAppointmentUpdate = () => {
      loadMetrics();
    };
    
    window.addEventListener('appointmentUpdated', handleAppointmentUpdate);
    window.addEventListener('appointmentDeleted', handleAppointmentUpdate);
    
    const interval = setInterval(loadMetrics, 60000);
    
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

  const handleViewDetails = (id: string) => {
    toast.info(t('dashboard.bookingDetailsComingSoon'), { 
      description: t('dashboard.bookingId').replace('{id}', id)
    });
  };

  // Convert metrics data to Metric format for MetricCard with keys for visibility control
  interface MetricWithKey extends Metric {
    key: string;
  }
  
  // Get all metrics (for dialog editing)
  const getAllMetrics = (): MetricWithKey[] => {
    if (!metricsData) return [];
    
    // Helper to safely parse percentage strings
    const parsePercentage = (value: string): number => {
      if (!value || value === 'N/A') return 0;
      const parsed = parseFloat(value.replace('%', '').replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };
    
    const metrics: MetricWithKey[] = [];
    
    // Row 1: Today's Bookings, Revenue MTD, Total Customers, Upcoming Appointments
    metrics.push({
      key: 'todaysBookings',
      label: t('dashboard.todaysBookings') || 'Today\'s Bookings',
      value: metricsData.todaysBookings,
      change: '',
      trend: 'neutral'
    });
    
    metrics.push({
      key: 'revenueMTD',
      label: t('dashboard.revenueMTD') || 'Revenue (MTD)',
      value: metricsData.revenueMTD || '0',
      change: metricsData.monthOverMonthGrowth ? `${metricsData.monthOverMonthGrowth} ${t('dashboard.vsLastMonth') || 'vs last month'}` : '',
      trend: parsePercentage(metricsData.monthOverMonthGrowth || '0') >= 0 ? 'up' : 'down'
    });
    
    metrics.push({
      key: 'totalCustomers',
      label: t('dashboard.totalCustomers') || 'Total Customers',
      value: metricsData.totalCustomers,
      change: metricsData.newCustomersThisMonth > 0 ? `+${metricsData.newCustomersThisMonth} ${t('dashboard.newCustomersThisMonth') || 'this month'}` : '',
      trend: metricsData.newCustomersThisMonth > 0 ? 'up' : 'neutral'
    });
    
    metrics.push({
      key: 'upcomingAppointments',
      label: t('dashboard.upcomingAppointments') || 'Upcoming',
      value: metricsData.upcomingAppointments,
      change: '',
      trend: 'neutral'
    });
    
    // Row 2: This Week Bookings, Confirmed Rate, Most Popular Service, Reminder Delivery Rate
    metrics.push({
      key: 'thisWeekBookings',
      label: t('dashboard.thisWeek') || 'This Week',
      value: metricsData.thisWeekBookings,
      change: metricsData.weekOverWeekGrowth ? `${metricsData.weekOverWeekGrowth} ${t('dashboard.vsLastWeek') || 'vs last week'}` : '',
      trend: metricsData.bookingTrend
    });
    
    metrics.push({
      key: 'confirmedRate',
      label: t('dashboard.confirmedRate') || 'Confirmed Rate',
      value: metricsData.confirmedRate || '0%',
      change: `${metricsData.pendingCount || 0} ${t('dashboard.pendingCount') || 'pending'}`,
      trend: parsePercentage(metricsData.confirmedRate || '0') >= 80 ? 'up' : 'neutral'
    });
    
    metrics.push({
      key: 'mostPopularService',
      label: t('dashboard.mostPopularService') || 'Most Popular Service',
      value: metricsData.mostPopularService ? metricsData.mostPopularService.name : t('dashboard.noData') || 'N/A',
      change: metricsData.mostPopularService ? `${metricsData.mostPopularService.count} ${t('dashboard.appointments') || 'appointments'}` : '',
      trend: 'neutral'
    });
    
    metrics.push({
      key: 'reminderDeliveryRate',
      label: t('dashboard.reminderDeliveryRate') || 'Reminder Delivery',
      value: metricsData.reminderDeliveryRate || '0%',
      change: (metricsData.failedReminders || 0) > 0 ? `${metricsData.failedReminders} ${t('dashboard.failedReminders') || 'failed'}` : '',
      trend: parsePercentage(metricsData.reminderDeliveryRate || '0') >= 90 ? 'up' : 'neutral'
    });
    
    // Row 3: Week-over-Week Growth, Average Booking Value, Returning Customers Rate, Most Booked Worker
    metrics.push({
      key: 'weekOverWeekGrowth',
      label: t('dashboard.weekOverWeekGrowth') || 'Week Growth',
      value: metricsData.weekOverWeekGrowth,
      change: '',
      trend: metricsData.bookingTrend
    });
    
    metrics.push({
      key: 'averageBookingValue',
      label: t('dashboard.averageBookingValue') || 'Avg Booking Value',
      value: metricsData.averageBookingValue,
      change: '',
      trend: 'neutral'
    });
    
    metrics.push({
      key: 'returningCustomersRate',
      label: t('dashboard.returningCustomersRate') || 'Returning Customers',
      value: metricsData.returningCustomersRate || '0%',
      change: '',
      trend: parsePercentage(metricsData.returningCustomersRate || '0') >= 30 ? 'up' : 'neutral'
    });
    
    metrics.push({
      key: 'mostBookedWorker',
      label: t('dashboard.mostBookedWorker') || 'Most Booked Worker',
      value: metricsData.mostBookedWorker ? metricsData.mostBookedWorker.name : t('dashboard.noData') || 'N/A',
      change: metricsData.mostBookedWorker ? `${metricsData.mostBookedWorker.count} ${t('dashboard.appointments') || 'appointments'}` : '',
      trend: 'neutral'
    });
    
    // Row 4: Revenue This Week, New Customers This Month, Active Customers, Average Appointments Per Day
    metrics.push({
      key: 'revenueThisWeek',
      label: t('dashboard.revenueThisWeek') || 'Revenue (This Week)',
      value: metricsData.revenueThisWeek,
      change: '',
      trend: 'neutral'
    });
    
    metrics.push({
      key: 'newCustomersThisMonth',
      label: t('dashboard.newCustomersThisMonth') || 'New This Month',
      value: metricsData.newCustomersThisMonth,
      change: '',
      trend: metricsData.newCustomersThisMonth > 0 ? 'up' : 'neutral'
    });
    
    metrics.push({
      key: 'activeCustomers',
      label: t('dashboard.activeCustomers') || 'Active Customers',
      value: metricsData.activeCustomers,
      change: `${t('dashboard.last30Days') || 'last 30 days'}`,
      trend: 'neutral'
    });
    
    metrics.push({
      key: 'averageAppointmentsPerDay',
      label: t('dashboard.averageAppointmentsPerDay') || 'Avg/Day',
      value: metricsData.averageAppointmentsPerDay,
      change: '',
      trend: 'neutral'
    });
    
    // Row 5: Cancellation Rate, Group Appointments, Peak Hours, Average Service Price
    metrics.push({
      key: 'cancellationRate',
      label: t('dashboard.cancellationRate') || 'Cancellation Rate',
      value: metricsData.cancellationRate || '0%',
      change: '',
      trend: parsePercentage(metricsData.cancellationRate || '0') <= 10 ? 'up' : 'down'
    });
    
    metrics.push({
      key: 'groupAppointments',
      label: t('dashboard.groupAppointments') || 'Group Appointments',
      value: metricsData.groupAppointmentsCount,
      change: '',
      trend: 'neutral'
    });
    
    metrics.push({
      key: 'peakHours',
      label: t('dashboard.peakHours') || 'Peak Hours',
      value: metricsData.peakHours,
      change: '',
      trend: 'neutral'
    });
    
    metrics.push({
      key: 'averageServicePrice',
      label: t('dashboard.averageServicePrice') || 'Avg Service Price',
      value: metricsData.averageServicePrice,
      change: '',
      trend: 'neutral'
    });
    
    return metrics;
  };
  
  // Helper to check if metric is visible (defaults to true if not set)
  const isMetricVisible = (key: string): boolean => {
    return metricVisibility[key] !== false;
  };
  
  // Get filtered metrics for display
  const getMetricsForDisplay = (): MetricWithKey[] => {
    return getAllMetrics().filter(metric => isMetricVisible(metric.key));
  };

  const displayMetrics = getMetricsForDisplay();

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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>{t('dashboard.overview') || 'Overview'}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="gap-2"
              >
                <Settings2 className="w-4 h-4" />
                {t('dashboard.editMetrics') || 'Edit'}
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="p-6">
              <div className="text-center">
                <p className="text-destructive mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Row 1: Today's Bookings, Revenue MTD, Total Customers, Upcoming Appointments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayMetrics.slice(0, 4).map((metric, index) => {
                  const { key, ...metricProps } = metric;
                  return <MetricCard key={`row1-${index}`} {...metricProps} />;
                })}
              </div>
              
              {/* Row 2: This Week Bookings, Confirmed Rate, Most Popular Service, Reminder Delivery Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayMetrics.slice(4, 8).map((metric, index) => {
                  const { key, ...metricProps } = metric;
                  return <MetricCard key={`row2-${index}`} {...metricProps} />;
                })}
              </div>
              
              {/* Row 3: Week-over-Week Growth, Average Booking Value, Returning Customers Rate, Most Booked Worker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayMetrics.slice(8, 12).map((metric, index) => {
                  const { key, ...metricProps } = metric;
                  return <MetricCard key={`row3-${index}`} {...metricProps} />;
                })}
              </div>
              
              {/* Row 4: Revenue This Week, New Customers This Month, Active Customers, Average Appointments Per Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayMetrics.slice(12, 16).map((metric, index) => {
                  const { key, ...metricProps } = metric;
                  return <MetricCard key={`row4-${index}`} {...metricProps} />;
                })}
              </div>
              
              {/* Row 5: Cancellation Rate, Group Appointments, Peak Hours, Average Service Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayMetrics.slice(16, 20).map((metric, index) => {
                  const { key, ...metricProps } = metric;
                  return <MetricCard key={`row5-${index}`} {...metricProps} />;
                })}
              </div>
            </>
          )}
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScheduleList items={schedule} onViewDetails={handleViewDetails} />
          )}
        </CardContent>
      </Card>

      {/* Client Monitoring (gym_trainer only) */}
      {businessType === 'gym_trainer' && (
        <ClientMonitoring businessType={businessType} />
      )}

      {/* Edit Metrics Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('dashboard.editMetrics') || 'Edit Metrics'}</DialogTitle>
            <DialogDescription>
              {t('dashboard.editMetricsDescription') || 'Toggle metrics to show or hide them on your dashboard.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {getAllMetrics().map((metric) => (
              <div
                key={metric.key}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Label htmlFor={`metric-${metric.key}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{metric.label}</div>
                  {metric.change && (
                    <div className="text-sm text-muted-foreground mt-1">{metric.change}</div>
                  )}
                </Label>
                <Switch
                  id={`metric-${metric.key}`}
                  checked={isMetricVisible(metric.key)}
                  onCheckedChange={(checked) => {
                    const newVisibility = { ...metricVisibility, [metric.key]: checked };
                    saveMetricVisibility(newVisibility);
                  }}
                />
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('dashboard.close') || 'Close'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Reset to default (only most important visible)
                const defaultVisibility: MetricVisibility = {};
                ALL_METRIC_KEYS.forEach(key => {
                  defaultVisibility[key] = DEFAULT_VISIBLE_METRICS.includes(key);
                });
                saveMetricVisibility(defaultVisibility);
              }}
            >
              {t('dashboard.resetToDefault') || 'Reset to Default'}
            </Button>
            <Button
              onClick={() => {
                // Show all metrics
                const allVisible: MetricVisibility = {};
                ALL_METRIC_KEYS.forEach(key => {
                  allVisible[key] = true;
                });
                saveMetricVisibility(allVisible);
              }}
            >
              {t('dashboard.showAll') || 'Show All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
