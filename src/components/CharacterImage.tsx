import { useState } from 'react';

interface CharacterImageProps {
  url: string | null;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
  loading?: 'lazy' | 'eager';
}

/**
 * Displays an image with graceful fallback when the image fails to load.
 */
export function CharacterImage({ url, alt, className, fallback, loading }: CharacterImageProps) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
