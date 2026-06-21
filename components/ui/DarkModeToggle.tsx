"use client";
import { useDarkMode } from '@/components/providers/DarkModeProvider';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDirection } from '@/components/providers/DirectionProvider';

export const DarkModeToggle = () => {
  const { theme, toggleTheme } = useDarkMode();
  const { isRTL } = useDirection();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "group h-8 sm:h-9 w-8 sm:w-9 rounded-md border border-input bg-background hover:bg-[#030408] hover:border-accent-foreground/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all",
        isRTL && "flex-row-reverse"
      )}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-white transition-colors" />
      ) : (
        <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-white transition-colors" />
      )}
    </Button>
  );
};
