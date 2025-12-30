"use client";
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/admin/PageHeader';
import { useLocale } from '@/hooks/useLocale';
import { getSettings, updateSettings, uploadFile, deleteFile } from '@/lib/api/services';
import { useDirection } from '@/components/providers/DirectionProvider';
import { getLocaleDisplayName } from '@/lib/i18n';
import { bannerPatterns } from '@/lib/mockData';
import { getDefaultGuestMessage, getDefaultLoggedInMessage } from '@/lib/utils/greetings';

/**
 * Convert hex color to HSL format (without hsl() wrapper, just the values)
 * Returns format: "h s% l%" for use in CSS variables
 */
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number, s: number, l: number;

  l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
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
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Save, Globe, Upload, X, Calendar, Clock, Plus, Image, MessageSquare, Trash2, Check, Video, Building2, Palette, Bell, Link2, CheckCircle2, Loader2, Mail, Send, RefreshCw, Edit, AlertCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { getTemplates, updateTemplate } from '@/lib/mockData';
import type { Template } from '@/types/admin';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { BusinessProfile } from '@/types/admin';
import { HomepageEditor } from './HomepageEditor';
import type { Settings } from '@/types/admin';
import { validateEmail, validatePhone, validateUrl, validateTime, validateWorkingHours, validateHexColor } from '@/lib/validation/settings';

// Banner Image Preview Component with Video Support
function BannerImagePreview({ 
  uploadUrl, 
  videoUrl,
  onRemove,
  onVideoChange
}: { 
  uploadUrl: string; 
  videoUrl?: string;
  onRemove: () => void;
  onVideoChange: (videoUrl: string) => void;
}) {
  const { t } = useLocale();
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div 
      className="relative w-full h-64 overflow-hidden rounded-lg border-2 border-dashed bg-muted"
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <img
          src={uploadUrl}
          alt="Banner"
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}
      <div className="absolute top-2 right-2 flex gap-2 z-10" onMouseDown={(e) => e.stopPropagation()}>
        {videoUrl ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => {
              videoInputRef.current?.click();
            }}
            title={t('settings.changeVideo')}
          >
            <Upload className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => {
              videoInputRef.current?.click();
            }}
            title={t('settings.addVideo')}
          >
            <Video className="w-4 h-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onRemove}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {videoUrl && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute bottom-2 left-2 z-10"
          onClick={() => onVideoChange('')}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="w-4 h-4 mr-1" />
          {t('settings.removeVideo')}
        </Button>
      )}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Check file size (max 50MB for videos)
            if (file.size > 50 * 1024 * 1024) {
              toast.error(t('settings.videoTooLarge') || 'Video size must be less than 50MB');
              return;
            }
            
            try {
              // Upload to Supabase Storage
              const result = await uploadFile(file, 'banner-video');
              
              if (result.error || !result.url) {
                throw new Error(result.error || 'Failed to upload video');
              }
              
              onVideoChange(result.url);
            } catch (error: any) {
              console.error('Video upload error:', error);
              toast.error(error?.message || t('settings.videoReadError') || 'Failed to upload video');
            }
          }
        }}
        className="hidden"
      />
    </div>
  );
}

type Locale = 'en' | 'he' | 'ar' | 'ru';
const languages: Locale[] = ['en', 'he', 'ar', 'ru'];

