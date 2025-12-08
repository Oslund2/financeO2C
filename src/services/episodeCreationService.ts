import { supabase } from '../lib/supabase';
import { calculateProductionCosts, ScriptData } from './costCalculationService';
import { lockScript } from './scriptLockingService';

interface Script {
  id: string;
  series_id: string | null;
  title: string;
  episode_number: number | null;
  runtime_minutes: number;
  synopsis: string | null;
  theme: string | null;
  vocabulary_words: string[];
  status: string;
  locked: boolean;
}

interface Act {
  id: string;
  act_number: number;
  title: string | null;
  description: string | null;
  duration: number | null;
}

interface Scene {
  id: string;
  scene_number: number;
  title: string | null;
  description: string | null;
  dialogue: Array<{ character: string; line: string }>;
  duration: number | null;
  claymation_notes: string | null;
}

export interface EpisodeCreationData {
  title?: string;
  isMultiPart?: boolean;
  partNumber?: number;
  previousEpisodeId?: string | null;
  createdBy: string;
}

export async function getScriptWithDetails(scriptId: string) {
  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', scriptId)
    .single();

  if (scriptError) throw scriptError;
  if (!script) throw new Error('Script not found');

  const { data: acts, error: actsError } = await supabase
    .from('script_acts')
    .select('*')
    .eq('script_id', scriptId)
    .order('act_number', { ascending: true });

  if (actsError) throw actsError;

  const actsWithScenes = await Promise.all(
    (acts || []).map(async (act) => {
      const { data: scenes, error: scenesError } = await supabase
        .from('script_scenes')
        .select('*')
        .eq('act_id', act.id)
        .order('scene_number', { ascending: true });

      if (scenesError) throw scenesError;

      return {
        ...act,
        scenes: scenes || [],
      };
    })
  );

  return {
    script: script as Script,
    acts: actsWithScenes as Array<Act & { scenes: Scene[] }>,
  };
}

