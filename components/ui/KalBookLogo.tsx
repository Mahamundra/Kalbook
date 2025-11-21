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
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

const iconSizeMap = {
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
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
  const iconSize = iconSizeMap[size];
  const baseClassName = `font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent ${className}`;
  const clickableClassName = href || onClick ? `${baseClassName} cursor-pointer` : baseClassName;

  const iconElement = (
    <img
      src="/kalbook-icon.svg"
      alt="KalBook"
      width={iconSize}
      height={iconSize}
      className={`${sizeClass} w-auto`}
      style={color ? { color: color } : undefined}
    />
  );

  const fullLogoElement = (
    <img
      src="/kalbook-logo.svg"
      alt="KalBook"
      className={`${sizeClass} w-auto`}
      style={color ? { color: color } : undefined}
    />
  );

  const textContent = !animated ? (
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

  let logoContent: React.ReactNode;

  if (variant === 'icon') {
    logoContent = (
      <span onClick={onClick} className={href || onClick ? 'cursor-pointer inline-flex items-center' : 'inline-flex items-center'}>
        {iconElement}
      </span>
    );
  } else if (variant === 'full') {
    logoContent = (
      <span onClick={onClick} className={href || onClick ? 'cursor-pointer inline-flex items-center' : 'inline-flex items-center'}>
        {fullLogoElement}
      </span>
    );
  } else {
    logoContent = textContent;
  }

  if (href) {
    return (
      <Link href={href} className="inline-block" onClick={onClick}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
