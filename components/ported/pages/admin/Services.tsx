import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { getServices, deleteService, createService, updateService } from '@/lib/api/services';
import { Pencil, Trash2, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Service } from '@/types/admin';
import { cn } from '@/lib/utils';
import { UpgradeModal } from '@/components/admin/UpgradeModal';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ported/ui/tabs';
import { useBusinessType } from '@/lib/hooks/useBusinessType';
import { MembershipPlansManager } from '@/components/admin/MembershipPlansManager';

function ActiveSwitchField({ formData, setFormData, t }: { 
  formData: { active: boolean; name: string; description: string; duration: number; price: number; taxRate: number; isGroupService: boolean; maxCapacity: number | null; minCapacity: number | null; allowWaitlist: boolean }; 
  setFormData: React.Dispatch<React.SetStateAction<typeof defaultFormData>>; 
  t: (key: string) => string 
}) {
  const { isRTL } = useLocale();
  const handleActiveChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, active: checked }));
  }, [setFormData]);
  
  return (
    <div className="flex items-center gap-2">
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
  isGroupService: false,
  maxCapacity: null as number | null,
  minCapacity: null as number | null,
  allowWaitlist: false,
};

const Services = () => {
  const { t, isRTL } = useLocale();
  const businessType = useBusinessType();
  const isGymTrainer = businessType === 'gym_trainer';
  const [activeTab, setActiveTab] = useState('services');
  const [mounted, setMounted] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<string>('Other');
  const [formData, setFormData] = useState(defaultFormData);
  const [isVatEditable, setIsVatEditable] = useState(false);
  const [canManageServices, setCanManageServices] = useState(true); // Default to true to avoid blocking
  const [hasGroupAppointments, setHasGroupAppointments] = useState<boolean | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; current: number; type: 'services' | 'staff' | 'bookings' } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPlanName, setCurrentPlanName] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
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
    
    // Fetch current plan name
    fetch('/api/admin/trial-status')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.planName) {
          setCurrentPlanName(data.planName);
        }
      })
      .catch(error => {
        console.error('Error fetching plan name:', error);
      });
    
    // Check if business has group appointments feature
    fetch('/api/admin/feature-check?feature=group_appointments')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHasGroupAppointments(data.canPerform);
        } else {
          setHasGroupAppointments(false);
        }
      })
      .catch(error => {
        console.error('Error checking group appointments feature:', error);
        setHasGroupAppointments(false);
      });
    fetchServices();

    // Check feature access for managing services
    fetch('/api/admin/feature-check?feature=manage_services')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCanManageServices(data.canPerform);
        }
      })
      .catch(error => {
        console.error('Error checking feature:', error);
        // Default to true if check fails to avoid blocking unnecessarily
      });
  }, []);
  
  const { localeReady } = useDirection();
  
  // Prevent auto-focus on mobile when dialog opens
  useEffect(() => {
    if (isDialogOpen && typeof window !== 'undefined') {
      // Check if mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                       window.innerWidth < 768;
      
      if (isMobile && nameInputRef.current) {
        // Small delay to ensure the input is rendered, then blur if focused
        const timer = setTimeout(() => {
          if (nameInputRef.current && document.activeElement === nameInputRef.current) {
            nameInputRef.current.blur();
          }
        }, 100);
        
        // Also prevent focus on mount by setting tabIndex to -1 temporarily
        if (nameInputRef.current) {
          nameInputRef.current.tabIndex = -1;
          const restoreTimer = setTimeout(() => {
            if (nameInputRef.current) {
              nameInputRef.current.tabIndex = 0;
            }
          }, 300);
          
          return () => {
            clearTimeout(timer);
            clearTimeout(restoreTimer);
          };
        }
        
        return () => clearTimeout(timer);
      }
    }
  }, [isDialogOpen]);
  
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

  const handleDeleteClick = (service: Service) => {
    if (!canManageServices) {
      toast.error('Your plan doesn\'t allow deleting services. Please upgrade to continue.');
      return;
    }
    setServiceToDelete({ id: service.id, name: service.name });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;

    try {
      setDeleting(true);
      await deleteService(serviceToDelete.id);
      const data = await getServices();
      setServices(data);
      toast.success(t('services.serviceDeleted'));
      setShowDeleteDialog(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast.error('Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async () => {
    // Check if limit is reached before opening dialog
    try {
      const limitsResponse = await fetch('/api/admin/plan-limits');
      const limitsData = await limitsResponse.json();
      
      if (limitsData.success && limitsData.limits) {
        const servicesLimit = limitsData.limits.max_services;
        
        // Debug logging
        console.log('[Services Frontend] Limit check in handleCreate:', {
          current: servicesLimit.current,
          limit: servicesLimit.limit,
          canAdd: servicesLimit.canAdd,
          comparison: `${servicesLimit.current} < ${servicesLimit.limit} = ${servicesLimit.current < servicesLimit.limit}`
        });
        
        if (!servicesLimit.canAdd) {
          // Show limit modal
          setLimitInfo({
            limit: servicesLimit.limit,
            current: servicesLimit.current,
            type: 'services',
          });
          setShowLimitModal(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking limits:', error);
      // Continue if check fails (don't block user due to API error)
    }
    
    setEditingServiceId(null);
    setEditingServiceName('');
    setEditingCategory('Other');
    setFormData(defaultFormData);
    setIsVatEditable(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    if (!canManageServices) {
      toast.error('Your plan doesn\'t allow editing services. Please upgrade to continue.');
      return;
    }

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
      isGroupService: service.isGroupService || false,
      maxCapacity: service.maxCapacity ?? null,
      minCapacity: service.minCapacity ?? null,
      allowWaitlist: service.allowWaitlist || false,
    });
    // Default to unchecked
    setIsVatEditable(false);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingServiceId(null);
    setEditingServiceName('');
    setEditingCategory('Other');
    setFormData(defaultFormData);
    setIsVatEditable(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check feature access when creating/updating service
    if (!canManageServices) {
      toast.error('Your plan doesn\'t allow managing services. Please upgrade to continue.');
      return;
    }

    // Double-check with API before proceeding
    try {
      const featureCheck = await fetch('/api/admin/feature-check?feature=manage_services');
      const featureData = await featureCheck.json();

      if (!featureData.canPerform) {
        toast.error('Your plan doesn\'t allow managing services. Please upgrade to continue.');
        return;
      }
    } catch (error) {
      console.error('Error checking feature:', error);
      // Continue if check fails (don't block user due to API error)
    }
    
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

    // Check if trying to create group service and if plan allows it
    if (formData.isGroupService) {
      try {
        const groupFeatureCheck = await fetch('/api/admin/feature-check?feature=group_appointments');
        const groupFeatureData = await groupFeatureCheck.json();
        
        if (!groupFeatureData.canPerform) {
          toast.error('Your plan does not allow creating group services. Please upgrade to Professional or Business plan.');
          return;
        }
      } catch (error) {
        console.error('Error checking group appointments feature:', error);
        // Continue if check fails (don't block user due to API error)
      }
    }

    // Validate group service fields
    if (formData.isGroupService) {
      if (!formData.maxCapacity || formData.maxCapacity < 2) {
        toast.error('Maximum participants must be at least 2 for group services');
        return;
      }
      if (formData.minCapacity && formData.minCapacity >= formData.maxCapacity) {
        toast.error('Minimum participants must be less than maximum participants');
        return;
      }
    }

    try {
      if (editingServiceId) {
        await updateService(editingServiceId, { ...formData, category: editingCategory });
        toast.success(t('services.serviceUpdated'));
      } else {
        // Double-check limit before creating (in case it changed)
        try {
          const limitsResponse = await fetch('/api/admin/plan-limits');
          const limitsData = await limitsResponse.json();
          
          if (limitsData.success && limitsData.limits) {
            const servicesLimit = limitsData.limits.max_services;
            
            // Debug logging
            console.log('[Services Frontend] Limit check in handleSubmit:', {
              current: servicesLimit.current,
              limit: servicesLimit.limit,
              canAdd: servicesLimit.canAdd,
              comparison: `${servicesLimit.current} < ${servicesLimit.limit} = ${servicesLimit.current < servicesLimit.limit}`
            });
            
            if (!servicesLimit.canAdd) {
              // Show limit modal
              setLimitInfo({
                limit: servicesLimit.limit,
                current: servicesLimit.current,
                type: 'services',
              });
              setShowLimitModal(true);
              return;
            }
          }
        } catch (limitError) {
          console.error('Error checking limits before create:', limitError);
          // Continue if check fails
        }
        
        await createService({ ...formData, category: 'Other' });
        toast.success(t('services.serviceCreated'));
      }
      
      // Refresh services list
      setLoading(true);
      const data = await getServices();
      setServices(data);
      setLoading(false);
      handleClose();
    } catch (error: any) {
      console.error('Failed to save service:', error);
      
      // Check if error is about limit
      // ApiError stores message in error.message and response data in error.response
      const errorMessage = error?.message || error?.response?.error || (typeof error === 'string' ? error : '');
      const statusCode = error?.status || error?.response?.status || 0;
      
      if (statusCode === 403 || errorMessage.includes('maximum number of services') || errorMessage.includes('reached the maximum')) {
        // Show limit modal instead of toast
        // Get current count and limit
        try {
          const limitsResponse = await fetch('/api/admin/plan-limits');
          const limitsData = await limitsResponse.json();
          
          if (limitsData.success && limitsData.limits) {
            const servicesLimit = limitsData.limits.max_services;
            setLimitInfo({
              limit: servicesLimit.limit,
              current: servicesLimit.current,
              type: 'services',
            });
            setShowLimitModal(true);
            handleClose(); // Close the create dialog
            return;
          }
        } catch (limitError) {
          console.error('Error fetching limit info:', limitError);
        }
      }
      
      toast.error(editingServiceId ? 'Failed to update service' : 'Failed to create service');
    }
  };

  const handleToggleActive = async (serviceId: string, currentActive: boolean) => {
    if (!canManageServices) {
      toast.error('Your plan doesn\'t allow managing services. Please upgrade to continue.');
      return;
    }

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

  // Get unique categories from services
  const categories = Array.from(new Set(services.map(s => s.category).filter(Boolean))).sort();
  
  // Filter services by selected category
  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(s => s.category === selectedCategory);

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
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(service);
              }}
              disabled={!canManageServices}
              title={!canManageServices ? 'Your plan doesn\'t allow editing services. Please upgrade to continue.' : ''}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(service);
              }}
              disabled={!canManageServices}
              title={!canManageServices ? 'Your plan doesn\'t allow deleting services. Please upgrade to continue.' : ''}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Switch
              checked={service.active}
              onCheckedChange={() => handleToggleActive(service.id, service.active)}
              onClick={(e) => e.stopPropagation()}
              disabled={!canManageServices}
            />
          </div>
        );
      },
    },
  ];

  const { dir } = useDirection();

  return (
    <div dir={dir}>
      {isGymTrainer ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir={dir}>
          <TabsList dir={dir}>
            <TabsTrigger value="services">{t('services.title') || 'Services'}</TabsTrigger>
            <TabsTrigger value="plans">{t('membershipPlans.title') || 'Membership Plans'}</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-lg font-semibold">
                  {t('services.title') || 'Services'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('services.headerDescription') || 'Create and manage service offerings for your clients to book appointments'}
                </p>
              </div>
              <Button 
                onClick={handleCreate}
                className="w-full sm:w-auto"
                disabled={!canManageServices}
                title={!canManageServices ? 'Your plan doesn\'t allow adding services. Please upgrade to continue.' : ''}
              >
                <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('services.create')}
              </Button>
            </div>

            {/* Category Filter */}
            <div className="mb-4 flex items-center gap-4 hidden">
              <Label htmlFor="category-filter" className="whitespace-nowrap">
                {t('services.category')}:
              </Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-filter" className="w-[200px]">
                  <SelectValue placeholder={t('services.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('services.allCategories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DataTable
              data={filteredServices}
              columns={columns}
              searchable
              searchPlaceholder={t('services.search')}
              emptyMessage={t('services.noServicesFound')}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="plans">
            <MembershipPlansManager />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <PageHeader
            title={t('services.title')}
            action={
              <Button 
                onClick={handleCreate}
                className="w-full sm:w-auto"
                disabled={!canManageServices}
                title={!canManageServices ? 'Your plan doesn\'t allow adding services. Please upgrade to continue.' : ''}
              >
                <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('services.create')}
              </Button>
            }
          />

          {/* Category Filter */}
          <div className="mb-4 flex items-center gap-4 hidden">
            <Label htmlFor="category-filter" className="whitespace-nowrap">
              {t('services.category')}:
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category-filter" className="w-[200px]">
                <SelectValue placeholder={t('services.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('services.allCategories')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            data={filteredServices}
            columns={columns}
            searchable
            searchPlaceholder={t('services.search')}
            emptyMessage={t('services.noServicesFound')}
            loading={loading}
          />
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
          {/* Sticky Header */}
          <DialogHeader className={`p-6 pb-4 border-b sticky top-0 bg-background z-10 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                <Label htmlFor="name" className={isRTL ? 'text-right' : 'text-left'}>{t('services.name')} *</Label>
                <Input
                  ref={nameInputRef}
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('services.name')}
                  autoFocus={false}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description" className={isRTL ? 'text-right' : 'text-left'}>{t('services.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('services.descriptionPlaceholder') || 'Add a description for this service...'}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="duration" className={isRTL ? 'text-right' : 'text-left'}>{t('services.durationMinutes')} *</Label>
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
                <Label htmlFor="price" className={isRTL ? 'text-right' : 'text-left'}>{t('services.price')} (₪) *</Label>
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
                <Label htmlFor="taxRate" className={isRTL ? 'text-right' : 'text-left'}>{t('services.taxRatePercent')}</Label>
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
                  <div className="flex items-center justify-start gap-3">
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

              {/* Group Service Section */}
              {hasGroupAppointments !== false && (
                <div className="md:col-span-2 border-t pt-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label htmlFor="isGroupService" className="text-base font-semibold">
                          {t('services.groupService')}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('services.groupServiceDescription')}
                        </p>
                        {hasGroupAppointments !== true && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Upgrade to Professional or Business plan to use group services
                          </p>
                        )}
                      </div>
                      <Switch
                        id="isGroupService"
                        checked={formData.isGroupService}
                        disabled={hasGroupAppointments !== true}
                        onCheckedChange={(checked) => {
                          if (hasGroupAppointments !== true) {
                            toast.error('Group services are available in Professional and Business plans. Please upgrade.');
                            return;
                          }
                          setFormData({
                            ...formData,
                            isGroupService: checked,
                            maxCapacity: checked ? (formData.maxCapacity || 10) : null,
                            minCapacity: checked ? formData.minCapacity : null,
                            allowWaitlist: checked ? formData.allowWaitlist : false,
                          });
                        }}
                      />
                    </div>

                  {formData.isGroupService && (
                    <div className={`space-y-4 ${isRTL ? 'pr-4 border-r-2' : 'pl-4 border-l-2'} border-primary/20`}>
                      <div>
                        <Label htmlFor="maxCapacity" className={isRTL ? 'text-right' : 'text-left'}>
                          {t('services.maxCapacityRequired')}
                        </Label>
                        <Input
                          id="maxCapacity"
                          type="number"
                          min="2"
                          value={formData.maxCapacity || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setFormData({
                              ...formData,
                              maxCapacity: value && value > 1 ? value : null,
                            });
                          }}
                          required={formData.isGroupService}
                          placeholder="10"
                        />
                        <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('services.maxCapacityDescription')}
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="minCapacity" className={isRTL ? 'text-right' : 'text-left'}>
                          {t('services.minCapacity')}
                        </Label>
                        <Input
                          id="minCapacity"
                          type="number"
                          min="1"
                          max={formData.maxCapacity || undefined}
                          value={formData.minCapacity || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setFormData({
                              ...formData,
                              minCapacity: value && value > 0 ? value : null,
                            });
                          }}
                          placeholder={t('services.minCapacityPlaceholder')}
                        />
                        <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('services.minCapacityDescription')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="allowWaitlist">
                            {t('services.allowWaitlist')}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('services.allowWaitlistDescription')}
                          </p>
                        </div>
                        <Switch
                          id="allowWaitlist"
                          checked={formData.allowWaitlist}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              allowWaitlist: checked,
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}
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

      {/* Limit Reached Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={dir}>
          <DialogHeader className="text-center">
            <DialogTitle>
              {limitInfo?.type === 'services' && (
                <>
                  {currentPlanName && (
                    <span className="block text-base font-normal mb-1">
                      {t('trial.currentPlan')}: {currentPlanName.charAt(0).toUpperCase() + currentPlanName.slice(1)}
                    </span>
                  )}
                  <span>{t('limits.servicesLimitReached').replace('{{X}}', limitInfo.limit.toString())}</span>
                </>
              )}
              {limitInfo?.type === 'staff' && t('limits.staffLimitReached').replace('{{X}}', limitInfo.limit.toString())}
              {limitInfo?.type === 'bookings' && t('limits.bookingsLimitReached').replace('{{X}}', limitInfo.limit.toString())}
            </DialogTitle>
            <DialogDescription>
              {limitInfo?.type === 'services' && t('limits.servicesLimitMessage')}
              {limitInfo?.type === 'staff' && t('limits.staffLimitMessage')}
              {limitInfo?.type === 'bookings' && t('limits.bookingsLimitMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setShowLimitModal(false)}>
              {t('common.close') || 'Close'}
            </Button>
            <Button 
              onClick={() => {
                setShowLimitModal(false);
                setShowUpgradeModal(true);
              }}
            >
              {t('trial.viewPlans') || 'View Plans'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        currentPlanName={currentPlanName}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className={`sm:max-w-[425px] ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
          <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl">
                {t('services.deleteConfirmTitle') || 'Delete Service'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              {t('services.deleteConfirmMessage')?.replace('{name}', serviceToDelete?.name || '') || 
                `Are you sure you want to delete "${serviceToDelete?.name}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className={`text-sm text-amber-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                <strong>{t('services.deleteWarning') || 'Warning:'}</strong>{' '}
                {t('services.deleteWarningMessage') || 'Deleting this service will remove it from all future appointments. Existing appointments will remain, but the service details will be lost.'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setServiceToDelete(null);
              }}
              disabled={deleting}
            >
              {t('services.cancel') || 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ms-2' : 'mr-2'}`} />
                  {t('services.deleting') || 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'mr-2'}`} />
                  {t('services.deleteConfirm') || 'Delete Service'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
