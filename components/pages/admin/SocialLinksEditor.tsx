"use client";

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
}

interface SocialLinksEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLinks?: SocialLinks;
  onSave: (links: SocialLinks) => void;
}

// Social Media Icon Components
const FacebookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TwitterIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
);

const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const LinkedInIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const YouTubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const SOCIAL_PLATFORMS = [
  { key: 'facebook' as const, Icon: FacebookIcon, labelKey: 'settings.facebook' },
  { key: 'instagram' as const, Icon: InstagramIcon, labelKey: 'settings.instagram' },
  { key: 'twitter' as const, Icon: TwitterIcon, labelKey: 'settings.twitter' },
  { key: 'tiktok' as const, Icon: TikTokIcon, labelKey: 'settings.tiktok' },
  { key: 'linkedin' as const, Icon: LinkedInIcon, labelKey: 'settings.linkedin' },
  { key: 'youtube' as const, Icon: YouTubeIcon, labelKey: 'settings.youtube' },
];

export function SocialLinksEditor({
  open,
  onOpenChange,
  currentLinks,
  onSave,
}: SocialLinksEditorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [links, setLinks] = useState<SocialLinks>(currentLinks || {});

  useEffect(() => {
    if (open && currentLinks) {
      setLinks(currentLinks);
    }
  }, [open, currentLinks]);

  const handleAddLink = (platform: keyof SocialLinks) => {
    setLinks({
      ...links,
      [platform]: '',
    });
  };

  const handleRemoveLink = (platform: keyof SocialLinks) => {
    const updated = { ...links };
    delete updated[platform];
    // If no links left, set to undefined
    const hasOthers = Object.values(updated).some(v => v);
    setLinks(hasOthers ? updated : {});
  };

  const handleLinkChange = (platform: keyof SocialLinks, value: string) => {
    setLinks({
      ...links,
      [platform]: value,
    });
  };

  const handleSave = () => {
    // Clean up empty links
    const cleanedLinks: SocialLinks = {};
    Object.entries(links).forEach(([key, value]) => {
      if (value && value.trim()) {
        cleanedLinks[key as keyof SocialLinks] = value.trim();
      }
    });
    onSave(Object.keys(cleanedLinks).length > 0 ? cleanedLinks : {});
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (currentLinks) {
      setLinks(currentLinks);
    }
    onOpenChange(false);
  };

  const availablePlatforms = SOCIAL_PLATFORMS.filter(
    platform => links[platform.key] === undefined
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto z-[10001]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('settings.socialLinks') || 'Social Media Links'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Link Button */}
          {availablePlatforms.length > 0 && (
            <div className={`flex items-center justify-end ${isRTL ? 'flex-row-reverse' : ''}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={isRTL ? 'flex-row-reverse' : ''}
                    type="button"
                  >
                    <Plus className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                    {t('settings.addSocialLink') || 'Add Social Link'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align={isRTL ? 'end' : 'start'}
                  className="z-[10002]"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  {availablePlatforms.map((platform) => {
                    const IconComponent = platform.Icon;
                    return (
                      <DropdownMenuItem
                        key={platform.key}
                        onSelect={(e) => {
                          e.preventDefault();
                          handleAddLink(platform.key);
                        }}
                        className="flex items-center gap-3"
                      >
                        <IconComponent className="w-4 h-4" />
                        {t(platform.labelKey) || platform.key}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <p className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('settings.socialLinksDescription') || 'Add your social media links to display on the booking page'}
          </p>

          {/* Existing Links */}
          <div className="space-y-4">
            {SOCIAL_PLATFORMS.map((platform) => {
              if (links[platform.key] === undefined) return null;

              const IconComponent = platform.Icon;
              return (
                <div key={platform.key} className="flex items-start gap-2">
                  <div className="flex-1">
                    <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="inline-flex items-center gap-3">
                        <IconComponent className="w-4 h-4" />
                        {t(platform.labelKey) || platform.key}
                      </span>
                    </label>
                    <Input
                      value={links[platform.key] || ''}
                      onChange={(e) => handleLinkChange(platform.key, e.target.value)}
                      placeholder={`https://${platform.key}.com/yourpage`}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-8"
                    onClick={() => handleRemoveLink(platform.key)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {Object.keys(links).length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>{t('settings.noSocialLinks') || 'No social links added yet'}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave}>
            {t('common.save') || 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

