import { supabase } from '../lib/supabase';

export interface LipSyncProvider {
  name: string;
  submitJob(params: LipSyncJobParams): Promise<LipSyncJobResult>;
  getJobStatus(jobId: string): Promise<LipSyncJobStatus>;
  cancelJob(jobId: string): Promise<void>;
  estimateCost(durationSeconds: number): number;
}

export interface LipSyncJobParams {
  audioUrl: string;
  imageUrl: string;
  organizationId: string;
  shotId: string;
  episodeId: string;
  audioClipId: string;
  characterId?: string;
  settings?: Record<string, any>;
}

export interface LipSyncJobResult {
  providerJobId: string;
  estimatedCompletionTime?: number;
}

export interface LipSyncJobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
  progress?: number;
}

export interface ProviderConfig {
  id: string;
  organizationId: string;
  providerName: 'sync_labs' | 'veed_io' | 'self_hosted';
  apiKey?: string;
  apiEndpoint?: string;
  isEnabled: boolean;
  isDefault: boolean;
  priorityOrder: number;
  settings: Record<string, any>;
}

class LipSyncService {
  private providers: Map<string, LipSyncProvider> = new Map();

  registerProvider(name: string, provider: LipSyncProvider) {
    this.providers.set(name, provider);
  }

  getProvider(name: string): LipSyncProvider | undefined {
    return this.providers.get(name);
  }

