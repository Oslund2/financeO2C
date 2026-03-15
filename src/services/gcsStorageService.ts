/**
 * Google Cloud Storage Service
 *
 * Manages video file lifecycle in GCS with tiered storage:
 * - Standard: Active production files (hot access)
 * - Nearline: Recent completed projects (30-day minimum)
 * - Coldline: Archived projects (90-day minimum)
 * - Archive: Long-term preservation (365-day minimum)
 *
 * All GCS operations go through Supabase edge functions to keep
 * service account credentials server-side.
 */

import { supabase } from '../lib/supabase';

export type StorageTier = 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';

export interface GCSObject {
  name: string;
  bucket: string;
  size: number;
  contentType: string;
  storageClass: StorageTier;
  created: string;
  updated: string;
  mediaLink?: string;
  metadata?: Record<string, string>;
}

export interface LifecycleRule {
  age: number;
  fromTier: StorageTier;
  toTier: StorageTier;
}

export interface StorageCostEstimate {
  tier: StorageTier;
  monthlyPerGB: number;
  retrievalPerGB: number;
  minimumDays: number;
}

export interface BucketConfig {
  name: string;
  location: string;
  defaultTier: StorageTier;
  lifecycleRules: LifecycleRule[];
}

const STORAGE_COSTS: Record<StorageTier, StorageCostEstimate> = {
  STANDARD: { tier: 'STANDARD', monthlyPerGB: 0.020, retrievalPerGB: 0.00, minimumDays: 0 },
  NEARLINE: { tier: 'NEARLINE', monthlyPerGB: 0.010, retrievalPerGB: 0.01, minimumDays: 30 },
  COLDLINE: { tier: 'COLDLINE', monthlyPerGB: 0.004, retrievalPerGB: 0.02, minimumDays: 90 },
  ARCHIVE: { tier: 'ARCHIVE', monthlyPerGB: 0.0012, retrievalPerGB: 0.05, minimumDays: 365 },
};

const DEFAULT_LIFECYCLE_RULES: LifecycleRule[] = [
  { age: 30, fromTier: 'STANDARD', toTier: 'NEARLINE' },
  { age: 90, fromTier: 'NEARLINE', toTier: 'COLDLINE' },
  { age: 365, fromTier: 'COLDLINE', toTier: 'ARCHIVE' },
];

/**
 * Get the default bucket name from environment
 */
export function getDefaultBucket(): string | null {
  return import.meta.env.VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET || null;
}

/**
 * Calculate storage cost for a given size and tier
 */
export function calculateStorageCost(
  sizeGB: number,
  tier: StorageTier,
  months: number = 1
): { storage: number; retrieval: number; total: number } {
  const costs = STORAGE_COSTS[tier];
  const storage = sizeGB * costs.monthlyPerGB * months;
  const retrieval = sizeGB * costs.retrievalPerGB;
  return { storage, retrieval, total: storage + retrieval };
}

/**
 * Estimate monthly storage costs for a production
 */
export function estimateProductionStorageCost(params: {
  videoCount: number;
  averageSizeMB: number;
  tier: StorageTier;
}): { totalSizeGB: number; monthlyCost: number; yearlyCost: number } {
  const totalSizeGB = (params.videoCount * params.averageSizeMB) / 1024;
  const monthlyCost = totalSizeGB * STORAGE_COSTS[params.tier].monthlyPerGB;
  const yearlyCost = monthlyCost * 12;
  return { totalSizeGB, monthlyCost, yearlyCost };
}

/**
 * Get the recommended lifecycle rules
 */
export function getDefaultLifecycleRules(): LifecycleRule[] {
  return [...DEFAULT_LIFECYCLE_RULES];
}

/**
 * List objects in a GCS bucket path via edge function
 */
export async function listObjects(
  bucketPath: string,
  options?: { prefix?: string; maxResults?: number }
): Promise<{ objects: GCSObject[]; error?: string }> {
  try {
    const bucket = bucketPath || getDefaultBucket();
    if (!bucket) {
      return { objects: [], error: 'No GCS bucket configured' };
    }

    const { data, error } = await supabase.functions.invoke('gcs-list-objects', {
      body: {
        bucket,
        prefix: options?.prefix || '',
        maxResults: options?.maxResults || 100,
      },
    });

    if (error) throw new Error(error.message);

    return { objects: data?.objects || [] };
  } catch (err) {
    return {
      objects: [],
      error: err instanceof Error ? err.message : 'Failed to list objects',
    };
  }
}

/**
 * Upload a video file to GCS via edge function
 */
