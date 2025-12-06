'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { toast } from 'sonner';

interface AddMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSuccess: () => void;
}

export function AddMeasurementDialog({
  open,
  onOpenChange,
  customerId,
  onSuccess,
}: AddMeasurementDialogProps) {
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    measured_at: new Date().toISOString().slice(0, 16),
    weight: '',
    height: '',
    body_fat_percentage: '',
    muscle_mass: '',
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Build custom measurements object
      const customMeasurements: Record<string, number> = {};
      if (formData.chest) customMeasurements.chest = parseFloat(formData.chest);
      if (formData.waist) customMeasurements.waist = parseFloat(formData.waist);
      if (formData.hips) customMeasurements.hips = parseFloat(formData.hips);
      if (formData.arms) customMeasurements.arms = parseFloat(formData.arms);
      if (formData.thighs) customMeasurements.thighs = parseFloat(formData.thighs);

      const response = await fetch(`/api/customers/${customerId}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measured_at: new Date(formData.measured_at).toISOString(),
          weight: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null,
          body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : null,
          muscle_mass: formData.muscle_mass ? parseFloat(formData.muscle_mass) : null,
          measurements: Object.keys(customMeasurements).length > 0 ? customMeasurements : null,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('measurements.measurementCreated') || 'Measurement added successfully');
        // Reset form
        setFormData({
          measured_at: new Date().toISOString().slice(0, 16),
          weight: '',
          height: '',
          body_fat_percentage: '',
          muscle_mass: '',
          chest: '',
          waist: '',
          hips: '',
          arms: '',
          thighs: '',
          notes: '',
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to add measurement');
      }
    } catch (error) {
      console.error('Failed to add measurement:', error);
      toast.error('Failed to add measurement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            {t('measurements.addMeasurement') || 'Add Measurement'}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            {t('measurements.addDescription') || 'Record a new body measurement for this client.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="measured_at">{t('measurements.measuredAt') || 'Measured At'} *</Label>
            <Input
              id="measured_at"
              type="datetime-local"
              value={formData.measured_at}
              onChange={(e) => setFormData({ ...formData, measured_at: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">{t('measurements.weight') || 'Weight'} (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="height">{t('measurements.height') || 'Height'} (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.01"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="body_fat_percentage">{t('measurements.bodyFat') || 'Body Fat'} (%)</Label>
              <Input
                id="body_fat_percentage"
                type="number"
                step="0.01"
                value={formData.body_fat_percentage}
                onChange={(e) => setFormData({ ...formData, body_fat_percentage: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="muscle_mass">{t('measurements.muscleMass') || 'Muscle Mass'} (kg)</Label>
              <Input
                id="muscle_mass"
                type="number"
                step="0.01"
                value={formData.muscle_mass}
                onChange={(e) => setFormData({ ...formData, muscle_mass: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">{t('measurements.customMeasurements') || 'Custom Measurements'} (cm)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="chest" className="text-xs">{t('measurements.chest') || 'Chest'}</Label>
                <Input
                  id="chest"
                  type="number"
                  step="0.01"
                  value={formData.chest}
                  onChange={(e) => setFormData({ ...formData, chest: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="waist" className="text-xs">{t('measurements.waist') || 'Waist'}</Label>
                <Input
                  id="waist"
                  type="number"
                  step="0.01"
                  value={formData.waist}
                  onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="hips" className="text-xs">{t('measurements.hips') || 'Hips'}</Label>
                <Input
                  id="hips"
                  type="number"
                  step="0.01"
                  value={formData.hips}
                  onChange={(e) => setFormData({ ...formData, hips: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="arms" className="text-xs">{t('measurements.arms') || 'Arms'}</Label>
                <Input
                  id="arms"
                  type="number"
                  step="0.01"
                  value={formData.arms}
                  onChange={(e) => setFormData({ ...formData, arms: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="thighs" className="text-xs">{t('measurements.thighs') || 'Thighs'}</Label>
                <Input
                  id="thighs"
                  type="number"
                  step="0.01"
                  value={formData.thighs}
                  onChange={(e) => setFormData({ ...formData, thighs: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="notes">{t('measurements.notes') || 'Notes'}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder={t('measurements.notesPlaceholder') || 'Additional notes about this measurement...'}
            />
          </div>
          <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('measurements.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (t('measurements.saving') || 'Saving...') : (t('measurements.addMeasurement') || 'Add Measurement')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

