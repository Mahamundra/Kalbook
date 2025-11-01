import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { getWorkers, deleteWorker, createWorker, updateWorker, getServices } from '@/components/ported/lib/mockData';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Worker, Service } from '@/types/admin';
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
import { Checkbox } from '@/components/ported/ui/checkbox';

function ActiveSwitchField({ formData, setFormData, t }: { 
  formData: { active: boolean; name: string; email: string; phone: string; services: string[] }; 
  setFormData: React.Dispatch<React.SetStateAction<typeof defaultFormData>>; 
  t: (key: string) => string 
}) {
  const { isRTL } = useLocale();
  
  return (
    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <Label htmlFor="active" className="cursor-pointer">{t('workers.active')}</Label>
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
  email: '',
  phone: '',
  services: [] as string[],
  active: true,
};

const Workers = () => {
  const { t } = useLocale();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editingWorkerName, setEditingWorkerName] = useState<string>('');
  const [formData, setFormData] = useState(defaultFormData);
  
  useEffect(() => {
    setWorkers(getWorkers());
    setServices(getServices());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm(t('workers.confirmDelete'))) {
      deleteWorker(id);
      setWorkers(getWorkers());
      toast.success(t('workers.workerDeleted'));
    }
  };

  const handleCreate = () => {
    setEditingWorkerId(null);
    setEditingWorkerName('');
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorkerId(worker.id);
    setEditingWorkerName(worker.name);
    setFormData({
      name: worker.name,
      email: worker.email || '',
      phone: worker.phone || '',
      services: worker.services || [],
      active: worker.active,
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingWorkerId(null);
    setEditingWorkerName('');
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('workers.required'));
      return;
    }

    if (formData.services.length === 0) {
      toast.error(t('workers.atLeastOneService'));
      return;
    }

    if (editingWorkerId) {
      updateWorker(editingWorkerId, formData);
      toast.success(t('workers.workerUpdated'));
    } else {
      createWorker(formData);
      toast.success(t('workers.workerCreated'));
    }
    
    setWorkers(getWorkers());
    handleClose();
  };

  const handleToggleActive = (workerId: string, currentActive: boolean) => {
    updateWorker(workerId, { active: !currentActive });
    setWorkers(getWorkers());
    toast.success(t('workers.workerUpdated'));
  };

  const handleServiceToggle = (serviceId: string) => {
    const currentServices = formData.services;
    if (currentServices.includes(serviceId)) {
      setFormData({
        ...formData,
        services: currentServices.filter(id => id !== serviceId),
      });
    } else {
      setFormData({
        ...formData,
        services: [...currentServices, serviceId],
      });
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('workers.name'),
    },
    {
      key: 'email',
      label: t('workers.email'),
      render: (worker: Worker) => worker.email || '-',
    },
    {
      key: 'phone',
      label: t('workers.phone'),
      render: (worker: Worker) => worker.phone || '-',
    },
    {
      key: 'services',
      label: t('workers.services'),
      render: (worker: Worker) => {
        const workerServices = services.filter(s => worker.services.includes(s.id));
        if (workerServices.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1">
            {workerServices.slice(0, 3).map((s) => (
              <Badge key={s.id} variant="secondary" className="text-xs">
                {s.name}
              </Badge>
            ))}
            {workerServices.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{workerServices.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'active',
      label: t('workers.active'),
      render: (worker: Worker) => {
        return (
          <div className="flex items-center justify-center">
            <Switch
              checked={worker.active}
              onCheckedChange={() => handleToggleActive(worker.id, worker.active)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: t('workers.actions'),
      render: (worker: Worker) => {
        const { isRTL } = useLocale();
        return (
          <div className={`flex gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(worker);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(worker.id);
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
        title={t('workers.title')}
        action={
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 me-2" />
            {t('workers.create')}
          </Button>
        }
      />

      <DataTable
        data={workers}
        columns={columns}
        searchable
        searchPlaceholder={t('workers.search')}
        emptyMessage="No workers found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWorkerId 
                ? t('workers.editWorkerTitle').replace('{name}', editingWorkerName)
                : t('workers.createWorker')}
            </DialogTitle>
            <DialogDescription>
              {editingWorkerId 
                ? t('workers.editDescription')
                : t('workers.createDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">{t('workers.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('workers.name')}
                />
              </div>

              <div>
                <Label htmlFor="email">{t('workers.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('workers.email')}
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('workers.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('workers.phone')}
                />
              </div>

              <div className="md:col-span-2">
                <Label>{t('workers.selectServices')} *</Label>
                <div className="mt-2 border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('workers.noServicesSelected')}</p>
                  ) : (
                    services.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={formData.services.includes(service.id)}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                        />
                        <Label
                          htmlFor={`service-${service.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {service.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {formData.services.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.services.length} {t('workers.services').toLowerCase()} {t('workers.assignedServices').toLowerCase()}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <ActiveSwitchField formData={formData} setFormData={setFormData} t={t} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('workers.cancel')}
              </Button>
              <Button type="submit">
                {editingWorkerId ? t('workers.updateWorker') : t('workers.addWorker')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workers;

