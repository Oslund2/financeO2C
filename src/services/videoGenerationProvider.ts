/**
 * Video Generation Provider Interface
 *
 * Shared abstraction layer for video generation backends (Veo 3, Kling, etc.).
 * Components use this interface to submit requests and poll status without
 * coupling to a specific provider's API.
 */

export type VideoProvider = 'veo3' | 'kling';

export interface VideoGenerationRequest {
  provider: VideoProvider;
  prompt: string;
  negativePrompt?: string;
  referenceImageUrl?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  durationSeconds: number;
  resolution?: '720p' | '1080p';
  includeAudio?: boolean;
  seed?: number;
  model?: string;
}

export interface VideoGenerationJob {
  jobId: string;
  provider: VideoProvider;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress?: number;
  outputUrls?: string[];
  thumbnailUrl?: string;
  error?: string;
  costEstimate?: number;
  createdAt: string;
}

export interface ProviderCapabilities {
  provider: VideoProvider;
  name: string;
  maxDuration: number;
  supportedAspectRatios: string[];
  supportsAudio: boolean;
  supportsImageToVideo: boolean;
  supportsReferenceImages: boolean;
  costPerSecond: number;
  averageGenerationTime: string;
}

const PROVIDER_CAPABILITIES: Record<VideoProvider, ProviderCapabilities> = {
  veo3: {
    provider: 'veo3',
    name: 'Google Veo 3',
    maxDuration: 8,
    supportedAspectRatios: ['16:9', '9:16'],
    supportsAudio: true,
    supportsImageToVideo: true,
    supportsReferenceImages: true,
    costPerSecond: 0.40,
    averageGenerationTime: '2-5 minutes',
  },
  kling: {
    provider: 'kling',
    name: 'Kling AI',
    maxDuration: 10,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportsAudio: false,
    supportsImageToVideo: true,
    supportsReferenceImages: false,
    costPerSecond: 0.10,
    averageGenerationTime: '3-8 minutes',
  },
};

/**
 * Get the capabilities of a specific provider
 */
export function getProviderCapabilities(provider: VideoProvider): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider];
}

/**
 * Get capabilities for all providers
 */
export function getAllProviderCapabilities(): ProviderCapabilities[] {
  return Object.values(PROVIDER_CAPABILITIES);
}

/**
 * Estimate the cost of a video generation request
 */
export function estimateCost(request: VideoGenerationRequest): number {
  const caps = PROVIDER_CAPABILITIES[request.provider];
  return request.durationSeconds * caps.costPerSecond;
}

/**
 * Recommend the best provider for a given use case
 */
export function recommendProvider(params: {
  needsAudio: boolean;
  needsReferenceImages: boolean;
  budgetPerSecond?: number;
  preferQuality?: boolean;
}): VideoProvider {
  // Veo 3 is required for audio
  if (params.needsAudio) return 'veo3';

  // Veo 3 is required for reference images
  if (params.needsReferenceImages) return 'veo3';

  // If budget-conscious and no audio needed, Kling is 75% cheaper
  if (params.budgetPerSecond && params.budgetPerSecond < 0.20) return 'kling';

  // Default to Veo 3 for quality
  if (params.preferQuality) return 'veo3';

  return 'veo3';
}

/**
 * Validate that a request is compatible with the chosen provider
 */
export function validateRequest(request: VideoGenerationRequest): string[] {
  const errors: string[] = [];
  const caps = PROVIDER_CAPABILITIES[request.provider];

  if (request.durationSeconds > caps.maxDuration) {
    errors.push(`${caps.name} max duration is ${caps.maxDuration}s, got ${request.durationSeconds}s`);
  }

  if (!caps.supportedAspectRatios.includes(request.aspectRatio)) {
    errors.push(`${caps.name} does not support ${request.aspectRatio} aspect ratio`);
  }

  if (request.includeAudio && !caps.supportsAudio) {
    errors.push(`${caps.name} does not support audio generation`);
  }

  if (request.referenceImageUrl && !caps.supportsReferenceImages) {
    errors.push(`${caps.name} does not support reference images`);
  }

  return errors;
}

/**
 * Compare providers side-by-side for a given configuration
 */
export function compareProviders(durationSeconds: number): Array<{
  provider: VideoProvider;
  name: string;
  cost: number;
  supportsAudio: boolean;
  generationTime: string;
}> {
  return Object.values(PROVIDER_CAPABILITIES).map(caps => ({
    provider: caps.provider,
    name: caps.name,
    cost: durationSeconds * caps.costPerSecond,
    supportsAudio: caps.supportsAudio,
    generationTime: caps.averageGenerationTime,
  }));
}
