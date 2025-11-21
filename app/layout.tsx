import "./globals.css";
import { DirectionProvider } from "@/components/providers/DirectionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BackToTop } from "@/components/ui/BackToTop";
import { Work_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KalBook - Smart Booking System",
  description: "Everything your service business needs - all in one place",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover", // For safe area insets on notched devices
};

type Locale = 'en' | 'he' | 'ar' | 'ru';

// Server-safe RTL check function
function isRTL(locale: Locale): boolean {
  return locale === 'he' || locale === 'ar';
}

function getInitialLocale(): Locale {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale');
  
  if (localeCookie?.value && ['en', 'he', 'ar', 'ru'].includes(localeCookie.value)) {
    return localeCookie.value as Locale;
  }
  
  return 'en';
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLocale = getInitialLocale();
  const dir = isRTL(initialLocale) ? 'rtl' : 'ltr';
  
  return (
    <html className={workSans.variable} dir={dir} lang={initialLocale}>
      <body className="min-h-dvh bg-background text-foreground overflow-x-hidden touch-pan-y">
        <DirectionProvider initialLocale={initialLocale}>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              {children}
              <BackToTop />
            </TooltipProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}