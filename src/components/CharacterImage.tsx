import { useState, useEffect } from 'react';
import { resolveCharacterImageUrl } from '../utils/storageUrl';

interface CharacterImageProps {
  url: string | null;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
  loading?: 'lazy' | 'eager';
}

/**
 * Displays a character image with automatic signed URL resolution
 * and graceful fallback when the image fails to load.
 */
export function CharacterImage({ url, alt, className, fallback, loading }: CharacterImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!url) {
      setResolvedUrl(null);
      return;
    }
    let cancelled = false;
    resolveCharacterImageUrl(url).then((signed) => {
      if (!cancelled) setResolvedUrl(signed);
    });
    return () => { cancelled = true; };
  }, [url]);

  if (!url || failed || !resolvedUrl) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
