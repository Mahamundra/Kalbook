"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Save, Undo2, Redo2, Loader2, User, UserCircle, Palette, MoreVertical, Pencil, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditHistory } from '@/lib/hooks/useEditHistory';
import { InlineTextEditor } from './InlineTextEditor';
import { ImageEditor } from './ImageEditor';
import { BannerEditor } from './BannerEditor';
import { ThemeColorEditor } from './ThemeColorEditor';
import { TextColorEditor } from './TextColorEditor';
import { LogoShapeEditor } from './LogoShapeEditor';
import { ContactMessageEditor } from './ContactMessageEditor';
import { SocialLinksEditor } from './SocialLinksEditor';
import { LayoutSelector, type LayoutType } from './LayoutSelector';
import { EditSideMenu, MobileEditMenuItems } from './EditSideMenu';
import type { Settings } from '@/lib/types/admin';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { getGreetingMessage, getGuestMessageTemplates } from '@/lib/utils/greetings';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookingPageContent } from '@/app/booking/page';
import { useParams } from 'next/navigation';

interface HomepageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings: Settings;
  businessSlug: string;
  onSave: (settings: Settings) => Promise<void>;
}

type EditingElement = {
  id: string;
  type: 'text' | 'image' | 'color' | 'links' | 'settings' | 'layout';
  position: { top: number; left: number };
} | null;

