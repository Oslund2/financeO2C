import { supabase } from '../lib/supabase';
import type {
  WorkspaceMission,
  WorkspaceMissionInsert,
  WorkspaceMissionUpdate,
  SeriesMission,
  SeriesMissionInsert,
  SeriesMissionUpdate,
  FeatureRecommendation,
  MissionGeneratedPrompt,
  MissionHealthScore,
} from '../types/mission';

export function calculateMissionHealth(mission: WorkspaceMission | null): MissionHealthScore {
  if (!mission) {
    return { total: 6, filled: 0, percentage: 0, missing: ['mission_statement', 'target_audience', 'content_goals', 'brand_voice', 'content_guardrails', 'visual_rendering_style'] };
  }

  const fields: { key: string; label: string; check: () => boolean }[] = [
    { key: 'mission_statement', label: 'Mission Statement', check: () => !!mission.mission_statement.trim() },
    { key: 'target_audience', label: 'Target Audience', check: () => Object.keys(mission.target_audience || {}).length > 0 },
    { key: 'content_goals', label: 'Content Goals', check: () => (mission.content_goals || []).length > 0 },
    { key: 'brand_voice', label: 'Brand Voice', check: () => !!mission.brand_voice.trim() },
    { key: 'content_guardrails', label: 'Content Guardrails', check: () => !!mission.content_guardrails.trim() },
    { key: 'visual_rendering_style', label: 'Visual Style', check: () => mission.visual_rendering_style !== 'general' && !!mission.visual_rendering_style.trim() },
  ];

  const missing = fields.filter(f => !f.check()).map(f => f.label);
  const filled = fields.length - missing.length;

  return {
    total: fields.length,
    filled,
    percentage: Math.round((filled / fields.length) * 100),
    missing,
  };
}

export async function getWorkspaceMission(organizationId: string): Promise<WorkspaceMission | null> {
  const { data, error } = await supabase
    .from('workspace_missions')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching workspace mission:', error);
    return null;
  }

  return data as WorkspaceMission | null;
}

export async function createWorkspaceMission(mission: WorkspaceMissionInsert): Promise<WorkspaceMission | null> {
  const { data, error } = await supabase
    .from('workspace_missions')
    .insert({
      organization_id: mission.organization_id,
      mission_statement: mission.mission_statement || '',
      target_audience: mission.target_audience || {},
      content_goals: mission.content_goals || [],
      brand_voice: mission.brand_voice || '',
      content_guardrails: mission.content_guardrails || '',
      visual_rendering_style: mission.visual_rendering_style || 'general',
      mission_status: mission.mission_status || 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workspace mission:', error);
    return null;
  }

  return data as WorkspaceMission;
}

export async function updateWorkspaceMission(
  missionId: string,
  updates: WorkspaceMissionUpdate
): Promise<WorkspaceMission | null> {
  const { data, error } = await supabase
    .from('workspace_missions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workspace mission:', error);
    return null;
  }

  return data as WorkspaceMission;
}

export async function getSeriesMission(seriesId: string): Promise<SeriesMission | null> {
  const { data, error } = await supabase
    .from('series_missions')
    .select('*')
    .eq('series_id', seriesId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching series mission:', error);
    return null;
  }

  return data as SeriesMission | null;
}

export async function createSeriesMission(mission: SeriesMissionInsert): Promise<SeriesMission | null> {
  const { data, error } = await supabase
    .from('series_missions')
    .insert({
      series_id: mission.series_id,
      workspace_mission_id: mission.workspace_mission_id || null,
      sub_mission: mission.sub_mission || '',
      target_sub_audience: mission.target_sub_audience || {},
      tone_overrides: mission.tone_overrides || '',
      content_focus: mission.content_focus || [],
      series_rules: mission.series_rules || '',
      inherits_workspace_mission: mission.inherits_workspace_mission ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating series mission:', error);
    return null;
  }

  return data as SeriesMission;
}

export async function updateSeriesMission(
  missionId: string,
  updates: SeriesMissionUpdate
): Promise<SeriesMission | null> {
  const { data, error } = await supabase
    .from('series_missions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating series mission:', error);
    return null;
  }

  return data as SeriesMission;
}

export async function getFeatureRecommendations(missionId: string): Promise<FeatureRecommendation[]> {
  const { data, error } = await supabase
    .from('workspace_feature_recommendations')
    .select('*')
    .eq('workspace_mission_id', missionId)
    .order('priority_score', { ascending: false });

  if (error) {
    console.error('Error fetching feature recommendations:', error);
    return [];
  }

  return (data || []) as FeatureRecommendation[];
}

export async function updateFeatureRecommendation(
  id: string,
  isEnabled: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('workspace_feature_recommendations')
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating feature recommendation:', error);
    return false;
  }

  return true;
}

export async function getMissionGeneratedPrompts(
  workspaceMissionId?: string,
  seriesMissionId?: string
): Promise<MissionGeneratedPrompt[]> {
  let query = supabase.from('mission_generated_prompts').select('*');

  if (workspaceMissionId) {
    query = query.eq('workspace_mission_id', workspaceMissionId);
  }
  if (seriesMissionId) {
    query = query.eq('series_mission_id', seriesMissionId);
  }

  const { data, error } = await query.order('prompt_category').order('prompt_name');

  if (error) {
    console.error('Error fetching mission generated prompts:', error);
    return [];
  }

  return (data || []) as MissionGeneratedPrompt[];
}