const Settings = () => {
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Extract business slug from pathname
  const slugMatch = pathname?.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploading, setUploading] = useState<{ logo?: boolean; banner?: boolean; video?: boolean }>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState<string>('');
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [showHomepageEditor, setShowHomepageEditor] = useState(false);
  
  // Function to refresh the preview iframe
  const refreshPreview = () => {
    const newKey = Date.now().toString();
    setPreviewRefreshKey(newKey);
    // Update iframe src to force reload with cache busting
    if (previewIframeRef.current && businessSlug) {
      previewIframeRef.current.src = `/b/${businessSlug}?preview=${newKey}`;
    }
  };
  const [canCustomBranding, setCanCustomBranding] = useState(true); // Default to true to avoid blocking
  const [canUseWhatsApp, setCanUseWhatsApp] = useState(true); // Default to true to avoid blocking
  const [canUseMultiLanguage, setCanUseMultiLanguage] = useState(true); // Default to true to avoid blocking
  const [canManageTemplates, setCanManageTemplates] = useState(true); // Default to true to avoid blocking
  const [emailTemplates] = useState(() => getTemplates('email'));
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    emailTemplates[0] || null
  );
  const [templateSubject, setTemplateSubject] = useState(selectedTemplate?.subject || '');
  const [templateBody, setTemplateBody] = useState(selectedTemplate?.body || '');
  
  // UX Improvements: Unsaved changes tracking
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showRemoveLogoDialog, setShowRemoveLogoDialog] = useState(false);
  const [showRemoveBannerDialog, setShowRemoveBannerDialog] = useState(false);
  const [showRemoveVideoDialog, setShowRemoveVideoDialog] = useState(false);

  // Update template subject/body when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      setTemplateSubject(selectedTemplate.subject || '');
      setTemplateBody(selectedTemplate.body);
    }
  }, [selectedTemplate]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleSaveTemplate = () => {
    if (!canManageTemplates) {
      toast.error('Your plan doesn\'t allow managing templates. Please upgrade to continue.');
      return;
    }

    // Double-check with API before proceeding
    fetch('/api/admin/feature-check?feature=manage_templates')
      .then(res => res.json())
      .then(data => {
        if (!data.canPerform) {
          toast.error('Your plan doesn\'t allow managing templates. Please upgrade to continue.');
          return;
        }

        if (selectedTemplate) {
          updateTemplate(selectedTemplate.id, { subject: templateSubject, body: templateBody });
          toast.success('Template saved successfully');
        }
      })
      .catch(error => {
        console.error('Error checking feature:', error);
        // Continue if check fails (don't block user due to API error)
        if (selectedTemplate) {
          updateTemplate(selectedTemplate.id, { subject: templateSubject, body: templateBody });
          toast.success('Template saved successfully');
        }
      });
  };

  const insertVariable = (variable: string) => {
    setTemplateBody((prev) => prev + variable);
  };

  const getTemplatePreview = () => {
    return templateBody
      .replace(/\{\{customer\.name\}\}/g, 'John Doe')
      .replace(/\{\{service\.name\}\}/g, 'Haircut')
      .replace(/\{\{service\.duration\}\}/g, '30')
      .replace(/\{\{booking\.start\}\}/g, 'Oct 30, 2025 at 09:00')
      .replace(/\{\{booking\.end\}\}/g, 'Oct 30, 2025 at 09:30')
      .replace(/\{\{booking\.link\}\}/g, 'https://bookinghub.app/booking/123')
      .replace(/\{\{staff\.name\}\}/g, 'David');
  };

  const templateVariables = [
    '{{customer.name}}',
    '{{customer.phone}}',
    '{{service.name}}',
    '{{service.duration}}',
    '{{booking.start}}',
    '{{booking.end}}',
    '{{booking.link}}',
    '{{staff.name}}',
  ];
  const [settings, setSettings] = useState(() => {
    // Use default value on server to avoid hydration mismatch
    if (typeof window === 'undefined') {
      return {
        businessProfile: { 
          name: '', 
          email: '', 
          phone: '', 
          whatsapp: '', 
          address: '', 
          timezone: 'Asia/Jerusalem', 
          currency: 'ILS' as const,
          socialLinks: {
            facebook: '',
            instagram: '',
            twitter: '',
            tiktok: '',
            linkedin: '',
            youtube: '',
          }
        },
        branding: { 
          logoUrl: '', 
          themeColor: '#0EA5E9',
          bannerCover: {
            type: 'pattern',
            patternId: 'pattern1',
          },
          guestMessage: 'שלום אורח, ברוך הבא!',
          loggedInMessage: 'שלום {name}, ברוך הבא!',
        },
        locale: { language: 'en' as const, rtl: false },
        notifications: { 
          senderName: '', 
          senderEmail: '',
          reminderMessage: 'A reminder that you have an appointment for {{service}} on {{date}}, see you soon!',
          reminders: {
            enabled: true,
            smsEnabled: true,
            whatsappEnabled: false,
            daysBefore: [1],
            defaultTime: '09:00',
            personalAddition: '',
          }
        },
        calendar: {
          weekStartDay: 0,
          workingDays: [0, 1, 2, 3, 4],
          workingHours: { start: '09:00', end: '18:00' },
        },
        registration: {
          customFields: [],
          defaultGender: '',
        },
      };
    }
    return null as any; // Will be loaded from API
  });

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

  // Convert E.164 format (+972540000000) to display format (050-000-0000)
  const formatPhoneForDisplay = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // If it starts with country code (972 for Israel), remove it and add leading 0
    if (digits.startsWith('972') && digits.length > 10) {
      digits = '0' + digits.substring(3);
    }
    
    // Limit to 10 digits and format
    const limited = digits.slice(-10); // Take last 10 digits
    
    // Format as XXX-XXX-XXXX
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  // Note: Theme color is only applied to booking pages via ThemeProvider
  // Admin panel keeps the default homepage primary color

  // Load settings from API after mount
  useEffect(() => {
    setMounted(true);
    const loadSettings = async () => {
      try {
        setLoading(true);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/18f62b71-ea80-4ff9-bcdc-f2ac503282e5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'components/pages/admin/Settings.tsx:398',message:'loadSettings:start',data:{businessSlug},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const loadedSettings = await getSettings();
        
        // Ensure businessProfile has defaults if missing
        if (!loadedSettings.businessProfile) {
          loadedSettings.businessProfile = {
            name: '',
            email: '',
            phone: '',
            whatsapp: '',
            address: '',
            timezone: 'Asia/Jerusalem',
            currency: 'ILS',
            socialLinks: {
              facebook: '',
              instagram: '',
              twitter: '',
              tiktok: '',
              linkedin: '',
              youtube: '',
            },
          };
        } else {
          // Always set timezone and currency to Israel/ILS
          loadedSettings.businessProfile.timezone = 'Asia/Jerusalem';
          loadedSettings.businessProfile.currency = 'ILS';
          
          // Format phone numbers to XXX-XXX-XXXX format (10 digits with dashes)
          // Use formatPhoneForDisplay to handle E.164 format from database
          if (loadedSettings.businessProfile.phone) {
            loadedSettings.businessProfile.phone = formatPhoneForDisplay(loadedSettings.businessProfile.phone);
          }
          if (loadedSettings.businessProfile.whatsapp) {
            loadedSettings.businessProfile.whatsapp = formatPhoneForDisplay(loadedSettings.businessProfile.whatsapp);
          }
          
          // Ensure socialLinks exists
          if (!loadedSettings.businessProfile.socialLinks) {
            loadedSettings.businessProfile.socialLinks = {
              facebook: '',
              instagram: '',
              twitter: '',
              tiktok: '',
              linkedin: '',
              youtube: '',
            };
          }
        }
        
        // Ensure calendar settings have defaults if missing
        if (!loadedSettings.calendar) {
          loadedSettings.calendar = {
            weekStartDay: 0,
            workingDays: [0, 1, 2, 3, 4],
            workingHours: { start: '09:00', end: '18:00' },
          };
        } else {
          // Ensure workingDays defaults to Sunday-Thursday if empty
          if (!loadedSettings.calendar.workingDays || loadedSettings.calendar.workingDays.length === 0) {
            loadedSettings.calendar.workingDays = [0, 1, 2, 3, 4];
          }
        }
        
        // Ensure branding has defaults if missing
        const businessLocale = (loadedSettings.locale?.language || 'en') as 'en' | 'he' | 'ar' | 'ru';
        if (!loadedSettings.branding) {
          loadedSettings.branding = {
            logoUrl: '',
            themeColor: '#0EA5E9',
            bannerCover: {
              type: 'pattern',
              patternId: 'pattern1',
            },
            guestMessage: getDefaultGuestMessage(businessLocale),
            loggedInMessage: getDefaultLoggedInMessage(businessLocale),
          };
        } else {
          // Set default greeting messages if empty
          if (!loadedSettings.branding.guestMessage || loadedSettings.branding.guestMessage.trim() === '') {
            loadedSettings.branding.guestMessage = getDefaultGuestMessage(businessLocale);
          }
          if (!loadedSettings.branding.loggedInMessage || loadedSettings.branding.loggedInMessage.trim() === '') {
            loadedSettings.branding.loggedInMessage = getDefaultLoggedInMessage(businessLocale);
          }
        }
        
        // Ensure locale has defaults if missing
        if (!loadedSettings.locale) {
          loadedSettings.locale = { language: 'en', rtl: false };
        }
        
        // Ensure notifications has defaults if missing
        if (!loadedSettings.notifications) {
          loadedSettings.notifications = {
            senderName: '',
            senderEmail: '',
            reminderMessage: 'A reminder that you have an appointment for {{service}} on {{date}}, see you soon!',
            reminders: {
              enabled: true,
              smsEnabled: true,
              whatsappEnabled: false,
              daysBefore: [1],
              defaultTime: '09:00',
              personalAddition: '',
            },
          };
        } else if (!loadedSettings.notifications.reminders) {
          // Ensure reminders object exists
          loadedSettings.notifications.reminders = {
            enabled: true,
            smsEnabled: true,
            whatsappEnabled: false,
            daysBefore: [1],
            defaultTime: '09:00',
            personalAddition: '',
          };
        }
        
        // Ensure registration has defaults if missing
        if (!loadedSettings.registration) {
          loadedSettings.registration = {
            customFields: [],
            defaultGender: '',
          };
        }
        
        setSettings(loadedSettings);
        // Store original settings for change tracking
        setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings)));
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/18f62b71-ea80-4ff9-bcdc-f2ac503282e5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'components/pages/admin/Settings.tsx:525',message:'loadSettings:success',data:{hasBusinessProfile:!!loadedSettings.businessProfile,hasBranding:!!loadedSettings.branding,hasCalendar:!!loadedSettings.calendar,hasNotifications:!!loadedSettings.notifications,hasLocale:!!loadedSettings.locale,workingDays:loadedSettings.calendar?.workingDays?.length ?? 0},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      } catch (error: any) {
        console.error('Failed to load settings:', error);
        toast.error('Failed to load settings');
        // Set default settings on error to prevent crashes
        setSettings({
          businessProfile: {
            name: '',
            email: '',
            phone: '',
            whatsapp: '',
            address: '',
            timezone: 'Asia/Jerusalem',
            currency: 'ILS',
            socialLinks: {
              facebook: '',
              instagram: '',
              twitter: '',
              tiktok: '',
              linkedin: '',
              youtube: '',
            },
          },
          branding: {
            logoUrl: '',
            themeColor: '#0EA5E9',
            bannerCover: {
              type: 'pattern',
              patternId: 'pattern1',
            },
            guestMessage: 'שלום אורח, ברוך הבא!',
            loggedInMessage: 'שלום {name}, ברוך הבא!',
          },
          locale: { language: 'en', rtl: false },
          notifications: {
            senderName: '',
            senderEmail: '',
            reminderMessage: 'A reminder that you have an appointment for {{service}} on {{date}}, see you soon!',
          },
          calendar: {
            weekStartDay: 0,
            workingDays: [0, 1, 2, 3, 4],
            workingHours: { start: '09:00', end: '18:00' },
          },
          registration: {
            customFields: [],
            defaultGender: '',
          },
        });
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/18f62b71-ea80-4ff9-bcdc-f2ac503282e5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'components/pages/admin/Settings.tsx:529',message:'loadSettings:error',data:{error: error?.message || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      } finally {
        setLoading(false);
      }
    };
    loadSettings();

    // Check feature access for settings sections
    Promise.all([
      fetch('/api/admin/feature-check?feature=custom_branding').then(res => res.json()),
      fetch('/api/admin/feature-check?feature=whatsapp_integration').then(res => res.json()),
      fetch('/api/admin/feature-check?feature=multi_language').then(res => res.json()),
      fetch('/api/admin/feature-check?feature=manage_templates').then(res => res.json()),
    ]).then(([brandingData, whatsappData, languageData, templatesData]) => {
      if (brandingData.success) {
        setCanCustomBranding(brandingData.canPerform);
      }
      if (whatsappData.success) {
        setCanUseWhatsApp(whatsappData.canPerform);
      }
      if (languageData.success) {
        setCanUseMultiLanguage(languageData.canPerform);
      }
      if (templatesData.success) {
        setCanManageTemplates(templatesData.canPerform);
      }
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/18f62b71-ea80-4ff9-bcdc-f2ac503282e5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'components/pages/admin/Settings.tsx:597',message:'featureCheck:results',data:{branding:brandingData?.canPerform,whatsapp:whatsappData?.canPerform,language:languageData?.canPerform,templates:templatesData?.canPerform},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }).catch(error => {
      console.error('Error checking features:', error);
      // Default to true if check fails to avoid blocking unnecessarily
    });
  }, []);

  // UX Improvement: Detect unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!originalSettings || !settings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  // UX Improvement: Detect changes per tab
  const getTabChanges = (tab: string): number => {
    if (!originalSettings || !settings) return 0;
    let changes = 0;
    
    switch (tab) {
      case 'business':
        if (JSON.stringify(settings.businessProfile) !== JSON.stringify(originalSettings.businessProfile)) {
          changes++;
        }
        break;
      case 'calendar':
        if (JSON.stringify(settings.calendar) !== JSON.stringify(originalSettings.calendar)) {
          changes++;
        }
        break;
      case 'notifications':
        if (JSON.stringify(settings.notifications) !== JSON.stringify(originalSettings.notifications)) {
          changes++;
        }
        break;
      case 'templates':
        // Templates are managed separately, no change tracking needed
        break;
      case 'integrations':
        // Integrations are managed separately, no change tracking needed
        break;
    }
    
    return changes;
  };

  // UX Improvement: Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [settings, originalSettings]);

  // UX Improvement: Keyboard shortcut (Ctrl/Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges() && !saving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings, originalSettings, saving]);

  // UX Improvement: Validate field on change
  const validateField = (field: string, value: string) => {
    let error: string | undefined;
    
    switch (field) {
      case 'email':
        const emailResult = validateEmail(value);
        if (!emailResult.isValid) error = emailResult.error;
        break;
      case 'phone':
      case 'whatsapp':
        const phoneResult = validatePhone(value);
        if (!phoneResult.isValid) error = phoneResult.error;
        break;
      case 'senderEmail':
        const senderEmailResult = validateEmail(value);
        if (!senderEmailResult.isValid) error = senderEmailResult.error;
        break;
      case 'workingHoursStart':
      case 'workingHoursEnd':
      case 'defaultTime':
        const timeResult = validateTime(value);
        if (!timeResult.isValid) error = timeResult.error;
        break;
      case 'themeColor':
        const colorResult = validateHexColor(value);
        if (!colorResult.isValid) error = colorResult.error;
        break;
    }
    
    if (error) {
      setFieldErrors(prev => ({ ...prev, [field]: error! }));
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    // UX Improvement: Validate critical fields before saving
    const criticalErrors: string[] = [];
    
    // Validate email if provided
    if (settings.businessProfile.email) {
      const emailResult = validateEmail(settings.businessProfile.email);
      if (!emailResult.isValid) {
        criticalErrors.push('Business email');
        setFieldErrors(prev => ({ ...prev, email: emailResult.error! }));
      }
    }
    
    // Validate sender email if provided
    if (settings.notifications.senderEmail) {
      const senderEmailResult = validateEmail(settings.notifications.senderEmail);
      if (!senderEmailResult.isValid) {
        criticalErrors.push('Sender email');
        setFieldErrors(prev => ({ ...prev, senderEmail: senderEmailResult.error! }));
      }
    }
    
    // Validate working hours
    if (settings.calendar.workingHours) {
      const hoursResult = validateWorkingHours(
        settings.calendar.workingHours.start,
        settings.calendar.workingHours.end
      );
      if (!hoursResult.isValid) {
        criticalErrors.push('Working hours');
        setFieldErrors(prev => ({ ...prev, workingHours: hoursResult.error! }));
      }
    }
    
    if (criticalErrors.length > 0) {
      toast.error(`Please fix errors in: ${criticalErrors.join(', ')}`);
      return;
    }

    try {
      setSaving(true);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/18f62b71-ea80-4ff9-bcdc-f2ac503282e5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'components/pages/admin/Settings.tsx:607',message:'handleSave:start',data:{hasLogo:!!settings.branding?.logoUrl,bannerType:settings.branding?.bannerCover?.type,workingDays:settings.calendar?.workingDays?.length ?? 0,remindersEnabled:settings.notifications?.reminders?.enabled ?? null,language:settings.locale?.language},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Ensure timezone and currency are always set to Israel/ILS
      const settingsToSave = {
        ...settings,
        businessProfile: {
          ...settings.businessProfile,
          timezone: 'Asia/Jerusalem',
          currency: 'ILS',
        },
      };
      await updateSettings(settingsToSave);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/18f62b71-ea80-4ff9-bcdc-f2ac503282e5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'components/pages/admin/Settings.tsx:618',message:'handleSave:success',data:{hasLogo:!!settingsToSave.branding?.logoUrl,bannerType:settingsToSave.branding?.bannerCover?.type,workingDays:settingsToSave.calendar?.workingDays?.length ?? 0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setLastSaved(new Date());
      // UX Improvement: Update original settings after successful save
      setOriginalSettings(JSON.parse(JSON.stringify(settingsToSave)));
      // Clear field errors on successful save
      setFieldErrors({});
      // Refresh preview to show changes (with a small delay to ensure settings are saved)
      setTimeout(() => {
        refreshPreview();
      }, 500);
      toast.success(t('settings.savedSuccessfully') || 'Settings saved successfully', {
        action: {
          label: 'Undo',
          onClick: () => {
            // Restore previous settings
            if (originalSettings) {
              setSettings(originalSettings);
              toast.info('Changes reverted');
            }
          },
        },
      });
      // Trigger a custom event to notify other components of settings change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save settings', {
        action: {
          label: 'Retry',
          onClick: () => handleSave(),
        },
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/18f62b71-ea80-4ff9-bcdc-f2ac503282e5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'components/pages/admin/Settings.tsx:629',message:'handleSave:error',data:{error: error?.message || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    try {
      setUploading({ ...uploading, logo: true });
      
      // Delete old logo if it exists and is from Supabase Storage
      const oldLogoUrl = settings.branding.logoUrl;
      if (oldLogoUrl && !oldLogoUrl.startsWith('data:')) {
        // Extract file path from URL and delete
        try {
          const urlObj = new URL(oldLogoUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore delete errors
        }
      }

      // Upload to Supabase Storage
      const result = await uploadFile(file, 'logo');
      
      if (result.error || !result.url) {
        throw new Error(result.error || 'Failed to upload logo');
      }

      const updatedSettings = {
        ...settings,
        branding: { 
          ...settings.branding,
          logoUrl: result.url, 
          themeColor: settings.branding.themeColor 
        },
      };
      setSettings(updatedSettings);
      
      // Auto-save logo immediately
      await updateSettings(updatedSettings);
      
      // Update original settings after auto-save
      setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)));
      
      // Trigger event to update sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
      toast.success(t('settings.logoUploaded') || 'Logo uploaded successfully');
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast.error(error?.message || 'Failed to upload logo');
    } finally {
      setUploading({ ...uploading, logo: false });
    }
  };

  const handleRemoveLogo = async () => {
    if (!canCustomBranding) {
      toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
      return;
    }

    // UX Improvement: Show confirmation dialog
    setShowRemoveLogoDialog(true);
  };

  const confirmRemoveLogo = async () => {
    setShowRemoveLogoDialog(false);
    
    try {
      // Delete file from Supabase Storage if it exists
      const oldLogoUrl = settings.branding.logoUrl;
      if (oldLogoUrl && !oldLogoUrl.startsWith('data:')) {
        // Extract file path from URL and delete
        try {
          const urlObj = new URL(oldLogoUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore delete errors
        }
      }

      const updatedSettings = {
        ...settings,
        branding: { 
          ...settings.branding,
          logoUrl: '', 
          themeColor: settings.branding.themeColor 
        },
      };
      setSettings(updatedSettings);
      
      // Auto-save removal immediately
      await updateSettings(updatedSettings);
      
      // Update original settings
      setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)));
      
      // Trigger event to update sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
      toast.success(t('settings.logoRemoved') || 'Logo removed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove logo', {
        action: {
          label: 'Retry',
          onClick: () => confirmRemoveLogo(),
        },
      });
    }
  };

  const confirmRemoveBanner = async () => {
    setShowRemoveBannerDialog(false);
    
    try {
      // Delete files from Supabase Storage if they exist
      const oldBannerUrl = settings.branding.bannerCover?.uploadUrl;
      const oldVideoUrl = settings.branding.bannerCover?.videoUrl;
      
      if (oldBannerUrl && !oldBannerUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(oldBannerUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore delete errors
        }
      }
      
      if (oldVideoUrl && !oldVideoUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(oldVideoUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore delete errors
        }
      }
      
      const updatedSettings = {
        ...settings,
        branding: {
          ...settings.branding,
          bannerCover: { 
            type: 'upload' as const, 
            uploadUrl: '',
            videoUrl: '',
          },
        },
      };
      setSettings(updatedSettings);
      
      // Auto-save removal immediately
      await updateSettings(updatedSettings);
      
      // Update original settings
      setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)));
      
      toast.success(t('settings.bannerRemoved') || 'Banner removed');
    } catch (error: any) {
      console.error('Remove banner error:', error);
      toast.error('Failed to remove banner', {
        action: {
          label: 'Retry',
          onClick: () => confirmRemoveBanner(),
        },
      });
    }
  };

  // UX Improvement: Show skeleton loaders instead of spinner
  if (loading || !settings || !settings.businessProfile) {
    return (
      <div>
        <PageHeader title={t('settings.title')} />
        <div className="space-y-6">
          <Card className="p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // UX Improvement: Enhanced Save Button with unsaved changes indicator
  const FixedSaveButton = () => {
    const hasChanges = hasUnsavedChanges();
    const hasErrors = Object.keys(fieldErrors).length > 0;
    
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 py-4 px-4 md:px-6 bg-background/95 backdrop-blur-sm border-t shadow-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`max-w-7xl mx-auto flex items-center justify-between p-3 rounded-lg bg-muted/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">{t('settings.saving') || 'Saving...'}</span>
              </>
            ) : lastSaved && !hasChanges ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">
                  {t('settings.allChangesSaved') || 'All changes saved'} • {lastSaved.toLocaleTimeString()}
                </span>
              </>
            ) : hasChanges ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-amber-600 font-medium">
                  {t('settings.unsavedChanges') || 'You have unsaved changes'}
                </span>
              </>
            ) : null}
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {hasChanges && (
              <span className="text-xs text-muted-foreground hidden md:inline">
                {t('settings.keyboardShortcut') || 'Press Ctrl+S to save'}
              </span>
            )}
            <Button 
              onClick={handleSave} 
              size="default" 
              disabled={saving || hasErrors}
              className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''} ${hasChanges ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('settings.saving') || 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('settings.save') || 'Save Changes'}</span>
                  {hasChanges && (
                    <Badge variant="secondary" className="ml-1">
                      {Object.keys(fieldErrors).length > 0 ? '!' : '•'}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title={t('settings.title')} />

      {/* Main Settings with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Mobile: Select Dropdown, Desktop: Horizontal Tabs */}
        <div className="mb-6 border-b md:border-b-0 md:mb-6 edge-to-edge-mobile">
          {/* Mobile Select Dropdown */}
          <div className="md:hidden px-4 pb-4">
            <p className={`text-sm text-muted-foreground mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.selectSection') || 'Select a section to view more settings'}
            </p>
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-12 justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2">
                  {activeTab === 'business' && <Building2 className="w-4 h-4 flex-shrink-0" />}
                  {activeTab === 'calendar' && <Calendar className="w-4 h-4 flex-shrink-0" />}
                  {activeTab === 'notifications' && <Bell className="w-4 h-4 flex-shrink-0" />}
                  {activeTab === 'templates' && <Mail className="w-4 h-4 flex-shrink-0" />}
                  {activeTab === 'integrations' && <Link2 className="w-4 h-4 flex-shrink-0" />}
                  <SelectValue>
                    {activeTab === 'business' && (t('settings.businessProfile') || 'Business Profile')}
                    {activeTab === 'calendar' && (t('settings.calendarSettings') || 'Calendar')}
                    {activeTab === 'notifications' && (t('settings.notifications') || 'Notifications')}
                    {activeTab === 'templates' && (t('nav.templates') || 'Templates')}
                    {activeTab === 'integrations' && (t('settings.integrations') || 'Integrations')}
                  </SelectValue>
                  {(getTabChanges('business') > 0 && activeTab === 'business') ||
                   (getTabChanges('calendar') > 0 && activeTab === 'calendar') ||
                   (getTabChanges('notifications') > 0 && activeTab === 'notifications') ? (
                    <span className="ml-2 w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                  ) : null}
                </div>
              </SelectTrigger>
              <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                <SelectItem value="business" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span>{t('settings.businessProfile') || 'Business Profile'}</span>
                  {getTabChanges('business') > 0 && (
                    <span className={`ml-auto w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 ${isRTL ? 'mr-auto ml-0' : ''}`} />
                  )}
                </SelectItem>
                <SelectItem value="calendar" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{t('settings.calendarSettings') || 'Calendar'}</span>
                  {getTabChanges('calendar') > 0 && (
                    <span className={`ml-auto w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 ${isRTL ? 'mr-auto ml-0' : ''}`} />
                  )}
                </SelectItem>
                <SelectItem value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  <span>{t('settings.notifications') || 'Notifications'}</span>
                  {getTabChanges('notifications') > 0 && (
                    <span className={`ml-auto w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 ${isRTL ? 'mr-auto ml-0' : ''}`} />
                  )}
                </SelectItem>
                <SelectItem value="templates" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>{t('nav.templates') || 'Templates'}</span>
                </SelectItem>
                <SelectItem value="integrations" className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 flex-shrink-0" />
                  <span>{t('settings.integrations') || 'Integrations'}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Horizontal Tabs */}
          <TabsList className={`hidden md:flex flex-row w-full h-auto bg-transparent p-0 gap-0 ${isRTL ? 'px-0' : 'px-0'}`}>
            <TooltipProvider>
              <TabsTrigger 
                value="business" 
                className={`flex-shrink-0 justify-center gap-2 px-4 py-3 h-auto rounded-none data-[state=active]:bg-black data-[state=active]:text-white ${isRTL ? 'flex-row-reverse' : ''} min-w-fit relative`}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-base">{t('settings.businessProfile') || 'Business Profile'}</span>
                {getTabChanges('business') > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Unsaved changes in this tab</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className={`flex-shrink-0 justify-center gap-2 px-4 py-3 h-auto rounded-none data-[state=active]:bg-black data-[state=active]:text-white ${isRTL ? 'flex-row-reverse' : ''} min-w-fit relative`}
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-base">{t('settings.calendarSettings') || 'Calendar'}</span>
                {getTabChanges('calendar') > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Unsaved changes in this tab</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className={`flex-shrink-0 justify-center gap-2 px-4 py-3 h-auto rounded-none data-[state=active]:bg-black data-[state=active]:text-white ${isRTL ? 'flex-row-reverse' : ''} min-w-fit relative`}
              >
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-base">{t('settings.notifications') || 'Notifications'}</span>
                {getTabChanges('notifications') > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Unsaved changes in this tab</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className={`flex-shrink-0 justify-center gap-2 px-4 py-3 h-auto rounded-none data-[state=active]:bg-black data-[state=active]:text-white ${isRTL ? 'flex-row-reverse' : ''} min-w-fit relative`}
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-base">{t('nav.templates') || 'Templates'}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="integrations" 
                className={`flex-shrink-0 justify-center gap-2 px-4 py-3 h-auto rounded-none data-[state=active]:bg-black data-[state=active]:text-white ${isRTL ? 'flex-row-reverse' : ''} min-w-fit relative`}
              >
                <Link2 className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-base">{t('settings.integrations') || 'Integrations'}</span>
              </TabsTrigger>
            </TooltipProvider>
          </TabsList>
        </div>

        {/* Content Area */}
        <div className="space-y-6 pb-24">
            {/* Business Profile Tab */}
            <TabsContent value="business" className="space-y-6 mt-0">
              <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.businessProfile')}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHomepageEditor(true)}
                      className="gap-2"
                      disabled={!canCustomBranding}
                      title={!canCustomBranding ? 'Your plan doesn\'t allow custom branding. Please upgrade to continue.' : ''}
                    >
                      <Edit className="w-4 h-4" />
                      {t('settings.editHomepage') || 'Edit Homepage'}
                    </Button>
                  </div>
                </div>
                
                {/* Logo Upload */}
                <div className="mb-6 pb-6 border-b">
                  <label className={`text-sm font-medium mb-3 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.logo')}
                  </label>
                  <div className="space-y-4">
                    {settings.branding.logoUrl ? (
                      <div className="flex items-center gap-4">
                        <div className="relative w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={settings.branding.logoUrl}
                            alt={t('settings.businessLogo')}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                            disabled={!canCustomBranding}
                            title={!canCustomBranding ? 'Your plan doesn\'t allow custom branding. Please upgrade to continue.' : ''}
                          >
                            <Upload className="w-4 h-4 me-2" />
                            {t('settings.changeLogo')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveLogo}
                            disabled={!canCustomBranding}
                            title={!canCustomBranding ? 'Your plan doesn\'t allow custom branding. Please upgrade to continue.' : ''}
                          >
                            <X className="w-4 h-4 me-2" />
                            {t('settings.removeLogo')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">{t('settings.noLogo')}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={!canCustomBranding}
                          title={!canCustomBranding ? 'Your plan doesn\'t allow custom branding. Please upgrade to continue.' : ''}
                        >
                          <Upload className="w-4 h-4 me-2" />
                          {t('settings.uploadLogo')}
                        </Button>
                      </div>
                    )}
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <p className={`text-xs text-muted-foreground mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.logoVisibleNote') || 'This logo is visible on your booking page.'}
                  </p>
                </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.businessName')}</label>
              <Input
                value={settings.businessProfile?.name || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, name: e.target.value } as BusinessProfile,
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <p className={`text-xs text-muted-foreground mt-1.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.businessNameVisibleNote') || 'This name is visible on your booking page.'}
              </p>
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.email')}
              </label>
              <Input
                type="email"
                value={settings.businessProfile.email}
                onChange={(e) => {
                  const value = e.target.value;
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, email: value } as BusinessProfile,
                  });
                  if (value) validateField('email', value);
                }}
                onBlur={(e) => validateField('email', e.target.value)}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={fieldErrors.email ? 'border-destructive' : ''}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.phone')}
              </label>
              <Input
                value={settings.businessProfile.phone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, phone: formatted } as BusinessProfile,
                  });
                  if (formatted) validateField('phone', formatted);
                }}
                onBlur={(e) => validateField('phone', e.target.value)}
                maxLength={12}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={fieldErrors.phone ? 'border-destructive' : ''}
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
              />
              {fieldErrors.phone && (
                <p id="phone-error" className="text-sm text-destructive mt-1" role="alert">
                  {fieldErrors.phone}
                </p>
              )}
              <p className={`text-xs text-muted-foreground mt-1.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.phoneVisibleNote') || 'This phone number is visible on your booking page.'}
              </p>
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.whatsapp')}
                {!canUseWhatsApp && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 inline-block ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>WhatsApp integration is available in Premium plans. Upgrade to enable this feature.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </label>
              <Input
                value={settings.businessProfile.whatsapp}
                onChange={(e) => {
                  if (!canUseWhatsApp) {
                    toast.error('Your plan doesn\'t allow WhatsApp integration. Please upgrade to continue.');
                    return;
                  }
                  const formatted = formatPhoneNumber(e.target.value);
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, whatsapp: formatted } as BusinessProfile,
                  });
                  if (formatted) validateField('whatsapp', formatted);
                }}
                onBlur={(e) => validateField('whatsapp', e.target.value)}
                disabled={!canUseWhatsApp}
                title={!canUseWhatsApp ? 'Your plan doesn\'t allow WhatsApp integration. Please upgrade to continue.' : ''}
                maxLength={12}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={fieldErrors.whatsapp ? 'border-destructive' : ''}
                aria-invalid={!!fieldErrors.whatsapp}
                aria-describedby={fieldErrors.whatsapp ? 'whatsapp-error' : undefined}
              />
              {fieldErrors.whatsapp && (
                <p id="whatsapp-error" className="text-sm text-destructive mt-1" role="alert">
                  {fieldErrors.whatsapp}
                </p>
              )}
              <p className={`text-xs text-muted-foreground mt-1.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.whatsappVisibleNote') || 'This WhatsApp number is visible on your booking page.'}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.address')}</label>
              <Input
                value={settings.businessProfile.address}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, address: e.target.value } as BusinessProfile,
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <p className={`text-xs text-muted-foreground mt-1.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.addressVisibleNote') || 'This address is visible on your booking page.'}
              </p>
            </div>

            {/* Working Hours Per Day */}
            <div className="col-span-full mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h4 className={`text-base font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.workingHoursPerDay') || 'Working Hours Per Day'}
                </h4>
              </div>
              <p className={`text-xs text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.workingHoursPerDayNote') || 'Set different working hours for each day. Days with the same hours will be grouped together on your booking page.'}
              </p>
              <div className="space-y-3">
                {[
                  { value: 0, label: t('settings.sunday') },
                  { value: 1, label: t('settings.monday') },
                  { value: 2, label: t('settings.tuesday') },
                  { value: 3, label: t('settings.wednesday') },
                  { value: 4, label: t('settings.thursday') },
                  { value: 5, label: t('settings.friday') },
                  { value: 6, label: t('settings.saturday') },
                ].map((day) => {
                  const isWorkingDay = settings.calendar?.workingDays?.includes(day.value) || false;
                  const dayHours = settings.calendar?.dailyWorkingHours?.[day.value] || 
                    settings.calendar?.workingHours || 
                    { start: '09:00', end: '18:00' };
                  
                  return (
                    <div key={day.value} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Checkbox
                          id={`working-day-${day.value}`}
                          checked={isWorkingDay}
                          onCheckedChange={(checked) => {
                            const currentDays = settings.calendar?.workingDays || [];
                            const newDays = checked
                              ? [...currentDays, day.value]
                              : currentDays.filter((d: number) => d !== day.value);
                            
                            // If unchecking, remove from dailyWorkingHours
                            let newDailyHours = { ...(settings.calendar?.dailyWorkingHours || {}) };
                            if (!checked) {
                              delete newDailyHours[day.value];
                            } else {
                              // If checking, set default hours if not already set
                              if (!newDailyHours[day.value]) {
                                newDailyHours[day.value] = {
                                  start: settings.calendar?.workingHours?.start || '09:00',
                                  end: settings.calendar?.workingHours?.end || '18:00',
                                };
                              }
                            }
                            
                            setSettings({
                              ...settings,
                              calendar: {
                                ...settings.calendar,
                                workingDays: newDays.sort(),
                                dailyWorkingHours: Object.keys(newDailyHours).length > 0 ? newDailyHours : undefined,
                              },
                            });
                          }}
                        />
                        <label
                          htmlFor={`working-day-${day.value}`}
                          className={`text-sm font-medium cursor-pointer w-24 flex-shrink-0 ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                          {day.label}
                        </label>
                      </div>
                      {isWorkingDay && (
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <Input
                              type="time"
                              value={dayHours.start}
                              onChange={(e) => {
                                const newDailyHours = {
                                  ...(settings.calendar?.dailyWorkingHours || {}),
                                  [day.value]: {
                                    start: e.target.value,
                                    end: dayHours.end,
                                  },
                                };
                                setSettings({
                                  ...settings,
                                  calendar: {
                                    ...settings.calendar,
                                    dailyWorkingHours: newDailyHours,
                                  },
                                });
                              }}
                              dir="ltr"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <Input
                              type="time"
                              value={dayHours.end}
                              onChange={(e) => {
                                const newDailyHours = {
                                  ...(settings.calendar?.dailyWorkingHours || {}),
                                  [day.value]: {
                                    start: dayHours.start,
                                    end: e.target.value,
                                  },
                                };
                                setSettings({
                                  ...settings,
                                  calendar: {
                                    ...settings.calendar,
                                    dailyWorkingHours: newDailyHours,
                                  },
                                });
                              }}
                              dir="ltr"
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.timezone')}</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg text-left bg-muted cursor-not-allowed`}
                value="Asia/Jerusalem"
                disabled
                dir="ltr"
              >
                <option value="Asia/Jerusalem">Asia/Jerusalem</option>
              </select>
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.currency')}</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg ${isRTL ? 'text-right' : 'text-left'} bg-muted cursor-not-allowed`}
                value="ILS"
                disabled
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="ILS">ILS (₪)</option>
              </select>
            </div>
          </div>

          {/* Language and Localization Section */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.languageAndLocalization')}</h3>
              </div>
              {!canUseMultiLanguage && (
                <span className="text-xs text-muted-foreground">(Upgrade required)</span>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.language')}</label>
                <LanguageSelect disabled={!canUseMultiLanguage} />
              </div>
            </div>
          </div>
        </Card>
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="space-y-6 mt-0">
              <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.calendarSettings')}
                  </h3>
                </div>
                <div className="space-y-6">
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.weekStartDay')}</label>
              <Select
                value={settings.calendar?.weekStartDay?.toString() || '0'}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    calendar: {
                      ...settings.calendar,
                      weekStartDay: parseInt(value),
                    },
                  })
                }
              >
                <SelectTrigger className={`w-full ${isRTL ? '!text-left !flex-row' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectItem value="0">{t('settings.sunday')}</SelectItem>
                  <SelectItem value="1">{t('settings.monday')}</SelectItem>
                  <SelectItem value="2">{t('settings.tuesday')}</SelectItem>
                  <SelectItem value="3">{t('settings.wednesday')}</SelectItem>
                  <SelectItem value="4">{t('settings.thursday')}</SelectItem>
                  <SelectItem value="5">{t('settings.friday')}</SelectItem>
                  <SelectItem value="6">{t('settings.saturday')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.workingDays')}</label>
              <p className={`text-xs text-muted-foreground mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.workingDaysVisibleNote') || 'These working days are visible on your booking page.'}
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 0, label: t('settings.sunday') },
                  { value: 1, label: t('settings.monday') },
                  { value: 2, label: t('settings.tuesday') },
                  { value: 3, label: t('settings.wednesday') },
                  { value: 4, label: t('settings.thursday') },
                  { value: 5, label: t('settings.friday') },
                  { value: 6, label: t('settings.saturday') },
                ].map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={settings.calendar?.workingDays?.includes(day.value) || false}
                      onCheckedChange={(checked) => {
                        const currentDays = settings.calendar?.workingDays || [];
                        const newDays = checked
                          ? [...currentDays, day.value]
                          : currentDays.filter((d: number) => d !== day.value);
                        setSettings({
                          ...settings,
                          calendar: {
                            ...settings.calendar,
                            workingDays: newDays.sort(),
                          },
                        });
                      }}
                    />
                    <label
                      htmlFor={`day-${day.value}`}
                      className={`text-sm font-normal cursor-pointer ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className={`grid md:grid-cols-2 gap-4 ${isRTL ? 'space-x-reverse' : ''}`}>
              <div>
                <label className={`text-sm font-medium mb-2 block flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Clock className="w-4 h-4" />
                  {t('settings.workingHoursStart')}
                </label>
                <p className={`text-xs text-muted-foreground mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.workingHoursVisibleNote') || 'These working hours are visible on your booking page.'}
                </p>
              <Input
                type="time"
                value={settings.calendar?.workingHours?.start || '09:00'}
                onChange={(e) => {
                  const value = e.target.value;
                  setSettings({
                    ...settings,
                    calendar: {
                      ...settings.calendar,
                      workingHours: {
                        ...settings.calendar?.workingHours,
                        start: value,
                      },
                    },
                  });
                  // Validate working hours when both are set
                  if (value && settings.calendar?.workingHours?.end) {
                    const hoursResult = validateWorkingHours(value, settings.calendar.workingHours.end);
                    if (!hoursResult.isValid) {
                      setFieldErrors(prev => ({ ...prev, workingHours: hoursResult.error! }));
                    } else {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.workingHours;
                        return newErrors;
                      });
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && settings.calendar?.workingHours?.end) {
                    const hoursResult = validateWorkingHours(e.target.value, settings.calendar.workingHours.end);
                    if (!hoursResult.isValid) {
                      setFieldErrors(prev => ({ ...prev, workingHours: hoursResult.error! }));
                    }
                  }
                }}
                dir="ltr"
                className={`${isRTL ? 'text-right' : 'text-left'} ${fieldErrors.workingHours ? 'border-destructive' : ''}`}
                aria-invalid={!!fieldErrors.workingHours}
                aria-describedby={fieldErrors.workingHours ? 'workingHours-error' : undefined}
              />
              </div>
              <div>
                <label className={`text-sm font-medium mb-2 block flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Clock className="w-4 h-4" />
                  {t('settings.workingHoursEnd')}
                </label>
                <Input
                  type="time"
                  value={settings.calendar?.workingHours?.end || '18:00'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSettings({
                      ...settings,
                      calendar: {
                        ...settings.calendar,
                        workingHours: {
                          ...settings.calendar?.workingHours,
                          end: value,
                        },
                      },
                    });
                    // Validate working hours when both are set
                    if (value && settings.calendar?.workingHours?.start) {
                      const hoursResult = validateWorkingHours(settings.calendar.workingHours.start, value);
                      if (!hoursResult.isValid) {
                        setFieldErrors(prev => ({ ...prev, workingHours: hoursResult.error! }));
                      } else {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.workingHours;
                          return newErrors;
                        });
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && settings.calendar?.workingHours?.start) {
                      const hoursResult = validateWorkingHours(settings.calendar.workingHours.start, e.target.value);
                      if (!hoursResult.isValid) {
                        setFieldErrors(prev => ({ ...prev, workingHours: hoursResult.error! }));
                      }
                    }
                  }}
                  dir="ltr"
                  className={`${isRTL ? 'text-right' : 'text-left'} ${fieldErrors.workingHours ? 'border-destructive' : ''}`}
                  aria-invalid={!!fieldErrors.workingHours}
                  aria-describedby={fieldErrors.workingHours ? 'workingHours-error' : undefined}
                />
              </div>
            </div>
            {fieldErrors.workingHours && (
              <p id="workingHours-error" className="text-sm text-destructive mt-1" role="alert">
                {fieldErrors.workingHours}
              </p>
            )}
            <div>
              <label className={`text-sm font-medium mb-2 block flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                <Clock className="w-4 h-4" />
                {t('settings.timeSlotGap')}
              </label>
              <Select
                value={(settings.calendar?.timeSlotGap || 60).toString()}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    calendar: {
                      ...settings.calendar,
                      timeSlotGap: parseInt(value),
                    },
                  })
                }
              >
                <SelectTrigger className={`w-full ${isRTL ? '!text-left !flex-row' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                  {[5, 10, 15, 20, 30, 45, 60].map((gap) => (
                    <SelectItem key={gap} value={gap.toString()}>
                      {gap} {gap === 1 ? t('settings.minute') : t('settings.minutes')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.timeSlotGapDescription')}
              </p>
            </div>

            {/* Customer Reschedule Settings */}
            <div className="border-t pt-6 mt-6">
              <h4 className={`text-base font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.customerReschedule') || 'Customer Reschedule Settings'}
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-medium">
                      {t('settings.allowCustomerReschedule') || 'Allow customers to reschedule appointments'}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('settings.allowCustomerRescheduleDescription') || 'Enable this to let customers change their appointment date and time'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.calendar?.reschedule?.allowCustomerReschedule ?? false}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        calendar: {
                          ...settings.calendar,
                          reschedule: {
                            ...settings.calendar?.reschedule,
                            allowCustomerReschedule: checked,
                            requireApproval: checked ? (settings.calendar?.reschedule?.requireApproval ?? false) : false,
                          },
                        },
                      })
                    }
                  />
                </div>

                {settings.calendar?.reschedule?.allowCustomerReschedule && (
                  <div className="flex items-center justify-between pl-4 border-l-2 border-primary/20">
                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <label className="text-sm font-medium">
                        {t('settings.requireRescheduleApproval') || 'Require approval for reschedule requests'}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('settings.requireRescheduleApprovalDescription') || 'If enabled, reschedule requests will need admin approval. If disabled, changes will be applied immediately.'}
                      </p>
                    </div>
                    <Switch
                      checked={settings.calendar?.reschedule?.requireApproval ?? false}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          calendar: {
                            ...settings.calendar,
                            reschedule: {
                              ...settings.calendar?.reschedule,
                              requireApproval: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 mt-0">
              <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="w-5 h-5 text-primary" />
                  <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.notifications')}</h3>
                </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.senderName')}</label>
              <Input
                value={settings.notifications.senderName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, senderName: e.target.value },
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.senderEmail')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 inline-block ml-1 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Email address used to send notifications to customers</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Input
                type="email"
                value={settings.notifications.senderEmail}
                onChange={(e) => {
                  const value = e.target.value;
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, senderEmail: value },
                  });
                  if (value) validateField('senderEmail', value);
                }}
                onBlur={(e) => validateField('senderEmail', e.target.value)}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={fieldErrors.senderEmail ? 'border-destructive' : ''}
                aria-invalid={!!fieldErrors.senderEmail}
                aria-describedby={fieldErrors.senderEmail ? 'senderEmail-error' : undefined}
              />
              {fieldErrors.senderEmail && (
                <p id="senderEmail-error" className="text-sm text-destructive mt-1" role="alert">
                  {fieldErrors.senderEmail}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.reminderMessage') || 'Reminder Message'}
            </label>
            <Textarea
              value={settings.notifications.reminderMessage || 'A reminder that you have an appointment for {{service}} on {{date}}, see you soon!'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: { 
                    ...settings.notifications, 
                    reminderMessage: e.target.value 
                  },
                })
              }
              placeholder="A reminder that you have an appointment for {{service}} on {{date}}, see you soon!"
              rows={4}
              dir={isRTL ? 'rtl' : 'ltr'}
              className="font-mono text-sm"
            />
            <p className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.reminderMessageHint') || 'Use {{service}}, {{date}}, {{time}}, {{worker}}, and {{business}} as placeholders'}
            </p>
          </div>

              <Separator className="my-6" />
              
              {/* Reminder Settings */}
              <div>
                <h4 className={`text-base font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.reminderSettings') || 'Reminder Settings'}
                </h4>
                <div className="space-y-4">
            {/* Enable Reminders */}
            <div className="flex items-center justify-between">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <label className="text-sm font-medium">
                  {t('settings.enableReminders') || 'Enable Automated Reminders'}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.enableRemindersDescription') || 'Automatically send reminders to customers before appointments'}
                </p>
              </div>
              <Switch
                checked={settings.notifications?.reminders?.enabled !== false}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      reminders: {
                        ...(settings.notifications?.reminders || {}),
                        enabled: checked,
                      },
                    },
                  })
                }
              />
            </div>

            {settings.notifications?.reminders?.enabled !== false && (
              <>
                {/* SMS Reminders */}
                <div className="flex items-center justify-between">
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-sm font-medium">
                      {t('settings.smsReminders') || 'SMS Reminders'}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.smsRemindersDescription') || 'Send reminders via SMS'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications?.reminders?.smsEnabled !== false}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          reminders: {
                            ...(settings.notifications?.reminders || {}),
                            smsEnabled: checked,
                          },
                        },
                      })
                    }
                  />
                </div>

                {/* WhatsApp Reminders */}
                <div className="flex items-center justify-between">
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-sm font-medium">
                      {t('settings.whatsappReminders') || 'WhatsApp Reminders'}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.whatsappRemindersDescription') || 'Send reminders via WhatsApp (Premium plan)'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications?.reminders?.whatsappEnabled === true}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          reminders: {
                            ...(settings.notifications?.reminders || {}),
                            whatsappEnabled: checked,
                          },
                        },
                      })
                    }
                  />
                </div>

                {/* Days Before */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.reminderDaysBefore') || 'Send Reminders (Days Before)'}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications?.reminders?.daysBefore?.includes(1) || false}
                        onChange={(e) => {
                          const current = settings.notifications?.reminders?.daysBefore || [];
                          const updated = e.target.checked
                            ? [...current.filter((d: number) => d !== 1), 1]
                            : current.filter((d: number) => d !== 1);
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              reminders: {
                                ...(settings.notifications?.reminders || {}),
                                daysBefore: updated.length > 0 ? updated : [1],
                              },
                            },
                          });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t('settings.oneDayBefore') || '1 day before'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications?.reminders?.daysBefore?.includes(2) || false}
                        onChange={(e) => {
                          const current = settings.notifications?.reminders?.daysBefore || [];
                          const updated = e.target.checked
                            ? [...current.filter((d: number) => d !== 2), 2]
                            : current.filter((d: number) => d !== 2);
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              reminders: {
                                ...(settings.notifications?.reminders || {}),
                                daysBefore: updated.length > 0 ? updated : [1],
                              },
                            },
                          });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t('settings.twoDaysBefore') || '2 days before'}</span>
                    </label>
                  </div>
                </div>

                {/* Default Time */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.reminderDefaultTime') || 'Default Reminder Time'}
                  </label>
                  <Input
                    type="time"
                    value={settings.notifications?.reminders?.defaultTime || '09:00'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          reminders: {
                            ...(settings.notifications?.reminders || {}),
                            defaultTime: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-32"
                  />
                </div>

                {/* Personal Addition */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.reminderPersonalAddition') || 'Personal Message Addition (Optional)'}
                  </label>
                  <Textarea
                    value={settings.notifications?.reminders?.personalAddition || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          reminders: {
                            ...(settings.notifications?.reminders || {}),
                            personalAddition: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder={t('settings.reminderPersonalAdditionPlaceholder') || 'Add a personal message to append to reminders...'}
                    rows={3}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.reminderPersonalAdditionHint') || 'This message will be added to all reminder messages'}
                  </p>
                </div>
              </>
            )}
                </div>
              </div>
        </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-6 mt-0">
              <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 mb-6">
                  <Mail className="w-5 h-5 text-primary" />
                  <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('templates.title') || 'Templates'}
                  </h3>
                </div>
                <div className="grid lg:grid-cols-[300px_1fr] gap-6">
                  {/* Template List */}
                  <Card className="p-4 h-fit">
                    <div className="space-y-2">
                      {emailTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`w-full text-start p-3 rounded-lg border transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'bg-accent border-accent-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="font-medium text-sm">{template.subject}</div>
                          <div className="text-xs text-muted-foreground mt-1 capitalize">
                            {template.type.replace('_', ' ')} • {template.locale}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>

                  {/* Editor */}
                  <div className="space-y-6">
                    <Card className="p-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Subject</label>
                          <Input
                            value={templateSubject}
                            onChange={(e) => setTemplateSubject(e.target.value)}
                            placeholder="Email subject"
                            disabled={!canManageTemplates}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Body</label>
                          <Textarea
                            value={templateBody}
                            onChange={(e) => setTemplateBody(e.target.value)}
                            rows={12}
                            placeholder="Email body"
                            disabled={!canManageTemplates}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {t('templates.variables') || 'Variables'}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {templateVariables.map((variable) => (
                              <Badge
                                key={variable}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => insertVariable(variable)}
                              >
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={handleSaveTemplate}
                            disabled={!canManageTemplates}
                            title={!canManageTemplates ? 'Your plan doesn\'t allow managing templates. Please upgrade to continue.' : ''}
                          >
                            <Save className="w-4 h-4 me-2" />
                            {t('templates.save') || 'Save'}
                          </Button>
                          <Button variant="outline" onClick={() => toast.info('Test email sent')}>
                            <Send className="w-4 h-4 me-2" />
                            {t('templates.test') || 'Test'}
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Preview */}
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4">{t('templates.preview') || 'Preview'}</h3>
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="font-medium mb-2">{templateSubject}</div>
                        <div className="text-sm whitespace-pre-wrap">{getTemplatePreview()}</div>
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6 mt-0">
              <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 mb-6">
                  <Link2 className="w-5 h-5 text-primary" />
                  <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.googleCalendar') || 'Google Calendar Sync'}
                  </h3>
                </div>
          <div className="space-y-4">
            <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.googleCalendarDescription') || 'Sync your appointments with Google Calendar. Available in Professional and Business plans.'}
            </p>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/calendar/google/oauth?action=initiate');
                  const data = await response.json();
                  if (data.authUrl) {
                    window.location.href = data.authUrl;
                  } else {
                    alert('Failed to initiate Google Calendar connection');
                  }
                } catch (error) {
                  console.error('Error connecting Google Calendar:', error);
                  alert('Failed to connect Google Calendar');
                }
              }}
              variant="outline"
            >
              {t('settings.connectGoogleCalendar') || 'Connect Google Calendar'}
            </Button>
          </div>
        </Card>
            </TabsContent>
          </div>
      </Tabs>

      {/* Fixed Save Button - Always visible at bottom */}
      <FixedSaveButton />

      {/* Homepage Editor */}
      {showHomepageEditor && businessSlug && (
        <HomepageEditor
          open={showHomepageEditor}
          onOpenChange={setShowHomepageEditor}
          initialSettings={settings}
          businessSlug={businessSlug}
          onSave={async (updatedSettings) => {
            await updateSettings(updatedSettings);
            setSettings(updatedSettings);
            // Trigger settings update event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('settingsUpdated'));
            }
          }}
        />
      )}

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-[95vw] !max-w-[95vw] w-full h-[90vh] max-h-[90vh] p-0 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className={`px-6 pt-6 pb-4 border-b flex-shrink-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('settings.previewBookingPage') || t('preview') || 'Preview'}</DialogTitle>
              {businessSlug && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPreview}
                  className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('settings.refreshPreview') || 'Refresh'}
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            {businessSlug ? (
              <iframe
                ref={previewIframeRef}
                src={`/b/${businessSlug}${previewRefreshKey ? `?preview=${previewRefreshKey}` : ''}`}
                className="w-full h-full border-0"
                title={t('settings.previewBookingPage') || 'Booking Page Preview'}
                allow="fullscreen"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full p-6">
                <p className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.previewNotAvailable') || 'Preview not available. Please access settings from a business admin page.'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* UX Improvement: Confirmation Dialogs */}
      <AlertDialog open={showRemoveLogoDialog} onOpenChange={setShowRemoveLogoDialog}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className={isRTL ? '!text-right' : '!text-left'}>
            <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('settings.confirmRemoveLogo') || 'Remove Logo?'}</AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('settings.confirmRemoveLogoDescription') || 'Are you sure you want to remove your logo? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertDialogCancel className="min-w-[100px]">{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveLogo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[100px]">
              {t('settings.remove') || 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRemoveBannerDialog} onOpenChange={setShowRemoveBannerDialog}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className={isRTL ? '!text-right' : '!text-left'}>
            <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('settings.confirmRemoveBanner') || 'Remove Banner?'}</AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('settings.confirmRemoveBannerDescription') || 'Are you sure you want to remove your banner image? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertDialogCancel className="min-w-[100px]">{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveBanner} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[100px]">
              {t('settings.remove') || 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRemoveVideoDialog} onOpenChange={setShowRemoveVideoDialog}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className={isRTL ? '!text-right' : '!text-left'}>
            <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('settings.confirmRemoveVideo') || 'Remove Video?'}</AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('settings.confirmRemoveVideoDescription') || 'Are you sure you want to remove your banner video? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertDialogCancel className="min-w-[100px]">{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowRemoveVideoDialog(false);
              // Video removal logic will be handled by the component that triggers this
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[100px]">
              {t('settings.remove') || 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function LanguageSelect({ disabled = false }: { disabled?: boolean }) {
  const { locale, setLocale } = useDirection();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (newLocale: Locale) => {
    if (disabled) {
      toast.error('Your plan doesn\'t allow multi-language support. Please upgrade to continue.');
      return;
    }
    if (newLocale === locale || isChanging) return;
    
    setIsChanging(true);
    
    try {
      // Use DirectionProvider's setLocale which handles cookie, localStorage, and document updates
      await setLocale(newLocale);
      
      // Show success toast
      toast.success(`Language changed to ${getLocaleDisplayName(newLocale)}`, {
        duration: 2000,
      });
    } catch (error) {
      toast.error('Failed to change language');
    } finally {
      setIsChanging(false);
    }
  };

  const { isRTL: langIsRTL } = useDirection();
  
  return (
    <Select
      value={locale}
      onValueChange={(value) => handleLanguageChange(value as Locale)}
      disabled={isChanging || disabled}
    >
      <SelectTrigger className={`w-full ${langIsRTL ? '!text-left !flex-row' : ''}`} dir={langIsRTL ? 'rtl' : 'ltr'}>
        <div className={`flex items-center gap-2 ${langIsRTL ? '' : ''}`}>
          <Globe className="w-4 h-4 text-muted-foreground" />
          <SelectValue>
            {getLocaleDisplayName(locale)}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent dir={langIsRTL ? 'rtl' : 'ltr'}>
        {languages.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {getLocaleDisplayName(lang)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default Settings;
