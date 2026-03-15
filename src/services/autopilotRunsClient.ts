/**
 * Autopilot Runs Client
 *
 * Bypasses PostgREST table routing (which has schema cache issues) by using
 * RPC functions instead. All autopilot_runs CRUD goes through here.
 */

import { supabase } from '../lib/supabase';

export interface AutopilotRunRow {
  id: string;
  episode_id: string | null;
  series_id: string;
  organization_id: string;
  storyline: string;
  format_type: string;
  target_runtime_minutes: number;
  quality_preset: string;
  current_state: string;
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
  updated_at: string;
}

export async function insertAutopilotRun(params: {
  series_id: string;
  organization_id: string;
  storyline: string;
  format_type: string;
  target_runtime_minutes: number;
  quality_preset: string;
  current_state: string;
  progress_percent: number;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('insert_autopilot_run', {
    p_series_id: params.series_id,
    p_organization_id: params.organization_id,
    p_storyline: params.storyline,
    p_format_type: params.format_type,
    p_target_runtime_minutes: params.target_runtime_minutes,
    p_quality_preset: params.quality_preset,
  });
  if (error) throw new Error(`Failed to create autopilot run: ${error.message}`);
  return { id: data as string };
}

export async function updateAutopilotRun(
  runId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.rpc('update_autopilot_run', {
    p_run_id: runId,
    p_data: updates,
  });
  if (error) throw new Error(`Failed to update autopilot run: ${error.message}`);
}

export async function fetchAutopilotRun(runId: string): Promise<AutopilotRunRow | null> {
  const { data, error } = await supabase.rpc('get_autopilot_run', {
    p_run_id: runId,
  });
  if (error) throw new Error(`Failed to fetch autopilot run: ${error.message}`);
  return (data as AutopilotRunRow) || null;
}

export async function fetchAutopilotRunsForOrg(organizationId: string): Promise<AutopilotRunRow[]> {
  const { data, error } = await supabase.rpc('get_autopilot_runs_for_org', {
    p_organization_id: organizationId,
  });
  if (error) throw new Error(`Failed to fetch autopilot runs: ${error.message}`);
  return (data as AutopilotRunRow[]) || [];
}
