'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { formatDate } from '@/components/ported/lib/i18n';
import { Plus, Pencil, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

interface TrainingSummary {
  id: string;
  appointment_id: string;
  summary: string;
  exercises_performed: any[];
  notes: string | null;
  created_at: string;
}

interface TrainingSummaryProps {
  appointmentId: string;
  onUpdate?: () => void;
}

export function TrainingSummary({ appointmentId, onUpdate }: TrainingSummaryProps) {
  const { t, locale, isRTL } = useLocale();
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    summary: '',
    exercises_performed: [] as string[],
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [exerciseInput, setExerciseInput] = useState('');

  useEffect(() => {
    fetchSummary();
  }, [appointmentId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/appointments/${appointmentId}/summary`);
      const data = await response.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
        setFormData({
          summary: data.summary.summary || '',
          exercises_performed: data.summary.exercises_performed || [],
          notes: data.summary.notes || '',
        });
      } else {
        setSummary(null);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = () => {
    if (exerciseInput.trim()) {
      setFormData({
        ...formData,
        exercises_performed: [...formData.exercises_performed, exerciseInput.trim()],
      });
      setExerciseInput('');
    }
  };

  const handleRemoveExercise = (index: number) => {
    setFormData({
      ...formData,
      exercises_performed: formData.exercises_performed.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!formData.summary.trim()) {
      toast.error('Please enter a summary');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/appointments/${appointmentId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Training summary saved successfully');
        setIsDialogOpen(false);
        fetchSummary();
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to save summary');
      }
    } catch (error) {
      console.error('Failed to save summary:', error);
      toast.error('Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className={`text-sm font-semibold text-muted-foreground uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('trainingSummary.title') || 'Training Summary'}
        </h3>
        <Button
          onClick={() => setIsDialogOpen(true)}
          size="sm"
          variant={summary ? 'outline' : 'default'}
          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {summary ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {summary ? (t('trainingSummary.edit') || 'Edit') : (t('trainingSummary.add') || 'Add Summary')}
        </Button>
      </div>

      {summary ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('trainingSummary.summary') || 'Summary'}</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{summary.summary}</p>
            </div>
            {summary.exercises_performed && summary.exercises_performed.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">{t('trainingSummary.exercises') || 'Exercises Performed'}</Label>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  {summary.exercises_performed.map((exercise, index) => (
                    <li key={index} className="text-sm">{exercise}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">{t('trainingSummary.notes') || 'Notes'}</Label>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{summary.notes}</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {formatDate(summary.created_at, locale)}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {t('trainingSummary.noSummary') || 'No training summary yet'}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{summary ? (t('trainingSummary.editSummary') || 'Edit Summary') : (t('trainingSummary.addSummary') || 'Add Training Summary')}</DialogTitle>
            <DialogDescription>
              {t('trainingSummary.description') || 'Record details about this training session'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('trainingSummary.summary') || 'Summary'} *</Label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder={t('trainingSummary.summaryPlaceholder') || 'Describe the training session...'}
                rows={5}
              />
            </div>
            <div>
              <Label>{t('trainingSummary.exercises') || 'Exercises Performed'}</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={exerciseInput}
                  onChange={(e) => setExerciseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExercise();
                    }
                  }}
                  placeholder={t('trainingSummary.exercisePlaceholder') || 'Add exercise...'}
                />
                <Button type="button" onClick={handleAddExercise} size="sm">
                  {t('common.add') || 'Add'}
                </Button>
              </div>
              {formData.exercises_performed.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.exercises_performed.map((exercise, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      <span>{exercise}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>{t('trainingSummary.notes') || 'Additional Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('trainingSummary.notesPlaceholder') || 'Any additional notes...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.summary.trim()}>
              {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

