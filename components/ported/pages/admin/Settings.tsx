import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/admin/PageHeader';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { getSettings, updateSettings, uploadFile, deleteFile } from '@/lib/api/services';
import { useDirection } from '@/components/providers/DirectionProvider';
import { getLocaleDisplayName } from '@/components/ported/lib/i18n';
import { bannerPatterns } from '@/components/ported/lib/mockData';

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
} from '@/components/ported/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ported/ui/dropdown-menu';
import { Save, Globe, Upload, X, Calendar, Clock, Plus, Image, MessageSquare, Trash2, Check, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import type { BusinessProfile } from '@/types/admin';

// Banner Image Preview Component with Video Support
function BannerImagePreview({ 
  uploadUrl, 
  videoUrl,
  position,
  onRemove,
  onVideoChange,
  onPositionChange
}: { 
  uploadUrl: string; 
  videoUrl?: string;
  position?: { x: number; y: number };
  onRemove: () => void;
  onVideoChange: (videoUrl: string) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
}) {
  const { t } = useLocale();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number }>(
    position || { x: 50, y: 50 }
  );

  // Update position when prop changes
  useEffect(() => {
    if (position) {
      setCurrentPosition(position);
    }
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onPositionChange || !containerRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      
      const newPosition = {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
      
      setCurrentPosition(newPosition);
      onPositionChange(newPosition);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const objectPosition = `${currentPosition.x}% ${currentPosition.y}%`;
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded-none sm:rounded-lg border-2 border-dashed bg-muted cursor-move"
      onMouseDown={handleMouseDown}
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          style={{ objectPosition }}
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
          style={{ objectPosition }}
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
      {onPositionChange && (
        <div className="absolute bottom-2 right-2 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
          {t('settings.dragToReposition')}
        </div>
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
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ logo?: boolean; banner?: boolean; video?: boolean }>({});
  const [canCustomBranding, setCanCustomBranding] = useState(true); // Default to true to avoid blocking
  const [canUseWhatsApp, setCanUseWhatsApp] = useState(true); // Default to true to avoid blocking
  const [canUseMultiLanguage, setCanUseMultiLanguage] = useState(true); // Default to true to avoid blocking
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
          guestMessage: '',
          loggedInMessage: '',
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

  // Update CSS variable when theme color changes
  useEffect(() => {
    if (!mounted || !settings?.branding?.themeColor) return;
    
    const hsl = hexToHsl(settings.branding.themeColor);
    const root = document.documentElement;
    
    // Update --primary CSS variable
    root.style.setProperty('--primary', hsl);
    
    // Also update related primary variables for consistency
    const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v));
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--primary-glow', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
    root.style.setProperty('--ring', hsl);
    
    // Update sidebar primary color
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);
    root.style.setProperty('--sidebar-accent-foreground', hsl);
  }, [settings?.branding?.themeColor, mounted]);

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
            guestMessage: '',
            loggedInMessage: '',
          };
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
            guestMessage: '',
            loggedInMessage: '',
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
    ]).then(([brandingData, whatsappData, languageData]) => {
      if (brandingData.success) {
        setCanCustomBranding(brandingData.canPerform);
      }
      if (whatsappData.success) {
        setCanUseWhatsApp(whatsappData.canPerform);
      }
      if (languageData.success) {
        setCanUseMultiLanguage(languageData.canPerform);
      }
    }).catch(error => {
      console.error('Error checking features:', error);
      // Default to true if check fails to avoid blocking unnecessarily
    });
  }, []);

  const handleSave = async () => {
    try {
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
      toast.success(t('settings.savedSuccessfully') || 'Settings saved successfully');
      // Trigger a custom event to notify other components of settings change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save settings');
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
      
      // Trigger event to update sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
      toast.success('Logo uploaded successfully');
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
      
      // Trigger event to update sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
      toast.success('Logo removed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove logo');
    }
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

  return (
    <div>
      <PageHeader title={t('settings.title')} />

      <div className="space-y-6">
        {/* Business Profile */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.businessProfile')}</h3>
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
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, phone: e.target.value } as BusinessProfile,
                  })
                }
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
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, whatsapp: e.target.value } as BusinessProfile,
                  });
                }}
                disabled={!canUseWhatsApp}
                title={!canUseWhatsApp ? 'Your plan doesn\'t allow WhatsApp integration. Please upgrade to continue.' : ''}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.address')}</label>
              <Textarea
                value={settings.businessProfile.address}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, address: e.target.value } as BusinessProfile,
                  })
                }
                rows={3}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
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
        </Card>

        {/* Branding */}
        <Card className={`p-6 shadow-card ${!canCustomBranding ? 'opacity-60' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.bookingPageAppearance')}</h3>
            {!canCustomBranding && (
              <span className="text-xs text-muted-foreground">(Upgrade required)</span>
            )}
          </div>
          <div className="space-y-6">
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.logo')}</label>
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
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.themeColor')}</label>
              
              {/* Hex Color Input */}
              <div className="flex gap-2 items-center mb-3">
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                  <Input
                    type="text"
                    value={mounted ? settings.branding.themeColor.replace('#', '') : '0EA5E9'}
                    disabled={!canCustomBranding}
                    onChange={(e) => {
                      if (!canCustomBranding) {
                        toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
                        return;
                      }
                      let value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                      if (value.length > 6) value = value.substring(0, 6);
                      const newColor = value.length === 6 ? `#${value}` : (value.length > 0 ? `#${value}` : settings.branding.themeColor);
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, themeColor: newColor },
                      });
                      // Immediately update CSS variable for preview (only if valid 6-digit hex)
                      if (value.length === 6) {
                        const hsl = hexToHsl(newColor);
                        const root = document.documentElement;
                        root.style.setProperty('--primary', hsl);
                        const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v));
                        root.style.setProperty('--primary-glow', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
                        root.style.setProperty('--ring', hsl);
                        root.style.setProperty('--sidebar-primary', hsl);
                        root.style.setProperty('--sidebar-ring', hsl);
                        root.style.setProperty('--sidebar-accent-foreground', hsl);
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      let value = pastedText.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                      // Remove # if present
                      value = value.replace('#', '');
                      if (value.length > 6) value = value.substring(0, 6);
                      const newColor = value.length === 6 ? `#${value}` : (value.length > 0 ? `#${value}` : settings.branding.themeColor);
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, themeColor: newColor },
                      });
                      // Immediately update CSS variable for preview (only if valid 6-digit hex)
                      if (value.length === 6) {
                        const hsl = hexToHsl(newColor);
                        const root = document.documentElement;
                        root.style.setProperty('--primary', hsl);
                        const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v));
                        root.style.setProperty('--primary-glow', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
                        root.style.setProperty('--ring', hsl);
                        root.style.setProperty('--sidebar-primary', hsl);
                        root.style.setProperty('--sidebar-ring', hsl);
                        root.style.setProperty('--sidebar-accent-foreground', hsl);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow backspace, delete, arrow keys, tab, and all Ctrl/Cmd combinations (for copy/paste/cut/select all)
                      if (
                        e.key === 'Backspace' || 
                        e.key === 'Delete' || 
                        e.key.startsWith('Arrow') || 
                        e.key === 'Tab' ||
                        e.key === 'Enter' ||
                        (e.ctrlKey || e.metaKey) // Allow all Ctrl/Cmd combinations (Ctrl+V, Ctrl+C, etc.)
                      ) {
                        return;
                      }
                      // Allow only hex characters
                      if (!/^[0-9A-Fa-f]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="0EA5E9"
                    maxLength={6}
                    className={`pl-8 font-mono ${isRTL ? 'text-right' : 'text-left'}`}
                    readOnly={!mounted}
                  />
                </div>
                <div
                  className="w-40 h-10 rounded border-2 border-border flex-shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: mounted ? settings.branding.themeColor : '#0EA5E9',
                  }}
                >
                  <span className="text-xs text-white/90 font-medium px-2 text-center leading-tight whitespace-nowrap">
                    {isRTL ? 'הזן קוד HEX' : 'Replace with HEX color'}
                  </span>
                </div>
              </div>

              {/* Predefined Color Options */}
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Blue', color: '#0EA5E9' },
                  { name: 'Pink', color: '#EC4899' },
                  { name: 'Purple', color: '#A855F7' },
                  { name: 'Green', color: '#10B981' },
                  { name: 'Yellow', color: '#F59E0B' },
                  { name: 'Orange', color: '#F97316' },
                  { name: 'Red', color: '#EF4444' },
                  { name: 'Indigo', color: '#6366F1' },
                  { name: 'Teal', color: '#14B8A6' },
                  { name: 'Cyan', color: '#06B6D4' },
                  { name: 'Rose', color: '#F43F5E' },
                  { name: 'Black', color: '#1F2937' },
                ].map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => {
                      const newColor = preset.color;
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, themeColor: newColor },
                      });
                      // Immediately update CSS variable for preview
                      const hsl = hexToHsl(newColor);
                      const root = document.documentElement;
                      root.style.setProperty('--primary', hsl);
                      const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v));
                      root.style.setProperty('--primary-glow', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
                      root.style.setProperty('--ring', hsl);
                      root.style.setProperty('--sidebar-primary', hsl);
                      root.style.setProperty('--sidebar-ring', hsl);
                      root.style.setProperty('--sidebar-accent-foreground', hsl);
                    }}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-md ${
                      mounted && settings.branding.themeColor === preset.color
                        ? 'border-foreground ring-2 ring-primary ring-offset-2'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                    disabled={!mounted}
                  />
                ))}
              </div>
            </div>

            {/* Banner Cover */}
            <div className="pt-4 border-t">
              <label className={`text-sm font-medium mb-4 block ${isRTL ? 'text-right' : 'text-left'}`}>
                <span className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  {t('settings.bannerCover')}
                </span>
              </label>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={settings.branding.bannerCover?.type === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (!canCustomBranding) {
                        toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
                        return;
                      }
                      setSettings({
                        ...settings,
                        branding: {
                          ...settings.branding,
                          bannerCover: { 
                            type: 'upload' as const, 
                            uploadUrl: settings.branding.bannerCover?.uploadUrl || '',
                            videoUrl: settings.branding.bannerCover?.videoUrl || '',
                            position: settings.branding.bannerCover?.position || { x: 50, y: 50 },
                          },
                        },
                      });
                    }}
                    disabled={!canCustomBranding}
                    title={!canCustomBranding ? 'Your plan doesn\'t allow custom branding. Please upgrade to continue.' : ''}
                  >
                    {t('settings.uploadBanner')}
                  </Button>
                  <Button
                    type="button"
                    variant={settings.branding.bannerCover?.type === 'pattern' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (!canCustomBranding) {
                        toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
                        return;
                      }
                      setSettings({
                        ...settings,
                        branding: {
                          ...settings.branding,
                          bannerCover: { type: 'pattern' as const, patternId: settings.branding.bannerCover?.patternId || 'pattern1' },
                        },
                      });
                    }}
                    disabled={!canCustomBranding}
                    title={!canCustomBranding ? 'Your plan doesn\'t allow custom branding. Please upgrade to continue.' : ''}
                  >
                    {t('settings.choosePattern')}
                  </Button>
                </div>

                {settings.branding.bannerCover?.type === 'upload' && (
                  <div className="space-y-2 -mx-6 sm:-mx-6 lg:-mx-8 first:mt-0">
                    {settings.branding.bannerCover?.uploadUrl ? (
                      <BannerImagePreview
                        uploadUrl={settings.branding.bannerCover.uploadUrl}
                        videoUrl={settings.branding.bannerCover.videoUrl}
                        position={settings.branding.bannerCover.position}
                        onPositionChange={async (newPosition) => {
                          const updatedSettings = {
                            ...settings,
                            branding: {
                              ...settings.branding,
                              bannerCover: {
                                ...settings.branding.bannerCover!,
                                position: newPosition,
                              },
                            },
                          };
                          setSettings(updatedSettings);
                          // Auto-save position change
                          try {
                            await updateSettings(updatedSettings);
                          } catch (error) {
                            console.error('Failed to save banner position:', error);
                          }
                        }}
                        onRemove={async () => {
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
                            toast.success('Banner removed');
                          } catch (error: any) {
                            console.error('Remove banner error:', error);
                            toast.error('Failed to remove banner');
                          }
                        }}
                        onVideoChange={async (videoUrl) => {
                          try {
                            // If removing video, delete from storage
                            if (!videoUrl && settings.branding.bannerCover?.videoUrl) {
                              const oldVideoUrl = settings.branding.bannerCover.videoUrl;
                              if (!oldVideoUrl.startsWith('data:')) {
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
                            }
                            
                            const updatedSettings = {
                              ...settings,
                              branding: {
                                ...settings.branding,
                                bannerCover: {
                                  type: 'upload' as const,
                                  uploadUrl: settings.branding.bannerCover?.uploadUrl || '',
                                  videoUrl: videoUrl,
                                },
                              },
                            };
                            setSettings(updatedSettings);
                            
                            // Save immediately when video is uploaded/removed
                            await updateSettings(updatedSettings);
                            
                            // Trigger event to update front-end
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('settingsUpdated'));
                            }
                            if (videoUrl) {
                              toast.success(t('settings.videoSaved') || 'Video saved successfully');
                            } else {
                              toast.success(t('settings.videoRemoved') || 'Video removed successfully');
                            }
                          } catch (error: any) {
                            console.error('Video change error:', error);
                            toast.error(error?.message || t('settings.saveError') || 'Failed to save video');
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-32 border-2 border-dashed rounded-lg bg-muted flex items-center justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('banner-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t('settings.uploadBannerImage')}
                        </Button>
                        <input
                          id="banner-upload"
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setUploading({ ...uploading, banner: true });
                                
                                // Delete old banner if it exists and is from Supabase Storage
                                const oldBannerUrl = settings.branding.bannerCover?.uploadUrl;
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
                                
                                // Upload to Supabase Storage
                                const result = await uploadFile(file, 'banner-image');
                                
                                if (result.error || !result.url) {
                                  throw new Error(result.error || 'Failed to upload banner');
                                }
                                
                                const updatedSettings = {
                                  ...settings,
                                  branding: {
                                    ...settings.branding,
                                    bannerCover: { 
                                      type: 'upload' as const, 
                                      uploadUrl: result.url,
                                      videoUrl: settings.branding.bannerCover?.videoUrl || '',
                                    },
                                  },
                                };
                                setSettings(updatedSettings);
                                
                                // Auto-save immediately
                                await updateSettings(updatedSettings);
                                toast.success('Banner uploaded successfully');
                              } catch (error: any) {
                                console.error('Banner upload error:', error);
                                toast.error(error?.message || 'Failed to upload banner');
                              } finally {
                                setUploading({ ...uploading, banner: false });
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                )}

                {settings.branding.bannerCover?.type === 'pattern' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {bannerPatterns && bannerPatterns.length > 0 && bannerPatterns.map((pattern) => (
                      <div
                        key={pattern.id}
                        className={`relative h-24 rounded-lg border-2 cursor-pointer transition-all ${
                          settings.branding.bannerCover?.patternId === pattern.id
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          if (!canCustomBranding) {
                            toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
                            return;
                          }
                          setSettings({
                            ...settings,
                            branding: {
                              ...settings.branding,
                              bannerCover: { type: 'pattern' as const, patternId: pattern.id },
                            },
                          });
                        }}
                        style={{
                          cursor: !canCustomBranding ? 'not-allowed' : 'pointer',
                          opacity: !canCustomBranding ? 0.5 : 1,
                          background: pattern.id === 'pattern1' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                                     pattern.id === 'pattern2' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                                     pattern.id === 'pattern3' ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                                     pattern.id === 'pattern4' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' :
                                     'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        }}
                      >
                        {settings.branding.bannerCover?.patternId === pattern.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Guest & Logged-in Messages */}
            <div className="pt-4 border-t space-y-4">
              <div>
                <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t('settings.guestMessage')}
                  </span>
                </label>
                <Textarea
                  value={settings.branding.guestMessage || ''}
                  onChange={(e) => {
                    if (!canCustomBranding) {
                      toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
                      return;
                    }
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, guestMessage: e.target.value },
                    });
                  }}
                  disabled={!canCustomBranding}
                  placeholder={t('settings.guestMessagePlaceholder')}
                  rows={2}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.guestMessageDescription')}
                </p>
              </div>
              <div>
                <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t('settings.loggedInMessage')}
                  </span>
                </label>
                <Textarea
                  value={settings.branding.loggedInMessage || ''}
                  onChange={(e) => {
                    if (!canCustomBranding) {
                      toast.error('Your plan doesn\'t allow custom branding. Please upgrade to continue.');
                      return;
                    }
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, loggedInMessage: e.target.value },
                    });
                  }}
                  disabled={!canCustomBranding}
                  placeholder={t('settings.loggedInMessagePlaceholder')}
                  rows={2}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.loggedInMessageDescription')}
                </p>
              </div>
            </div>
            
            {/* Social Media Links */}
            <div className="pt-4 border-t">
              <h4 className={`text-base font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.socialLinks')}</h4>
              <div className={`flex items-center justify-end mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={isRTL ? 'flex-row-reverse' : ''}>
                      <Plus className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                      {t('settings.addSocialLink')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? 'end' : 'start'}>
                    {settings.businessProfile.socialLinks?.facebook === undefined && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                facebook: '',
                              },
                            },
                          });
                        }}
                      >
                        <span className={isRTL ? 'ml-2' : 'mr-2'}>📘</span>
                        {t('settings.facebook')}
                      </DropdownMenuItem>
                    )}
                    {settings.businessProfile.socialLinks?.instagram === undefined && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                instagram: '',
                              },
                            },
                          });
                        }}
                      >
                        <span className={isRTL ? 'ml-2' : 'mr-2'}>📷</span>
                        {t('settings.instagram')}
                      </DropdownMenuItem>
                    )}
                    {settings.businessProfile.socialLinks?.twitter === undefined && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                twitter: '',
                              },
                            },
                          });
                        }}
                      >
                        <span className={isRTL ? 'ml-2' : 'mr-2'}>🐦</span>
                        {t('settings.twitter')}
                      </DropdownMenuItem>
                    )}
                    {settings.businessProfile.socialLinks?.tiktok === undefined && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                tiktok: '',
                              },
                            },
                          });
                        }}
                      >
                        <span className={isRTL ? 'ml-2' : 'mr-2'}>🎵</span>
                        {t('settings.tiktok')}
                      </DropdownMenuItem>
                    )}
                    {settings.businessProfile.socialLinks?.linkedin === undefined && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                linkedin: '',
                              },
                            },
                          });
                        }}
                      >
                        <span className={isRTL ? 'ml-2' : 'mr-2'}>💼</span>
                        {t('settings.linkedin')}
                      </DropdownMenuItem>
                    )}
                    {settings.businessProfile.socialLinks?.youtube === undefined && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                youtube: '',
                              },
                            },
                          });
                        }}
                      >
                        <span className={isRTL ? 'ml-2' : 'mr-2'}>📺</span>
                        {t('settings.youtube')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className={`text-xs text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('settings.socialLinksDescription')}
              </p>
              
              <div className="space-y-4">
                {settings.businessProfile.socialLinks?.facebook !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span>📘</span>
                          {t('settings.facebook')}
                        </span>
                      </label>
                      <Input
                        value={settings.businessProfile.socialLinks.facebook}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                facebook: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="https://facebook.com/yourpage"
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          businessProfile: {
                            ...settings.businessProfile,
                              socialLinks: (() => {
                                const current = settings.businessProfile.socialLinks || {};
                                const updated = { ...current, facebook: undefined };
                                const hasOthers = updated.instagram || updated.twitter || updated.tiktok || updated.linkedin || updated.youtube;
                                return hasOthers ? updated : undefined;
                              })(),
                          },
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {settings.businessProfile.socialLinks?.instagram !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span>📷</span>
                          {t('settings.instagram')}
                        </span>
                      </label>
                      <Input
                        value={settings.businessProfile.socialLinks.instagram}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                instagram: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="https://instagram.com/yourpage"
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          businessProfile: {
                            ...settings.businessProfile,
                              socialLinks: (() => {
                                const current = settings.businessProfile.socialLinks || {};
                                const updated = { ...current, instagram: undefined };
                                const hasOthers = updated.facebook || updated.twitter || updated.tiktok || updated.linkedin || updated.youtube;
                                return hasOthers ? updated : undefined;
                              })(),
                          },
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {settings.businessProfile.socialLinks?.twitter !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span>🐦</span>
                          {t('settings.twitter')}
                        </span>
                      </label>
                      <Input
                        value={settings.businessProfile.socialLinks.twitter}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                twitter: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="https://twitter.com/yourpage"
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          businessProfile: {
                            ...settings.businessProfile,
                              socialLinks: (() => {
                                const current = settings.businessProfile.socialLinks || {};
                                const updated = { ...current, twitter: undefined };
                                const hasOthers = updated.facebook || updated.instagram || updated.tiktok || updated.linkedin || updated.youtube;
                                return hasOthers ? updated : undefined;
                              })(),
                          },
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {settings.businessProfile.socialLinks?.tiktok !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span>🎵</span>
                          {t('settings.tiktok')}
                        </span>
                      </label>
                      <Input
                        value={settings.businessProfile.socialLinks.tiktok}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                tiktok: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="https://tiktok.com/@yourpage"
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          businessProfile: {
                            ...settings.businessProfile,
                              socialLinks: (() => {
                                const current = settings.businessProfile.socialLinks || {};
                                const updated = { ...current, tiktok: undefined };
                                const hasOthers = updated.facebook || updated.instagram || updated.twitter || updated.linkedin || updated.youtube;
                                return hasOthers ? updated : undefined;
                              })(),
                          },
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {settings.businessProfile.socialLinks?.linkedin !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span>💼</span>
                          {t('settings.linkedin')}
                        </span>
                      </label>
                      <Input
                        value={settings.businessProfile.socialLinks.linkedin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                linkedin: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="https://linkedin.com/company/yourpage"
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          businessProfile: {
                            ...settings.businessProfile,
                              socialLinks: (() => {
                                const current = settings.businessProfile.socialLinks || {};
                                const updated = { ...current, linkedin: undefined };
                                const hasOthers = updated.facebook || updated.instagram || updated.twitter || updated.tiktok || updated.youtube;
                                return hasOthers ? updated : undefined;
                              })(),
                          },
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {settings.businessProfile.socialLinks?.youtube !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span>📺</span>
                          {t('settings.youtube')}
                        </span>
                      </label>
                      <Input
                        value={settings.businessProfile.socialLinks.youtube}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            businessProfile: {
                              ...settings.businessProfile,
                              socialLinks: {
                                ...(settings.businessProfile.socialLinks || {}),
                                youtube: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="https://youtube.com/@yourchannel"
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          businessProfile: {
                            ...settings.businessProfile,
                              socialLinks: (() => {
                                const current = settings.businessProfile.socialLinks || {};
                                const updated = { ...current, youtube: undefined };
                                const hasOthers = updated.facebook || updated.instagram || updated.twitter || updated.tiktok || updated.linkedin;
                                return hasOthers ? updated : undefined;
                              })(),
                          },
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Message Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.contactMessageEnabled')}
              </label>
                <Switch
                  checked={settings.calendar?.contactMessage?.enabled ?? true}
                  onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                      calendar: {
                        ...settings.calendar,
                        contactMessage: {
                          enabled: checked,
                          message: settings.calendar?.contactMessage?.message || '',
                          showPhone: settings.calendar?.contactMessage?.showPhone ?? true,
                          showWhatsApp: settings.calendar?.contactMessage?.showWhatsApp ?? true,
                          },
                        },
                      })
                    }
                        />
                      </div>
              {settings.calendar?.contactMessage?.enabled && (
                <>
                  <div className="mt-4">
                <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('settings.contactMessageText')}
                </label>
                <Textarea
                      value={settings.calendar?.contactMessage?.message || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                          calendar: {
                            ...settings.calendar,
                            contactMessage: {
                              ...settings.calendar?.contactMessage,
                              enabled: settings.calendar?.contactMessage?.enabled ?? true,
                              message: e.target.value,
                              showPhone: settings.calendar?.contactMessage?.showPhone ?? true,
                              showWhatsApp: settings.calendar?.contactMessage?.showWhatsApp ?? true,
                            },
                          },
                        })
                      }
                      rows={3}
                      placeholder={t('settings.contactMessagePlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('settings.contactMessageDescription')}
                      {t('settings.contactMessageHelp') && (
                        <>
                          <br />
                          {t('settings.contactMessageHelp')}
                        </>
                      )}
                </p>
              </div>
                  <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
              <div>
                        <label className={`text-sm font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('settings.showPhoneInContact')}
                </label>
                        <p className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('settings.contactPhoneNote')}
                </p>
              </div>
                        <Switch
                        checked={settings.calendar?.contactMessage?.showPhone ?? true}
                        onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                            calendar: {
                              ...settings.calendar,
                              contactMessage: {
                                ...settings.calendar?.contactMessage,
                                enabled: settings.calendar?.contactMessage?.enabled ?? true,
                                message: settings.calendar?.contactMessage?.message || '',
                                showPhone: checked,
                                showWhatsApp: settings.calendar?.contactMessage?.showWhatsApp ?? true,
                              },
                            },
                          })
                        }
                        />
                      </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('settings.showWhatsAppInContact')}
                        </label>
                        <p className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('settings.contactWhatsAppNote')}
                          </p>
                        </div>
                        <Switch
                        checked={settings.calendar?.contactMessage?.showWhatsApp ?? true}
                        onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                            calendar: {
                              ...settings.calendar,
                              contactMessage: {
                                ...settings.calendar?.contactMessage,
                                enabled: settings.calendar?.contactMessage?.enabled ?? true,
                                message: settings.calendar?.contactMessage?.message || '',
                                showPhone: settings.calendar?.contactMessage?.showPhone ?? true,
                                showWhatsApp: checked,
                              },
                            },
                          })
                        }
                        />
                      </div>
                    </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Language & Localization */}
        <Card className={`p-6 shadow-card ${!canUseMultiLanguage ? 'opacity-60' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.languageAndLocalization')}</h3>
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
        </Card>

        {/* Calendar Settings */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            <Calendar className="w-5 h-5" />
            {t('settings.calendarSettings')}
          </h3>
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
              <Input
                type="time"
                value={settings.calendar?.workingHours?.start || '09:00'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    calendar: {
                      ...settings.calendar,
                      workingHours: {
                        ...settings.calendar?.workingHours,
                        start: e.target.value,
                      },
                    },
                  })
                }
                dir="ltr"
                className={isRTL ? 'text-right' : 'text-left'}
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
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      calendar: {
                        ...settings.calendar,
                        workingHours: {
                          ...settings.calendar?.workingHours,
                          end: e.target.value,
                        },
                      },
                    })
                  }
                  dir="ltr"
                  className={isRTL ? 'text-right' : 'text-left'}
                />
              </div>
            </div>
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

        {/* Notifications */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.notifications')}</h3>
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
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.senderEmail')}</label>
              <Input
                type="email"
                value={settings.notifications.senderEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, senderEmail: e.target.value },
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              />
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
        </Card>

        {/* Reminder Settings */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('settings.reminderSettings') || 'Reminder Settings'}
          </h3>
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
                            ? [...current.filter(d => d !== 1), 1]
                            : current.filter(d => d !== 1);
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
                      <span className="text-sm">1 day before</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications?.reminders?.daysBefore?.includes(2) || false}
                        onChange={(e) => {
                          const current = settings.notifications?.reminders?.daysBefore || [];
                          const updated = e.target.checked
                            ? [...current.filter(d => d !== 2), 2]
                            : current.filter(d => d !== 2);
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
                      <span className="text-sm">2 days before</span>
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
        </Card>

        {/* Google Calendar Sync */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('settings.googleCalendar') || 'Google Calendar Sync'}
          </h3>
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

        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Save className="w-4 h-4" />
            {t('settings.save')}
          </Button>
        </div>
      </div>
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
