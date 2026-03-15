import {
  updateAutopilotRun,
  fetchAutopilotRun,
  fetchAutopilotRunsForOrg,
  type AutopilotRunRow,
} from './autopilotRunsClient';

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

export type AutopilotRun = AutopilotRunRow;

export async function advanceState(
  runId: string,
  newState: PipelineState,
  detail?: string
): Promise<void> {
  const baseProgress = STATE_PROGRESS[newState];
  const updates: Record<string, unknown> = {
    current_state: newState,
    current_stage_detail: detail || STATE_LABELS[newState],
  };
  if (baseProgress >= 0) updates.progress_percent = baseProgress;
  if (newState === 'complete') {
    updates.completed_at = new Date().toISOString();
    updates.progress_percent = 100;
  }
  await updateAutopilotRun(runId, updates);
}

export async function updateStageDetail(
  runId: string,
  detail: string,
  progressPercent?: number
): Promise<void> {
  const updates: Record<string, unknown> = { current_stage_detail: detail };
  if (progressPercent !== undefined) updates.progress_percent = progressPercent;
  await updateAutopilotRun(runId, updates);
}

export async function logDecision(
  runId: string,
  decision: string,
  rationale?: string
): Promise<void> {
  const run = await fetchAutopilotRun(runId);
  const log = (run?.decision_log as Array<Record<string, string>>) || [];
  log.push({ timestamp: new Date().toISOString(), decision, rationale: rationale || '' });
  await updateAutopilotRun(runId, { decision_log: log });
}

export async function markFailed(runId: string, error: string): Promise<void> {
  await updateAutopilotRun(runId, {
    current_state: 'failed',
    error_message: error,
    current_stage_detail: `Failed: ${error}`,
  });
}

export async function markStageCompleted(runId: string, stage: string): Promise<void> {
  const run = await fetchAutopilotRun(runId);
  const completed = (run?.stages_completed as string[]) || [];
  if (!completed.includes(stage)) completed.push(stage);
  await updateAutopilotRun(runId, { stages_completed: completed });
}

export async function fetchRun(runId: string): Promise<AutopilotRun | null> {
  return fetchAutopilotRun(runId);
}

export async function fetchRunsForOrg(organizationId: string): Promise<AutopilotRun[]> {
  return fetchAutopilotRunsForOrg(organizationId);
}
