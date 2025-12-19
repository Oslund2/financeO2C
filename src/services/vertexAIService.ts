import { supabase } from '../lib/supabase';

export type VeoModel =
  | 'veo-2.0-generate-001'
  | 'veo-2.0-generate-exp'
  | 'veo-2.0-generate-preview'
  | 'veo-3.0-generate-001'
  | 'veo-3.0-fast-generate-001'
  | 'veo-3.1-generate-001'
  | 'veo-3.1-fast-generate-001'
  | 'veo-3.1-generate-preview';

export interface Veo3Parameters {
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  durationSeconds: 4 | 5 | 6 | 7 | 8;
  sampleCount: 1 | 2 | 3 | 4;
  generateAudio?: boolean;
  seed?: number;
  enhancePrompt?: boolean;
  personGeneration?: 'allow_adult' | 'dont_allow' | 'allow_all';
  compressionQuality?: 'optimized' | 'lossless';
  resizeMode?: 'pad' | 'crop';
}

export interface ReferenceImage {
  bytesBase64Encoded: string;
  mimeType: 'image/jpeg' | 'image/png';
  referenceType?: 'asset' | 'style';
}

export interface Veo3Request {
  prompt: string;
  negativePrompt?: string;
  image?: {
    bytesBase64Encoded: string;
    mimeType: 'image/jpeg' | 'image/png';
  };
  referenceImages?: ReferenceImage[];
  parameters: Veo3Parameters;
  storageUri?: string;
  model?: VeoModel;
}

export interface Veo3Job {
  jobId: string;
  operationName: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  outputUris?: string[];
  error?: string;
}

export interface VertexAIConfig {
  projectId: string;
  location: string;
  apiKey: string;
  cloudStorageBucket?: string;
  defaultModel?: VeoModel;
}

const VEO3_COST_PER_SECOND_WITH_AUDIO = 0.75;
const VEO3_COST_PER_SECOND_NO_AUDIO = 0.50;
const API_RATE_LIMIT = 50;

export function getVertexAIConfig(): VertexAIConfig | null {
  const projectId = import.meta.env.VITE_VERTEX_AI_PROJECT_ID || import.meta.env.VITE_GEMINI_PROJECT_ID;
  const location = import.meta.env.VITE_VERTEX_AI_LOCATION || 'us-central1';
  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  const cloudStorageBucket = import.meta.env.VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET;
  const defaultModel = (import.meta.env.VITE_VERTEX_AI_DEFAULT_MODEL || 'veo-3.1-generate-001') as VeoModel;

  if (!projectId || !apiKey) {
    return null;
  }

  return {
    projectId,
    location,
    apiKey,
    cloudStorageBucket,
    defaultModel
  };
}

export function isVertexAIConfigured(): boolean {
  return getVertexAIConfig() !== null;
}

export function calculateVeo3Cost(
  durationSeconds: number,
  sampleCount: number = 1,
  includeAudio: boolean = true,
  model: VeoModel = 'veo-3.1-generate-001'
): number {
  let costPerSecond: number;

  if (model.startsWith('veo-2')) {
    costPerSecond = 0.35;
  } else if (model.includes('fast')) {
    costPerSecond = includeAudio ? 0.50 : 0.35;
  } else {
    costPerSecond = includeAudio ? VEO3_COST_PER_SECOND_WITH_AUDIO : VEO3_COST_PER_SECOND_NO_AUDIO;
  }

  return durationSeconds * costPerSecond * sampleCount;
}

export function calculateProductionCost(
  totalRuntimeSeconds: number,
  voicePercentage: number = 50
): { withVoice: number; noVoice: number; total: number } {
  const voiceRatio = voicePercentage / 100;
  const voiceSeconds = totalRuntimeSeconds * voiceRatio;
  const silentSeconds = totalRuntimeSeconds * (1 - voiceRatio);

  const withVoice = voiceSeconds * VEO3_COST_PER_SECOND_WITH_AUDIO;
  const noVoice = silentSeconds * VEO3_COST_PER_SECOND_NO_AUDIO;

  return {
    withVoice,
    noVoice,
    total: withVoice + noVoice
  };
}

