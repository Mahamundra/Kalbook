import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useIsMobile } from '@/components/ported/hooks/use-mobile';
import { 
  getAppointments, 
  updateAppointment, 
  deleteAppointment, 
  createAppointment,
  getWorkers,
  getServices,
  getCustomers,
  getSettings
} from '@/components/ported/lib/mockData';
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
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock } from 'lucide-react';
import type { Appointment, Worker, Service, Customer } from '@/types/admin';

type ViewMode = 'day' | 'week' | 'year';

const ViewModeButtons = ({ currentMode, onModeChange, t }: { 
  currentMode: ViewMode; 
  onModeChange: (mode: ViewMode) => void; 
  t: (key: string) => string;
}) => (
  <div className="flex gap-2">
    <Button
      variant={currentMode === 'day' ? 'default' : 'outline'}
      onClick={() => onModeChange('day')}
      size="sm"
    >
      {t('calendar.day')}
    </Button>
    <Button
      variant={currentMode === 'week' ? 'default' : 'outline'}
      onClick={() => onModeChange('week')}
      size="sm"
    >
      {t('calendar.week')}
    </Button>
    <Button
      variant={currentMode === 'year' ? 'default' : 'outline'}
      onClick={() => onModeChange('year')}
      size="sm"
    >
      {t('calendar.year')}
    </Button>
  </div>
);

