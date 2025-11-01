"use client";
import { useState, useEffect } from 'react';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Button } from '@/components/ported/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { 
  getServices, 
  getAppointments, 
  getSettings, 
  createCustomer, 
  createAppointment,
  getWorkers
} from '@/components/ported/lib/mockData';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, X, ChevronRight, ChevronLeft, MessageCircle, Check, CheckCircle2 } from 'lucide-react';
import type { Service, Appointment, Worker } from '@/types/admin';
import Link from 'next/link';

type BookingStep = 1 | 2 | 3 | 4;

export default function BookingPage() {
  const { t, locale, isRTL } = useLocale();
  const { dir } = useDirection();
  const [step, setStep] = useState<BookingStep>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [settings, setSettings] = useState(() => getSettings());
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<{
    service: string;
    worker: string;
    date: Date;
    time: string;
  } | null>(null);

  useEffect(() => {
    setServices(getServices().filter(s => s.active));
    setAppointments(getAppointments());
    setWorkers(getWorkers().filter(w => w.active));
    setSettings(getSettings());

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      setSettings(getSettings());
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // Get working hours and days from settings
  const workingHours = settings.calendar?.workingHours || { start: '09:00', end: '18:00' };
  const workingDays = settings.calendar?.workingDays || [0, 1, 2, 3, 4];
  const businessName = settings.businessProfile?.name || '';
  const logoUrl = settings.branding?.logoUrl || '';
  const whatsapp = settings.businessProfile?.whatsapp || '';

  // Helper functions
  const isWorkingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return workingDays.includes(dayOfWeek);
  };

  const getTimeSlots = (): string[] => {
    const startTimeStr = typeof workingHours.start === 'string' ? workingHours.start : '09:00';
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const [startHour] = startTimeStr.split(':').map(Number);
    const [endHour] = endTimeStr.split(':').map(Number);
    
    if (isNaN(startHour) || isNaN(endHour)) {
      return [];
    }
    
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  // Get available dates (next 30 days)
  const getAvailableDates = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (isWorkingDay(date)) {
        dates.push(date);
      }
    }
    
    return dates;
  };

  // Check if a time slot is available for the selected date
  const isTimeSlotAvailable = (timeSlot: string, date: Date, serviceId: string): boolean => {
    if (!selectedService) return false;
    
    // Check if slot + duration fits within working hours
    const [hour, minute] = timeSlot.split(':').map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + selectedService.duration);
    
    // Check working hours
    const startTimeStr = typeof workingHours.start === 'string' ? workingHours.start : '09:00';
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const [startHour, startMin] = startTimeStr.split(':').map(Number);
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    
    const slotStartMinutes = hour * 60 + minute;
    const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
    const workingStartMinutes = startHour * 60 + startMin;
    const workingEndMinutes = endHour * 60 + endMin;
    
    if (slotStartMinutes < workingStartMinutes || slotEndMinutes > workingEndMinutes) {
      return false;
    }
    
    if (!selectedWorker && workers.length > 0) {
      // Check all workers
      return workers.some(worker => {
        if (!worker.services.includes(serviceId)) return false;
        return !isTimeSlotBooked(timeSlot, date, worker.id, selectedService.duration);
      });
    } else if (selectedWorker) {
      const worker = workers.find(w => w.id === selectedWorker);
      if (!worker || !worker.services.includes(serviceId)) return false;
      return !isTimeSlotBooked(timeSlot, date, selectedWorker, selectedService.duration);
    }
    return true;
  };

  // Check if a time slot is booked or overlaps
  const isTimeSlotBooked = (timeSlot: string, date: Date, workerId: string, duration: number): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const [hour, minute] = timeSlot.split(':').map(Number);
    const slotStart = hour * 60 + minute;
    const slotEnd = slotStart + duration;
    
    return appointments.some(apt => {
      if (apt.status === 'cancelled') return false;
      
      const aptDate = new Date(apt.start);
      const aptDateStr = aptDate.toISOString().split('T')[0];
      const aptWorkerId = apt.workerId || apt.staffId;
      
      if (aptDateStr !== dateStr || aptWorkerId !== workerId) return false;
      
      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();
      const aptStart = aptHour * 60 + aptMinute;
      const aptEnd = aptStart + (new Date(apt.end).getTime() - new Date(apt.start).getTime()) / (1000 * 60);
      
      // Check if slots overlap
      return (slotStart < aptEnd && slotEnd > aptStart);
    });
  };
  
  // Get appointment info for a time slot (for display)
  const getAppointmentInfo = (timeSlot: string, date: Date, workerId: string): Appointment | null => {
    const dateStr = date.toISOString().split('T')[0];
    const [hour, minute] = timeSlot.split(':').map(Number);
    
    return appointments.find(apt => {
      if (apt.status === 'cancelled') return false;
      
      const aptDate = new Date(apt.start);
      const aptDateStr = aptDate.toISOString().split('T')[0];
      const aptWorkerId = apt.workerId || apt.staffId;
      
      if (aptDateStr !== dateStr || aptWorkerId !== workerId) return false;
      
      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();
      
      return aptHour === hour && aptMinute === minute;
    }) || null;
  };

  // Get available workers for selected service
  const getAvailableWorkers = (): Worker[] => {
    if (!selectedService) return [];
    return workers.filter(w => w.services.includes(selectedService.id));
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      he: 'he-IL',
      ar: 'ar-SA',
      ru: 'ru-RU'
    };
    const localeString = localeMap[locale] || 'en-US';
    return date.toLocaleDateString(localeString, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const availableDates = getAvailableDates();
  const timeSlots = getTimeSlots();
  const availableWorkers = getAvailableWorkers();

  // Auto-select first worker if only one available
  useEffect(() => {
    if (availableWorkers.length === 1 && !selectedWorker) {
      setSelectedWorker(availableWorkers[0].id);
    } else if (availableWorkers.length === 0) {
      setSelectedWorker(null);
    }
  }, [selectedService, availableWorkers.length]);

  // WhatsApp link helper
  const getWhatsAppLink = (phone: string): string => {
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    return `https://wa.me/${cleanedPhone}`;
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedTime(null);
    setStep(2);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (timeSlot: string) => {
    const workerToCheck = selectedWorker || availableWorkers[0]?.id;
    if (!workerToCheck) return;
    
    const appointmentInfo = getAppointmentInfo(timeSlot, selectedDate!, workerToCheck);
    if (appointmentInfo) return; // Don't allow selecting booked slots
    
    const isAvailable = isTimeSlotAvailable(timeSlot, selectedDate!, selectedService!.id);
    if (!isAvailable) return;
    
    setSelectedTime(timeSlot);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
    } else if (step === 3) {
      setStep(2);
      setSelectedTime(null);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error(t('booking.fillAllFields'));
      return;
    }

    // Get available workers for the selected service (recalculate to ensure it's current)
    const currentAvailableWorkers = getAvailableWorkers();
    
    if (currentAvailableWorkers.length === 0) {
      toast.error(t('booking.noServicesAvailable'));
      return;
    }

    // Use the first available worker if none is selected
    const workerToUse = selectedWorker || currentAvailableWorkers[0]?.id;
    if (!workerToUse) {
      toast.error(t('booking.selectServiceFirst'));
      return;
    }

    setIsBooking(true);

    try {
      const [hour, minute] = selectedTime.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hour, minute, 0, 0);
      
      const endDate = new Date(appointmentDate);
      endDate.setMinutes(endDate.getMinutes() + selectedService.duration);

      // Create customer
      const customer = createCustomer({
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        lastVisit: selectedDate.toISOString().split('T')[0],
        tags: [],
        notes: '',
        visitHistory: [],
        consentMarketing: false,
      });

      // Create appointment
      createAppointment({
        service: selectedService.name,
        serviceId: selectedService.id,
        customer: customerInfo.name,
        customerId: customer.id,
        workerId: workerToUse,
        staffId: workerToUse,
        start: appointmentDate.toISOString(),
        end: endDate.toISOString(),
        status: 'confirmed',
      });
      
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointmentUpdated'));
      }

      toast.success(t('booking.bookingSuccess'));
      
      // Store confirmed appointment details
      const workerName = workers.find(w => w.id === workerToUse)?.name || '';
      setConfirmedAppointment({
        service: selectedService.name,
        worker: workerName,
        date: appointmentDate,
        time: selectedTime,
      });
      
      // Go to success screen
      setStep(4);
      
      // Refresh appointments
      setAppointments(getAppointments());
    } catch (error) {
      toast.error(t('booking.bookingError'));
    } finally {
      setIsBooking(false);
    }
  };

  // Generate ICS file for calendar
  const generateICS = (): string => {
    if (!selectedService || !selectedDate || !selectedTime || !confirmedAppointment) return '';
    
    const [hour, minute] = selectedTime.split(':').map(Number);
    const startDate = new Date(selectedDate);
    startDate.setHours(hour, minute, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + selectedService.duration);
    
    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const businessName = settings.businessProfile?.name || 'Business';
    const businessAddress = settings.businessProfile?.address || '';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Booking System//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${selectedService.name} - ${businessName}`,
      `DESCRIPTION:${selectedService.description}\\nWorker: ${confirmedAppointment.worker}\\nCustomer: ${customerInfo.name}`,
      `LOCATION:${businessAddress}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    return icsContent;
  };

  // Add to Google Calendar
  const addToGoogleCalendar = () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    
    const [hour, minute] = selectedTime.split(':').map(Number);
    const startDate = new Date(selectedDate);
    startDate.setHours(hour, minute, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + selectedService.duration);
    
    const formatGoogleDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const businessName = settings.businessProfile?.name || 'Business';
    const businessAddress = settings.businessProfile?.address || '';
    const workerName = confirmedAppointment?.worker || '';
    
    const title = encodeURIComponent(`${selectedService.name} - ${businessName}`);
    const details = encodeURIComponent(`${selectedService.description}\nWorker: ${workerName}\nCustomer: ${customerInfo.name}`);
    const location = encodeURIComponent(businessAddress);
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  // Add to Apple Calendar (download ICS file)
  const addToAppleCalendar = () => {
    const icsContent = generateICS();
    if (!icsContent) return;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `appointment-${selectedDate?.toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date and time for display
  const formatDateTimeDisplay = (date: Date, time: string): string => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      he: 'he-IL',
      ar: 'ar-SA',
      ru: 'ru-RU'
    };
    const localeString = localeMap[locale] || 'en-US';
    
    const [hour, minute] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hour, minute, 0, 0);
    
    return dateTime.toLocaleString(localeString, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="h-10 w-auto object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                </div>
              )}
              <h1 className="text-xl font-bold">{businessName || t('booking.title')}</h1>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Indicator */}
        <div className="mb-8 flex justify-center items-center">
          <div className="flex items-center justify-center gap-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center justify-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step > s ? <Check className="w-6 h-6" /> : s}
                  </div>
                  <div className={`mt-2 text-sm text-center whitespace-nowrap ${step >= s ? 'font-medium' : 'text-muted-foreground'}`}>
                    {t(`booking.step${s}`)}
                  </div>
                </div>
                {s < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Service Selection */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('booking.step1')}</h2>
            {services.length === 0 ? (
              <p className="text-muted-foreground text-center">{t('booking.noServicesAvailable')}</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                      selectedService?.id === service.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    } ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <div className="font-semibold mb-1">{service.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{service.description}</div>
                    <div className={`flex items-center gap-4 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {service.duration} {t('services.minutes') || 'min'}
                      </span>
                      <span className="font-medium">{t('services.price')}: ₪{service.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 2 && selectedService && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('booking.step2')}</h2>
                <Button variant="outline" onClick={handleBack} size="sm">
                  {isRTL ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
                  {t('booking.back')}
                </Button>
              </div>
              
              {/* Selected Service Info */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="font-semibold mb-1">{selectedService.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedService.duration} {t('services.minutes')} • ₪{selectedService.price}
                </div>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">{t('booking.selectDate')}</h3>
                <div className="grid grid-cols-7 gap-2">
                  {availableDates.slice(0, 14).map((date, index) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleDateSelect(date)}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-semibold">
                          {isToday ? t('booking.today') : isTomorrow ? t('booking.tomorrow') : formatDate(date).split(' ')[0]}
                        </div>
                        <div className="text-xs opacity-80">{date.getDate()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <h3 className="text-md font-medium mb-3">{t('booking.selectTime')}</h3>
                  {availableWorkers.length > 1 && (
                    <div className="mb-4">
                      <Label className={`mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('calendar.selectWorker')}
                      </Label>
                      <select
                        value={selectedWorker || ''}
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        {availableWorkers.map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {timeSlots.map((timeSlot) => {
                      const workerToCheck = selectedWorker || availableWorkers[0]?.id;
                      if (!workerToCheck) return null;
                      
                      const appointmentInfo = getAppointmentInfo(timeSlot, selectedDate, workerToCheck);
                      const isAvailable = isTimeSlotAvailable(timeSlot, selectedDate, selectedService.id);
                      const isSelected = selectedTime === timeSlot;
                      const isBooked = !!appointmentInfo;
                      
                      return (
                        <button
                          key={timeSlot}
                          onClick={() => handleTimeSelect(timeSlot)}
                          disabled={!isAvailable || isBooked}
                          className={`p-3 rounded-lg border-2 text-sm transition-all relative ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : isBooked
                              ? 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50'
                              : isAvailable
                              ? 'border-border hover:border-primary/50 cursor-pointer'
                              : 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50'
                          }`}
                          title={appointmentInfo ? `${appointmentInfo.service} - ${appointmentInfo.customer}` : undefined}
                        >
                          {timeSlot}
                          {appointmentInfo && (
                            <div className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1`}>
                              <X className="w-3 h-3 text-destructive" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {timeSlots.filter(ts => isTimeSlotAvailable(ts, selectedDate, selectedService.id)).length === 0 && (
                    <p className="text-muted-foreground mt-4 text-center">{t('booking.noAvailableSlots')}</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Step 3: Customer Information */}
        {step === 3 && selectedService && selectedDate && selectedTime && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('booking.step3')}</h2>
                <Button variant="outline" onClick={handleBack} size="sm">
                  {isRTL ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
                  {t('booking.back')}
                </Button>
              </div>

              {/* Booking Summary */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('booking.service')}:</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('booking.selectDate')}:</span>
                    <span className="font-medium">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('booking.selectTime')}:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('services.price')}:</span>
                    <span className="font-medium">₪{selectedService.price}</span>
                  </div>
                </div>
              </div>

              {/* Customer Information Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('booking.name')} *
                  </Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder={t('booking.namePlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('booking.email')} *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder={t('booking.emailPlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('booking.phone')} *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder={t('booking.phonePlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleBookAppointment}
                  disabled={isBooking || !customerInfo.name || !customerInfo.email || !customerInfo.phone}
                  className="w-full"
                  size="lg"
                >
                  {isBooking ? t('common.loading') : t('booking.confirmBooking')}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 4: Success/Confirmation Screen */}
        {step === 4 && confirmedAppointment && selectedService && selectedDate && selectedTime && (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center justify-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t('booking.thankYou')}</h2>
              <p className="text-muted-foreground mb-6">{t('booking.appointmentConfirmed')}</p>
            </div>

            <div className={`max-w-md mx-auto mb-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <h3 className="text-lg font-semibold mb-4">{t('booking.appointmentDetails')}</h3>
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('booking.serviceName')}:</span>
                  <span className="font-medium">{confirmedAppointment.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('booking.workerName')}:</span>
                  <span className="font-medium">{confirmedAppointment.worker}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('booking.appointmentDateTime')}:</span>
                  <span className="font-medium">{formatDateTimeDisplay(confirmedAppointment.date, confirmedAppointment.time)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={addToGoogleCalendar}
                variant="outline"
                className={`w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <CalendarIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('booking.addToGoogleCalendar')}
              </Button>
              <Button
                onClick={addToAppleCalendar}
                variant="outline"
                className={`w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <CalendarIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('booking.addToAppleCalendar')}
              </Button>
            </div>

            <Button
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedDate(null);
                setSelectedTime(null);
                setCustomerInfo({ name: '', email: '', phone: '' });
                setConfirmedAppointment(null);
              }}
              className="mt-6"
              variant="default"
            >
              {t('booking.bookAnotherAppointment')}
            </Button>
          </Card>
        )}

        {/* WhatsApp Help Message - At the bottom */}
        {whatsapp && (
          <Card className="p-4 mt-8 bg-blue-50 border-blue-200">
            <div className={`flex flex-col gap-2 ${isRTL ? 'text-right items-end' : 'text-left items-start'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MessageCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-900">{t('booking.whatsappHelp')}</p>
              </div>
              <Link 
                href={getWhatsAppLink(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium underline"
              >
                {t('booking.whatsappClickHere')}
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
