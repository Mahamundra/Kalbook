"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Pencil, Trash2, Plus, Calendar } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Trainer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  active: boolean;
  color: string;
  specializations?: string[];
  google_calendar_id?: string;
}

const defaultFormData = {
  name: '',
  email: '',
  phone: '',
  active: true,
  color: '#3B82F6',
  specializations: [] as string[],
};

export default function StudioKubiyotTrainersPage() {
  const { t, isRTL } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrainerId, setEditingTrainerId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchTrainers();
  }, []);

  const { localeReady } = useDirection();

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/studio-kubiyot/admin/trainers');
      const data = await response.json();
      if (data.success) {
        setTrainers(data.trainers || []);
      } else {
        toast.error(data.error || 'Failed to load trainers');
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
      toast.error('Failed to load trainers');
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
    if (confirm(t('studioKubiyot.admin.confirmDeleteTrainer') || 'Are you sure you want to delete this trainer?')) {
      try {
        setLoading(true);
        const response = await fetch(`/api/studio-kubiyot/admin/trainers/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          toast.success(t('studioKubiyot.admin.trainerDeleted') || 'Trainer deleted');
          fetchTrainers();
        } else {
          toast.error(data.error || 'Failed to delete trainer');
        }
      } catch (error) {
        console.error('Failed to delete trainer:', error);
        toast.error('Failed to delete trainer');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreate = () => {
    setEditingTrainerId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (trainer: Trainer) => {
    setEditingTrainerId(trainer.id);
    setFormData({
      name: trainer.name,
      email: trainer.email || '',
      phone: trainer.phone || '',
      active: trainer.active,
      color: trainer.color || '#3B82F6',
      specializations: trainer.specializations || [],
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingTrainerId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('studioKubiyot.admin.trainerNameRequired') || 'Trainer name is required');
      return;
    }

    try {
      const url = editingTrainerId 
        ? `/api/studio-kubiyot/admin/trainers/${editingTrainerId}`
        : '/api/studio-kubiyot/admin/trainers';
      const method = editingTrainerId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingTrainerId 
          ? (t('studioKubiyot.admin.trainerUpdated') || 'Trainer updated')
          : (t('studioKubiyot.admin.trainerCreated') || 'Trainer created')
        );
        fetchTrainers();
        handleClose();
      } else {
        toast.error(data.error || 'Failed to save trainer');
      }
    } catch (error) {
      console.error('Failed to save trainer:', error);
      toast.error('Failed to save trainer');
    }
  };

  const handleToggleActive = async (trainerId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/studio-kubiyot/admin/trainers/${trainerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('studioKubiyot.admin.trainerUpdated') || 'Trainer updated');
        fetchTrainers();
      } else {
        toast.error(data.error || 'Failed to update trainer');
      }
    } catch (error) {
      console.error('Failed to update trainer:', error);
      toast.error('Failed to update trainer');
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('studioKubiyot.admin.trainerName') || 'Name',
    },
    {
      key: 'email',
      label: t('studioKubiyot.admin.email') || 'Email',
      render: (trainer: Trainer) => trainer.email || '-',
    },
    {
      key: 'phone',
      label: t('studioKubiyot.admin.phone') || 'Phone',
      render: (trainer: Trainer) => trainer.phone || '-',
    },
    {
      key: 'active',
      label: t('studioKubiyot.admin.status') || 'Status',
      render: (trainer: Trainer) => (
        <Badge variant={trainer.active ? 'default' : 'secondary'}>
          {trainer.active ? (t('studioKubiyot.admin.active') || 'Active') : (t('studioKubiyot.admin.inactive') || 'Inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: t('common.actions') || 'Actions',
      render: (trainer: Trainer) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(trainer)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(trainer.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Switch
            checked={trainer.active}
            onCheckedChange={() => handleToggleActive(trainer.id, trainer.active)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('studioKubiyot.admin.trainers') || 'Trainers'}
        description={t('studioKubiyot.admin.trainersDescription') || 'Manage your trainers'}
        action={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('studioKubiyot.admin.addTrainer') || 'Add Trainer'}
          </Button>
        }
      />

      <DataTable
        data={trainers}
        columns={columns}
        loading={loading}
        searchable={true}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingTrainerId 
                  ? (t('studioKubiyot.admin.editTrainer') || 'Edit Trainer')
                  : (t('studioKubiyot.admin.addTrainer') || 'Add Trainer')
                }
              </DialogTitle>
              <DialogDescription>
                {t('studioKubiyot.admin.trainerFormDescription') || 'Enter trainer information'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">{t('studioKubiyot.admin.trainerName') || 'Name'} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">{t('studioKubiyot.admin.email') || 'Email'}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('studioKubiyot.admin.phone') || 'Phone'}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="color">{t('studioKubiyot.admin.color') || 'Color'}</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
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
                {editingTrainerId 
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