export async function uploadToGCS(params: {
  file: Blob;
  fileName: string;
  bucket?: string;
  path?: string;
  tier?: StorageTier;
  metadata?: Record<string, string>;
}): Promise<{ uri: string; error?: string }> {
  try {
    const bucket = params.bucket || getDefaultBucket();
    if (!bucket) {
      return { uri: '', error: 'No GCS bucket configured' };
    }

    const fullPath = params.path ? `${params.path}/${params.fileName}` : params.fileName;

    // Convert blob to base64 for transport through edge function
    const arrayBuffer = await params.file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const { data, error } = await supabase.functions.invoke('gcs-upload', {
      body: {
        bucket,
        path: fullPath,
        contentBase64: base64,
        contentType: params.file.type || 'video/mp4',
        storageClass: params.tier || 'STANDARD',
        metadata: params.metadata || {},
      },
    });

    if (error) throw new Error(error.message);

    return { uri: `gs://${bucket}/${fullPath}` };
  } catch (err) {
    return {
      uri: '',
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}

/**
 * Generate a signed download URL for a GCS object via edge function.
 * Service account auth enables proper signed URLs (API keys cannot sign).
 */
export async function getSignedUrl(
  gcsUri: string,
  expirationMinutes: number = 60
): Promise<{ url: string; error?: string }> {
  try {
    const bucketPath = gcsUri.replace('gs://', '');
    const [bucket, ...pathParts] = bucketPath.split('/');
    const objectPath = pathParts.join('/');

    const { data, error } = await supabase.functions.invoke('gcs-signed-url', {
      body: {
        bucket,
        path: objectPath,
        expirationMinutes,
      },
    });

    if (error) throw new Error(error.message);

    return { url: data?.signedUrl || '' };
  } catch (err) {
    return {
      url: '',
      error: err instanceof Error ? err.message : 'Failed to generate signed URL',
    };
  }
}

/**
 * Change the storage class of an object (tier transition)
 */
export async function changeStorageTier(
  gcsUri: string,
  newTier: StorageTier
): Promise<{ success: boolean; error?: string }> {
  try {
    const bucketPath = gcsUri.replace('gs://', '');
    const [bucket, ...pathParts] = bucketPath.split('/');
    const objectPath = pathParts.join('/');

    const { error } = await supabase.functions.invoke('gcs-change-storage-class', {
      body: {
        bucket,
        path: objectPath,
        storageClass: newTier,
      },
    });

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to change storage tier',
    };
  }
}

/**
 * Apply lifecycle rules to a bucket via edge function
 */
export async function applyLifecycleRules(
  bucket?: string,
  rules?: LifecycleRule[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetBucket = bucket || getDefaultBucket();
    if (!targetBucket) {
      return { success: false, error: 'No GCS bucket configured' };
    }

    const lifecycleRules = rules || DEFAULT_LIFECYCLE_RULES;

    const { error } = await supabase.functions.invoke('gcs-set-lifecycle', {
      body: {
        bucket: targetBucket,
        rules: lifecycleRules.map(rule => ({
          action: { type: 'SetStorageClass', storageClass: rule.toTier },
          condition: {
            age: rule.age,
            matchesStorageClass: [rule.fromTier],
          },
        })),
      },
    });

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to apply lifecycle rules',
    };
  }
}

/**
 * Get storage tier cost information
 */
export function getStorageTierInfo(): StorageCostEstimate[] {
  return Object.values(STORAGE_COSTS);
}

/**
 * Calculate cost savings from using lifecycle rules
 */
export function calculateLifecycleSavings(params: {
  totalSizeGB: number;
  monthsStored: number;
}): { withoutLifecycle: number; withLifecycle: number; savings: number; savingsPercent: number } {
  const { totalSizeGB, monthsStored } = params;

  // Without lifecycle: everything stays in STANDARD
  const withoutLifecycle = totalSizeGB * STORAGE_COSTS.STANDARD.monthlyPerGB * monthsStored;

  // With lifecycle: transitions at 30, 90, 365 days
  let withLifecycle = 0;
  for (let month = 1; month <= monthsStored; month++) {
    const days = month * 30;
    let tier: StorageTier = 'STANDARD';
    if (days >= 365) tier = 'ARCHIVE';
    else if (days >= 90) tier = 'COLDLINE';
    else if (days >= 30) tier = 'NEARLINE';
    withLifecycle += totalSizeGB * STORAGE_COSTS[tier].monthlyPerGB;
  }

  const savings = withoutLifecycle - withLifecycle;
  const savingsPercent = withoutLifecycle > 0 ? (savings / withoutLifecycle) * 100 : 0;

  return { withoutLifecycle, withLifecycle, savings, savingsPercent };
}
