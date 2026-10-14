import React from 'react';

export interface BrandLogoProps {
  className?: string;
  variant?: 'reactive' | 'landscape' | 'square' | 'icon';
  alt?: string;
}

/**
 * BrandLogo - Reactively displays the appropriate Zawr Books logo
 * based on responsive viewport breakpoints or explicit layout variant:
 * - Desktop (>= 768px): logo-landscape.png (horizontal % ZAWR BOOKS)
 * - Tablet (640px - 767px): logo-square.png (stacked % ZAWR BOOKS)
 * - Mobile (< 640px): favicon.png (gradient % glyph icon)
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  variant = 'reactive',
  alt = 'Zawr Books',
}) => {
  if (variant === 'landscape') {
    return (
      <img
        src="/logo-landscape.png"
        alt={alt}
        className={`h-7 w-auto object-contain ${className}`}
      />
    );
  }

  if (variant === 'square') {
    return (
      <img
        src="/logo-square.png"
        alt={alt}
        className={`h-7 w-auto object-contain ${className}`}
      />
    );
  }

  if (variant === 'icon') {
    return (
      <img
        src="/favicon.png"
        alt={alt}
        className={`h-6 w-6 object-contain ${className}`}
      />
    );
  }

  // Reactive variant: switches smoothly across breakpoints
  return (
    <span className={`inline-flex items-center ${className}`}>
      {/* Desktop (md: >= 768px): Full Landscape Logo */}
      <img
        src="/logo-landscape.png"
        alt={alt}
        className="hidden md:block h-7 w-auto object-contain"
      />
      {/* Tablet (sm: 640px - 767px): Square Stacked Logo */}
      <img
        src="/logo-square.png"
        alt={alt}
        className="hidden sm:block md:hidden h-7 w-auto object-contain"
      />
      {/* Mobile (< 640px): Favicon Gradient Icon */}
      <img
        src="/favicon.png"
        alt={alt}
        className="block sm:hidden h-6 w-6 object-contain"
      />
    </span>
  );
};
