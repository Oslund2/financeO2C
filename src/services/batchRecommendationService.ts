import { supabase } from '../lib/supabase';

export interface BatchRecommendation {
  batch_name: string;
  shot_ids: string[];
  shot_count: number;
  estimated_duration: number;
  estimated_cost: number;
  render_mode: 'speed' | 'narrative';
  priority: number;
  grouping_logic: string;
  location?: string;
  characters?: string[];
}

export interface ShotForBatching {
  id: string;
  act_number: number;
  scene_number: number;
  shot_number: number;
  location: string;
  characters: string[];
  duration_seconds: number;
  shot_type: string;
  status: string;
}

const VEO3_COST_PER_SECOND = 0.75;
const IDEAL_BATCH_SIZE = 15;
const MAX_BATCH_SIZE = 25;

function calculateCost(durationSeconds: number, sampleCount: number = 2): number {
  return durationSeconds * VEO3_COST_PER_SECOND * sampleCount;
}

function groupShotsByLocation(shots: ShotForBatching[]): Map<string, ShotForBatching[]> {
  const groups = new Map<string, ShotForBatching[]>();

  shots.forEach(shot => {
    const location = shot.location || 'Unknown Location';
    if (!groups.has(location)) {
      groups.set(location, []);
    }
    groups.get(location)!.push(shot);
  });

  return groups;
}

function groupShotsByCharacters(shots: ShotForBatching[]): Map<string, ShotForBatching[]> {
  const groups = new Map<string, ShotForBatching[]>();

  shots.forEach(shot => {
    const key = shot.characters.sort().join(',') || 'no-characters';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(shot);
  });

  return groups;
}

function selectRenderMode(shots: ShotForBatching[]): 'speed' | 'narrative' {
  const hasCloseUps = shots.some(s => s.shot_type.includes('close'));
  const hasDialogue = shots.some(s => s.characters.length > 0);
  const totalDuration = shots.reduce((sum, s) => sum + s.duration_seconds, 0);
  const avgDuration = totalDuration / shots.length;

  if (hasCloseUps || hasDialogue || avgDuration > 5) {
    return 'narrative';
  }

  return 'speed';
}

function splitLargeBatch(shots: ShotForBatching[], maxSize: number): ShotForBatching[][] {
  const batches: ShotForBatching[][] = [];
  for (let i = 0; i < shots.length; i += maxSize) {
    batches.push(shots.slice(i, i + maxSize));
  }
  return batches;
}

export async function generateBatchRecommendations(
  episodeId?: string,
  organizationId?: string
): Promise<BatchRecommendation[]> {
  let query = supabase
    .from('production_shot_plans')
    .select('*')
    .in('status', ['draft', 'ready']);

  if (episodeId) {
    query = query.eq('episode_id', episodeId);
  }

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: shots, error } = await query;

  if (error || !shots || shots.length === 0) {
    return [];
  }

  const shotsForBatching: ShotForBatching[] = shots.map(s => ({
    id: s.id,
    act_number: s.act_number,
    scene_number: s.scene_number,
    shot_number: s.shot_number,
    location: s.location,
    characters: s.characters || [],
    duration_seconds: s.duration_seconds,
    shot_type: s.shot_type,
    status: s.status
  }));

  const recommendations: BatchRecommendation[] = [];
  let priorityCounter = 1;

  const locationGroups = groupShotsByLocation(shotsForBatching);

  for (const [location, locationShots] of locationGroups.entries()) {
    if (locationShots.length === 0) continue;

    const characterGroups = groupShotsByCharacters(locationShots);

    for (const [characterKey, groupShots] of characterGroups.entries()) {
      if (groupShots.length === 0) continue;

      const batches = groupShots.length > MAX_BATCH_SIZE
        ? splitLargeBatch(groupShots, IDEAL_BATCH_SIZE)
        : [groupShots];

      batches.forEach((batchShots, index) => {
        const totalDuration = batchShots.reduce((sum, s) => sum + s.duration_seconds, 0);
        const renderMode = selectRenderMode(batchShots);
        const estimatedCost = calculateCost(totalDuration);

        const characters = characterKey !== 'no-characters'
          ? characterKey.split(',')
          : [];

        const batchName = batches.length > 1
          ? `${location} - ${characters.join(', ') || 'Background'} (Part ${index + 1})`
          : `${location} - ${characters.join(', ') || 'Background'}`;

        recommendations.push({
          batch_name: batchName,
          shot_ids: batchShots.map(s => s.id),
          shot_count: batchShots.length,
          estimated_duration: totalDuration,
          estimated_cost: Math.round(estimatedCost * 100) / 100,
          render_mode: renderMode,
          priority: priorityCounter++,
          grouping_logic: `Location: ${location}, Characters: ${characters.join(', ') || 'None'}`,
          location,
          characters
        });
      });
    }
  }

  return recommendations.sort((a, b) => {
    if (a.render_mode === 'narrative' && b.render_mode === 'speed') return -1;
    if (a.render_mode === 'speed' && b.render_mode === 'narrative') return 1;
    return b.shot_count - a.shot_count;
  }).map((rec, index) => ({ ...rec, priority: index + 1 }));
}

export async function createBatchFromRecommendation(
  recommendation: BatchRecommendation,
  episodeId: string,
  seriesId: string,
  organizationId: string
): Promise<string> {
  const { data: batch, error: batchError } = await supabase
    .from('production_batches')
    .insert({
      episode_id: episodeId,
      series_id: seriesId,
      organization_id: organizationId,
      batch_name: recommendation.batch_name,
      render_mode: recommendation.render_mode,
      batch_size: recommendation.shot_count,
      total_duration_seconds: recommendation.estimated_duration,
      estimated_cost: recommendation.estimated_cost,
      status: 'pending',
      priority: recommendation.priority
    })
    .select()
    .single();

  if (batchError || !batch) {
    throw new Error('Failed to create batch');
  }

  const { error: updateError } = await supabase
    .from('production_shot_plans')
    .update({ batch_id: batch.id })
    .in('id', recommendation.shot_ids);

  if (updateError) {
    throw updateError;
  }

  return batch.id;
}

export async function createAllRecommendedBatches(
  recommendations: BatchRecommendation[],
  episodeId: string,
  seriesId: string,
  organizationId: string
): Promise<string[]> {
  const batchIds: string[] = [];

  for (const recommendation of recommendations) {
    const batchId = await createBatchFromRecommendation(
      recommendation,
      episodeId,
      seriesId,
      organizationId
    );
    batchIds.push(batchId);
  }

  return batchIds;
}

export async function getBatchSummary(batchId: string): Promise<any> {
  const { data: batch, error: batchError } = await supabase
    .from('production_batches')
    .select('*')
    .eq('id', batchId)
    .maybeSingle();

  if (batchError || !batch) {
    throw new Error('Batch not found');
  }

  const { data: shots, error: shotsError } = await supabase
    .from('production_shot_plans')
    .select('*')
    .eq('batch_id', batchId)
    .order('rendering_order');

  if (shotsError) {
    throw shotsError;
  }

  return {
    ...batch,
    shots: shots || []
  };
}
