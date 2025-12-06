'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { formatDate } from '@/lib/i18n';
import { Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AddMeasurementDialog } from './AddMeasurementDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Measurement {
  id: string;
  customer_id: string;
  business_id: string;
  measured_at: string;
  weight: number | null;
  height: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  measurements: Record<string, any> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientMeasurementsProps {
  customerId: string;
}

export function ClientMeasurements({ customerId }: ClientMeasurementsProps) {
  const { t, locale } = useLocale();
  const { isRTL } = useDirection();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [measurementToDelete, setMeasurementToDelete] = useState<Measurement | null>(null);

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}/measurements`);
      const data = await response.json();
      if (data.success) {
        setMeasurements(data.measurements || []);
      } else {
        toast.error(data.error || 'Failed to load measurements');
      }
    } catch (error) {
      console.error('Failed to fetch measurements:', error);
      toast.error('Failed to load measurements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchMeasurements();
    }
  }, [customerId]);

  const handleDelete = async () => {
    if (!measurementToDelete) return;

    try {
      const response = await fetch(`/api/customers/${customerId}/measurements/${measurementToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('measurements.measurementDeleted') || 'Measurement deleted successfully');
        fetchMeasurements();
        setDeleteConfirmOpen(false);
        setMeasurementToDelete(null);
      } else {
        toast.error(data.error || 'Failed to delete measurement');
      }
    } catch (error) {
      console.error('Failed to delete measurement:', error);
      toast.error('Failed to delete measurement');
    }
  };

  const handleEdit = (measurement: Measurement) => {
    setEditingMeasurement(measurement);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (formData: any) => {
    if (!editingMeasurement) return;

    try {
      const response = await fetch(`/api/customers/${customerId}/measurements/${editingMeasurement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('measurements.measurementUpdated') || 'Measurement updated successfully');
        fetchMeasurements();
        setIsEditDialogOpen(false);
        setEditingMeasurement(null);
      } else {
        toast.error(data.error || 'Failed to update measurement');
      }
    } catch (error) {
      console.error('Failed to update measurement:', error);
      toast.error('Failed to update measurement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className={`text-sm font-semibold text-muted-foreground uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('measurements.title') || 'Measurements'}
        </h3>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="sm"
          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {t('measurements.addMeasurement') || 'Add Measurement'}
        </Button>
      </div>

      {measurements.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-lg">{t('measurements.noMeasurements') || 'No measurements found'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {measurements.map((measurement) => (
            <Card key={measurement.id} className="overflow-hidden">
              <div className={`flex items-start justify-between border-b bg-muted/30 px-4 py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <h4 className="font-semibold text-base">
                    {formatDate(measurement.measured_at, locale)}
                  </h4>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMeasurementToDelete(measurement);
                      setDeleteConfirmOpen(true);
                    }}
                    className="h-8 w-8 p-0"
                    title={t('measurements.deleteMeasurement') || 'Delete Measurement'}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(measurement)}
                    className="h-8 w-8 p-0"
                    title={t('measurements.editMeasurement') || 'Edit Measurement'}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {/* Basic Measurements */}
                  {(measurement.weight !== null || measurement.height !== null || 
                    measurement.body_fat_percentage !== null || measurement.muscle_mass !== null) && (
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                        {t('measurements.basicMeasurements') || 'Basic Measurements'}
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {measurement.weight !== null && (
                          <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="text-xs text-muted-foreground">
                              {t('measurements.weight') || 'Weight'}
                            </div>
                            <div className="text-base font-semibold">
                              {measurement.weight} <span className="text-sm font-normal text-muted-foreground">kg</span>
                            </div>
                          </div>
                        )}
                        {measurement.height !== null && (
                          <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="text-xs text-muted-foreground">
                              {t('measurements.height') || 'Height'}
                            </div>
                            <div className="text-base font-semibold">
                              {measurement.height} <span className="text-sm font-normal text-muted-foreground">cm</span>
                            </div>
                          </div>
                        )}
                        {measurement.body_fat_percentage !== null && (
                          <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="text-xs text-muted-foreground">
                              {t('measurements.bodyFat') || 'Body Fat'}
                            </div>
                            <div className="text-base font-semibold">
                              {measurement.body_fat_percentage} <span className="text-sm font-normal text-muted-foreground">%</span>
                            </div>
                          </div>
                        )}
                        {measurement.muscle_mass !== null && (
                          <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="text-xs text-muted-foreground">
                              {t('measurements.muscleMass') || 'Muscle Mass'}
                            </div>
                            <div className="text-base font-semibold">
                              {measurement.muscle_mass} <span className="text-sm font-normal text-muted-foreground">kg</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Measurements */}
                  {measurement.measurements && Object.keys(measurement.measurements).length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                        {t('measurements.customMeasurements') || 'Custom Measurements'}
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        {Object.entries(measurement.measurements).map(([key, value]) => {
                          // Get translated label for common measurement keys
                          const getMeasurementLabel = (measurementKey: string) => {
                            const keyMap: Record<string, string> = {
                              'chest': t('measurements.chestLabel') || t('measurements.chest') || 'Chest',
                              'waist': t('measurements.waistLabel') || t('measurements.waist') || 'Waist',
                              'hips': t('measurements.hipsLabel') || t('measurements.hips') || 'Hips',
                              'arms': t('measurements.armsLabel') || t('measurements.arms') || 'Arms',
                              'thighs': t('measurements.thighsLabel') || t('measurements.thighs') || 'Thighs',
                            };
                            return keyMap[measurementKey.toLowerCase()] || measurementKey;
                          };
                          
                          return (
                            <div key={key} className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                              <div className="text-xs text-muted-foreground">
                                {getMeasurementLabel(key)}
                              </div>
                              <div className="text-base font-semibold">
                                {value} <span className="text-sm font-normal text-muted-foreground">cm</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {measurement.notes && (
                    <div className={`pt-2 border-t ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        {t('measurements.notes') || 'Notes'}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {measurement.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMeasurementDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        customerId={customerId}
        onSuccess={fetchMeasurements}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
              {t('measurements.editMeasurement') || 'Edit Measurement'}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('measurements.editDescription') || 'Update the measurement details below.'}
            </DialogDescription>
          </DialogHeader>
          {editingMeasurement && (
            <EditMeasurementForm
              measurement={editingMeasurement}
              onSave={handleUpdate}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingMeasurement(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
              {t('measurements.deleteConfirm') || 'Delete Measurement'}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('measurements.deleteConfirmMessage') || 'Are you sure you want to delete this measurement? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t('measurements.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('measurements.delete') || 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditMeasurementFormProps {
  measurement: Measurement;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function EditMeasurementForm({ measurement, onSave, onCancel }: EditMeasurementFormProps) {
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [formData, setFormData] = useState({
    measured_at: measurement.measured_at ? new Date(measurement.measured_at).toISOString().slice(0, 16) : '',
    weight: measurement.weight?.toString() || '',
    height: measurement.height?.toString() || '',
    body_fat_percentage: measurement.body_fat_percentage?.toString() || '',
    muscle_mass: measurement.muscle_mass?.toString() || '',
    chest: measurement.measurements?.chest?.toString() || '',
    waist: measurement.measurements?.waist?.toString() || '',
    hips: measurement.measurements?.hips?.toString() || '',
    arms: measurement.measurements?.arms?.toString() || '',
    thighs: measurement.measurements?.thighs?.toString() || '',
    notes: measurement.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customMeasurements: Record<string, number> = {};
    if (formData.chest) customMeasurements.chest = parseFloat(formData.chest);
    if (formData.waist) customMeasurements.waist = parseFloat(formData.waist);
    if (formData.hips) customMeasurements.hips = parseFloat(formData.hips);
    if (formData.arms) customMeasurements.arms = parseFloat(formData.arms);
    if (formData.thighs) customMeasurements.thighs = parseFloat(formData.thighs);

    onSave({
      measured_at: new Date(formData.measured_at).toISOString(),
      weight: formData.weight ? parseFloat(formData.weight) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : null,
      muscle_mass: formData.muscle_mass ? parseFloat(formData.muscle_mass) : null,
      measurements: Object.keys(customMeasurements).length > 0 ? customMeasurements : null,
      notes: formData.notes || null,
    });
  };

  return (
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
        />
      </div>
      <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('measurements.cancel') || 'Cancel'}
        </Button>
        <Button type="submit">
          {t('measurements.updateMeasurement') || 'Update Measurement'}
        </Button>
      </DialogFooter>
    </form>
  );
}

