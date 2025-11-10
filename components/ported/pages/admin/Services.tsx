import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { getServices, deleteService, createService, updateService } from '@/lib/api/services';
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
import { Checkbox } from '@/components/ported/ui/checkbox';

function ActiveSwitchField({ formData, setFormData, t }: { 
  formData: { active: boolean; name: string; description: string; duration: number; price: number; taxRate: number }; 
  setFormData: React.Dispatch<React.SetStateAction<typeof defaultFormData>>; 
  t: (key: string) => string 
}) {
  const { isRTL } = useLocale();
  const handleActiveChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, active: checked }));
  }, [setFormData]);
  
  return (
    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <Label htmlFor="active" className="cursor-pointer">{t('services.active')}</Label>
      <Switch
        id="active"
        checked={formData.active}
        onCheckedChange={handleActiveChange}
      />
    </div>
  );
}

const defaultFormData = {
  name: '',
  description: '',
  duration: 30,
  price: 0,
  taxRate: 18,
  active: true,
};

const Services = () => {
  const { t, isRTL } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<string>('Other');
  const [formData, setFormData] = useState(defaultFormData);
  const [isVatEditable, setIsVatEditable] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    setMounted(true);
    // Fetch services from API
    const fetchServices = async () => {
      try {
        setLoading(true);
        const data = await getServices();
        setServices(data);
      } catch (error) {
        console.error('Failed to fetch services:', error);
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);
  
  const { localeReady } = useDirection();
  
  // Don't render until mounted and locale is ready to avoid hydration mismatch
  if (!mounted || !localeReady) {
    return (
      <div className="border rounded-lg p-12 flex flex-col items-center justify-center space-y-4">
        <div className="relative mx-auto w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" style={{ animationDuration: '0.8s' }}></div>
        </div>
        <p className="text-sm text-muted-foreground">{localeReady ? (t('common.loading') || 'Loading...') : 'Loading...'}</p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('services.confirmDelete'))) {
      try {
        setLoading(true);
        await deleteService(id);
        const data = await getServices();
        setServices(data);
        toast.success(t('services.serviceDeleted'));
      } catch (error) {
        console.error('Failed to delete service:', error);
        toast.error('Failed to delete service');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreate = () => {
    setEditingServiceId(null);
    setEditingServiceName('');
    setEditingCategory('Other');
    setFormData(defaultFormData);
    setIsVatEditable(true);
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
      taxRate: service.taxRate || 18,
      active: service.active,
    });
    // Always allow editing by default
    setIsVatEditable(true);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingServiceId(null);
    setEditingServiceName('');
    setEditingCategory('Other');
    setFormData(defaultFormData);
    setIsVatEditable(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      if (editingServiceId) {
        await updateService(editingServiceId, { ...formData, category: editingCategory });
        toast.success(t('services.serviceUpdated'));
      } else {
        await createService({ ...formData, category: 'Other' });
        toast.success(t('services.serviceCreated'));
      }
      
      // Refresh services list
      setLoading(true);
      const data = await getServices();
      setServices(data);
      setLoading(false);
      handleClose();
    } catch (error) {
      console.error('Failed to save service:', error);
      toast.error(editingServiceId ? 'Failed to update service' : 'Failed to create service');
    }
  };

  const handleToggleActive = async (serviceId: string, currentActive: boolean) => {
    try {
      await updateService(serviceId, { active: !currentActive });
      const data = await getServices();
      setServices(data);
      toast.success(t('services.serviceUpdated'));
    } catch (error) {
      console.error('Failed to update service:', error);
      toast.error('Failed to update service');
    }
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
      key: 'actions',
      label: t('services.actions'),
      render: (service: Service) => {
        const { isRTL } = useLocale();
        return (
          <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
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
            <Switch
              checked={service.active}
              onCheckedChange={() => handleToggleActive(service.id, service.active)}
              onClick={(e) => e.stopPropagation()}
            />
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
        emptyMessage={t('services.noServicesFound')}
        loading={loading}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full">
          {/* Sticky Header */}
          <DialogHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
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
          
          {/* Scrollable Content */}
          <form ref={formRef} id="service-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                <div className="space-y-2">
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 18 })}
                    disabled={!isVatEditable}
                  />
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} ${isRTL ? 'justify-end' : 'justify-start'} gap-3`}>
                    {isRTL ? (
                      <>
                        <Label
                          htmlFor="vatEditable"
                          className="text-sm font-normal cursor-pointer"
                        >
                          {t('services.changeToOtherVatValue')}
                        </Label>
                        <Checkbox
                          id="vatEditable"
                          checked={isVatEditable}
                          onCheckedChange={(checked) => {
                            setIsVatEditable(checked as boolean);
                            if (!checked) {
                              // Reset to 18% when unchecking
                              setFormData({ ...formData, taxRate: 18 });
                            }
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <Checkbox
                          id="vatEditable"
                          checked={isVatEditable}
                          onCheckedChange={(checked) => {
                            setIsVatEditable(checked as boolean);
                            if (!checked) {
                              // Reset to 18% when unchecking
                              setFormData({ ...formData, taxRate: 18 });
                            }
                          }}
                        />
                        <Label
                          htmlFor="vatEditable"
                          className="text-sm font-normal cursor-pointer"
                        >
                          {t('services.changeToOtherVatValue')}
                        </Label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <ActiveSwitchField formData={formData} setFormData={setFormData} t={t} />
              </div>
            </div>
          </form>

          {/* Sticky Footer */}
          <DialogFooter className="p-6 pt-4 border-t sticky bottom-0 bg-background z-10">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('services.cancel')}
            </Button>
            <Button 
              type="button"
              onClick={() => {
                if (formRef.current) {
                  formRef.current.requestSubmit();
                }
              }}
            >
              {editingServiceId ? t('services.updateService') : t('services.addService')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
