import React from 'react';

interface KalBookLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
  color?: string;
}

const sizeMap = {
  sm: { fontSize: 14 },
  md: { fontSize: 18 },
  lg: { fontSize: 24 },
  xl: { fontSize: 32 },
};

export const KalBookLogo: React.FC<KalBookLogoProps> = ({
  size = 'md',
  variant = 'text',
  className = '',
  color,
}) => {
  const dimensions = sizeMap[size];
  const logoColor = color || 'hsl(var(--primary))';

  return (
    <span
      className={`font-bold ${className}`}
      style={{
        fontSize: `${dimensions.fontSize}px`,
        color: logoColor,
        letterSpacing: '0.05em',
        lineHeight: 1.2,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      KalBook
    </span>
  );
};
