import "./globals.css";
import { DirectionProvider } from "@/components/providers/DirectionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={spaceGrotesk.variable}>
      <body className="min-h-dvh bg-background text-foreground">
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