import React from 'react';

interface KalBokLogoProps {
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

export const KalBokLogo: React.FC<KalBokLogoProps> = ({
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
        fontFamily: 'var(--font-space-grotesk), system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      KalBok
      <span className="animate-io-appear inline-block">.io</span>
    </span>
  );
};

// Keep the old export for backward compatibility during migration
export const KalBookLogo = KalBokLogo;
