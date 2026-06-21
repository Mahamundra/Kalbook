import "./globals.css";
import { DirectionProvider } from "@/components/providers/DirectionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DarkModeProvider } from "@/components/providers/DarkModeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BackToTop } from "@/components/ui/BackToTop";
import { FullCalendarStyles } from "@/components/FullCalendarStyles";
import { Work_Sans, Noto_Sans_Hebrew } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-hebrew",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KalBook - Your Business, Under Control",
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
  
  return 'he';
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLocale = getInitialLocale();
  const dir = isRTL(initialLocale) ? 'rtl' : 'ltr';
  
  return (
    <html className={`${workSans.variable} ${notoSansHebrew.variable}`} dir={dir} lang={initialLocale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background text-foreground overflow-x-clip touch-pan-y">
        <FullCalendarStyles />
        <DirectionProvider initialLocale={initialLocale}>
          <DarkModeProvider>
            <ThemeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {children}
                <BackToTop />
              </TooltipProvider>
            </ThemeProvider>
          </DarkModeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}