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
 * Apply theme color to CSS variables
 */
function applyThemeColor(themeColor: string) {
  const hsl = hexToHsl(themeColor);
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
}

/**
 * ThemeProvider - Applies theme color from settings globally
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Function to load and apply theme color
    const loadAndApplyTheme = async () => {
      try {
        // Try to get settings from current URL slug
        const pathname = window.location.pathname;
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
        
        // Fallback: Try to get from admin settings (if on admin page)
        if (pathname.includes('/admin/')) {
          const response = await fetch('/api/settings');
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

