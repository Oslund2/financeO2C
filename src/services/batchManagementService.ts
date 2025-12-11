import { supabase } from '../lib/supabase';
import { Veo3Parameters } from './vertexAIService';

export interface BatchConfig {
  veo3_config: {
    aspectRatio: '16:9' | '9:16';
    resolution: '720p' | '1080p';
    sampleCount: 1 | 2 | 3 | 4;
    generateAudio: boolean;
  };
}

export interface BatchPlan {
  id?: string;
  batch_number: number;
  batch_name: string;
  batch_type: 'speed' | 'narrative' | 'hybrid';
  shotIds: string[];
  shot_count: number;
  api_call_count: number;
  estimated_duration_minutes: number;
  estimated_cost: number;
  config: BatchConfig;
}

export interface BatchComparison {
  speedMode: BatchPlan[];
  narrativeMode: BatchPlan[];
  speedModeStats: BatchStats;
  narrativeModeStats: BatchStats;
}

export interface BatchStats {
  totalBatches: number;
  totalShots: number;
  totalCost: number;
  estimatedMinutes: number;
  averageShotsPerBatch: number;
}

const API_RATE_LIMIT = 50;
const VEO3_COST_PER_SECOND = 0.75;
const PROCESSING_OVERHEAD_FACTOR = 1.2;

function calculateBatchCost(shots: any[], sampleCount: number): number {
  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration_seconds, 0);
  return totalDuration * VEO3_COST_PER_SECOND * sampleCount;
}

function calculateBatchDuration(apiCallCount: number): number {
  const batchesNeeded = Math.ceil(apiCallCount / API_RATE_LIMIT);
  return batchesNeeded * PROCESSING_OVERHEAD_FACTOR;
}

async function fetchShots(episodeId: string) {
  const { data: shots, error } = await supabase
    .from('production_shot_plans')
    .select('*')
    .eq('episode_id', episodeId)
    .order('rendering_order', { ascending: true });

  if (error || !shots) {
    throw error || new Error('Failed to fetch shots');
  }

  return shots;
}

export async function generateSpeedModeBatches(
  episodeId: string,
  config: BatchConfig
): Promise<BatchPlan[]> {
  const shots = await fetchShots(episodeId);

  const groupedByLocation: { [key: string]: any[] } = {};
  shots.forEach(shot => {
    const key = shot.location || 'unknown';
    if (!groupedByLocation[key]) {
      groupedByLocation[key] = [];
    }
    groupedByLocation[key].push(shot);
  });

  const batches: BatchPlan[] = [];
  let batchNumber = 1;

  for (const [location, locationShots] of Object.entries(groupedByLocation)) {
    const charactersInLocation = new Set<string>();
    locationShots.forEach(shot => {
      (shot.characters || []).forEach((char: string) => charactersInLocation.add(char));
    });

    const groupedByCharacters: { [key: string]: any[] } = {};
    locationShots.forEach(shot => {
      const charKey = (shot.characters || []).sort().join('_') || 'no_characters';
      if (!groupedByCharacters[charKey]) {
        groupedByCharacters[charKey] = [];
      }
      groupedByCharacters[charKey].push(shot);
    });

    for (const [charCombo, comboShots] of Object.entries(groupedByCharacters)) {
      const apiCallCount = comboShots.length * config.veo3_config.sampleCount;
      const estimatedCost = calculateBatchCost(comboShots, config.veo3_config.sampleCount);
      const estimatedDuration = calculateBatchDuration(apiCallCount);

      batches.push({
        batch_number: batchNumber++,
        batch_name: `${location} - ${charCombo.replace(/_/g, ', ')}`,
        batch_type: 'speed',
        shotIds: comboShots.map((s: any) => s.id),
        shot_count: comboShots.length,
        api_call_count: apiCallCount,
        estimated_duration_minutes: estimatedDuration,
        estimated_cost: estimatedCost,
        config
      });
    }
  }

  return batches;
}

