"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Phone, MessageSquare, ExternalLink } from 'lucide-react';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useParams } from 'next/navigation';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface BookingPagePreviewProps {
  settings: {
    businessProfile?: {
      name?: string;
      phone?: string;
      whatsapp?: string;
      socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        tiktok?: string;
        linkedin?: string;
        youtube?: string;
      };
    };
    branding?: {
      logoUrl?: string;
      themeColor?: string;
      bannerCover?: {
        type?: 'upload' | 'pattern';
        uploadUrl?: string;
        videoUrl?: string;
        patternId?: string;
        position?: { x: number; y: number };
      };
      guestMessage?: string;
      loggedInMessage?: string;
    };
    calendar?: {
      contactMessage?: {
        enabled?: boolean;
        message?: string;
        showPhone?: boolean;
        showWhatsApp?: boolean;
      };
    };
  };
}

export function BookingPagePreview({ settings }: BookingPagePreviewProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const params = useParams();
  const slug = params?.slug as string;
  const [device, setDevice] = useState<PreviewDevice>('desktop');

  const businessName = settings.businessProfile?.name || t('settings.yourBusinessName');
  const logoUrl = settings.branding?.logoUrl || '';
  const themeColor = settings.branding?.themeColor || '#0EA5E9';
  const bannerCover = settings.branding?.bannerCover;
  const guestMessage = settings.branding?.guestMessage || t('settings.welcomeMessageDefault');
  const contactMessage = settings.calendar?.contactMessage;
  const socialLinks = settings.businessProfile?.socialLinks;

  // Device width classes
  const deviceWidths = {
    desktop: 'w-full',
    tablet: 'max-w-2xl mx-auto',
    mobile: 'max-w-sm mx-auto',
  };

  const devicePadding = {
    desktop: 'p-4',
    tablet: 'p-3',
    mobile: 'p-2',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Device Toggle */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{t('settings.previewBookingPage') || t('preview') || 'Preview'}</h4>
          {slug && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 px-2 text-xs"
            >
              <a 
                href={`/b/${slug}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                {t('settings.viewFullPage') || 'View Full Page'}
              </a>
            </Button>
          )}
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={device === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDevice('desktop')}
            className="h-7 px-2"
            title={t('settings.desktop') || 'Desktop'}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={device === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDevice('tablet')}
            className="h-7 px-2"
            title={t('settings.tablet') || 'Tablet'}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={device === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDevice('mobile')}
            className="h-7 px-2"
            title={t('settings.mobile') || 'Mobile'}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-6">
        <div 
          className={`bg-white rounded-lg shadow-lg transition-all ${deviceWidths[device]} ${devicePadding[device]}`} 
          dir={dir}
          style={{
            minHeight: device === 'mobile' ? '700px' : device === 'tablet' ? '800px' : '900px',
            maxWidth: device === 'mobile' ? '100%' : device === 'tablet' ? '100%' : '100%',
          }}
        >
          {/* Header */}
          <header className="bg-white border-b mb-4 pb-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} className="h-8 w-auto object-contain" />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${themeColor}20` }}
                  >
                    <CalendarIcon className="w-5 h-5" style={{ color: themeColor }} />
                  </div>
                )}
                <h1 className="text-xl font-bold">{businessName}</h1>
              </div>
            </div>
          </header>

          {/* Banner Cover */}
          {bannerCover && (
            <div className="mb-4 rounded-lg overflow-hidden h-40 sm:h-48">
              {bannerCover.type === 'upload' && bannerCover.uploadUrl ? (
                <>
                  {bannerCover.videoUrl ? (
                    <video
                      src={bannerCover.videoUrl}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: bannerCover.position
                          ? `${bannerCover.position.x}% ${bannerCover.position.y}%`
                          : '50% 50%',
                      }}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={bannerCover.uploadUrl}
                      alt="Banner"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: bannerCover.position
                          ? `${bannerCover.position.x}% ${bannerCover.position.y}%`
                          : '50% 50%',
                      }}
                    />
                  )}
                </>
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: bannerCover.patternId === 'pattern1' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                               bannerCover.patternId === 'pattern2' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                               bannerCover.patternId === 'pattern3' ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                               bannerCover.patternId === 'pattern4' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' :
                               'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  }}
                />
              )}
            </div>
          )}

          {/* Welcome Message */}
          <Card className="mb-4 p-4">
            <div className="text-center">
              <p className={`text-base font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {guestMessage}
              </p>
            </div>
          </Card>

          {/* Service Selection Placeholder */}
          <Card className="mb-4 p-4">
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </Card>

          {/* Contact Message */}
          {contactMessage?.enabled && contactMessage?.message && (
            <Card className="mb-4 p-4 border-2" style={{ borderColor: `${themeColor}40` }}>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <MessageSquare className="w-5 h-5" style={{ color: themeColor }} />
                  <p className="text-base font-medium">{t('settings.contactUs') || 'Contact Us'}</p>
                </div>
                <p className={`text-base text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                  {contactMessage.message}
                </p>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {contactMessage.showPhone && settings.businessProfile?.phone && (
                    <Button size="sm" variant="outline" className="gap-2">
                      <Phone className="w-3 h-3" />
                      <span className="text-xs">{settings.businessProfile.phone}</span>
                    </Button>
                  )}
                  {contactMessage.showWhatsApp && settings.businessProfile?.whatsapp && (
                    <Button size="sm" variant="outline" className="gap-2">
                      <MessageSquare className="w-3 h-3" />
                      <span className="text-xs">{t('settings.whatsapp') || 'WhatsApp'}</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Social Links Placeholder */}
          {(socialLinks?.facebook || socialLinks?.instagram || socialLinks?.twitter || 
            socialLinks?.tiktok || socialLinks?.linkedin || socialLinks?.youtube) && (
            <div className="flex gap-2 justify-center pt-4 border-t">
              {socialLinks.facebook && <div className="w-8 h-8 bg-blue-500 rounded-full"></div>}
              {socialLinks.instagram && <div className="w-8 h-8 bg-pink-500 rounded-full"></div>}
              {socialLinks.twitter && <div className="w-8 h-8 bg-blue-400 rounded-full"></div>}
              {socialLinks.tiktok && <div className="w-8 h-8 bg-black rounded-full"></div>}
              {socialLinks.linkedin && <div className="w-8 h-8 bg-blue-600 rounded-full"></div>}
              {socialLinks.youtube && <div className="w-8 h-8 bg-red-500 rounded-full"></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

