"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Save, Undo2, Redo2, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEditHistory } from '@/lib/hooks/useEditHistory';
import { InlineTextEditor } from './InlineTextEditor';
import { ImageEditor } from './ImageEditor';
import { EditOverlay } from './EditOverlay';
import type { Settings } from '@/lib/types/admin';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { motion } from 'framer-motion';
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

interface HomepageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings: Settings;
  businessSlug: string;
  onSave: (settings: Settings) => Promise<void>;
}

type EditingElement = {
  id: string;
  type: 'text' | 'image';
  position: { top: number; left: number };
} | null;

export function HomepageEditor({
  open,
  onOpenChange,
  initialSettings,
  businessSlug,
  onSave,
}: HomepageEditorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [editingElement, setEditingElement] = useState<EditingElement>(null);
  const [showImageEditor, setShowImageEditor] = useState<{
    type: 'logo' | 'banner-image' | 'banner-video';
    currentUrl?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
                     target.closest('[data-edit-type]')?.getAttribute('data-edit-type') as 'text' | 'image';

    if (editId && editType) {
      const element = document.querySelector(`[data-edit-id="${editId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        setEditingElement({
          id: editId,
          type: editType,
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
      case 'business-name':
        updatedSettings.businessProfile = {
          ...updatedSettings.businessProfile,
          name: value,
        };
        break;
      case 'guest-message':
        updatedSettings.branding = {
          ...updatedSettings.branding,
          guestMessage: value,
        };
        break;
      case 'logged-in-message':
        updatedSettings.branding = {
          ...updatedSettings.branding,
          loggedInMessage: value,
        };
        break;
      case 'contact-message':
        updatedSettings.calendar = {
          ...updatedSettings.calendar,
          contactMessage: {
            ...updatedSettings.calendar.contactMessage,
            message: value,
          },
        };
        break;
    }

    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setEditingElement(null);
  };

  const handleImageSave = (url: string) => {
    let updatedSettings = { ...settings };

    if (showImageEditor?.type === 'logo') {
      updatedSettings.branding = {
        ...updatedSettings.branding,
        logoUrl: url,
      };
    } else if (showImageEditor?.type === 'banner-image') {
      updatedSettings.branding = {
        ...updatedSettings.branding,
        bannerCover: {
          ...updatedSettings.branding.bannerCover,
          type: 'upload',
          uploadUrl: url,
        },
      };
    } else if (showImageEditor?.type === 'banner-video') {
      updatedSettings.branding = {
        ...updatedSettings.branding,
        bannerCover: {
          ...updatedSettings.branding.bannerCover,
          type: 'upload',
          videoUrl: url,
        },
      };
    }

    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
    setShowImageEditor(null);
  };

  const handleImageRemove = () => {
    let updatedSettings = { ...settings };

    if (showImageEditor?.type === 'logo') {
      updatedSettings.branding = {
        ...updatedSettings.branding,
        logoUrl: '',
      };
    } else if (showImageEditor?.type === 'banner-image' || showImageEditor?.type === 'banner-video') {
      updatedSettings.branding = {
        ...updatedSettings.branding,
        bannerCover: {
          type: 'pattern',
          patternId: 'pattern1',
        },
      };
    }

    setSettings(updatedSettings);
    history.pushToHistory(updatedSettings);
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
    switch (elementId) {
      case 'business-name':
        return settings.businessProfile?.name || '';
      case 'guest-message':
        return settings.branding?.guestMessage || '';
      case 'logged-in-message':
        return settings.branding?.loggedInMessage || '';
      case 'contact-message':
        return settings.calendar?.contactMessage?.message || '';
      default:
        return '';
    }
  };

  const getImageUrl = (elementId: string): string | undefined => {
    if (elementId === 'logo') {
      return settings.branding?.logoUrl;
    } else if (elementId === 'banner') {
      return settings.branding?.bannerCover?.uploadUrl || settings.branding?.bannerCover?.videoUrl;
    }
    return undefined;
  };

  const businessName = settings.businessProfile?.name || '';
  const logoUrl = settings.branding?.logoUrl;
  const themeColor = settings.branding?.themeColor || '#0EA5E9';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {t('settings.homepageEditor.title') || 'Edit Homepage'}
          </h2>
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">
              ({t('settings.homepageEditor.unsavedChanges') || 'Unsaved changes'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!history.canUndo}
            title={t('settings.homepageEditor.undo') || 'Undo (Ctrl+Z)'}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!history.canRedo}
            title={t('settings.homepageEditor.redo') || 'Redo (Ctrl+Y)'}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
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
        </div>
      </div>

      {/* Editor Content - Simplified booking page preview */}
      <div ref={containerRef} className="flex-1 overflow-auto relative bg-gradient-to-b from-gray-50 to-white" dir={dir}>
        <div className="min-h-full">
          {/* Header */}
          <header className="bg-white border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt={businessName} 
                        className="h-10 w-auto object-contain"
                        data-edit-id="logo"
                        data-edit-type="image"
                      />
                    ) : (
                      <div 
                        className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"
                        data-edit-id="logo"
                        data-edit-type="image"
                      >
                        <CalendarIcon className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <h1 
                    className="text-xl font-bold relative"
                    data-edit-id="business-name"
                    data-edit-type="text"
                  >
                    {businessName || t('booking.title')}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Banner Cover */}
            {settings.branding?.bannerCover && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 sm:mt-0 relative"
                data-edit-id="banner"
                data-edit-type="image"
              >
                <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded-none sm:rounded-lg">
                  {settings.branding.bannerCover?.type === 'upload' && settings.branding.bannerCover?.uploadUrl ? (
                    <>
                      {settings.branding.bannerCover.videoUrl ? (
                        <video
                          src={settings.branding.bannerCover.videoUrl}
                          className="w-full h-full object-cover"
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
            )}

            {/* Guest/Logged-in Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="p-4">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex-1 relative">
                    <p 
                      className={`text-base font-medium ${isRTL ? 'text-right' : 'text-left'}`}
                      data-edit-id={isLoggedIn ? "logged-in-message" : "guest-message"}
                      data-edit-type="text"
                    >
                      {isLoggedIn
                        ? (settings.branding?.loggedInMessage || 'שלום {name}, ברוך הבא!').replace('{name}', 'User')
                        : settings.branding?.guestMessage || 'שלום אורח, ברוך הבא!'}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Contact Message */}
            {settings.calendar?.contactMessage?.enabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className={`text-sm text-blue-900 dark:text-blue-100 ${isRTL ? 'text-right' : 'text-left'} relative`}>
                  <p 
                    className={`mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
                    data-edit-id="contact-message"
                    data-edit-type="text"
                  >
                    {settings.calendar?.contactMessage?.message || t('booking.didNotFindDate') || 'Did not find your specific date? Contact us and we will try our best to fit you in.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Render edit overlays with pencil icons */}
            {['business-name', 'logo', 'banner', 'guest-message', 'logged-in-message', 'contact-message'].map((id) => {
              const elementType = id === 'logo' || id === 'banner' ? 'image' : 'text';
              
              return (
                <EditOverlay
                  key={id}
                  elementId={id}
                  elementType={elementType}
                  onEdit={() => {
                    if (elementType === 'image') {
                      if (id === 'logo') {
                        setShowImageEditor({ type: 'logo', currentUrl: getImageUrl('logo') });
                      } else if (id === 'banner') {
                        const bannerCover = settings.branding?.bannerCover;
                        if (bannerCover?.videoUrl) {
                          setShowImageEditor({ type: 'banner-video', currentUrl: bannerCover.videoUrl });
                        } else {
                          setShowImageEditor({ type: 'banner-image', currentUrl: bannerCover?.uploadUrl });
                        }
                      }
                    } else {
                      // For text elements, find the element and get its position
                      const element = containerRef.current?.querySelector(`[data-edit-id="${id}"]`);
                      if (element) {
                        const rect = element.getBoundingClientRect();
                        const scrollY = window.scrollY || window.pageYOffset;
                        const scrollX = window.scrollX || window.pageXOffset;
                        setEditingElement({
                          id,
                          type: 'text',
                          position: { 
                            top: rect.top + scrollY + rect.height / 2, 
                            left: rect.left + scrollX + rect.width / 2 
                          },
                        });
                      }
                    }
                  }}
                />
              );
            })}
          </main>
        </div>

        {/* Inline Text Editor */}
        {editingElement && editingElement.type === 'text' && (
          <div
            className="fixed z-[10001]"
            style={{
              top: `${editingElement.position.top}px`,
              left: `${editingElement.position.left}px`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <InlineTextEditor
              value={getElementValue(editingElement.id)}
              onSave={(value) => handleTextSave(editingElement.id, value)}
              onCancel={() => setEditingElement(null)}
              multiline={editingElement.id === 'guest-message' || 
                        editingElement.id === 'logged-in-message' || 
                        editingElement.id === 'contact-message'}
              placeholder={t('settings.homepageEditor.editPlaceholder') || 'Enter text...'}
            />
          </div>
        )}
      </div>

      {/* Image Editor Dialog */}
      {showImageEditor && (
        <ImageEditor
          open={!!showImageEditor}
          onOpenChange={(open) => !open && setShowImageEditor(null)}
          currentUrl={showImageEditor.currentUrl}
          onSave={handleImageSave}
          onRemove={handleImageRemove}
          title={
            showImageEditor.type === 'logo'
              ? t('settings.homepageEditor.editLogo') || 'Edit Logo'
              : t('settings.homepageEditor.editBanner') || 'Edit Banner'
          }
          fileType={showImageEditor.type}
          accept={
            showImageEditor.type === 'banner-video'
              ? 'video/*'
              : 'image/*'
          }
        />
      )}

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
  );
}