export async function generateNarrativeModeBatches(
  episodeId: string,
  config: BatchConfig,
  maxShotsPerBatch: number = 30
): Promise<BatchPlan[]> {
  const shots = await fetchShots(episodeId);

  const groupedByAct: { [key: number]: any[] } = {};
  shots.forEach(shot => {
    const actNum = shot.act_number || 1;
    if (!groupedByAct[actNum]) {
      groupedByAct[actNum] = [];
    }
    groupedByAct[actNum].push(shot);
  });

  const batches: BatchPlan[] = [];
  let batchNumber = 1;

  for (const [actNum, actShots] of Object.entries(groupedByAct)) {
    for (let i = 0; i < actShots.length; i += maxShotsPerBatch) {
      const batchShots = actShots.slice(i, i + maxShotsPerBatch);
      const firstScene = batchShots[0].scene_number;
      const lastScene = batchShots[batchShots.length - 1].scene_number;

      const apiCallCount = batchShots.length * config.veo3_config.sampleCount;
      const estimatedCost = calculateBatchCost(batchShots, config.veo3_config.sampleCount);
      const estimatedDuration = calculateBatchDuration(apiCallCount);

      const scenesRange = firstScene === lastScene
        ? `Scene ${firstScene}`
        : `Scenes ${firstScene}-${lastScene}`;

      batches.push({
        batch_number: batchNumber++,
        batch_name: `Act ${actNum} ${scenesRange}`,
        batch_type: 'narrative',
        shotIds: batchShots.map((s: any) => s.id),
        shot_count: batchShots.length,
        api_call_count: apiCallCount,
        estimated_duration_minutes: estimatedDuration,
        estimated_cost: estimatedCost,
        config
      });
    }
  }

  return batches;
}

export async function compareBatchModes(
  episodeId: string,
  config: BatchConfig
): Promise<BatchComparison> {
  const speedMode = await generateSpeedModeBatches(episodeId, config);
  const narrativeMode = await generateNarrativeModeBatches(episodeId, config);

  const calculateStats = (batches: BatchPlan[]): BatchStats => ({
    totalBatches: batches.length,
    totalShots: batches.reduce((sum, b) => sum + b.shot_count, 0),
    totalCost: batches.reduce((sum, b) => sum + b.estimated_cost, 0),
    estimatedMinutes: batches.reduce((sum, b) => sum + b.estimated_duration_minutes, 0),
    averageShotsPerBatch: batches.length > 0
      ? batches.reduce((sum, b) => sum + b.shot_count, 0) / batches.length
      : 0
  });

  return {
    speedMode,
    narrativeMode,
    speedModeStats: calculateStats(speedMode),
    narrativeModeStats: calculateStats(narrativeMode)
  };
}

export async function saveBatchPlans(
  episodeId: string,
  seriesId: string,
  organizationId: string,
  batches: BatchPlan[]
): Promise<string[]> {
  const batchInserts = batches.map(batch => ({
    episode_id: episodeId,
    series_id: seriesId,
    organization_id: organizationId,
    batch_number: batch.batch_number,
    batch_name: batch.batch_name,
    batch_type: batch.batch_type,
    shot_count: batch.shot_count,
    api_call_count: batch.api_call_count,
    estimated_duration_minutes: batch.estimated_duration_minutes,
    estimated_cost: batch.estimated_cost,
    veo3_config: batch.config.veo3_config,
    status: 'pending',
    priority_order: batch.batch_number
  }));

  const { data: savedBatches, error: insertError } = await supabase
    .from('production_batches')
    .insert(batchInserts)
    .select();

  if (insertError || !savedBatches) {
    throw insertError || new Error('Failed to save batches');
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const savedBatch = savedBatches[i];

    const { error: updateError } = await supabase
      .from('production_shot_plans')
      .update({ batch_id: savedBatch.id })
      .in('id', batch.shotIds);

    if (updateError) {
      console.error(`Error assigning shots to batch ${savedBatch.id}:`, updateError);
    }
  }

  return savedBatches.map(b => b.id);
}

