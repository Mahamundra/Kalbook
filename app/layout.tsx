import "./globals.css";
import { DirectionProvider } from "@/components/providers/DirectionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Space_Grotesk } from "next/font/google";
import type { Metadata, Viewport } from "next";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={spaceGrotesk.variable}>
      <body className="min-h-dvh bg-background text-foreground overflow-x-hidden touch-pan-y">
        <DirectionProvider>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}