export async function validateScriptForEpisode(scriptId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  const { data: script } = await supabase
    .from('scripts')
    .select('status, locked')
    .eq('id', scriptId)
    .single();

  if (!script) {
    errors.push('Script not found');
    return { valid: false, errors };
  }

  if (script.locked) {
    errors.push('Script is already locked for another episode');
  }

  const { data: acts } = await supabase
    .from('script_acts')
    .select('id')
    .eq('script_id', scriptId);

  if (!acts || acts.length === 0) {
    errors.push('Script must have at least one act');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function createEpisodeFromScript(
  scriptId: string,
  episodeData: EpisodeCreationData
): Promise<string> {
  const validation = await validateScriptForEpisode(scriptId);
  if (!validation.valid) {
    throw new Error(`Cannot create episode: ${validation.errors.join(', ')}`);
  }

  const { script, acts } = await getScriptWithDetails(scriptId);

  const uniqueCharacters = new Set<string>();
  acts.forEach(act => {
    act.scenes.forEach(scene => {
      scene.dialogue.forEach(line => {
        if (line.character) {
          uniqueCharacters.add(line.character);
        }
      });
    });
  });

  const scriptData: ScriptData = {
    runtime_minutes: script.runtime_minutes || 22,
    acts: acts.map(act => ({
      scenes: act.scenes.map(scene => ({
        dialogue: scene.dialogue || [],
        description: scene.description || undefined,
      })),
    })),
    unique_characters: Array.from(uniqueCharacters),
  };

  const costComparison = await calculateProductionCosts(scriptData, script.series_id);

  const scriptSnapshot = {
    script: {
      id: script.id,
      title: script.title,
      episode_number: script.episode_number,
      runtime_minutes: script.runtime_minutes,
      synopsis: script.synopsis,
      theme: script.theme,
      vocabulary_words: script.vocabulary_words,
    },
    acts: acts.map(act => ({
      id: act.id,
      act_number: act.act_number,
      title: act.title,
      description: act.description,
      duration: act.duration,
      scenes: act.scenes.map(scene => ({
        id: scene.id,
        scene_number: scene.scene_number,
        title: scene.title,
        description: scene.description,
        dialogue: scene.dialogue,
        duration: scene.duration,
        claymation_notes: scene.claymation_notes,
      })),
    })),
    cost_comparison: costComparison,
    snapshot_created_at: new Date().toISOString(),
  };

  const episodeTitle = episodeData.title || script.title;
  const finalTitle = episodeData.isMultiPart && episodeData.partNumber
    ? `${episodeTitle} - Part ${episodeData.partNumber}`
    : episodeTitle;

  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .insert([{
      script_id: scriptId,
      series_id: script.series_id,
      title: finalTitle,
      status: 'planning',
      progress_percentage: 0,
      estimated_cost: costComparison.aiCost.totalCost,
      source_script_snapshot: scriptSnapshot,
      script_version: 1,
      sync_status: 'in_sync',
      multi_part_episode: episodeData.isMultiPart || false,
      part_number: episodeData.partNumber || 1,
      previous_episode_id: episodeData.previousEpisodeId || null,
      production_notes: `Episode created from script "${script.title}" by ${episodeData.createdBy}.\n\nEstimated Cost (AI): $${costComparison.aiCost.totalCost.toFixed(2)}\nEstimated Cost (Traditional): $${costComparison.traditionalCost.totalCost.toFixed(2)}\nEstimated Savings: $${costComparison.savings.toFixed(2)} (${costComparison.savingsPercentage.toFixed(1)}%)`,
    }])
    .select()
    .single();

  if (episodeError) throw episodeError;

  if (episodeData.previousEpisodeId) {
    await supabase
      .from('episodes')
      .update({ next_episode_id: episode.id })
      .eq('id', episodeData.previousEpisodeId);
  }

  await lockScript(
    scriptId,
    episodeData.createdBy,
    episode.id,
    `Script locked for episode "${finalTitle}"`
  );

  await supabase
    .from('scripts')
    .update({ status: 'in_production' })
    .eq('id', scriptId);

  return episode.id;
}

export async function getEpisodesByScript(scriptId: string) {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('script_id', scriptId)
    .order('part_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function syncEpisodeFromScript(episodeId: string): Promise<void> {
  const { data: episode } = await supabase
    .from('episodes')
    .select('script_id, source_script_snapshot, status')
    .eq('id', episodeId)
    .single();

  if (!episode || !episode.script_id) {
    throw new Error('Episode or script not found');
  }

  if (['assets', 'voice', 'video', 'assembly', 'review', 'completed'].includes(episode.status)) {
    throw new Error('Cannot auto-sync episodes in production stage. Manual review required.');
  }

  const { script, acts } = await getScriptWithDetails(episode.script_id);

  const uniqueCharacters = new Set<string>();
  acts.forEach(act => {
    act.scenes.forEach(scene => {
      scene.dialogue.forEach(line => {
        if (line.character) {
          uniqueCharacters.add(line.character);
        }
      });
    });
  });

  const scriptData: ScriptData = {
    runtime_minutes: script.runtime_minutes || 22,
    acts: acts.map(act => ({
      scenes: act.scenes.map(scene => ({
        dialogue: scene.dialogue || [],
        description: scene.description || undefined,
      })),
    })),
    unique_characters: Array.from(uniqueCharacters),
  };

  const costComparison = await calculateProductionCosts(scriptData, script.series_id);

  const newSnapshot = {
    script: {
      id: script.id,
      title: script.title,
      episode_number: script.episode_number,
      runtime_minutes: script.runtime_minutes,
      synopsis: script.synopsis,
      theme: script.theme,
      vocabulary_words: script.vocabulary_words,
    },
    acts: acts.map(act => ({
      id: act.id,
      act_number: act.act_number,
      title: act.title,
      description: act.description,
      duration: act.duration,
      scenes: act.scenes.map(scene => ({
        id: scene.id,
        scene_number: scene.scene_number,
        title: scene.title,
        description: scene.description,
        dialogue: scene.dialogue,
        duration: scene.duration,
        claymation_notes: scene.claymation_notes,
      })),
    })),
    cost_comparison: costComparison,
    snapshot_created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('episodes')
    .update({
      source_script_snapshot: newSnapshot,
      sync_status: 'in_sync',
      estimated_cost: costComparison.aiCost.totalCost,
    })
    .eq('id', episodeId);

  if (error) throw error;
}
