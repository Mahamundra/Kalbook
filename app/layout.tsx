import "./globals.css";
import { DirectionProvider } from "@/components/providers/DirectionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
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