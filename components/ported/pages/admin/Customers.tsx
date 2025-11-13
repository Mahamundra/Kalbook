import { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '@/components/ported/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { 
  getCustomers, 
  updateCustomer, 
  deleteCustomer, 
  deleteCustomers, 
  createCustomer,
  getCustomerByPhone,
  getAppointmentsByCustomerId,
  cancelCustomerAppointments,
  toggleCustomerBlocked,
  getAppointments,
  createAppointment,
  getServices,
  getWorkers,
  getSettings
} from '@/lib/api/services';
import { formatDate } from '@/components/ported/lib/i18n';
import { Plus, Pencil, Trash2, X, Phone, Bell, Eye, Shield, ShieldOff, Calendar, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/types/admin';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ported/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';

const defaultFormData = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  tags: [] as string[],
  consentMarketing: false,
  dateOfBirth: '',
  birthYear: '',
  birthMonth: '',
  birthDay: '',
  gender: '',
};

// Component for tags input with dropdown
const TagsInput = ({ 
  value, 
  onChange, 
  existingTags, 
  isRTL 
}: { 
  value: string[]; 
  onChange: (tags: string[]) => void; 
  existingTags: string[];
  isRTL: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Get unique tags, sorted, and filter based on input
  const uniqueTags = Array.from(new Set(existingTags)).sort();
  const filteredTags = inputValue
    ? uniqueTags.filter(tag => 
        tag.toLowerCase().includes(inputValue.toLowerCase()) && 
        !value.includes(tag)
      )
    : uniqueTags.filter(tag => !value.includes(tag));

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
      setInputValue('');
      // Keep popover open to allow adding multiple tags quickly
      // Focus back on input after adding
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      e.preventDefault();
      handleRemoveTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}>
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className={`hover:bg-destructive/20 rounded-full p-0.5 ${isRTL ? 'mr-1' : 'ml-1'}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <div className="relative flex-1 min-w-[150px] z-10" style={{ zIndex: 10 }}>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!open) {
                setOpen(true);
              }
            }}
            onFocus={() => setOpen(true)}
            onBlur={(e) => {
              // Don't close if clicking inside the popover
              const relatedTarget = e.relatedTarget as HTMLElement;
              const activeElement = document.activeElement as HTMLElement;
              
              // Check if focus is moving to popover content
              if (
                relatedTarget?.closest('[role="dialog"]') || 
                relatedTarget?.closest('[data-radix-popper-content-wrapper]') ||
                relatedTarget?.closest('[data-radix-popover-content]') ||
                activeElement?.closest('[data-radix-popover-content]') ||
                activeElement?.closest('[data-radix-popper-content-wrapper]')
              ) {
                return;
              }
              // Close after a delay to allow click events
              setTimeout(() => {
                // Double check that focus hasn't moved to popover
                const currentFocus = document.activeElement as HTMLElement;
                if (!currentFocus?.closest('[data-radix-popover-content]')) {
                  setOpen(false);
                }
              }, 150);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={isRTL ? 'הוסף תגיות...' : 'Add tags...'}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-1 min-w-[120px]"
            dir={isRTL ? 'rtl' : 'ltr'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            type="text"
            name="tags-input"
            id="tags-input"
          />
          <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
              <div className="absolute inset-0 pointer-events-none" />
            </PopoverTrigger>
            <PopoverContent 
              className={`w-[300px] p-2 z-[100] pointer-events-auto ${isRTL ? 'text-right' : 'text-left'}`} 
              dir={isRTL ? 'rtl' : 'ltr'} 
              align={isRTL ? 'end' : 'start'}
              side="bottom"
              onOpenAutoFocus={(e) => e.preventDefault()}
              sideOffset={5}
              onInteractOutside={(e) => {
                // Don't close if clicking on the input or inside popover
                const target = e.target as HTMLElement;
                if (
                  target?.id === 'tags-input' || 
                  target?.closest('#tags-input') ||
                  target?.closest('[data-radix-popover-content]') ||
                  target?.closest('button[type="button"]')
                ) {
                  e.preventDefault();
                }
              }}
              onPointerDownOutside={(e) => {
                // Don't close if clicking on the input or inside popover
                const target = e.target as HTMLElement;
                if (
                  target?.id === 'tags-input' || 
                  target?.closest('#tags-input') ||
                  target?.closest('[data-radix-popover-content]')
                ) {
                  e.preventDefault();
                }
              }}
              onEscapeKeyDown={(e) => {
                // Allow escape to close
                setOpen(false);
              }}
            >
              <div className="space-y-2 max-h-[300px] overflow-y-auto pointer-events-auto">
                {inputValue.trim() && !value.includes(inputValue.trim()) && !uniqueTags.some(t => t.toLowerCase() === inputValue.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddTag(inputValue);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddTag(inputValue);
                    }}
                    className={`w-full px-3 py-2 rounded-md bg-accent/50 hover:bg-accent active:bg-accent/80 flex items-center gap-2 transition-all duration-150 cursor-pointer group ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}
                  >
                    <Plus className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isRTL ? 'ms-2' : 'me-2'}`} />
                    <span className="font-medium">{isRTL ? `צור "${inputValue.trim()}"` : `Create "${inputValue.trim()}"`}</span>
                  </button>
                )}
                {filteredTags.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover z-10">
                      {isRTL ? 'תגיות קיימות' : 'Existing tags'}
                    </div>
                    <div className="space-y-1">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddTag(tag);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddTag(tag);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddTag(tag);
                          }}
                          className={`w-full px-3 py-2 rounded-md bg-transparent hover:bg-accent/70 active:bg-accent flex items-center gap-2 transition-all duration-150 cursor-pointer group pointer-events-auto ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}
                          style={{ pointerEvents: 'auto' }}
                        >
                          <Plus className={`w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-all group-hover:scale-110 ${isRTL ? 'ms-2' : 'me-2'}`} />
                          <span className="group-hover:font-medium transition-all">{tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredTags.length === 0 && existingTags.length === 0 && !inputValue.trim() && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {isRTL ? 'הקלד כדי להוסיף תגית חדשה' : 'Type to add a new tag'}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

const Customers = () => {
  const { t, locale, isRTL } = useLocale();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateAppointmentDialogOpen, setIsCreateAppointmentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerAppointments, setCustomerAppointments] = useState<any[]>([]);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [services, setServices] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [appointmentFormData, setAppointmentFormData] = useState({
    serviceId: '',
    workerId: '',
    start: '',
    end: '',
    status: 'confirmed' as 'confirmed' | 'pending' | 'cancelled',
  });
  const [allowManualEndTime, setAllowManualEndTime] = useState(false);
  const [canManageCustomers, setCanManageCustomers] = useState(true); // Default to true to avoid blocking
  
  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        const [customersData, servicesData, workersData] = await Promise.all([
          getCustomers(),
          getServices(),
          getWorkers(),
        ]);
        setCustomers(customersData);
        setServices(servicesData);
        setWorkers(workersData);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load customers');
      }
    };
    loadData();

    // Check feature access
    fetch('/api/admin/feature-check?feature=manage_customers')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCanManageCustomers(data.canPerform);
        }
      })
      .catch(error => {
        console.error('Error checking feature:', error);
        // Default to true if check fails
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

  useEffect(() => {
    if (selectedCustomer) {
      const loadAppointments = async () => {
        try {
          const appointments = await getAppointmentsByCustomerId(selectedCustomer.id);
          setCustomerAppointments(appointments);
        } catch (error) {
          console.error('Failed to load appointments:', error);
        }
      };
      loadAppointments();
    }
  }, [selectedCustomer]);

  // Get all existing tags from all customers
  const getAllExistingTags = (): string[] => {
    const allTags: string[] = [];
    customers.forEach(customer => {
      if (customer.tags && customer.tags.length > 0) {
        allTags.push(...customer.tags);
      }
    });
    return allTags;
  };

  const existingTags = getAllExistingTags();

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(t('customers.confirmDelete') || `Are you sure you want to delete ${name}?`)) {
      try {
        const success = await deleteCustomer(id);
        if (success) {
          const updatedCustomers = await getCustomers();
          setCustomers(updatedCustomers);
          setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
          toast.success(t('customers.customerDeleted') || 'Customer deleted successfully');
        } else {
          toast.error('Failed to delete customer');
        }
      } catch (error) {
        console.error('Failed to delete customer:', error);
        toast.error('Failed to delete customer');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
    const names = selectedCustomers.map(c => c.name).join(', ');
    const count = selectedIds.length;
    
    if (window.confirm(
      t('customers.confirmBulkDelete')?.replace('{count}', count.toString())?.replace('{names}', names) || 
      `Are you sure you want to delete ${count} customer(s)?\n\n${names}`
    )) {
      try {
        const deletedCount = await deleteCustomers(selectedIds);
        if (deletedCount > 0) {
          const updatedCustomers = await getCustomers();
          setCustomers(updatedCustomers);
          setSelectedIds([]);
          toast.success(
            t('customers.customersDeleted')?.replace('{count}', deletedCount.toString()) || 
            `${deletedCount} customer(s) deleted successfully`
          );
        } else {
          toast.error('Failed to delete customers');
        }
      } catch (error) {
        console.error('Failed to delete customers:', error);
        toast.error('Failed to delete customers');
      }
    }
  };

  const handleCreate = () => {
    setEditingCustomerId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    // Parse dateOfBirth if available
    let birthYear = '';
    let birthMonth = '';
    let birthDay = '';
    if (customer.dateOfBirth) {
      const date = new Date(customer.dateOfBirth);
      if (!isNaN(date.getTime())) {
        birthYear = date.getFullYear().toString();
        birthMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        birthDay = date.getDate().toString().padStart(2, '0');
      }
    }
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes || '',
      tags: customer.tags || [],
      consentMarketing: customer.consentMarketing || false,
      dateOfBirth: customer.dateOfBirth || '',
      birthYear,
      birthMonth,
      birthDay,
      gender: customer.gender || '',
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingCustomerId(null);
    setFormData(defaultFormData);
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setSelectedCustomer(null);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSendReminderForAppointment = async (apt: any) => {
    if (!selectedCustomer) return;
    // Get settings for reminder message template
    const settings = await getSettings();
    const reminderMessage = settings.notifications?.reminderMessage || 
      `A reminder that you have an appointment for {{service}} on {{date}}, see you soon!`;
    
    // Replace template variables
    const start = new Date(apt.start);
    const formattedDate = start.toLocaleDateString(locale, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const message = reminderMessage
      .replace(/\{\{service\}\}/g, apt.service)
      .replace(/\{\{date\}\}/g, formattedDate);
    
    // In a real app, this would send via SMS/Email
    toast.success(t('customers.reminderSent') || `Reminder sent to ${selectedCustomer.name}`);
  };

  const handleToggleBlock = async () => {
    if (!selectedCustomer) return;
    try {
      const newBlockedState = !selectedCustomer.blocked;
      const updated = await toggleCustomerBlocked(selectedCustomer.id, newBlockedState);
      if (updated) {
        const updatedCustomers = await getCustomers();
        setCustomers(updatedCustomers);
        setSelectedCustomer(updated);
        if (newBlockedState) {
          toast.success(t('customers.customerBlocked') || 'Customer blocked from future appointments');
        } else {
          toast.success(t('customers.customerUnblocked') || 'Customer unblocked');
        }
      }
    } catch (error) {
      console.error('Failed to toggle block status:', error);
      toast.error('Failed to update customer');
    }
  };

  const handleCancelAllAppointments = async () => {
    if (!selectedCustomer) return;
    const count = customerAppointments.filter(apt => apt.status !== 'cancelled').length;
    if (count === 0) {
      toast.info(t('customers.noAppointments') || 'No active appointments to cancel');
      return;
    }
    if (window.confirm(
      t('customers.confirmCancelAppointments')?.replace('{count}', count.toString()) || 
      `Are you sure you want to cancel ${count} appointment(s)?`
    )) {
      try {
        const canceledCount = await cancelCustomerAppointments(selectedCustomer.id);
        const updatedAppointments = await getAppointmentsByCustomerId(selectedCustomer.id);
        setCustomerAppointments(updatedAppointments);
        const updatedCustomers = await getCustomers();
        setCustomers(updatedCustomers);
        const updated = updatedCustomers.find(c => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
        toast.success(
          t('customers.appointmentsCancelled')?.replace('{count}', canceledCount.toString()) || 
          `${canceledCount} appointment(s) cancelled`
        );
      } catch (error) {
        console.error('Failed to cancel appointments:', error);
        toast.error('Failed to cancel appointments');
      }
    }
  };

  const handleCreateAppointment = () => {
    if (!selectedCustomer) return;
    // Set default date/time (today, next hour)
    const defaultStart = new Date();
    defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(defaultEnd.getHours() + 1, 0, 0, 0);
    
    setAppointmentFormData({
      serviceId: '',
      workerId: workers[0]?.id || '',
      start: defaultStart.toISOString(),
      end: defaultEnd.toISOString(),
      status: 'confirmed',
    });
    setAllowManualEndTime(false);
    setIsCreateAppointmentDialogOpen(true);
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service && appointmentFormData.start && !allowManualEndTime) {
      const start = new Date(appointmentFormData.start);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + service.duration);
      setAppointmentFormData({
        ...appointmentFormData,
        serviceId,
        end: end.toISOString(),
      });
    } else {
      setAppointmentFormData({ ...appointmentFormData, serviceId });
    }
  };

  const handleSaveAppointment = async () => {
    if (!selectedCustomer) return;
    
    if (!appointmentFormData.serviceId || !appointmentFormData.workerId) {
      toast.error(t('calendar.required') || 'Please fill in all required fields');
      return;
    }

    const service = services.find(s => s.id === appointmentFormData.serviceId);
    const worker = workers.find(w => w.id === appointmentFormData.workerId);

    if (!service || !worker) {
      toast.error('Invalid selection');
      return;
    }

    if (!appointmentFormData.start) {
      toast.error(t('calendar.required') || 'Please fill in all required fields');
      return;
    }

    try {
      // Create appointment
      await createAppointment({
        serviceId: appointmentFormData.serviceId,
        service: service.name,
        customerId: selectedCustomer.id,
        customer: selectedCustomer.name,
        workerId: appointmentFormData.workerId,
        staffId: appointmentFormData.workerId,
        start: appointmentFormData.start,
        end: appointmentFormData.end,
        status: appointmentFormData.status,
      });

      toast.success(t('calendar.appointmentCreated') || 'Appointment created successfully');
      setIsCreateAppointmentDialogOpen(false);
      // Refresh appointments
      const updatedAppointments = await getAppointmentsByCustomerId(selectedCustomer.id);
      setCustomerAppointments(updatedAppointments);
    } catch (error) {
      console.error('Failed to create appointment:', error);
      toast.error('Failed to create appointment');
      return;
    }
    
    // Reset form
    setAppointmentFormData({
      serviceId: '',
      workerId: workers[0]?.id || '',
      start: '',
      end: '',
      status: 'confirmed',
    });
    setAllowManualEndTime(false);
  };

  const handleConsentChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, consentMarketing: checked }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('customers.required') || 'Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error(t('customers.required') || 'Phone is required');
      return;
    }

    try {
      // Check feature access when creating new customer
      if (!editingCustomerId) {
        try {
          const featureCheck = await fetch('/api/admin/feature-check?feature=manage_customers');
          const featureData = await featureCheck.json();
          
          if (!featureData.canPerform) {
            toast.error('Your plan doesn\'t allow adding customers. Please upgrade to continue.');
            return;
          }
        } catch (error) {
          console.error('Error checking feature:', error);
          // Continue if check fails (don't block user)
        }
      }

      // Check for duplicate phone number (only when creating new customer or updating to a different phone)
      if (!editingCustomerId) {
        // Creating new customer - check if phone already exists
        const existingCustomer = await getCustomerByPhone(formData.phone);
        if (existingCustomer) {
          toast.error(t('customers.phoneExists') || 'A customer with this phone number already exists');
          return;
        }
      } else {
        // Updating existing customer - check if phone exists for a different customer
        const existingCustomer = await getCustomerByPhone(formData.phone);
        if (existingCustomer && existingCustomer.id !== editingCustomerId) {
          toast.error(t('customers.phoneExists') || 'A customer with this phone number already exists');
          return;
        }
      }

      const customerData = {
        ...formData,
        email: formData.email || '',
        tags: formData.tags,
        lastVisit: editingCustomerId 
          ? customers.find(c => c.id === editingCustomerId)?.lastVisit || new Date().toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        visitHistory: editingCustomerId
          ? customers.find(c => c.id === editingCustomerId)?.visitHistory || []
          : [],
      };

      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, customerData);
        toast.success(t('customers.customerUpdated') || 'Customer updated successfully');
      } else {
        await createCustomer(customerData);
        toast.success(t('customers.customerCreated') || 'Customer created successfully');
      }
      
      const updatedCustomers = await getCustomers();
      setCustomers(updatedCustomers);
      handleClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast.error('Failed to save customer');
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('customers.name'),
      render: (customer: Customer) => (
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {customer.blocked && (
            <Shield className="w-4 h-4 text-destructive shrink-0" />
          )}
          <span>{customer.name}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      label: t('customers.phone'),
    },
    {
      key: 'email',
      label: t('customers.email'),
    },
    {
      key: 'lastVisit',
      label: t('customers.lastVisit'),
      render: (customer: Customer) => formatDate(customer.lastVisit, locale),
    },
    {
      key: 'dateOfBirth',
      label: t('customers.dateOfBirth') || 'Date of Birth',
      render: (customer: Customer) => customer.dateOfBirth ? formatDate(customer.dateOfBirth, locale) : '-',
    },
    {
      key: 'gender',
      label: t('customers.gender') || 'Gender',
      render: (customer: Customer) => {
        if (!customer.gender) return '-';
        return t(`auth.${customer.gender}`) || customer.gender;
      },
    },
    {
      key: 'tags',
      label: t('customers.tags'),
      render: (customer: Customer) => {
        return (
          <div className={`flex gap-1 flex-wrap ${isRTL ? 'justify-end' : 'justify-start'}`}>
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: t('customers.actions') || 'Actions',
      render: (customer: Customer) => {
        return (
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(customer);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(customer.id, customer.name);
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
        title={t('customers.title')}
        action={
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                className="w-full sm:w-auto"
              >
                <Trash2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.deleteSelected')?.replace('{count}', selectedIds.length.toString()) || 
                  `Delete (${selectedIds.length})`}
              </Button>
            )}
            <Button 
              onClick={handleCreate} 
              className="w-full sm:w-auto"
              disabled={!canManageCustomers}
              title={!canManageCustomers ? 'Your plan doesn\'t allow adding customers. Please upgrade to continue.' : ''}
            >
              <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
              {t('customers.add')}
            </Button>
          </div>
        }
      />

      <DataTable
        data={customers}
        columns={columns}
        searchable
        searchPlaceholder={t('customers.search')}
        emptyMessage={t('customers.noCustomersFound') || 'No customers found'}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={handleCustomerClick}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Sticky Header */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-lg sm:text-xl break-words">
              {editingCustomerId 
                ? t('customers.editCustomerTitle')?.replace('{name}', formData.name) || `Edit ${formData.name}`
                : t('customers.createCustomer') || 'Create New Customer'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingCustomerId 
                ? t('customers.editDescription') || 'Update the customer details below.'
                : t('customers.createDescription') || 'Fill in the details below to create a new customer.'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Content */}
          <form ref={formRef} id="customer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" style={{ overflowX: 'visible' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('customers.name')} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('customers.name')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>

              <div>
                <Label htmlFor="phone" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('customers.phone')} *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder={t('customers.phone')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>

              <div>
                <Label htmlFor="email" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('customers.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('customers.email')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>

              <div>
                <Label htmlFor="dateOfBirth" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('customers.dateOfBirth') || 'Date of Birth'}
                </Label>
                <div className={`flex flex-col sm:flex-row gap-2 mt-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  {/* Year Select */}
                  <Select
                    value={formData.birthYear}
                    onValueChange={(value) => {
                      // Update date if month and day are already selected
                      if (formData.birthMonth && formData.birthDay) {
                        const year = parseInt(value);
                        const month = parseInt(formData.birthMonth);
                        const day = parseInt(formData.birthDay);
                        const daysInMonth = new Date(year, month, 0).getDate();
                        // Adjust day if it's invalid for the new year (e.g., Feb 29 in non-leap year)
                        const validDay = Math.min(day, daysInMonth);
                        const date = new Date(year, month - 1, validDay);
                        setFormData({ ...formData, birthYear: value, birthDay: validDay.toString().padStart(2, '0'), dateOfBirth: date.toISOString().split('T')[0] });
                      } else {
                        setFormData({ ...formData, birthYear: value });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:flex-1" dir="ltr">
                      <SelectValue placeholder={t('auth.year') || 'Year'} />
                    </SelectTrigger>
                    <SelectContent dir="ltr">
                      {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Month Select */}
                  <Select
                    value={formData.birthMonth}
                    onValueChange={(value) => {
                      // Update date if year and day are already selected
                      if (formData.birthYear && formData.birthDay) {
                        const year = parseInt(formData.birthYear);
                        const month = parseInt(value);
                        const day = parseInt(formData.birthDay);
                        const daysInMonth = new Date(year, month, 0).getDate();
                        // Adjust day if it's invalid for the new month (e.g., day 31 in February)
                        const validDay = Math.min(day, daysInMonth);
                        const date = new Date(year, month - 1, validDay);
                        setFormData({ ...formData, birthMonth: value, birthDay: validDay.toString().padStart(2, '0'), dateOfBirth: date.toISOString().split('T')[0] });
                      } else {
                        setFormData({ ...formData, birthMonth: value });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:flex-1" dir="ltr">
                      <SelectValue placeholder={t('auth.month') || 'Month'} />
                    </SelectTrigger>
                    <SelectContent dir="ltr">
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1;
                        const monthName = new Date(2000, month - 1, 1).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { month: 'long' });
                        return (
                          <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                            {monthName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Day Select */}
                  <Select
                    value={formData.birthDay}
                    onValueChange={(value) => {
                      const day = value;
                      // Only create date if all three are selected
                      if (formData.birthYear && formData.birthMonth) {
                        const year = parseInt(formData.birthYear);
                        const month = parseInt(formData.birthMonth);
                        const date = new Date(year, month - 1, parseInt(day));
                        setFormData({ ...formData, birthDay: day, dateOfBirth: date.toISOString().split('T')[0] });
                      } else {
                        setFormData({ ...formData, birthDay: day });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:flex-1" dir="ltr">
                      <SelectValue placeholder={t('auth.day') || 'Day'} />
                    </SelectTrigger>
                    <SelectContent dir="ltr">
                      {(() => {
                        // If year and month are selected, show correct days for that month
                        if (formData.birthYear && formData.birthMonth) {
                          const year = parseInt(formData.birthYear);
                          const month = parseInt(formData.birthMonth);
                          const daysInMonth = new Date(year, month, 0).getDate();
                          return Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            return (
                              <SelectItem key={day} value={day.toString().padStart(2, '0')}>
                                {day}
                              </SelectItem>
                            );
                          });
                        } else {
                          // If year/month not selected, show 1-31 as default
                          return Array.from({ length: 31 }, (_, i) => {
                            const day = i + 1;
                            return (
                              <SelectItem key={day} value={day.toString().padStart(2, '0')}>
                                {day}
                              </SelectItem>
                            );
                          });
                        }
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="gender" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('customers.gender') || 'Gender'}
                </Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg mt-2"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <option value="">{t('auth.selectGender')}</option>
                  <option value="male">{t('auth.male')}</option>
                  <option value="female">{t('auth.female')}</option>
                  <option value="other">{t('auth.other')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="tags" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('customers.tags')}
                </Label>
                <TagsInput
                  value={formData.tags}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  existingTags={existingTags}
                  isRTL={isRTL}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('customers.notes') || 'Notes'}
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('customers.notesPlaceholder') || 'Additional notes about this customer'}
                  rows={3}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          </form>

          {/* Sticky Footer */}
          <DialogFooter className={`p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-between ${isRTL ? '' : ''}`}>
            <div className={`flex items-center gap-2 w-full sm:w-auto ${isRTL ? 'flex-row-reverse justify-start' : 'justify-start'} order-2 sm:order-1`}>
              <Label htmlFor="consentMarketing" className="cursor-pointer text-sm">
                {t('customers.consentMarketing') || 'Marketing Consent'}
              </Label>
              <Switch
                id="consentMarketing"
                checked={formData.consentMarketing}
                onCheckedChange={handleConsentChange}
              />
            </div>
            <div className={`flex gap-2 w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''} order-1 sm:order-2`}>
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 sm:flex-initial">
                {t('customers.cancel') || 'Cancel'}
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
                {editingCustomerId ? t('customers.updateCustomer') || 'Update Customer' : t('customers.addCustomer') || 'Add Customer'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          {selectedCustomer && (
            <>
              {/* Sticky Header */}
              <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
                <DialogTitle className="text-lg sm:text-xl break-words flex items-center gap-2">
                  {selectedCustomer.blocked && (
                    <Shield className="w-5 h-5 text-destructive" />
                  )}
                  {selectedCustomer.name}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {t('customers.customerDetails') || 'View and manage customer information and appointments'}
                </DialogDescription>
              </DialogHeader>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    {t('customers.information') || 'Information'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('customers.name')}</Label>
                      <p className="text-sm font-medium">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('customers.phone')}</Label>
                      <p className="text-sm font-medium">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('customers.email')}</Label>
                      <p className="text-sm font-medium">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('customers.lastVisit')}</Label>
                      <p className="text-sm font-medium">{formatDate(selectedCustomer.lastVisit, locale)}</p>
                    </div>
                    {selectedCustomer.dateOfBirth && (
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('customers.dateOfBirth')}</Label>
                        <p className="text-sm font-medium">{formatDate(selectedCustomer.dateOfBirth, locale)}</p>
                      </div>
                    )}
                    {selectedCustomer.gender && (
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('customers.gender')}</Label>
                        <p className="text-sm font-medium">{t(`auth.${selectedCustomer.gender}`) || selectedCustomer.gender}</p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">{t('customers.tags')}</Label>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {selectedCustomer.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedCustomer.notes && (
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">{t('customers.notes')}</Label>
                        <p className="text-sm mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                          {selectedCustomer.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointments */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                      {t('customers.appointments') || 'Appointments'} ({customerAppointments.length})
                    </h3>
                  </div>
                  {customerAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('customers.noAppointments') || 'No appointments found'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {customerAppointments.map((apt) => {
                        const start = new Date(apt.start);
                        const end = new Date(apt.end);
                        return (
                          <div
                            key={apt.id}
                            className="p-3 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{apt.service}</p>
                              <p className="text-xs text-muted-foreground">
                                {start.toLocaleDateString(locale)} {start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Badge
                                variant={
                                  apt.status === 'confirmed' ? 'default' :
                                  apt.status === 'pending' ? 'secondary' : 'destructive'
                                }
                                className="shrink-0"
                              >
                                {t(`calendar.${apt.status}`)}
                              </Badge>
                              {apt.status !== 'cancelled' && (
                                <Button
                                  onClick={() => handleSendReminderForAppointment(apt)}
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0"
                                >
                                  <Bell className={`w-3 h-3 ${isRTL ? 'ms-1' : 'me-1'}`} />
                                  {t('customers.sendReminder') || 'Send Reminder'}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer with Actions */}
              <DialogFooter className="p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row gap-3 sm:gap-2 flex-wrap">
                <Button
                  onClick={() => handleCall(selectedCustomer.phone)}
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                >
                  <Phone className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('customers.call') || 'Call'}
                </Button>
                <Button
                  onClick={() => {
                    handleCloseDetail();
                    handleEdit(selectedCustomer);
                  }}
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                >
                  <Eye className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('customers.viewEdit') || 'View/Edit'}
                </Button>
                <Button
                  onClick={handleToggleBlock}
                  variant={selectedCustomer.blocked ? 'default' : 'destructive'}
                  className="flex-1 sm:flex-initial"
                >
                  {selectedCustomer.blocked ? (
                    <>
                      <ShieldOff className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                      {t('customers.unblock') || 'Unblock'}
                    </>
                  ) : (
                    <>
                      <Shield className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                      {t('customers.block') || 'Block'}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancelAllAppointments}
                  variant="destructive"
                  className="flex-1 sm:flex-initial"
                  disabled={customerAppointments.filter(apt => apt.status !== 'cancelled').length === 0}
                >
                  <XCircle className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('customers.cancelAllAppointments') || 'Cancel All Appointments'}
                </Button>
                <Button
                  onClick={handleCreateAppointment}
                  className="flex-1 sm:flex-initial"
                >
                  <Calendar className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('customers.createAppointment') || 'Create Appointment'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Appointment Dialog */}
      <Dialog open={isCreateAppointmentDialogOpen} onOpenChange={setIsCreateAppointmentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Sticky Header */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-lg sm:text-xl break-words">{t('calendar.createAppointment')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{t('calendar.appointmentDetails')}</DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              <Label>{t('calendar.selectService')} *</Label>
              <Select
                value={appointmentFormData.serviceId}
                onValueChange={handleServiceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('calendar.selectService')} />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.active).map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({service.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('calendar.selectWorker')} *</Label>
              <Select
                value={appointmentFormData.workerId}
                onValueChange={(value) => setAppointmentFormData({ ...appointmentFormData, workerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('calendar.selectWorker')} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('calendar.startTime')} *</Label>
              <Input
                type="datetime-local"
                value={appointmentFormData.start ? new Date(appointmentFormData.start).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const newStart = new Date(e.target.value);
                  const service = services.find(s => s.id === appointmentFormData.serviceId);
                  if (service && !allowManualEndTime) {
                    // Auto-calculate end time based on service duration
                    const newEnd = new Date(newStart);
                    newEnd.setMinutes(newStart.getMinutes() + service.duration);
                    setAppointmentFormData({
                      ...appointmentFormData,
                      start: newStart.toISOString(),
                      end: newEnd.toISOString(),
                    });
                  } else {
                    setAppointmentFormData({
                      ...appointmentFormData,
                      start: newStart.toISOString(),
                    });
                  }
                }}
              />
            </div>
            <div>
              <Label>{t('calendar.endTime')} *</Label>
              <Input
                type="datetime-local"
                value={appointmentFormData.end ? new Date(appointmentFormData.end).toISOString().slice(0, 16) : ''}
                onChange={(e) => setAppointmentFormData({ ...appointmentFormData, end: new Date(e.target.value).toISOString() })}
                disabled={!!appointmentFormData.serviceId && !allowManualEndTime}
              />
              {appointmentFormData.serviceId && (
                <div className="mt-2 space-y-2">
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                    <Checkbox
                      id="allowManualEndTime"
                      checked={allowManualEndTime}
                      onCheckedChange={(checked) => {
                        setAllowManualEndTime(!!checked);
                        if (checked) {
                          // When enabling manual edit, don't auto-calculate anymore
                        } else {
                          // When disabling, recalculate based on service
                          const service = services.find(s => s.id === appointmentFormData.serviceId);
                          if (service && appointmentFormData.start) {
                            const start = new Date(appointmentFormData.start);
                            const end = new Date(start);
                            end.setMinutes(start.getMinutes() + service.duration);
                            setAppointmentFormData({ ...appointmentFormData, end: end.toISOString() });
                          }
                        }
                      }}
                    />
                    <Label
                      htmlFor="allowManualEndTime"
                      className="text-sm font-normal cursor-pointer"
                    >
                      {t('calendar.allowManualEndTime')}
                    </Label>
                  </div>
                  {!allowManualEndTime && (
                    <p className="text-xs text-muted-foreground">
                      {t('calendar.autoCalculatedEndTime')}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>{t('calendar.status')}</Label>
              <Select
                value={appointmentFormData.status}
                onValueChange={(value: 'confirmed' | 'pending' | 'cancelled') => 
                  setAppointmentFormData({ ...appointmentFormData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">{t('calendar.confirmed')}</SelectItem>
                  <SelectItem value="pending">{t('calendar.pending')}</SelectItem>
                  <SelectItem value="cancelled">{t('calendar.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sticky Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsCreateAppointmentDialogOpen(false)} className="flex-1 sm:flex-initial order-2 sm:order-1">
              {t('workers.cancel')}
            </Button>
            <Button onClick={handleSaveAppointment} className="flex-1 sm:flex-initial order-1 sm:order-2">
              {t('calendar.createBooking')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
