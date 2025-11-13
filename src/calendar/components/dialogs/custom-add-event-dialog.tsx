/**
 * Custom AddEventDialog that integrates with our appointment system
 * Replaces the demo AddEventDialog from big-calendar
 */

"use client";

import { useEffect, useState } from "react";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useLocale } from "@/components/ported/hooks/useLocale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DateTimePicker } from "@/components/ui/datetime-picker";

import type { Service, Worker, Customer } from "@/components/ported/types/admin";

interface IProps {
  children: React.ReactNode;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
  services: Service[];
  workers: Worker[];
  customers: Customer[];
  onCreateAppointment: (appointment: {
    serviceId: string;
    customerId: string;
    workerId: string;
    start: string;
    end: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }) => Promise<void>;
  onQuickCreateCustomer?: () => void;
}

export function CustomAddEventDialog({ 
  children, 
  startDate, 
  startTime,
  services,
  workers,
  customers,
  onCreateAppointment,
  onQuickCreateCustomer,
}: IProps) {
  const { t, isRTL } = useLocale();
  const { isOpen, onClose, onToggle } = useDisclosure();
  
  const [formData, setFormData] = useState({
    serviceId: '',
    customerId: '',
    workerId: workers[0]?.id || '',
    start: '',
    end: '',
    status: 'confirmed' as 'confirmed' | 'pending' | 'cancelled',
  });
  const [allowManualEndTime, setAllowManualEndTime] = useState(false);
  const [isQuickCustomerDialogOpen, setIsQuickCustomerDialogOpen] = useState(false);
  const [quickCustomerData, setQuickCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  // Initialize form with start date/time when dialog opens
  useEffect(() => {
    if (isOpen && startDate && startTime) {
      const start = new Date(startDate);
      start.setHours(startTime.hour, startTime.minute, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        start: start.toISOString(),
        end: end.toISOString(),
        workerId: workers[0]?.id || prev.workerId,
      }));
    }
  }, [isOpen, startDate, startTime, workers]);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service && formData.start && !allowManualEndTime) {
      const start = new Date(formData.start);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + service.duration);
      setFormData({
        ...formData,
        serviceId,
        end: end.toISOString(),
      });
    } else {
      setFormData({ ...formData, serviceId });
    }
  };

  const handleSubmit = async () => {
    if (!formData.serviceId || !formData.customerId || !formData.workerId) {
      toast.error(t('calendar.required'));
      return;
    }

    if (!formData.start) {
      toast.error(t('calendar.required'));
      return;
    }

    try {
      await onCreateAppointment({
        serviceId: formData.serviceId,
        customerId: formData.customerId,
        workerId: formData.workerId,
        start: formData.start,
        end: formData.end,
        status: formData.status,
      });
      
      // Reset form
      setFormData({
        serviceId: '',
        customerId: '',
        workerId: workers[0]?.id || '',
        start: '',
        end: '',
        status: 'confirmed',
      });
      setAllowManualEndTime(false);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create appointment');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onToggle}>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-lg sm:text-xl break-words">{t('calendar.createAppointment')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{t('calendar.appointmentDetails')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              <Label>{t('calendar.selectService')} *</Label>
              <Select
                value={formData.serviceId}
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
              <Label>{t('calendar.selectCustomer')} *</Label>
              <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {isRTL && onQuickCreateCustomer && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQuickCustomerDialogOpen(true)}
                    className="h-10 px-3 text-xs whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    {t('calendar.addNewCustomer')}
                  </Button>
                )}
                <div className="flex-1">
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('calendar.selectCustomer')}>
                        {formData.customerId ? customers.find(c => c.id === formData.customerId)?.name : ''}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <span className="truncate">{customer.name?.trim() || ''}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isRTL && onQuickCreateCustomer && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQuickCustomerDialogOpen(true)}
                    className="h-10 px-3 text-xs whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('calendar.addNewCustomer')}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>{t('calendar.selectWorker')} *</Label>
              <Select
                value={formData.workerId}
                onValueChange={(value) => setFormData({ ...formData, workerId: value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('calendar.startTime')} *</Label>
                  <DateTimePicker
                    value={formData.start || undefined}
                    onChange={(date) => {
                      if (date) {
                        const service = services.find(s => s.id === formData.serviceId);
                        if (service && !allowManualEndTime) {
                          const newEnd = new Date(date);
                          newEnd.setMinutes(newEnd.getMinutes() + service.duration);
                          setFormData({
                            ...formData,
                            start: date.toISOString(),
                            end: newEnd.toISOString(),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            start: date.toISOString(),
                          });
                        }
                      } else {
                        setFormData({
                          ...formData,
                          start: '',
                        });
                      }
                    }}
                    placeholder={t('calendar.chooseStartDate') || 'Choose start date'}
                    isRTL={isRTL}
                  />
                </div>

                <div>
                  <Label>{t('calendar.endTime')} *</Label>
                  <DateTimePicker
                    value={formData.end || undefined}
                    onChange={(date) => {
                      setFormData({
                        ...formData,
                        end: date ? date.toISOString() : '',
                      });
                    }}
                    placeholder={t('calendar.chooseEndDate') || 'Choose end date'}
                    disabled={!!formData.serviceId && !allowManualEndTime}
                    isRTL={isRTL}
                  />
                </div>
              </div>
              {formData.serviceId && (
                <div className="mt-2 space-y-2">
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                    <Checkbox
                      id="allowManualEndTime"
                      checked={allowManualEndTime}
                      onCheckedChange={(checked) => {
                        setAllowManualEndTime(!!checked);
                        if (!checked) {
                          const service = services.find(s => s.id === formData.serviceId);
                          if (service && formData.start) {
                            const start = new Date(formData.start);
                            const end = new Date(start);
                            end.setMinutes(start.getMinutes() + service.duration);
                            setFormData({ ...formData, end: end.toISOString() });
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
                value={formData.status}
                onValueChange={(value: 'confirmed' | 'pending' | 'cancelled') => 
                  setFormData({ ...formData, status: value })
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

          <DialogFooter className="p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                {t('workers.cancel')}
              </Button>
            </DialogClose>
            <Button onClick={handleSubmit} className="flex-1 sm:flex-initial">
              {t('calendar.createBooking')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

