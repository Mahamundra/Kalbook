import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { getWorkers, deleteWorker, createWorker, updateWorker } from '@/lib/api/services';
import { getServices } from '@/lib/api/services';
import { Pencil, Trash2, Plus, Shield } from 'lucide-react';
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

// Helper function to convert hex to rgba with opacity
const hexToRgba = (hex: string, opacity: number = 0.2): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const defaultFormData = {
  name: '',
  email: '',
  phone: '',
  services: [] as string[],
  active: true,
  color: '#3B82F6',
  isAdmin: false,
};

const Workers = () => {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editingWorkerName, setEditingWorkerName] = useState<string>('');
  const [formData, setFormData] = useState(defaultFormData);
  const [currentUser, setCurrentUser] = useState<{ userId: string; email?: string; phone?: string; role?: 'owner' | 'admin'; isMainAdmin?: boolean } | null>(null);
  const [canManageWorkers, setCanManageWorkers] = useState(true); // Default to true to avoid blocking
  const formRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    setMounted(true);
    // Fetch current user session
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        console.log('Session API response:', data);
        if (data.success && data.session && data.session.userId) {
          const userData = {
            userId: data.session.userId,
            email: data.session.email,
            phone: data.session.phone,
            role: data.session.role,
            isMainAdmin: data.session.isMainAdmin || false,
          };
          console.log('Setting current user:', userData);
          setCurrentUser(userData);
        } else {
          console.warn('Session data missing or invalid:', data);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    
    // Fetch workers and services from API
    const fetchData = async () => {
      try {
        setLoading(true);
        const [workersData, servicesData] = await Promise.all([
          getWorkers(),
          getServices(),
        ]);
        console.log('Workers data:', workersData);
        setWorkers(workersData);
        setServices(servicesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentUser();
    fetchData();

    // Check feature access for managing workers
    fetch('/api/admin/feature-check?feature=manage_workers')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCanManageWorkers(data.canPerform);
        }
      })
      .catch(error => {
        console.error('Error checking feature:', error);
        // Default to true if check fails to avoid blocking unnecessarily
      });
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
    if (!canManageWorkers) {
      toast.error('Your plan doesn\'t allow deleting workers. Please upgrade to continue.');
      return;
    }

    if (confirm(t('workers.confirmDelete'))) {
      try {
        setLoading(true);
        await deleteWorker(id);
        const data = await getWorkers();
        setWorkers(data);
        toast.success(t('workers.workerDeleted'));
      } catch (error) {
        console.error('Failed to delete worker:', error);
        toast.error('Failed to delete worker');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreate = () => {
    setEditingWorkerId(null);
    setEditingWorkerName('');
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (worker: Worker) => {
    if (!canManageWorkers) {
      toast.error('Your plan doesn\'t allow editing workers. Please upgrade to continue.');
      return;
    }

    setEditingWorkerId(worker.id);
    setEditingWorkerName(worker.name);
    setFormData({
      name: worker.name,
      email: worker.email || '',
      phone: worker.phone || '',
      services: worker.services || [],
      active: worker.active,
      color: worker.color || '#3B82F6',
      isAdmin: worker.isAdmin || false,
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingWorkerId(null);
    setEditingWorkerName('');
    setFormData(defaultFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check feature access when creating/updating worker
    if (!canManageWorkers) {
      toast.error('Your plan doesn\'t allow managing workers. Please upgrade to continue.');
      return;
    }

    // Double-check with API before proceeding
    try {
      const featureCheck = await fetch('/api/admin/feature-check?feature=manage_workers');
      const featureData = await featureCheck.json();

      if (!featureData.canPerform) {
        toast.error('Your plan doesn\'t allow managing workers. Please upgrade to continue.');
        return;
      }
    } catch (error) {
      console.error('Error checking feature:', error);
      // Continue if check fails (don't block user due to API error)
    }
    
    if (!formData.name.trim()) {
      toast.error(t('workers.required'));
      return;
    }

    if (formData.services.length === 0) {
      toast.error(t('workers.atLeastOneService'));
      return;
    }

    try {
      if (editingWorkerId) {
        await updateWorker(editingWorkerId, formData);
        toast.success(t('workers.workerUpdated'));
      } else {
        await createWorker(formData);
        toast.success(t('workers.workerCreated'));
      }
      
      // Refresh workers list
      setLoading(true);
      const data = await getWorkers();
      setWorkers(data);
      setLoading(false);
      handleClose();
    } catch (error) {
      console.error('Failed to save worker:', error);
      toast.error(editingWorkerId ? 'Failed to update worker' : 'Failed to create worker');
    }
  };

  const handleToggleActive = async (workerId: string, currentActive: boolean) => {
    if (!canManageWorkers) {
      toast.error('Your plan doesn\'t allow managing workers. Please upgrade to continue.');
      return;
    }

    try {
      await updateWorker(workerId, { active: !currentActive });
      const data = await getWorkers();
      setWorkers(data);
      toast.success(t('workers.workerUpdated'));
    } catch (error) {
      console.error('Failed to update worker:', error);
      toast.error('Failed to update worker');
    }
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
      key: 'role',
      label: t('workers.role'),
      render: (worker: Worker) => {
        const { isRTL } = useLocale();
        // Check if this is the owner (main admin)
        if (worker.isMainAdmin) {
          return (
            <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
              <Shield className="w-3 h-3" />
              {t('workers.owner')}
            </Badge>
          );
        }
        
        const role = worker.role || (worker.isAdmin ? 'admin' : 'worker');
        if (role === 'admin') {
          return (
            <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
              <Shield className="w-3 h-3" />
              {t('workers.admin')}
            </Badge>
          );
        }
        
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-green-100 text-green-800 border-green-300">
            <Shield className="w-3 h-3" />
            {t('workers.worker')}
          </Badge>
        );
      },
    },
    {
      key: 'name',
      label: t('workers.name'),
      render: (worker: Worker) => {
        return <span>{worker.name}</span>;
      },
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
      key: 'actions',
      label: t('workers.actions'),
      render: (worker: Worker) => {
        const { isRTL } = useLocale();
        // Hide delete button for main admin users (owners)
        const canDelete = !worker.isMainAdmin;
        
        // Check if current user is main admin (owner)
        const currentUserIsMainAdmin = currentUser?.isMainAdmin === true;
        
        // Match worker to current user by userId (more reliable than email/phone)
        const isCurrentUser = currentUser && worker.userId && currentUser.userId === worker.userId;
        
        // Debug logging for owner workers
        if (worker.isMainAdmin) {
          console.log('Owner worker edit check:', {
            workerId: worker.id,
            workerUserId: worker.userId,
            workerName: worker.name,
            currentUserId: currentUser?.userId,
            currentUserRole: currentUser?.role,
            currentUserIsMainAdmin: currentUser?.isMainAdmin,
            isCurrentUser,
            canEdit: !worker.isMainAdmin || (currentUserIsMainAdmin && isCurrentUser),
          });
        }
        
        // Allow editing if:
        // 1. Worker is not a main admin (regular worker/admin), OR
        // 2. Current user is main admin AND this is their own record
        const canEdit = !worker.isMainAdmin || (currentUserIsMainAdmin && isCurrentUser);
        return (
          <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(worker);
                }}
                disabled={!canManageWorkers}
                title={!canManageWorkers ? 'Your plan doesn\'t allow editing workers. Please upgrade to continue.' : ''}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(worker.id);
                }}
                disabled={!canManageWorkers}
                title={!canManageWorkers ? 'Your plan doesn\'t allow deleting workers. Please upgrade to continue.' : ''}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Switch
              checked={worker.active}
              onCheckedChange={() => handleToggleActive(worker.id, worker.active)}
              onClick={(e) => e.stopPropagation()}
              disabled={!canManageWorkers}
            />
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
          <Button 
            onClick={handleCreate}
            disabled={!canManageWorkers}
            title={!canManageWorkers ? 'Your plan doesn\'t allow adding workers. Please upgrade to continue.' : ''}
          >
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
        emptyMessage={t('workers.noWorkersFound')}
        loading={loading}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
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
          
          <form ref={formRef} id="worker-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    {formData.services.length} {t('workers.assignedServices')}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <Switch
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                />
                <Label htmlFor="isAdmin" className="cursor-pointer">
                  {t('workers.isAdmin') || 'Is Admin (can login with OTP)'}
                </Label>
                {formData.isAdmin && (!formData.email || !formData.phone) && (
                  <p className="text-xs text-yellow-600">
                    {t('workers.adminRequiresEmailPhone') || 'Admin requires email and phone'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>{t('workers.pickColorForDisplay') || 'Pick a color for worker display'}</Label>
                <div className="mt-2 space-y-3">
                  {/* Color suggestion bubbles */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      '#3B82F6', // Blue
                      '#EC4899', // Pink
                      '#10B981', // Green
                      '#F59E0B', // Amber
                      '#8B5CF6', // Purple
                      '#EF4444', // Red
                      '#06B6D4', // Cyan
                      '#F97316', // Orange
                      '#84CC16', // Lime
                      '#6366F1', // Indigo
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color 
                            ? 'border-gray-800 scale-110 ring-2 ring-offset-1 ring-gray-300' 
                            : 'border-gray-300 hover:scale-105 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={`Select ${color}`}
                      />
                    ))}
                  </div>
                  
                  {/* Calendar Preview */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      {t('workers.calendarPreview')}
                    </Label>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-600">
                        {formData.name || t('workers.workerName') || 'Worker Name'}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="space-y-1">
                            <div className="text-[10px] text-gray-500">09:00</div>
                            <div 
                              className="rounded border-l-4 p-2 text-xs cursor-pointer transition-all"
                              style={{
                                backgroundColor: hexToRgba(formData.color, 0.2),
                                borderLeftColor: formData.color,
                                minHeight: '50px',
                              }}
                            >
                              <div className="font-semibold text-[10px] truncate">
                                {t('workers.sampleClient')}
                              </div>
                              <div className="text-[9px] opacity-90 mt-0.5">
                                09:00 - 10:00
                              </div>
                              <div className="text-[9px] font-medium mt-1 truncate">
                                {t('workers.sampleService')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          <DialogFooter className="p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <Label htmlFor="active" className="cursor-pointer text-sm">{t('workers.active')}</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
            <div className="flex gap-2 order-1 sm:order-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 sm:flex-initial">
                {t('workers.cancel')}
              </Button>
              <Button 
                type="button"
                onClick={() => {
                  if (formRef.current) {
                    formRef.current.requestSubmit();
                  }
                }}
                className="flex-1 sm:flex-initial"
              >
                {editingWorkerId ? t('workers.updateWorker') : t('workers.addWorker')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workers;