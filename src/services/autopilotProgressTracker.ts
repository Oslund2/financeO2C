import { supabase } from '../lib/supabase';

export type PipelineState =
  | 'initiated' | 'scripting' | 'shot_planning' | 'storyboarding'
  | 'video_rendering' | 'dialogue_audio' | 'lip_sync'
  | 'assembling' | 'complete' | 'failed';

const STATE_PROGRESS: Record<PipelineState, number> = {
  initiated: 0,
  scripting: 5,
  shot_planning: 12,
  storyboarding: 20,
  video_rendering: 40,
  dialogue_audio: 65,
  lip_sync: 75,
  assembling: 88,
  complete: 100,
  failed: -1,
};

export const STATE_LABELS: Record<PipelineState, string> = {
  initiated: 'Starting up',
  scripting: 'Writing script',
  shot_planning: 'Planning shots',
  storyboarding: 'Generating storyboards',
  video_rendering: 'Rendering video',
  dialogue_audio: 'Generating dialogue',
  lip_sync: 'Applying lip sync',
  assembling: 'Assembling final video',
  complete: 'Complete',
  failed: 'Failed',
};

export interface AutopilotRun {
  id: string;
  episode_id: string | null;
  series_id: string;
  organization_id: string;
  storyline: string;
  format_type: string;
  target_runtime_minutes: number;
  quality_preset: string;
  current_state: PipelineState;
  progress_percent: number;
  current_stage_detail: string | null;
  stages_completed: string[];
  decision_log: Array<{ timestamp: string; decision: string; rationale?: string }>;
  script_id: string | null;
  started_at: string | null;
  estimated_completion_at: string | null;
  completed_at: string | null;
  output_video_url: string | null;
  error_message: string | null;
  retry_count: number;
  skipped_shots: number[];
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  created_at: string;
}

export async function advanceState(
  runId: string,
  newState: PipelineState,
  detail?: string
): Promise<void> {
  const baseProgress = STATE_PROGRESS[newState];
  const updates: Record<string, unknown> = {
    current_state: newState,
    progress_percent: baseProgress >= 0 ? baseProgress : undefined,
    current_stage_detail: detail || STATE_LABELS[newState],
  };
  if (newState === 'complete') {
    updates.completed_at = new Date().toISOString();
    updates.progress_percent = 100;
  }
  await supabase.from('autopilot_runs').update(updates).eq('id', runId);
}

export async function updateStageDetail(
  runId: string,
  detail: string,
  progressPercent?: number
): Promise<void> {
  const updates: Record<string, unknown> = { current_stage_detail: detail };
  if (progressPercent !== undefined) updates.progress_percent = progressPercent;
  await supabase.from('autopilot_runs').update(updates).eq('id', runId);
}

export async function logDecision(
  runId: string,
  decision: string,
  rationale?: string
): Promise<void> {
  const { data } = await supabase
    .from('autopilot_runs')
    .select('decision_log')
    .eq('id', runId)
    .single();

  const log = (data?.decision_log as Array<Record<string, string>>) || [];
  log.push({ timestamp: new Date().toISOString(), decision, rationale: rationale || '' });

  await supabase.from('autopilot_runs').update({ decision_log: log }).eq('id', runId);
}

export async function markFailed(runId: string, error: string): Promise<void> {
  await supabase.from('autopilot_runs').update({
    current_state: 'failed',
    error_message: error,
    current_stage_detail: `Failed: ${error}`,
  }).eq('id', runId);
}

export async function markStageCompleted(runId: string, stage: string): Promise<void> {
  const { data } = await supabase
    .from('autopilot_runs')
    .select('stages_completed')
    .eq('id', runId)
    .single();
  const completed = (data?.stages_completed as string[]) || [];
  if (!completed.includes(stage)) completed.push(stage);
  await supabase.from('autopilot_runs').update({ stages_completed: completed }).eq('id', runId);
}

export async function fetchRun(runId: string): Promise<AutopilotRun | null> {
  const { data } = await supabase
    .from('autopilot_runs')
    .select('*')
    .eq('id', runId)
    .single();
  return data as AutopilotRun | null;
}

export async function fetchRunsForOrg(organizationId: string): Promise<AutopilotRun[]> {
  const { data } = await supabase
    .from('autopilot_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data || []) as AutopilotRun[];
}
