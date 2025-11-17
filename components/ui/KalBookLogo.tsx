"use client";
import React from 'react';
import Link from 'next/link';
import { useDirection } from '@/components/providers/DirectionProvider';
import { TypingAnimation } from './TypingAnimation';

interface KalBookLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
  color?: string;
  animated?: boolean;
  href?: string;
  onClick?: () => void;
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
  href = '/',
  onClick,
}) => {
  const { locale } = useDirection();
  const sizeClass = sizeMap[size];
  const baseClassName = `${sizeClass} font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent ${className}`;
  const clickableClassName = href || onClick ? `${baseClassName} cursor-pointer` : baseClassName;

  const logoContent = !animated ? (
    <span className={clickableClassName} onClick={onClick}>
      KalBook.io
    </span>
  ) : (
    <span onClick={onClick} className={href || onClick ? 'cursor-pointer' : ''}>
      <TypingAnimation 
        text="KalBook" 
        suffix=".io" 
        suffixDelay={800} 
        typingSpeed={100} 
        locale={locale}
        className={baseClassName}
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block" onClick={onClick}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
