-- Autopilot pipeline runs — tracks autonomous video production executions
create table if not exists public.autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references public.episodes(id) on delete set null,
  series_id uuid not null references public.series(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- User input
  storyline text not null,
  format_type text not null default 'streaming',
  target_runtime_minutes integer not null default 5,
  quality_preset text not null default 'balanced'
    check (quality_preset in ('fast', 'balanced', 'max_quality')),

  -- State machine
  current_state text not null default 'initiated'
    check (current_state in (
      'initiated', 'scripting', 'shot_planning', 'storyboarding',
      'video_rendering', 'dialogue_audio', 'lip_sync',
      'assembling', 'complete', 'failed'
    )),

  -- Progress
  progress_percent integer not null default 0,
  current_stage_detail text,
  stages_completed text[] not null default '{}',
  decision_log jsonb not null default '[]'::jsonb,

  -- References created during pipeline
  script_id uuid references public.scripts(id) on delete set null,

  -- Timing
  started_at timestamptz,
  estimated_completion_at timestamptz,
  completed_at timestamptz,

  -- Output
  output_video_url text,
  output_edl_id uuid references public.edit_decision_lists(id) on delete set null,

  -- Error handling
  error_message text,
  retry_count integer not null default 0,
  skipped_shots integer[] not null default '{}',

  -- Cost
  estimated_cost_usd numeric(10, 4),
  actual_cost_usd numeric(10, 4),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_autopilot_runs_org on public.autopilot_runs(organization_id);
create index if not exists idx_autopilot_runs_series on public.autopilot_runs(series_id);
create index if not exists idx_autopilot_runs_state on public.autopilot_runs(current_state);

-- Updated_at trigger
create trigger trg_autopilot_runs_updated_at
  before update on public.autopilot_runs
  for each row
  execute function public.handle_updated_at();

-- RLS
alter table public.autopilot_runs enable row level security;

create policy "Users can view autopilot runs for their organization"
  on public.autopilot_runs for select
  using (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  ));

create policy "Users can create autopilot runs for their organization"
  on public.autopilot_runs for insert
  with check (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  ));

create policy "Users can update autopilot runs for their organization"
  on public.autopilot_runs for update
  using (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  ));