export function estimateBatchDuration(
  shotCount: number,
  averageDurationSeconds: number,
  sampleCount: number = 2,
  includeAudio: boolean = true
): {
  apiCalls: number;
  estimatedMinutes: number;
  totalCost: number;
} {
  const apiCalls = shotCount * sampleCount;
  const batchesNeeded = Math.ceil(apiCalls / API_RATE_LIMIT);
  const estimatedMinutes = batchesNeeded * 1.2;
  const costPerSecond = includeAudio ? VEO3_COST_PER_SECOND_WITH_AUDIO : VEO3_COST_PER_SECOND_NO_AUDIO;
  const totalCost = shotCount * averageDurationSeconds * costPerSecond * sampleCount;

  return {
    apiCalls,
    estimatedMinutes,
    totalCost
  };
}

export async function submitVeo3Request(
  shotPlanId: string,
  organizationId: string,
  request: Veo3Request
): Promise<string> {
  const config = getVertexAIConfig();
  if (!config) {
    throw new Error('Vertex AI is not configured. Please add Google Cloud credentials in Settings.');
  }

  const model = request.model || config.defaultModel || 'veo-3.1-generate-001';
  const validationErrors = validateVeo3Request(request, model);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid request parameters: ${validationErrors.join(', ')}`);
  }

  const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${model}:predictLongRunning`;

  const instance: any = {
    prompt: request.prompt
  };

  if (request.negativePrompt) {
    instance.negativePrompt = request.negativePrompt;
  }

  if (request.image) {
    instance.image = request.image;
  }

  if (request.referenceImages && request.referenceImages.length > 0) {
    instance.referenceImages = request.referenceImages.map(img => ({
      image: {
        bytesBase64Encoded: img.bytesBase64Encoded,
        mimeType: img.mimeType
      },
      referenceType: img.referenceType || 'asset'
    }));
  }

  const parameters: any = {
    durationSeconds: request.parameters.durationSeconds,
    sampleCount: request.parameters.sampleCount
  };

  if (request.parameters.aspectRatio) {
    parameters.aspectRatio = request.parameters.aspectRatio;
  }

  if (request.parameters.resolution && model.startsWith('veo-3')) {
    parameters.resolution = request.parameters.resolution;
  }

  if (request.parameters.generateAudio !== undefined && model.startsWith('veo-3')) {
    parameters.generateAudio = request.parameters.generateAudio;
  }

  if (request.parameters.seed !== undefined) {
    parameters.seed = request.parameters.seed;
  }

  if (request.parameters.enhancePrompt !== undefined && model.startsWith('veo-2')) {
    parameters.enhancePrompt = request.parameters.enhancePrompt;
  }

  if (request.parameters.personGeneration) {
    parameters.personGeneration = request.parameters.personGeneration;
  }

  if (request.parameters.compressionQuality) {
    parameters.compressionQuality = request.parameters.compressionQuality;
  }

  if (request.parameters.resizeMode && request.image) {
    parameters.resizeMode = request.parameters.resizeMode;
  }

  if (request.storageUri || config.cloudStorageBucket) {
    parameters.storageUri = request.storageUri || `gs://${config.cloudStorageBucket}/veo-outputs/`;
  }

  const requestBody = {
    instances: [instance],
    parameters
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Vertex AI API error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const operationName = result.name;

    if (!operationName) {
      throw new Error('No operation name returned from API');
    }

    const jobId = operationName.split('/').pop() || crypto.randomUUID();

    const cost = calculateVeo3Cost(
      request.parameters.durationSeconds,
      request.parameters.sampleCount,
      request.parameters.generateAudio || false,
      model
    );

    const { error: dbError } = await supabase
      .from('vertex_ai_rendering_jobs')
      .insert([{
        shot_plan_id: shotPlanId,
        organization_id: organizationId,
        vertex_ai_job_id: jobId,
        vertex_ai_operation_name: operationName,
        model_version: model,
        request_payload: requestBody,
        cloud_storage_output_uri: parameters.storageUri,
        variations_count: request.parameters.sampleCount,
        render_start_time: new Date().toISOString(),
        render_cost: cost,
        status: 'submitted'
      }]);

    if (dbError) {
      console.error('Error storing rendering job:', dbError);
    }

    return jobId;
  } catch (error) {
    console.error('Error submitting Veo request:', error);
    throw error;
  }
}

