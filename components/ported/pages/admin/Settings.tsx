import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/admin/PageHeader';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { getSettings, updateSettings } from '@/components/ported/lib/mockData';
import { useDirection } from '@/components/providers/DirectionProvider';
import { getLocaleDisplayName } from '@/components/ported/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ported/ui/select';
import { Save, Globe, Upload, X, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

type Locale = 'en' | 'he' | 'ar' | 'ru';
const languages: Locale[] = ['en', 'he', 'ar', 'ru'];

const Settings = () => {
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState(() => {
    // Use default value on server to avoid hydration mismatch
    if (typeof window === 'undefined') {
      return {
        businessProfile: { name: '', email: '', phone: '', whatsapp: '', address: '', timezone: 'Asia/Jerusalem', currency: 'ILS' as const },
        branding: { logoUrl: '', themeColor: '#0EA5E9' },
        locale: { language: 'en' as const, rtl: false },
        notifications: { senderName: '', senderEmail: '' },
        calendar: {
          weekStartDay: 0,
          workingDays: [0, 1, 2, 3, 4],
          workingHours: { start: '09:00', end: '18:00' },
        },
      };
    }
    return getSettings();
  });

  // Load settings from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const loadedSettings = getSettings();
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
    setSettings(loadedSettings);
  }, []);

  const handleSave = () => {
    updateSettings(settings);
    toast.success('Settings saved successfully');
    // Trigger a custom event to notify other components of settings change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const logoUrl = event.target?.result as string;
      const updatedSettings = {
        ...settings,
        branding: { logoUrl, themeColor: settings.branding.themeColor },
      };
      setSettings(updatedSettings);
      // Auto-save logo immediately
      updateSettings(updatedSettings);
      // Trigger event to update sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      }
      toast.success('Logo uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    const updatedSettings = {
      ...settings,
      branding: { logoUrl: '', themeColor: settings.branding.themeColor },
    };
    setSettings(updatedSettings);
    // Auto-save removal immediately
    updateSettings(updatedSettings);
    // Trigger event to update sidebar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
    }
    toast.success('Logo removed');
  };

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
                value={settings.businessProfile.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, name: e.target.value },
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
                    businessProfile: { ...settings.businessProfile, email: e.target.value },
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
                    businessProfile: { ...settings.businessProfile, phone: e.target.value },
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.whatsapp')}</label>
              <Input
                value={settings.businessProfile.whatsapp}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, whatsapp: e.target.value },
                  })
                }
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
                    businessProfile: { ...settings.businessProfile, address: e.target.value },
                  })
                }
                rows={3}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.timezone')}</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                value={settings.businessProfile.timezone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, timezone: e.target.value },
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.currency')}</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                value={settings.businessProfile.currency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessProfile: { ...settings.businessProfile, currency: e.target.value },
                  })
                }
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="ILS">ILS (₪)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Branding */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.branding')}</h3>
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
                      >
                        <Upload className="w-4 h-4 me-2" />
                        {t('settings.changeLogo')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveLogo}
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
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={mounted ? settings.branding.themeColor : '#0EA5E9'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { logoUrl: settings.branding.logoUrl || '', themeColor: e.target.value },
                    })
                  }
                  className="w-20 h-10 rounded border cursor-pointer"
                  disabled={!mounted}
                />
                <span className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                  {mounted ? settings.branding.themeColor : '#0EA5E9'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Language & Localization */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.languageAndLocalization')}</h3>
          <div className="space-y-4">
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.language')}</label>
              <LanguageSelect />
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
                <SelectTrigger className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
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
                          : currentDays.filter((d) => d !== day.value);
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
                dir={isRTL ? 'rtl' : 'ltr'}
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
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 shadow-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('settings.notifications')}</h3>
          <div className="grid md:grid-cols-2 gap-4">
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
        </Card>

        <Button onClick={handleSave} size="lg">
          <Save className="w-4 h-4 me-2" />
          {t('settings.save')}
        </Button>
      </div>
    </div>
  );
};

function LanguageSelect() {
  const { locale, setLocale } = useDirection();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale || isChanging) return;
    
    setIsChanging(true);
    
    try {
      // Use DirectionProvider's setLocale which handles cookie and localStorage
      await setLocale(newLocale);
      
      // Show success toast
      toast.success(`Language changed to ${getLocaleDisplayName(newLocale)}`, {
        duration: 2000,
      });
      
      // Fade + scale reload animation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Reload to apply RTL changes
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to change language');
      setIsChanging(false);
    }
  };

  return (
    <Select
      value={locale}
      onValueChange={(value) => handleLanguageChange(value as Locale)}
      disabled={isChanging}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <SelectValue>
            {getLocaleDisplayName(locale)}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
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
