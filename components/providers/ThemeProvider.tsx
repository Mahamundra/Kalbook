'use client';

import { useEffect } from 'react';

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

/**
 * Apply theme color to CSS variables - ONLY for booking pages
 * Uses booking-page-specific CSS variables to avoid affecting admin panel
 */
function applyThemeColor(themeColor: string) {
  const hsl = hexToHsl(themeColor);
  const root = document.documentElement;
  
  // Only apply to booking page - use booking-specific CSS variables
  // These variables are scoped to the booking page element
  const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v));
  
  // Set booking-page-specific CSS variables (not global --primary)
  root.style.setProperty('--booking-primary', hsl);
  root.style.setProperty('--booking-primary-foreground', '0 0% 100%');
  root.style.setProperty('--booking-primary-glow', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
  root.style.setProperty('--booking-ring', hsl);
}

/**
 * ThemeProvider - Applies theme color from settings ONLY to booking pages
 * Admin panel and other pages keep the default homepage primary color
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Function to load and apply theme color
    const loadAndApplyTheme = async () => {
      try {
        const pathname = window.location.pathname;
        
        // ONLY apply theme color on booking pages (/b/[slug] or /booking)
        const isBookingPage = pathname.match(/^\/b\/[^/]+/) || pathname === '/booking';
        
        if (!isBookingPage) {
          // Not a booking page - don't apply theme color
          // Remove any booking theme variables if they exist
          const root = document.documentElement;
          root.style.removeProperty('--booking-primary');
          root.style.removeProperty('--booking-primary-foreground');
          root.style.removeProperty('--booking-primary-glow');
          root.style.removeProperty('--booking-ring');
          return;
        }
        
        // Try to get settings from current URL slug
        const slugMatch = pathname.match(/\/b\/([^/]+)/);
        const slug = slugMatch ? slugMatch[1] : null;
        
        if (slug) {
          // Fetch settings from API
          const response = await fetch(`/api/settings?businessSlug=${slug}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings?.branding?.themeColor) {
              applyThemeColor(data.settings.branding.themeColor);
              return;
            }
          }
        }
        
        // Fallback: Try to get from query params or cookie (for /booking route)
        const urlParams = new URLSearchParams(window.location.search);
        const businessSlug = urlParams.get('slug') || urlParams.get('ui');
        if (businessSlug) {
          const response = await fetch(`/api/settings?businessSlug=${businessSlug}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings?.branding?.themeColor) {
              applyThemeColor(data.settings.branding.themeColor);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error loading theme color:', error);
      }
    };

    loadAndApplyTheme();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      loadAndApplyTheme();
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  return <>{children}</>;
}

