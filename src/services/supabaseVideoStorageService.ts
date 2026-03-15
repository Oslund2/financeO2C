/**
 * Supabase Video Storage Service
 *
 * Mirrors approved video files from GCS to Supabase Storage for CDN access.
 * Supabase Storage provides fast, globally-distributed delivery via its CDN,
 * which is ideal for serving videos in the app UI and sharing with stakeholders.
 *
 * Flow: GCS (cold storage / source of truth) → Supabase Storage (CDN / hot delivery)
 */

import { supabase } from '../lib/supabase';

export interface VideoMirrorResult {
  supabaseUrl: string;
  publicUrl: string;
  storagePath: string;
  sizeBytes: number;
}

export interface MirrorJob {
  id: string;
  gcsUri: string;
  supabasePath: string;
  status: 'pending' | 'downloading' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

const BUCKET_NAME = 'videos';
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB limit for Supabase Storage

/**
 * Mirror a single video from GCS to Supabase Storage
 */
export async function mirrorVideoToSupabase(params: {
  gcsUri: string;
  organizationId: string;
  seriesId: string;
  episodeId?: string;
  fileName?: string;
  onProgress?: (progress: number) => void;
}): Promise<VideoMirrorResult> {
  const { gcsUri, organizationId, seriesId, episodeId } = params;

  // Build the storage path
  const pathParts = [organizationId, seriesId];
  if (episodeId) pathParts.push(episodeId);
  const fileName = params.fileName || extractFileName(gcsUri);
  const storagePath = `${pathParts.join('/')}/${fileName}`;

  params.onProgress?.(10);

  // Download from GCS via edge function
  const { data: downloadData, error: downloadError } = await supabase.functions.invoke(
    'gcs-download',
    {
      body: { gcsUri },
    }
  );

  if (downloadError) {
    throw new Error(`Failed to download from GCS: ${downloadError.message}`);
  }

  params.onProgress?.(50);

  // Convert base64 response to Blob
  const binaryString = atob(downloadData.contentBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: downloadData.contentType || 'video/mp4' });

  if (blob.size > MAX_FILE_SIZE) {
    throw new Error(`File too large for Supabase Storage: ${(blob.size / 1024 / 1024).toFixed(0)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  params.onProgress?.(70);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, blob, {
      contentType: downloadData.contentType || 'video/mp4',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
  }

  params.onProgress?.(90);

  // Get the public URL
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  params.onProgress?.(100);

  return {
    supabaseUrl: urlData.publicUrl,
    publicUrl: urlData.publicUrl,
    storagePath,
    sizeBytes: blob.size,
  };
}

/**
 * Mirror multiple approved videos in batch
 */
export async function mirrorApprovedVideos(params: {
  organizationId: string;
  seriesId: string;
  episodeId: string;
  videoUris: Array<{ gcsUri: string; shotPlanId: string }>;
  onProgress?: (completed: number, total: number) => void;
}): Promise<Array<{ shotPlanId: string; result?: VideoMirrorResult; error?: string }>> {
  const results: Array<{ shotPlanId: string; result?: VideoMirrorResult; error?: string }> = [];

  for (let i = 0; i < params.videoUris.length; i++) {
    const { gcsUri, shotPlanId } = params.videoUris[i];

    try {
      const result = await mirrorVideoToSupabase({
        gcsUri,
        organizationId: params.organizationId,
        seriesId: params.seriesId,
        episodeId: params.episodeId,
      });

      results.push({ shotPlanId, result });

      // Update the shot rendering result with the CDN URL
      await supabase
        .from('shot_rendering_results')
        .update({ cdn_url: result.publicUrl })
        .eq('shot_plan_id', shotPlanId)
        .eq('approval_status', 'approved');
    } catch (err) {
      results.push({
        shotPlanId,
        error: err instanceof Error ? err.message : 'Mirror failed',
      });
    }

    params.onProgress?.(i + 1, params.videoUris.length);
  }

  return results;
}

/**
 * Check if a video already exists in Supabase Storage
 */
export async function videoExistsInSupabase(storagePath: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(
    storagePath.split('/').slice(0, -1).join('/'),
    { search: storagePath.split('/').pop() }
  );

  if (error || !data) return false;
  return data.length > 0;
}

/**
 * Delete a mirrored video from Supabase Storage
 */
export async function deleteVideoFromSupabase(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Get storage usage stats for an organization
 */
export async function getStorageUsage(organizationId: string): Promise<{
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
}> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(organizationId, {
    limit: 1000,
  });

  if (error || !data) {
    return { totalFiles: 0, totalSizeBytes: 0, totalSizeMB: 0 };
  }

  // List returns folder entries; we'd need to recurse for accurate counts
  // For now return the top-level count
  return {
    totalFiles: data.length,
    totalSizeBytes: 0, // Would need individual file metadata
    totalSizeMB: 0,
  };
}

/**
 * Get the public CDN URL for a stored video
 */
export function getPublicVideoUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data.publicUrl;
}

// --- helpers ---

function extractFileName(gcsUri: string): string {
  const path = gcsUri.replace(/^gs:\/\/[^/]+\//, '');
  const parts = path.split('/');
  return parts[parts.length - 1] || `video-${Date.now()}.mp4`;
}
