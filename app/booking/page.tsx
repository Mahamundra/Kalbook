"use client";
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  getSettings as getMockSettings,
} from '@/lib/mockData';
import { 
  getServices, 
  getWorkers,
  createCustomer,
  createAppointment,
  getCustomerByPhone,
  cancelAppointment,
  updateAppointment,
} from '@/lib/api/services';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, X, ChevronRight, ChevronLeft, ChevronDown, Check, CheckCircle2, Phone, LogIn, LogOut, Users, Edit, Trash2, Mail, MapPin, Sparkles, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Service, Appointment, Worker } from '@/types/admin';
import Link from 'next/link';
import { LoginRegisterDialog } from '@/components/LoginRegisterDialog';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import { ClassicLayout } from '@/components/booking/layouts/ClassicLayout';
import { HeroLayout } from '@/components/booking/layouts/HeroLayout';
import { CompactDashboardLayout } from '@/components/booking/layouts/CompactDashboardLayout';
import { getGreetingMessage } from '@/lib/utils/greetings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type BookingStep = 1 | 2 | 3 | 4;

// Force dynamic rendering to prevent prerender errors
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 14, g: 165, b: 233 }; // Default to #0EA5E9
};

interface BookingPageContentProps {
  editMode?: boolean;
  editorSettings?: any; // Settings passed from HomepageEditor
  editorViewAsGuest?: boolean; // Override isLoggedIn state in edit mode
}

