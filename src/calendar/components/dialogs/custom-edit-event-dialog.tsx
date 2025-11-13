/**
 * Custom EditEventDialog that integrates with our appointment system
 * Replaces the demo EditEventDialog from big-calendar
 */

"use client";

import { useEffect, useState } from "react";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useLocale } from "@/components/ported/hooks/useLocale";
import { getAppointmentIdFromEventId } from "@/lib/calendar/big-calendar-mapper";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { toLocalDateTimeString } from "@/lib/calendar/date-utils";

import type { Service, Worker, Customer, Appointment } from "@/components/ported/types/admin";
import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  children: React.ReactNode;
  event: IEvent;
  appointments: Appointment[];
  services: Service[];
  workers: Worker[];
  customers: Customer[];
  onUpdateAppointment: (appointmentId: string, appointment: Partial<Appointment>) => Promise<void>;
  onDeleteAppointment: (appointmentId: string) => Promise<void>;
  onEventClick?: (event: IEvent) => void;
}

export function CustomEditEventDialog({ 
  children, 
  event,
  appointments,
  services,
  workers,
  customers,
  onUpdateAppointment,
  onDeleteAppointment,
  onEventClick,
}: IProps) {
  const { t, isRTL } = useLocale();
  const { isOpen, onClose, onToggle } = useDisclosure();
  
  const appointmentId = getAppointmentIdFromEventId(event.id);
  const appointment = appointments.find(a => a.id === appointmentId);
  
  const [formData, setFormData] = useState({
    serviceId: appointment?.serviceId || '',
    customerId: appointment?.customerId || '',
    workerId: appointment?.workerId || appointment?.staffId || '',
    start: appointment?.start || event.startDate,
    end: appointment?.end || event.endDate,
    status: (appointment?.status || 'confirmed') as 'confirmed' | 'pending' | 'cancelled',
  });
  const [allowManualEndTime, setAllowManualEndTime] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (isOpen && appointment) {
      setFormData({
        serviceId: appointment.serviceId || '',
        customerId: appointment.customerId || '',
        workerId: appointment.workerId || appointment.staffId || '',
        start: appointment.start,
        end: appointment.end,
        status: appointment.status || 'confirmed',
      });
    }
  }, [isOpen, appointment]);

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

  const handleSave = async () => {
    if (!formData.serviceId || !formData.customerId || !formData.workerId) {
      toast.error(t('calendar.required'));
      return;
    }

    if (!appointmentId) {
      toast.error('Appointment not found');
      return;
    }

    try {
      const service = services.find(s => s.id === formData.serviceId);
      const customer = customers.find(c => c.id === formData.customerId);
      const worker = workers.find(w => w.id === formData.workerId);

      if (!service || !customer || !worker) {
        toast.error('Invalid selection');
        return;
      }

      await onUpdateAppointment(appointmentId, {
        service: service.name,
        serviceId: formData.serviceId,
        customer: customer.name,
        customerId: formData.customerId,
        workerId: formData.workerId,
        staffId: formData.workerId,
        start: formData.start,
        end: formData.end,
        status: formData.status,
      });
      
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update appointment');
    }
  };

  const handleDelete = async () => {
    if (!appointmentId) {
      toast.error('Appointment not found');
      return;
    }

    try {
      await onDeleteAppointment(appointmentId);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete appointment');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && onEventClick) {
      onEventClick(event);
    }
    onToggle();
  };

  if (!appointment) {
    return <>{children}</>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="text-lg sm:text-xl break-words">{t('calendar.editAppointment')}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{t('calendar.appointmentDetails')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div>
            <Label>{t('calendar.service')}</Label>
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
            <Label>{t('calendar.customer')}</Label>
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

          <div>
            <Label>{t('calendar.worker')}</Label>
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
            <Label>{t('calendar.startTime')}</Label>
            <Input
              type="datetime-local"
              value={formData.start ? toLocalDateTimeString(formData.start) : ''}
              onChange={(e) => {
                const newStart = new Date(e.target.value);
                const duration = new Date(formData.end).getTime() - new Date(formData.start).getTime();
                const newEnd = new Date(newStart.getTime() + duration);
                setFormData({
                  ...formData,
                  start: newStart.toISOString(),
                  end: newEnd.toISOString(),
                });
              }}
            />
          </div>

          <div>
            <Label>{t('calendar.endTime')}</Label>
            <Input
              type="datetime-local"
              value={formData.end ? toLocalDateTimeString(formData.end) : ''}
              onChange={(e) => setFormData({ ...formData, end: new Date(e.target.value).toISOString() })}
            />
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

        <DialogFooter className="p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <Trash2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
            {t('calendar.deleteAppointment')}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                {t('workers.cancel')}
              </Button>
            </DialogClose>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial">
              {t('calendar.saveChanges')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