export async function checkJobStatus(jobId: string): Promise<Veo3Job> {
  const config = getVertexAIConfig();
  if (!config) {
    throw new Error('Vertex AI is not configured');
  }

  const { data: job, error } = await supabase
    .from('vertex_ai_rendering_jobs')
    .select('*')
    .eq('vertex_ai_job_id', jobId)
    .maybeSingle();

  if (error || !job) {
    throw new Error('Job not found');
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return {
      jobId: job.vertex_ai_job_id,
      operationName: job.vertex_ai_operation_name,
      status: job.status,
      outputUris: job.cloud_storage_output_uri ? [job.cloud_storage_output_uri] : [],
      error: job.error_message || undefined
    };
  }

  try {
    const model = job.model_version || 'veo-3.1-generate-001';
    const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${model}:fetchPredictOperation`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operationName: job.vertex_ai_operation_name
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`);
    }

    const result = await response.json();
    const done = result.done || false;
    const status = done ? (result.error ? 'failed' : 'completed') : 'rendering';

    const outputUris: string[] = [];
    if (done && result.response?.videos) {
      outputUris.push(...result.response.videos.map((v: any) => v.gcsUri).filter(Boolean));
    }

    await supabase
      .from('vertex_ai_rendering_jobs')
      .update({
        status,
        error_message: result.error?.message || null,
        render_completion_time: done ? new Date().toISOString() : null
      })
      .eq('id', job.id);

    if (done && outputUris.length > 0 && job.shot_plan_id) {
      for (let i = 0; i < outputUris.length; i++) {
        const existingResult = await supabase
          .from('shot_rendering_results')
          .select('id')
          .eq('rendering_job_id', job.id)
          .eq('variation_number', i + 1)
          .maybeSingle();

        if (!existingResult.data) {
          await supabase
            .from('shot_rendering_results')
            .insert({
              shot_plan_id: job.shot_plan_id,
              rendering_job_id: job.id,
              organization_id: job.organization_id,
              variation_number: i + 1,
              cloud_storage_uri: outputUris[i],
              approval_status: 'pending'
            });
        }
      }
    }

    return {
      jobId: job.vertex_ai_job_id,
      operationName: job.vertex_ai_operation_name,
      status,
      outputUris,
      error: result.error?.message
    };
  } catch (error) {
    console.error('Error checking job status:', error);
    return {
      jobId: job.vertex_ai_job_id,
      operationName: job.vertex_ai_operation_name,
      status: job.status as any,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function generateSignedUrl(cloudStorageUri: string): Promise<string> {
  const config = getVertexAIConfig();
  if (!config) {
    throw new Error('Vertex AI is not configured');
  }

  const bucketPath = cloudStorageUri.replace('gs://', '');
  const [bucket, ...pathParts] = bucketPath.split('/');
  const objectPath = pathParts.join('/');

  try {
    const endpoint = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to generate signed URL');
    }

    const result = await response.json();
    const signedUrl = result.mediaLink || cloudStorageUri;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return cloudStorageUri;
  }
}

export async function pollJobUntilComplete(
  jobId: string,
  maxAttempts: number = 60,
  intervalMs: number = 10000
): Promise<Veo3Job> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const job = await checkJobStatus(jobId);

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Job polling timeout');
}

