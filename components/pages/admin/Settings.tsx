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
import { Save, Globe, Upload, X, Calendar, Clock, Plus, Image, MessageSquare, Trash2, Check, Video, Building2, Palette, Bell, Link2, CheckCircle2, Loader2, Mail, Send, RefreshCw, Pencil } from 'lucide-react';
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
import type { BusinessProfile } from '@/types/admin';
import { HomepageEditor } from './HomepageEditor';

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
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string>(''); // Track original logo URL for cleanup on save
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

  // Note: Theme color is only applied to booking pages via ThemeProvider
  // Admin panel keeps the default homepage primary color

  // Load settings from API after mount
  useEffect(() => {
    setMounted(true);
    const loadSettings = async () => {
      try {
        setLoading(true);
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
          if (loadedSettings.businessProfile.phone) {
            loadedSettings.businessProfile.phone = formatPhoneNumber(loadedSettings.businessProfile.phone);
          }
          if (loadedSettings.businessProfile.whatsapp) {
            loadedSettings.businessProfile.whatsapp = formatPhoneNumber(loadedSettings.businessProfile.whatsapp);
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
        if (!loadedSettings.branding) {
          loadedSettings.branding = {
            logoUrl: '',
            themeColor: '#0EA5E9',
            bannerCover: {
              type: 'pattern',
              patternId: 'pattern1',
            },
            guestMessage: 'שלום אורח, ברוך הבא!',
            loggedInMessage: 'שלום {name}, ברוך הבא!',
          };
        } else {
          // Set default greeting messages if empty
          if (!loadedSettings.branding.guestMessage || loadedSettings.branding.guestMessage.trim() === '') {
            loadedSettings.branding.guestMessage = 'שלום אורח, ברוך הבא!';
          }
          if (!loadedSettings.branding.loggedInMessage || loadedSettings.branding.loggedInMessage.trim() === '') {
            loadedSettings.branding.loggedInMessage = 'שלום {name}, ברוך הבא!';
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
        // Track original logo URL for cleanup on save
        setOriginalLogoUrl(loadedSettings.branding?.logoUrl || '');
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
    }).catch(error => {
      console.error('Error checking features:', error);
      // Default to true if check fails to avoid blocking unnecessarily
    });
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Handle logo cleanup: delete old logo if it was changed or removed
      const currentLogoUrl = settings.branding.logoUrl || '';
      if (originalLogoUrl !== currentLogoUrl) {
        // Logo was changed or removed, delete the old one from storage
        if (originalLogoUrl && !originalLogoUrl.startsWith('data:')) {
          try {
            const urlObj = new URL(originalLogoUrl);
            const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
            if (pathMatch) {
              await deleteFile(pathMatch[1]);
            }
          } catch (err) {
            // Ignore delete errors (file might already be deleted or not exist)
            console.warn('Failed to delete old logo:', err);
          }
        }
      }
      
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
      
      // Update original logo URL after successful save
      setOriginalLogoUrl(settingsToSave.branding.logoUrl || '');
      
      setLastSaved(new Date());
      // Refresh preview to show changes (with a small delay to ensure settings are saved)
      setTimeout(() => {
        refreshPreview();
      }, 500);
      toast.success(t('settings.savedSuccessfully') || 'Settings saved successfully');
      // Trigger a custom event to notify other components of settings change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save settings');
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

      // Upload to Supabase Storage
      const result = await uploadFile(file, 'logo');
      
      if (result.error || !result.url) {
        throw new Error(result.error || 'Failed to upload logo');
      }

      // Update local state to show preview (but don't save yet)
      const updatedSettings = {
        ...settings,
        branding: { 
          ...settings.branding,
          logoUrl: result.url, 
          themeColor: settings.branding.themeColor 
        },
      };
      setSettings(updatedSettings);
      
      toast.success('Logo uploaded. Click Save to apply changes.');
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast.error(error?.message || 'Failed to upload logo');
    } finally {
      setUploading({ ...uploading, logo: false });
    }
  };

  const handleRemoveLogo = () => {
    if (!canCustomBranding) {
      toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
      return;
    }

    // Update local state to remove logo preview (but don't save yet)
    const updatedSettings = {
      ...settings,
      branding: { 
        ...settings.branding,
        logoUrl: '', 
        themeColor: settings.branding.themeColor 
      },
    };
    setSettings(updatedSettings);
    
    toast.success('Logo removed. Click Save to apply changes.');
  };

  // Show loading state or ensure settings is initialized
  if (loading || !settings || !settings.businessProfile) {
    return (
      <div>
        <PageHeader title={t('settings.title')} />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('settings.loading') || 'Loading settings...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fixed Save Button Component - always visible at bottom (only in main content area, not sidebar)
  const FixedSaveButton = () => (
    <div className={`fixed bottom-0 z-40 py-4 px-4 md:px-6 bg-background/95 backdrop-blur-sm border-t shadow-lg ${isRTL ? 'left-0 right-0 md:left-0 md:right-[16rem]' : 'left-0 right-0 md:left-[16rem] md:right-0'}`}>
      <div className={`max-w-7xl mx-auto flex items-center justify-between p-3 rounded-lg bg-muted/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-muted-foreground">{t('settings.saving') || 'Saving...'}</span>
            </>
          ) : lastSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-muted-foreground">
                {t('settings.lastSaved') || 'Last saved'} {lastSaved.toLocaleTimeString()}
              </span>
            </>
          ) : null}
        </div>
        <Button 
          onClick={handleSave} 
          size="default" 
          disabled={saving}
          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('settings.save') || 'Save Changes'}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title={t('settings.title')} />

      {/* Main Settings with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Horizontal Top Bar Navigation */}
        <div className="mb-6 border-b md:border-b-0 md:mb-6 edge-to-edge-mobile">
          <TabsList className={`flex flex-row w-full h-14 md:h-auto bg-transparent p-0 gap-0 overflow-x-auto settings-nav-scrollbar ${isRTL ? 'pr-6 pl-6 md:px-0' : 'pl-6 pr-6 md:px-0'}`}>
            <TabsTrigger 
              value="business" 
              className={`flex-shrink-0 justify-center gap-2 ${isRTL ? 'pr-6 pl-4 md:px-4' : 'pl-6 pr-4 md:px-4'} py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary ${isRTL ? 'flex-row-reverse' : ''} min-w-fit`}
            >
              <Building2 className="w-4 h-4 md:w-4 md:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap text-sm md:text-base">{t('settings.businessProfile') || 'Business Profile'}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className={`flex-shrink-0 justify-center gap-2 px-4 md:px-4 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary ${isRTL ? 'flex-row-reverse' : ''} min-w-fit`}
            >
              <Calendar className="w-4 h-4 md:w-4 md:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap text-sm md:text-base">{t('settings.calendarSettings') || 'Calendar'}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className={`flex-shrink-0 justify-center gap-2 px-4 md:px-4 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary ${isRTL ? 'flex-row-reverse' : ''} min-w-fit`}
            >
              <Bell className="w-4 h-4 md:w-4 md:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap text-sm md:text-base">{t('settings.notifications') || 'Notifications'}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className={`flex-shrink-0 justify-center gap-2 px-4 md:px-4 py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary ${isRTL ? 'flex-row-reverse' : ''} min-w-fit`}
            >
              <Mail className="w-4 h-4 md:w-4 md:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap text-sm md:text-base">{t('nav.templates') || 'Templates'}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="integrations" 
              className={`flex-shrink-0 justify-center gap-2 ${isRTL ? 'pl-6 pr-4 md:px-4' : 'pl-4 pr-6 md:px-4'} py-4 md:py-3 h-full md:h-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary ${isRTL ? 'flex-row-reverse' : ''} min-w-fit`}
            >
              <Link2 className="w-4 h-4 md:w-4 md:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap text-sm md:text-base">{t('settings.integrations') || 'Integrations'}</span>
            </TabsTrigger>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHomepageEditor(true)}
                    className="gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    {t('settings.openHomepageEditor') || 'Open Visual Editor'}
                  </Button>
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
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.email')}</label>
              <Input
                type="email"
                value={settings.businessProfile.email}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, email: e.target.value } as BusinessProfile,
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.phone')}</label>
              <Input
                value={settings.businessProfile.phone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, phone: formatted } as BusinessProfile,
                  });
                }}
                maxLength={12}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.whatsapp')}</label>
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
                }}
                disabled={!canUseWhatsApp}
                title={!canUseWhatsApp ? 'Your plan doesn\'t allow WhatsApp integration. Please upgrade to continue.' : ''}
                maxLength={12}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
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
            </div>
          </div>

          {/* Working Hours Per Day */}
          <div className="mt-6 pt-6 border-t-[0.5px]">
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
                  <div key={day.value} className={`flex items-center gap-4 p-3 border-[0.5px] rounded-lg ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
                    {isWorkingDay && (
                      <div className="flex-1 grid grid-cols-2 gap-3 max-w-md">
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
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timezone, Currency, and Language - In Same Row on Desktop */}
          <div className="mt-6 pt-6 border-t-[0.5px]">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.languageAndLocalization') || 'הגדרות זמן והתאמה מקומית'}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.language')}
                </label>
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

                  {/* Working Hours Per Day */}
                  <div className="mt-6 pt-6 border-t-[0.5px]">
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
                    <div key={day.value} className={`flex items-center gap-4 p-3 border-[0.5px] rounded-lg ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
                      {isWorkingDay && (
                        <div className="flex-1 grid grid-cols-2 gap-3 max-w-md">
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
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
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
                    </div>
                  );
                })}
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
                  <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.notifications')}
                  </h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('settings.senderName')}
                    </label>
                    <Input
                      value={settings.notifications?.senderName || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            senderName: e.target.value,
                          },
                        })
                      }
                      placeholder={t('settings.senderNamePlaceholder') || 'Your business name'}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('settings.senderEmail')}
                    </label>
                    <Input
                      type="email"
                      value={settings.notifications?.senderEmail || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            senderEmail: e.target.value,
                          },
                        })
                      }
                      placeholder={t('settings.senderEmailPlaceholder') || 'noreply@yourbusiness.com'}
                      dir="ltr"
                    />
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

                        <Button
                          onClick={handleSaveTemplate}
                          disabled={!canManageTemplates || !selectedTemplate}
                          className="w-full"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {t('templates.save') || 'Save Template'}
                        </Button>
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
                    {t('settings.integrations')}
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

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-[95vw] !max-w-[95vw] w-full h-[90vh] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{t('settings.previewBookingPage') || t('preview') || 'Preview'}</DialogTitle>
              {businessSlug && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPreview}
                  className="gap-2"
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
                <p className="text-muted-foreground">
                  {t('settings.previewNotAvailable') || 'Preview not available. Please access settings from a business admin page.'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Homepage Editor */}
      {businessSlug && (
        <HomepageEditor
          open={showHomepageEditor}
          onOpenChange={setShowHomepageEditor}
          initialSettings={settings}
          businessSlug={businessSlug}
          onSave={async (updatedSettings) => {
            // Update local settings state
            setSettings(updatedSettings);
            // Update original logo URL if logo changed
            if (updatedSettings.branding?.logoUrl) {
              setOriginalLogoUrl(updatedSettings.branding.logoUrl);
            }
            // Save to backend
            try {
              setSaving(true);
              const settingsToSave = {
                ...updatedSettings,
                businessProfile: {
                  ...updatedSettings.businessProfile,
                  timezone: 'Asia/Jerusalem',
                  currency: 'ILS',
                },
              };
              await updateSettings(settingsToSave);
              setLastSaved(new Date());
              // Refresh preview
              setTimeout(() => {
                refreshPreview();
              }, 500);
              // Trigger settings update event
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('settingsUpdated'));
              }
              toast.success(t('settings.savedSuccessfully') || 'Settings saved successfully');
            } catch (error: any) {
              toast.error(error?.message || 'Failed to save settings');
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
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
