'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { formatDate } from '@/components/ported/lib/i18n';
import { Plus, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';

interface FollowUp {
  id: string;
  type: 'check_in' | 'reengagement' | 'assessment' | 'custom';
  scheduled_for: string;
  status: 'pending' | 'completed' | 'cancelled' | 'skipped';
  notes: string | null;
  completed_at: string | null;
}

interface FollowUpTrackerProps {
  customerId: string;
  onUpdate?: () => void;
}

export function FollowUpTracker({ customerId, onUpdate }: FollowUpTrackerProps) {
  const { t, locale, isRTL } = useLocale();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'check_in' as FollowUp['type'],
    scheduled_for: '',
    notes: '',
  });

  useEffect(() => {
    fetchFollowUps();
  }, [customerId]);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}/follow-ups`);
      const data = await response.json();
      if (data.success) {
        setFollowUps(data.followUps || []);
      }
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.scheduled_for) {
      toast.error('Please select a date');
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Follow-up scheduled successfully');
        setIsCreateDialogOpen(false);
        setFormData({ type: 'check_in', scheduled_for: '', notes: '' });
        fetchFollowUps();
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to schedule follow-up');
      }
    } catch (error) {
      console.error('Failed to create follow-up:', error);
      toast.error('Failed to schedule follow-up');
    }
  };

  const handleStatusChange = async (followUpId: string, status: FollowUp['status']) => {
    try {
      const response = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Follow-up updated');
        fetchFollowUps();
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to update follow-up');
      }
    } catch (error) {
      console.error('Failed to update follow-up:', error);
      toast.error('Failed to update follow-up');
    }
  };

  const getStatusBadge = (status: FollowUp['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'skipped':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Skipped</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  const pendingFollowUps = followUps.filter(f => f.status === 'pending').sort((a, b) => 
    new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
  );
  const completedFollowUps = followUps.filter(f => f.status === 'completed').sort((a, b) => 
    new Date(b.completed_at || b.scheduled_for).getTime() - new Date(a.completed_at || a.scheduled_for).getTime()
  );

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className={`text-sm font-semibold text-muted-foreground uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('followUps.title') || 'Follow-Ups'}
        </h3>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          size="sm"
          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {t('followUps.schedule') || 'Schedule Follow-Up'}
        </Button>
      </div>

      {pendingFollowUps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('followUps.pending') || 'Pending'}</h4>
          {pendingFollowUps.map((followUp) => (
            <div key={followUp.id} className="border rounded-lg p-3">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''} mb-2`}>
                <div>
                  <p className="font-medium text-sm capitalize">{followUp.type.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(followUp.scheduled_for, locale)}
                  </p>
                </div>
                {getStatusBadge(followUp.status)}
              </div>
              {followUp.notes && (
                <p className="text-xs text-muted-foreground mt-2">{followUp.notes}</p>
              )}
              <div className={`flex gap-2 mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(followUp.id, 'completed')}
                >
                  {t('followUps.markComplete') || 'Mark Complete'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(followUp.id, 'cancelled')}
                >
                  {t('followUps.cancel') || 'Cancel'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedFollowUps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('followUps.completed') || 'Completed'}</h4>
          {completedFollowUps.slice(0, 5).map((followUp) => (
            <div key={followUp.id} className="border rounded-lg p-3">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="font-medium text-sm capitalize">{followUp.type.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(followUp.completed_at || followUp.scheduled_for, locale)}
                  </p>
                </div>
                {getStatusBadge(followUp.status)}
              </div>
              {followUp.notes && (
                <p className="text-xs text-muted-foreground mt-2">{followUp.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {followUps.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t('followUps.noFollowUps') || 'No follow-ups scheduled'}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('followUps.scheduleFollowUp') || 'Schedule Follow-Up'}</DialogTitle>
            <DialogDescription>
              {t('followUps.scheduleDescription') || 'Schedule a follow-up with this client'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('followUps.type') || 'Type'}</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as FollowUp['type'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check_in">{t('followUps.checkIn') || 'Check In'}</SelectItem>
                  <SelectItem value="reengagement">{t('followUps.reengagement') || 'Reengagement'}</SelectItem>
                  <SelectItem value="assessment">{t('followUps.assessment') || 'Assessment'}</SelectItem>
                  <SelectItem value="custom">{t('followUps.custom') || 'Custom'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('followUps.scheduledFor') || 'Scheduled For'}</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('followUps.notes') || 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleCreate}>
              {t('common.schedule') || 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
