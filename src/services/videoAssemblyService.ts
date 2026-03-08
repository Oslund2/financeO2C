import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssemblySettings {
  id: string;
  organizationId: string;
  defaultTransition: 'cut' | 'fade' | 'dissolve' | 'wipe';
  transitionDurationSeconds: number;
  addSlate: boolean;
  slateDurationSeconds: number;
  addEndCard: boolean;
  endCardDurationSeconds: number;
  backgroundMusicUrl?: string;
  musicVolume: number;
  dialogueVolume: number;
  outputResolution: '1920x1080' | '1280x720' | '3840x2160';
  outputFps: 24 | 25 | 30;
  outputFormat: 'mp4' | 'mov';
  watermarkUrl?: string;
  watermarkOpacity: number;
  shotstackApiKey?: string;
}

export interface VideoAssembly {
  id: string;
  episodeId: string;
  seriesId: string;
  organizationId: string;
  assemblyType: 'rough_cut' | 'final_cut' | 'trailer' | 'preview';
  version: number;
  status: 'pending' | 'building_timeline' | 'rendering' | 'completed' | 'failed';
  shotstackRenderId?: string;
  outputUrl?: string;
  outputDurationSeconds?: number;
  thumbnailUrl?: string;
  totalShots: number;
  shotsWithVideo: number;
  shotsWithLipsync: number;
  shotsAsStills: number;
  costEstimateUsd?: number;
  actualCostUsd?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShotForAssembly {
  shotPlanId: string;
  shotNumber: number;
  durationSeconds: number;
  // Best available video URL (lipsync > veo3 > still image)
  videoUrl?: string;
  imageUrl?: string;
  sourceType: 'lipsync' | 'veo3' | 'still' | 'missing';
  // Audio
  dialogueAudioUrl?: string;
  dialogueDurationSeconds?: number;
  hasDialogue: boolean;
  // Scene metadata for transitions
  actNumber: number;
  sceneNumber: number;
}

export interface AssemblyTriggerOptions {
  assemblyType?: 'rough_cut' | 'final_cut' | 'trailer' | 'preview';
  forceRerender?: boolean;
  overrideSettings?: Partial<AssemblySettings>;
}

// ---------------------------------------------------------------------------
// Shotstack types (minimal)
// ---------------------------------------------------------------------------

interface ShotstackClip {
  asset: ShotstackVideoAsset | ShotstackImageAsset | ShotstackAudioAsset | ShotstackTitleAsset;
  start: number;
  length: number;
  transition?: { in?: string; out?: string };
  effect?: string;
  volume?: number;
}

interface ShotstackVideoAsset {
  type: 'video';
  src: string;
  trim?: number;
  volume?: number;
}

interface ShotstackImageAsset {
  type: 'image';
  src: string;
}

interface ShotstackAudioAsset {
  type: 'audio';
  src: string;
  volume?: number;
  effect?: string;
}

interface ShotstackTitleAsset {
  type: 'html';
  html: string;
  css?: string;
  width: number;
  height: number;
  position?: string;
}

interface ShotstackTrack {
  clips: ShotstackClip[];
}

interface ShotstackTimeline {
  soundtrack?: { src: string; effect?: string; volume?: number };
  background?: string;
  tracks: ShotstackTrack[];
}

interface ShotstackOutput {
  format: string;
  resolution: string;
  fps?: number;
  quality?: string;
}

interface ShotstackEdit {
  timeline: ShotstackTimeline;
  output: ShotstackOutput;
}

interface ShotstackRenderResponse {
  success: boolean;
  message: string;
  response: {
    message: string;
    id: string;
    status: string;
    created: string;
    updated: string;
    url?: string;
  };
}

interface ShotstackPollResponse {
  success: boolean;
  message: string;
  response: {
    id: string;
    status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed';
    created: string;
    updated: string;
    url?: string;
    thumbnail?: string;
    data?: { output?: { size?: number; duration?: number } };
    error?: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHOTSTACK_API_BASE = 'https://api.shotstack.io/v1';
// Shotstack charges ~$0.05/min of rendered output
const SHOTSTACK_COST_PER_SECOND = 0.05 / 60;

// ---------------------------------------------------------------------------
// Helper: fetch shots with best available video for an episode
// ---------------------------------------------------------------------------

async function getShotsForAssembly(episodeId: string): Promise<ShotForAssembly[]> {
  // Get all production shot plans for this episode, ordered by rendering_order
  const { data: plans, error } = await supabase
    .from('production_shot_plans')
    .select(`
      id,
      shot_number,
      duration_seconds,
      act_number,
      scene_number,
      has_dialogue,
      lip_sync_status,
      lip_sync_video_url
    `)
    .eq('episode_id', episodeId)
    .order('rendering_order', { ascending: true });

  if (error) throw error;
  if (!plans?.length) return [];

  const shotPlanIds = plans.map(p => p.id);

  // Get best approved rendering result per shot (highest quality_score or first approved)
  const { data: results } = await supabase
    .from('shot_rendering_results')
    .select('shot_plan_id, cloud_storage_uri, quality_score, approval_status, variation_number')
    .in('shot_plan_id', shotPlanIds)
    .eq('approval_status', 'approved')
    .order('quality_score', { ascending: false });

  // Index results by shot_plan_id (first = highest quality)
  const bestVideoMap: Record<string, string> = {};
  for (const r of results || []) {
    if (!bestVideoMap[r.shot_plan_id] && r.cloud_storage_uri) {
      bestVideoMap[r.shot_plan_id] = r.cloud_storage_uri;
    }
  }

  // Get storyboard shot images as fallback
  const { data: storyboardShots } = await supabase
    .from('storyboard_shots')
    .select('id, image_url')
    .in('id', shotPlanIds); // Note: shot_plan may reference storyboard_shot via same id pattern

  const imageMap: Record<string, string> = {};
  for (const s of storyboardShots || []) {
    if (s.image_url) imageMap[s.id] = s.image_url;
  }

  // Get dialogue audio clips
  const { data: audioClips } = await supabase
    .from('dialogue_audio_clips')
    .select('shot_id, audio_url, duration_seconds')
    .eq('episode_id', episodeId);

  const audioMap: Record<string, { url: string; duration: number }> = {};
  for (const a of audioClips || []) {
    if (a.audio_url && !audioMap[a.shot_id]) {
      audioMap[a.shot_id] = { url: a.audio_url, duration: a.duration_seconds };
    }
  }

  return plans.map(plan => {
    const hasLipsync = plan.lip_sync_status === 'completed' && plan.lip_sync_video_url;
    const hasVeo3 = !!bestVideoMap[plan.id];
    const hasImage = !!imageMap[plan.id];

    let sourceType: ShotForAssembly['sourceType'] = 'missing';
    if (hasLipsync) sourceType = 'lipsync';
    else if (hasVeo3) sourceType = 'veo3';
    else if (hasImage) sourceType = 'still';

    const audio = audioMap[plan.id];

    return {
      shotPlanId: plan.id,
      shotNumber: plan.shot_number,
      durationSeconds: plan.duration_seconds || 4,
      videoUrl: hasLipsync ? plan.lip_sync_video_url : bestVideoMap[plan.id],
      imageUrl: imageMap[plan.id],
      sourceType,
      dialogueAudioUrl: audio?.url,
      dialogueDurationSeconds: audio?.duration,
      hasDialogue: plan.has_dialogue || false,
      actNumber: plan.act_number || 1,
      sceneNumber: plan.scene_number || 1,
    };
  });
}

// ---------------------------------------------------------------------------
// Helper: build Shotstack timeline from shots
// ---------------------------------------------------------------------------

function buildShotstackTimeline(
  shots: ShotForAssembly[],
  episodeTitle: string,
  settings: Partial<AssemblySettings>
): { timeline: ShotstackEdit; shotOrder: object[]; stats: object } {
  const transition = settings.defaultTransition || 'cut';
  const transitionDuration = transition === 'cut' ? 0 : (settings.transitionDurationSeconds || 0.5);
  const dialogueVolume = settings.dialogueVolume ?? 1.0;
  const musicVolume = settings.musicVolume ?? 0.15;

  const videoTrackClips: ShotstackClip[] = [];
  const audioTrackClips: ShotstackClip[] = [];
  const shotOrder: object[] = [];

  let cursor = 0; // current timeline position in seconds

  // Optional slate (title card at start)
  if (settings.addSlate) {
    const slateDuration = settings.slateDurationSeconds || 3;
    videoTrackClips.push({
      asset: {
        type: 'html',
        html: `<p>${episodeTitle}</p>`,
        css: 'p { font-family: "Open Sans", sans-serif; font-size: 60px; color: white; text-align: center; }',
        width: 1920,
        height: 1080,
        position: 'center',
      },
      start: cursor,
      length: slateDuration,
      transition: transition !== 'cut' ? { out: transition } : undefined,
    });
    cursor += slateDuration;
  }

  let prevActNumber = shots[0]?.actNumber ?? 1;

  for (const shot of shots) {
    if (!shot.videoUrl && !shot.imageUrl) {
      // Skip shots with no media at all
      continue;
    }

    const isActBreak = shot.actNumber !== prevActNumber;
    prevActNumber = shot.actNumber;

    const clipTransition = transition !== 'cut'
      ? {
          in: isActBreak ? 'fade' : undefined,
          out: isActBreak ? 'fade' : undefined,
        }
      : undefined;

    if (shot.videoUrl) {
      videoTrackClips.push({
        asset: { type: 'video', src: shot.videoUrl, volume: 0 }, // mute native audio; use audio track
        start: cursor,
        length: shot.durationSeconds,
        transition: clipTransition,
      });
    } else if (shot.imageUrl) {
      videoTrackClips.push({
        asset: { type: 'image', src: shot.imageUrl },
        start: cursor,
        length: shot.durationSeconds,
        transition: clipTransition,
      });
    }

    // Dialogue audio clip (if present)
    if (shot.dialogueAudioUrl) {
      audioTrackClips.push({
        asset: {
          type: 'audio',
          src: shot.dialogueAudioUrl,
          volume: dialogueVolume,
        },
        start: cursor,
        length: shot.dialogueDurationSeconds || shot.durationSeconds,
      });
    }

    shotOrder.push({
      shotPlanId: shot.shotPlanId,
      shotNumber: shot.shotNumber,
      videoUrl: shot.videoUrl || shot.imageUrl,
      sourceType: shot.sourceType,
      timelineStart: cursor,
      durationSeconds: shot.durationSeconds,
    });

    cursor += shot.durationSeconds;
  }

  // Optional end card
  if (settings.addEndCard) {
    const endDuration = settings.endCardDurationSeconds || 3;
    videoTrackClips.push({
      asset: {
        type: 'html',
        html: '<p></p>',
        css: 'p { background: black; width: 100%; height: 100%; }',
        width: 1920,
        height: 1080,
      },
      start: cursor,
      length: endDuration,
      transition: transition !== 'cut' ? { in: 'fade' } : undefined,
    });
    cursor += endDuration;
  }

  const tracks: ShotstackTrack[] = [{ clips: videoTrackClips }];
  if (audioTrackClips.length > 0) {
    tracks.push({ clips: audioTrackClips });
  }

  const resolution = settings.outputResolution || '1920x1080';
  const [width] = resolution.split('x').map(Number);
  const shotstackResolution = width >= 3840 ? 'uhd' : width >= 1920 ? 'hd' : 'sd';

  const timelineConfig: ShotstackEdit = {
    timeline: {
      background: '#000000',
      tracks,
      ...(settings.backgroundMusicUrl
        ? {
            soundtrack: {
              src: settings.backgroundMusicUrl,
              effect: 'fadeInFadeOut',
              volume: musicVolume,
            },
          }
        : {}),
    },
    output: {
      format: settings.outputFormat || 'mp4',
      resolution: shotstackResolution,
      fps: settings.outputFps || 24,
      quality: 'high',
    },
  };

  const stats = {
    totalShots: shots.length,
    shotsWithVideo: shots.filter(s => s.sourceType === 'veo3').length,
    shotsWithLipsync: shots.filter(s => s.sourceType === 'lipsync').length,
    shotsAsStills: shots.filter(s => s.sourceType === 'still').length,
    totalDurationSeconds: cursor,
  };

  return { timeline: timelineConfig, shotOrder, stats };
}

// ---------------------------------------------------------------------------
// Shotstack API calls
// ---------------------------------------------------------------------------

async function submitShotstackRender(
  timeline: ShotstackEdit,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${SHOTSTACK_API_BASE}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(timeline),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shotstack render submission failed (${response.status}): ${text}`);
  }

  const data: ShotstackRenderResponse = await response.json();
  if (!data.success) {
    throw new Error(`Shotstack error: ${data.message}`);
  }

  return data.response.id;
}

async function pollShotstackRender(
  renderId: string,
  apiKey: string
): Promise<ShotstackPollResponse['response']> {
  const response = await fetch(`${SHOTSTACK_API_BASE}/render/${renderId}`, {
    headers: { 'x-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Shotstack poll failed (${response.status})`);
  }

