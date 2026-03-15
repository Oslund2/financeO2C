/**
 * Autopilot Pipeline Orchestrator
 *
 * State machine that drives the entire video production pipeline autonomously.
 * User enters a storyline → walks away → comes back to a finished video.
 */

import { supabase } from '../lib/supabase';
import { deriveDecisions, type QualityPreset, type FormatType } from './autopilotDecisionEngine';
import {
  advanceState,
  updateStageDetail,
  logDecision,
  markFailed,
  markStageCompleted,
  type PipelineState,
} from './autopilotProgressTracker';
import { insertAutopilotRun, updateAutopilotRun, fetchAutopilotRun } from './autopilotRunsClient';
import { generateScriptWithGemini } from './geminiService';
import { generateStandaloneShotList } from './shotListGeneratorService';
import { generateStoryboardForScript, generateImagesForStoryboard } from './storyboardService';
import { generatePromptsForShots } from './veo3PromptService';
import { submitVeo3Request, checkJobStatus } from './vertexAIService';
import { dialogueAudioService } from './dialogueAudioService';
import { lipSyncService } from './lipSyncService';
import { triggerAssembly } from './videoAssemblyService';

interface RunConfig {
  runId: string;
  seriesId: string;
  organizationId: string;
  storyline: string;
  formatType: FormatType;
  targetRuntimeMinutes: number;
  qualityPreset: QualityPreset;
}