const Calendar = () => {
  const { t, isRTL, locale } = useLocale();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    serviceId: '',
    customerId: '',
    workerId: '',
    start: '',
    end: '',
    status: 'confirmed' as 'confirmed' | 'pending' | 'cancelled',
  });
  const [allowManualEndTime, setAllowManualEndTime] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0); // Force re-render when settings change


  useEffect(() => {
    setAppointments(getAppointments());
    setWorkers(getWorkers().filter(w => w.active));
    setServices(getServices());
    setCustomers(getCustomers());
    
    // Listen for settings updates
    const handleSettingsUpdate = () => {
      // Trigger re-render to update calendar based on new settings
      setSettingsVersion(prev => prev + 1);
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  // Helper function to check if a date is a working day
  const isWorkingDay = (date: Date): boolean => {
    const settings = getSettings();
    const workingDays = settings.calendar?.workingDays || [0, 1, 2, 3, 4]; // Default Sunday-Thursday
    const dayOfWeek = date.getDay();
    return workingDays.includes(dayOfWeek);
  };

  // Helper function to check if a time is within working hours
  const isWithinWorkingHours = (date: Date): boolean => {
    const settings = getSettings();
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

  // Helper function to check if appointment end time is within working hours
  const isEndTimeWithinWorkingHours = (startDate: Date, endDate: Date): boolean => {
    const settings = getSettings();
    const workingHours = settings.calendar?.workingHours || { start: '09:00', end: '18:00' };
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    
    const appointmentEndHour = endDate.getHours();
    const appointmentEndMin = endDate.getMinutes();
    const appointmentEndTime = appointmentEndHour * 60 + appointmentEndMin;
    const workingEndTime = endHour * 60 + endMin;
    
    return appointmentEndTime <= workingEndTime;
  };

  const getTimeSlots = () => {
    const settings = getSettings();
    const workingHours = settings.calendar?.workingHours || { start: '09:00', end: '18:00' };
    const startTimeStr = typeof workingHours.start === 'string' ? workingHours.start : '09:00';
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const [startHour] = startTimeStr.split(':').map(Number);
    const [endHour] = endTimeStr.split(':').map(Number);
    const slots: string[] = [];
    
    // Validate that we got valid numbers
    if (isNaN(startHour) || isNaN(endHour)) {
      // Fallback to default hours if parsing failed
      const defaultStart = 9;
      const defaultEnd = 18;
      for (let hour = defaultStart; hour < defaultEnd; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      return slots;
    }
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    return slots;
  };

  const timeSlots = getTimeSlots();

  const getWeekDates = () => {
    const settings = getSettings();
    const weekStartDay = settings.calendar?.weekStartDay ?? 0; // Default to Sunday
    
    const start = new Date(currentDate);
    const day = start.getDay();
    // Calculate difference to the week start day
    let diff = day - weekStartDay;
    if (diff < 0) diff += 7; // If we're before the week start day, go back a week
    
    start.setDate(start.getDate() - diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedWorker !== 'all') {
      const aptWorkerId = apt.workerId || apt.staffId;
      if (aptWorkerId !== selectedWorker) return false;
    }
    return true;
  });

  const getAppointmentsForDayAndSlot = (date: Date, hour: number) => {
    return filteredAppointments.filter((apt) => {
      const aptDate = new Date(apt.start);
      const aptHour = aptDate.getHours();
      const aptDateStr = aptDate.toDateString();
      const slotDateStr = date.toDateString();
      
      return aptDateStr === slotDateStr && aptHour === hour;
    });
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

  const formatDateHeader = (date: Date, currentLocale: string = locale) => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      he: 'he-IL',
      ar: 'ar-SA',
      ru: 'ru-RU'
    };
    const localeString = localeMap[currentLocale] || 'en-US';
    const dayName = date.toLocaleDateString(localeString, { weekday: 'short' });
    const dayNum = date.getDate();
    return { dayName, dayNum };
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    const service = services.find(s => s.name === appointment.service || s.id === appointment.serviceId);
    const customer = customers.find(c => c.name === appointment.customer || c.id === appointment.customerId);
    
    setFormData({
      serviceId: appointment.serviceId || service?.id || '',
      customerId: appointment.customerId || customer?.id || '',
      workerId: appointment.workerId || appointment.staffId || '',
      start: appointment.start,
      end: appointment.end,
      status: appointment.status,
    });
    setIsDialogOpen(true);
  };

  const handleCreateClick = (date?: Date, hour?: number, workerId?: string) => {
    const defaultDate = date || currentDate;
    
    // Check if the date is a working day
    if (!isWorkingDay(defaultDate)) {
      toast.error(t('calendar.notWorkingDay') || 'This day is not a working day');
      return;
    }
    
    const defaultHour = hour !== undefined ? hour : 9;
    const defaultStart = new Date(defaultDate);
    defaultStart.setHours(defaultHour, 0, 0, 0);
    
    // Check if the hour is within working hours
    if (!isWithinWorkingHours(defaultStart)) {
      toast.error(t('calendar.outsideWorkingHours') || 'This time is outside working hours');
      return;
    }
    
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(defaultHour + 1, 0, 0, 0);

    setFormData({
      serviceId: '',
      customerId: '',
      workerId: workerId || workers[0]?.id || '',
      start: defaultStart.toISOString(),
      end: defaultEnd.toISOString(),
      status: 'confirmed',
    });
    setAllowManualEndTime(false);
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

  const handleSave = () => {
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

    // Validate appointment time
    if (!formData.start) {
      toast.error(t('calendar.required'));
      return;
    }

    const startDate = new Date(formData.start);
    const endDate = new Date(formData.end);

    // Check if the date is a working day
    if (!isWorkingDay(startDate)) {
      toast.error(t('calendar.notWorkingDay') || 'Appointments cannot be scheduled on non-working days');
      return;
    }

    // Check if start time is within working hours
    if (!isWithinWorkingHours(startDate)) {
      toast.error(t('calendar.outsideWorkingHours') || 'Start time is outside working hours');
      return;
    }

    // Check if end time is within working hours
    if (!isEndTimeWithinWorkingHours(startDate, endDate)) {
      toast.error(t('calendar.endTimeOutsideWorkingHours') || 'End time is outside working hours');
      return;
    }

    if (selectedAppointment) {
      updateAppointment(selectedAppointment.id, {
        ...formData,
        service: service.name,
        customer: customer.name,
        workerId: formData.workerId,
        staffId: formData.workerId,
        serviceId: formData.serviceId,
      });
      toast.success(t('calendar.appointmentUpdated'));
      // Dispatch event to notify dashboard
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointmentUpdated'));
      }
    } else {
      createAppointment({
        ...formData,
        service: service.name,
        customer: customer.name,
        workerId: formData.workerId,
        staffId: formData.workerId,
        serviceId: formData.serviceId,
        customerId: formData.customerId,
      });
      toast.success('Appointment created successfully');
      // Dispatch event to notify dashboard
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointmentUpdated'));
      }
    }

    setAppointments(getAppointments());
    setIsDialogOpen(false);
    setIsCreateDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleDelete = () => {
    if (selectedAppointment) {
      deleteAppointment(selectedAppointment.id);
      toast.success(t('calendar.appointmentDeleted'));
      // Dispatch event to notify dashboard
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointmentDeleted'));
      }
      setAppointments(getAppointments());
      setIsDialogOpen(false);
      setSelectedAppointment(null);
    }
  };

  const handleChangeWorker = (newWorkerId: string) => {
    if (selectedAppointment) {
      const worker = workers.find(w => w.id === newWorkerId);
      updateAppointment(selectedAppointment.id, {
        workerId: newWorkerId,
        staffId: newWorkerId,
      });
      if (worker) {
        toast.success(t('calendar.appointmentUpdated'));
        // Dispatch event to notify dashboard
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('appointmentUpdated'));
        }
        setAppointments(getAppointments());
        setIsDialogOpen(false);
        setSelectedAppointment(null);
      }
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Store viewMode in a variable that won't be narrowed
  const currentViewMode: ViewMode = viewMode;

      // Daily List View
      if (currentViewMode === 'day') {
        const dayDate = currentDate;
        const isWorking = isWorkingDay(dayDate);
        const dayAppointments = filteredAppointments
          .filter((apt) => {
            const aptDate = new Date(apt.start);
            return aptDate.toDateString() === dayDate.toDateString();
          })
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div>
      <PageHeader
        title={t('calendar.title')}
          action={<ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} />}
        />

        <Card className="p-6 shadow-card">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t('calendar.today')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
              <span className="font-medium px-2">{formatDate(dayDate)}</span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger className="w-full md:w-[200px]">
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
                onClick={() => handleCreateClick(dayDate)} 
                disabled={!isWorking}
                title={!isWorking ? t('calendar.notWorkingDay') : undefined}
              >
                <Plus className="w-4 h-4 me-2" />
                {t('calendar.createBooking')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {dayAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No appointments for this day</p>
              </div>
            ) : (
              dayAppointments.map((apt) => {
                const start = new Date(apt.start);
                const end = new Date(apt.end);
                const worker = workers.find(w => w.id === (apt.workerId || apt.staffId));
                
                return (
                  <div
                    key={apt.id}
                    onClick={() => handleAppointmentClick(apt)}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                          {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{apt.service}</div>
                      <div className="text-sm text-muted-foreground">
                        {apt.customer} • {worker?.name || 'Unknown'}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        apt.status === 'confirmed' ? 'default' :
                        apt.status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {t(`calendar.${apt.status}`)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Year View
  if (currentViewMode === 'year') {
    return (
      <div>
        <PageHeader
          title={t('calendar.title')}
          action={<ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} />}
        />
        <Card className="p-6 shadow-card">
          <p className="text-center text-muted-foreground py-12">Year view coming soon...</p>
        </Card>
      </div>
    );
  }

  // Weekly Grid View (default) - but on mobile, force day view
  const weekDates = getWeekDates();
  const effectiveViewMode = isMobile ? 'day' : currentViewMode;

  // On mobile, show day view instead of week view
  if (isMobile && effectiveViewMode === 'week') {
    const dayDate = currentDate;
    const isWorking = isWorkingDay(dayDate);
    const dayAppointments = filteredAppointments
      .filter((apt) => {
        const aptDate = new Date(apt.start);
        return aptDate.toDateString() === dayDate.toDateString();
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return (
      <div className="w-full">
        <PageHeader
          title={t('calendar.title')}
          action={<ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} />}
        />

        <Card className="p-3 md:p-6 shadow-card w-full">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t('calendar.today')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
              <span className="font-medium px-2 whitespace-nowrap">{formatDate(dayDate)}</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full">
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
                onClick={() => handleCreateClick(dayDate)} 
                disabled={!isWorking}
                title={!isWorking ? t('calendar.notWorkingDay') : undefined}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 me-2" />
                {t('calendar.createBooking')}
            </Button>
            </div>
          </div>

          <div className="space-y-2">
            {dayAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t('calendar.noAppointmentsToday') || 'No appointments for this day'}</p>
              </div>
            ) : (
              dayAppointments.map((apt) => {
                const start = new Date(apt.start);
                const end = new Date(apt.end);
                const worker = workers.find(w => w.id === (apt.workerId || apt.staffId));
                
                return (
                  <div
                    key={apt.id}
                    onClick={() => handleAppointmentClick(apt)}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm whitespace-nowrap">
                        {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                        {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="font-medium truncate">{apt.service}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {apt.customer} • {worker?.name || 'Unknown'}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        apt.status === 'confirmed' ? 'default' :
                        apt.status === 'pending' ? 'secondary' : 'destructive'
                      }
                      className="shrink-0"
                    >
                      {t(`calendar.${apt.status}`)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title={t('calendar.title')}
        action={<ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} />}
      />

      <Card className="p-3 md:p-6 shadow-card overflow-visible w-full">
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              {t('calendar.today')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            <span className="font-medium px-2 whitespace-nowrap">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </span>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger className="w-full md:w-[200px]">
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
            <Button onClick={() => handleCreateClick()}>
              <Plus className="w-4 h-4 me-2" />
              {t('calendar.createBooking')}
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto w-full -mx-3 md:-mx-6" style={{ maxWidth: 'calc(100% + 1.5rem)' }}>
          <div className="grid" style={{ 
            minWidth: isMobile ? '100%' : '1200px', 
            width: isMobile ? '100%' : 'max-content',
            gridTemplateColumns: `80px repeat(${weekDates.length}, minmax(100px, 1fr))` 
          }}>
            {/* Time column header */}
            <div className="bg-muted/30 p-2 border-b border-e font-medium text-sm text-center sticky left-0 z-10">
              {t('calendar.time')}
            </div>
            
            {/* Day headers */}
            {weekDates.map((date) => {
              const { dayName, dayNum } = formatDateHeader(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isWorking = isWorkingDay(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`bg-muted/30 p-2 border-b text-center font-medium text-sm ${
                    isToday ? 'bg-primary/10 border-primary' : ''
                  } ${!isWorking ? 'opacity-50' : ''}`}
                >
                  <div className="text-xs text-muted-foreground">{dayName}</div>
                  <div className={isToday ? 'text-primary font-bold' : ''}>{dayNum}</div>
                </div>
              );
            })}

            {/* Time slots */}
            {timeSlots.map((time) => {
              const hour = parseInt(time.split(':')[0]);
              return (
                <>
                  <div
                    key={`time-${time}`}
                    className="p-2 border-b border-e text-sm text-muted-foreground text-center sticky left-0 z-10 bg-background"
                  >
                    {time}
                  </div>
                  {weekDates.map((date) => {
                    const slotAppointments = getAppointmentsForDayAndSlot(date, hour);
                    const isWorking = isWorkingDay(date);
                    const testDate = new Date(date);
                    testDate.setHours(hour, 0, 0, 0);
                    const isWithinHours = isWithinWorkingHours(testDate);
                    const isClickable = isWorking && isWithinHours;
                    
                    return (
                      <div
                        key={`${date.toISOString()}-${time}`}
                        className={`min-h-[60px] border-b relative p-1 group ${
                          isClickable 
                            ? 'hover:bg-muted/10 transition-colors cursor-pointer' 
                            : 'opacity-40 cursor-not-allowed bg-muted/5'
                        }`}
                        onClick={() => {
                          if (isClickable) {
                            handleCreateClick(date, hour);
                          }
                        }}
                      >
                        {slotAppointments.map((apt) => {
                          const start = new Date(apt.start);
                          const end = new Date(apt.end);
                          const startMinutes = start.getMinutes();
                          const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                          const topOffset = (startMinutes / 60) * 60;
                          const worker = workers.find(w => w.id === (apt.workerId || apt.staffId));
                          
                          return (
                            <div
                              key={apt.id}
                              className={`absolute inset-x-1 border-l-4 rounded p-1.5 text-xs cursor-pointer hover:shadow-md transition-all ${
                                apt.status === 'confirmed' ? 'bg-primary/20 border-primary' :
                                apt.status === 'pending' ? 'bg-yellow-500/20 border-yellow-500' :
                                'bg-destructive/20 border-destructive'
                              }`}
                              style={{
                                top: `${topOffset}px`,
                                height: `${Math.max(duration, 20)}px`,
                                minHeight: '20px',
                                zIndex: 10,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAppointmentClick(apt);
                              }}
                            >
                              <div className="font-medium truncate">{apt.service}</div>
                              <div className="text-muted-foreground truncate text-[10px]">
                                {apt.customer}
                              </div>
                              {selectedWorker === 'all' && worker && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {worker.name}
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })}
                        {slotAppointments.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Edit Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('calendar.editAppointment')}</DialogTitle>
            <DialogDescription>{t('calendar.appointmentDetails')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{t('calendar.service')}</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => {
                  const service = services.find(s => s.id === value);
                  if (service) {
                    // Auto-update service name and optionally recalculate end time
                    const newFormData = {
                      ...formData,
                      serviceId: value,
                    };
                    // Only auto-calculate if we have a start time and the service changed
                    if (formData.start) {
                      const start = new Date(formData.start);
                      const end = new Date(start);
                      end.setMinutes(start.getMinutes() + service.duration);
                      newFormData.end = end.toISOString();
                    }
                    setFormData(newFormData);
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
              <p className="text-sm font-medium">{selectedAppointment?.customer}</p>
            </div>
            <div>
              <Label>{t('calendar.worker')}</Label>
              <Select
                value={formData.workerId}
                onValueChange={(value) => {
                  handleChangeWorker(value);
                }}
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
                value={formData.start ? new Date(formData.start).toISOString().slice(0, 16) : ''}
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
                value={formData.end ? new Date(formData.end).toISOString().slice(0, 16) : ''}
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

          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 me-2" />
              {t('calendar.deleteAppointment')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('workers.cancel')}
              </Button>
              <Button onClick={handleSave}>
                {t('calendar.saveChanges')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Appointment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('calendar.createAppointment')}</DialogTitle>
            <DialogDescription>{t('calendar.appointmentDetails')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
              <Label>{t('calendar.startTime')} *</Label>
              <Input
                type="datetime-local"
                value={formData.start ? new Date(formData.start).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const newStart = new Date(e.target.value);
                  const service = services.find(s => s.id === formData.serviceId);
                  if (service && !allowManualEndTime) {
                    // Auto-calculate end time based on service duration
                    const newEnd = new Date(newStart);
                    newEnd.setMinutes(newStart.getMinutes() + service.duration);
                    setFormData({
                      ...formData,
                      start: newStart.toISOString(),
                      end: newEnd.toISOString(),
                    });
                  } else {
                    setFormData({
                      ...formData,
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
                value={formData.end ? new Date(formData.end).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, end: new Date(e.target.value).toISOString() })}
                disabled={!!formData.serviceId && !allowManualEndTime}
              />
              {formData.serviceId && (
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('workers.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('calendar.createBooking')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
