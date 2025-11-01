import "./globals.css";
import { DirectionProvider } from "@/components/providers/DirectionProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="min-h-dvh bg-background text-foreground">
        <DirectionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}