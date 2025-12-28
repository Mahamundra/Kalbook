"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDirection } from '@/components/providers/DirectionProvider';

interface EditOverlayProps {
  elementId: string;
  elementType: 'text' | 'image' | 'color' | 'links' | 'settings';
  onEdit: () => void;
  className?: string;
}

export function EditOverlay({ elementId, elementType, onEdit, className }: EditOverlayProps) {
  const { dir } = useDirection();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(`[data-edit-id="${elementId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const buttonSize = 32; // h-8 w-8 = 32px
        const offset = 4; // Small gap from the corner
        
        // Position at top-left corner: 
        // Button top edge aligns with element's top edge (or slightly above)
        // Button left edge aligns with element's left edge (or slightly outside)
        setPosition({
          top: rect.top - offset, // Button top edge at element's top edge minus small gap
          left: rect.left - offset, // Button left edge at element's left edge minus small gap
        });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const handleUpdate = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    // Initial update
    updatePosition();
    
    // Update on scroll and resize
    const scrollContainer = document.querySelector('.flex-1.overflow-auto') || window;
    scrollContainer.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    // Also update periodically to catch any layout changes
    const interval = setInterval(handleUpdate, 200);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      clearInterval(interval);
      scrollContainer.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [elementId, dir]);

  if (!position || !isVisible) return null;

  const overlayContent = (
    <div
      ref={overlayRef}
      className={cn(
        "fixed pointer-events-auto",
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 10001, // Higher than header (z-50) and HomepageEditor (z-[9999])
      }}
    >
      <Button
        size="sm"
        variant="default"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onEdit();
        }}
        className="h-8 w-8 p-0 rounded-full shadow-lg transition-all hover:scale-110 bg-black/50 hover:bg-black"
        title="Edit"
      >
        <Pencil className="w-4 h-4 text-white" />
      </Button>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
