"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditOverlayProps {
  elementId: string;
  elementType: 'text' | 'image';
  onEdit: () => void;
  className?: string;
}

export function EditOverlay({ elementId, elementType, onEdit, className }: EditOverlayProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(`[data-edit-id="${elementId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Use getBoundingClientRect which gives viewport-relative position
        // Then we use fixed positioning to keep it relative to viewport
        setPosition({
          top: rect.top + rect.height / 2, // Center vertically relative to viewport
          left: rect.right + 8, // Right side with small gap, relative to viewport
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
  }, [elementId]);

  if (!position || !isVisible) return null;

  const overlayContent = (
    <div
      ref={overlayRef}
      className={cn(
        "fixed z-[10000] pointer-events-auto",
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-50%)',
      }}
    >
      <Button
        size="sm"
        variant="default"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          // Small delay to ensure click event is processed
          setTimeout(() => {
            onEdit();
          }, 0);
        }}
        className="h-8 w-8 p-0 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
        title="Edit"
      >
        <Pencil className="w-4 h-4" />
      </Button>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
