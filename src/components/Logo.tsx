import { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  logoUrl?: string | null;
}

export function Logo({ className = '', size = 'medium', logoUrl }: LogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16',
    xlarge: 'h-24',
  };

  const defaultLogo = '/images.png';
  const displayLogo = (logoUrl && !imageError) ? logoUrl : defaultLogo;

  return (
    <img
      src={displayLogo}
      alt="Workspace Logo"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
      onError={() => setImageError(true)}
    />
  );
}
