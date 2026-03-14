import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'character-images';
const PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${BUCKET_NAME}/`;

// Cache signed URLs to avoid re-requesting for the same path
const signedUrlCache = new Map<string, { url: string; expires: number }>();

/**
 * Resolves a character image URL to a working signed URL.
 * If the URL is a Supabase public storage URL for the character-images bucket,
 * generates a signed URL (1-hour expiry) since the bucket may be private.
 * Caches results to avoid redundant requests.
 */
export async function resolveCharacterImageUrl(url: string | null): Promise<string | null> {
  if (!url) return null;

  const idx = url.indexOf(PUBLIC_PATH_PREFIX);
  if (idx === -1) return url; // not a character-images public URL

  const storagePath = url.substring(idx + PUBLIC_PATH_PREFIX.length);

  // Check cache (with 5-minute buffer before expiry)
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expires > Date.now() + 5 * 60 * 1000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (error || !data?.signedUrl) return url; // fall back to original

  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expires: Date.now() + 3600 * 1000,
  });

  return data.signedUrl;
}

/**
 * Resolves multiple character image URLs in parallel.
 */
export async function resolveCharacterImageUrls<T extends { reference_image_url: string | null }>(
  items: T[]
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const resolved = await resolveCharacterImageUrl(item.reference_image_url);
      return { ...item, reference_image_url: resolved };
    })
  );
}
