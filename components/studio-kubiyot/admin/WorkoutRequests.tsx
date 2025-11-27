"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Check, X, Calendar, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';

interface WorkoutRequest {
  id: string;
  customer_id: string;
  customer_name?: string;
  trainer_id?: string;
  trainer_name?: string;
  workout_type_id: string;
  workout_type_name?: string;
  preferred_date: string;
  preferred_time: string;
  alternative_dates?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes?: string;
  admin_notes?: string;
  requested_at: string;
}

export default function StudioKubiyotWorkoutRequestsPage() {
  const { t, isRTL } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<WorkoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<WorkoutRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchRequests();
  }, [statusFilter]);

  const { localeReady } = useDirection();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all' 
        ? '/api/studio-kubiyot/admin/workout-requests'
        : `/api/studio-kubiyot/admin/workout-requests?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        toast.error(data.error || 'Failed to load workout requests');
      }
    } catch (error) {
      console.error('Failed to fetch workout requests:', error);
      toast.error('Failed to load workout requests');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !localeReady) {
    return (
      <div className="border rounded-lg p-12 flex flex-col items-center justify-center space-y-4">
        <div className="relative mx-auto w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" style={{ animationDuration: '0.8s' }}></div>
        </div>
        <p className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/studio-kubiyot/admin/workout-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('studioKubiyot.admin.requestApproved') || 'Request approved and appointment created');
        fetchRequests();
        setIsApproveDialogOpen(false);
        setSelectedRequest(null);
        setAdminNotes('');
      } else {
        toast.error(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/studio-kubiyot/admin/workout-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('studioKubiyot.admin.requestRejected') || 'Request rejected');
        fetchRequests();
        setIsRejectDialogOpen(false);
        setSelectedRequest(null);
        setAdminNotes('');
      } else {
        toast.error(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {t(`studioKubiyot.admin.status.${status}`) || status}
      </Badge>
    );
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date);
    return `${dateObj.toLocaleDateString()} ${time}`;
  };

  const columns = [
    {
      key: 'customer_name',
      label: t('studioKubiyot.admin.client') || 'Client',
      render: (request: WorkoutRequest) => request.customer_name || '-',
    },
    {
      key: 'workout_type_name',
      label: t('studioKubiyot.admin.workoutType') || 'Workout Type',
      render: (request: WorkoutRequest) => request.workout_type_name || '-',
    },
    {
      key: 'trainer_name',
      label: t('studioKubiyot.admin.trainer') || 'Trainer',
      render: (request: WorkoutRequest) => request.trainer_name || t('studioKubiyot.admin.anyTrainer') || 'Any',
    },
    {
      key: 'preferred_date',
      label: t('studioKubiyot.admin.preferredDate') || 'Preferred Date',
      render: (request: WorkoutRequest) => formatDateTime(request.preferred_date, request.preferred_time),
    },
    {
      key: 'status',
      label: t('studioKubiyot.admin.status') || 'Status',
      render: (request: WorkoutRequest) => getStatusBadge(request.status),
    },
    {
      key: 'actions',
      label: t('common.actions') || 'Actions',
      render: (request: WorkoutRequest) => (
        <div className="flex gap-2">
          {request.status === 'pending' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setIsApproveDialogOpen(true);
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                {t('studioKubiyot.admin.approve') || 'Approve'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setIsRejectDialogOpen(true);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                {t('studioKubiyot.admin.reject') || 'Reject'}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('studioKubiyot.admin.workoutRequests') || 'Workout Requests'}
        description={t('studioKubiyot.admin.workoutRequestsDescription') || 'Manage workout requests from clients'}
      />

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('studioKubiyot.admin.filterByStatus') || 'Filter by status'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('studioKubiyot.admin.allStatuses') || 'All Statuses'}</SelectItem>
            <SelectItem value="pending">{t('studioKubiyot.admin.status.pending') || 'Pending'}</SelectItem>
            <SelectItem value="approved">{t('studioKubiyot.admin.status.approved') || 'Approved'}</SelectItem>
            <SelectItem value="rejected">{t('studioKubiyot.admin.status.rejected') || 'Rejected'}</SelectItem>
            <SelectItem value="cancelled">{t('studioKubiyot.admin.status.cancelled') || 'Cancelled'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredRequests}
        columns={columns}
        loading={loading}
        searchKeys={['customer_name', 'workout_type_name', 'trainer_name']}
      />

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studioKubiyot.admin.approveRequest') || 'Approve Request'}</DialogTitle>
            <DialogDescription>
              {t('studioKubiyot.admin.approveRequestDescription') || 'This will create an appointment for the requested workout.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('studioKubiyot.admin.client') || 'Client'}</Label>
                <p className="text-sm font-medium">{selectedRequest.customer_name}</p>
              </div>
              <div>
                <Label>{t('studioKubiyot.admin.workoutType') || 'Workout Type'}</Label>
                <p className="text-sm font-medium">{selectedRequest.workout_type_name}</p>
              </div>
              <div>
                <Label>{t('studioKubiyot.admin.preferredDate') || 'Preferred Date'}</Label>
                <p className="text-sm font-medium">{formatDateTime(selectedRequest.preferred_date, selectedRequest.preferred_time)}</p>
              </div>
              <div>
                <Label htmlFor="adminNotes">{t('studioKubiyot.admin.adminNotes') || 'Admin Notes (optional)'}</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder={t('studioKubiyot.admin.adminNotesPlaceholder') || 'Add any notes about this approval...'}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsApproveDialogOpen(false);
              setSelectedRequest(null);
              setAdminNotes('');
            }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleApprove}>
              <Check className="h-4 w-4 mr-2" />
              {t('studioKubiyot.admin.approve') || 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studioKubiyot.admin.rejectRequest') || 'Reject Request'}</DialogTitle>
            <DialogDescription>
              {t('studioKubiyot.admin.rejectRequestDescription') || 'Are you sure you want to reject this request?'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('studioKubiyot.admin.client') || 'Client'}</Label>
                <p className="text-sm font-medium">{selectedRequest.customer_name}</p>
              </div>
              <div>
                <Label htmlFor="rejectNotes">{t('studioKubiyot.admin.rejectionReason') || 'Rejection Reason (optional)'}</Label>
                <Textarea
                  id="rejectNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder={t('studioKubiyot.admin.rejectionReasonPlaceholder') || 'Explain why this request is being rejected...'}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsRejectDialogOpen(false);
              setSelectedRequest(null);
              setAdminNotes('');
            }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="h-4 w-4 mr-2" />
              {t('studioKubiyot.admin.reject') || 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