  const data: ShotstackPollResponse = await response.json();
  return data.response;
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

export async function getAssemblySettings(organizationId: string): Promise<AssemblySettings | null> {
  const { data, error } = await supabase
    .from('assembly_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    defaultTransition: data.default_transition,
    transitionDurationSeconds: data.transition_duration_seconds,
    addSlate: data.add_slate,
    slateDurationSeconds: data.slate_duration_seconds,
    addEndCard: data.add_end_card,
    endCardDurationSeconds: data.end_card_duration_seconds,
    backgroundMusicUrl: data.background_music_url,
    musicVolume: data.music_volume,
    dialogueVolume: data.dialogue_volume,
    outputResolution: data.output_resolution,
    outputFps: data.output_fps,
    outputFormat: data.output_format,
    watermarkUrl: data.watermark_url,
    watermarkOpacity: data.watermark_opacity,
    shotstackApiKey: data.shotstack_api_key,
  };
}

export async function saveAssemblySettings(
  organizationId: string,
  settings: Partial<AssemblySettings>
): Promise<void> {
  const row = {
    organization_id: organizationId,
    ...(settings.defaultTransition !== undefined && { default_transition: settings.defaultTransition }),
    ...(settings.transitionDurationSeconds !== undefined && { transition_duration_seconds: settings.transitionDurationSeconds }),
    ...(settings.addSlate !== undefined && { add_slate: settings.addSlate }),
    ...(settings.slateDurationSeconds !== undefined && { slate_duration_seconds: settings.slateDurationSeconds }),
    ...(settings.addEndCard !== undefined && { add_end_card: settings.addEndCard }),
    ...(settings.endCardDurationSeconds !== undefined && { end_card_duration_seconds: settings.endCardDurationSeconds }),
    ...(settings.backgroundMusicUrl !== undefined && { background_music_url: settings.backgroundMusicUrl }),
    ...(settings.musicVolume !== undefined && { music_volume: settings.musicVolume }),
    ...(settings.dialogueVolume !== undefined && { dialogue_volume: settings.dialogueVolume }),
    ...(settings.outputResolution !== undefined && { output_resolution: settings.outputResolution }),
    ...(settings.outputFps !== undefined && { output_fps: settings.outputFps }),
    ...(settings.outputFormat !== undefined && { output_format: settings.outputFormat }),
    ...(settings.watermarkUrl !== undefined && { watermark_url: settings.watermarkUrl }),
    ...(settings.watermarkOpacity !== undefined && { watermark_opacity: settings.watermarkOpacity }),
    ...(settings.shotstackApiKey !== undefined && { shotstack_api_key: settings.shotstackApiKey }),
  };

  const { error } = await supabase
    .from('assembly_settings')
    .upsert(row, { onConflict: 'organization_id' });

  if (error) throw error;
}

export async function getAssembliesForEpisode(episodeId: string): Promise<VideoAssembly[]> {
  const { data, error } = await supabase
    .from('video_assemblies')
    .select('*')
    .eq('episode_id', episodeId)
    .order('version', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    episodeId: row.episode_id,
    seriesId: row.series_id,
    organizationId: row.organization_id,
    assemblyType: row.assembly_type,
    version: row.version,
    status: row.status,
    shotstackRenderId: row.shotstack_render_id,
    outputUrl: row.output_url,
    outputDurationSeconds: row.output_duration_seconds,
    thumbnailUrl: row.thumbnail_url,
    totalShots: row.total_shots,
    shotsWithVideo: row.shots_with_video,
    shotsWithLipsync: row.shots_with_lipsync,
    shotsAsStills: row.shots_as_stills,
    costEstimateUsd: row.cost_estimate_usd,
    actualCostUsd: row.actual_cost_usd,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Trigger a new assembly for an episode. Builds the timeline and submits to
 * Shotstack for server-side rendering. Returns the assembly record ID.
 */
export async function triggerAssembly(
  episodeId: string,
  seriesId: string,
  organizationId: string,
  options: AssemblyTriggerOptions = {}
): Promise<string> {
  const assemblyType = options.assemblyType || 'rough_cut';

  // Determine next version number
  const { data: existing } = await supabase
    .from('video_assemblies')
    .select('version')
    .eq('episode_id', episodeId)
    .eq('assembly_type', assemblyType)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version || 0) + 1;

  // Fetch settings
  const savedSettings = await getAssemblySettings(organizationId);
  const settings: Partial<AssemblySettings> = {
    ...savedSettings,
    ...options.overrideSettings,
  };

  const apiKey = settings.shotstackApiKey;
  if (!apiKey) {
    throw new Error('Shotstack API key not configured. Add it in Assembly Settings.');
  }

  // Fetch episode title
  const { data: episode } = await supabase
    .from('episodes')
    .select('title')
    .eq('id', episodeId)
    .maybeSingle();

  const episodeTitle = episode?.title || 'Episode';

  // Create assembly record (pending)
  const { data: assembly, error: createError } = await supabase
    .from('video_assemblies')
    .insert({
      episode_id: episodeId,
      series_id: seriesId,
      organization_id: organizationId,
      assembly_type: assemblyType,
      version: nextVersion,
      status: 'building_timeline',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createError) throw createError;
  const assemblyId = assembly.id;

  try {
    // Collect shots with best available media
    const shots = await getShotsForAssembly(episodeId);
    if (shots.length === 0) {
      throw new Error('No shots found for this episode. Generate shot plans first.');
    }

    const usableShots = shots.filter(s => s.sourceType !== 'missing');
    if (usableShots.length === 0) {
      throw new Error('No shots have rendered video or images yet. Complete video generation first.');
    }

    // Build Shotstack timeline
    const { timeline, shotOrder, stats } = buildShotstackTimeline(usableShots, episodeTitle, settings);
    const totalDuration = usableShots.reduce((sum, s) => sum + s.durationSeconds, 0);
    const estimatedCost = totalDuration * SHOTSTACK_COST_PER_SECOND;

    // Update record with timeline before submitting
    await supabase
      .from('video_assemblies')
      .update({
        timeline_config: timeline,
        shot_order: shotOrder,
        audio_config: { musicVolume: settings.musicVolume, dialogueVolume: settings.dialogueVolume },
        render_settings: { resolution: settings.outputResolution, fps: settings.outputFps, format: settings.outputFormat },
        total_shots: (stats as any).totalShots,
        shots_with_video: (stats as any).shotsWithVideo,
        shots_with_lipsync: (stats as any).shotsWithLipsync,
        shots_as_stills: (stats as any).shotsAsStills,
        cost_estimate_usd: estimatedCost,
        status: 'rendering',
      })
      .eq('id', assemblyId);

    // Submit to Shotstack
    const renderId = await submitShotstackRender(timeline, apiKey);

    await supabase
      .from('video_assemblies')
      .update({ shotstack_render_id: renderId, shotstack_status: 'queued' })
      .eq('id', assemblyId);

  } catch (err: any) {
    await supabase
      .from('video_assemblies')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', assemblyId);
    throw err;
  }

  return assemblyId;
}

/**
 * Poll Shotstack for render status and update the assembly record.
 * Call this on an interval from the UI, or from a background job.
 * Returns the current status.
 */
export async function syncAssemblyStatus(assemblyId: string): Promise<VideoAssembly['status']> {
  const { data: assembly, error } = await supabase
    .from('video_assemblies')
    .select('shotstack_render_id, status, organization_id')
    .eq('id', assemblyId)
    .single();

  if (error) throw error;
  if (!assembly.shotstack_render_id) return assembly.status;
  if (assembly.status === 'completed' || assembly.status === 'failed') return assembly.status;

  const settings = await getAssemblySettings(assembly.organization_id);
  if (!settings?.shotstackApiKey) throw new Error('Shotstack API key not configured');

  const renderStatus = await pollShotstackRender(assembly.shotstack_render_id, settings.shotstackApiKey);

  if (renderStatus.status === 'done') {
    const duration = renderStatus.data?.output?.duration;
    const fileSize = renderStatus.data?.output?.size;
    const actualCost = duration ? duration * SHOTSTACK_COST_PER_SECOND : undefined;

    await supabase
      .from('video_assemblies')
      .update({
        status: 'completed',
        shotstack_status: 'done',
        output_url: renderStatus.url,
        thumbnail_url: renderStatus.thumbnail,
        output_duration_seconds: duration,
        output_file_size_bytes: fileSize,
        actual_cost_usd: actualCost,
        completed_at: new Date().toISOString(),
      })
      .eq('id', assemblyId);

    return 'completed';
  }

  if (renderStatus.status === 'failed') {
    await supabase
      .from('video_assemblies')
      .update({
        status: 'failed',
        shotstack_status: 'failed',
        error_message: renderStatus.error || 'Shotstack render failed',
      })
      .eq('id', assemblyId);

    return 'failed';
  }

  // Still in progress — update shotstack_status for display
  await supabase
    .from('video_assemblies')
    .update({ shotstack_status: renderStatus.status })
    .eq('id', assemblyId);

  return 'rendering';
}

/**
 * Check whether an episode has enough completed shots to auto-trigger assembly.
 * Returns true if >= 80% of shots have veo3 or lipsync video.
 */
export async function isEpisodeReadyForAssembly(episodeId: string): Promise<boolean> {
  const { data: plans, error } = await supabase
    .from('production_shot_plans')
    .select('id, status')
    .eq('episode_id', episodeId);

  if (error || !plans?.length) return false;

  const completedCount = plans.filter(p => p.status === 'completed').length;
  return completedCount / plans.length >= 0.8;
}

/**
 * Auto-trigger assembly if episode is ready and no assembly exists yet.
 * Safe to call repeatedly — will no-op if already triggered.
 */
export async function autoTriggerAssemblyIfReady(
  episodeId: string,
  seriesId: string,
  organizationId: string
): Promise<string | null> {
  // Check for existing non-failed assembly
  const { data: existing } = await supabase
    .from('video_assemblies')
    .select('id, status')
    .eq('episode_id', episodeId)
    .eq('assembly_type', 'rough_cut')
    .in('status', ['pending', 'building_timeline', 'rendering', 'completed'])
    .maybeSingle();

  if (existing) return existing.id; // already in progress or done

  const ready = await isEpisodeReadyForAssembly(episodeId);
  if (!ready) return null;

  // Check that API key is configured before attempting
  const settings = await getAssemblySettings(organizationId);
  if (!settings?.shotstackApiKey) return null;

  return triggerAssembly(episodeId, seriesId, organizationId, { assemblyType: 'rough_cut' });
}
