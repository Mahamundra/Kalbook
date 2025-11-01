import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { getCustomers, updateCustomer, deleteCustomer, createCustomer } from '@/components/ported/lib/mockData';
import { formatDate } from '@/components/ported/lib/i18n';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ported/ui/popover';

const defaultFormData = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  tags: [] as string[],
  consentMarketing: false,
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  
  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

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

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(t('customers.confirmDelete') || `Are you sure you want to delete ${name}?`)) {
      if (deleteCustomer(id)) {
        setCustomers(getCustomers());
        toast.success(t('customers.customerDeleted') || 'Customer deleted successfully');
      } else {
        toast.error('Failed to delete customer');
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
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes || '',
      tags: customer.tags || [],
      consentMarketing: customer.consentMarketing || false,
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingCustomerId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('customers.required') || 'Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error(t('customers.required') || 'Phone is required');
      return;
    }

    if (!formData.email.trim()) {
      toast.error(t('customers.required') || 'Email is required');
      return;
    }

    const customerData = {
      ...formData,
      tags: formData.tags,
      lastVisit: editingCustomerId 
        ? customers.find(c => c.id === editingCustomerId)?.lastVisit || new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      visitHistory: editingCustomerId
        ? customers.find(c => c.id === editingCustomerId)?.visitHistory || []
        : [],
    };

    if (editingCustomerId) {
      updateCustomer(editingCustomerId, customerData);
      toast.success(t('customers.customerUpdated') || 'Customer updated successfully');
    } else {
      createCustomer(customerData);
      toast.success(t('customers.customerCreated') || 'Customer created successfully');
    }
    
    setCustomers(getCustomers());
    handleClose();
  };

  const columns = [
    {
      key: 'name',
      label: t('customers.name'),
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
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 me-2" />
            {t('customers.add')}
          </Button>
        }
      />

      <DataTable
        data={customers}
        columns={columns}
        searchable
        searchPlaceholder={t('customers.search')}
        emptyMessage="No customers found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-visible" dir={isRTL ? 'rtl' : 'ltr'} style={{ overflowX: 'visible' }}>
          <DialogHeader>
            <DialogTitle>
              {editingCustomerId 
                ? t('customers.editCustomerTitle')?.replace('{name}', formData.name) || `Edit ${formData.name}`
                : t('customers.createCustomer') || 'Create New Customer'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomerId 
                ? t('customers.editDescription') || 'Update the customer details below.'
                : t('customers.createDescription') || 'Fill in the details below to create a new customer.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  {t('customers.email')} *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder={t('customers.email')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
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

              <div className={`md:col-span-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Label htmlFor="consentMarketing" className="cursor-pointer">
                  {t('customers.consentMarketing') || 'Marketing Consent'}
                </Label>
                <Switch
                  id="consentMarketing"
                  checked={formData.consentMarketing}
                  onCheckedChange={(checked) => setFormData({ ...formData, consentMarketing: checked })}
                />
              </div>
            </div>

            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('customers.cancel') || 'Cancel'}
              </Button>
              <Button type="submit">
                {editingCustomerId ? t('customers.updateCustomer') || 'Update Customer' : t('customers.addCustomer') || 'Add Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
