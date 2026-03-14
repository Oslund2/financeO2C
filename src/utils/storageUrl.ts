import { supabase } from '../lib/supabase';

const STORAGE_BUCKETS = ['character-images', 'storyboard-images', 'production-assets', 'dialogue-audio'] as const;

// Cache signed URLs to avoid re-requesting for the same path
const signedUrlCache = new Map<string, { url: string; expires: number }>();

/**
 * Resolves a Supabase storage public URL to a signed URL.
 * Detects which bucket the URL belongs to, extracts the path,
 * and generates a signed URL (1-hour expiry).
 * Works for all storage buckets: character-images, storyboard-images, production-assets, dialogue-audio.
 * Caches results to avoid redundant requests.
 */
export async function resolveStorageUrl(url: string | null): Promise<string | null> {
  if (!url) return null;

  // Find which bucket this URL belongs to
  let bucketName: string | null = null;
  let storagePath: string | null = null;

  for (const bucket of STORAGE_BUCKETS) {
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(prefix);
    if (idx !== -1) {
      bucketName = bucket;
      storagePath = url.substring(idx + prefix.length);
      break;
    }
  }

  if (!bucketName || !storagePath) return url; // not a recognized Supabase storage URL

  const cacheKey = `${bucketName}/${storagePath}`;

  // Check cache (with 5-minute buffer before expiry)
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expires > Date.now() + 5 * 60 * 1000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (error || !data?.signedUrl) return url; // fall back to original

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expires: Date.now() + 3600 * 1000,
  });

  return data.signedUrl;
}

// Keep backward-compatible alias
export const resolveCharacterImageUrl = resolveStorageUrl;

/**
 * Resolves multiple character image URLs in parallel.
 */
export async function resolveCharacterImageUrls<T extends { reference_image_url: string | null }>(
  items: T[]
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const resolved = await resolveStorageUrl(item.reference_image_url);
      return { ...item, reference_image_url: resolved };
    })
  );
}
