import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  createCustomer,
  getCustomerByPhone,
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
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, Scissors, Sparkles, Droplet, User, Bell, Calendar as CalendarIcon } from 'lucide-react';
import type { Appointment, Worker, Service, Customer } from '@/types/admin';

type ViewMode = 'day' | 'week' | 'year';

const ViewModeButtons = ({ currentMode, onModeChange, t, isMobile }: { 
  currentMode: ViewMode; 
  onModeChange: (mode: ViewMode) => void; 
  t: (key: string) => string;
  isMobile?: boolean;
}) => (
  <div className={`flex gap-1 ${isMobile ? 'gap-1' : 'gap-2'}`}>
    <Button
      variant={currentMode === 'day' ? 'default' : 'outline'}
      onClick={() => onModeChange('day')}
      size={isMobile ? 'sm' : 'sm'}
      className={isMobile ? 'text-xs px-2' : ''}
    >
      {t('calendar.day')}
    </Button>
    <Button
      variant={currentMode === 'week' ? 'default' : 'outline'}
      onClick={() => onModeChange('week')}
      size={isMobile ? 'sm' : 'sm'}
      className={isMobile ? 'text-xs px-2' : ''}
    >
      {t('calendar.week')}
    </Button>
    <Button
      variant={currentMode === 'year' ? 'default' : 'outline'}
      onClick={() => onModeChange('year')}
      size={isMobile ? 'sm' : 'sm'}
      className={isMobile ? 'text-xs px-2' : ''}
    >
      {t('calendar.year')}
    </Button>
  </div>
);

// Helper function to convert hex to rgba with opacity
const hexToRgba = (hex: string, opacity: number = 0.2): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Helper function to get worker color
const getWorkerColor = (worker: Worker | undefined, defaultColor: string = '#9CA3AF'): { bg: string; border: string; text: string } => {
  const color = worker?.color || defaultColor;
  
  // Calculate if we need light or dark text based on color brightness
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 128 ? 'text-gray-900' : 'text-white';
  
  return {
    bg: hexToRgba(color, 0.2), // Light background with opacity
    border: color,
    text: textColor,
  };
};

