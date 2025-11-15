"use client";
import React from 'react';
import { useDirection } from '@/components/providers/DirectionProvider';
import { TypingAnimation } from './TypingAnimation';

interface KalBookLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
  color?: string;
  animated?: boolean;
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export const KalBookLogo: React.FC<KalBookLogoProps> = ({
  size = 'md',
  variant = 'text',
  className = '',
  color,
  animated = true,
}) => {
  const { locale } = useDirection();
  const sizeClass = sizeMap[size];

  if (!animated) {
    return (
      <span className={`${sizeClass} font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent ${className}`}>
        KalBook.io
      </span>
    );
  }

  return (
    <TypingAnimation 
      text="KalBook" 
      suffix=".io" 
      suffixDelay={800} 
      typingSpeed={100} 
      locale={locale}
      className={`${sizeClass} font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent ${className}`}
    />
  );
};
