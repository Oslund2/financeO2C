import { supabase } from '../lib/supabase';
import { ScriptTranslationService } from './scriptTranslationService';
import { heygenVideoTranslationService, type TargetLanguage } from './heygenVideoTranslationService';

export interface LocalizationPipeline {
  id: string;
  episodeId: string;
  organizationId: string;
  targetLanguages: TargetLanguage[];
  status: 'planning' | 'script_translation' | 'video_translation' | 'completed' | 'failed';
  scriptTranslationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  videoTranslationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  overallProgress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalizationProgress {
  stage: string;
  progress: number;
  message: string;
  languagesCompleted: string[];
  languagesPending: string[];
}

class VideoLocalizationOrchestrator {
  private scriptTranslationService: ScriptTranslationService;

  constructor() {
    this.scriptTranslationService = new ScriptTranslationService();
  }

  async createFullLocalizationPipeline(
    episodeId: string,
    organizationId: string,
    targetLanguages: TargetLanguage[],
    options?: {
      translateScriptFirst?: boolean;
      useProofreadWorkflow?: boolean;
    }
  ): Promise<LocalizationPipeline> {
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('*, scripts(*)')
      .eq('id', episodeId)
      .single();

    if (episodeError) throw episodeError;
    if (!episode) throw new Error('Episode not found');

    const pipeline: LocalizationPipeline = {
      id: crypto.randomUUID(),
      episodeId,
      organizationId,
      targetLanguages,
      status: 'planning',
      scriptTranslationStatus: 'pending',
      videoTranslationStatus: 'pending',
      overallProgress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (options?.translateScriptFirst && episode.scripts) {
      await this.translateScript(episode.scripts.id, targetLanguages);
      pipeline.scriptTranslationStatus = 'in_progress';
    }

    return pipeline;
  }

  async translateScript(scriptId: string, targetLanguages: TargetLanguage[]): Promise<void> {
    for (const lang of targetLanguages) {
      await this.scriptTranslationService.translateScript(scriptId, lang.code, lang.name);
    }
  }

  async translateVideo(
    episodeId: string,
    organizationId: string,
    videoUrl: string,
    sourceLanguage: { code: string; name: string },
    targetLanguages: TargetLanguage[],
    useProofreadWorkflow: boolean = false
  ): Promise<string> {
    const job = await heygenVideoTranslationService.submitVideoTranslation({
      organizationId,
      episodeId,
      sourceVideoUrl: videoUrl,
      sourceLanguageCode: sourceLanguage.code,
      sourceLanguageName: sourceLanguage.name,
      targetLanguages,
      useProofreadWorkflow,
    });

    return job.id;
  }

  async batchTranslateEpisodes(
    episodeIds: string[],
    organizationId: string,
    targetLanguages: TargetLanguage[],
    options?: {
      translateScripts?: boolean;
      translateVideos?: boolean;
      useProofreadWorkflow?: boolean;
    }
  ): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const episodeId of episodeIds) {
      try {
        const { data: episode } = await supabase
          .from('episodes')
          .select('*, scripts(*)')
          .eq('id', episodeId)
          .single();

        if (!episode) {
          errors.push(`Episode ${episodeId} not found`);
          failedCount++;
          continue;
        }

        if (options?.translateScripts && episode.scripts) {
          await this.translateScript(episode.scripts.id, targetLanguages);
        }

        if (options?.translateVideos && episode.final_video_url) {
          await this.translateVideo(
            episodeId,
            organizationId,
            episode.final_video_url,
            {
              code: episode.source_language_code || 'en',
              name: episode.source_language_name || 'English',
            },
            targetLanguages,
            options.useProofreadWorkflow || false
          );
        }

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Episode ${episodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { successCount, failedCount, errors };
  }

  async getLocalizationProgress(episodeId: string): Promise<LocalizationProgress> {
    const { data: scriptTranslations } = await supabase
      .from('script_translations')
      .select('language_code, status')
      .eq('script_id', (
        await supabase
          .from('episodes')
          .select('script_id')
          .eq('id', episodeId)
          .single()
      ).data?.script_id || '');

    const { data: videoTranslations } = await supabase
      .from('video_translation_outputs')
      .select('target_language_code, status')
      .eq('episode_id', episodeId);

    const scriptCompleted = scriptTranslations?.filter(t => t.status === 'completed') || [];
    const videoCompleted = videoTranslations?.filter(t => t.status === 'completed') || [];

    const totalLanguages = Math.max(
      scriptTranslations?.length || 0,
      videoTranslations?.length || 0
    );

    let stage = 'Not Started';
    let progress = 0;

    if (scriptCompleted.length > 0) {
      stage = 'Script Translation';
      progress = (scriptCompleted.length / totalLanguages) * 50;
    }

    if (videoCompleted.length > 0) {
      stage = 'Video Translation';
      progress = 50 + (videoCompleted.length / totalLanguages) * 50;
    }

    if (scriptCompleted.length === totalLanguages && videoCompleted.length === totalLanguages) {
      stage = 'Completed';
      progress = 100;
    }

    return {
      stage,
      progress,
      message: `${videoCompleted.length} of ${totalLanguages} languages completed`,
      languagesCompleted: videoCompleted.map(v => v.target_language_code),
      languagesPending: (videoTranslations || [])
        .filter(v => v.status !== 'completed')
        .map(v => v.target_language_code),
    };
  }

  async retryFailedTranslations(episodeId: string, organizationId: string): Promise<void> {
    const { data: failedJobs } = await supabase
      .from('video_translation_jobs')
      .select('*')
      .eq('episode_id', episodeId)
      .eq('status', 'failed');

    for (const job of failedJobs || []) {
      await heygenVideoTranslationService.submitVideoTranslation({
        organizationId,
        episodeId,
        sourceVideoUrl: job.source_video_url,
        sourceLanguageCode: job.source_language_code,
        sourceLanguageName: job.source_language_name,
        targetLanguages: job.target_languages,
        useProofreadWorkflow: job.use_proofread_workflow,
      });
    }
  }

  async estimateTotalCost(
    episodeCount: number,
    languageCount: number,
    averageDurationMinutes: number
  ): Promise<{
    scriptTranslationCost: number;
    videoTranslationCost: number;
    totalCost: number;
  }> {
    const scriptCostPerLanguage = 0.05;
    const videoCostPerMinutePerLanguage = 0.80;

    const scriptTranslationCost = episodeCount * languageCount * scriptCostPerLanguage;
    const videoTranslationCost =
      episodeCount * languageCount * averageDurationMinutes * videoCostPerMinutePerLanguage;

    return {
      scriptTranslationCost,
      videoTranslationCost,
      totalCost: scriptTranslationCost + videoTranslationCost,
    };
  }

  async getMultilingualEpisodes(organizationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        series(name),
        video_translation_outputs(
          id,
          target_language_code,
          target_language_name,
          status,
          translated_video_url
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_multilingual', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async exportLanguagePackage(
    episodeId: string,
    languageCode: string
  ): Promise<{
    videoUrl?: string;
    captionUrl?: string;
    scriptTranslation?: any;
  }> {
    const { data: videoOutput } = await supabase
      .from('video_translation_outputs')
      .select('*, video_translation_captions(*)')
      .eq('episode_id', episodeId)
      .eq('target_language_code', languageCode)
      .maybeSingle();

    const { data: episode } = await supabase
      .from('episodes')
      .select('script_id')
      .eq('id', episodeId)
      .single();

    let scriptTranslation = null;
    if (episode?.script_id) {
      const { data } = await supabase
        .from('script_translations')
        .select('*')
        .eq('script_id', episode.script_id)
        .eq('language_code', languageCode)
        .maybeSingle();

      scriptTranslation = data;
    }

    return {
      videoUrl: videoOutput?.translated_video_url,
      captionUrl: videoOutput?.video_translation_captions?.[0]?.storage_path,
      scriptTranslation,
    };
  }
}

export const videoLocalizationOrchestrator = new VideoLocalizationOrchestrator();
