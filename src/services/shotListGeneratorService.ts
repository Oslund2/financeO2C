import { supabase } from '../lib/supabase';
import { getOptimalShotDuration } from './vertexAIService';

export interface ShotPlan {
  act_number: number;
  scene_number: number;
  shot_number: number;
  shot_type: string;
  camera_angle: string;
  camera_movement: string;
  duration_seconds: 4 | 6 | 8;
  narrative_description: string;
  technical_description: string;
  characters: string[];
  location: string;
  props: string[];
}

export interface GenerationOptions {
  targetRuntime?: number;
  averageShotDuration?: number;
  pacing?: 'fast' | 'medium' | 'slow';
  includeEstablishing?: boolean;
}

const SHOT_TYPES = [
  'establishing_shot',
  'wide_shot',
  'medium_shot',
  'close_up',
  'extreme_close_up',
  'over_the_shoulder',
  'two_shot',
  'reaction_shot'
];

const CAMERA_ANGLES = [
  'eye_level',
  'high_angle',
  'low_angle',
  'dutch_angle',
  'aerial',
  'birds_eye'
];

const CAMERA_MOVEMENTS = [
  'static',
  'pan',
  'tilt',
  'dolly',
  'track',
  'zoom'
];

function getShotTypeForContext(
  isFirstInScene: boolean,
  dialogueLength: number,
  characterCount: number
): string {
  if (isFirstInScene) {
    return 'establishing_shot';
  }

  if (characterCount === 0) {
    return 'wide_shot';
  }

  if (characterCount === 1) {
    return dialogueLength > 30 ? 'close_up' : 'medium_shot';
  }

  if (characterCount === 2) {
    return dialogueLength > 0 ? 'over_the_shoulder' : 'two_shot';
  }

  return 'wide_shot';
}

function getCameraAngleForShot(shotType: string): string {
  if (shotType === 'establishing_shot') return 'aerial';
  if (shotType === 'close_up') return 'eye_level';
  if (shotType === 'high_angle') return 'high_angle';
  return 'eye_level';
}

function getCameraMovementForDuration(duration: number, shotType: string): string {
  if (duration === 4) return 'static';
  if (duration === 8 && shotType === 'establishing_shot') return 'pan';
  if (duration === 6) return Math.random() > 0.5 ? 'static' : 'dolly';
  return 'static';
}

export async function generateShotListFromScript(
  scriptId: string,
  episodeId: string | null,
  seriesId: string,
  organizationId: string,
  options: GenerationOptions = {}
): Promise<ShotPlan[]> {
  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .select(`
      *,
      script_acts (
        *,
        script_scenes (
          *
        )
      )
    `)
    .eq('id', scriptId)
    .maybeSingle();

  if (scriptError || !script) {
    throw new Error('Script not found');
  }

  const acts = (script.script_acts || []).sort((a, b) => a.act_number - b.act_number);
  const shots: ShotPlan[] = [];
  let globalShotNumber = 1;

  const pacing = options.pacing || 'medium';
  const pacingMultiplier = pacing === 'fast' ? 0.8 : pacing === 'slow' ? 1.2 : 1.0;

  for (const act of acts) {
    const scenes = (act.script_scenes || []).sort((a, b) => a.scene_number - b.scene_number);

    for (const scene of scenes) {
      const location = scene.setting || 'Unknown Location';
      const dialogue = scene.dialogue || [];
      const characters = scene.characters || [];
      const description = scene.description || '';

      const dialogueLines = Array.isArray(dialogue) ? dialogue : [];
      const totalDialogueLength = dialogueLines.reduce((sum: number, line: any) => {
        return sum + (line.line?.length || 0);
      }, 0);

      const estimatedSceneShots = Math.max(
        2,
        Math.ceil((dialogueLines.length + 2) * pacingMultiplier)
      );

      const isFirstSceneInAct = scenes.indexOf(scene) === 0;

      for (let i = 0; i < estimatedSceneShots; i++) {
        const isFirstShot = i === 0;
        const isLastShot = i === estimatedSceneShots - 1;

        const shotType = getShotTypeForContext(
          isFirstShot && (isFirstSceneInAct || options.includeEstablishing),
          totalDialogueLength / estimatedSceneShots,
          characters.length
        );

        const durationSeconds = getOptimalShotDuration(
          shotType,
          Math.floor(totalDialogueLength / estimatedSceneShots)
        );

        const cameraAngle = getCameraAngleForShot(shotType);
        const cameraMovement = getCameraMovementForDuration(durationSeconds, shotType);

        const narrativeDescription = isFirstShot
          ? `${description.substring(0, 150)}`
          : `Continuation of scene in ${location}`;

        const technicalDescription = `${shotType.replace('_', ' ')} with ${cameraAngle.replace('_', ' ')} angle, ${cameraMovement} camera`;

        const relevantCharacters = isFirstShot || shotType.includes('wide')
          ? characters
          : characters.slice(0, Math.min(2, characters.length));

        shots.push({
          act_number: act.act_number,
          scene_number: scene.scene_number,
          shot_number: globalShotNumber,
          shot_type: shotType,
          camera_angle: cameraAngle,
          camera_movement: cameraMovement,
          duration_seconds: durationSeconds,
          narrative_description: narrativeDescription,
          technical_description: technicalDescription,
          characters: relevantCharacters,
          location,
          props: []
        });

        globalShotNumber++;
      }
    }
  }

  const { error: insertError } = await supabase
    .from('production_shot_plans')
    .insert(
      shots.map((shot, index) => ({
        episode_id: episodeId,
        series_id: seriesId,
        organization_id: organizationId,
        ...shot,
        rendering_order: index + 1,
        status: 'draft'
      }))
    );

  if (insertError) {
    console.error('Error saving shot plans:', insertError);
    throw insertError;
  }

  return shots;
}

