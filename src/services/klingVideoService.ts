/**
 * Kling AI Video Generation Service
 *
 * Open-source alternative video generation provider.
 * Supports text-to-video and image-to-video generation.
 *
 * Kling API docs: https://docs.qingque.cn/
 * Note: Requires VITE_KLING_API_KEY and optionally VITE_KLING_API_SECRET
 */

import { supabase } from '../lib/supabase';

export type KlingModel = 'kling-v1' | 'kling-v1-5' | 'kling-v2';
export type KlingMode = 'standard' | 'professional';

export interface KlingConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  model: KlingModel;
}

export interface KlingRequest {
  prompt: string;
  negativePrompt?: string;
  model?: KlingModel;
  mode?: KlingMode;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: 5 | 10;
  imageUrl?: string;
  cfgScale?: number;
}

export interface KlingJob {
  taskId: string;
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  createdAt: string;
}

export interface KlingModelInfo {
  id: KlingModel;
  name: string;
  description: string;
  maxDuration: number;
  costPerSecond: number;
}

export const KLING_MODELS: KlingModelInfo[] = [
  {
    id: 'kling-v2',
    name: 'Kling v2.0',
    description: 'Latest model — best quality and motion coherence',
    maxDuration: 10,
    costPerSecond: 0.12,
  },
  {
    id: 'kling-v1-5',
    name: 'Kling v1.5',
    description: 'Balanced quality and speed',
    maxDuration: 10,
    costPerSecond: 0.08,
  },
  {
    id: 'kling-v1',
    name: 'Kling v1.0',
    description: 'Original model — fastest generation',
    maxDuration: 5,
    costPerSecond: 0.05,
  },
];

/**
 * Check if Kling API is configured
 */
export function isKlingConfigured(): boolean {
  return !!getKlingConfig();
}

/**
 * Get Kling configuration from environment
 */
export function getKlingConfig(): KlingConfig | null {
  const apiKey = import.meta.env.VITE_KLING_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    apiSecret: import.meta.env.VITE_KLING_API_SECRET,
    baseUrl: import.meta.env.VITE_KLING_API_URL || 'https://api.klingai.com',
    model: (import.meta.env.VITE_KLING_DEFAULT_MODEL as KlingModel) || 'kling-v2',
  };
}

/**
 * Submit a text-to-video generation request to Kling
 */
export async function submitKlingTextToVideo(
  request: KlingRequest,
  organizationId: string
): Promise<string> {
  const config = getKlingConfig();
  if (!config) {
    throw new Error('Kling AI is not configured. Set VITE_KLING_API_KEY in environment.');
  }

  const model = request.model || config.model;
  const mode = request.mode || 'standard';

  try {
    // Route through edge function to protect API key
    const { data, error } = await supabase.functions.invoke('kling-generate-video', {
      body: {
        type: 'text_to_video',
        model,
        mode,
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        aspect_ratio: request.aspectRatio || '16:9',
        duration: request.duration || 5,
        cfg_scale: request.cfgScale || 0.5,
      },
    });

    if (error) {
      throw new Error(error.message || 'Kling API request failed');
    }

    const taskId = data?.task_id;
    if (!taskId) {
      throw new Error('No task ID returned from Kling API');
    }

    // Store in DB for tracking
    await supabase.from('vertex_ai_rendering_jobs').insert({
      organization_id: organizationId,
      vertex_ai_job_id: `kling-${taskId}`,
      vertex_ai_operation_name: taskId,
      model_version: `kling:${model}`,
      request_payload: request as any,
      status: 'submitted',
      render_start_time: new Date().toISOString(),
    });

    return taskId;
  } catch (err) {
    console.error('Kling text-to-video error:', err);
    throw err;
  }
}

/**
 * Submit an image-to-video generation request to Kling
 */
export async function submitKlingImageToVideo(
  request: KlingRequest & { imageUrl: string },
  organizationId: string
): Promise<string> {
  const config = getKlingConfig();
  if (!config) {
    throw new Error('Kling AI is not configured.');
  }

  const model = request.model || config.model;

  try {
    const { data, error } = await supabase.functions.invoke('kling-generate-video', {
      body: {
        type: 'image_to_video',
        model,
        mode: request.mode || 'standard',
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        image_url: request.imageUrl,
        aspect_ratio: request.aspectRatio || '16:9',
        duration: request.duration || 5,
        cfg_scale: request.cfgScale || 0.5,
      },
    });

    if (error) {
      throw new Error(error.message || 'Kling image-to-video request failed');
    }

    const taskId = data?.task_id;
    if (!taskId) {
      throw new Error('No task ID returned from Kling API');
    }

    await supabase.from('vertex_ai_rendering_jobs').insert({
      organization_id: organizationId,
      vertex_ai_job_id: `kling-${taskId}`,
      vertex_ai_operation_name: taskId,
      model_version: `kling:${model}`,
      request_payload: { ...request } as any,
      status: 'submitted',
      render_start_time: new Date().toISOString(),
    });

    return taskId;
  } catch (err) {
    console.error('Kling image-to-video error:', err);
    throw err;
  }
}

/**
 * Check the status of a Kling generation task
 */
export async function checkKlingJobStatus(taskId: string): Promise<KlingJob> {
  try {
    const { data, error } = await supabase.functions.invoke('kling-check-status', {
      body: { task_id: taskId },
    });

    if (error) {
      throw new Error(error.message);
    }

    const status = data?.task_status || 'processing';
    const isComplete = status === 'succeed';
    const isFailed = status === 'failed';

    // Update DB record
    if (isComplete || isFailed) {
      await supabase
        .from('vertex_ai_rendering_jobs')
        .update({
          status: isComplete ? 'completed' : 'failed',
          error_message: data?.task_status_msg || null,
          render_completion_time: new Date().toISOString(),
        })
        .eq('vertex_ai_job_id', `kling-${taskId}`);
    }

    return {
      taskId,
      status: isComplete ? 'succeed' : isFailed ? 'failed' : status,
      videoUrl: data?.works?.[0]?.resource?.resource || undefined,
      thumbnailUrl: data?.works?.[0]?.resource?.thumbnail || undefined,
      duration: data?.works?.[0]?.resource?.duration || undefined,
      error: isFailed ? data?.task_status_msg : undefined,
      createdAt: data?.created_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error checking Kling job status:', err);
    return {
      taskId,
      status: 'processing',
      error: err instanceof Error ? err.message : 'Status check failed',
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Poll a Kling job until completion
 */
export async function pollKlingJob(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 10000
): Promise<KlingJob> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await checkKlingJobStatus(taskId);

    if (job.status === 'succeed' || job.status === 'failed') {
      return job;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Kling job polling timeout');
}

/**
 * Calculate cost estimate for a Kling request
 */
export function calculateKlingCost(
  duration: number,
  model: KlingModel = 'kling-v2',
  mode: KlingMode = 'standard'
): number {
  const modelInfo = KLING_MODELS.find(m => m.id === model) || KLING_MODELS[0];
  const multiplier = mode === 'professional' ? 2.0 : 1.0;
  return duration * modelInfo.costPerSecond * multiplier;
}
