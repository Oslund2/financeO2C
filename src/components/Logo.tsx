import { useState, useEffect } from 'react';
import { resolveStorageUrl } from '../utils/storageUrl';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  logoUrl?: string | null;
}

export function Logo({ className = '', size = 'medium', logoUrl }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    setImageError(false);
    if (!logoUrl) { setResolvedUrl(null); return; }
    resolveStorageUrl(logoUrl).then(setResolvedUrl);
  }, [logoUrl]);

  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16',
    xlarge: 'h-24',
  };

  const defaultLogo = '/images.png';
  const displayLogo = (resolvedUrl && !imageError) ? resolvedUrl : defaultLogo;

  return (
    <img
      src={displayLogo}
      alt="Workspace Logo"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
      onError={() => setImageError(true)}
    />
  );
}
