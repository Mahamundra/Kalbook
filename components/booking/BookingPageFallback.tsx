'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useLocale } from '@/hooks/useLocale';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import { getInitialThemeColorFromCss, hexToRgb, hslToHex } from '@/components/booking/color-utils';

export function BookingPageFallback() {
  const { dir } = useDirection();
  const { t } = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const [themeColor, setThemeColor] = useState<string>(() => getInitialThemeColorFromCss());

  const slug =
    (params?.slug as string) || searchParams.get('slug') || searchParams.get('ui') || null;

  useEffect(() => {
    if (!slug) return;

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
  }, [slug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkCSSVariables = () => {
      const bookingPrimary = getComputedStyle(document.documentElement)
        .getPropertyValue('--booking-primary')
        .trim();

      if (bookingPrimary) {
        const hex = hslToHex(bookingPrimary);
        if (hex) {
          setThemeColor(hex);
        }
      }
    };

    checkCSSVariables();

    const observer = new MutationObserver(checkCSSVariables);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => observer.disconnect();
  }, []);

  const rgb = hexToRgb(themeColor);

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center animate-fade-in"
      data-booking-page="true"
    >
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center mb-4">
          <KalBookLogo size="lg" variant="full" />
        </div>
        <div className="relative mx-auto w-16 h-16">
          <div
            className="absolute inset-0 rounded-full border-4"
            style={{ borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` }}
          />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
            style={{
              borderTopColor: themeColor,
              borderRightColor: themeColor,
              animationDuration: '0.8s',
            }}
          />
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent animate-spin"
            style={{
              borderBottomColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
              borderLeftColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
              animationDuration: '1.2s',
              animationDirection: 'reverse',
            }}
          />
        </div>
        <div className="space-y-2">
          <p
            className="text-lg font-medium text-foreground animate-pulse"
            style={{ animationDuration: '2s' }}
          >
            {t('common.justAMoment')}
          </p>
          <div className="flex justify-center gap-1.5">
            {[0, 0.2, 0.4].map((delay) => (
              <div
                key={delay}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                  animationDelay: `${delay}s`,
                  animationDuration: '1.4s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
