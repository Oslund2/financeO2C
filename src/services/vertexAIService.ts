import { supabase } from '../lib/supabase';

export interface Veo3Parameters {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  durationSeconds: 4 | 6 | 8;
  sampleCount: 1 | 2 | 3 | 4;
  generateAudio: boolean;
  seed?: number;
}

export interface Veo3Request {
  prompt: string;
  negativePrompt?: string;
  referenceImageUri?: string;
  parameters: Veo3Parameters;
  storageUri: string;
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
  cloudStorageBucket: string;
}

const VEO3_COST_PER_SECOND_WITH_AUDIO = 0.75;
const VEO3_COST_PER_SECOND_NO_AUDIO = 0.50;
const API_RATE_LIMIT = 50;

export function getVertexAIConfig(): VertexAIConfig | null {
  const projectId = import.meta.env.VITE_VERTEX_AI_PROJECT_ID;
  const location = import.meta.env.VITE_VERTEX_AI_LOCATION || 'us-central1';
  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY;
  const cloudStorageBucket = import.meta.env.VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET;

  if (!projectId || !apiKey || !cloudStorageBucket) {
    return null;
  }

  return {
    projectId,
    location,
    apiKey,
    cloudStorageBucket
  };
}

export function isVertexAIConfigured(): boolean {
  return getVertexAIConfig() !== null;
}

export function calculateVeo3Cost(durationSeconds: number, sampleCount: number = 1, includeAudio: boolean = true): number {
  const costPerSecond = includeAudio ? VEO3_COST_PER_SECOND_WITH_AUDIO : VEO3_COST_PER_SECOND_NO_AUDIO;
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
    throw new Error('Vertex AI is not configured. Please add credentials in Settings.');
  }

  const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/veo-3.1-generate-001:predict`;

  const requestBody = {
    instances: [{
      prompt: request.prompt,
      negative_prompt: request.negativePrompt || '',
      reference_image: request.referenceImageUri || ''
    }],
    parameters: {
      aspectRatio: request.parameters.aspectRatio,
      resolution: request.parameters.resolution,
      durationSeconds: request.parameters.durationSeconds,
      sampleCount: request.parameters.sampleCount,
      generateAudio: request.parameters.generateAudio,
      seed: request.parameters.seed,
      storageUri: request.storageUri
    }
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
      throw new Error(`Vertex AI API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const jobId = result.name || crypto.randomUUID();

    const cost = calculateVeo3Cost(
      request.parameters.durationSeconds,
      request.parameters.sampleCount,
      request.parameters.generateAudio
    );

    const { error: dbError } = await supabase
      .from('vertex_ai_rendering_jobs')
      .insert([{
        shot_plan_id: shotPlanId,
        organization_id: organizationId,
        vertex_ai_job_id: jobId,
        vertex_ai_operation_name: result.name,
        model_version: 'veo-3.1-generate-001',
        request_payload: requestBody,
        cloud_storage_output_uri: request.storageUri,
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
    console.error('Error submitting Veo 3 request:', error);
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
    const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/${job.vertex_ai_operation_name}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`);
    }

    const result = await response.json();
    const done = result.done || false;
    const status = done ? (result.error ? 'failed' : 'completed') : 'rendering';

    await supabase
      .from('vertex_ai_rendering_jobs')
      .update({
        status,
        error_message: result.error?.message || null,
        render_completion_time: done ? new Date().toISOString() : null
      })
      .eq('id', job.id);

    return {
      jobId: job.vertex_ai_job_id,
      operationName: job.vertex_ai_operation_name,
      status,
      outputUris: result.response?.videoUris || [],
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

  if (!['720p', '1080p'].includes(params.resolution)) {
    errors.push('Invalid resolution. Must be 720p or 1080p');
  }

  if (![4, 6, 8].includes(params.durationSeconds)) {
    errors.push('Invalid duration. Must be 4, 6, or 8 seconds');
  }

  if (params.sampleCount < 1 || params.sampleCount > 4) {
    errors.push('Invalid sample count. Must be between 1 and 4');
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