export function validateVeo3Parameters(params: Veo3Parameters): string[] {
  const errors: string[] = [];

  if (!['16:9', '9:16'].includes(params.aspectRatio)) {
    errors.push('Invalid aspect ratio. Must be 16:9 or 9:16');
  }

  if (params.resolution && !['720p', '1080p'].includes(params.resolution)) {
    errors.push('Invalid resolution. Must be 720p or 1080p');
  }

  if (![4, 5, 6, 7, 8].includes(params.durationSeconds)) {
    errors.push('Invalid duration. Must be between 4 and 8 seconds');
  }

  if (params.sampleCount < 1 || params.sampleCount > 4) {
    errors.push('Invalid sample count. Must be between 1 and 4');
  }

  if (params.personGeneration && !['allow_adult', 'dont_allow', 'allow_all'].includes(params.personGeneration)) {
    errors.push('Invalid personGeneration. Must be allow_adult, dont_allow, or allow_all');
  }

  if (params.compressionQuality && !['optimized', 'lossless'].includes(params.compressionQuality)) {
    errors.push('Invalid compressionQuality. Must be optimized or lossless');
  }

  if (params.resizeMode && !['pad', 'crop'].includes(params.resizeMode)) {
    errors.push('Invalid resizeMode. Must be pad or crop');
  }

  return errors;
}

export function validateVeo3Request(request: Veo3Request, model: VeoModel): string[] {
  const errors: string[] = [];

  if (!request.prompt || request.prompt.trim().length === 0) {
    errors.push('Prompt is required');
  }

  const paramErrors = validateVeo3Parameters(request.parameters);
  errors.push(...paramErrors);

  if (model.startsWith('veo-2')) {
    if (request.parameters.durationSeconds < 5 || request.parameters.durationSeconds > 8) {
      errors.push('Veo 2 models support durations between 5 and 8 seconds');
    }
    if (request.parameters.generateAudio !== undefined) {
      errors.push('Veo 2 models do not support generateAudio parameter');
    }
    if (request.parameters.resolution) {
      errors.push('Veo 2 models do not support resolution parameter');
    }
  } else if (model.startsWith('veo-3')) {
    if (![4, 6, 8].includes(request.parameters.durationSeconds)) {
      errors.push('Veo 3 models support durations of 4, 6, or 8 seconds');
    }
    if (request.parameters.enhancePrompt !== undefined) {
      errors.push('Veo 3 models do not support enhancePrompt parameter');
    }
  }

  if (request.referenceImages && request.referenceImages.length > 3) {
    errors.push('Maximum 3 reference images are allowed');
  }

  if (model === 'veo-3.1-generate-preview' && (!request.referenceImages || request.referenceImages.length === 0)) {
    errors.push('veo-3.1-generate-preview requires referenceImages');
  }

  if (request.referenceImages) {
    const styleReferenceCount = request.referenceImages.filter(img => img.referenceType === 'style').length;
    if (styleReferenceCount > 0 && !model.includes('exp')) {
      errors.push('Style reference images are only supported by veo-2.0-generate-exp model');
    }
    if (styleReferenceCount > 1) {
      errors.push('Only one style reference image is allowed');
    }
  }

  if (request.image && request.parameters.durationSeconds !== 8) {
    errors.push('Image-to-video generation requires durationSeconds to be 8');
  }

  return errors;
}

export function getOptimalShotDuration(sceneType: string, dialogueLength: number): 4 | 6 | 8 {
  if (sceneType === 'establishing' || sceneType === 'wide') {
    return 8;
  }

  if (dialogueLength > 50) {
    return 8;
  } else if (dialogueLength > 20) {
    return 6;
  }

  return 4;
}

export async function getQuotaStatus(): Promise<{
  used: number;
  limit: number;
  available: number;
  resetTime: Date;
}> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);

  const { count, error } = await supabase
    .from('vertex_ai_rendering_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted')
    .gte('created_at', oneMinuteAgo.toISOString());

  if (error) {
    console.error('Error checking quota:', error);
    return { used: 0, limit: API_RATE_LIMIT, available: API_RATE_LIMIT, resetTime: new Date(now.getTime() + 60000) };
  }

  const used = count || 0;
  const available = Math.max(0, API_RATE_LIMIT - used);
  const resetTime = new Date(Math.ceil(now.getTime() / 60000) * 60000);

  return { used, limit: API_RATE_LIMIT, available, resetTime };
}