  async getProviderConfigs(organizationId: string): Promise<ProviderConfig[]> {
    const { data, error } = await supabase
      .from('lip_sync_provider_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('priority_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getActiveProvider(organizationId: string): Promise<{ config: ProviderConfig; provider: LipSyncProvider } | null> {
    const configs = await this.getProviderConfigs(organizationId);

    const enabledConfigs = configs.filter(c => c.isEnabled);
    if (enabledConfigs.length === 0) {
      return null;
    }

    const defaultConfig = enabledConfigs.find(c => c.isDefault) || enabledConfigs[0];
    const provider = this.getProvider(defaultConfig.providerName);

    if (!provider) {
      throw new Error(`Provider ${defaultConfig.providerName} is not registered`);
    }

    return { config: defaultConfig, provider };
  }

  async createLipSyncJob(params: LipSyncJobParams): Promise<string> {
    const activeProviderData = await this.getActiveProvider(params.organizationId);

    if (!activeProviderData) {
      throw new Error('No active lip sync provider configured');
    }

    const { config, provider } = activeProviderData;

    const { data: jobRecord, error: insertError } = await supabase
      .from('lip_sync_jobs')
      .insert({
        organization_id: params.organizationId,
        shot_id: params.shotId,
        episode_id: params.episodeId,
        audio_clip_id: params.audioClipId,
        character_id: params.characterId,
        provider: config.providerName,
        status: 'queued',
        source_image_url: params.imageUrl,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    try {
      const result = await provider.submitJob(params);

      await supabase
        .from('lip_sync_jobs')
        .update({
          provider_job_id: result.providerJobId,
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', jobRecord.id);

      await supabase
        .from('production_shot_plans')
        .update({
          lip_sync_status: 'processing',
          lip_sync_provider: config.providerName,
        })
        .eq('id', params.shotId);

      return jobRecord.id;
    } catch (error) {
      await supabase
        .from('lip_sync_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', jobRecord.id);

      await supabase
        .from('production_shot_plans')
        .update({
          lip_sync_status: 'failed',
        })
        .eq('id', params.shotId);

      throw error;
    }
  }

  async checkJobStatus(jobId: string): Promise<void> {
    const { data: job, error } = await supabase
      .from('lip_sync_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;

    const provider = this.getProvider(job.provider);
    if (!provider) {
      throw new Error(`Provider ${job.provider} not found`);
    }

    const status = await provider.getJobStatus(job.provider_job_id);

    const updates: any = {
      status: status.status,
    };

    if (status.videoUrl) {
      updates.output_video_url = status.videoUrl;
      updates.completed_at = new Date().toISOString();

      const processingTime = job.started_at
        ? Math.floor((new Date().getTime() - new Date(job.started_at).getTime()) / 1000)
        : null;

      if (processingTime) {
        updates.processing_time_seconds = processingTime;
      }
    }

    if (status.errorMessage) {
      updates.error_message = status.errorMessage;
    }

    await supabase
      .from('lip_sync_jobs')
      .update(updates)
      .eq('id', jobId);

    if (status.status === 'completed' && status.videoUrl) {
      await supabase
        .from('production_shot_plans')
        .update({
          lip_sync_status: 'completed',
          lip_sync_video_url: status.videoUrl,
        })
        .eq('id', job.shot_id);
    } else if (status.status === 'failed') {
      await supabase
        .from('production_shot_plans')
        .update({
          lip_sync_status: 'failed',
        })
        .eq('id', job.shot_id);
    }
  }

  async retryJob(jobId: string): Promise<string> {
    const { data: oldJob, error } = await supabase
      .from('lip_sync_jobs')
      .select('*, dialogue_audio_clips(*)')
      .eq('id', jobId)
      .single();

    if (error) throw error;

    const audioClip = oldJob.dialogue_audio_clips;

    return this.createLipSyncJob({
      audioUrl: audioClip.audio_url,
      imageUrl: oldJob.source_image_url,
      organizationId: oldJob.organization_id,
      shotId: oldJob.shot_id,
      episodeId: oldJob.episode_id,
      audioClipId: oldJob.audio_clip_id,
      characterId: oldJob.character_id,
    });
  }

  async approveJob(jobId: string, userId: string, approved: boolean): Promise<void> {
    const { data: job, error } = await supabase
      .from('lip_sync_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;

    await supabase
      .from('production_shot_plans')
      .update({
        lip_sync_approved: approved,
        lip_sync_approved_at: new Date().toISOString(),
        lip_sync_approved_by: userId,
      })
      .eq('id', job.shot_id);
  }

  async getJobsByEpisode(episodeId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('lip_sync_jobs')
      .select(`
        *,
        dialogue_audio_clips(*),
        production_shot_plans(*),
        characters(*)
      `)
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getJobsByShot(shotId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('lip_sync_jobs')
      .select(`
        *,
        dialogue_audio_clips(*),
        characters(*)
      `)
      .eq('shot_id', shotId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async estimateCost(organizationId: string, durationSeconds: number): Promise<number> {
    const activeProviderData = await this.getActiveProvider(organizationId);

    if (!activeProviderData) {
      return 0;
    }

    return activeProviderData.provider.estimateCost(durationSeconds);
  }

  async getTotalCostByEpisode(episodeId: string): Promise<number> {
    const { data, error } = await supabase
      .from('lip_sync_jobs')
      .select('provider_cost')
      .eq('episode_id', episodeId)
      .eq('status', 'completed');

    if (error) throw error;

    return (data || []).reduce((sum, job) => sum + (job.provider_cost || 0), 0);
  }

  async saveProviderConfig(config: Partial<ProviderConfig> & { organizationId: string; providerName: string }): Promise<void> {
    const { data: existing } = await supabase
      .from('lip_sync_provider_configs')
      .select('id')
      .eq('organization_id', config.organizationId)
      .eq('provider_name', config.providerName)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('lip_sync_provider_configs')
        .update({
          api_key: config.apiKey,
          api_endpoint: config.apiEndpoint,
          is_enabled: config.isEnabled ?? true,
          is_default: config.isDefault ?? false,
          priority_order: config.priorityOrder ?? 0,
          settings: config.settings ?? {},
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('lip_sync_provider_configs')
        .insert({
          organization_id: config.organizationId,
          provider_name: config.providerName,
          api_key: config.apiKey,
          api_endpoint: config.apiEndpoint,
          is_enabled: config.isEnabled ?? true,
          is_default: config.isDefault ?? false,
          priority_order: config.priorityOrder ?? 0,
          settings: config.settings ?? {},
        });

      if (error) throw error;
    }
  }
}

export const lipSyncService = new LipSyncService();
