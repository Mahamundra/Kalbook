import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { getServices, deleteService, createService, updateService } from '@/components/ported/lib/mockData';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Service } from '@/types/admin';
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

function ActiveSwitchField({ formData, setFormData, t }: { 
  formData: { active: boolean; name: string; description: string; duration: number; price: number; taxRate: number }; 
  setFormData: React.Dispatch<React.SetStateAction<typeof defaultFormData>>; 
  t: (key: string) => string 
}) {
  const { isRTL } = useLocale();
  
  return (
    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <Label htmlFor="active" className="cursor-pointer">{t('services.active')}</Label>
      <Switch
        id="active"
        checked={formData.active}
        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
      />
    </div>
  );
}

const defaultFormData = {
  name: '',
  description: '',
  duration: 30,
  price: 0,
  taxRate: 17,
  active: true,
};

const Services = () => {
  const { t } = useLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<string>('Other');
  const [formData, setFormData] = useState(defaultFormData);
  
  useEffect(() => {
    setServices(getServices());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm(t('services.confirmDelete'))) {
      deleteService(id);
      setServices(getServices());
      toast.success(t('services.serviceDeleted'));
    }
  };

  const handleCreate = () => {
    setEditingServiceId(null);
    setEditingServiceName('');
    setEditingCategory('Other');
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingServiceId(service.id);
    setEditingServiceName(service.name);
    setEditingCategory(service.category);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      taxRate: service.taxRate,
      active: service.active,
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingServiceId(null);
    setEditingServiceName('');
    setEditingCategory('Other');
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('services.required'));
      return;
    }

    if (formData.duration < 1) {
      toast.error(t('services.min').replace('{value}', '1'));
      return;
    }

    if (formData.price < 0) {
      toast.error(t('services.min').replace('{value}', '0'));
      return;
    }

    if (editingServiceId) {
      updateService(editingServiceId, { ...formData, category: editingCategory });
      toast.success(t('services.serviceUpdated'));
    } else {
      createService({ ...formData, category: 'Other' });
      toast.success(t('services.serviceCreated'));
    }
    
    setServices(getServices());
    handleClose();
  };

  const handleToggleActive = (serviceId: string, currentActive: boolean) => {
    updateService(serviceId, { active: !currentActive });
    setServices(getServices());
    toast.success(t('services.serviceUpdated'));
  };

  const columns = [
    {
      key: 'name',
      label: t('services.name'),
    },
    {
      key: 'duration',
      label: t('services.duration'),
      render: (service: Service) => {
        const { isRTL } = useLocale();
        const minutes = t('services.minutes');
        return isRTL ? `${service.duration} ${minutes}` : `${minutes} ${service.duration}`;
      },
    },
    {
      key: 'price',
      label: t('services.price'),
      render: (service: Service) => `₪${service.price}`,
    },
    {
      key: 'active',
      label: t('services.active'),
      render: (service: Service) => {
        return (
          <div className="flex items-center justify-center">
            <Switch
              checked={service.active}
              onCheckedChange={() => handleToggleActive(service.id, service.active)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: t('services.actions'),
      render: (service: Service) => {
        const { isRTL } = useLocale();
        return (
          <div className={`flex gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(service);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(service.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('services.title')}
        action={
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 me-2" />
            {t('services.create')}
          </Button>
        }
      />

      <DataTable
        data={services}
        columns={columns}
        searchable
        searchPlaceholder={t('services.search')}
        emptyMessage="No services found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingServiceId 
                ? t('services.editServiceTitle').replace('{name}', editingServiceName)
                : t('services.createService')}
            </DialogTitle>
            <DialogDescription>
              {editingServiceId 
                ? t('services.editDescription')
                : t('services.createDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">{t('services.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('services.name')}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">{t('services.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('services.description')}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="duration">{t('services.durationMinutes')} *</Label>
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
                <Label htmlFor="price">{t('services.price')} (₪) *</Label>
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

              <div>
                <Label htmlFor="taxRate">{t('services.taxRatePercent')}</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="md:col-span-2">
                <ActiveSwitchField formData={formData} setFormData={setFormData} t={t} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('services.cancel')}
              </Button>
              <Button type="submit">
                {editingServiceId ? t('services.updateService') : t('services.addService')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