export function HomepageEditor({
  open,
  onOpenChange,
  initialSettings,
  businessSlug,
  onSave,
}: HomepageEditorProps) {
  const { t, isRTL, locale: adminLocale } = useLocale();
  const { dir } = useDirection();
  const isMobile = useIsMobile();
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [editingElement, setEditingElement] = useState<EditingElement>(null);
  const [viewAsGuest, setViewAsGuest] = useState(true); // Toggle between guest and logged-in view
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop'); // Toggle between desktop and mobile view
  const [showImageEditor, setShowImageEditor] = useState<{
    type: 'logo' | 'banner-image' | 'banner-video';
    currentUrl?: string;
  } | null>(null);
  const [showSideMenu, setShowSideMenu] = useState(!isMobile); // Closed by default on mobile
  const [dropdownOpen, setDropdownOpen] = useState(false); // Controlled dropdown state
  const [showEditMenuSheet, setShowEditMenuSheet] = useState(false); // Mobile sheet state
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [showThemeColorEditor, setShowThemeColorEditor] = useState(false);
  const [showTextColorEditor, setShowTextColorEditor] = useState(false);
  const [showLogoShapeEditor, setShowLogoShapeEditor] = useState(false);
  const [showContactMessageEditor, setShowContactMessageEditor] = useState(false);
  const [showSocialLinksEditor, setShowSocialLinksEditor] = useState(false);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [guestMessageUseCustom, setGuestMessageUseCustom] = useState(false);
  const [guestMessageTemplate, setGuestMessageTemplate] = useState<string>('');
  const [guestMessageCustomText, setGuestMessageCustomText] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Update side menu state when mobile state changes
  useEffect(() => {
    if (!isMobile) {
      setShowSideMenu(true); // Open by default on desktop
    } else {
      setShowSideMenu(false); // Closed by default on mobile
    }
  }, [isMobile]);

  const history = useEditHistory(initialSettings);

  // Update settings when history changes
  useEffect(() => {
    if (!history.isUndoing()) {
      setSettings(history.currentSettings);
    }
  }, [history.currentSettings]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings, initialSettings]);

  const handleElementClick = (e: MouseEvent) => {
    if (!open) return;

    const target = e.target as HTMLElement;
    const editId = target.getAttribute('data-edit-id') || 
                   target.closest('[data-edit-id]')?.getAttribute('data-edit-id');
    const editType = target.getAttribute('data-edit-type') || 
                     target.closest('[data-edit-type]')?.getAttribute('data-edit-type') as 'text' | 'image' | 'color' | 'links' | 'settings';

    if (editId && editType && (editType === 'text' || editType === 'image' || editType === 'color' || editType === 'links' || editType === 'settings')) {
      const element = document.querySelector(`[data-edit-id="${editId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Initialize guest message state if editing guest message
        if (editId === 'guest-message') {
          const currentMessage = settings.branding?.guestMessage || '';
          const templates = getGuestMessageTemplates(adminLocale);
          
          // Check if current message matches a template (compare text content, ignoring HTML)
          const currentMessageText = currentMessage.replace(/<[^>]*>/g, '').trim();
          const matchingTemplate = templates.find(t => {
            const templateText = t.value.replace(/<[^>]*>/g, '').trim();
            return templateText === currentMessageText || t.value === currentMessage;
          });
          if (matchingTemplate) {
            setGuestMessageUseCustom(false);
            setGuestMessageTemplate(matchingTemplate.id);
            setGuestMessageCustomText('');
          } else if (currentMessage) {
            // Has custom text
            setGuestMessageUseCustom(true);
            setGuestMessageTemplate('');
            setGuestMessageCustomText(currentMessage);
          } else {
            // No message set, default to first template
            setGuestMessageUseCustom(false);
            setGuestMessageTemplate(templates[0]?.id || '');
            setGuestMessageCustomText('');
          }
        }
        
        setEditingElement({
          id: editId,
          type: editType as 'text' | 'image',
          position: {
            top: rect.top + window.scrollY + rect.height / 2,
            left: rect.left + window.scrollX + rect.width / 2,
          },
        });
      }
    }
  };

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        document.addEventListener('click', handleElementClick);
      }, 100);
      return () => {
        document.removeEventListener('click', handleElementClick);
      };
    }
  }, [open]);

  const handleTextSave = (elementId: string, value: string) => {
    let updatedSettings = { ...settings };

    switch (elementId) {
      case 'guest-message':
        // If using template, use template value; otherwise use custom text
        const guestMessageValue = guestMessageUseCustom 
          ? value 
          : (guestMessageTemplate || value);
        updatedSettings.branding = {
          ...updatedSettings.branding,
          guestMessage: guestMessageValue,
        };
        // Reset state
        setGuestMessageUseCustom(false);
        setGuestMessageTemplate('');
        setGuestMessageCustomText('');
        break;
      case 'logged-in-message':
        updatedSettings.branding = {
          ...updatedSettings.branding,
          loggedInMessage: value,
        };
        break;
    }

    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setEditingElement(null);
  };

  const handleImageSave = (url: string) => {
    // Logo editing removed - use Settings > Business Profile instead
    setShowImageEditor(null);
  };

  const handleBannerSave = (banner: {
    type: 'upload' | 'pattern';
    uploadUrl?: string;
    videoUrl?: string;
    posterUrl?: string;
    patternId?: string;
    position?: { x: number; y: number };
  }) => {
    let updatedSettings = { ...settings };
    updatedSettings.branding = {
      ...updatedSettings.branding,
      bannerCover: banner,
    };
    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowBannerEditor(false);
  };

  const handleThemeColorSave = (color: string) => {
    let updatedSettings = { ...settings };
    updatedSettings.branding = {
      ...updatedSettings.branding,
      themeColor: color,
    };
    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowThemeColorEditor(false);
  };

  const handleTextColorSave = (color: 'white' | 'black') => {
    let updatedSettings = { ...settings };
    updatedSettings.branding = {
      ...updatedSettings.branding,
      textColor: color,
    };
    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowTextColorEditor(false);
  };

  const handleLogoShapeSave = (shape: 'circle' | 'square') => {
    let updatedSettings = { ...settings };
    updatedSettings.branding = {
      ...updatedSettings.branding,
      logoShape: shape,
    };
    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowLogoShapeEditor(false);
  };

  const handleContactMessageSave = (contactSettings: {
    enabled: boolean;
    message: string;
    contacts: Array<{
      id: string;
      type: 'phone' | 'whatsapp' | 'email';
      value: string;
      visible: boolean;
    }>;
  }) => {
    let updatedSettings = { ...settings };
    updatedSettings.calendar = {
      ...updatedSettings.calendar,
      contactMessage: {
        enabled: contactSettings.enabled,
        message: contactSettings.message,
        contacts: contactSettings.contacts,
      } as any,
    };
    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowContactMessageEditor(false);
  };

  const handleSocialLinksSave = (links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
    youtube?: string;
  }) => {
    let updatedSettings = { ...settings };
    updatedSettings.businessProfile = {
      ...updatedSettings.businessProfile,
      socialLinks: Object.keys(links).length > 0 ? links : undefined,
    };
    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowSocialLinksEditor(false);
  };

  const handleLayoutChange = (layout: LayoutType) => {
    let updatedSettings = { ...settings };
    updatedSettings.branding = {
      ...updatedSettings.branding,
      layout: layout,
    };
    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowLayoutSelector(false);
  };

  const handleImageRemove = () => {
    let updatedSettings = { ...settings };

    if (showImageEditor?.type === 'banner-image' || showImageEditor?.type === 'banner-video') {
      updatedSettings.branding = {
        ...updatedSettings.branding,
        bannerCover: {
          type: 'pattern',
          patternId: 'pattern1',
        },
      };
      setSettings(updatedSettings);
      history.pushToHistory(updatedSettings);
    }
    // Logo editing removed - use Settings > Business Profile instead

    setShowImageEditor(null);
  };

  const handleUndo = () => {
    const previousSettings = history.undo();
    if (previousSettings) {
      setSettings(previousSettings);
    }
  };

  const handleRedo = () => {
    const nextSettings = history.redo();
    if (nextSettings) {
      setSettings(nextSettings);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(settings);
      history.reset(settings);
      setHasUnsavedChanges(false);
      toast.success(t('settings.homepageEditor.saveSuccess') || 'Homepage saved successfully');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error?.message || t('settings.homepageEditor.saveError') || 'Failed to save homepage');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      performCancel();
    }
  };

  const performCancel = () => {
    setSettings(initialSettings);
    history.reset(initialSettings);
    setEditingElement(null);
    setShowImageEditor(null);
    setHasUnsavedChanges(false);
    setShowCancelDialog(false);
    onOpenChange(false);
  };

  const getElementValue = (elementId: string): string => {
    const currentLocale = (settings.locale?.language || 'en') as 'en' | 'he' | 'ar' | 'ru';
    switch (elementId) {
      case 'guest-message':
        return getGreetingMessage(settings.branding?.guestMessage, currentLocale, false);
      case 'logged-in-message':
        return getGreetingMessage(settings.branding?.loggedInMessage, currentLocale, true);
      default:
        return '';
    }
  };

  const getImageUrl = (elementId: string): string | undefined => {
    if (elementId === 'banner') {
      return settings.branding?.bannerCover?.uploadUrl || settings.branding?.bannerCover?.videoUrl;
    }
    return undefined;
  };

  // Map sidebar item IDs to data-edit-id values on the page
  const getElementSelector = (elementId: string): string | null => {
    const mapping: Record<string, string> = {
      'logo': 'logo',
      'logo-shape': 'logo',
      'banner': 'banner',
      'guest-message': 'guest-message',
      'logged-in-message': 'logged-in-message',
      'contact-message-settings': 'contact-message',
      'business-name': 'business-name',
    };
    return mapping[elementId] || null;
  };

  // Scroll to element on the page
  const scrollToElement = (elementId: string) => {
    const selector = getElementSelector(elementId);
    if (!selector) return;

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      // Try to find element within the editor container first
      const container = containerRef.current;
      const element = container 
        ? container.querySelector(`[data-edit-id="${selector}"]`)
        : document.querySelector(`[data-edit-id="${selector}"]`);
      
      if (element) {
        // Calculate position relative to container
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);
          
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        } else {
          // Fallback to window scroll
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
        
        // Add a temporary highlight effect
        const htmlElement = element as HTMLElement;
        htmlElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'rounded');
        setTimeout(() => {
          htmlElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'rounded');
        }, 2000);
      }
    }, 150);
  };

  const handleMenuEdit = (elementId: string, elementType: 'text' | 'image' | 'color' | 'links' | 'settings' | 'layout') => {
    // Switch view when clicking on guest or logged-in message
    if (elementId === 'guest-message') {
      setViewAsGuest(true);
      // Initialize guest message state
      const currentMessage = settings.branding?.guestMessage || '';
      const templates = getGuestMessageTemplates(adminLocale);
      
      // Check if current message matches a template (compare text content, ignoring HTML)
      const currentMessageText = currentMessage.replace(/<[^>]*>/g, '').trim();
      const matchingTemplate = templates.find(t => {
        const templateText = t.value.replace(/<[^>]*>/g, '').trim();
        return templateText === currentMessageText || t.value === currentMessage;
      });
      if (matchingTemplate) {
        setGuestMessageUseCustom(false);
        setGuestMessageTemplate(matchingTemplate.id);
        setGuestMessageCustomText('');
      } else if (currentMessage) {
        // Has custom text
        setGuestMessageUseCustom(true);
        setGuestMessageTemplate('');
        setGuestMessageCustomText(currentMessage);
      } else {
        // No message set, default to first template
        setGuestMessageUseCustom(false);
        setGuestMessageTemplate(templates[0]?.id || '');
        setGuestMessageCustomText('');
      }
    } else if (elementId === 'logged-in-message') {
      setViewAsGuest(false);
    }

    // Scroll to element if it exists on the page
    scrollToElement(elementId);

    if (elementType === 'image') {
      if (elementId === 'banner') {
        setShowBannerEditor(true);
      }
      // Logo editing removed - use Settings > Business Profile instead
    } else if (elementType === 'color') {
      if (elementId === 'text-color') {
        setShowTextColorEditor(true);
      } else {
        setShowThemeColorEditor(true);
      }
    } else if (elementType === 'links') {
      setShowSocialLinksEditor(true);
    } else if (elementType === 'settings') {
      if (elementId === 'logo-shape') {
        setShowLogoShapeEditor(true);
      } else {
        setShowContactMessageEditor(true);
      }
    } else if (elementType === 'layout') {
      setShowLayoutSelector(true);
    } else {
      setEditingElement({
        id: elementId,
        type: 'text',
        position: { top: 0, left: 0 },
      });
    }
  };

  const businessName = settings.businessProfile?.name || '';
  const logoUrl = settings.branding?.logoUrl;
  const themeColor = settings.branding?.themeColor || '#0EA5E9';
  const textColor = settings.branding?.textColor || 'black';

  // Apply theme color and text color to preview
  useEffect(() => {
    if (open) {
      const root = document.documentElement;
      
      if (themeColor) {
        const hsl = hexToHsl(themeColor);
        const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v));
        root.style.setProperty('--booking-primary', hsl);
        root.style.setProperty('--booking-primary-foreground', '0 0% 100%');
        root.style.setProperty('--booking-primary-glow', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
        root.style.setProperty('--booking-ring', hsl);
      }
      
      // Apply text color
      if (textColor === 'white') {
        root.style.setProperty('--booking-text-color', '0 0% 100%');
      } else {
        root.style.setProperty('--booking-text-color', '0 0% 0%');
      }
    }
  }, [open, themeColor, textColor]);

  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

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

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  if (!open) return null;

  return (
    <>
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-card px-2 sm:px-4 py-2 sm:py-3">
        {/* Top row: Unsaved changes message centered */}
        {hasUnsavedChanges && (
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('settings.homepageEditor.unsavedChanges') || 'Unsaved changes'}
              </span>
              {isRTL ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleRedo}
                    disabled={!history.canRedo}
                    title={t('settings.homepageEditor.redo') || 'Redo (Ctrl+Y)'}
                  >
                    <Redo2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleUndo}
                    disabled={!history.canUndo}
                    title={t('settings.homepageEditor.undo') || 'Undo (Ctrl+Z)'}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleUndo}
                    disabled={!history.canUndo}
                    title={t('settings.homepageEditor.undo') || 'Undo (Ctrl+Z)'}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleRedo}
                    disabled={!history.canRedo}
                    title={t('settings.homepageEditor.redo') || 'Redo (Ctrl+Y)'}
                  >
                    <Redo2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          {/* Title and menu button row */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">
                {t('settings.homepageEditor.title') || 'Edit Homepage'}
              </h2>
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Mobile: Primary actions only */}
            {isMobile ? (
              <>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => setViewMode('desktop')}
                    title={t('settings.homepageEditor.desktopView') || 'Desktop View'}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => setViewMode('mobile')}
                    title={t('settings.homepageEditor.mobileView') || 'Mobile View'}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none min-h-[44px]"
                  onClick={handleCancel}
                >
                  {t('settings.homepageEditor.cancel') || 'Cancel'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 sm:flex-none min-h-[44px]"
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span className="hidden sm:inline">{t('settings.homepageEditor.saving') || 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t('settings.homepageEditor.save') || 'Save'}</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none min-h-[44px]"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowEditMenuSheet(true);
                  }}
                  aria-label="Edit menu"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('settings.homepageEditor.editMenu') || 'Edit Menu'}</span>
                </Button>
                {/* Mobile: Secondary actions in dropdown */}
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="z-[10001]">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        // Don't prevent default - let Radix close the dropdown naturally
                        setDropdownOpen(false);
                        // Blur any focused element to prevent aria-hidden focus issues
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        setTimeout(() => {
                          setViewAsGuest(!viewAsGuest);
                        }, 50);
                      }}
                    >
                      {viewAsGuest ? <UserCircle className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
                      {viewAsGuest ? (t('settings.homepageEditor.switchToLoggedIn') || 'Switch to Logged-in View') : (t('settings.homepageEditor.switchToGuest') || 'Switch to Guest View')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Desktop: All buttons visible */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewAsGuest(!viewAsGuest)}
                  title={viewAsGuest ? (t('settings.homepageEditor.switchToLoggedIn') || 'Switch to Logged-in View') : (t('settings.homepageEditor.switchToGuest') || 'Switch to Guest View')}
                >
                  {viewAsGuest ? <UserCircle className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
                  <span className="hidden md:inline">
                    {viewAsGuest ? (t('settings.homepageEditor.viewingAsGuest') || 'Viewing as Guest') : (t('settings.homepageEditor.viewingAsLoggedIn') || 'Viewing as Logged-in User')}
                  </span>
                </Button>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode('desktop')}
                    title={t('settings.homepageEditor.desktopView') || 'Desktop View'}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode('mobile')}
                    title={t('settings.homepageEditor.mobileView') || 'Mobile View'}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  {t('settings.homepageEditor.cancel') || 'Cancel'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('settings.homepageEditor.saving') || 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('settings.homepageEditor.save') || 'Save'}
                    </>
                  )}
                </Button>
                {isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSideMenu(true)}
                    title={t('settings.homepageEditor.editMenu') || 'Edit Menu'}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('settings.homepageEditor.editMenu') || 'Edit Menu'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Content Area with Side Menu */}
      <div className="flex-1 flex overflow-hidden">
        {/* Side Menu - Desktop: Sidebar */}
        {!isMobile && (
          <EditSideMenu
            isOpen={showSideMenu}
            onToggle={() => setShowSideMenu(!showSideMenu)}
            onEdit={handleMenuEdit}
          />
        )}
        
        {/* Content Area - Full width on mobile when menu is closed */}
        <div 
          ref={containerRef} 
          className={cn(
            "flex-1 overflow-auto relative transition-all duration-300",
            !isMobile && showSideMenu && "transition-all duration-300",
            viewMode === 'mobile' && "flex items-center justify-center bg-gray-100 p-8"
          )}
          dir={dir}
        >
          {viewMode === 'mobile' ? (
            /* iPhone 16 Pro Mockup - Wider size, centered */
            <div className="relative w-full h-full flex items-center justify-center py-8">
              <div className="relative mx-auto" style={{ width: '420px', height: '911px' }}>
                {/* Phone Container */}
                <div 
                  className="relative bg-black rounded-[2rem] p-[12px] shadow-2xl w-full h-full"
                  style={{
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                  }}
                >
                  {/* Notch */}
                  <div 
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black rounded-b-lg z-10"
                    style={{ width: '134px', height: '39px' }}
                  />
                  
                  {/* Speaker */}
                  <div 
                    className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full z-10"
                    style={{ width: '48px', height: '2.5px' }}
                  />
                  
                  {/* Screen */}
                  <div 
                    className="relative bg-white rounded-[1.75rem] overflow-hidden w-full h-full"
                  >
                    {/* Screen Content - Booking Page */}
                    <div className="h-full overflow-y-auto">
                      <BookingPageContent editMode={true} editorSettings={settings} editorViewAsGuest={viewAsGuest} {...({} as any)} />
                    </div>
                  </div>
                  
                  {/* Home Indicator (for modern phones) */}
                  <div 
                    className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-400 rounded-full z-10"
                    style={{ width: '107px', height: '2.5px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-full">
              {/* Render actual booking page with editor settings */}
              <BookingPageContent editMode={true} editorSettings={settings} editorViewAsGuest={viewAsGuest} {...({} as any)} />
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.homepageEditor.unsavedChanges') || 'Unsaved Changes'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.homepageEditor.cancelConfirm') || 'You have unsaved changes. Are you sure you want to cancel?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>
              {t('common.keepEditing') || 'Keep Editing'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={performCancel}>
              {t('settings.homepageEditor.cancel') || 'Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

    {/* Text Editor Dialog - Outside main container to avoid z-index issues */}
    {editingElement && editingElement.type === 'text' && (
      <Dialog 
        open={true} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingElement(null);
            // Reset guest message state when closing
            if (editingElement.id === 'guest-message') {
              setGuestMessageUseCustom(false);
              setGuestMessageTemplate('');
              setGuestMessageCustomText('');
            }
          }
        }}
      >
        <DialogContent className={`${editingElement.id === 'guest-message' ? 'max-w-2xl' : 'max-w-md'} z-[10001]`} dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {editingElement.id === 'guest-message'
                ? t('settings.guestMessage') || 'Edit Guest Message'
                : editingElement.id === 'logged-in-message'
                ? t('settings.loggedInMessage') || 'Edit Logged-in Message'
                : t('settings.homepageEditor.editPlaceholder') || 'Edit Text'}
            </DialogTitle>
            <DialogDescription>
              {editingElement.id === 'guest-message'
                ? t('settings.homepageEditor.guestMessageDescription') || 'Choose a template or enter custom text'
                : t('settings.homepageEditor.editPlaceholder') || 'Edit the text content below'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingElement.id === 'guest-message' ? (
              <div className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {t('settings.homepageEditor.selectTemplate') || 'Select a template'}
                  </Label>
                  <RadioGroup
                    value={guestMessageUseCustom ? 'custom' : guestMessageTemplate}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setGuestMessageUseCustom(true);
                        setGuestMessageTemplate('');
                      } else {
                        setGuestMessageUseCustom(false);
                        setGuestMessageTemplate(value);
                        // Set custom text to the selected template value for preview
                        const templates = getGuestMessageTemplates(adminLocale);
                        const selectedTemplate = templates.find(t => t.id === value);
                        if (selectedTemplate) {
                          setGuestMessageCustomText(selectedTemplate.value);
                        }
                      }
                    }}
                    className="space-y-2"
                  >
                    {getGuestMessageTemplates(adminLocale).map((template) => (
                      <div key={template.id} className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value={template.id} id={`template-${template.id}`} />
                        <Label 
                          htmlFor={`template-${template.id}`} 
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {template.label}
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2 space-x-reverse pt-2 border-t">
                      <RadioGroupItem value="custom" id="template-custom" />
                      <Label 
                        htmlFor="template-custom" 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t('settings.homepageEditor.useCustomText') || 'Use custom text'}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Custom Text Editor - Show when custom is selected */}
                {guestMessageUseCustom && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t('settings.homepageEditor.customText') || 'Custom text'}
                    </Label>
                    <InlineTextEditor
                      value={guestMessageCustomText || getElementValue(editingElement.id)}
                      onSave={(value) => {
                        setGuestMessageCustomText(value);
                        handleTextSave(editingElement.id, value);
                        setEditingElement(null);
                      }}
                      onCancel={() => {
                        setEditingElement(null);
                        setGuestMessageUseCustom(false);
                        setGuestMessageTemplate('');
                        setGuestMessageCustomText('');
                      }}
                      multiline={true}
                      placeholder={t('settings.homepageEditor.editPlaceholder') || 'Enter text...'}
                    />
                  </div>
                )}

                {/* Preview and Save button for template selection */}
                {!guestMessageUseCustom && guestMessageTemplate && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('settings.homepageEditor.preview') || 'Preview'}
                      </Label>
                      <div className="p-3 bg-gray-50 rounded-md border border-gray-200 min-h-[60px] flex items-center">
                        <p 
                          className="text-base"
                          dir={isRTL ? 'rtl' : 'ltr'}
                          dangerouslySetInnerHTML={{
                            __html: (() => {
                              const templates = getGuestMessageTemplates(adminLocale);
                              const selectedTemplate = templates.find(t => t.id === guestMessageTemplate);
                              return selectedTemplate?.value || '';
                            })()
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingElement(null);
                          setGuestMessageUseCustom(false);
                          setGuestMessageTemplate('');
                          setGuestMessageCustomText('');
                        }}
                      >
                        {t('common.cancel') || 'Cancel'}
                      </Button>
                      <Button
                        onClick={() => {
                          const templates = getGuestMessageTemplates(adminLocale);
                          const selectedTemplate = templates.find(t => t.id === guestMessageTemplate);
                          if (selectedTemplate) {
                            handleTextSave(editingElement.id, selectedTemplate.value);
                          }
                        }}
                      >
                        {t('common.save') || 'Save'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <InlineTextEditor
                value={getElementValue(editingElement.id)}
                onSave={(value) => {
                  handleTextSave(editingElement.id, value);
                  setEditingElement(null);
                }}
                onCancel={() => setEditingElement(null)}
                multiline={editingElement.id === 'logged-in-message'}
                placeholder={t('settings.homepageEditor.editPlaceholder') || 'Enter text...'}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Image Editor Dialog - Outside main container to avoid z-index issues */}
    {showImageEditor && showImageEditor.type !== 'logo' && (
      <ImageEditor
        open={!!showImageEditor}
        onOpenChange={(open) => !open && setShowImageEditor(null)}
        currentUrl={showImageEditor.currentUrl}
        onSave={handleImageSave}
        onRemove={handleImageRemove}
        title={t('settings.homepageEditor.editBanner') || 'Edit Banner'}
        fileType={showImageEditor.type}
        accept={
          showImageEditor.type === 'banner-video'
            ? 'video/*'
            : 'image/*'
        }
      />
    )}

    {/* Theme Color Editor Dialog - Outside main container to avoid z-index issues */}
    <ThemeColorEditor
      open={showThemeColorEditor}
      onOpenChange={setShowThemeColorEditor}
      currentColor={themeColor}
      onSave={handleThemeColorSave}
    />

    {/* Text Color Editor Dialog - Outside main container to avoid z-index issues */}
    <TextColorEditor
      open={showTextColorEditor}
      onOpenChange={setShowTextColorEditor}
      currentColor={settings.branding?.textColor}
      onSave={handleTextColorSave}
    />

    {/* Logo Shape Editor Dialog - Outside main container to avoid z-index issues */}
    <LogoShapeEditor
      open={showLogoShapeEditor}
      onOpenChange={setShowLogoShapeEditor}
      currentShape={settings.branding?.logoShape}
      onSave={handleLogoShapeSave}
    />

    {/* Banner Editor Dialog - Outside main container to avoid z-index issues */}
    {showBannerEditor && (
      <BannerEditor
        open={showBannerEditor}
        onOpenChange={setShowBannerEditor}
        currentBanner={settings.branding?.bannerCover}
        onSave={handleBannerSave}
        onRemove={() => {
          handleBannerSave({ type: 'pattern', patternId: 'pattern1' });
        }}
      />
    )}

    {/* Contact Message Editor Dialog - Outside main container to avoid z-index issues */}
    {showContactMessageEditor && (
      <ContactMessageEditor
        open={showContactMessageEditor}
        onOpenChange={setShowContactMessageEditor}
        currentSettings={{
          enabled: settings.calendar?.contactMessage?.enabled,
          message: settings.calendar?.contactMessage?.message,
          contacts: (settings.calendar?.contactMessage as any)?.contacts || [],
        }}
        onSave={handleContactMessageSave}
      />
    )}

    {/* Social Links Editor Dialog - Outside main container to avoid z-index issues */}
    {showSocialLinksEditor && (
      <SocialLinksEditor
        open={showSocialLinksEditor}
        onOpenChange={setShowSocialLinksEditor}
        currentLinks={settings.businessProfile?.socialLinks}
        onSave={handleSocialLinksSave}
      />
    )}

    {/* Layout Selector Dialog - Outside main container to avoid z-index issues */}
    <Dialog open={showLayoutSelector} onOpenChange={setShowLayoutSelector}>
      <DialogContent className="sm:max-w-md z-[10001]" dir={dir}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            {t('settings.homepageEditor.selectLayout') || 'Select Layout'}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            {t('settings.homepageEditor.selectLayoutDescription') || 'Choose a layout for your booking page.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <LayoutSelector
            currentLayout={(settings.branding?.layout || 'classic') as LayoutType}
            onLayoutChange={handleLayoutChange}
          />
        </div>
      </DialogContent>
    </Dialog>

    {/* Mobile Edit Menu Sheet - Outside main container for proper rendering */}
    {isMobile && (
      <Sheet open={showEditMenuSheet} onOpenChange={setShowEditMenuSheet}>
        <SheetContent side="bottom" className="!z-[10001] max-h-[80vh] overflow-y-auto" dir={dir}>
          <SheetHeader className="pb-2 px-4 pt-2">
            <SheetTitle className={isRTL ? 'text-right' : 'text-left'}>
              {t('settings.homepageEditor.editMenu') || 'Edit Menu'}
            </SheetTitle>
            <SheetDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('settings.homepageEditor.editMenuDescription') || 'Select an element to edit on your booking page.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <div className="flex flex-col gap-2">
              <MobileEditMenuItems 
                onEdit={handleMenuEdit}
                onItemClick={() => setShowEditMenuSheet(false)}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )}
    </>
  );
}
