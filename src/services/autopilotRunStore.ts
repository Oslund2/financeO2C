/**
 * Autopilot Run Store
 *
 * Stores autopilot run state in localStorage + in-memory cache.
 * Bypasses Supabase PostgREST entirely (schema cache won't pick up new tables).
 * The actual production artifacts (episodes, scripts, storyboards, videos)
 * still go into their proper Supabase tables — this only tracks orchestration state.
 */

export interface AutopilotRunData {
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

const STORAGE_KEY = 'autopilot_runs';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function generateId(): string {
  return crypto.randomUUID();
}

function loadAll(): AutopilotRunData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(runs: AutopilotRunData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  listeners.forEach((fn) => fn());
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function insertRun(params: {
  series_id: string;
  organization_id: string;
  storyline: string;
  format_type: string;
  target_runtime_minutes: number;
  quality_preset: string;
}): string {
  const now = new Date().toISOString();
  const run: AutopilotRunData = {
    id: generateId(),
    episode_id: null,
    series_id: params.series_id,
    organization_id: params.organization_id,
    storyline: params.storyline,
    format_type: params.format_type,
    target_runtime_minutes: params.target_runtime_minutes,
    quality_preset: params.quality_preset,
    current_state: 'initiated',
    progress_percent: 0,
    current_stage_detail: null,
    stages_completed: [],
    decision_log: [],
    script_id: null,
    started_at: null,
    estimated_completion_at: null,
    completed_at: null,
    output_video_url: null,
    error_message: null,
    retry_count: 0,
    skipped_shots: [],
    estimated_cost_usd: null,
    actual_cost_usd: null,
    created_at: now,
    updated_at: now,
  };
  const runs = loadAll();
  runs.unshift(run);
  saveAll(runs);
  return run.id;
}

export function updateRun(runId: string, updates: Partial<AutopilotRunData>): void {
  const runs = loadAll();
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx === -1) return;
  runs[idx] = { ...runs[idx], ...updates, updated_at: new Date().toISOString() };
  saveAll(runs);
}

export function getRun(runId: string): AutopilotRunData | null {
  const runs = loadAll();
  return runs.find((r) => r.id === runId) || null;
}

export function getRunsForOrg(organizationId: string): AutopilotRunData[] {
  return loadAll()
    .filter((r) => r.organization_id === organizationId)
    .slice(0, 20);
}
