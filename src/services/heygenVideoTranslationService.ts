import { supabase } from '../lib/supabase';

export interface HeyGenConfig {
  id: string;
  organizationId: string;
  apiKey: string;
  apiEndpoint: string;
  serviceTier: 'scale' | 'enterprise';
  isEnabled: boolean;
  rateLimitPerMinute: number;
  monthlyQuotaMinutes?: number;
  minutesUsedThisMonth: number;
}

export interface VideoTranslationJob {
  id: string;
  organizationId: string;
  episodeId?: string;
  shotId?: string;
  sourceVideoUrl: string;
  sourceLanguageCode: string;
  sourceLanguageName: string;
  targetLanguages: TargetLanguage[];
  heygenJobId?: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progressPercentage: number;
  estimatedCompletionTime?: string;
  errorMessage?: string;
  estimatedCostUsd: number;
  actualCostUsd: number;
  videoDurationSeconds?: number;
  useProofreadWorkflow: boolean;
}

export interface TargetLanguage {
  code: string;
  name: string;
}

export interface TranslationOutput {
  id: string;
  translationJobId: string;
  organizationId: string;
  episodeId?: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  translatedVideoUrl?: string;
  storagePath?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  qualityStatus: 'pending' | 'approved' | 'needs_review' | 'rejected';
}

export interface HeyGenSubmitResponse {
  code: number;
  data?: {
    video_translate_id: string;
    estimated_time?: number;
  };
  message?: string;
}

export interface HeyGenStatusResponse {
  code: number;
  data?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result_url?: string;
    error?: string;
    duration?: number;
    translations?: Array<{
      language: string;
      video_url: string;
      caption_url?: string;
    }>;
  };
  message?: string;
}

export interface SubmitTranslationParams {
  organizationId: string;
  episodeId?: string;
  shotId?: string;
  sourceVideoUrl: string;
  sourceLanguageCode: string;
  sourceLanguageName: string;
  targetLanguages: TargetLanguage[];
  useProofreadWorkflow?: boolean;
}

class HeyGenVideoTranslationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  async getConfig(organizationId: string): Promise<HeyGenConfig | null> {
    const { data, error } = await supabase
      .from('heygen_provider_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      organizationId: data.organization_id,
      apiKey: data.api_key,
      apiEndpoint: data.api_endpoint,
      serviceTier: data.service_tier,
      isEnabled: data.is_enabled,
      rateLimitPerMinute: data.rate_limit_per_minute,
      monthlyQuotaMinutes: data.monthly_quota_minutes,
      minutesUsedThisMonth: data.minutes_used_this_month,
    };
  }

  async saveConfig(config: Partial<HeyGenConfig> & { organizationId: string }): Promise<void> {
    const { error } = await supabase
      .from('heygen_provider_configs')
      .upsert({
        organization_id: config.organizationId,
        api_key: config.apiKey,
        api_endpoint: config.apiEndpoint || 'https://api.heygen.com',
        service_tier: config.serviceTier || 'scale',
        is_enabled: config.isEnabled ?? true,
        rate_limit_per_minute: config.rateLimitPerMinute || 10,
        monthly_quota_minutes: config.monthlyQuotaMinutes,
      }, { onConflict: 'organization_id' });

    if (error) throw error;
  }

  async testConnection(organizationId: string): Promise<boolean> {
    const config = await this.getConfig(organizationId);
    if (!config) throw new Error('HeyGen configuration not found');

    try {
      const response = await fetch(`${config.apiEndpoint}/v1/video_translate.list`, {
        method: 'GET',
        headers: {
          'X-Api-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async submitVideoTranslation(params: SubmitTranslationParams): Promise<VideoTranslationJob> {
    const config = await this.getConfig(params.organizationId);
    if (!config) throw new Error('HeyGen configuration not found');

    const estimatedCost = this.estimateCost(0, params.targetLanguages.length);

    const jobRecord = {
      organization_id: params.organizationId,
      episode_id: params.episodeId,
      shot_id: params.shotId,
      source_video_url: params.sourceVideoUrl,
      source_language_code: params.sourceLanguageCode,
      source_language_name: params.sourceLanguageName,
      target_languages: params.targetLanguages,
      status: 'pending' as const,
      estimated_cost_usd: estimatedCost,
      use_proofread_workflow: params.useProofreadWorkflow || false,
    };

    const { data: job, error: jobError } = await supabase
      .from('video_translation_jobs')
      .insert(jobRecord)
      .select()
      .single();

    if (jobError) throw jobError;

    try {
      const response = await fetch(`${config.apiEndpoint}/v2/video_translate`, {
        method: 'POST',
        headers: {
          'X-Api-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: params.sourceVideoUrl,
          source_language: params.sourceLanguageCode,
          target_languages: params.targetLanguages.map(lang => lang.code),
          translate_audio_only: false,
        }),
      });

      const result: HeyGenSubmitResponse = await response.json();

      if (!response.ok || result.code !== 100) {
        throw new Error(result.message || 'Failed to submit translation to HeyGen');
      }

      const { error: updateError } = await supabase
        .from('video_translation_jobs')
        .update({
          heygen_job_id: result.data?.video_translate_id,
          status: 'queued',
          started_at: new Date().toISOString(),
          request_payload: {
            video_url: params.sourceVideoUrl,
            source_language: params.sourceLanguageCode,
            target_languages: params.targetLanguages.map(lang => lang.code),
          },
          response_data: result.data,
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      for (const targetLang of params.targetLanguages) {
        await supabase.from('video_translation_outputs').insert({
          translation_job_id: job.id,
          organization_id: params.organizationId,
          episode_id: params.episodeId,
          target_language_code: targetLang.code,
          target_language_name: targetLang.name,
          status: 'pending',
        });
      }

      this.startPolling(job.id, params.organizationId);

      return this.mapJobFromDb(job);
    } catch (error) {
      await supabase
        .from('video_translation_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', job.id);

      throw error;
    }
  }

  async checkTranslationStatus(jobId: string, organizationId: string): Promise<void> {
    const config = await this.getConfig(organizationId);
    if (!config) throw new Error('HeyGen configuration not found');

    const { data: job, error: jobError } = await supabase
      .from('video_translation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;
    if (!job.heygen_job_id) return;

    try {
      const response = await fetch(
        `${config.apiEndpoint}/v1/video_translate/${job.heygen_job_id}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': config.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const result: HeyGenStatusResponse = await response.json();

      if (!response.ok || result.code !== 100) {
        throw new Error(result.message || 'Failed to check status');
      }

      const status = result.data?.status || 'pending';
      const progress = result.data?.progress || 0;

      await supabase
        .from('video_translation_jobs')
        .update({
          status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'processing',
          progress_percentage: progress,
          response_data: result.data,
          video_duration_seconds: result.data?.duration,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          error_message: result.data?.error,
        })
        .eq('id', jobId);

      if (status === 'completed' && result.data?.translations) {
        for (const translation of result.data.translations) {
          await supabase
            .from('video_translation_outputs')
            .update({
              translated_video_url: translation.video_url,
              status: 'completed',
              video_duration_seconds: result.data.duration,
            })
            .eq('translation_job_id', jobId)
            .eq('target_language_code', translation.language);

          if (translation.caption_url) {
            const captionResponse = await fetch(translation.caption_url);
            const captionContent = await captionResponse.text();

            const { data: output } = await supabase
              .from('video_translation_outputs')
              .select('id')
              .eq('translation_job_id', jobId)
              .eq('target_language_code', translation.language)
              .single();

            if (output) {
              await supabase.from('video_translation_captions').insert({
                translation_output_id: output.id,
                organization_id: organizationId,
                caption_format: 'srt',
                caption_content: captionContent,
              });
            }
          }
        }
      }

      if (status === 'completed' || status === 'failed') {
        this.stopPolling(jobId);
      }
    } catch (error) {
      console.error('Error checking translation status:', error);
    }
  }

  async getJobsByEpisode(episodeId: string): Promise<VideoTranslationJob[]> {
    const { data, error } = await supabase
      .from('video_translation_jobs')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapJobFromDb);
  }

  async getTranslationOutputs(jobId: string): Promise<TranslationOutput[]> {
    const { data, error } = await supabase
      .from('video_translation_outputs')
      .select('*')
      .eq('translation_job_id', jobId)
      .order('target_language_name');

    if (error) throw error;
    return data.map(this.mapOutputFromDb);
  }

  async cancelJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('video_translation_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);

    if (error) throw error;
    this.stopPolling(jobId);
  }

  estimateCost(durationMinutes: number, languageCount: number): number {
    const baseRatePerMinute = 0.50;
    const perLanguageRate = 0.30;

    if (durationMinutes === 0) {
      return languageCount * 1.0;
    }

    return (durationMinutes * baseRatePerMinute) + (languageCount * perLanguageRate * durationMinutes);
  }

  private startPolling(jobId: string, organizationId: string): void {
    this.stopPolling(jobId);

    const interval = setInterval(() => {
      this.checkTranslationStatus(jobId, organizationId).catch(console.error);
    }, 30000);

    this.pollingIntervals.set(jobId, interval);
  }

  private stopPolling(jobId: string): void {
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(jobId);
    }
  }

  private mapJobFromDb(data: any): VideoTranslationJob {
    return {
      id: data.id,
      organizationId: data.organization_id,
      episodeId: data.episode_id,
      shotId: data.shot_id,
      sourceVideoUrl: data.source_video_url,
      sourceLanguageCode: data.source_language_code,
      sourceLanguageName: data.source_language_name,
      targetLanguages: data.target_languages || [],
      heygenJobId: data.heygen_job_id,
      status: data.status,
      progressPercentage: data.progress_percentage,
      estimatedCompletionTime: data.estimated_completion_time,
      errorMessage: data.error_message,
      estimatedCostUsd: parseFloat(data.estimated_cost_usd || '0'),
      actualCostUsd: parseFloat(data.actual_cost_usd || '0'),
      videoDurationSeconds: data.video_duration_seconds,
      useProofreadWorkflow: data.use_proofread_workflow,
    };
  }

  private mapOutputFromDb(data: any): TranslationOutput {
    return {
      id: data.id,
      translationJobId: data.translation_job_id,
      organizationId: data.organization_id,
      episodeId: data.episode_id,
      targetLanguageCode: data.target_language_code,
      targetLanguageName: data.target_language_name,
      translatedVideoUrl: data.translated_video_url,
      storagePath: data.storage_path,
      status: data.status,
      qualityStatus: data.quality_status,
    };
  }
}

export const heygenVideoTranslationService = new HeyGenVideoTranslationService();