export async function generateStandaloneShotList(
  scriptId: string,
  seriesId: string,
  organizationId: string,
  options: GenerationOptions = {}
): Promise<ShotPlan[]> {
  return generateShotListFromScript(scriptId, null, seriesId, organizationId, options);
}

export async function getScriptAnalysis(
  scriptId: string,
  organizationId: string | null = null
): Promise<{
  script_id: string;
  title: string;
  version: number;
  series_id: string;
  series_title: string;
  status: string;
  has_episode: boolean;
  estimated_acts: number;
  estimated_scenes: number;
  estimated_shots: number;
  estimated_runtime_minutes: number;
}> {
  const { data, error } = await supabase.rpc('get_script_analysis_for_production', {
    p_script_id: scriptId,
    p_organization_id: organizationId
  });

  if (error) throw error;
  return data as any;
}

export async function regenerateShotList(
  episodeId: string,
  options: GenerationOptions
): Promise<number> {
  const { error: deleteError } = await supabase
    .from('production_shot_plans')
    .delete()
    .eq('episode_id', episodeId);

  if (deleteError) {
    throw deleteError;
  }

  const { data: episode } = await supabase
    .from('episodes')
    .select('script_id, series_id, organization_id')
    .eq('id', episodeId)
    .maybeSingle();

  if (!episode) {
    throw new Error('Episode not found');
  }

  const shots = await generateShotListFromScript(
    episode.script_id,
    episodeId,
    episode.series_id,
    episode.organization_id,
    options
  );

  return shots.length;
}

export async function getShotListSummary(episodeId: string): Promise<{
  totalShots: number;
  totalDuration: number;
  averageDuration: number;
  shotsByDuration: { [key: number]: number };
  shotsByType: { [key: string]: number };
  estimatedCost: number;
}> {
  const { data: shots, error } = await supabase
    .from('production_shot_plans')
    .select('*')
    .eq('episode_id', episodeId);

  if (error || !shots) {
    throw error || new Error('Failed to fetch shots');
  }

  const totalShots = shots.length;
  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration_seconds, 0);
  const averageDuration = totalShots > 0 ? totalDuration / totalShots : 0;

  const shotsByDuration: { [key: number]: number } = { 4: 0, 6: 0, 8: 0 };
  const shotsByType: { [key: string]: number } = {};

  shots.forEach(shot => {
    shotsByDuration[shot.duration_seconds] = (shotsByDuration[shot.duration_seconds] || 0) + 1;
    shotsByType[shot.shot_type] = (shotsByType[shot.shot_type] || 0) + 1;
  });

  const estimatedCost = totalDuration * 0.75 * 2;

  return {
    totalShots,
    totalDuration,
    averageDuration,
    shotsByDuration,
    shotsByType,
    estimatedCost
  };
}

export async function updateShotPlan(
  shotId: string,
  updates: Partial<ShotPlan>
): Promise<void> {
  const { error } = await supabase
    .from('production_shot_plans')
    .update(updates)
    .eq('id', shotId);

  if (error) {
    throw error;
  }
}

export async function deleteShotPlan(shotId: string): Promise<void> {
  const { error } = await supabase
    .from('production_shot_plans')
    .delete()
    .eq('id', shotId);

  if (error) {
    throw error;
  }
}

export async function reorderShots(episodeId: string, shotIds: string[]): Promise<void> {
  const updates = shotIds.map((id, index) => ({
    id,
    rendering_order: index + 1
  }));

  for (const update of updates) {
    await supabase
      .from('production_shot_plans')
      .update({ rendering_order: update.rendering_order })
      .eq('id', update.id);
  }
}

export function calculateOptimalPacing(
  runtimeMinutes: number,
  targetShotCount?: number
): 'fast' | 'medium' | 'slow' {
  const shotsPerMinute = targetShotCount ? targetShotCount / runtimeMinutes : 8;

  if (shotsPerMinute > 10) return 'fast';
  if (shotsPerMinute < 6) return 'slow';
  return 'medium';
}