// --- helpers ---

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  label: string,
  runId: string,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await logDecision(runId, `${label}: Retry ${attempt + 1}/${maxRetries}`, lastError.message);
        await sleep(3000 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

// --- pipeline stages ---

async function stageScripting(config: RunConfig): Promise<{ scriptId: string; episodeId: string }> {
  const { runId, seriesId, organizationId, storyline, formatType, targetRuntimeMinutes } = config;
  const decisions = deriveDecisions(formatType, targetRuntimeMinutes, config.qualityPreset);

  await advanceState(runId, 'scripting', 'Generating script from storyline...');

  // Fetch characters for this series
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('series_id', seriesId)
    .limit(10);

  const charList = (characters || []).map((c) => ({
    id: c.id,
    name: c.name,
    personality_traits: c.tags || [],
    role: c.role || 'Ensemble',
    aliases: c.aliases || [],
    tags: c.tags || [],
    description: c.description || '',
  }));

  // Create episode record
  const { data: episode, error: epErr } = await supabase
    .from('episodes')
    .insert({
      series_id: seriesId,
      organization_id: organizationId,
      title: storyline.substring(0, 80),
      production_notes: `Autopilot: ${storyline}`,
      status: 'in_production',
    })
    .select('id')
    .single();
  if (epErr || !episode) throw new Error(`Failed to create episode: ${epErr?.message}`);

  await updateAutopilotRun(runId, { episode_id: episode.id });

  await logDecision(runId, `Using ${charList.length} characters`, charList.map((c) => c.name).join(', ') || 'None (script will create context)');

  // Generate script
  const generated = await generateScriptWithGemini(
    { id: episode.id, title: storyline.substring(0, 80), synopsis: storyline, theme: storyline },
    charList,
    { temperature: decisions.scriptTemperature },
  );

  await updateStageDetail(runId, 'Saving script...', 8);

  // Save script to DB
  const { data: script, error: scriptErr } = await supabase
    .from('scripts')
    .insert({
      series_id: seriesId,
      title: generated.title || storyline.substring(0, 60),
      synopsis: generated.synopsis || storyline,
      ai_generated: true,
      status: 'approved',
      runtime_minutes: targetRuntimeMinutes,
      format_type: formatType,
    })
    .select('id')
    .single();
  if (scriptErr || !script) throw new Error(`Failed to save script: ${scriptErr?.message}`);

  // Save acts and scenes
  for (const segment of generated.segments) {
    const content = segment.scenes
      .map((s) => s.dialogue?.map((d) => `${d.character}: ${d.line}`).join('\n') || s.description || '')
      .join('\n\n');
    const { data: act } = await supabase.from('script_acts').insert({
      script_id: script.id,
      act_number: segment.segment_number,
      content,
      duration_estimate: segment.duration_seconds,
    }).select('id').single();

    // Save scenes for this act so the shot list generator can find them
    if (act) {
      for (const scene of segment.scenes) {
        await supabase.from('script_scenes').insert({
          act_id: act.id,
          scene_number: scene.scene_number,
          setting: scene.location || null,
          description: scene.description || null,
          dialogue: scene.dialogue || [],
          stage_directions: scene.dialogue?.filter(d => d.stage_direction).map(d => d.stage_direction).join('; ') || null,
          characters: scene.characters_present || [],
          duration_estimate: scene.duration_seconds || null,
        });
      }
    }
  }

  // Link episode to script
  await supabase.from('episodes').update({ script_id: script.id }).eq('id', episode.id);
  await updateAutopilotRun(runId, { script_id: script.id });

  await logDecision(runId, `Script generated: "${generated.title}"`, `${generated.segments.length} segments, ${generated.total_scripted_duration_seconds}s scripted`);
  await markStageCompleted(runId, 'scripting');

  return { scriptId: script.id, episodeId: episode.id };
}

async function stageShotPlanning(config: RunConfig, scriptId: string): Promise<string[]> {
  const { runId, seriesId, organizationId, targetRuntimeMinutes } = config;
  const decisions = deriveDecisions(config.formatType, targetRuntimeMinutes, config.qualityPreset);

  await advanceState(runId, 'shot_planning', 'Generating shot list from script...');

  const shotPlans = await generateStandaloneShotList(scriptId, seriesId, organizationId, {
    pacing: decisions.pacing,
    targetRuntime: targetRuntimeMinutes * 60,
    averageShotDuration: decisions.averageShotDuration,
    includeEstablishing: decisions.includeEstablishingShots,
  });

  const shotIds = shotPlans.map((s: { id: string }) => s.id);
  await logDecision(runId, `${shotIds.length} shots planned`, `Pacing: ${decisions.pacing}, avg ${decisions.averageShotDuration}s`);
  await markStageCompleted(runId, 'shot_planning');

  return shotIds;
}

async function stageStoryboarding(config: RunConfig, scriptId: string): Promise<void> {
  const { runId } = config;

  await advanceState(runId, 'storyboarding', 'Creating storyboard...');

  const storyboardId = await generateStoryboardForScript(scriptId);

  await updateStageDetail(runId, 'Generating storyboard images...', 25);

  const result = await generateImagesForStoryboard(
    storyboardId,
    undefined,
    (progress, status) => {
      updateStageDetail(runId, status, 20 + Math.floor(progress * 0.18));
    },
  );

  await logDecision(runId, `Storyboard: ${result.successCount} images`, `${result.failCount} failed, $${result.totalCost.toFixed(2)} cost`);
  await markStageCompleted(runId, 'storyboarding');
}

async function stageVideoRendering(config: RunConfig, shotIds: string[]): Promise<void> {
  const { runId, organizationId, targetRuntimeMinutes } = config;
  const decisions = deriveDecisions(config.formatType, targetRuntimeMinutes, config.qualityPreset);

  await advanceState(runId, 'video_rendering', 'Generating video prompts...');

  // Generate prompts
  const promptCount = await generatePromptsForShots(shotIds, organizationId);
  await logDecision(runId, `${promptCount} video prompts generated`);

  // Fetch prompts from DB
  const { data: prompts } = await supabase
    .from('production_shot_prompts')
    .select('shot_plan_id, veo3_prompt_text, negative_prompt')
    .in('shot_plan_id', shotIds);

  if (!prompts || prompts.length === 0) {
    await logDecision(runId, 'No prompts generated, skipping video rendering');
    await markStageCompleted(runId, 'video_rendering');
    return;
  }

  await updateStageDetail(runId, `Submitting ${prompts.length} video jobs...`, 42);

  // Submit video generation jobs in batches
  const jobIds: string[] = [];
  for (let i = 0; i < prompts.length; i += decisions.batchSize) {
    const batch = prompts.slice(i, i + decisions.batchSize);
    const batchJobs = await Promise.all(
      batch.map(async (p) => {
        try {
          return await submitVeo3Request(p.shot_plan_id, organizationId, {
            prompt: p.veo3_prompt_text,
            negativePrompt: p.negative_prompt || undefined,
            parameters: {
              aspectRatio: '16:9',
              personGeneration: 'allow_adult',
              generateAudio: decisions.generateAudio,
              numberOfVideos: decisions.samplesPerShot,
              durationSeconds: 8,
            },
            model: decisions.veoModel,
          });
        } catch {
          return null;
        }
      }),
    );
    jobIds.push(...batchJobs.filter((j): j is string => j !== null));
    await updateStageDetail(runId, `Submitted ${Math.min(i + decisions.batchSize, prompts.length)}/${prompts.length} jobs...`, 42 + Math.floor((i / prompts.length) * 10));
    if (i + decisions.batchSize < prompts.length) await sleep(2000);
  }

  await logDecision(runId, `${jobIds.length} video jobs submitted`, `Model: ${decisions.veoModel}`);

  // Poll for completion
  let completed = 0;
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes at 5s intervals
  while (completed < jobIds.length && attempts < maxAttempts) {
    await sleep(5000);
    attempts++;

    let doneCount = 0;
    for (const jobId of jobIds) {
      try {
        const job = await checkJobStatus(jobId);
        if (job.status === 'completed' || job.status === 'failed') doneCount++;
      } catch {
        // ignore poll errors
      }
    }

    if (doneCount > completed) {
      completed = doneCount;
      await updateStageDetail(
        runId,
        `Video rendering: ${completed}/${jobIds.length} complete`,
        42 + Math.floor((completed / jobIds.length) * 22),
      );
    }

    if (completed >= jobIds.length) break;
  }

  await logDecision(runId, `Video rendering complete: ${completed}/${jobIds.length}`);
  await markStageCompleted(runId, 'video_rendering');
}

async function stageDialogueAudio(config: RunConfig, episodeId: string): Promise<void> {
  const { runId, organizationId } = config;

  await advanceState(runId, 'dialogue_audio', 'Generating dialogue audio...');

  try {
    const result = await dialogueAudioService.batchGenerateAudio(episodeId, organizationId);
    await logDecision(runId, `Dialogue audio: ${result.success} clips`, result.failed > 0 ? `${result.failed} failed` : 'All succeeded');
  } catch (err) {
    await logDecision(runId, 'Dialogue audio skipped', err instanceof Error ? err.message : 'Unknown error');
  }

  await markStageCompleted(runId, 'dialogue_audio');
}

async function stageLipSync(config: RunConfig, episodeId: string): Promise<void> {
  const { runId, organizationId } = config;

  await advanceState(runId, 'lip_sync', 'Starting lip sync...');

  // Find shots that have both video and dialogue audio
  const { data: shots } = await supabase
    .from('production_shot_plans')
    .select('id, dialogue_content')
    .eq('episode_id', episodeId)
    .not('lip_sync_video_url', 'is', null);

  // Also look for shots with audio clips
  const { data: audioClips } = await supabase
    .from('dialogue_audio_clips')
    .select('id, shot_id, audio_url')
    .eq('episode_id', episodeId);

  if (!audioClips || audioClips.length === 0) {
    await logDecision(runId, 'No dialogue audio clips found, skipping lip sync');
    await markStageCompleted(runId, 'lip_sync');
    return;
  }

  // Get shots with rendering results (video)
  const { data: renderedShots } = await supabase
    .from('shot_rendering_results')
    .select('shot_plan_id, cloud_storage_uri, signed_url')
    .in('shot_plan_id', audioClips.map((c) => c.shot_id).filter(Boolean));

  let submitted = 0;
  for (const clip of audioClips) {
    if (!clip.shot_id || !clip.audio_url) continue;
    const rendered = renderedShots?.find((r) => r.shot_plan_id === clip.shot_id);
    const videoUrl = rendered?.signed_url || rendered?.cloud_storage_uri;
    if (!videoUrl) continue;

    try {
      await lipSyncService.createLipSyncJob({
        audioUrl: clip.audio_url,
        imageUrl: videoUrl,
        organizationId,
        shotId: clip.shot_id,
        episodeId,
        audioClipId: clip.id,
      });
      submitted++;
    } catch {
      // skip this shot
    }
  }

  await logDecision(runId, `Lip sync: ${submitted} jobs submitted`);

  // Poll lip sync jobs for completion
  if (submitted > 0) {
    const { data: jobs } = await supabase
      .from('lip_sync_jobs')
      .select('id, status')
      .eq('episode_id', episodeId)
      .in('status', ['queued', 'processing']);

    let pollAttempts = 0;
    const maxPoll = 60; // 5 minutes at 5s intervals
    while (pollAttempts < maxPoll) {
      await sleep(5000);
      pollAttempts++;

      const { data: pending } = await supabase
        .from('lip_sync_jobs')
        .select('id')
        .eq('episode_id', episodeId)
        .in('status', ['queued', 'processing']);

      if (!pending || pending.length === 0) break;

      // Check each pending job
      for (const job of pending) {
        try { await lipSyncService.checkJobStatus(job.id); } catch { /* ignore */ }
      }

      await updateStageDetail(runId, `Lip sync: ${pending.length} jobs remaining...`, 75 + Math.floor((1 - pending.length / submitted) * 12));
    }
  }

  await markStageCompleted(runId, 'lip_sync');
}

async function stageAssembly(config: RunConfig, episodeId: string): Promise<string | null> {
  const { runId, seriesId, organizationId } = config;

  await advanceState(runId, 'assembling', 'Assembling final video...');

  try {
    const assemblyId = await triggerAssembly(episodeId, seriesId, organizationId, {
      assemblyType: 'rough_cut',
    });

    await logDecision(runId, 'Assembly submitted to Shotstack');

    // Poll for assembly completion
    let pollAttempts = 0;
    const maxPoll = 120; // 10 minutes at 5s
    while (pollAttempts < maxPoll) {
      await sleep(5000);
      pollAttempts++;

      const { data: assembly } = await supabase
        .from('video_assemblies')
        .select('status, output_url')
        .eq('id', assemblyId)
        .single();

      if (assembly?.status === 'completed' && assembly.output_url) {
        await updateAutopilotRun(runId, { output_video_url: assembly.output_url });
        await logDecision(runId, 'Final video assembled');
        return assembly.output_url;
      }

      if (assembly?.status === 'failed') {
        await logDecision(runId, 'Assembly failed, video may need manual assembly');
        return null;
      }

      await updateStageDetail(runId, `Assembling video (${pollAttempts * 5}s elapsed)...`, 88 + Math.min(pollAttempts, 10));
    }

    await logDecision(runId, 'Assembly timed out');
    return null;
  } catch (err) {
    await logDecision(runId, 'Assembly failed', err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

// --- main orchestrator ---

export async function runAutopilotPipeline(runId: string): Promise<void> {
  // Load run config
  const run = await fetchAutopilotRun(runId);
  if (!run) throw new Error('Run not found');

  const config: RunConfig = {
    runId,
    seriesId: run.series_id,
    organizationId: run.organization_id,
    storyline: run.storyline,
    formatType: (run.format_type || 'streaming') as FormatType,
    targetRuntimeMinutes: run.target_runtime_minutes || 5,
    qualityPreset: (run.quality_preset || 'balanced') as QualityPreset,
  };

  await updateAutopilotRun(runId, { started_at: new Date().toISOString() });

  try {
    // Stage 1: Script
    const { scriptId, episodeId } = await withRetry(
      () => stageScripting(config),
      1, 'Script generation', runId,
    );

    // Stage 2: Shot Planning
    const shotIds = await withRetry(
      () => stageShotPlanning(config, scriptId),
      1, 'Shot planning', runId,
    );

    // Stage 3: Storyboarding
    try {
      await stageStoryboarding(config, scriptId);
    } catch (err) {
      await logDecision(runId, 'Storyboarding failed, continuing without storyboards', err instanceof Error ? err.message : '');
    }

    // Stage 4: Video Rendering
    try {
      await stageVideoRendering(config, shotIds);
    } catch (err) {
      await logDecision(runId, 'Video rendering failed, assembly will use stills', err instanceof Error ? err.message : '');
    }

    // Stage 5: Dialogue Audio
    try {
      await stageDialogueAudio(config, episodeId);
    } catch (err) {
      await logDecision(runId, 'Dialogue audio failed, continuing without audio', err instanceof Error ? err.message : '');
    }

    // Stage 6: Lip Sync
    try {
      await stageLipSync(config, episodeId);
    } catch (err) {
      await logDecision(runId, 'Lip sync failed, continuing without lip sync', err instanceof Error ? err.message : '');
    }

    // Stage 7: Assembly
    await stageAssembly(config, episodeId);

    // Done
    await advanceState(runId, 'complete', 'Your video is ready!');

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await markFailed(runId, msg);
  }
}

/**
 * Create a new autopilot run and start the pipeline.
 * Returns the run ID immediately — the pipeline runs in the background.
 */
export async function startAutopilotRun(params: {
  seriesId: string;
  organizationId: string;
  storyline: string;
  formatType?: string;
  targetRuntimeMinutes?: number;
  qualityPreset?: string;
}): Promise<string> {
  const data = await insertAutopilotRun({
    series_id: params.seriesId,
    organization_id: params.organizationId,
    storyline: params.storyline,
    format_type: params.formatType || 'streaming',
    target_runtime_minutes: params.targetRuntimeMinutes || 5,
    quality_preset: params.qualityPreset || 'balanced',
    current_state: 'initiated',
    progress_percent: 0,
  });

  // Fire and forget — pipeline runs in background
  runAutopilotPipeline(data.id).catch((err) => {
    console.error('Autopilot pipeline error:', err);
    markFailed(data.id, err instanceof Error ? err.message : 'Unknown error');
  });

  return data.id;
}
