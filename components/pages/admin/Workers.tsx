"use client";
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { getWorkers, deleteWorker, createWorker, updateWorker } from '@/lib/api/services';
import { getServices } from '@/lib/api/services';
import { Pencil, Trash2, Plus, Shield, Mail, Loader2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Worker, Service } from '@/types/admin';
import { cn } from '@/lib/utils';
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
import { Checkbox } from '@/components/ui/checkbox';
import { UpgradeModal } from '@/components/admin/UpgradeModal';

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
  const { t, isRTL } = useLocale();
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
  const [workerLimit, setWorkerLimit] = useState<{ limit: number; current: number; canAdd: boolean } | null>(null);
  const [currentPlanName, setCurrentPlanName] = useState<string>('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const isGymTrainer = businessType === 'gym_trainer';
  
  // Helper function to get conditional translation key
  const getT = (key: string) => {
    if (isGymTrainer && key.startsWith('workers.')) {
      return t(key.replace('workers.', 'trainers.')) || t(key);
    }
    return t(key);
  };
  
  useEffect(() => {
    setMounted(true);
    
    // Fetch business type
    const fetchBusinessType = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success && data.businessType) {
          setBusinessType(data.businessType);
        }
      } catch (error) {
        console.error('Failed to fetch business type:', error);
      }
    };
    fetchBusinessType();
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
        
        // Update worker limit after fetching workers
        try {
          const limitResponse = await fetch('/api/admin/plan-limits');
          const limitData = await limitResponse.json();
          if (limitData.success && limitData.limits?.max_staff) {
            setWorkerLimit(limitData.limits.max_staff);
          }
        } catch (error) {
          console.error('Error checking plan limits:', error);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    // Check feature access for managing workers
    const checkFeatureAccess = async () => {
      try {
        const response = await fetch('/api/admin/feature-check?feature=manage_workers');
        const data = await response.json();
        if (data.success) {
          setCanManageWorkers(data.canPerform);
        }
      } catch (error) {
        console.error('Error checking feature:', error);
        // Default to true if check fails to avoid blocking unnecessarily
      }
    };

    // Check plan limits for workers
    const checkPlanLimits = async () => {
      try {
        const response = await fetch('/api/admin/plan-limits');
        const data = await response.json();
        if (data.success && data.limits?.max_staff) {
          setWorkerLimit(data.limits.max_staff);
        }
      } catch (error) {
        console.error('Error checking plan limits:', error);
      }
    };

    // Get current plan name
    const fetchPlanName = async () => {
      try {
        const response = await fetch('/api/admin/trial-status');
        const data = await response.json();
        if (data.success && data.planName) {
          setCurrentPlanName(data.planName);
        }
      } catch (error) {
        console.error('Error fetching plan name:', error);
      }
    };
    
    fetchCurrentUser();
    fetchData();
    checkFeatureAccess();
    checkPlanLimits();
    fetchPlanName();
  }, []);
  
  const { localeReady, dir } = useDirection();
  
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

  const handleDeleteClick = (worker: Worker) => {
    if (!canManageWorkers) {
      toast.error('Your plan doesn\'t allow deleting workers. Please upgrade to continue.');
      return;
    }
    setWorkerToDelete(worker);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workerToDelete) return;

    try {
      setDeleting(true);
      await deleteWorker(workerToDelete.id);
      const data = await getWorkers();
      setWorkers(data);
      toast.success(t('workers.workerDeleted'));
      setShowDeleteDialog(false);
      setWorkerToDelete(null);
    } catch (error) {
      console.error('Failed to delete worker:', error);
      toast.error('Failed to delete worker');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = () => {
    if (!canManageWorkers) {
      toast.error('Your plan doesn\'t allow adding workers. Please upgrade to continue.');
      return;
    }

    // Check if worker limit is reached
    if (workerLimit && !workerLimit.canAdd) {
      setShowLimitModal(true);
      return;
    }

    setEditingWorkerId(null);
    setEditingWorkerName('');
    // For new invites, only email is needed - clear name and other fields
    setFormData({
      ...defaultFormData,
      name: '', // Empty name for invite-only flow
      email: '',
      phone: '',
      services: [],
    });
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
    
    // For new invites (not editing), only email is required
    if (!editingWorkerId) {
      // Invite-only requires email
      if (!formData.email || !formData.email.trim()) {
        toast.error('Email is required to send invite');
        return;
      }
    } else {
      // Editing requires name and services
      if (!formData.name.trim()) {
        toast.error(t('workers.required'));
        return;
      }

      if (formData.services.length === 0) {
        toast.error(t('workers.atLeastOneService'));
        return;
      }
    }

    try {
      if (editingWorkerId) {
        await updateWorker(editingWorkerId, formData);
        toast.success(t('workers.workerUpdated'));
      } else {
        const result = await createWorker(formData);
        // Check if there was an email error
        if (result.emailError) {
          toast.error(t('workers.emailSendError') || 'Error sending invite, please contact system administrator');
        } else {
          toast.success(t('workers.inviteSent') || 'Invite sent successfully! The worker will receive an email to set up their account.');
        }
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

  const handleResendInvite = async (workerId: string) => {
    setResendingInviteId(workerId);
    try {
      const response = await fetch(`/api/workers/${workerId}/resend-invite`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited
          const errorMessage = data.hoursRemaining 
            ? (t('workers.rateLimitedHours') || 'Please wait {hours} hour(s) before resending the invite').replace('{hours}', data.hoursRemaining.toString())
            : (data.error || t('workers.rateLimited') || 'Please wait 24 hours before resending the invite');
          toast.error(errorMessage);
        } else {
          toast.error(data.error || t('workers.resendInviteError') || 'Failed to resend invite');
        }
        return;
      }

      toast.success(t('workers.inviteResent') || 'Invite resent successfully!');
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error(t('workers.resendInviteError') || 'Failed to resend invite');
    } finally {
      setResendingInviteId(null);
    }
  };

  const columns = [
    {
      key: 'status',
      label: t('workers.status') || 'Status',
      render: (worker: Worker) => {
        // Show pending status if worker is not active
        if (!worker.active) {
          return (
            <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-orange-100 text-orange-800 border-orange-300 w-fit px-2 py-0.5">
              {t('workers.pending') || 'Pending'}
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-green-100 text-green-800 border-green-300 w-fit px-2 py-0.5">
            {t('workers.active') || 'Active'}
          </Badge>
        );
      },
    },
    {
      key: 'role',
      label: t('workers.role'),
      render: (worker: Worker) => {
        const { isRTL } = useLocale();
        // Check if this is the owner (main admin)
        if (worker.isMainAdmin) {
          return (
            <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300 w-fit px-2 py-0.5">
              <Shield className="w-3 h-3" />
              {t('workers.owner')}
            </Badge>
          );
        }
        
        const role = worker.role || (worker.isAdmin ? 'admin' : 'worker');
        if (role === 'admin') {
          return (
            <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300 w-fit px-2 py-0.5">
              <Shield className="w-3 h-3" />
              {t('workers.admin')}
            </Badge>
          );
        }
        
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-300 w-fit px-2 py-0.5">
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
        // 2. Current user is main admin (owner) - owners can edit everyone including themselves
        const canEdit = !worker.isMainAdmin || currentUserIsMainAdmin;
        
        // Check if worker is pending and has email (show resend invite button)
        const isPending = !worker.active;
        const hasEmail = !!worker.email;
        const isResending = resendingInviteId === worker.id;
        
        return (
          <div className="flex items-center gap-2 justify-end">
            {/* Show Resend Invite button for pending workers with email */}
            {isPending && hasEmail && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResendInvite(worker.id);
                }}
                disabled={!canManageWorkers || isResending}
                title={!canManageWorkers ? (t('workers.noPermission') || 'Your plan doesn\'t allow managing workers.') : (t('workers.resendInvite') || 'Resend invite email')}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('workers.resending') || 'Resending...'}
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {t('workers.resendInvite') || 'Resend Invite'}
                  </>
                )}
              </Button>
            )}
            
            {/* Hide edit button for pending workers */}
            {canEdit && !isPending && (
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
                  handleDeleteClick(worker);
                }}
                disabled={!canManageWorkers}
                title={!canManageWorkers ? 'Your plan doesn\'t allow deleting workers. Please upgrade to continue.' : ''}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {/* Hide toggle switch for pending workers */}
            {!isPending && (
              <Switch
                checked={worker.active}
                onCheckedChange={() => handleToggleActive(worker.id, worker.active)}
                onClick={(e) => e.stopPropagation()}
                disabled={!canManageWorkers}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={getT('workers.title')}
        action={
          <Button 
            onClick={handleCreate}
            className={cn(
              "w-full sm:w-auto",
              (!canManageWorkers || (workerLimit && !workerLimit.canAdd)) ? 'opacity-50' : ''
            )}
            title={
              !canManageWorkers 
                ? 'Your plan doesn\'t allow adding workers. Please upgrade to continue.'
                : (workerLimit && !workerLimit.canAdd)
                ? `You have reached the maximum number of workers (${workerLimit.limit}) for your plan.`
                : ''
            }
          >
            <Plus className="w-4 h-4 me-2" />
            {getT('workers.create')}
          </Button>
        }
      />

      <DataTable
        data={workers}
        columns={columns}
        searchable
        searchPlaceholder={getT('workers.search')}
        emptyMessage={getT('workers.noWorkersFound')}
        loading={loading}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle>
              {editingWorkerId 
                ? getT('workers.editWorkerTitle').replace('{name}', editingWorkerName)
                : getT('workers.createWorker')}
            </DialogTitle>
            <DialogDescription>
              {editingWorkerId 
                ? getT('workers.editDescription')
                : getT('workers.createDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <form ref={formRef} id="worker-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* For new invites, only show email. For editing, show all fields */}
              {!editingWorkerId ? (
                <div className="md:col-span-2">
                  <Label htmlFor="email">{t('workers.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder={t('workers.email')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('workers.inviteEmailDescription') || 'Enter the worker\'s email address. They will receive an invite to set up their account.'}
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}

              {editingWorkerId && (
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
              )}

              {editingWorkerId && (
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
              )}

              {editingWorkerId && (
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
              )}

              {editingWorkerId && isGymTrainer && (
                <div className="md:col-span-2">
                  <Label>Specializations</Label>
                  <Input
                    placeholder="e.g., Strength Training, Cardio, Yoga"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Trainer specializations and expertise areas
                  </p>
                </div>
              )}
              
              {editingWorkerId && isGymTrainer && (
                <div className="md:col-span-2">
                  <Label>Google Calendar</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => {
                      // Placeholder for Google Calendar connection
                      toast.info('Google Calendar integration - Coming soon');
                    }}
                  >
                    Connect Google Calendar
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sync trainer's schedule with Google Calendar
                  </p>
                </div>
              )}

              {editingWorkerId && (
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
              )}
            </div>
          </form>

          <DialogFooter className="p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            {editingWorkerId && (
              <div className="flex items-center gap-2 order-2 sm:order-1">
                <Label htmlFor="active" className="cursor-pointer text-sm">{t('workers.active')}</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>
            )}
            <div className={`flex gap-2 ${editingWorkerId ? 'order-1 sm:order-2' : 'w-full justify-end'}`}>
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
                {editingWorkerId ? t('workers.updateWorker') : (t('workers.sendInvite') || 'Send Invite')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limit Reached Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : ''}>{t('workers.limitReached') || 'Worker Limit Reached'}</DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : ''}>
              {workerLimit
                ? `${t('workers.youHaveOnly') || 'You have only'} ${workerLimit.limit} ${workerLimit.limit === 1 ? (t('workers.user') || 'user') : (t('workers.users') || 'users')} ${t('workers.allowed') || 'allowed'}. ${t('workers.ifYouWantToAddMore') || 'If you want to add more, please upgrade'}.`
                : t('workers.limitReachedDescription') || 'You have reached the maximum number of workers for your plan.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {isRTL ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full"
                >
                  {t('common.close') || 'Close'}
                </Button>
                <Button 
                  onClick={() => {
                    setShowLimitModal(false);
                    setShowUpgradeModal(true);
                  }}
                  className="w-full"
                >
                  {t('workers.upgradeForm') || 'Upgrade'}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => {
                    setShowLimitModal(false);
                    setShowUpgradeModal(true);
                  }}
                  className="w-full"
                >
                  {t('workers.upgradeForm') || 'Upgrade'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full"
                >
                  {t('common.close') || 'Close'}
                </Button>
              </>
            )}
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
                {t('workers.deleteConfirmTitle') || 'Delete Worker'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              {t('workers.deleteConfirmMessage')?.replace('{name}', workerToDelete?.name || '') || 
                `Are you sure you want to delete "${workerToDelete?.name}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className={`text-sm text-amber-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                <strong>{t('workers.deleteWarning') || 'Warning:'}</strong>{' '}
                {t('workers.deleteWarningMessage') || 'Deleting this worker will remove them from all future appointments. Existing appointments will remain, but the worker details will be lost.'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setWorkerToDelete(null);
              }}
              disabled={deleting}
            >
              {t('workers.cancel') || 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ms-2' : 'mr-2'}`} />
                  {t('workers.deleting') || 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'mr-2'}`} />
                  {t('workers.deleteConfirm') || 'Delete Worker'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workers;