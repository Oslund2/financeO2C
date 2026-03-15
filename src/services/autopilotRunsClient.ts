/**
 * Autopilot Runs Client
 *
 * Uses local store (localStorage) instead of Supabase PostgREST,
 * which has a frozen schema cache that won't pick up new tables or functions.
 */

import {
  insertRun,
  updateRun,
  getRun,
  getRunsForOrg,
  type AutopilotRunData,
} from './autopilotRunStore';

export type AutopilotRunRow = AutopilotRunData;

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
  const id = insertRun(params);
  return { id };
}

export async function updateAutopilotRun(
  runId: string,
  updates: Record<string, unknown>
): Promise<void> {
  updateRun(runId, updates as Partial<AutopilotRunData>);
}

export async function fetchAutopilotRun(runId: string): Promise<AutopilotRunRow | null> {
  return getRun(runId);
}

export async function fetchAutopilotRunsForOrg(organizationId: string): Promise<AutopilotRunRow[]> {
  return getRunsForOrg(organizationId);
}
