"use client";

import { useState, useEffect } from 'react';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { PageHeader } from '@/components/ported/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';
import { 
  FileText, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ported/ui/alert-dialog';

interface ActivityLog {
  id: string;
  activityType: string;
  createdBy: string;
  status: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: any;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  appointment: {
    id: string;
    start: string;
    end: string;
    status: string;
    serviceName: string;
    workerName: string;
  } | null;
}

const ActivityLogs = () => {
  const { t, locale, isRTL } = useLocale();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activityType, setActivityType] = useState<string>('all');
  const [customerId, setCustomerId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Actions
  const [rejectingLogId, setRejectingLogId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [logToReject, setLogToReject] = useState<ActivityLog | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        createdBy: 'customer', // Only show customer-created logs
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (activityType && activityType !== 'all') params.append('activityType', activityType);
      if (customerId) params.append('customerId', customerId);
      if (status) params.append('status', status);

      const response = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        toast.error(data.error || t('activityLogs.fetchError') || 'Failed to fetch activity logs');
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error(t('activityLogs.fetchError') || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchLogs();
    }
  }, [mounted, page, limit]);

  // Real-time polling every 30 seconds
  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(() => {
      fetchLogs();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [mounted, page, limit, startDate, endDate, activityType, customerId, status]);

  const handleApprove = async (logId: string) => {
    try {
      const response = await fetch(`/api/activity-logs/${logId}/approve-reschedule`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('activityLogs.approved') || 'Reschedule request approved');
        fetchLogs(); // Refresh logs
      } else {
        toast.error(data.error || t('activityLogs.approveError') || 'Failed to approve reschedule request');
      }
    } catch (error) {
      console.error('Error approving reschedule:', error);
      toast.error(t('activityLogs.approveError') || 'Failed to approve reschedule request');
    }
  };

  const handleReject = async () => {
    if (!logToReject) return;

    setRejectingLogId(logToReject.id);
    try {
      const response = await fetch(`/api/activity-logs/${logToReject.id}/reject-reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: t('activityLogs.rejectMessage') || "We're sorry but we could not change the date. If you can't arrive, please cancel.",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('activityLogs.rejected') || 'Reschedule request rejected');
        setShowRejectDialog(false);
        setLogToReject(null);
        fetchLogs(); // Refresh logs
      } else {
        toast.error(data.error || t('activityLogs.rejectError') || 'Failed to reject reschedule request');
      }
    } catch (error) {
      console.error('Error rejecting reschedule:', error);
      toast.error(t('activityLogs.rejectError') || 'Failed to reject reschedule request');
    } finally {
      setRejectingLogId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const localeMap: Record<string, string> = {
      en: 'en-US',
      he: 'he-IL',
      ar: 'ar-SA',
      ru: 'ru-RU'
    };
    const localeString = localeMap[locale] || 'en-US';
    return date.toLocaleDateString(localeString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      appointment_created: t('activityLogs.appointmentCreated') || 'Appointment Created',
      appointment_cancelled: t('activityLogs.appointmentCancelled') || 'Appointment Cancelled',
      reschedule_requested: t('activityLogs.rescheduleRequested') || 'Reschedule Requested',
      reschedule_approved: t('activityLogs.rescheduleApproved') || 'Reschedule Approved',
      reschedule_rejected: t('activityLogs.rescheduleRejected') || 'Reschedule Rejected',
    };
    return labels[type] || type;
  };

  const getActivityTypeBadgeVariant = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      appointment_created: 'default',
      appointment_cancelled: 'destructive',
      reschedule_requested: 'secondary',
      reschedule_approved: 'default',
      reschedule_rejected: 'destructive',
    };
    return variants[type] || 'default';
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      completed: 'default',
    };

    const labels: Record<string, string> = {
      pending: t('activityLogs.pending') || 'Pending',
      approved: t('activityLogs.approved') || 'Approved',
      rejected: t('activityLogs.rejected') || 'Rejected',
      completed: t('activityLogs.completed') || 'Completed',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when filters change
    fetchLogs();
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActivityType('all');
    setCustomerId('');
    setStatus('');
    setPage(1);
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={t('activityLogs.title') || 'Appointment Activity Logs'}
        description={t('activityLogs.description') || 'View all customer appointment activities including bookings, cancellations, and reschedule requests'}
      />

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-semibold">{t('activityLogs.filters') || 'Filters'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label>{t('activityLogs.startDate') || 'Start Date'}</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('activityLogs.endDate') || 'End Date'}</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('activityLogs.type') || 'Type'}</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('activityLogs.all') || 'All'}</SelectItem>
                <SelectItem value="appointment_created">{t('activityLogs.appointmentCreated') || 'Appointment Created'}</SelectItem>
                <SelectItem value="appointment_cancelled">{t('activityLogs.appointmentCancelled') || 'Appointment Cancelled'}</SelectItem>
                <SelectItem value="reschedule_requested">{t('activityLogs.rescheduleRequested') || 'Reschedule Requested'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('activityLogs.status') || 'Status'}</Label>
            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('activityLogs.all') || 'All'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('activityLogs.all') || 'All'}</SelectItem>
                <SelectItem value="pending">{t('activityLogs.pending') || 'Pending'}</SelectItem>
                <SelectItem value="approved">{t('activityLogs.approved') || 'Approved'}</SelectItem>
                <SelectItem value="rejected">{t('activityLogs.rejected') || 'Rejected'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              {t('activityLogs.apply') || 'Apply'}
            </Button>
            <Button variant="outline" onClick={handleClearFilters} title={t('activityLogs.clearFilters') || 'Clear Filters'}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h3 className="text-lg font-semibold">
              {t('activityLogs.logs') || 'Activity Logs'} ({total})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1); }}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('activityLogs.loading') || 'Loading...'}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('activityLogs.noLogsFound') || 'No activity logs found'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className={`text-left p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('activityLogs.type') || 'Type'}</th>
                    <th className={`text-left p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('activityLogs.customer') || 'Customer'}</th>
                    <th className={`text-left p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('activityLogs.service') || 'Service'}</th>
                    <th className={`text-left p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('activityLogs.worker') || 'Worker'}</th>
                    <th className={`text-left p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('activityLogs.dateTime') || 'Date & Time'}</th>
                    <th className={`text-left p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('activityLogs.status') || 'Status'}</th>
                    <th className={`text-left p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('activityLogs.actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const metadata = log.metadata || {};
                    const isRescheduleRequest = log.activityType === 'reschedule_requested' && log.status === 'pending';
                    const originalDate = metadata.originalStart ? new Date(metadata.originalStart) : null;
                    const requestedDate = metadata.requestedStart ? new Date(metadata.requestedStart) : null;

                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-3">
                          <Badge variant={getActivityTypeBadgeVariant(log.activityType)}>
                            {getActivityTypeLabel(log.activityType)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {log.customer ? (
                            <div>
                              <div className="font-medium">{log.customer.name}</div>
                              <div className="text-sm text-muted-foreground">{log.customer.email || log.customer.phone}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {metadata.serviceName || log.appointment?.serviceName || '-'}
                        </td>
                        <td className="p-3">
                          {metadata.workerName || log.appointment?.workerName || '-'}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            {isRescheduleRequest && originalDate && requestedDate ? (
                              <>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">{t('activityLogs.original') || 'Original'}: </span>
                                  {formatDate(originalDate.toISOString())}
                                </div>
                                <div className="text-sm font-medium">
                                  <span className="text-muted-foreground">{t('activityLogs.requested') || 'Requested'}: </span>
                                  {formatDate(requestedDate.toISOString())}
                                </div>
                              </>
                            ) : (
                              <div>
                                {log.appointment?.start 
                                  ? formatDate(log.appointment.start)
                                  : formatDate(log.createdAt)
                                }
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="p-3">
                          {isRescheduleRequest && (
                            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(log.id)}
                                className={isRTL ? 'flex-row-reverse' : ''}
                              >
                                <CheckCircle2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('activityLogs.approve') || 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setLogToReject(log);
                                  setShowRejectDialog(true);
                                }}
                                className={isRTL ? 'flex-row-reverse' : ''}
                              >
                                <XCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('activityLogs.reject') || 'Reject'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="text-sm text-muted-foreground">
                  {t('activityLogs.showing') || 'Showing'} {(page - 1) * limit + 1} - {Math.min(page * limit, total)} {t('activityLogs.of') || 'of'} {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={isRTL ? 'flex-row-reverse' : ''}
                  >
                    <ChevronLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('activityLogs.previous') || 'Previous'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={isRTL ? 'flex-row-reverse' : ''}
                  >
                    {t('activityLogs.next') || 'Next'}
                    <ChevronRight className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('activityLogs.rejectConfirm') || 'Reject Reschedule Request'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('activityLogs.rejectMessage') || "We're sorry but we could not change the date. If you can't arrive, please cancel."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel onClick={() => { setShowRejectDialog(false); setLogToReject(null); }}>
              {t('activityLogs.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rejectingLogId !== null}
            >
              {rejectingLogId ? (t('activityLogs.loading') || 'Loading...') : (t('activityLogs.reject') || 'Reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActivityLogs;

