"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useIsMobile } from '@/components/ported/hooks/use-mobile';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, ChevronLeft, ChevronRight, Trash2, Bell, AlertCircle } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import type { Appointment, Worker, Service, Customer } from '@/components/ported/types/admin';
import { useAppointments } from '@/lib/calendar/use-appointments';
import { getCustomers, createCustomer, getCustomerByPhone } from '@/lib/api/services';
import { getSettings } from '@/lib/api/services';
import { CalendarProvider, useCalendar } from '@/calendar/contexts/calendar-context';
import { ClientContainer } from '@/calendar/components/client-container';
import { appointmentsToBigCalendarEvents, workersToBigCalendarUsers, getAppointmentIdFromEventId, clearEventIdMapping } from '@/lib/calendar/big-calendar-mapper';
import { CalendarContextAdapter } from '@/lib/calendar/calendar-context-adapter';
import { AppointmentProvider } from '@/lib/calendar/appointment-context';
import { Columns, List, Grid2x2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { he, ar, ru } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { rangeText, navigateDate as navigateCalendarDate } from '@/calendar/helpers';
import type { IEvent } from '@/calendar/interfaces';
import type { TCalendarView } from '@/calendar/types';
import type { ExtendedSchedulerEvent } from '@/lib/calendar/event-mapper';

type ViewMode = 'day' | 'week' | 'month';

// Inner component
function CalendarContent() {
  const { t, isRTL, locale } = useLocale();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [settings, setSettings] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isQuickCustomerDialogOpen, setIsQuickCustomerDialogOpen] = useState(false);
  const [quickCustomerData, setQuickCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<ExtendedSchedulerEvent | null>(null);
  const [formData, setFormData] = useState({
    serviceId: '',
    customerId: '',
    workerId: '',
    start: '',
    end: '',
    status: 'confirmed' as 'confirmed' | 'pending' | 'cancelled',
  });
  const [allowManualEndTime, setAllowManualEndTime] = useState(false);
  const [canCreateAppointments, setCanCreateAppointments] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [bigCalendarView, setBigCalendarView] = useState<TCalendarView>('week');

  // Calculate date range for fetching appointments - memoized to prevent infinite loops
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      const weekStartDay = settings?.calendar?.weekStartDay ?? 0;
      const day = start.getDay();
      let diff = day - weekStartDay;
      if (diff < 0) diff += 7;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
  }, [currentDate, viewMode, settings?.calendar?.weekStartDay]);

  const { start: startDate, end: endDate } = dateRange;

  const {
    events: appointmentEvents,
    appointments,
    workers,
    services,
    loading,
    refresh,
    create,
    update,
    remove,
  } = useAppointments({
    startDate,
    endDate,
    workerId: selectedWorker !== 'all' ? selectedWorker : undefined,
  });

  // Convert appointments to big-calendar format
  const bigCalendarEvents = useMemo(() => {
    clearEventIdMapping(); // Clear previous mappings
    return appointmentsToBigCalendarEvents(appointments, workers);
  }, [appointments, workers]);

  // Convert workers to big-calendar users
  const bigCalendarUsers = useMemo(() => {
    return workersToBigCalendarUsers(workers);
  }, [workers]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersData, settingsData] = await Promise.all([
          getCustomers(),
          getSettings(),
        ]);
        setCustomers(customersData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    // Check trial status
    fetch('/api/admin/trial-status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTrialExpired(data.trialExpired || false);
        }
      })
      .catch(error => {
        console.error('Error checking trial status:', error);
      });

    // Check feature access
    fetch('/api/admin/feature-check?feature=create_appointments')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCanCreateAppointments(data.canPerform);
        }
      })
      .catch(error => {
        console.error('Error checking feature:', error);
      });
  }, []);

  // Helper functions
  const isWorkingDay = (date: Date): boolean => {
    if (!settings) return true;
    const workingDays = settings.calendar?.workingDays || [0, 1, 2, 3, 4];
    const dayOfWeek = date.getDay();
    return workingDays.includes(dayOfWeek);
  };

  const isWithinWorkingHours = (date: Date): boolean => {
    if (!settings) return true;
    const workingHours = settings.calendar?.workingHours || { start: '09:00', end: '18:00' };
    const startTimeStr = typeof workingHours.start === 'string' ? workingHours.start : '09:00';
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const [startHour, startMin] = startTimeStr.split(':').map(Number);
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    
    const appointmentHour = date.getHours();
    const appointmentMin = date.getMinutes();
    const appointmentTime = appointmentHour * 60 + appointmentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return appointmentTime >= startTime && appointmentTime < endTime;
  };

  const isEndTimeWithinWorkingHours = (startDate: Date, endDate: Date): boolean => {
    if (!settings) return true;
    const workingHours = settings.calendar?.workingHours || { start: '09:00', end: '18:00' };
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    
    const appointmentEndHour = endDate.getHours();
    const appointmentEndMin = endDate.getMinutes();
    const appointmentEndTime = appointmentEndHour * 60 + appointmentEndMin;
    const workingEndTime = endHour * 60 + endMin;
    
    return appointmentEndTime <= workingEndTime;
  };

  const formatDate = (date: Date, currentLocale: string = locale) => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      he: 'he-IL',
      ar: 'ar-SA',
      ru: 'ru-RU'
    };
    const localeString = localeMap[currentLocale] || 'en-US';
    return date.toLocaleDateString(localeString, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleEventClick = (event: IEvent) => {
    const appointmentId = getAppointmentIdFromEventId(event.id);
    if (!appointmentId) {
      console.error('Could not find appointment ID for event:', event.id);
      return;
    }
    
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      // Create ExtendedSchedulerEvent for compatibility
      const extendedEvent: ExtendedSchedulerEvent = {
        id: appointment.id,
        title: event.title,
        description: event.description,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        appointmentId: appointment.id,
        serviceId: appointment.serviceId,
        customerId: appointment.customerId,
        workerId: appointment.workerId || appointment.staffId,
        service: appointment.service,
        customer: appointment.customer,
        worker: event.user.name,
        status: appointment.status,
        isGroupAppointment: appointment.isGroupAppointment,
        currentParticipants: appointment.currentParticipants,
        maxCapacity: appointment.maxCapacity,
        color: event.color === 'blue' ? '#3B82F6' : event.color === 'green' ? '#10B981' : event.color === 'red' ? '#EF4444' : event.color === 'yellow' ? '#F59E0B' : event.color === 'purple' ? '#8B5CF6' : event.color === 'orange' ? '#F97316' : '#9CA3AF',
      };
      
      setSelectedEvent(extendedEvent);
      setFormData({
        serviceId: appointment.serviceId || '',
        customerId: appointment.customerId || '',
        workerId: appointment.workerId || appointment.staffId || '',
        start: appointment.start,
        end: appointment.end,
        status: appointment.status,
      });
      setIsDialogOpen(true);
    }
  };

  const handleCreateClick = () => {
    if (!canCreateAppointments) {
      toast.error('Your plan doesn\'t allow creating appointments. Please upgrade to continue.');
      return;
    }

    const defaultDate = currentDate;
    
    if (!isWorkingDay(defaultDate)) {
      toast.error(t('calendar.notWorkingDay') || 'This day is not a working day');
      return;
    }
    
    const defaultHour = 9;
    const defaultStart = new Date(defaultDate);
    defaultStart.setHours(defaultHour, 0, 0, 0);
    
    if (!isWithinWorkingHours(defaultStart)) {
      toast.error(t('calendar.outsideWorkingHours') || 'This time is outside working hours');
      return;
    }
    
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(defaultHour + 1, 0, 0, 0);

    setFormData({
      serviceId: '',
      customerId: '',
      workerId: workers[0]?.id || '',
      start: defaultStart.toISOString(),
      end: defaultEnd.toISOString(),
      status: 'confirmed',
    });
    setAllowManualEndTime(false);
    setSelectedEvent(null);
    setIsCreateDialogOpen(true);
  };

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

  const handleQuickCustomerCreate = async () => {
    if (!quickCustomerData.name || !quickCustomerData.phone) {
      toast.error(t('calendar.required'));
      return;
    }

    try {
      const existingCustomer = await getCustomerByPhone(quickCustomerData.phone);
      if (existingCustomer) {
        toast.error(t('customers.phoneExists') || 'A customer with this phone number already exists');
        return;
      }

      const newCustomer = await createCustomer({
        name: quickCustomerData.name,
        phone: quickCustomerData.phone,
        email: quickCustomerData.email || '',
        lastVisit: new Date().toISOString(),
        tags: [],
        visitHistory: [],
        consentMarketing: false,
      });

      const updatedCustomers = await getCustomers();
      setCustomers(updatedCustomers);
      setFormData({ ...formData, customerId: newCustomer.id });
      setQuickCustomerData({ name: '', phone: '', email: '' });
      setIsQuickCustomerDialogOpen(false);
      toast.success(t('customers.customerCreated') || 'Customer created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create customer');
    }
  };

  const handleSave = async () => {
    if (!formData.serviceId || !formData.customerId || !formData.workerId) {
      toast.error(t('calendar.required'));
      return;
    }

    const service = services.find(s => s.id === formData.serviceId);
    const customer = customers.find(c => c.id === formData.customerId);
    const worker = workers.find(w => w.id === formData.workerId);

    if (!service || !customer || !worker) {
      toast.error('Invalid selection');
      return;
    }

    if (!formData.start) {
      toast.error(t('calendar.required'));
      return;
    }

    const startDate = new Date(formData.start);
    const endDate = new Date(formData.end);

    if (!isWorkingDay(startDate)) {
      toast.error(t('calendar.notWorkingDay') || 'Appointments cannot be scheduled on non-working days');
      return;
    }

    if (!isWithinWorkingHours(startDate)) {
      toast.error(t('calendar.outsideWorkingHours') || 'Start time is outside working hours');
      return;
    }

    if (!isEndTimeWithinWorkingHours(startDate, endDate)) {
      toast.error(t('calendar.endTimeOutsideWorkingHours') || 'End time is outside working hours');
      return;
    }

    if (!canCreateAppointments) {
      toast.error('Your plan doesn\'t allow managing appointments. Please upgrade to continue.');
      return;
    }

    try {
      const featureCheck = await fetch('/api/admin/feature-check?feature=create_appointments');
      const featureData = await featureCheck.json();

      if (!featureData.canPerform) {
        toast.error('Your plan doesn\'t allow managing appointments. Please upgrade to continue.');
        return;
      }
    } catch (error) {
      console.error('Error checking feature:', error);
    }

    const appointmentData: Omit<Appointment, 'id'> = {
      service: service.name,
      serviceId: formData.serviceId,
      customer: customer.name,
      customerId: formData.customerId,
      workerId: formData.workerId,
      staffId: formData.workerId,
      start: formData.start,
      end: formData.end,
      status: formData.status,
    };

    if (selectedEvent) {
      const updated = await update(selectedEvent.appointmentId || selectedEvent.id, appointmentData);
      if (updated) {
        toast.success(t('calendar.appointmentUpdated'));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('appointmentUpdated'));
        }
      }
    } else {
      const created = await create(appointmentData);
      if (created) {
        toast.success('Appointment created successfully');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('appointmentUpdated'));
        }
      }
    }

    setIsDialogOpen(false);
    setIsCreateDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleDelete = async () => {
    if (!canCreateAppointments) {
      toast.error('Your plan doesn\'t allow deleting appointments. Please upgrade to continue.');
      return;
    }

    if (selectedEvent) {
      const success = await remove(selectedEvent.appointmentId || selectedEvent.id);
      if (success) {
        toast.success(t('calendar.appointmentDeleted'));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('appointmentDeleted'));
        }
        setIsDialogOpen(false);
        setSelectedEvent(null);
      }
    }
  };

  const handleChangeWorker = async (newWorkerId: string) => {
    if (!canCreateAppointments) {
      toast.error('Your plan doesn\'t allow managing appointments. Please upgrade to continue.');
      return;
    }

    if (selectedEvent) {
      const updated = await update(selectedEvent.appointmentId || selectedEvent.id, {
        workerId: newWorkerId,
        staffId: newWorkerId,
      });
      if (updated) {
        toast.success(t('calendar.appointmentUpdated'));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('appointmentUpdated'));
        }
        setIsDialogOpen(false);
        setSelectedEvent(null);
      }
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Block calendar if trial expired
  if (trialExpired) {
    return (
      <div className="w-full bg-white">
        <div className="mb-6 flex items-center justify-between pb-4 border-b">
          <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
        </div>
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('trial.trialExpired')}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('trial.calendarBlockedMessage') || 'Your trial or subscription has ended. Please renew your plan to continue using the calendar.'}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-sm font-medium text-blue-900 mb-4">
                {t('trial.contactUs') || 'Contact Us:'}
              </p>
              <div className="space-y-3 text-sm text-blue-800">
                <p>
                  <strong>{t('trial.phone') || 'Phone'}:</strong>{' '}
                  <a href="tel:0542636737" className="underline hover:text-blue-900 font-medium">
                    054-263-6737
                  </a>
                </p>
                <p>
                  <strong>{t('trial.email') || 'Email'}:</strong>{' '}
                  <a href="mailto:plans@kalbook.io" className="underline hover:text-blue-900 font-medium">
                    plans@kalbook.io
                  </a>
                </p>
              </div>
            </div>
            <Button
              onClick={() => window.location.href = 'mailto:plans@kalbook.io?subject=Upgrade Request'}
              size="lg"
            >
              {t('trial.contactToUpgrade') || 'Contact to Upgrade'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Sync viewMode with big-calendar view
  useEffect(() => {
    if (viewMode === 'day') setBigCalendarView('day');
    else if (viewMode === 'week') setBigCalendarView('week');
    else setBigCalendarView('month');
  }, [viewMode]);

  return (
    <div className="w-full bg-white">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-700" />
              </Button>
            </div>
          </div>

          {/* Calendar Controls - Worker filter, create button, and calendar navigation */}
          <Card className="p-4 mb-4 shadow-card">
            <div className={`flex flex-col gap-3 sm:gap-4 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'} items-start sm:items-center ${isRTL ? 'sm:justify-between' : 'sm:justify-between'}`}>
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t('calendar.staffFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('calendar.allStaff')}</SelectItem>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleCreateClick} 
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={!canCreateAppointments}
                >
                  <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('calendar.createBooking')}
                </Button>
              </div>
              
              {/* Calendar navigation controls */}
              <div className={`flex items-center gap-2 flex-wrap w-full sm:w-auto ${isRTL ? 'sm:justify-start' : 'sm:justify-end'}`}>
                {/* Today button */}
                {(() => {
                  const today = new Date();
                  const localeMap: Record<string, Locale> = { he: he, ar: ar, ru: ru };
                  const dateFnsLocale = localeMap[locale || 'en'];
                  return (
                    <button
                      key="today-button"
                      className="flex size-14 flex-col items-start overflow-hidden rounded-lg border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      <p className="flex h-6 w-full items-center justify-center bg-primary text-center text-xs font-semibold text-primary-foreground">
                        {format(today, "MMM", { locale: dateFnsLocale }).toUpperCase()}
                      </p>
                      <p className="flex w-full items-center justify-center text-lg font-bold">{today.getDate()}</p>
                    </button>
                  );
                })()}
                
                {/* Date Navigator */}
                {(() => {
                  const localeMap: Record<string, Locale> = { he: he, ar: ar, ru: ru };
                  const dateFnsLocale = localeMap[locale || 'en'];
                  const month = format(currentDate, "MMMM", { locale: dateFnsLocale });
                  const year = currentDate.getFullYear();
                  
                  // For RTL, swap the navigation logic: left arrow goes forward, right arrow goes backward
                  const handlePrevious = () => {
                    const newDate = (isRTL 
                      ? navigateCalendarDate(currentDate, bigCalendarView as TCalendarView, "next")
                      : navigateCalendarDate(currentDate, bigCalendarView as TCalendarView, "previous")) as Date;
                    setCurrentDate(newDate);
                  };
                  
                  const handleNext = () => {
                    const newDate = (isRTL 
                      ? navigateCalendarDate(currentDate, bigCalendarView as TCalendarView, "previous")
                      : navigateCalendarDate(currentDate, bigCalendarView as TCalendarView, "next")) as Date;
                    setCurrentDate(newDate);
                  };

                  return (
                    <div key="date-navigator" className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">
                          {month} {year}
                        </span>
                        <Badge variant="outline" className="px-1.5 text-xs">
                          {bigCalendarEvents.length} {t('calendar.events')}
                        </Badge>
                      </div>

                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button 
                          variant="outline" 
                          className="size-6.5 px-0 [&_svg]:size-4.5" 
                          onClick={handlePrevious}
                        >
                          {isRTL ? <ChevronRight /> : <ChevronLeft />}
                        </Button>

                        <p className="text-xs text-muted-foreground">{rangeText(bigCalendarView, currentDate, locale)}</p>

                        <Button 
                          variant="outline" 
                          className="size-6.5 px-0 [&_svg]:size-4.5" 
                          onClick={handleNext}
                        >
                          {isRTL ? <ChevronLeft /> : <ChevronRight />}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                
                {/* View buttons */}
                <div className="inline-flex first:rounded-r-none last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none">
                  <Button 
                    aria-label={t('calendar.viewByDay')} 
                    size="icon" 
                    variant={bigCalendarView === "day" ? "default" : "outline"} 
                    className="rounded-r-none [&_svg]:size-4" 
                    onClick={() => {
                      setBigCalendarView("day");
                      setViewMode('day');
                    }}
                  >
                    <List strokeWidth={1.8} />
                  </Button>

                  <Button
                    aria-label={t('calendar.viewByWeek')}
                    size="icon"
                    variant={bigCalendarView === "week" ? "default" : "outline"}
                    className="-ml-px rounded-none [&_svg]:size-4"
                    onClick={() => {
                      setBigCalendarView("week");
                      setViewMode('week');
                    }}
                  >
                    <Columns strokeWidth={1.8} />
                  </Button>

                  <Button
                    aria-label={t('calendar.viewByMonth')}
                    size="icon"
                    variant={bigCalendarView === "month" ? "default" : "outline"}
                    className="-ml-px rounded-l-none [&_svg]:size-4"
                    onClick={() => {
                      setBigCalendarView("month");
                      setViewMode('month');
                    }}
                  >
                    <Grid2x2 strokeWidth={1.8} />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

      {/* Big Calendar */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading calendar...</p>
        </Card>
      ) : (
        <AppointmentProvider
          services={services}
          workers={workers}
          customers={customers}
          appointments={appointments}
          onCreateAppointment={async (appointmentData) => {
            const service = services.find(s => s.id === appointmentData.serviceId);
            const customer = customers.find(c => c.id === appointmentData.customerId);
            const worker = workers.find(w => w.id === appointmentData.workerId);

            if (!service || !customer || !worker) {
              throw new Error('Invalid selection');
            }

            const appointment: Omit<Appointment, 'id'> = {
              service: service.name,
              serviceId: appointmentData.serviceId,
              customer: customer.name,
              customerId: appointmentData.customerId,
              workerId: appointmentData.workerId,
              staffId: appointmentData.workerId,
              start: appointmentData.start,
              end: appointmentData.end,
              status: appointmentData.status,
            };

            const created = await create(appointment);
            if (created) {
              toast.success('Appointment created successfully');
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('appointmentUpdated'));
              }
            }
          }}
          onUpdateAppointment={async (appointmentId, appointmentData) => {
            const updated = await update(appointmentId, appointmentData);
            if (updated) {
              toast.success(t('calendar.appointmentUpdated'));
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('appointmentUpdated'));
              }
            }
          }}
          onDeleteAppointment={async (appointmentId) => {
            const success = await remove(appointmentId);
            if (success) {
              toast.success(t('calendar.appointmentDeleted'));
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('appointmentDeleted'));
              }
            }
          }}
          onQuickCreateCustomer={() => setIsQuickCustomerDialogOpen(true)}
        >
          <CalendarProvider users={bigCalendarUsers} events={bigCalendarEvents}>
            <CalendarContextAdapter
              selectedDate={currentDate}
              onDateChange={setCurrentDate}
              selectedWorkerId={selectedWorker}
              onWorkerChange={setSelectedWorker}
              events={bigCalendarEvents}
              onEventClick={handleEventClick}
            />
            <div className="w-full bg-white">
              <ClientContainer 
                view={bigCalendarView} 
                onViewChange={(newView) => {
                  setBigCalendarView(newView);
                  if (newView === 'day') setViewMode('day');
                  else if (newView === 'week') setViewMode('week');
                  else if (newView === 'month') setViewMode('month');
                }}
              />
            </div>
          </CalendarProvider>
        </AppointmentProvider>
      )}

      {/* Edit Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                onValueChange={(value) => {
                  const service = services.find(s => s.id === value);
                  if (service && formData.start) {
                    const start = new Date(formData.start);
                    const end = new Date(start);
                    end.setMinutes(start.getMinutes() + service.duration);
                    setFormData({
                      ...formData,
                      serviceId: value,
                      end: end.toISOString(),
                    });
                  } else {
                    setFormData({ ...formData, serviceId: value });
                  }
                }}
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
              <p className="text-sm font-medium">{selectedEvent?.customer || appointments.find(a => a.id === selectedEvent?.appointmentId)?.customer}</p>
            </div>
            <div>
              <Label>{t('calendar.worker')}</Label>
              <Select
                value={formData.workerId}
                onValueChange={handleChangeWorker}
              >
                <SelectTrigger>
                  <SelectValue />
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
                value={formData.start ? (() => {
                  const d = new Date(formData.start);
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                })() : ''}
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
                value={formData.end ? (() => {
                  const d = new Date(formData.end);
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                })() : ''}
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
              disabled={!canCreateAppointments}
            >
              <Trash2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
              {t('calendar.deleteAppointment')}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-initial">
                {t('workers.cancel')}
              </Button>
              <Button 
                onClick={handleSave} 
                className="flex-1 sm:flex-initial"
                disabled={!canCreateAppointments}
              >
                {t('calendar.saveChanges')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Appointment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                {isRTL && (
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
                      <SelectValue placeholder={t('calendar.selectCustomer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isRTL && (
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 sm:flex-initial order-2 sm:order-1">
              {t('workers.cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 sm:flex-initial order-1 sm:order-2"
              disabled={!canCreateAppointments}
            >
              {t('calendar.createBooking')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Customer Creation Dialog */}
      <Dialog open={isQuickCustomerDialogOpen} onOpenChange={setIsQuickCustomerDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-lg sm:text-xl break-words">{t('calendar.addNewCustomer')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{t('calendar.quickCustomerDescription')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              <Label>{t('customers.name')} *</Label>
              <Input
                value={quickCustomerData.name}
                onChange={(e) => setQuickCustomerData({ ...quickCustomerData, name: e.target.value })}
                placeholder={t('customers.name')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <Label>{t('customers.phone')} *</Label>
              <Input
                type="tel"
                value={quickCustomerData.phone}
                onChange={(e) => setQuickCustomerData({ ...quickCustomerData, phone: e.target.value })}
                placeholder={t('customers.phone')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <Label>{t('customers.email')}</Label>
              <Input
                type="email"
                value={quickCustomerData.email}
                onChange={(e) => setQuickCustomerData({ ...quickCustomerData, email: e.target.value })}
                placeholder={t('customers.email')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => {
              setIsQuickCustomerDialogOpen(false);
              setQuickCustomerData({ name: '', phone: '', email: '' });
            }} className="flex-1 sm:flex-initial order-2 sm:order-1">
              {t('workers.cancel')}
            </Button>
            <Button onClick={handleQuickCustomerCreate} className="flex-1 sm:flex-initial order-1 sm:order-2">
              {t('calendar.createCustomer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main Calendar component
const Calendar = () => {
  return (
    <div className="w-full h-full">
      <CalendarContent />
    </div>
  );
};

export default Calendar;
