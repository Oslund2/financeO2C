-- ─────────────────────────────────────────────────────────────
-- Edit Decision Lists (EDL) — stores editorial intelligence
-- output for FFmpeg rendering, iteration, and override tracking.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.edit_decision_lists (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- Assembly context
  assembly_type text not null check (assembly_type in ('rough_cut', 'final_cut', 'trailer', 'preview')),
  version integer not null default 1,

  -- Format profile used
  format_type text not null default 'streaming',
  format_profile_json jsonb not null default '{}'::jsonb,

  -- The EDL itself (array of EditDecision objects)
  decisions jsonb not null default '[]'::jsonb,

  -- Computed stats
  total_duration_seconds numeric(10, 2),
  total_cuts integer default 0,
  transitions_used jsonb default '{}'::jsonb,
  average_cut_rate_cpm numeric(6, 2),
  peak_intensity numeric(4, 2),

  -- User overrides (decision_id → partial override JSON)
  overrides jsonb default '{}'::jsonb,

  -- Render tracking
  render_status text default 'pending' check (render_status in ('pending', 'rendering', 'completed', 'failed')),
  render_started_at timestamptz,
  render_completed_at timestamptz,
  output_url text,
  output_blob_size_bytes bigint,
  render_error text,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for querying EDLs by episode
create index if not exists idx_edl_episode_id on public.edit_decision_lists(episode_id);
create index if not exists idx_edl_organization_id on public.edit_decision_lists(organization_id);

-- Auto-increment version per episode + assembly_type
create or replace function public.edl_auto_version()
returns trigger as $$
begin
  new.version := coalesce(
    (select max(version) + 1
     from public.edit_decision_lists
     where episode_id = new.episode_id
       and assembly_type = new.assembly_type),
    1
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_edl_auto_version
  before insert on public.edit_decision_lists
  for each row
  execute function public.edl_auto_version();

-- Updated_at trigger
create trigger trg_edl_updated_at
  before update on public.edit_decision_lists
  for each row
  execute function public.handle_updated_at();

-- RLS policies
alter table public.edit_decision_lists enable row level security;

create policy "Users can view EDLs for their organization"
  on public.edit_decision_lists for select
  using (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  ));

create policy "Users can create EDLs for their organization"
  on public.edit_decision_lists for insert
  with check (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  ));

create policy "Users can update EDLs for their organization"
  on public.edit_decision_lists for update
  using (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  ));

create policy "Users can delete EDLs for their organization"
  on public.edit_decision_lists for delete
  using (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  ));