// Helper function to get service icon
const getServiceIcon = (serviceName: string) => {
  const name = serviceName.toLowerCase();
  
  if (name.includes('gel') || name.includes('nail') || name.includes('polish')) {
    return <Sparkles className="w-3 h-3" />;
  }
  if (name.includes('haircut') || name.includes('hair')) {
    return <Scissors className="w-3 h-3" />;
  }
  if (name.includes('beard') || name.includes('trim')) {
    return <User className="w-3 h-3" />;
  }
  if (name.includes('peeling') || name.includes('peel')) {
    return <Droplet className="w-3 h-3" />;
  }
  if (name.includes('facial') || name.includes('face')) {
    return <Clock className="w-3 h-3" />;
  }
  return <Clock className="w-3 h-3" />;
};

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
  const [isQuickCustomerDialogOpen, setIsQuickCustomerDialogOpen] = useState(false);
  const [quickCustomerData, setQuickCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
  });
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
    const timeSlotGap = settings.calendar?.timeSlotGap || 60; // Default 60 minutes
    const startTimeStr = typeof workingHours.start === 'string' ? workingHours.start : '09:00';
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);
    const slots: string[] = [];
    
    // Validate that we got valid numbers
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      // Fallback to default hours if parsing failed
      const defaultStart = 9;
      const defaultEnd = 18;
      for (let hour = defaultStart; hour < defaultEnd; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      return slots;
    }
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += timeSlotGap) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
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

  const handleQuickCustomerCreate = () => {
    if (!quickCustomerData.name || !quickCustomerData.phone) {
      toast.error(t('calendar.required'));
      return;
    }

    // Check for duplicate phone number
    const existingCustomer = getCustomerByPhone(quickCustomerData.phone);
    if (existingCustomer) {
      toast.error(t('customers.phoneExists') || 'A customer with this phone number already exists');
      return;
    }

    const newCustomer = createCustomer({
      name: quickCustomerData.name,
      phone: quickCustomerData.phone,
      email: quickCustomerData.email || '',
      lastVisit: new Date().toISOString(),
      tags: [],
      visitHistory: [],
      consentMarketing: false,
    });

    // Refresh customers list
    setCustomers(getCustomers());
    
    // Auto-select the newly created customer
    setFormData({ ...formData, customerId: newCustomer.id });
    
    // Reset quick customer form and close dialog
    setQuickCustomerData({ name: '', phone: '', email: '' });
    setIsQuickCustomerDialogOpen(false);
    
    toast.success(t('customers.customerCreated') || 'Customer created successfully');
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
    <div className="w-full bg-white">
      {/* Header with navigation */}
      <div className="mb-6 flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} />
          <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100">
            <Bell className="w-5 h-5 text-gray-700" />
          </Button>
        </div>
      </div>

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
      <div className="w-full bg-white">
        {/* Header with navigation */}
        <div className={`mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 pb-4 border-b`}>
          <div className="flex items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} isMobile={isMobile} />
            <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </Button>
          </div>
        </div>
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
      <div className="w-full bg-white">
        {/* Header with navigation */}
        <div className="mb-6 flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} />
            <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>

        <Card className="p-3 sm:p-4 md:p-6 shadow-card w-full">
          <div className="flex flex-col gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')} className="shrink-0">
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="shrink-0 text-xs sm:text-sm">
                {t('calendar.today')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')} className="shrink-0">
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
              <span className="font-medium px-2 whitespace-nowrap text-sm sm:text-base">{formatDate(dayDate)}</span>
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
                <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
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

  // Calculate total columns (days * workers per day)
  const displayWorkers = selectedWorker === 'all' 
    ? workers 
    : workers.filter(w => w.id === selectedWorker);
  
  const totalColumns = weekDates.length * displayWorkers.length;
  const columnWidth = `${100 / (totalColumns + 1)}%`; // +1 for time column

  // Helper to get appointments for a specific day and worker
  const getAppointmentsForDayAndWorker = (date: Date, workerId: string) => {
    return filteredAppointments.filter((apt) => {
      const aptDate = new Date(apt.start);
      const aptDateStr = aptDate.toDateString();
      const slotDateStr = date.toDateString();
      const aptWorkerId = apt.workerId || apt.staffId;
      return aptDateStr === slotDateStr && aptWorkerId === workerId;
    });
  };

  // Calculate position for appointment block
  const calculateAppointmentPosition = (apt: Appointment) => {
    const start = new Date(apt.start);
    const end = new Date(apt.end);
    const settings = getSettings();
    const workingHours = settings.calendar?.workingHours || { start: '09:00', end: '18:00' };
    const startTimeStr = typeof workingHours.start === 'string' ? workingHours.start : '09:00';
    const [startHour, startMin] = startTimeStr.split(':').map(Number);
    
    // Calculate minutes from the start of working hours
    const workingStartMinutes = startHour * 60 + (startMin || 0);
    const appointmentStartMinutes = start.getHours() * 60 + start.getMinutes();
    const minutesFromStart = appointmentStartMinutes - workingStartMinutes;
    
    // Each hour slot is 60px, so convert minutes to pixels (60px per hour = 1px per minute)
    const topPixels = minutesFromStart;
    
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    
    return {
      top: `${topPixels}px`,
      height: `${Math.max(duration, 20)}px`,
    };
  };

  return (
      <div className="w-full bg-white">
        {/* Header with navigation - matching image design */}
        <div className={`mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 pb-4 border-b`}>
          <div className="flex items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <ViewModeButtons currentMode={currentViewMode} onModeChange={setViewMode} t={t} isMobile={isMobile} />
            <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </Button>
          </div>
        </div>

      <Card className="p-0 shadow-lg overflow-hidden">
        {/* Calendar controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 items-start sm:items-center justify-between border-b bg-gray-50">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')} className="shrink-0">
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="shrink-0 text-xs sm:text-sm">
              {t('calendar.today')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')} className="shrink-0">
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            <span className="font-medium px-2 whitespace-nowrap text-xs sm:text-sm">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </span>
          </div>
          
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
            <Button onClick={() => handleCreateClick()} size="sm" className="w-full sm:w-auto">
              <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
              {t('calendar.createBooking')}
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Date and Staff Header Row */}
            <div className="grid border-b bg-gray-50" style={{ 
              gridTemplateColumns: `80px repeat(${totalColumns}, minmax(140px, 1fr))` 
            }}>
              {/* Time column header - empty for date/staff row */}
              <div className="border-r bg-gray-50"></div>
              
              {/* Date and Staff headers */}
              {weekDates.map((date) => {
                const { dayName, dayNum } = formatDateHeader(date, locale);
                const month = date.toLocaleDateString(locale, { month: '2-digit' });
                const isToday = date.toDateString() === new Date().toDateString();
                const isWorking = isWorkingDay(date);
                
                return (
                  <div
                    key={`day-${date.toISOString()}`}
                    className={`border-r ${displayWorkers.length > 1 ? '' : ''}`}
                    style={{ gridColumn: `span ${displayWorkers.length}` }}
                  >
                    {/* Date header */}
                    <div className={`p-2 border-b text-center ${isToday ? 'bg-blue-50' : ''}`}>
                      <div className="text-xs text-gray-600 font-medium">
                        {isRTL ? `${dayNum}/${month} ${dayName}` : `${dayName} ${month}/${dayNum}`}
                      </div>
                    </div>
                    
                    {/* Staff names row */}
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${displayWorkers.length}, 1fr)` }}>
                      {displayWorkers.map((worker) => {
                        const isSelected = selectedWorker === worker.id;
                        return (
                          <div
                            key={`worker-${date.toISOString()}-${worker.id}`}
                            onClick={() => setSelectedWorker(selectedWorker === worker.id ? 'all' : worker.id)}
                            className={`p-2 text-center text-sm font-medium border-r last:border-r-0 bg-gray-50 cursor-pointer transition-colors hover:bg-gray-100 ${
                              isSelected ? 'bg-blue-100 font-semibold text-blue-700' : ''
                            }`}
                            title={t('calendar.clickToFilter') || `Click to ${isSelected ? 'show all' : 'filter by'} ${worker.name}`}
                          >
                            {worker.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time slots and appointments */}
            <div className="relative" style={{ height: `${timeSlots.length * 60}px` }}>
              {/* Render the calendar grid with all time slots as one continuous area */}
              <div className="grid border-b absolute inset-0" style={{ 
                gridTemplateColumns: `80px repeat(${totalColumns}, minmax(140px, 1fr))`,
                gridTemplateRows: `repeat(${timeSlots.length}, 60px)`
              }}>
                {/* Time labels column */}
                {timeSlots.map((time, timeIndex) => (
                  <div
                    key={`time-${time}`}
                    className="border-r border-b p-2 text-sm text-gray-500 text-center bg-gray-50 sticky left-0 z-10"
                    style={{ gridRow: timeIndex + 1, gridColumn: 1 }}
                  >
                    {time}
                  </div>
                ))}
                
                {/* Create columns for each day-worker combination */}
                {weekDates.map((date, dayIndex) => {
                  return displayWorkers.map((worker, workerIndex) => {
                    const columnIndex = dayIndex * displayWorkers.length + workerIndex + 2; // +2 because column 1 is time
                    const dayAppointments = getAppointmentsForDayAndWorker(date, worker.id);
                    
                    return (
                      <div
                        key={`column-${date.toISOString()}-${worker.id}`}
                        className="border-r relative overflow-hidden"
                        style={{ 
                          gridColumn: columnIndex,
                          gridRow: `1 / ${timeSlots.length + 1}`
                        }}
                      >
                        {/* Render hour cells for clickability */}
                        {timeSlots.map((time, timeIndex) => {
                          const hour = parseInt(time.split(':')[0]);
                          const isWorking = isWorkingDay(date);
                          const testDate = new Date(date);
                          testDate.setHours(hour, 0, 0, 0);
                          const isWithinHours = isWithinWorkingHours(testDate);
                          const isClickable = isWorking && isWithinHours;
                          
                          return (
                            <div
                              key={`cell-${date.toISOString()}-${worker.id}-${time}`}
                              className={`border-b relative group ${
                                isClickable 
                                  ? 'hover:bg-gray-50/50 cursor-pointer transition-colors' 
                                  : 'bg-gray-50/30'
                              }`}
                              style={{ height: '60px' }}
                              onClick={() => {
                                if (isClickable) {
                                  handleCreateClick(date, hour, worker.id);
                                }
                              }}
                            >
                              {/* Plus icon on hover for empty cells */}
                              {isClickable && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
                                  <Plus className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Render appointments absolutely positioned within this column */}
                        {dayAppointments.map((apt) => {
                          const position = calculateAppointmentPosition(apt);
                          const aptWorker = workers.find(w => w.id === (apt.workerId || apt.staffId));
                          const colors = getWorkerColor(aptWorker);
                          const serviceIcon = getServiceIcon(apt.service);
                          const start = new Date(apt.start);
                          const end = new Date(apt.end);
                          
                          return (
                            <div
                              key={apt.id}
                              className={`absolute left-1 right-1 rounded border-l-4 p-2 cursor-pointer hover:shadow-lg transition-all pointer-events-auto ${colors.text}`}
                              style={{
                                top: position.top,
                                height: position.height,
                                maxHeight: `calc(100% - ${position.top})`, // Prevent overflow
                                zIndex: 20,
                                minHeight: '40px',
                                backgroundColor: colors.bg,
                                borderLeftColor: colors.border,
                                overflow: 'hidden', // Ensure content doesn't overflow
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAppointmentClick(apt);
                              }}
                            >
                              <div className="flex items-start gap-1.5 mb-0.5">
                                {serviceIcon}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="font-semibold text-xs truncate">
                                    {apt.customer}
                                  </div>
                                  <div className="text-[10px] opacity-90 mt-0.5 truncate">
                                    {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                              <div className="text-[10px] font-medium mt-1 truncate">
                                {apt.service}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full">
          {/* Sticky Header */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-lg sm:text-xl break-words">{t('calendar.editAppointment')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{t('calendar.appointmentDetails')}</DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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

          {/* Sticky Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
            <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto order-2 sm:order-1">
              <Trash2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
              {t('calendar.deleteAppointment')}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-initial">
                {t('workers.cancel')}
              </Button>
              <Button onClick={handleSave} className="flex-1 sm:flex-initial">
                {t('calendar.saveChanges')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Appointment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full">
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
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
                <Label>{t('calendar.selectCustomer')} *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickCustomerDialogOpen(true)}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  {t('calendar.addNewCustomer')}
                </Button>
              </div>
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

          {/* Sticky Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 sm:flex-initial order-2 sm:order-1">
              {t('workers.cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial order-1 sm:order-2">
              {t('calendar.createBooking')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Customer Creation Dialog */}
      <Dialog open={isQuickCustomerDialogOpen} onOpenChange={setIsQuickCustomerDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] sm:w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Sticky Header */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-lg sm:text-xl break-words">{t('calendar.addNewCustomer')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{t('calendar.quickCustomerDescription')}</DialogDescription>
          </DialogHeader>

          {/* Scrollable Content */}
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

          {/* Sticky Footer */}
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
};

export default Calendar;
