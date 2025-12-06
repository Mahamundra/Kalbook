'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';

interface AttendanceMarkerProps {
  appointmentId: string;
  attended?: boolean;
  noShow?: boolean;
  attendanceNotes?: string | null;
  onUpdate?: () => void;
}

export function AttendanceMarker({ 
  appointmentId, 
  attended = false, 
  noShow = false,
  attendanceNotes,
  onUpdate 
}: AttendanceMarkerProps) {
  const { t, isRTL } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [attendedState, setAttendedState] = useState(attended);
  const [noShowState, setNoShowState] = useState(noShow);
  const [notes, setNotes] = useState(attendanceNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/appointments/${appointmentId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attended: attendedState,
          no_show: noShowState,
          attendance_notes: notes,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('attendance.updated') || 'Attendance updated successfully');
        setIsDialogOpen(false);
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast.error('Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    if (attended) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {t('attendance.attended') || 'Attended'}
        </Badge>
      );
    }
    if (noShow) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          {t('attendance.noShow') || 'No Show'}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        {t('attendance.pending') || 'Pending'}
      </Badge>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        {getStatusBadge()}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('attendance.markAttendance') || 'Mark Attendance'}</DialogTitle>
            <DialogDescription>
              {t('attendance.markDescription') || 'Update attendance status for this session'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="attended">{t('attendance.attended') || 'Attended'}</Label>
              <Switch
                id="attended"
                checked={attendedState}
                onCheckedChange={(checked) => {
                  setAttendedState(checked);
                  if (checked) {
                    setNoShowState(false);
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="noShow">{t('attendance.noShow') || 'No Show'}</Label>
              <Switch
                id="noShow"
                checked={noShowState}
                onCheckedChange={(checked) => {
                  setNoShowState(checked);
                  if (checked) {
                    setAttendedState(false);
                  }
                }}
              />
            </div>
            <div>
              <Label>{t('attendance.notes') || 'Notes'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('attendance.notesPlaceholder') || 'Additional notes about attendance...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
