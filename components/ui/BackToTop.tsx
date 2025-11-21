"use client";

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ported/ui/button';
import { useDirection } from '@/components/providers/DirectionProvider';
import { cn } from '@/lib/utils';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const { isRTL } = useDirection();

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-6 z-50 rounded-full shadow-lg transition-all duration-300",
        isRTL ? "left-6" : "right-6",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}

