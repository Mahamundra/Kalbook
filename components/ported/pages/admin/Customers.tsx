import { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '@/components/ported/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { 
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
import { Plus, Pencil, Trash2, X, Phone, Bell, Eye, Shield, ShieldOff, Calendar, XCircle, Download, Upload, MessageSquare, Mail, MoreVertical, LayoutGrid, List, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ported/ui/dropdown-menu';
import { toast } from 'sonner';
import type { Customer } from '@/types/admin';
import { CustomerStatisticsCard } from '@/components/admin/CustomerStatisticsCard';
import { CommunicationHistory } from '@/components/admin/CommunicationHistory';
import { NotesHistory } from '@/components/admin/NotesHistory';
import { CSVImportDialog } from '@/components/admin/CSVImportDialog';
import { BulkOperationsDialog } from '@/components/admin/BulkOperationsDialog';
import { CustomerMergeDialog } from '@/components/admin/CustomerMergeDialog';
import { ClientMeasurements } from '@/components/admin/ClientMeasurements';
import { MembershipCard } from '@/components/admin/MembershipCard';
import { FollowUpTracker } from '@/components/admin/FollowUpTracker';
import { AttendanceMarker } from '@/components/admin/AttendanceMarker';
import { ReassignDialog } from '@/components/admin/ReassignDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ported/ui/tabs';
import { downloadCSV } from '@/lib/customers/csv-utils';
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
  isRTL,
  t
}: { 
  value: string[]; 
  onChange: (tags: string[]) => void; 
  existingTags: string[];
  isRTL: boolean;
  t: (key: string) => string | undefined;
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
            placeholder={t('customers.addTags') || (isRTL ? 'הוסף תגיות...' : 'Add tags...')}
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

  // Format phone number with dashes (050-000-0000)
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limited = digits.slice(0, 10);
    
    // Format as XXX-XXX-XXXX (always maintain dashes)
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };
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
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBulkOperationsDialogOpen, setIsBulkOperationsDialogOpen] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<'tags' | 'export' | 'communication'>('tags');
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const isGymTrainer = businessType === 'gym_trainer';
  const hasUserNavigatedTabs = useRef(false);
  
  // Helper function to get conditional translation key
  const getT = (key: string) => {
    if (isGymTrainer && key.startsWith('customers.')) {
      return t(key.replace('customers.', 'clients.')) || t(key);
    }
    return t(key);
  };
  
  useEffect(() => {
    setMounted(true);
    loadCustomers();
    
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
    const loadOtherData = async () => {
      try {
        const [servicesData, workersData] = await Promise.all([
          getServices(),
          getWorkers(),
        ]);
        setServices(servicesData);
        setWorkers(workersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadOtherData();

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
      });
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [page, limit, search, sortBy, sortOrder]);

  // Fetch all tags from customers for filter dropdown
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/customers?limit=10000&page=1');
        const data = await response.json();
        if (data.success) {
          const allTags: string[] = [];
          (data.customers || []).forEach((customer: Customer) => {
            if (customer.tags && customer.tags.length > 0) {
              allTags.push(...customer.tags);
            }
          });
          setExistingTags(Array.from(new Set(allTags))); // Remove duplicates
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    fetchTags();
  }, []);

  const handleDetailTabChange = useCallback((value: string) => {
    if (value !== 'overview') {
      hasUserNavigatedTabs.current = true;
    }
    setDetailTab(value);
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (search) params.append('search', search);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/customers?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setTotalCustomers(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  
  const { localeReady } = useDirection();
  
  // Load appointments when selectedCustomer changes - must be before early return
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

  useEffect(() => {
    if (tabsListRef.current && isDetailDialogOpen) {
      const list = tabsListRef.current;
      const targetLeft = isRTL ? list.scrollWidth - list.clientWidth : 0;
      list.scrollTo({ left: targetLeft, behavior: 'auto' });
    }
    if (!isDetailDialogOpen) {
      hasUserNavigatedTabs.current = false;
    }
  }, [isDetailDialogOpen, isRTL]);

  useEffect(() => {
    if (!isDetailDialogOpen) return;
    if (!hasUserNavigatedTabs.current && detailTab === 'overview') return;
    const target = tabRefs.current[detailTab];
    if (target?.scrollIntoView) {
      target.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: isRTL ? 'end' : 'start',
      });
    }
  }, [detailTab, isDetailDialogOpen, isRTL]);

  // Handle consent change - must be before early return
  const handleConsentChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, consentMarketing: checked }));
  }, []);
  
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


  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(t('customers.confirmDelete') || `Are you sure you want to delete ${name}?`)) {
      try {
        const success = await deleteCustomer(id);
        if (success) {
          loadCustomers();
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
          loadCustomers();
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
    // Format phone number when loading for edit
    const formattedPhone = customer.phone ? formatPhoneNumber(customer.phone) : '';
    setFormData({
      name: customer.name,
      phone: formattedPhone,
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
    setDetailTab('overview');
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setSelectedCustomer(null);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    // Remove any non-digit characters and ensure proper format
    const cleanPhone = phone.replace(/\D/g, '');
    // Open WhatsApp with the phone number
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
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
        loadCustomers();
        setSelectedCustomer(updated);
        if (newBlockedState) {
          toast.success(isGymTrainer ? getT('customers.clientBlockedWorkouts') : getT('customers.customerBlocked') || (isGymTrainer ? 'Client blocked from future workouts' : 'Customer blocked from future appointments'));
        } else {
          toast.success(getT('customers.customerUnblocked') || 'Customer unblocked');
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
      toast.info(isGymTrainer ? getT('customers.noWorkouts') : getT('customers.noAppointments') || (isGymTrainer ? 'No active workouts to cancel' : 'No active appointments to cancel'));
      return;
    }
    if (window.confirm(
      (isGymTrainer ? getT('customers.confirmCancelWorkouts') : getT('customers.confirmCancelAppointments'))?.replace('{count}', count.toString()) || 
      `Are you sure you want to cancel ${count} appointment(s)?`
    )) {
      try {
        const canceledCount = await cancelCustomerAppointments(selectedCustomer.id);
        const updatedAppointments = await getAppointmentsByCustomerId(selectedCustomer.id);
        setCustomerAppointments(updatedAppointments);
        loadCustomers();
        // Refresh selected customer
        const response = await fetch(`/api/customers?page=1&limit=1000`);
        const data = await response.json();
        if (data.success) {
          const updated = data.customers.find((c: Customer) => c.id === selectedCustomer.id);
          if (updated) setSelectedCustomer(updated);
        }
        toast.success(
          (isGymTrainer ? getT('customers.workoutsCancelled') : getT('customers.appointmentsCancelled'))?.replace('{count}', canceledCount.toString()) || 
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
            toast.error(t('customers.planLimitAddCustomers') || 'Your plan doesn\'t allow adding customers. Please upgrade to continue.');
            return;
          }
        } catch (error) {
          console.error('Error checking feature:', error);
          // Continue if check fails (don't block user)
        }
      }

      // Normalize phone (remove dashes) for API calls
      const normalizedPhone = formData.phone.replace(/[\s\-\(\)]/g, '');

      // Check for duplicate phone number (only when creating new customer or updating to a different phone)
      if (!editingCustomerId) {
        // Creating new customer - check if phone already exists
        const existingCustomer = await getCustomerByPhone(normalizedPhone);
        if (existingCustomer) {
          toast.error(t('customers.phoneExists') || 'A customer with this phone number already exists');
          return;
        }
      } else {
        // Updating existing customer - check if phone exists for a different customer
        const existingCustomer = await getCustomerByPhone(normalizedPhone);
        if (existingCustomer && existingCustomer.id !== editingCustomerId) {
          toast.error(t('customers.phoneExists') || 'A customer with this phone number already exists');
          return;
        }
      }

      const customerData = {
        ...formData,
        phone: normalizedPhone, // Save normalized phone (without dashes)
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
      
      loadCustomers();
      handleClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast.error(t('customers.saveError') || 'Failed to save customer');
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
      render: (customer: Customer) => {
        // Format phone number with dashes for display
        return formatPhoneNumber(customer.phone || '');
      },
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
          <div className={`flex items-center gap-2 justify-end ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCall(customer.phone);
              }}
              title={t('customers.call') || 'Call'}
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(customer);
              }}
              title={t('customers.viewEdit') || 'Edit'}
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
              title={t('customers.delete') || 'Delete'}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleExport = async () => {
    try {
      const filters = {
        search,
        sortBy,
        sortOrder,
      };
      const response = await fetch('/api/customers/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(t('customers.exportSuccess') || 'Customers exported successfully');
      } else {
        toast.error(t('customers.exportError') || 'Failed to export customers');
      }
    } catch (error) {
      toast.error(t('customers.exportError') || 'Failed to export customers');
    }
  };

  const handleBulkOperation = (operation: 'tags' | 'export' | 'communication') => {
    setBulkOperation(operation);
    setIsBulkOperationsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={getT('customers.title')}
        action={
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            {selectedIds.length > 0 && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('customers.deleteSelected')?.replace('{count}', selectedIds.length.toString()) || 
                    `Delete (${selectedIds.length})`}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleBulkOperation('communication')}
                  className="w-full sm:w-auto"
                >
                  {t('customers.bulkCommunication') || 'Bulk Message'}
                </Button>
              </>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline"
                onClick={handleExport}
                className="flex-1 sm:flex-none sm:w-auto"
              >
                <Download className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.export') || 'Export'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                className="flex-1 sm:flex-none sm:w-auto"
              >
                <Upload className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.import') || 'Import'}
              </Button>
            </div>
            <Button 
              onClick={handleCreate} 
              className="w-full sm:w-auto"
              disabled={!canManageCustomers}
              title={!canManageCustomers ? (t('customers.planLimitAddCustomers') || 'Your plan doesn\'t allow adding customers. Please upgrade to continue.') : ''}
            >
              <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
              {getT('customers.add')}
            </Button>
          </div>
        }
      />

      <div className="space-y-4 px-4 sm:px-0">
        <div className={`flex items-center gap-2 flex-wrap ${isRTL ? '' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={getT('customers.search') || 'Search customers...'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset to first page when search changes
              }}
              className="w-full"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          
          {/* Sort By */}
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value);
              setPage(1); // Reset to first page when sort changes
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('customers.filters.sortBy') || 'Sort By'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t('customers.name') || 'Name'}</SelectItem>
              <SelectItem value="created_at">{t('customers.filters.createdDate') || 'Created Date'}</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-2"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <DataTable
            data={customers}
            columns={columns}
            searchable={false}
            searchPlaceholder={getT('customers.search')}
            emptyMessage={getT('customers.noCustomersFound') || (isGymTrainer ? 'No clients found' : 'No customers found')}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={handleCustomerClick}
            loading={loading}
          />
        ) : (
          <div className="space-y-4 px-4 sm:px-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('customers.loading') || 'Loading...'}
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {getT('customers.noCustomersFound') || (isGymTrainer ? 'No clients found' : 'No customers found')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer)}
                    className={`border rounded-lg p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all bg-card min-h-[180px] sm:min-h-[200px] flex flex-col ${selectedIds.includes(customer.id) ? 'ring-2 ring-primary' : ''} ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <div className={`flex items-start justify-between mb-3 sm:mb-4 ${isRTL ? '' : ''}`}>
                      <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 mb-2 sm:mb-3 ${isRTL ? '' : ''}`}>
                          {customer.blocked && (
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0" />
                          )}
                          <h3 className={`font-semibold text-sm sm:text-base truncate ${isRTL ? 'text-right' : 'text-left'}`}>{customer.name}</h3>
                        </div>
                        <div className={`space-y-1.5 sm:space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <div className={`flex items-center gap-2 ${isRTL ? '' : ''}`}>
                            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                            <p className={`text-xs sm:text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                              {formatPhoneNumber(customer.phone || '')}
                            </p>
                          </div>
                          {customer.email && (
                            <div className={`flex items-center gap-2 ${isRTL ? '' : ''}`}>
                              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                              <p className={`text-xs sm:text-sm text-muted-foreground truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                                {customer.email}
                              </p>
                            </div>
                          )}
                          {customer.lastVisit && (
                            <div className={`flex items-center gap-2 ${isRTL ? '' : ''}`}>
                              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                              <p className={`text-xs sm:text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                                {formatDate(customer.lastVisit, locale)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(customer.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, customer.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== customer.id));
                          }
                        }}
                        className="shrink-0 w-4 h-4 sm:w-5 sm:h-5 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {customer.tags && customer.tags.length > 0 && (
                      <div className={`flex gap-1.5 sm:gap-2 flex-wrap mt-auto pt-3 sm:pt-4 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 3 && (
                          <Badge variant="secondary" className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                            +{customer.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Sticky Header */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className={`text-lg sm:text-xl break-words ${isRTL ? 'text-right' : 'text-left'}`}>
              {editingCustomerId 
                ? getT('customers.editCustomerTitle')?.replace('{name}', formData.name) || `Edit ${formData.name}`
                : getT('customers.createCustomer') || (isGymTrainer ? 'Create New Client' : 'Create New Customer')}
            </DialogTitle>
            <DialogDescription className={`text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
              {editingCustomerId 
                ? getT('customers.editDescription') || (isGymTrainer ? 'Update the client details below.' : 'Update the customer details below.')
                : getT('customers.createDescription') || (isGymTrainer ? 'Fill in the details below to create a new client.' : 'Fill in the details below to create a new customer.')}
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
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setFormData({ ...formData, phone: formatted });
                  }}
                  required
                  placeholder={t('customers.phone') || '050-000-0000'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  maxLength={12}
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
                  <select
                    id="birthYear"
                    value={formData.birthYear}
                    onChange={(e) => {
                      const value = e.target.value;
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
                    className="w-full sm:flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    dir="ltr"
                  >
                    <option value="">{t('auth.year') || 'Year'}</option>
                      {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                        <option key={year} value={year.toString()}>
                            {year}
                        </option>
                        );
                      })}
                  </select>

                  {/* Month Select */}
                  <select
                    id="birthMonth"
                    value={formData.birthMonth}
                    onChange={(e) => {
                      const value = e.target.value;
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
                    className="w-full sm:flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    dir="ltr"
                  >
                    <option value="">{t('auth.month') || 'Month'}</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1;
                        const monthName = new Date(2000, month - 1, 1).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { month: 'long' });
                        return (
                        <option key={month} value={month.toString().padStart(2, '0')}>
                            {monthName}
                        </option>
                        );
                      })}
                  </select>

                  {/* Day Select */}
                  <select
                    id="birthDay"
                    value={formData.birthDay}
                    onChange={(e) => {
                      const day = e.target.value;
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
                    className="w-full sm:flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    dir="ltr"
                  >
                    <option value="">{t('auth.day') || 'Day'}</option>
                      {(() => {
                        // If year and month are selected, show correct days for that month
                        if (formData.birthYear && formData.birthMonth) {
                          const year = parseInt(formData.birthYear);
                          const month = parseInt(formData.birthMonth);
                          const daysInMonth = new Date(year, month, 0).getDate();
                          return Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            return (
                            <option key={day} value={day.toString().padStart(2, '0')}>
                                {day}
                            </option>
                            );
                          });
                        } else {
                          // If year/month not selected, show 1-31 as default
                          return Array.from({ length: 31 }, (_, i) => {
                            const day = i + 1;
                            return (
                            <option key={day} value={day.toString().padStart(2, '0')}>
                                {day}
                            </option>
                            );
                          });
                        }
                      })()}
                  </select>
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
                  t={t}
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
                {editingCustomerId ? getT('customers.updateCustomer') || (isGymTrainer ? 'Update Client' : 'Update Customer') : getT('customers.addCustomer') || (isGymTrainer ? 'Add Client' : 'Add Customer')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className={`max-w-4xl h-[100dvh] sm:h-[90vh] flex flex-col p-0 overflow-hidden w-full sm:w-[95vw] ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          {selectedCustomer && (
            <>
              {/* Sticky Header */}
              <DialogHeader className={`p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10 flex-shrink-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center justify-between gap-2">
                  {isRTL ? (
                    <>
                      <DialogTitle className={`text-lg sm:text-xl break-words flex items-center gap-2 flex-1 text-left`}>
                        {selectedCustomer.blocked && (
                          <Shield className="w-5 h-5 text-destructive flex-shrink-0" />
                        )}
                        <span className="text-left truncate">{selectedCustomer.name}</span>
                      </DialogTitle>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 rounded-full flex-shrink-0"
                        onClick={() => setIsDetailDialogOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 rounded-full flex-shrink-0"
                        onClick={() => setIsDetailDialogOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <DialogTitle className={`text-lg sm:text-xl break-words flex items-center gap-2 flex-1 text-right`}>
                        {selectedCustomer.blocked && (
                          <Shield className="w-5 h-5 text-destructive flex-shrink-0" />
                        )}
                        <span className="text-right truncate">{selectedCustomer.name}</span>
                      </DialogTitle>
                    </>
                  )}
                </div>
                <DialogDescription className={`text-xs sm:text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {getT('customers.customerDetails') || (isGymTrainer ? 'View and manage client information and appointments' : 'View and manage customer information and appointments')}
                </DialogDescription>
              </DialogHeader>
              
              {/* Tabs */}
              <Tabs value={detailTab} onValueChange={handleDetailTabChange} className="flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="border-b md:border-b-0 flex-shrink-0">
                  <TabsList
                    ref={tabsListRef}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={`flex flex-row w-full h-14 md:h-auto bg-transparent p-0 gap-0 overflow-x-auto settings-nav-scrollbar overflow-y-hidden touch-pan-x [-webkit-overflow-scrolling:touch] ${isRTL ? 'pr-4 pl-4 md:px-4' : 'pl-4 pr-4 md:px-4'}`}
                  >
                    <TabsTrigger
                      value="overview"
                      ref={(el) => (tabRefs.current.overview = el)}
                      className={`flex-shrink-0 justify-center gap-2 ${isRTL ? 'pr-4 pl-2 md:px-3' : 'pl-4 pr-2 md:px-3'} py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                    >
                      {t('customers.overview') || 'Overview'}
                    </TabsTrigger>
                    <TabsTrigger
                      value="appointments"
                      ref={(el) => (tabRefs.current.appointments = el)}
                      className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                    >
                      {isGymTrainer ? getT('customers.workouts') : getT('customers.appointments')}
                    </TabsTrigger>
                    {isGymTrainer && (
                      <>
                        <TabsTrigger
                          value="measurements"
                          ref={(el) => (tabRefs.current.measurements = el)}
                          className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                        >
                          {getT('customers.measurements')}
                        </TabsTrigger>
                        <TabsTrigger
                          value="workout-plans"
                          ref={(el) => (tabRefs.current['workout-plans'] = el)}
                          className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                        >
                          {getT('customers.workoutPlans')}
                        </TabsTrigger>
                        <TabsTrigger
                          value="progress"
                          ref={(el) => (tabRefs.current.progress = el)}
                          className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                        >
                          {getT('customers.progress')}
                        </TabsTrigger>
                        <TabsTrigger
                          value="membership"
                          ref={(el) => (tabRefs.current.membership = el)}
                          className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                        >
                          {getT('customers.membership') || 'Membership'}
                        </TabsTrigger>
                        <TabsTrigger
                          value="follow-ups"
                          ref={(el) => (tabRefs.current['follow-ups'] = el)}
                          className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                        >
                          {getT('customers.followUps') || 'Follow-Ups'}
                        </TabsTrigger>
                      </>
                    )}
                    <TabsTrigger
                      value="statistics"
                      ref={(el) => (tabRefs.current.statistics = el)}
                      className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                    >
                      {t('customers.statistics.title') || 'Statistics'}
                    </TabsTrigger>
                    <TabsTrigger
                      value="communications"
                      ref={(el) => (tabRefs.current.communications = el)}
                      className={`hidden flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                    >
                      {t('customers.communications.title') || 'Communications'}
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      ref={(el) => (tabRefs.current.notes = el)}
                      className={`flex-shrink-0 justify-center gap-2 px-2 md:px-3 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold min-w-fit whitespace-nowrap`}
                    >
                      {t('customers.notesHistory.title') || 'Notes History'}
                    </TabsTrigger>
                  </TabsList>
                </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0">
                <TabsContent value="overview" className="space-y-6 mt-0 focus-visible:outline-none">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    {t('customers.information') || 'Information'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.name')}</Label>
                      <p className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.phone')}</Label>
                      <p className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{formatPhoneNumber(selectedCustomer.phone || '')}</p>
                    </div>
                    <div>
                      <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.email')}</Label>
                      <p className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.lastVisit')}</Label>
                      <p className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{formatDate(selectedCustomer.lastVisit, locale)}</p>
                    </div>
                    {selectedCustomer.dateOfBirth && (
                      <div>
                        <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.dateOfBirth')}</Label>
                        <p className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{formatDate(selectedCustomer.dateOfBirth, locale)}</p>
                      </div>
                    )}
                    {selectedCustomer.gender && (
                      <div>
                        <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.gender')}</Label>
                        <p className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t(`auth.${selectedCustomer.gender}`) || selectedCustomer.gender}</p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.tags')}</Label>
                      <div className={`flex gap-1 flex-wrap mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {selectedCustomer.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedCustomer.notes && (
                      <div className="sm:col-span-2">
                        <Label className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t('customers.notes')}</Label>
                        <p className={`text-sm mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
                          {selectedCustomer.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                </TabsContent>

                <TabsContent value="appointments" className="space-y-4 mt-0">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`text-sm font-semibold text-muted-foreground uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isGymTrainer ? getT('customers.workouts') : getT('customers.appointments')} ({customerAppointments.length})
                    </h3>
                  </div>
                  {customerAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isGymTrainer ? getT('customers.noWorkouts') : getT('customers.noAppointments') || (isGymTrainer ? 'No workouts found' : 'No appointments found')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {customerAppointments.map((apt) => {
                        const start = new Date(apt.start);
                        const end = new Date(apt.end);
                        return (
                          <div
                            key={apt.id}
                            className={`p-3 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}
                          >
                            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                              {isGymTrainer && apt.status === 'confirmed' && (
                                <>
                                  <AttendanceMarker
                                    appointmentId={apt.id}
                                    attended={(apt as any).attended || false}
                                    noShow={(apt as any).no_show || false}
                                    attendanceNotes={(apt as any).attendance_notes || null}
                                    onUpdate={() => {
                                      loadCustomers();
                                      const updated = customers.find(c => c.id === selectedCustomer.id);
                                      if (updated) setSelectedCustomer(updated);
                                    }}
                                  />
                                  <ReassignDialog
                                    appointmentId={apt.id}
                                    currentWorkerId={apt.workerId || apt.staffId || ''}
                                    serviceId={apt.serviceId || ''}
                                    workers={workers}
                                    onReassigned={() => {
                                      loadCustomers();
                                      const updated = customers.find(c => c.id === selectedCustomer.id);
                                      if (updated) setSelectedCustomer(updated);
                                    }}
                                  >
                                    <Button variant="outline" size="sm" className="shrink-0">
                                      <Users className={`w-3 h-3 ${isRTL ? 'ms-1' : 'me-1'}`} />
                                      {t('reassign.reassign') || 'Reassign'}
                                    </Button>
                                  </ReassignDialog>
                                </>
                              )}
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
                </TabsContent>

                <TabsContent value="statistics" className="mt-0">
                  <CustomerStatisticsCard customerId={selectedCustomer.id} />
                </TabsContent>

                <TabsContent value="communications" className="mt-0">
                  <CommunicationHistory 
                    customerId={selectedCustomer.id}
                    onSend={() => {
                      // Refresh if needed
                    }}
                  />
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <NotesHistory 
                    customerId={selectedCustomer.id}
                    onAddNote={() => {
                      loadCustomers();
                      // Refresh customer data
                      const updated = customers.find(c => c.id === selectedCustomer.id);
                      if (updated) setSelectedCustomer(updated);
                    }}
                  />
                </TabsContent>
                {isGymTrainer && (
                  <>
                    <TabsContent value="measurements" className="mt-0">
                      <ClientMeasurements customerId={selectedCustomer.id} />
                    </TabsContent>
                    <TabsContent value="workout-plans" className="mt-0">
                      <div className={`p-4 text-center text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                        {getT('customers.workoutPlans')} - Coming soon
                      </div>
                    </TabsContent>
                    <TabsContent value="progress" className="mt-0">
                      <div className={`p-4 text-center text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                        {getT('customers.progress')} - Coming soon
                      </div>
                    </TabsContent>
                    <TabsContent value="membership" className="mt-0">
                      <MembershipCard 
                        customerId={selectedCustomer.id}
                        onUpdate={() => {
                          loadCustomers();
                          const updated = customers.find(c => c.id === selectedCustomer.id);
                          if (updated) setSelectedCustomer(updated);
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="follow-ups" className="mt-0">
                      <FollowUpTracker 
                        customerId={selectedCustomer.id}
                        onUpdate={() => {
                          loadCustomers();
                          const updated = customers.find(c => c.id === selectedCustomer.id);
                          if (updated) setSelectedCustomer(updated);
                        }}
                      />
                    </TabsContent>
                  </>
                )}
              </div>
              </Tabs>

              {/* Sticky Footer with Actions */}
              <DialogFooter className={`p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col gap-3 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'} sm:justify-between`}>
                {/* Main Action Buttons */}
                <div className={`flex flex-col sm:flex-row gap-2 flex-wrap ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  <Button
                    onClick={handleCreateAppointment}
                    className="flex-1 sm:flex-initial"
                  >
                    <Calendar className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                    {isGymTrainer ? getT('customers.scheduleWorkout') : getT('customers.createAppointment') || (isGymTrainer ? 'Schedule Workout' : 'Create Appointment')}
                  </Button>
                <Button
                  onClick={() => handleCall(selectedCustomer.phone)}
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                >
                  <Phone className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('customers.call') || 'Call'}
                </Button>
                <Button
                    onClick={() => handleWhatsApp(selectedCustomer.phone)}
                    variant="outline"
                    className="flex-1 sm:flex-initial"
                  >
                    <MessageSquare className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                    WhatsApp
                  </Button>
                </div>

                {/* Actions Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 sm:flex-initial">
                      <MoreVertical className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                      {t('customers.actions') || 'Actions'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? 'end' : 'start'} className={isRTL ? 'text-right' : 'text-left'}>
                    <DropdownMenuItem
                  onClick={() => {
                    handleCloseDetail();
                    handleEdit(selectedCustomer);
                  }}
                      className={`${isRTL ? 'flex-row-reverse' : ''}`}
                      style={{
                        // @ts-ignore - Radix UI data attributes
                        '--hover-bg': '#030408',
                        '--hover-text': '#ffffff',
                      } as React.CSSProperties}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#030408';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.color = '';
                      }}
                >
                  <Eye className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('customers.viewEdit') || 'View/Edit'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                  onClick={handleToggleBlock}
                      className={`${selectedCustomer.blocked ? '' : 'text-destructive'} ${isRTL ? 'flex-row-reverse' : ''}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#030408';
                        if (!selectedCustomer.blocked) {
                          e.currentTarget.style.color = 'rgb(239 68 68)'; // destructive color
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.color = '';
                      }}
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
                    </DropdownMenuItem>
                    <DropdownMenuItem
                  onClick={handleCancelAllAppointments}
                  disabled={customerAppointments.filter(apt => apt.status !== 'cancelled').length === 0}
                      className={`text-destructive ${isRTL ? 'flex-row-reverse' : ''}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#030408';
                        e.currentTarget.style.color = 'rgb(239 68 68)'; // destructive color
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.color = '';
                      }}
                >
                  <XCircle className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                      {isGymTrainer ? getT('customers.cancelAllWorkouts') : getT('customers.cancelAllAppointments') || (isGymTrainer ? 'Cancel All Workouts' : 'Cancel All Appointments')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsMergeDialogOpen(true);
                  }}
                      className={isRTL ? 'flex-row-reverse' : ''}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#030408';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.color = '';
                      }}
                >
                  {t('customers.merge.title') || 'Merge Customer'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
            <DialogTitle className={`text-lg sm:text-xl break-words ${isRTL ? 'text-right' : 'text-left'}`}>
              {isGymTrainer ? t('calendar.scheduleNewWorkout') : t('calendar.createAppointment')}
            </DialogTitle>
            <DialogDescription className={`text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
              {isGymTrainer ? t('calendar.workoutDetails') : t('calendar.appointmentDetails')}
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              <Label>{isGymTrainer ? t('calendar.selectWorkoutType') : t('calendar.selectService')} *</Label>
              <Select
                value={appointmentFormData.serviceId}
                onValueChange={handleServiceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isGymTrainer ? t('calendar.selectWorkoutType') : t('calendar.selectService')} />
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
              <Label>{isGymTrainer ? t('calendar.selectTrainer') : t('calendar.selectWorker')} *</Label>
              <Select
                value={appointmentFormData.workerId}
                onValueChange={(value) => setAppointmentFormData({ ...appointmentFormData, workerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isGymTrainer ? t('calendar.selectTrainer') : t('calendar.selectWorker')} />
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

      {/* Import Dialog */}
      <CSVImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={() => {
          loadCustomers();
        }}
      />

      {/* Bulk Operations Dialog */}
      <BulkOperationsDialog
        open={isBulkOperationsDialogOpen}
        onClose={() => setIsBulkOperationsDialogOpen(false)}
        selectedIds={selectedIds}
        operation={bulkOperation}
        onComplete={() => {
          loadCustomers();
          setSelectedIds([]);
        }}
      />

      {/* Merge Dialog */}
      <CustomerMergeDialog
        open={isMergeDialogOpen}
        onClose={() => setIsMergeDialogOpen(false)}
        customers={
          selectedIds.length >= 2
            ? customers.filter(c => selectedIds.includes(c.id))
            : customers.slice(0, 10) // Show first 10 if no selection
        }
        onMerge={() => {
          loadCustomers();
          setSelectedIds([]);
          setIsDetailDialogOpen(false);
        }}
      />

    </div>
  );
};

export default Customers;