export async function clearBatches(episodeId: string): Promise<void> {
  const { error: updateError } = await supabase
    .from('production_shot_plans')
    .update({ batch_id: null })
    .eq('episode_id', episodeId);

  if (updateError) {
    console.error('Error clearing shot batch assignments:', updateError);
  }

  const { error: deleteError } = await supabase
    .from('production_batches')
    .delete()
    .eq('episode_id', episodeId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function getBatchesForEpisode(episodeId: string): Promise<any[]> {
  const { data: batches, error } = await supabase
    .from('production_batches')
    .select('*')
    .eq('episode_id', episodeId)
    .order('batch_number', { ascending: true });

  if (error) {
    throw error;
  }

  return batches || [];
}

export async function updateBatchConfig(
  batchId: string,
  config: BatchConfig
): Promise<void> {
  const { data: batch, error: fetchError } = await supabase
    .from('production_batches')
    .select('shot_count')
    .eq('id', batchId)
    .single();

  if (fetchError || !batch) {
    throw fetchError || new Error('Batch not found');
  }

  const { data: shots, error: shotsError } = await supabase
    .from('production_shot_plans')
    .select('duration_seconds')
    .eq('batch_id', batchId);

  if (shotsError || !shots) {
    throw shotsError || new Error('Failed to fetch batch shots');
  }

  const apiCallCount = batch.shot_count * config.veo3_config.sampleCount;
  const estimatedCost = calculateBatchCost(shots, config.veo3_config.sampleCount);
  const estimatedDuration = calculateBatchDuration(apiCallCount);

  const { error: updateError } = await supabase
    .from('production_batches')
    .update({
      veo3_config: config.veo3_config,
      api_call_count: apiCallCount,
      estimated_cost: estimatedCost,
      estimated_duration_minutes: estimatedDuration
    })
    .eq('id', batchId);

  if (updateError) {
    throw updateError;
  }
}

export async function reorderBatches(batchIds: string[]): Promise<void> {
  for (let i = 0; i < batchIds.length; i++) {
    await supabase
      .from('production_batches')
      .update({
        batch_number: i + 1,
        priority_order: i + 1
      })
      .eq('id', batchIds[i]);
  }
}

export async function getBatchReadinessStatus(episodeId: string): Promise<{
  totalBatches: number;
  readyBatches: number;
  totalShots: number;
  readyShots: number;
  missingPrompts: number;
  invalidPrompts: number;
}> {
  const { data: batches } = await supabase
    .from('production_batches')
    .select('id')
    .eq('episode_id', episodeId);

  const { data: shots } = await supabase
    .from('production_shot_plans')
    .select(`
      id,
      status,
      production_shot_prompts (
        id,
        validated,
        validation_errors
      )
    `)
    .eq('episode_id', episodeId);

  if (!batches || !shots) {
    return {
      totalBatches: 0,
      readyBatches: 0,
      totalShots: 0,
      readyShots: 0,
      missingPrompts: 0,
      invalidPrompts: 0
    };
  }

  let readyShots = 0;
  let missingPrompts = 0;
  let invalidPrompts = 0;

  shots.forEach((shot: any) => {
    const prompts = shot.production_shot_prompts || [];
    if (prompts.length === 0) {
      missingPrompts++;
    } else if (!prompts[0].validated) {
      invalidPrompts++;
    } else {
      readyShots++;
    }
  });

  return {
    totalBatches: batches.length,
    readyBatches: batches.length,
    totalShots: shots.length,
    readyShots,
    missingPrompts,
    invalidPrompts
  };
}

export function getPresetConfigurations(): {
  name: string;
  config: BatchConfig;
  description: string;
  estimatedCostFactor: number;
}[] {
  return [
    {
      name: 'Fast Preview',
      config: {
        veo3_config: {
          aspectRatio: '16:9',
          resolution: '720p',
          sampleCount: 1,
          generateAudio: false
        }
      },
      description: '720p, 1 sample, no audio - fastest and cheapest for quick previews',
      estimatedCostFactor: 0.5
    },
    {
      name: 'Standard Production',
      config: {
        veo3_config: {
          aspectRatio: '16:9',
          resolution: '1080p',
          sampleCount: 2,
          generateAudio: true
        }
      },
      description: '1080p, 2 samples, with audio - balanced quality and choice',
      estimatedCostFactor: 1.0
    },
    {
      name: 'High Quality',
      config: {
        veo3_config: {
          aspectRatio: '16:9',
          resolution: '1080p',
          sampleCount: 4,
          generateAudio: true
        }
      },
      description: '1080p, 4 samples, with audio - maximum options for selection',
      estimatedCostFactor: 2.0
    },
    {
      name: 'Mobile Optimized',
      config: {
        veo3_config: {
          aspectRatio: '9:16',
          resolution: '1080p',
          sampleCount: 2,
          generateAudio: true
        }
      },
      description: '9:16 portrait, 1080p, 2 samples - perfect for mobile/vertical content',
      estimatedCostFactor: 1.0
    }
  ];
}
