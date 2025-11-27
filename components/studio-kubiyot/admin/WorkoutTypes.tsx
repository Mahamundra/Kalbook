"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import { Switch } from '@/components/ui/switch';

interface WorkoutType {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  active: boolean;
  category?: string;
}

const defaultFormData = {
  name: '',
  description: '',
  duration: 60,
  price: 0,
  active: true,
  category: 'Training',
};

export default function StudioKubiyotWorkoutTypesPage() {
  const { t, isRTL } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkoutTypeId, setEditingWorkoutTypeId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchWorkoutTypes();
  }, []);

  const { localeReady } = useDirection();

  const fetchWorkoutTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/studio-kubiyot/admin/workout-types');
      const data = await response.json();
      if (data.success) {
        setWorkoutTypes(data.workoutTypes || []);
      } else {
        toast.error(data.error || 'Failed to load workout types');
      }
    } catch (error) {
      console.error('Failed to fetch workout types:', error);
      toast.error('Failed to load workout types');
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

  const handleDelete = async (id: string) => {
    if (confirm(t('studioKubiyot.admin.confirmDeleteWorkoutType') || 'Are you sure you want to delete this workout type?')) {
      try {
        setLoading(true);
        const response = await fetch(`/api/studio-kubiyot/admin/workout-types/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          toast.success(t('studioKubiyot.admin.workoutTypeDeleted') || 'Workout type deleted');
          fetchWorkoutTypes();
        } else {
          toast.error(data.error || 'Failed to delete workout type');
        }
      } catch (error) {
        console.error('Failed to delete workout type:', error);
        toast.error('Failed to delete workout type');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreate = () => {
    setEditingWorkoutTypeId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (workoutType: WorkoutType) => {
    setEditingWorkoutTypeId(workoutType.id);
    setFormData({
      name: workoutType.name,
      description: workoutType.description || '',
      duration: workoutType.duration,
      price: workoutType.price,
      active: workoutType.active,
      category: workoutType.category || 'Training',
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingWorkoutTypeId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('studioKubiyot.admin.workoutTypeNameRequired') || 'Workout type name is required');
      return;
    }

    if (formData.duration < 1) {
      toast.error('Duration must be at least 1 minute');
      return;
    }

    if (formData.price < 0) {
      toast.error('Price cannot be negative');
      return;
    }

    try {
      const url = editingWorkoutTypeId 
        ? `/api/studio-kubiyot/admin/workout-types/${editingWorkoutTypeId}`
        : '/api/studio-kubiyot/admin/workout-types';
      const method = editingWorkoutTypeId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingWorkoutTypeId 
          ? (t('studioKubiyot.admin.workoutTypeUpdated') || 'Workout type updated')
          : (t('studioKubiyot.admin.workoutTypeCreated') || 'Workout type created')
        );
        fetchWorkoutTypes();
        handleClose();
      } else {
        toast.error(data.error || 'Failed to save workout type');
      }
    } catch (error) {
      console.error('Failed to save workout type:', error);
      toast.error('Failed to save workout type');
    }
  };

  const handleToggleActive = async (workoutTypeId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/studio-kubiyot/admin/workout-types/${workoutTypeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('studioKubiyot.admin.workoutTypeUpdated') || 'Workout type updated');
        fetchWorkoutTypes();
      } else {
        toast.error(data.error || 'Failed to update workout type');
      }
    } catch (error) {
      console.error('Failed to update workout type:', error);
      toast.error('Failed to update workout type');
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('studioKubiyot.admin.workoutTypeName') || 'Name',
    },
    {
      key: 'duration',
      label: t('studioKubiyot.admin.duration') || 'Duration',
      render: (workoutType: WorkoutType) => {
        const minutes = t('common.minutes') || 'min';
        return isRTL ? `${workoutType.duration} ${minutes}` : `${minutes} ${workoutType.duration}`;
      },
    },
    {
      key: 'price',
      label: t('studioKubiyot.admin.price') || 'Price',
      render: (workoutType: WorkoutType) => `₪${workoutType.price}`,
    },
    {
      key: 'active',
      label: t('studioKubiyot.admin.status') || 'Status',
      render: (workoutType: WorkoutType) => (
        <Badge variant={workoutType.active ? 'default' : 'secondary'}>
          {workoutType.active ? (t('studioKubiyot.admin.active') || 'Active') : (t('studioKubiyot.admin.inactive') || 'Inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: t('common.actions') || 'Actions',
      render: (workoutType: WorkoutType) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(workoutType)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(workoutType.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Switch
            checked={workoutType.active}
            onCheckedChange={() => handleToggleActive(workoutType.id, workoutType.active)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('studioKubiyot.admin.workoutTypes') || 'Workout Types'}
        description={t('studioKubiyot.admin.workoutTypesDescription') || 'Manage your workout types'}
        action={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('studioKubiyot.admin.addWorkoutType') || 'Add Workout Type'}
          </Button>
        }
      />

      <DataTable
        data={workoutTypes}
        columns={columns}
        loading={loading}
        searchable={true}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingWorkoutTypeId 
                  ? (t('studioKubiyot.admin.editWorkoutType') || 'Edit Workout Type')
                  : (t('studioKubiyot.admin.addWorkoutType') || 'Add Workout Type')
                }
              </DialogTitle>
              <DialogDescription>
                {t('studioKubiyot.admin.workoutTypeFormDescription') || 'Enter workout type information'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">{t('studioKubiyot.admin.workoutTypeName') || 'Name'} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t('studioKubiyot.admin.description') || 'Description'}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">{t('studioKubiyot.admin.duration') || 'Duration (minutes)'} *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price">{t('studioKubiyot.admin.price') || 'Price (₪)'} *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">{t('studioKubiyot.admin.active') || 'Active'}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit">
                {editingWorkoutTypeId 
                  ? (t('common.save') || 'Save')
                  : (t('common.create') || 'Create')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

