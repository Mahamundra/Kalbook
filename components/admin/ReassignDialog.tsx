'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Worker {
  id: string;
  name: string;
  active: boolean;
}

interface ReassignDialogProps {
  appointmentId: string;
  currentWorkerId: string;
  serviceId: string;
  workers: Worker[];
  onReassigned?: () => void;
  children?: React.ReactNode;
}

export function ReassignDialog({
  appointmentId,
  currentWorkerId,
  serviceId,
  workers,
  onReassigned,
  children,
}: ReassignDialogProps) {
  const { t, isRTL } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(currentWorkerId);
  const [saving, setSaving] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    // Filter workers who can provide this service
    // For now, we'll show all active workers - service validation happens on backend
    setAvailableWorkers(workers.filter(w => w.active && w.id !== currentWorkerId));
  }, [workers, currentWorkerId, serviceId]);

  const handleReassign = async () => {
    if (!selectedWorkerId || selectedWorkerId === currentWorkerId) {
      toast.error(t('reassign.selectDifferentWorker') || 'Please select a different worker');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/appointments/${appointmentId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: selectedWorkerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('reassign.success') || 'Appointment reassigned successfully');
        setIsOpen(false);
        onReassigned?.();
      } else {
        toast.error(data.error || 'Failed to reassign appointment');
      }
    } catch (error) {
      console.error('Failed to reassign appointment:', error);
      toast.error('Failed to reassign appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reassign.title') || 'Reassign Appointment'}</DialogTitle>
          <DialogDescription>
            {t('reassign.description') || 'Assign this appointment to a different coach'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('reassign.selectCoach') || 'Select Coach'}</Label>
            <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder={t('reassign.selectCoach') || 'Select coach'} />
              </SelectTrigger>
              <SelectContent>
                {availableWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableWorkers.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('reassign.noAvailableWorkers') || 'No other coaches available for this service'}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleReassign} disabled={saving || !selectedWorkerId || selectedWorkerId === currentWorkerId}>
            {saving ? (t('common.saving') || 'Saving...') : (t('reassign.reassign') || 'Reassign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