export function BookingPageContent({ editMode = false, editorSettings, editorViewAsGuest = true }: BookingPageContentProps = {}) {
  const { t, locale, isRTL } = useLocale();
  const { dir } = useDirection();
  const params = useParams();
  const searchParams = useSearchParams();
  // Get slug from route params (when accessed via /b/[slug]) or from query params (legacy)
  const slug = (params?.slug as string) || searchParams.get('slug') || searchParams.get('ui') || null;
  const [step, setStep] = useState<BookingStep>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Helper to convert HSL to hex (for reading from CSS variables)
  const hslToHex = (hsl: string): string | null => {
    const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!match) return null;
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
  };
  
  // Initialize theme color from CSS variables if available (ThemeProvider may have set them)
  const getInitialThemeColor = (): string => {
    if (typeof window === 'undefined') return '#0EA5E9';
    
    // Check if CSS variable is already set by ThemeProvider
    const root = document.documentElement;
    const bookingPrimary = getComputedStyle(root).getPropertyValue('--booking-primary').trim();
    if (bookingPrimary) {
      const hex = hslToHex(bookingPrimary);
      if (hex) return hex;
    }
    
    return '#0EA5E9';
  };
  
  const [themeColor, setThemeColor] = useState<string>(() => getInitialThemeColor()); // Initialize from CSS variables if available
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Override isLoggedIn in edit mode
  const effectiveIsLoggedIn = editMode ? !editorViewAsGuest : isLoggedIn;
  const effectiveCurrentUser = editMode ? (editorViewAsGuest ? null : { name: 'John Doe', email: 'john@example.com', phone: '+1234567890', customerId: 'mock-customer-id' }) : currentUser;
  
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [availableGroupAppointments, setAvailableGroupAppointments] = useState<Array<{
    id: string;
    start: string;
    end: string;
    workerId: string;
    availableSpots: number;
    maxCapacity: number;
    currentParticipants: number;
  }>>([]);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [showAppointments, setShowAppointments] = useState(true);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleMonthOffset, setRescheduleMonthOffset] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState<string[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Auto-fill customer info if logged in
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      setCustomerInfo({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      });
    }
  }, [isLoggedIn, currentUser]);

  // Fetch customer appointments when logged in
  useEffect(() => {
    const fetchCustomerAppointments = async () => {
      if (isLoggedIn && currentUser?.customerId) {
        setLoadingAppointments(true);
        try {
          const response = await fetch(`/api/customers/${currentUser.customerId}/appointments`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.appointments) {
              // Filter out cancelled appointments and only show upcoming/past confirmed/pending
              const activeAppointments = data.appointments.filter((apt: Appointment) => apt.status !== 'cancelled');
              setCustomerAppointments(activeAppointments);
            }
          }
        } catch (error) {
          console.error('Error fetching customer appointments:', error);
        } finally {
          setLoadingAppointments(false);
        }
      } else {
        setCustomerAppointments([]);
      }
    };

    fetchCustomerAppointments();
  }, [isLoggedIn, currentUser?.customerId]);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, 1 = next month, etc.
  const workerTimeSectionRef = useRef<HTMLDivElement>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<{
    service: string;
    worker: string;
    date: Date;
    time: string;
  } | null>(null);

  // Handle OAuth callback for customer login (redirect flow)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const type = searchParams.get('type');
      const oauthSuccess = searchParams.get('oauth_success');
      
      // Check if this is an OAuth callback for customer
      if (type === 'customer' && oauthSuccess === 'true') {
        try {
          // Wait a bit for session to be set
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Create customer session from OAuth
          const sessionResponse = await fetch('/api/auth/oauth-session-customer', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const sessionData = await sessionResponse.json();

          if (sessionResponse.ok && sessionData.success && sessionData.session) {
            const customerSession = sessionData.session;
            
            // Check if customer has complete profile
            if (customerSession.name && customerSession.name !== customerSession.phone) {
              // Customer exists with complete profile - log them in
              setIsLoggedIn(true);
              setCurrentUser({
                phone: customerSession.phone,
                name: customerSession.name,
                email: customerSession.email || '',
                customerId: customerSession.customerId,
                businessId: customerSession.businessId,
              });
              setCustomerInfo({
                name: customerSession.name,
                email: customerSession.email || '',
                phone: customerSession.phone,
              });
              
              // Save session to localStorage
              const expirationTime = new Date().getTime() + (14 * 24 * 60 * 60 * 1000);
              const session = {
                user: {
                  phone: customerSession.phone,
                  name: customerSession.name,
                  email: customerSession.email || '',
                  customerId: customerSession.customerId,
                  businessId: customerSession.businessId,
                },
                expirationTime: expirationTime
              };
              localStorage.setItem('userSession', JSON.stringify(session));
              
              // Clean URL
              window.history.replaceState({}, '', window.location.pathname);
            } else {
              // Customer needs to complete registration - open dialog
              setShowLoginDialog(true);
            }
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
          // Open login dialog on error
          setShowLoginDialog(true);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams]);

  // Check for valid session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        const expirationTime = session.expirationTime;
        
        // Check if session is still valid (not expired)
        if (expirationTime && new Date().getTime() < expirationTime) {
          setIsLoggedIn(true);
          setCurrentUser(session.user);
          setCustomerInfo({
            name: session.user.name || '',
            email: session.user.email || '',
            phone: session.user.phone || '',
          });
        } else {
          // Session expired, clear it
          localStorage.removeItem('userSession');
        }
      } catch (error) {
        // Invalid session data, clear it
        localStorage.removeItem('userSession');
      }
    }
  }, []);

  // Update theme color when settings or editorSettings change
  useEffect(() => {
    if (settings?.branding?.themeColor) {
      setThemeColor(settings.branding.themeColor);
    } else if (editorSettings?.branding?.themeColor) {
      setThemeColor(editorSettings.branding.themeColor);
    } else {
      // Check CSS variables again in case ThemeProvider updated them
      const root = document.documentElement;
      const bookingPrimary = getComputedStyle(root).getPropertyValue('--booking-primary').trim();
      if (bookingPrimary) {
        const hex = hslToHex(bookingPrimary);
        if (hex) setThemeColor(hex);
      }
    }
  }, [settings, editorSettings]);

  // Fetch theme color immediately on mount if we have a slug (before settings are fully loaded)
  useEffect(() => {
    if (slug && !settings && !editMode) {
      // Fetch immediately, don't wait
      const fetchThemeColor = async () => {
        try {
          const response = await fetch(`/api/settings?businessSlug=${slug}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings?.branding?.themeColor) {
              setThemeColor(data.settings.branding.themeColor);
            }
          }
        } catch (error) {
          // Silently fail, will use default or CSS variable
        }
      };
      fetchThemeColor();
    }
  }, [slug, settings, editMode]);
  
  // Also listen for CSS variable changes (in case ThemeProvider updates them)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkCSSVariables = () => {
      const root = document.documentElement;
      const bookingPrimary = getComputedStyle(root).getPropertyValue('--booking-primary').trim();
      if (bookingPrimary) {
        const hex = hslToHex(bookingPrimary);
        if (hex && hex !== themeColor) {
          setThemeColor(hex);
        }
      }
    };
    
    // Check immediately
    checkCSSVariables();
    
    // Set up a MutationObserver to watch for CSS variable changes
    const observer = new MutationObserver(checkCSSVariables);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    return () => observer.disconnect();
  }, [themeColor]);

  // Update settings when editorSettings changes (for real-time preview)
  useEffect(() => {
    if (editMode && editorSettings) {
      setSettings(editorSettings);
      
      // Apply theme color in real-time
      if (editorSettings.branding?.themeColor) {
        const hexToHsl = (hex: string): string => {
          hex = hex.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h: number, s: number, l: number;
          l = (max + min) / 2;
          if (max === min) {
            h = s = 0;
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
              case g: h = ((b - r) / d + 2) / 6; break;
              case b: h = ((r - g) / d + 4) / 6; break;
              default: h = 0;
            }
          }
          h = Math.round(h * 360);
          s = Math.round(s * 100);
          l = Math.round(l * 100);
          return `${h} ${s}% ${l}%`;
        };
        
        const root = document.documentElement;
        const hsl = hexToHsl(editorSettings.branding.themeColor);
        const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v));
        root.style.setProperty('--booking-primary', hsl);
        root.style.setProperty('--booking-primary-foreground', '0 0% 100%');
        root.style.setProperty('--booking-primary-glow', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
        root.style.setProperty('--booking-ring', hsl);
      }
      
      // Apply text color in real-time
      if (editorSettings.branding?.textColor) {
        const root = document.documentElement;
        if (editorSettings.branding.textColor === 'white') {
          root.style.setProperty('--booking-text-color', '0 0% 100%');
        } else {
          root.style.setProperty('--booking-text-color', '0 0% 0%');
        }
      }
    }
  }, [editMode, editorSettings]);

  useEffect(() => {
    // If in edit mode with provided settings, use them directly
    if (editMode && editorSettings) {
      // Still fetch services and workers for full functionality
      const fetchServicesAndWorkers = async () => {
        try {
          setLoading(true);
          const [servicesResult, workersResult] = await Promise.allSettled([
            getServices().catch(err => {
              console.error('Error fetching services:', err);
              return [];
            }),
            getWorkers().catch(err => {
              console.error('Error fetching workers:', err);
              return [];
            }),
          ]);
          
          if (servicesResult.status === 'fulfilled') {
            setServices(servicesResult.value.filter((s: Service) => s.active));
          } else {
            setServices([]);
          }
          
          if (workersResult.status === 'fulfilled') {
            setWorkers(workersResult.value.filter((w: Worker) => w.active));
          } else {
            setWorkers([]);
          }
          
          setAppointments([]);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching services/workers:', error);
          setServices([]);
          setWorkers([]);
          setAppointments([]);
          setLoading(false);
        }
      };
      fetchServicesAndWorkers();
      return;
    }

    const loadData = async () => {
      setLoading(true);
      
      // If we have a slug, fetch all data from API
      if (slug) {
        try {
          // Fetch all data in parallel for better performance
          const [trialResponse, settingsResponse, servicesResult, workersResult] = await Promise.allSettled([
            fetch(`/api/trial/status?slug=${slug}`),
            fetch(`/api/settings?businessSlug=${slug}`),
            getServices().catch(err => {
              console.error('Error fetching services:', err);
              return [];
            }),
            getWorkers().catch(err => {
              console.error('Error fetching workers:', err);
              return [];
            }),
          ]);
          
          // Process trial status
          if (trialResponse.status === 'fulfilled' && trialResponse.value.ok) {
            const trialData = await trialResponse.value.json();
            if (trialData.success) {
              setTrialExpired(trialData.trialExpired);
              setTrialDaysRemaining(trialData.daysRemaining);
            }
          }
          
          // Process settings
          if (settingsResponse.status === 'fulfilled' && settingsResponse.value.ok) {
            const settingsData = await settingsResponse.value.json();
            if (settingsData.success && settingsData.settings) {
              setSettings(settingsData.settings);
              // Update theme color immediately when settings are loaded
              if (settingsData.settings.branding?.themeColor) {
                setThemeColor(settingsData.settings.branding.themeColor);
              }
            }
          }
          
          // Process services (only active ones)
          if (servicesResult.status === 'fulfilled') {
            setServices(servicesResult.value.filter((s: Service) => s.active));
          } else {
            setServices([]);
          }
          
          // Process workers (only active ones)
          if (workersResult.status === 'fulfilled') {
            setWorkers(workersResult.value.filter((w: Worker) => w.active));
          } else {
            setWorkers([]);
          }
          
          // Appointments will be fetched when needed (for date selection)
          setAppointments([]);
        } catch (error) {
          console.error('Error fetching data:', error);
          // Fallback to mock data on error
          setSettings(getMockSettings());
          setServices([]);
          setWorkers([]);
          setAppointments([]);
        }
      } else {
        // No slug, use mock data
        setSettings(getMockSettings());
        setServices([]);
        setWorkers([]);
        setAppointments([]);
      }
      
      setLoading(false);
    };

    loadData();

    // Listen for settings updates (only if not in edit mode)
    const handleSettingsUpdate = async () => {
      if (editMode && editorSettings) {
        // In edit mode, settings are controlled by parent
        return;
      }
      if (slug) {
        // Reload all data from API in parallel if we have a slug
        try {
          const [settingsResponse, servicesResult, workersResult] = await Promise.allSettled([
            fetch(`/api/settings?businessSlug=${slug}`),
            getServices().catch(err => {
              console.error('Error fetching services:', err);
              return [];
            }),
            getWorkers().catch(err => {
              console.error('Error fetching workers:', err);
              return [];
            }),
          ]);
          
          // Process settings
          if (settingsResponse.status === 'fulfilled' && settingsResponse.value.ok) {
            const settingsData = await settingsResponse.value.json();
            if (settingsData.success && settingsData.settings) {
              setSettings(settingsData.settings);
            }
          }
          
          // Process services
          if (servicesResult.status === 'fulfilled') {
            setServices(servicesResult.value.filter((s: Service) => s.active));
          }
          
          // Process workers
          if (workersResult.status === 'fulfilled') {
            setWorkers(workersResult.value.filter((w: Worker) => w.active));
          }
        } catch (err) {
          console.error('Error reloading data:', err);
        }
      } else {
        setSettings(getMockSettings());
      }
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, [slug]);

  // Get working hours and days from settings (with safe defaults)
  const workingHours = settings?.calendar?.workingHours || { start: '09:00', end: '18:00' };
  const workingDays = settings?.calendar?.workingDays || [0, 1, 2, 3, 4];
  const businessName = settings?.businessProfile?.name || '';
  const businessDescription = settings?.businessProfile?.description || '';
  const logoUrl = settings?.branding?.logoUrl || '';
  const logoShape = settings?.branding?.logoShape || 'square';
  const whatsapp = settings?.businessProfile?.whatsapp || '';
  const phone = settings?.businessProfile?.phone || '';
  const address = settings?.businessProfile?.address || '';

  // Helper function to format operating hours
  const formatOperatingHours = (): React.ReactNode => {
    if (!workingDays || workingDays.length === 0) {
      return t('booking.closed');
    }

    const dayNames = [
      t('settings.sunday'),
      t('settings.monday'),
      t('settings.tuesday'),
      t('settings.wednesday'),
      t('settings.thursday'),
      t('settings.friday'),
      t('settings.saturday'),
    ];

    const sortedDays = [...workingDays].sort((a, b) => a - b);
    const dailyHours = settings?.calendar?.dailyWorkingHours;
    const defaultHours = workingHours || { start: '09:00', end: '18:00' };

    // Group days by their working hours
    const hoursMap = new Map<string, number[]>();
    
    for (const day of sortedDays) {
      const dayHours = dailyHours?.[day] || defaultHours;
      const hoursKey = `${dayHours.start}-${dayHours.end}`;
      
      if (!hoursMap.has(hoursKey)) {
        hoursMap.set(hoursKey, []);
      }
      hoursMap.get(hoursKey)!.push(day);
    }

    // Format each group
    const formattedGroups: React.ReactNode[] = [];
    
    for (const [hoursKey, days] of hoursMap.entries()) {
      const [startTime, endTime] = hoursKey.split('-');
      
      // Group consecutive days
      const dayGroups: Array<{ start: number; end: number }> = [];
      let currentGroup: { start: number; end: number } | null = null;

      for (const day of days) {
        if (!currentGroup) {
          currentGroup = { start: day, end: day };
        } else if (day === currentGroup.end + 1) {
          currentGroup.end = day;
        } else {
          dayGroups.push(currentGroup);
          currentGroup = { start: day, end: day };
        }
      }
      if (currentGroup) {
        dayGroups.push(currentGroup);
      }

      // Format day groups
      const dayGroupStrings = dayGroups.map((group) => {
        if (group.start === group.end) {
          return dayNames[group.start];
        } else {
          return `${dayNames[group.start]} - ${dayNames[group.end]}`;
        }
      });

      formattedGroups.push(
        <React.Fragment key={hoursKey}>
          {formattedGroups.length > 0 && <br />}
          {`${dayGroupStrings.join(', ')}: ${startTime} - ${endTime}`}
        </React.Fragment>
      );
    }

    return <>{formattedGroups}</>;
  };

  // Helper function to format phone for WhatsApp link
  const formatPhoneForWhatsApp = (phoneNumber: string): string => {
    if (!phoneNumber) return '';
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    // If no + prefix, assume Israeli number and add +972
    if (!cleaned.startsWith('+')) {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '+972' + cleaned;
    }
    return cleaned;
  };

  // Helper function to format Waze URL
  const formatWazeURL = (address: string): string => {
    if (!address) return '';
    const encodedAddress = encodeURIComponent(address);
    return `https://waze.com/ul?q=${encodedAddress}`;
  };

  // Helper functions
  const isWorkingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return workingDays.includes(dayOfWeek);
  };

  const getTimeSlots = (): string[] => {
    const startTimeStr = typeof workingHours.start === 'string' ? workingHours.start : '09:00';
    const endTimeStr = typeof workingHours.end === 'string' ? workingHours.end : '18:00';
    const timeSlotGap = settings.calendar?.timeSlotGap || 60; // Default 60 minutes
    
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);
    
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      return [];
    }
    
    const slots: string[] = [];
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += timeSlotGap) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
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

  // Get calendar dates for the current month view
  const getCalendarDates = (): Date[] => {
    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    // Get first day of week for the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayWeekday = firstDayOfMonth.getDay();
    // Adjust for Monday as first day (ISO standard) - if Sunday (0), make it 6
    const startOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
    
    const dates: Date[] = [];
    
    // Add days from previous month to fill the first week (greyed out, not clickable)
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(firstDayOfMonth);
      date.setDate(date.getDate() - i - 1);
      dates.push(date);
    }
    
    // Add all days of the current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      dates.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    }
    
    return dates;
  };

  // Get month and year display
  const getMonthYearDisplay = (): string => {
    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    
    const localeMap: Record<string, string> = {
      en: 'en-US',
      he: 'he-IL',
      ar: 'ar-SA',
      ru: 'ru-RU'
    };
    const localeString = localeMap[locale] || 'en-US';
    
    return viewDate.toLocaleDateString(localeString, { month: 'long', year: 'numeric' });
  };

  // Get day names for the calendar header
  const getDayNames = (): string[] => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      he: 'he-IL',
      ar: 'ar-SA',
      ru: 'ru-RU'
    };
    const localeString = localeMap[locale] || 'en-US';
    
    const dayNames: string[] = [];
    // Start from Monday (January 1, 2024 is a Monday)
    const baseDate = new Date(2024, 0, 1);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      dayNames.push(date.toLocaleDateString(localeString, { weekday: 'short' }));
    }
    
    return dayNames;
  };

  // Navigate to previous month
  const handlePreviousMonth = () => {
    setMonthOffset(prev => Math.max(0, prev - 1)); // Don't go before current month
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setMonthOffset(prev => prev + 1);
  };

  // Fetch available slots for reschedule date
  useEffect(() => {
    const fetchRescheduleSlots = async () => {
      if (reschedulingAppointment && rescheduleDate) {
        setLoadingRescheduleSlots(true);
        try {
          const dateStr = rescheduleDate.toISOString().split('T')[0];
          const workerId = reschedulingAppointment.workerId || reschedulingAppointment.staffId;
          const serviceId = reschedulingAppointment.serviceId;
          
          if (!serviceId) {
            setRescheduleAvailableSlots([]);
            return;
          }

          const url = `/api/appointments/available?date=${dateStr}&serviceId=${serviceId}${workerId ? `&workerId=${workerId}` : ''}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.availableSlots) {
              // Extract time strings from available slots
              const slots = data.availableSlots
                .map((slot: { start: string; workerId: string }) => {
                  const slotDate = new Date(slot.start);
                  // Include slots for the selected worker (or all if no worker specified)
                  if (!workerId || slot.workerId === workerId) {
                    const hours = slotDate.getHours().toString().padStart(2, '0');
                    const minutes = slotDate.getMinutes().toString().padStart(2, '0');
                    return `${hours}:${minutes}`;
                  }
                  return null;
                })
                .filter((slot: string | null): slot is string => slot !== null);
              
              // Remove duplicates and sort
              const uniqueSlots = [...new Set(slots)].sort() as string[];
              setRescheduleAvailableSlots(uniqueSlots);
            } else {
              setRescheduleAvailableSlots([]);
            }
          } else {
            setRescheduleAvailableSlots([]);
          }
        } catch (error) {
          console.error('Error fetching reschedule slots:', error);
          setRescheduleAvailableSlots([]);
        } finally {
          setLoadingRescheduleSlots(false);
        }
      } else {
        setRescheduleAvailableSlots([]);
      }
    };

    fetchRescheduleSlots();
  }, [reschedulingAppointment, rescheduleDate]);

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

  // Generate ICS file from appointment (for Apple Calendar)
  const generateICSFromAppointment = (apt: Appointment): string => {
    const startDate = new Date(apt.start);
    const endDate = new Date(apt.end);
    
    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const businessName = settings?.businessProfile?.name || 'Business';
    const businessAddress = settings?.businessProfile?.address || '';
    const worker = workers.find(w => w.id === apt.workerId || w.id === apt.staffId);
    const workerName = worker?.name || '';
    const serviceDescription = (apt as any).serviceDescription || '';
    
    // Get translated labels
    const serviceLabel = t('booking.calendarLabels.service');
    const workerLabel = t('booking.calendarLabels.worker');
    const customerLabel = t('booking.calendarLabels.customer');
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Booking System//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${apt.service} - ${businessName}`,
      `DESCRIPTION:${serviceDescription || ''}\\n${serviceLabel}: ${apt.service}\\n${workerLabel}: ${workerName}\\n${customerLabel}: ${apt.customer}`,
      `LOCATION:${businessAddress}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    return icsContent;
  };

  // Generate Google Calendar URL from appointment
  const generateGoogleCalendarUrl = (apt: Appointment) => {
    const startDate = new Date(apt.start);
    const endDate = new Date(apt.end);
    
    const formatGoogleDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const businessName = settings?.businessProfile?.name || 'Business';
    const businessAddress = settings?.businessProfile?.address || '';
    const worker = workers.find(w => w.id === apt.workerId || w.id === apt.staffId);
    const workerName = worker?.name || '';
    const serviceDescription = (apt as any).serviceDescription || '';
    
    // Get translated labels
    const serviceLabel = t('booking.calendarLabels.service');
    const workerLabel = t('booking.calendarLabels.worker');
    const customerLabel = t('booking.calendarLabels.customer');
    
    const title = encodeURIComponent(`${apt.service} - ${businessName}`);
    const details = encodeURIComponent(
      `${serviceDescription || ''}\n${serviceLabel}: ${apt.service}\n${workerLabel}: ${workerName}\n${customerLabel}: ${apt.customer}`
    );
    const location = encodeURIComponent(businessAddress);
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  // Handle cancel appointment
  const handleCancelAppointment = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setShowCancelDialog(true);
  };

  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    setCancellingAppointmentId(appointmentToCancel);
    setShowCancelDialog(false);
    
    try {
      await cancelAppointment(appointmentToCancel);
      toast.success(t('booking.appointmentCancelled') || 'Appointment cancelled successfully');
      
      // Refresh appointments list
      if (isLoggedIn && currentUser?.customerId) {
        const response = await fetch(`/api/customers/${currentUser.customerId}/appointments`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.appointments) {
            const activeAppointments = data.appointments.filter((apt: Appointment) => apt.status !== 'cancelled');
            setCustomerAppointments(activeAppointments);
          }
        }
      }
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast.error(error.message || t('booking.cancelError') || 'Failed to cancel appointment');
    } finally {
      setCancellingAppointmentId(null);
      setAppointmentToCancel(null);
    }
  };

  // Handle reschedule appointment
  const handleRescheduleAppointment = async (appointmentId: string, newDate: Date, newTime: string) => {
    try {
      // Check if rescheduling is allowed
      const allowReschedule = settings?.calendar?.reschedule?.allowCustomerReschedule ?? false;
      if (!allowReschedule) {
        toast.error(t('booking.rescheduleNotAllowed') || 'Rescheduling is not allowed for this business');
        return;
      }

      const [hour, minute] = newTime.split(':').map(Number);
      const appointmentDate = new Date(newDate);
      appointmentDate.setHours(hour, minute, 0, 0);
      
      const appointment = customerAppointments.find(apt => apt.id === appointmentId);
      if (!appointment) return;

      // Check if trying to reschedule to the same date and time
      const currentStart = new Date(appointment.start);
      const currentDateStr = currentStart.toISOString().split('T')[0];
      const newDateStr = appointmentDate.toISOString().split('T')[0];
      const currentTimeStr = `${currentStart.getHours().toString().padStart(2, '0')}:${currentStart.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentDateStr === newDateStr && currentTimeStr === newTime) {
        toast.error(t('booking.sameDateTimeError') || 'Cannot reschedule to the same date and time');
        return;
      }

      const service = services.find(s => s.id === appointment.serviceId);
      if (!service) return;

      const endDate = new Date(appointmentDate);
      endDate.setMinutes(endDate.getMinutes() + service.duration);

      const requireApproval = settings?.calendar?.reschedule?.requireApproval ?? false;

      if (requireApproval) {
        // Create a reschedule request
        const response = await fetch(`/api/appointments/${appointmentId}/reschedule-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestedStart: appointmentDate.toISOString(),
            requestedEnd: endDate.toISOString(),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            toast.success(t('booking.rescheduleRequestSent') || 'Reschedule request sent. Waiting for approval.');
            setReschedulingAppointment(null);
            setRescheduleDate(null);
            setRescheduleTime(null);
            setRescheduleAvailableSlots([]);
            
            // Refresh appointments list
            if (isLoggedIn && currentUser?.customerId) {
              const refreshResponse = await fetch(`/api/customers/${currentUser.customerId}/appointments`);
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.success && refreshData.appointments) {
                  const activeAppointments = refreshData.appointments.filter((apt: Appointment) => apt.status !== 'cancelled');
                  setCustomerAppointments(activeAppointments);
                }
              }
            }
          } else {
            toast.error(data.error || t('booking.rescheduleError') || 'Failed to send reschedule request');
          }
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || t('booking.rescheduleError') || 'Failed to send reschedule request');
        }
      } else {
        // Direct update (auto-approve)
        await updateAppointment(appointmentId, {
          start: appointmentDate.toISOString(),
          end: endDate.toISOString(),
        });

        toast.success(t('booking.appointmentRescheduled') || 'Appointment rescheduled successfully');
        setReschedulingAppointment(null);
        setRescheduleDate(null);
        setRescheduleTime(null);
        setRescheduleAvailableSlots([]);
        
        // Refresh appointments list
        if (isLoggedIn && currentUser?.customerId) {
          const response = await fetch(`/api/customers/${currentUser.customerId}/appointments`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.appointments) {
              const activeAppointments = data.appointments.filter((apt: Appointment) => apt.status !== 'cancelled');
              setCustomerAppointments(activeAppointments);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      toast.error(error.message || t('booking.rescheduleError') || 'Failed to reschedule appointment');
    }
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

  // Calculate derived values (only if settings loaded)
  const availableDates = settings ? getAvailableDates() : [];
  const allTimeSlots = settings ? getTimeSlots() : [];
  const availableWorkers = settings ? getAvailableWorkers() : [];
  
  // Filter out past time slots for today
  const getFilteredTimeSlots = (): string[] => {
    if (!selectedDate) return allTimeSlots;
    
    const today = new Date();
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date(today);
    todayOnly.setHours(0, 0, 0, 0);
    
    // If selected date is today, filter out past times and times too close to now
    if (selectedDateOnly.getTime() === todayOnly.getTime()) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;
      // Add 15 minute buffer to avoid booking conflicts
      const minBookableMinutes = currentMinutes + 15;
      
      return allTimeSlots.filter(timeSlot => {
        const [hour, minute] = timeSlot.split(':').map(Number);
        const slotMinutes = hour * 60 + minute;
        return slotMinutes >= minBookableMinutes;
      });
    }
    
    return allTimeSlots;
  };
  
  const timeSlots = settings ? getFilteredTimeSlots() : [];

  // Auto-select first worker if only one available
  useEffect(() => {
    if (!settings) return; // Don't run if settings not loaded
    if (availableWorkers.length === 1 && !selectedWorker) {
      setSelectedWorker(availableWorkers[0].id);
    } else if (availableWorkers.length === 0) {
      setSelectedWorker(null);
    }
  }, [selectedService, availableWorkers.length, settings, selectedWorker]);

  // Show loading state until settings are loaded (AFTER all hooks)
  if (loading || !settings) {
    // Use the themeColor state which is updated from settings, editorSettings, or CSS variables
    const currentThemeColor = themeColor;
    const rgb = hexToRgb(currentThemeColor);
    
    return (
      <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center animate-fade-in">
        <div className="text-center space-y-6 px-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <KalBookLogo size="lg" variant="full" animated={false} />
          </div>
          {/* Modern animated spinner with smooth gradient */}
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` }}></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: currentThemeColor, borderRightColor: currentThemeColor, animationDuration: '0.8s' }}></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent animate-spin" style={{ borderBottomColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`, borderLeftColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`, animationDuration: '1.2s', animationDirection: 'reverse' }}></div>
          </div>
          {/* Friendly loading message with pulse animation */}
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground animate-pulse" style={{ animationDuration: '2s' }}>
              {t('common.justAMoment')}
            </p>
            {/* Subtle dots animation */}
            <div className="flex justify-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`, animationDelay: '0s', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`, animationDelay: '0.2s', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`, animationDelay: '0.4s', animationDuration: '1.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WhatsApp link helper
  const getWhatsAppLink = (phone: string): string => {
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    return `https://wa.me/${cleanedPhone}`;
  };

  const handleServiceSelect = async (service: Service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedTime(null);
    setMonthOffset(0); // Reset to current month
    
    // If group service, fetch available group appointments
    if (service.isGroupService && slug) {
      try {
        const groupResponse = await fetch(
          `/api/appointments/group/available?serviceId=${service.id}&businessSlug=${slug}`
        );
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          if (groupData.success && groupData.appointments) {
            setAvailableGroupAppointments(groupData.appointments);
          }
        }
      } catch (error) {
        console.error('Error fetching group appointments:', error);
        setAvailableGroupAppointments([]);
      }
    } else {
      setAvailableGroupAppointments([]);
    }
    
    setStep(2);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    // Scroll to worker and time selection after a short delay to allow state update
    setTimeout(() => {
      workerTimeSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }, 100);
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

  const handleStepClick = (targetStep: number) => {
    // Only allow navigation to accessible steps
    if (targetStep === 1) {
      // Always allow going back to step 1
      setStep(1);
      if (targetStep < step) {
        // Going back, clear selections
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedTime(null);
      }
    } else if (targetStep === 2) {
      // Only allow if service is selected
      if (selectedService) {
        setStep(2);
        if (targetStep < step) {
          // Going back, clear date and time
          setSelectedDate(null);
          setSelectedTime(null);
        }
      }
    } else if (targetStep === 3) {
      // Only allow if service, date, and time are selected
      if (selectedService && selectedDate && selectedTime) {
        setStep(3);
      }
    }
  };

  const handleBookAppointment = async () => {
    // Check if trial expired
    if (trialExpired) {
      toast.error('Trial period has expired. Please contact the business to upgrade.');
      return;
    }

    // Email is optional, so we don't check for it
    if (!selectedService || !selectedDate || !selectedTime || !customerInfo.name || !customerInfo.phone) {
      toast.error(t('booking.fillAllFields'));
      return;
    }

    // Check if trial expired before proceeding
    if (trialExpired) {
      toast.error('Trial period has expired. Please contact the business to upgrade.');
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

      // Get or create customer
      let customerId: string;
      
      if (isLoggedIn && currentUser?.customerId) {
        // Use existing logged-in customer
        customerId = currentUser.customerId;
      } else {
        // Check if customer exists by phone, otherwise create new one
        try {
          const existingCustomer = await getCustomerByPhone(customerInfo.phone);
          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Create new customer
            const newCustomer = await createCustomer({
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone,
              lastVisit: selectedDate.toISOString().split('T')[0],
              tags: [],
              notes: '',
              visitHistory: [],
              consentMarketing: false,
            });
            customerId = newCustomer.id;
          }
        } catch (error) {
          console.error('Error getting/creating customer:', error);
          // Try to create customer anyway
          const newCustomer = await createCustomer({
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            lastVisit: selectedDate.toISOString().split('T')[0],
            tags: [],
            notes: '',
            visitHistory: [],
            consentMarketing: false,
          });
          customerId = newCustomer.id;
        }
      }

      // Create appointment using real API
      await createAppointment({
        service: selectedService.name,
        serviceId: selectedService.id,
        customer: customerInfo.name,
        customerId: customerId,
        workerId: workerToUse,
        staffId: workerToUse,
        start: appointmentDate.toISOString(),
        end: endDate.toISOString(),
        status: 'confirmed',
        createdBy: 'customer', // Explicitly mark as customer-created
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
      
      // Refresh customer appointments if logged in (or if we just created/used a customer)
      // Also update currentUser if we used a customerId
      if (customerId) {
        // If user is logged in but didn't have customerId, update it
        if (isLoggedIn && currentUser && !currentUser.customerId) {
          setCurrentUser({ ...currentUser, customerId });
        }
        
        // Refresh appointments list
        try {
          const response = await fetch(`/api/customers/${customerId}/appointments`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.appointments) {
              const activeAppointments = data.appointments.filter((apt: Appointment) => apt.status !== 'cancelled');
              setCustomerAppointments(activeAppointments);
              // Show appointments by default after booking
              setShowAppointments(true);
            }
          }
        } catch (error) {
          console.error('Error refreshing customer appointments:', error);
        }
      }
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      
      // Extract more specific error message if available
      let errorMessage = t('booking.bookingError');
      
      if (error instanceof Error) {
        // Check if it's an API error with a specific message
        if (error.message && error.message !== 'Network error') {
          // Try to show a more specific error
          const apiError = error as any;
          if (apiError.response?.error) {
            errorMessage = apiError.response.error;
          } else if (error.message.includes('Trial period has expired')) {
            errorMessage = 'Trial period has expired. Please contact the business to upgrade.';
          } else if (error.message.includes('plan does not allow')) {
            errorMessage = 'Your plan does not allow creating appointments. Please upgrade.';
          } else if (error.message.includes('maximum number of appointments')) {
            errorMessage = error.message;
          } else if (error.message.includes('Time slot is already booked')) {
            errorMessage = t('booking.timeSlotBooked') || 'This time slot is already booked. Please select another time.';
          } else if (error.message.includes('outside working hours')) {
            errorMessage = t('booking.outsideWorkingHours') || 'This time is outside working hours. Please select another time.';
          } else if (error.message.includes('Customer not found')) {
            errorMessage = 'Customer information error. Please try again.';
          } else if (error.message.includes('Service not found') || error.message.includes('Worker not found')) {
            errorMessage = 'Service or worker is no longer available. Please refresh and try again.';
          } else {
            // Log the full error for debugging
            console.error('Full error details:', {
              message: error.message,
              stack: error.stack,
              response: (error as any).response,
              status: (error as any).status,
            });
          }
        }
      }
      
      toast.error(errorMessage);
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
    
    // Get translated labels
    const serviceLabel = t('booking.calendarLabels.service');
    const workerLabel = t('booking.calendarLabels.worker');
    const customerLabel = t('booking.calendarLabels.customer');
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Booking System//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${selectedService.name} - ${businessName}`,
      `DESCRIPTION:${selectedService.description || ''}\\n${serviceLabel}: ${selectedService.name}\\n${workerLabel}: ${confirmedAppointment.worker}\\n${customerLabel}: ${customerInfo.name}`,
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
    
    // Get translated labels
    const serviceLabel = t('booking.calendarLabels.service');
    const workerLabel = t('booking.calendarLabels.worker');
    const customerLabel = t('booking.calendarLabels.customer');
    
    const title = encodeURIComponent(`${selectedService.name} - ${businessName}`);
    const details = encodeURIComponent(`${selectedService.description || ''}\n${serviceLabel}: ${selectedService.name}\n${workerLabel}: ${workerName}\n${customerLabel}: ${customerInfo.name}`);
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

  // Get layout type (default to 'classic')
  // If layout is 'sidebar' or 'asymmetric', default to 'classic' as these layouts are removed
  const rawLayout = settings?.branding?.layout || 'classic';
  const layoutType = (rawLayout === 'sidebar' || rawLayout === 'asymmetric' ? 'classic' : rawLayout) as 'classic' | 'hero' | 'compact';

  // Extract header
  const header = (
    <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={businessName} 
                  className={`h-10 ${logoShape === 'circle' ? 'w-10 rounded-[100%]' : 'w-auto rounded-[25%]'} object-contain`}
                  data-edit-id="logo"
                  data-edit-type="image"
                />
              ) : (
                <div 
                  className={`h-10 w-10 ${logoShape === 'circle' ? 'rounded-[100%]' : 'rounded-[25%]'} bg-primary/10 flex items-center justify-center`}
                  data-edit-id="logo"
                  data-edit-type="image"
                >
                  <CalendarIcon className="w-6 h-6 text-primary" />
                </div>
              )}
              <h1 
                className="text-xl font-bold"
                data-edit-id="business-name"
                data-edit-type="text"
              >
                {businessName || t('booking.title')}
              </h1>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>
    );

  // Extract trial banner
  const trialBanner = trialExpired ? (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <X className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">
                Trial Period Expired
              </h3>
              <p className="text-sm text-yellow-700">
                This business's trial period has ended. Please contact them to upgrade their plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Extract banner cover
  const bannerCover = settings.branding?.bannerCover ? (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-0 md:mb-6 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 sm:mt-0 relative"
      data-edit-id="banner"
      data-edit-type="image"
    >
      <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded-none sm:rounded-lg">
        {settings.branding.bannerCover?.type === 'upload' && settings.branding.bannerCover?.uploadUrl ? (
          <>
            {settings.branding.bannerCover.videoUrl ? (
              <video
                src={settings.branding.bannerCover.videoUrl}
                poster={settings.branding.bannerCover.posterUrl || undefined}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: settings.branding.bannerCover.position
                    ? `${settings.branding.bannerCover.position.x}% ${settings.branding.bannerCover.position.y}%`
                    : '50% 50%',
                }}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={settings.branding.bannerCover.uploadUrl}
                alt="Banner"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: settings.branding.bannerCover.position
                    ? `${settings.branding.bannerCover.position.x}% ${settings.branding.bannerCover.position.y}%`
                    : '50% 50%',
                }}
              />
            )}
          </>
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: settings.branding.bannerCover.patternId === 'pattern1' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                         settings.branding.bannerCover.patternId === 'pattern2' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                         settings.branding.bannerCover.patternId === 'pattern3' ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                         settings.branding.bannerCover.patternId === 'pattern4' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' :
                         'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            }}
          />
        )}
      </div>
    </motion.div>
  ) : null;

  // Extract business information section
  const businessInfo = (phone || whatsapp || address || (workingDays && workingDays.length > 0)) ? (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 md:mb-6"
    >
      <Card className="p-6">
              <div className="space-y-6 text-center">
                {/* Operating Hours */}
                {workingDays && workingDays.length > 0 && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('booking.operatingHours')}
                      </div>
                    </div>
                    <div className="text-base font-semibold">
                      {formatOperatingHours()}
                    </div>
                  </div>
                )}

                {/* Address */}
                {address && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('booking.address')}
                      </div>
                    </div>
                    <div className="text-base font-semibold">{address}</div>
                  </div>
                )}

                {/* Contact Icons */}
                {(phone || whatsapp || address) && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('booking.contactUs')}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      {/* Phone */}
                      {phone && (
                        <motion.a
                          href={`tel:${phone.replace(/\s/g, '')}`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-colors shadow-lg"
                          aria-label={t('booking.callUs')}
                          title={t('booking.callUs')}
                        >
                          <Phone className="w-6 h-6" />
                        </motion.a>
                      )}

                      {/* WhatsApp */}
                      {whatsapp && (
                        <motion.a
                          href={`https://wa.me/${formatPhoneForWhatsApp(whatsapp).replace(/\+/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white hover:bg-[#20BA5A] transition-colors shadow-lg"
                          aria-label={t('booking.whatsappUs')}
                          title={t('booking.whatsappUs')}
                        >
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </motion.a>
                      )}

                      {/* Waze */}
                      {address && (
                        <motion.a
                          href={formatWazeURL(address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 rounded-full bg-[#33CCFF] flex items-center justify-center text-white hover:bg-[#29B8E6] transition-colors shadow-lg"
                          aria-label={t('booking.getDirections')}
                          title={t('booking.getDirections')}
                        >
                          <svg className="w-6 h-6" viewBox="0 0 122.71 122.88" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#FFFFFF" d="M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07 C104.27,17.76,90.77,8.19,72.3,6.22c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44 c-0.09,3.28,0,6.66,0,9.94C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
                            <path fill="#000000" d="M54.95,110.49c-1.03,4.69-3.56,8.16-7.69,10.31c-5.25,2.72-10.6,2.63-15.57-0.56c-5.16-3.28-7.41-8.25-7.03-14.35 c0.09-1.03-0.19-1.41-1.03-1.88c-9.1-4.78-16.31-11.44-21.28-20.44c-0.94-1.78-1.69-3.66-2.16-5.63c-0.66-2.72,0.38-4.03,3.19-4.31 c3.38-0.38,6.38-1.69,7.88-4.88c0.66-1.41,1.03-3.09,1.03-4.69c0.19-4.03,0-8.06,0.19-12.1c1.03-15.57,7.5-28.5,19.32-38.63 C42.67,3.97,55.42-0.43,69.76,0.03c25.04,0.94,46.51,18.57,51.57,43.23c4.59,22.32-2.34,40.98-20.07,55.51 c-1.03,0.84-2.16,1.69-3.38,2.44c-0.66,0.47-0.84,0.84-0.56,1.59c2.34,7.13-0.94,15-7.5,18.38c-8.91,4.41-19.22-0.09-21.94-9.66 c-0.09-0.38-0.56-0.84-0.84-0.84C63.11,110.4,59.07,110.49,54.95,110.49L54.95,110.49z M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09 c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07C104.27,17.76,90.77,8.19,72.3,6.22 c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44c-0.09,3.28,0,6.66,0,9.94 C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
                            <path fill="#000000" d="M74.92,79.74c-11.07-0.56-18.38-4.97-23.07-13.78c-1.13-2.16-0.09-4.31,2.06-4.78c1.31-0.28,2.53,0.66,3.47,2.16 c1.22,1.88,2.44,3.75,4.03,5.25c8.81,8.34,23.25,5.72,28.79-5.06c0.66-1.31,1.5-2.34,3.09-2.34c2.34,0.09,3.66,2.44,2.63,4.59 c-2.91,5.91-7.5,10.22-13.69,12.28C79.51,78.99,76.7,79.36,74.92,79.74L74.92,79.74z"/>
                            <path fill="#000000" d="M55.32,48.98c-3.38,0-6.09-2.72-6.09-6.09s2.72-6.09,6.09-6.09s6.09,2.72,6.09,6.09C61.42,46.17,58.7,48.98,55.32,48.98 L55.32,48.98z"/>
                            <path fill="#000000" d="M98.27,42.79c0,3.38-2.72,6.09-6,6.19c-3.38,0-6.09-2.63-6.09-6.09c0-3.38,2.63-6.09,6-6.19 C95.46,36.7,98.17,39.42,98.27,42.79L98.27,42.79z"/>
                          </svg>
                        </motion.a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
      ) : null;

  // Extract guest/logged-in message section
  const guestMessage = (
    <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-4">
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`flex gap-3 w-full sm:w-auto justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                {!effectiveIsLoggedIn ? (
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => setShowLoginDialog(true)}
                    className="w-full sm:w-auto px-8 flex items-center"
                    dir="ltr"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    {t('booking.loginOrRegister')}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => setShowLogoutDialog(true)}
                    className="w-full sm:w-auto px-8 flex items-center"
                    dir="ltr"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    {t('auth.logout')}
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <div 
                  className={`text-base font-medium ${isRTL ? 'text-right' : 'text-left'}`}
                  data-edit-id={effectiveIsLoggedIn && effectiveCurrentUser ? "logged-in-message" : "guest-message"}
                  data-edit-type="text"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      // Use user's selected language from language toggle, not business's default locale
                      // This allows the greeting to change when user changes language
                      const greetingLocale = (locale || settings?.locale?.language || 'en') as 'en' | 'he' | 'ar' | 'ru';
                      
                      if (effectiveIsLoggedIn && effectiveCurrentUser) {
                        const message = getGreetingMessage(
                          settings?.branding?.loggedInMessage,
                          greetingLocale,
                          true
                        );
                        return message.replace('{name}', effectiveCurrentUser.name || '');
                      } else {
                        return getGreetingMessage(
                          settings?.branding?.guestMessage,
                          greetingLocale,
                          false
                        );
                      }
                    })()
                  }}
                />
              </div>
            </div>
          </Card>
        </motion.div>
  );

  // Due to the complexity of extracting all sections, let's use a simpler approach:
  // Keep the current structure for ClassicLayout and create wrapper components for others
  // For now, render ClassicLayout with the extracted sections we have
  // We'll need to extract the rest of the content (appointments, booking section, dialogs)
  // into a single "mainContent" render function

  // For Classic layout, we can use the current structure
  // For Sidebar and Hero, we'll need to restructure
  
  // Extract the rest of the content - we'll create a render function
  // Note: guestMessage is passed separately to layouts, not included here
  const renderMainContent = () => {
    return (
      <>

        {/* Customer Appointments - Hide when user is booking a new appointment */}
        {effectiveIsLoggedIn && customerAppointments.length > 0 && step === 1 && !selectedService && !confirmedAppointment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <h2 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('booking.myAppointments')} ({customerAppointments.length})
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAppointments(!showAppointments)}
                  className={isRTL ? 'flex-row-reverse' : ''}
                >
                  {showAppointments ? (
                    <>
                      {isRTL ? (
                        <>
                          {t('booking.hideAppointments')}
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          {t('booking.hideAppointments')}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {isRTL ? (
                        <>
                          {t('booking.showAppointments')}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          {t('booking.showAppointments')}
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
              {showAppointments && (
                <>
                  {loadingAppointments ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">{t('common.loading')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                  {customerAppointments.map((apt) => {
                    const startDate = new Date(apt.start);
                    const endDate = new Date(apt.end);
                    const isPast = startDate < new Date();
                    const localeMap: Record<string, string> = {
                      en: 'en-US',
                      he: 'he-IL',
                      ar: 'ar-SA',
                      ru: 'ru-RU'
                    };
                    const localeString = localeMap[locale] || 'en-US';
                    const formattedDate = startDate.toLocaleDateString(localeString, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                    const formattedTime = startDate.toLocaleTimeString(localeString, {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const formattedEndTime = endDate.toLocaleTimeString(localeString, {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-lg border-2 ${
                          isPast
                            ? 'border-muted bg-muted/20'
                            : 'border-primary/30 bg-primary/5'
                        }`}
                      >
                        <div className={`flex flex-col gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-base">{apt.service}</div>
                            <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                              {apt.status === 'confirmed' 
                                ? t('calendar.confirmed')
                                : apt.status === 'pending'
                                ? t('calendar.pending')
                                : apt.status}
                            </Badge>
                          </div>
                          {/* Cancel Button - Mobile: Under status, Desktop: At bottom */}
                          {!isPast && apt.status !== 'cancelled' && (
                            <div className="sm:hidden">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCancelAppointment(apt.id)}
                                disabled={cancellingAppointmentId === apt.id}
                                className="text-xs px-3 h-8 w-full sm:w-auto"
                              >
                                {cancellingAppointmentId === apt.id ? (
                                  <>
                                    <motion.span
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className={isRTL ? 'ml-1.5' : 'mr-1.5'}
                                    >
                                      ⏳
                                    </motion.span>
                                    <span>...</span>
                                  </>
                                ) : (
                                  <>
                                    {isRTL ? (
                                      <>
                                        {t('booking.cancel')}
                                        <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                        {t('booking.cancel')}
                                      </>
                                    )}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{formattedTime} - {formattedEndTime}</span>
                          </div>
                          {apt.workerId && (() => {
                            const worker = workers.find(w => w.id === apt.workerId || w.id === apt.staffId);
                            return worker ? (
                              <div className="text-sm text-muted-foreground">
                                {t('calendar.worker')}: {worker.name}
                              </div>
                            ) : null;
                          })()}
                          {(apt as any).serviceDescription && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {(apt as any).serviceDescription}
                            </div>
                          )}
                          {!isPast && apt.status !== 'cancelled' && (
                            <div className={`flex gap-1.5 sm:gap-2 mt-3 flex-nowrap sm:flex-wrap ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                              {/* Calendar Buttons */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const icsContent = generateICSFromAppointment(apt);
                                  if (!icsContent) return;
                                  
                                  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                                  const link = document.createElement('a');
                                  link.href = window.URL.createObjectURL(blob);
                                  const dateStr = new Date(apt.start).toISOString().split('T')[0];
                                  link.download = `appointment-${dateStr}.ics`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className={`text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 whitespace-nowrap ${isRTL ? 'flex-row-reverse' : ''}`}
                              >
                                <svg 
                                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}`}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M8 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <circle cx="12" cy="15" r="1" fill="currentColor"/>
                                  <circle cx="9" cy="15" r="1" fill="currentColor"/>
                                  <circle cx="15" cy="15" r="1" fill="currentColor"/>
                                  <circle cx="12" cy="18" r="1" fill="currentColor"/>
                                </svg>
                                {t('booking.addToAppleCalendar') || 'Add to Apple Calendar'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = generateGoogleCalendarUrl(apt);
                                  window.open(url, '_blank');
                                }}
                                className={`text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 whitespace-nowrap ${isRTL ? 'flex-row-reverse' : ''}`}
                              >
                                <svg 
                                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}`}
                                  viewBox="0 0 200 200"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <g transform="translate(3.75 3.75)">
                                    <path d="M148.882,43.618l-47.368-5.263l-57.895,5.263L38.355,96.25l5.263,52.632l52.632,6.579l52.632-6.579l5.263-53.947L148.882,43.618z" fill="#FFFFFF"/>
                                    <path d="M65.211,125.276c-3.934-2.658-6.658-6.539-8.145-11.671l9.132-3.763c0.829,3.158,2.276,5.605,4.342,7.342c2.053,1.737,4.553,2.592,7.474,2.592c2.987,0,5.553-0.908,7.697-2.724s3.224-4.132,3.224-6.934c0-2.868-1.132-5.211-3.395-7.026s-5.105-2.724-8.5-2.724h-5.276v-9.039H76.5c2.921,0,5.382-0.789,7.382-2.368c2-1.579,3-3.737,3-6.48c0-2.987-1.237-5.237-3.711-6.75c-2.474-1.513-5.816-2.276-10.026-2.276c-4.421,0-7.816,0.776-10.184,2.329c-2.368,1.553-3.947,3.816-4.737,6.789l-9.132-2.724c1.237-4.105,3.632-7.421,7.184-9.947c3.553-2.526,8.026-3.789,13.421-3.789c6.316,0,11.421,1.237,15.316,3.711c3.895,2.474,6.553,5.947,7.974,10.421c0.776,2.421C73.408,129.263,69.145,127.934,65.211,125.276z" fill="#1A73E8"/>
                                    <path d="M121.25,79.961l-9.974,7.25l-5.013-7.605l17.987-12.974h6.895v61.197h-9.895L121.25,79.961z" fill="#1A73E8"/>
                                    <path d="M148.882,196.25l47.368-47.368l-23.684-10.526l-23.684,10.526l-10.526,23.684L148.882,196.25z" fill="#EA4335"/>
                                    <path d="M33.092,172.566l10.526,23.684h105.263v-47.368H43.618L33.092,172.566z" fill="#34A853"/>
                                    <path d="M12.039-3.75C3.316-3.75-3.75,3.316-3.75,12.039v136.842l23.684,10.526l23.684-10.526V43.618h105.263l10.526-23.684L148.882-3.75H12.039z" fill="#4285F4"/>
                                    <path d="M-3.75,148.882v31.579c0,8.724,7.066,15.789,15.789,15.789h31.579v-47.368H-3.75z" fill="#188038"/>
                                    <path d="M148.882,43.618v105.263h47.368V43.618l-23.684-10.526L148.882,43.618z" fill="#FBBC04"/>
                                    <path d="M196.25,43.618V12.039c0-8.724-7.066-15.789-15.789-15.789h-31.579v47.368H196.25z" fill="#1967D2"/>
                                  </g>
                                </svg>
                                {t('booking.addToGoogleCalendar') || 'Add to Google Calendar'}
                              </Button>
                              {/* Reschedule Button */}
                              {settings?.calendar?.reschedule?.allowCustomerReschedule && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReschedulingAppointment(apt);
                                    setRescheduleDate(null);
                                    setRescheduleTime(null);
                                    setRescheduleMonthOffset(0);
                                    setRescheduleAvailableSlots([]);
                                  }}
                                  disabled={cancellingAppointmentId === apt.id}
                                  className={`text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 whitespace-nowrap ${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <Edit className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}`} />
                                  {t('booking.reschedule')}
                                </Button>
                              )}
                              {/* Cancel Button - Desktop only */}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCancelAppointment(apt.id)}
                                disabled={cancellingAppointmentId === apt.id}
                                className="hidden sm:flex text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 whitespace-nowrap"
                              >
                                {cancellingAppointmentId === apt.id ? (
                                  <>
                                    <motion.span
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className={isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}
                                    >
                                      ⏳
                                    </motion.span>
                                    <span className="hidden sm:inline">{t('common.loading')}</span>
                                    <span className="sm:hidden">...</span>
                                  </>
                                ) : (
                                  <>
                                    {isRTL ? (
                                      <>
                                        {t('booking.cancel')}
                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                        {t('booking.cancel')}
                                      </>
                                    )}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                    </div>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}

        {/* Customer Appointments Button - Show when logged in but no appointments or appointments hidden */}
        {effectiveIsLoggedIn && customerAppointments.length === 0 && step === 1 && !selectedService && !confirmedAppointment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4">
              <div className="flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {t('booking.noAppointmentsFound')}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Booking Section - Only show if logged in */}
        {effectiveIsLoggedIn ? (
          <>
          {/* Step Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex justify-center items-center px-4 sm:px-6"
          >
          <div className="flex items-center justify-center w-full max-w-2xl">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <motion.div 
                  className="flex flex-col items-center justify-center flex-1"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: s * 0.1, duration: 0.3 }}
                >
                  <motion.div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-semibold text-base sm:text-lg flex-shrink-0 cursor-pointer transition-colors mx-auto ${
                      step >= s
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-muted text-muted-foreground'
                    } ${
                      // Determine if step is clickable
                      s === 1 || (s === 2 && selectedService) || (s === 3 && selectedService && selectedDate && selectedTime)
                        ? 'hover:bg-primary hover:text-primary-foreground'
                        : 'cursor-not-allowed opacity-50'
                    }`}
                    animate={step === s ? { 
                      scale: [1, 1.1, 1]
                    } : { scale: 1 }}
                    transition={{ duration: 0.5, repeat: step === s ? Infinity : 0, repeatDelay: 2 }}
                    whileHover={s === 1 || (s === 2 && selectedService) || (s === 3 && selectedService && selectedDate && selectedTime) ? { scale: 1.05 } : {}}
                    onClick={() => handleStepClick(s)}
                  >
                    {step > s ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                      </motion.div>
                    ) : (
                      <div className="flex items-center justify-center">
                        {s === 1 ? <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> : s === 2 ? <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </div>
                    )}
                  </motion.div>
                  <div className={`mt-2 sm:mt-2.5 text-[10px] sm:text-xs md:text-sm text-center w-full ${step >= s ? 'font-medium' : 'text-muted-foreground'}`}>
                    <span className="block whitespace-nowrap">{t(`booking.step${s}`)}</span>
                  </div>
                </motion.div>
                {s < 3 && (
                  <motion.div 
                    className={`flex-1 h-0.5 mx-2 sm:mx-4 flex-shrink-0 max-w-[60px] sm:max-w-[80px] ${step > s ? 'bg-primary' : 'bg-muted'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: step > s ? 1 : 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Step 1: Service Selection */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6" />
                  <h2 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('booking.step1')}</h2>
                </div>
                {services.length === 0 ? (
                  <p className="text-muted-foreground text-center">{t('booking.noServicesAvailable')}</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {services.map((service, index) => (
                      <motion.div
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group p-4 rounded-lg border-2 transition-all hover:border-primary/50 hover:shadow-md flex flex-col cursor-pointer ${
                          selectedService?.id === service.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border'
                        } ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-semibold">{service.name}</div>
                          {service.isGroupService && (
                            <Badge variant="secondary" className="text-xs">
                              {t('services.groupBadge')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{service.description}</div>
                        <div className={`flex items-center gap-4 text-sm mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {service.duration} {t('services.minutes') || 'min'}
                          </span>
                          <span className="font-medium">{t('services.price')}: ₪{service.price}</span>
                          {service.isGroupService && service.maxCapacity && (
                            <span className="text-xs text-muted-foreground">
                              {t('services.maxParticipants')?.replace('{count}', service.maxCapacity.toString()) || `Max ${service.maxCapacity} participants`}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleServiceSelect(service);
                          }}
                          className={`w-full mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
                          variant={selectedService?.id === service.id ? 'default' : 'outline'}
                        >
                          בחר
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Date & Time Selection */}
        <AnimatePresence mode="wait">
          {step === 2 && selectedService && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="space-y-6"
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6" />
                    <h2 className="text-lg font-semibold">{t('booking.step2')}</h2>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      onClick={handleBack} 
                      size="sm"
                      className={isRTL ? 'flex-row-reverse' : ''}
                    >
                      {isRTL ? (
                        <>
                          {t('booking.back')}
                          <ChevronRight className="w-4 h-4 mr-2" />
                        </>
                      ) : (
                        <>
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          {t('booking.back')}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              
              {/* Selected Service Info */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-6 p-4 bg-muted/30 rounded-lg border border-primary/20"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <div className="font-semibold">{selectedService.name}</div>
                  </div>
                  {selectedService.isGroupService && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {t('services.groupBadge')}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedService.duration} {t('services.minutes')} • ₪{selectedService.price}
                  {selectedService.isGroupService && selectedService.maxCapacity && (
                    <span className="ml-2">• {t('services.maxParticipants')?.replace('{count}', selectedService.maxCapacity.toString()) || `Max ${selectedService.maxCapacity} participants`}</span>
                  )}
                </div>
                {selectedService.isGroupService && (
                  <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {t('services.joinExistingGroup')}
                  </div>
                )}
              </motion.div>

              {/* Date Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium flex items-center gap-2">
                    <span>📆</span>
                    {t('booking.selectDate')}
                  </h3>
                </div>
                
                {/* Month Navigation */}
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* In RTL: Left button = Next month, Right button = Previous month */}
                  {/* In LTR: Left button = Previous month, Right button = Next month */}
                  <motion.button
                    onClick={isRTL ? handleNextMonth : handlePreviousMonth}
                    disabled={!isRTL && monthOffset === 0}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-lg border transition-all ${
                      !isRTL && monthOffset === 0
                        ? 'border-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                    aria-label={isRTL ? (t('booking.nextMonth') || 'חודש הבא') : (t('booking.previousMonth') || 'Previous Month')}
                  >
                    {/* In LTR: Left arrow for Previous | In RTL: Left arrow for Next (forward in RTL) */}
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>
                  
                  <motion.h4
                    key={monthOffset}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-semibold capitalize"
                  >
                    {getMonthYearDisplay()}
                  </motion.h4>
                  
                  <motion.button
                    onClick={isRTL ? handlePreviousMonth : handleNextMonth}
                    disabled={isRTL && monthOffset === 0}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-lg border transition-all ${
                      isRTL && monthOffset === 0
                        ? 'border-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                    aria-label={isRTL ? (t('booking.previousMonth') || 'חודש קודם') : (t('booking.nextMonth') || 'Next Month')}
                  >
                    {/* In LTR: Right arrow for Next | In RTL: Right arrow for Previous (backward in RTL) */}
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Day Names Header */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {getDayNames().map((dayName, index) => (
                    <div
                      key={index}
                      className="text-center text-xs font-semibold text-muted-foreground py-1"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {getCalendarDates().map((date, index) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
                    const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                    const dateOnly = new Date(date);
                    dateOnly.setHours(0, 0, 0, 0);
                    const todayOnly = new Date();
                    todayOnly.setHours(0, 0, 0, 0);
                    const isToday = dateOnly.getTime() === todayOnly.getTime();
                    const tomorrowOnly = new Date(todayOnly);
                    tomorrowOnly.setDate(tomorrowOnly.getDate() + 1);
                    const isTomorrow = dateOnly.getTime() === tomorrowOnly.getTime();
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isPast = dateOnly < todayOnly && !isToday;
                    const isWorking = isWorkingDay(date);
                    const isAvailable = isCurrentMonth && !isPast && isWorking;
                    
                    return (
                      <motion.button
                        key={`${date.getTime()}-${index}`}
                        onClick={() => isAvailable && handleDateSelect(date)}
                        disabled={!isCurrentMonth || !isAvailable}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.01, duration: 0.15 }}
                        whileHover={isAvailable && isCurrentMonth ? { scale: 1.05, y: -2 } : {}}
                        whileTap={isAvailable && isCurrentMonth ? { scale: 0.95 } : {}}
                        className={`booking-picker-button p-3 rounded-lg border-2 transition-all text-sm flex items-center justify-center ${
                          isSelected && isCurrentMonth
                            ? 'border-primary bg-primary text-primary-foreground shadow-md'
                            : !isCurrentMonth
                            ? 'border-transparent bg-transparent text-muted-foreground opacity-40 cursor-not-allowed'
                            : !isAvailable
                            ? 'border-muted bg-muted/20 text-muted-foreground opacity-50 cursor-not-allowed'
                            : 'border-border hover:border-primary/50 hover:shadow-md'
                        }`}
                      >
                        <div className={`text-sm ${isSelected && isCurrentMonth ? 'font-bold' : 'font-medium'}`}>
                          {date.getDate()}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
                
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <motion.div
                  ref={workerTimeSectionRef}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-md font-medium mb-3 flex items-center gap-2">
                    <span>⏰</span>
                    {t('booking.selectTime')}
                  </h3>
                  {availableWorkers.length > 1 && (
                    <motion.div 
                      className="mb-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Label className={`mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        👤 {t('calendar.selectWorker')}
                      </Label>
                      <div className="relative">
                        <select
                          value={selectedWorker || ''}
                          onChange={(e) => setSelectedWorker(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none bg-white ${
                            isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'
                          }`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        >
                          {availableWorkers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name}
                            </option>
                          ))}
                        </select>
                        <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                          isRTL ? 'left-3' : 'right-3'
                        }`}>
                          <ChevronDown 
                            className="w-4 h-4 text-muted-foreground" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {timeSlots.map((timeSlot, index) => {
                      const workerToCheck = selectedWorker || availableWorkers[0]?.id;
                      if (!workerToCheck) return null;
                      
                      const appointmentInfo = getAppointmentInfo(timeSlot, selectedDate, workerToCheck);
                      const isAvailable = isTimeSlotAvailable(timeSlot, selectedDate, selectedService.id);
                      const isSelected = selectedTime === timeSlot;
                      const isBooked = !!appointmentInfo && !selectedService?.isGroupService;
                      
                      // Check if there's an available group appointment at this time
                      const [hour, minute] = timeSlot.split(':').map(Number);
                      const slotDate = new Date(selectedDate);
                      slotDate.setHours(hour, minute, 0, 0);
                      const slotISO = slotDate.toISOString();
                      
                      const groupAppointment = selectedService?.isGroupService 
                        ? availableGroupAppointments.find(apt => {
                            const aptDate = new Date(apt.start);
                            return aptDate.toISOString() === slotISO && apt.workerId === workerToCheck && apt.availableSpots > 0;
                          })
                        : null;
                      
                      const canJoinGroup = !!groupAppointment;
                      const isGroupFull = !!(selectedService?.isGroupService && appointmentInfo &&
                        appointmentInfo.isGroupAppointment &&
                        (appointmentInfo.currentParticipants || 0) >= (appointmentInfo.maxCapacity || 1));
                      
                      return (
                        <motion.button
                          key={timeSlot}
                          onClick={() => handleTimeSelect(timeSlot)}
                          disabled={!isAvailable || (isBooked && !canJoinGroup) || isGroupFull}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02, duration: 0.2 }}
                          whileHover={isAvailable && (!isBooked || canJoinGroup) && !isGroupFull ? { scale: 1.05, y: -2 } : {}}
                          whileTap={isAvailable && (!isBooked || canJoinGroup) && !isGroupFull ? { scale: 0.95 } : {}}
                          className={`booking-picker-button p-3 rounded-lg border-2 text-sm transition-all relative ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground shadow-md'
                              : isGroupFull
                              ? 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50'
                              : canJoinGroup
                              ? 'border-green-500 bg-green-50 hover:border-green-600 cursor-pointer hover:shadow-md'
                              : isBooked
                              ? 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50'
                              : isAvailable
                              ? 'border-border hover:border-primary/50 cursor-pointer hover:shadow-md'
                              : 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50'
                          }`}
                          title={
                            canJoinGroup 
                              ? `Join existing group (${groupAppointment?.availableSpots} spots available)`
                              : isGroupFull
                              ? 'Group is full'
                              : appointmentInfo 
                              ? `${appointmentInfo.service} - ${appointmentInfo.customer}`
                              : undefined
                          }
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span>{timeSlot}</span>
                            {canJoinGroup && groupAppointment && (
                              <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {groupAppointment.availableSpots} left
                              </span>
                            )}
                            {isGroupFull && (
                              <span className="text-xs text-muted-foreground">Full</span>
                            )}
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1`}
                            >
                              <span className="text-xs">✓</span>
                            </motion.div>
                          )}
                          {appointmentInfo && !canJoinGroup && !selectedService?.isGroupService && (
                            <div className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1`}>
                              <X className="w-3 h-3 text-destructive" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  {timeSlots.filter(ts => isTimeSlotAvailable(ts, selectedDate, selectedService.id)).length === 0 && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-muted-foreground mt-4 text-center"
                    >
                      {isRTL ? (
                        <>
                          {t('booking.noAvailableSlots')} 😔
                        </>
                      ) : (
                        <>
                          😔 {t('booking.noAvailableSlots')}
                        </>
                      )}
                    </motion.p>
                  )}

                </motion.div>
              )}

              {/* Contact Message - Did not find your specific date */}
              {settings.calendar?.contactMessage?.enabled && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <div className={`text-sm text-gray-900 dark:text-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div 
                      className={`mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
                      data-edit-id="contact-message"
                      data-edit-type="text"
                      dangerouslySetInnerHTML={{
                        __html: settings.calendar?.contactMessage?.message || t('booking.didNotFindDate') || 'Did not find your specific date? Contact us and we will try our best to fit you in.'
                      }}
                    />
                    <div className={`flex flex-col gap-3 ${isRTL ? 'items-start' : 'items-start'}`}>
                      {settings.calendar?.contactMessage?.contacts
                        ?.filter((contact: { id: string; type: 'phone' | 'whatsapp' | 'email'; value: string; visible: boolean }) => contact.visible && contact.value.trim())
                        .map((contact: { id: string; type: 'phone' | 'whatsapp' | 'email'; value: string; visible: boolean }) => {
                          if (contact.type === 'phone') {
                            return (
                              <motion.a
                                key={contact.id}
                                href={`tel:${contact.value}`}
                                className={`flex items-center gap-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium underline transition-colors ${
                                  isRTL ? 'flex-row-reverse' : ''
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                dir="ltr"
                              >
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span>{contact.value}</span>
                              </motion.a>
                            );
                          }
                          if (contact.type === 'whatsapp') {
                            return (
                              <motion.a
                                key={contact.id}
                                href={getWhatsAppLink(contact.value)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 font-medium underline transition-colors ${
                                  isRTL ? 'flex-row-reverse' : ''
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                dir="ltr"
                              >
                                <img 
                                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
                                  alt="WhatsApp" 
                                  className="w-4 h-4 flex-shrink-0"
                                  style={{ width: '16px', height: '16px' }}
                                />
                                <span>{contact.value}</span>
                              </motion.a>
                            );
                          }
                          if (contact.type === 'email') {
                            return (
                              <motion.a
                                key={contact.id}
                                href={`mailto:${contact.value}`}
                                className={`flex items-center gap-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium underline transition-colors ${
                                  isRTL ? 'flex-row-reverse' : ''
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                dir="ltr"
                              >
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span>{contact.value}</span>
                              </motion.a>
                            );
                          }
                          return null;
                        })}
                    </div>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Customer Information */}
        <AnimatePresence mode="wait">
          {step === 3 && selectedService && selectedDate && selectedTime && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="space-y-6"
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-6 h-6" />
                    <h2 className="text-lg font-semibold">{t('booking.step3')}</h2>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      onClick={handleBack} 
                      size="sm"
                      className={isRTL ? 'flex-row-reverse' : ''}
                    >
                      {isRTL ? (
                        <>
                          {t('booking.back')}
                          <ChevronRight className="w-4 h-4 mr-2" />
                        </>
                      ) : (
                        <>
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          {t('booking.back')}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Booking Summary */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 p-4 bg-muted/30 rounded-lg border border-primary/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📋</span>
                    <span className="text-sm font-medium text-muted-foreground">{t('booking.bookingSummary') || 'Booking Summary'}</span>
                  </div>
                  <div className="space-y-2">
                    <motion.div 
                      className="flex justify-between"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <span className="text-muted-foreground">{t('booking.service')}:</span>
                      <span className="font-medium">{selectedService.name}</span>
                    </motion.div>
                    <motion.div 
                      className="flex justify-between"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="text-muted-foreground">{t('booking.selectDate')}:</span>
                      <span className="font-medium">{formatDate(selectedDate)}</span>
                    </motion.div>
                    <motion.div 
                      className="flex justify-between"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <span className="text-muted-foreground">{t('booking.selectTime')}:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </motion.div>
                    <motion.div 
                      className="flex justify-between"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <span className="text-muted-foreground">{t('services.price')}:</span>
                      <span className="font-medium">₪{selectedService.price}</span>
                    </motion.div>
                  </div>
                </motion.div>

              {/* Customer Information Form */}
              <div className="space-y-4">
                {effectiveIsLoggedIn && effectiveCurrentUser ? (
                  // Show user info as read-only when logged in
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span>👤</span>
                        <span className="text-sm font-medium">{t('booking.name')}</span>
                      </div>
                      <p className={`text-base ${isRTL ? 'text-right' : 'text-left'}`}>{customerInfo.name}</p>
                    </motion.div>
                    {customerInfo.email && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span>📧</span>
                          <span className="text-sm font-medium">{t('booking.email')}</span>
                        </div>
                        <p className={`text-base ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{customerInfo.email}</p>
                      </motion.div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span>📱</span>
                        <span className="text-sm font-medium">{t('booking.phone')}</span>
                      </div>
                      <p className={`text-base ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{customerInfo.phone}</p>
                    </motion.div>
                  </>
                ) : (
                  // Show input fields for guests
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Label htmlFor="name" className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span>👤</span>
                        {t('booking.name')} *
                      </Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        placeholder={t('booking.namePlaceholder')}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className="mt-2 transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Label htmlFor="email" className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span>📧</span>
                        {t('booking.email')}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        placeholder={t('booking.emailPlaceholder')}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className="mt-2 transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Label htmlFor="phone" className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span>📱</span>
                        {t('booking.phone')} *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => {
                          let value = e.target.value;
                          // If there's a + anywhere, move it to the beginning
                          if (value.includes('+')) {
                            value = '+' + value.replace(/\+/g, '');
                          }
                          setCustomerInfo({ ...customerInfo, phone: value });
                        }}
                        placeholder={t('booking.phonePlaceholder')}
                        dir="ltr"
                        className="mt-2 transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </motion.div>
                  </>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleBookAppointment}
                    disabled={isBooking || (effectiveIsLoggedIn ? false : (!customerInfo.name || !customerInfo.phone))}
                    className="w-full relative overflow-hidden booking-confirm-button"
                    size="lg"
                  >
                    {isBooking ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          ⏳
                        </motion.span>
                        {t('common.loading')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>✨</span>
                        {t('booking.confirmBooking')}
                      </span>
                    )}
                  </Button>
                </motion.div>
              </div>
            </Card>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Step 4: Success/Confirmation Screen */}
        <AnimatePresence mode="wait">
          {step === 4 && confirmedAppointment && selectedService && selectedDate && selectedTime && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Card className="p-8 text-center relative overflow-hidden">
                {/* Confetti effect */}
                {[...Array(20)].map((_, i) => {
                  const randomX = Math.random() * 200 - 100; // -100 to 100
                  const randomY = Math.random() * 200 + 50; // 50 to 250
                  const randomRotate = Math.random() * 720 - 360; // -360 to 360
                  return (
                    <motion.div
                      key={i}
                      className="absolute text-2xl pointer-events-none"
                      style={{
                        left: '50%',
                        top: '20%',
                      }}
                      initial={{ 
                        x: 0,
                        y: 0,
                        opacity: 1,
                        rotate: 0,
                        scale: 1
                      }}
                      animate={{
                        x: randomX,
                        y: randomY,
                        opacity: [1, 1, 0],
                        rotate: randomRotate,
                        scale: [1, 1.5, 0.5]
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.05,
                        ease: "easeOut"
                      }}
                    >
                      {['🎉', '✨', '🎊', '🌟', '💫'][i % 5]}
                    </motion.div>
                  );
                })}
                
                <motion.div 
                  className="flex flex-col items-center justify-center mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.3
                    }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
                  </motion.div>
                  <motion.h2 
                    className="text-3xl font-bold mb-2 flex items-center gap-2 justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span>🎉</span>
                    {t('booking.thankYou')}
                    <span>🎉</span>
                  </motion.h2>
                  <motion.p 
                    className="text-muted-foreground mb-6 text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {t('booking.appointmentConfirmed')} ✨
                  </motion.p>
                </motion.div>

                <motion.div 
                  className={`max-w-md mx-auto mb-8 ${isRTL ? 'text-right' : 'text-left'}`} 
                  dir={isRTL ? 'rtl' : 'ltr'}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>📝</span>
                    {t('booking.appointmentDetails')}
                  </h3>
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-primary/20">
                    <motion.div 
                      className="flex justify-between"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <span className="text-muted-foreground">{t('booking.serviceName')}:</span>
                      <span className="font-medium">{confirmedAppointment.service}</span>
                    </motion.div>
                    <motion.div 
                      className="flex justify-between"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <span className="text-muted-foreground">{t('booking.workerName')}:</span>
                      <span className="font-medium">{confirmedAppointment.worker}</span>
                    </motion.div>
                    <motion.div 
                      className="flex justify-between"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <span className="text-muted-foreground">{t('booking.appointmentDateTime')}:</span>
                      <span className="font-medium">{formatDateTimeDisplay(confirmedAppointment.date, confirmedAppointment.time)}</span>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={addToGoogleCalendar}
                      variant="outline"
                      className={`w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <CalendarIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t('booking.addToGoogleCalendar')}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={addToAppleCalendar}
                      variant="outline"
                      className={`w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <CalendarIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t('booking.addToAppleCalendar')}
                    </Button>
                  </motion.div>
                </motion.div>

                <motion.div
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => {
                        setStep(1);
                        setSelectedService(null);
                        setSelectedDate(null);
                        setSelectedTime(null);
                        // Preserve customer info if user is logged in, otherwise reset
                        if (isLoggedIn && currentUser) {
                          setCustomerInfo({
                            name: currentUser.name || '',
                            email: currentUser.email || '',
                            phone: currentUser.phone || '',
                          });
                        } else {
                          setCustomerInfo({ name: '', email: '', phone: '' });
                        }
                        setConfirmedAppointment(null);
                      }}
                      variant="default"
                      className="thank-you-button w-full sm:w-auto"
                    >
                      <span className="flex items-center gap-2">
                        <span>🔄</span>
                        {t('booking.bookAnotherAppointment')}
                      </span>
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => {
                        if (slug) {
                          window.location.href = `/b/${slug}`;
                        } else {
                          window.location.href = '/';
                        }
                      }}
                      variant="outline"
                      className="thank-you-button w-full sm:w-auto"
                    >
                      <span className="flex items-center gap-2">
                        <span>🏠</span>
                        {t('booking.goToMainPage')}
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
          </>
        ) : null}

        {/* Social Media Links - Footer (Always Visible) */}
        {settings.businessProfile?.socialLinks && (
          (settings.businessProfile.socialLinks.facebook ||
           settings.businessProfile.socialLinks.instagram ||
           settings.businessProfile.socialLinks.twitter ||
           settings.businessProfile.socialLinks.tiktok ||
           settings.businessProfile.socialLinks.linkedin ||
           settings.businessProfile.socialLinks.youtube) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-12 pb-8 border-t pt-8"
              data-edit-id="social-links"
              data-edit-type="links"
            >
              <p className="text-center mb-4 text-sm text-muted-foreground">
                {t('booking.followUsOnSocial')}
              </p>
              <div className={`flex items-center justify-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                {settings.businessProfile.socialLinks.facebook && (
                  <motion.a
                    href={settings.businessProfile.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:bg-[#1565C0] transition-colors shadow-lg"
                    aria-label="Facebook"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </motion.a>
                )}
                {settings.businessProfile.socialLinks.instagram && (
                  <motion.a
                    href={settings.businessProfile.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-lg"
                    aria-label="Instagram"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </motion.a>
                )}
                {settings.businessProfile.socialLinks.twitter && (
                  <motion.a
                    href={settings.businessProfile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white hover:bg-[#0d8bd9] transition-colors shadow-lg"
                    aria-label="Twitter"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </motion.a>
                )}
                {settings.businessProfile.socialLinks.tiktok && (
                  <motion.a
                    href={settings.businessProfile.socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white hover:bg-gray-800 transition-colors shadow-lg"
                    aria-label="TikTok"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                  </motion.a>
                )}
                {settings.businessProfile.socialLinks.linkedin && (
                  <motion.a
                    href={settings.businessProfile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-[#0077B5] flex items-center justify-center text-white hover:bg-[#005885] transition-colors shadow-lg"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-8.385H7.078v8.385H3.555V9h13.338v-3.47H3.555V2h13.338v3.47h3.554v11.982z"/>
                    </svg>
                  </motion.a>
                )}
                {settings.businessProfile.socialLinks.youtube && (
                  <motion.a
                    href={settings.businessProfile.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-[#FF0000] flex items-center justify-center text-white hover:bg-[#CC0000] transition-colors shadow-lg"
                    aria-label="YouTube"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </motion.a>
                )}
              </div>
            </motion.div>
          )
        )}

        {/* Cancel Appointment Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'}>
            <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
              <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('booking.cancelAppointment') || 'Cancel Appointment'}</AlertDialogTitle>
              <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                {t('booking.confirmCancel') || 'Are you sure you want to cancel this appointment? This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={`flex-col-reverse sm:flex-row ${isRTL ? 'sm:flex-row-reverse' : ''} justify-center sm:justify-end gap-2`}>
              <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelAppointment}
                className="cancel-appointment-button"
              >
                {t('booking.cancelAppointment') || 'Cancel Appointment'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'}>
            <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
              <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                {t('auth.logout') || 'Logout'}
              </AlertDialogTitle>
              <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                {t('auth.confirmLogout') || t('confirmLogout') || 'Are you sure you want to logout?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={`flex-col-reverse sm:flex-row ${isRTL ? 'sm:flex-row-reverse' : ''} justify-center sm:justify-end gap-2`}>
              <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>
                {t('common.cancel') || 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setIsLoggedIn(false);
                  setCurrentUser(null);
                  setCustomerInfo({ name: '', email: '', phone: '' });
                  localStorage.removeItem('userSession');
                  setShowLogoutDialog(false);
                  toast.success(t('auth.logoutSuccess'));
                }}
                className="logout-button"
              >
                {t('auth.logout') || 'Logout'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reschedule Appointment Dialog */}
        {reschedulingAppointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setReschedulingAppointment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t('booking.rescheduleAppointment')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReschedulingAppointment(null);
                    setRescheduleDate(null);
                    setRescheduleTime(null);
                    setRescheduleAvailableSlots([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{t('booking.selectDate')}</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRescheduleMonthOffset(prev => Math.max(0, prev - 1))}
                        disabled={rescheduleMonthOffset === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRescheduleMonthOffset(prev => prev + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {getDayNames().map((dayName, index) => (
                        <div
                          key={index}
                          className="text-center text-xs font-semibold text-muted-foreground py-1"
                        >
                          {dayName}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const today = new Date();
                        const viewDate = new Date(today.getFullYear(), today.getMonth() + rescheduleMonthOffset, 1);
                        const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                        const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
                        const firstDayWeekday = firstDayOfMonth.getDay();
                        const startOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
                        const dates: Date[] = [];
                        for (let i = startOffset - 1; i >= 0; i--) {
                          const date = new Date(firstDayOfMonth);
                          date.setDate(date.getDate() - i - 1);
                          dates.push(date);
                        }
                        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
                          dates.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
                        }
                        return dates;
                      })().map((date, index) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const viewDate = new Date(today.getFullYear(), today.getMonth() + rescheduleMonthOffset, 1);
                        const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                        const dateOnly = new Date(date);
                        dateOnly.setHours(0, 0, 0, 0);
                        const todayOnly = new Date();
                        todayOnly.setHours(0, 0, 0, 0);
                        const isToday = dateOnly.getTime() === todayOnly.getTime();
                        const isPast = dateOnly < todayOnly && !isToday;
                        const isWorking = isWorkingDay(date);
                        const isAvailable = isCurrentMonth && !isPast && isWorking;
                        const isSelected = rescheduleDate?.toDateString() === date.toDateString();
                        
                        return (
                          <button
                            key={`${date.getTime()}-${index}`}
                            onClick={() => isAvailable && setRescheduleDate(date)}
                            disabled={!isCurrentMonth || !isAvailable}
                            className={`p-2 rounded-lg border-2 text-sm ${
                              isSelected && isCurrentMonth
                                ? 'border-primary bg-primary text-primary-foreground'
                                : !isCurrentMonth
                                ? 'border-transparent opacity-40'
                                : !isAvailable
                                ? 'border-muted opacity-50 cursor-not-allowed'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {rescheduleDate && (
                  <div>
                    <Label>{t('booking.selectTime')}</Label>
                    {loadingRescheduleSlots ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {timeSlots.map((timeSlot) => {
                          const isAvailable = rescheduleAvailableSlots.includes(timeSlot);
                          const isSelected = rescheduleTime === timeSlot;
                        
                        return (
                          <button
                            key={timeSlot}
                            onClick={() => isAvailable && setRescheduleTime(timeSlot)}
                            disabled={!isAvailable}
                            className={`p-2 rounded-lg border-2 text-sm ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : isAvailable
                                ? 'border-border hover:border-primary/50'
                                : 'border-muted opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {timeSlot}
                          </button>
                        );
                      })}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReschedulingAppointment(null);
                      setRescheduleDate(null);
                      setRescheduleTime(null);
                      setRescheduleAvailableSlots([]);
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      if (rescheduleDate && rescheduleTime && reschedulingAppointment) {
                        handleRescheduleAppointment(reschedulingAppointment.id, rescheduleDate, rescheduleTime);
                      }
                    }}
                    disabled={!rescheduleDate || !rescheduleTime}
                  >
                    {t('booking.reschedule')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Login/Register Dialog */}
        <LoginRegisterDialog
          open={showLoginDialog}
          onClose={() => setShowLoginDialog(false)}
          onSuccess={(userData) => {
            setIsLoggedIn(true);
            setCurrentUser(userData);
            setCustomerInfo({
              name: userData.name || '',
              email: userData.email || '',
              phone: userData.phone || '',
            });
            
            // Save session to localStorage with 14-day expiration
            const expirationTime = new Date().getTime() + (14 * 24 * 60 * 60 * 1000); // 14 days in milliseconds
            const session = {
              user: userData,
              expirationTime: expirationTime
            };
            localStorage.setItem('userSession', JSON.stringify(session));
            
            setShowLoginDialog(false);
            // Don't show toast here - LoginRegisterDialog already handles the appropriate message
          }}
          registrationSettings={settings.registration}
        />
      </>
    );
  };

  // Extract dialogs
  const rescheduleDialog = reschedulingAppointment ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => setReschedulingAppointment(null)}
    >
      {/* Reschedule dialog content - we'll extract this from the old structure */}
      {/* For now, this is a placeholder - we need to extract the full reschedule dialog */}
    </motion.div>
  ) : null;

  const loginDialog = (
    <LoginRegisterDialog
      open={showLoginDialog}
      onClose={() => setShowLoginDialog(false)}
      onSuccess={(userData) => {
        setIsLoggedIn(true);
        setCurrentUser(userData);
        setCustomerInfo({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
        });
        
        // Save session to localStorage with 14-day expiration
        const expirationTime = new Date().getTime() + (14 * 24 * 60 * 60 * 1000);
        const session = {
          user: userData,
          expirationTime: expirationTime
        };
        localStorage.setItem('userSession', JSON.stringify(session));
        
        setShowLoginDialog(false);
      }}
      registrationSettings={settings.registration}
    />
  );

  // Render main content once (appointments + booking section, without guestMessage)
  const mainContent = renderMainContent();

  // Get loginFirst value - use editorSettings in edit mode, otherwise use settings
  const loginFirstValue = editMode 
    ? (editorSettings?.branding?.loginFirst ?? settings?.branding?.loginFirst ?? false)
    : (settings?.branding?.loginFirst ?? false);

  // Render based on layout type
  if (layoutType === 'classic') {
    return (
      <ClassicLayout
        header={header}
        trialBanner={trialBanner}
        bannerCover={bannerCover}
        businessInfo={businessInfo}
        guestMessage={guestMessage}
        mainContent={mainContent}
        rescheduleDialog={rescheduleDialog}
        loginDialog={loginDialog}
        loginFirst={loginFirstValue}
        dir={dir}
      />
    );
  } else if (layoutType === 'hero') {
    return (
      <HeroLayout
        header={header}
        trialBanner={trialBanner}
        bannerCover={bannerCover}
        businessInfo={businessInfo}
        guestMessage={guestMessage}
        mainContent={mainContent}
        rescheduleDialog={rescheduleDialog}
        loginDialog={loginDialog}
        businessName={businessName}
        businessDescription={businessDescription}
        logoUrl={logoUrl}
        logoShape={logoShape}
        loginFirst={loginFirstValue}
        dir={dir}
      />
    );
  } else if (layoutType === 'compact') {
    return (
      <CompactDashboardLayout
        header={null}
        trialBanner={trialBanner}
        bannerCover={bannerCover}
        businessInfo={businessInfo}
        guestMessage={guestMessage}
        mainContent={mainContent}
        rescheduleDialog={rescheduleDialog}
        loginDialog={loginDialog}
        footer={undefined}
        businessName={businessName}
        businessDescription={businessDescription}
        logoUrl={logoUrl}
        logoShape={logoShape}
        loginFirst={loginFirstValue}
        dir={dir}
      />
    );
  }

  // Default to classic
  return (
    <ClassicLayout
      header={header}
      trialBanner={trialBanner}
      bannerCover={bannerCover}
      businessInfo={businessInfo}
      guestMessage={guestMessage}
      mainContent={mainContent}
      rescheduleDialog={rescheduleDialog}
      loginDialog={loginDialog}
    />
  );
}

function BookingPageFallback() {
  const { dir } = useDirection();
  const { t } = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Helper to convert HSL to hex (for reading from CSS variables)
  const hslToHex = (hsl: string): string | null => {
    const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!match) return null;
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
  };
  
  // Initialize theme color from CSS variables if available (ThemeProvider may have set them)
  const getInitialThemeColor = (): string => {
    if (typeof window === 'undefined') return '#0EA5E9';
    
    // Check if CSS variable is already set by ThemeProvider
    const root = document.documentElement;
    const bookingPrimary = getComputedStyle(root).getPropertyValue('--booking-primary').trim();
    if (bookingPrimary) {
      const hex = hslToHex(bookingPrimary);
      if (hex) return hex;
    }
    
    return '#0EA5E9';
  };
  
  const [themeColor, setThemeColor] = useState<string>(() => getInitialThemeColor());
  
  // Get slug from route params or query params
  const slug = (params?.slug as string) || searchParams.get('slug') || searchParams.get('ui') || null;
  
  // Fetch settings to get theme color immediately
  useEffect(() => {
    if (slug) {
      const fetchSettings = async () => {
        try {
          const response = await fetch(`/api/settings?businessSlug=${slug}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings?.branding?.themeColor) {
              setThemeColor(data.settings.branding.themeColor);
            }
          }
        } catch (error) {
          console.error('Error fetching settings for fallback:', error);
        }
      };
      fetchSettings();
    }
  }, [slug]);
  
  // Also listen for CSS variable changes (in case ThemeProvider updates them)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkCSSVariables = () => {
      const root = document.documentElement;
      const bookingPrimary = getComputedStyle(root).getPropertyValue('--booking-primary').trim();
      if (bookingPrimary) {
        const hex = hslToHex(bookingPrimary);
        if (hex && hex !== themeColor) {
          setThemeColor(hex);
        }
      }
    };
    
    // Check immediately
    checkCSSVariables();
    
    // Set up a MutationObserver to watch for CSS variable changes
    const observer = new MutationObserver(checkCSSVariables);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    return () => observer.disconnect();
  }, [themeColor]);
  
  const rgb = hexToRgb(themeColor);
  
  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center animate-fade-in" data-booking-page="true">
      <div className="text-center space-y-6 px-4">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <KalBookLogo size="lg" variant="full" />
        </div>
        {/* Modern animated spinner with smooth gradient */}
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` }}></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: themeColor, borderRightColor: themeColor, animationDuration: '0.8s' }}></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent animate-spin" style={{ borderBottomColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`, borderLeftColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`, animationDuration: '1.2s', animationDirection: 'reverse' }}></div>
        </div>
        {/* Friendly loading message with pulse animation */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground animate-pulse" style={{ animationDuration: '2s' }}>
            {t('common.justAMoment')}
          </p>
          {/* Subtle dots animation */}
          <div className="flex justify-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`, animationDelay: '0s', animationDuration: '1.4s' }}></div>
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`, animationDelay: '0.2s', animationDuration: '1.4s' }}></div>
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`, animationDelay: '0.4s', animationDuration: '1.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<BookingPageFallback />}>
      <BookingPageContent />
    </Suspense>
  );
}
