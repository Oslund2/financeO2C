-- Video Assembly System
-- Enables rough cut and final cut assembly of Veo3-rendered shots into complete episodes
-- Uses Shotstack cloud video editing API for server-side rendering

-- Assembly settings per organization (defaults for all assemblies)
CREATE TABLE IF NOT EXISTS assembly_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  default_transition text DEFAULT 'cut' CHECK (default_transition IN ('cut', 'fade', 'dissolve', 'wipe')),
  transition_duration_seconds numeric(4,2) DEFAULT 0.5,
  add_slate boolean DEFAULT false,
  slate_duration_seconds numeric(4,2) DEFAULT 3.0,
  add_end_card boolean DEFAULT false,
  end_card_duration_seconds numeric(4,2) DEFAULT 3.0,
  background_music_url text,
  music_volume numeric(3,2) DEFAULT 0.15 CHECK (music_volume >= 0 AND music_volume <= 1),
  dialogue_volume numeric(3,2) DEFAULT 1.0 CHECK (dialogue_volume >= 0 AND dialogue_volume <= 1),
  output_resolution text DEFAULT '1920x1080' CHECK (output_resolution IN ('1920x1080', '1280x720', '3840x2160')),
  output_fps integer DEFAULT 24 CHECK (output_fps IN (24, 25, 30)),
  output_format text DEFAULT 'mp4' CHECK (output_format IN ('mp4', 'mov')),
  watermark_url text,
  watermark_opacity numeric(3,2) DEFAULT 0.3,
  shotstack_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Individual video assembly jobs (one per rough cut / final cut version)
CREATE TABLE IF NOT EXISTS video_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  series_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Assembly type and versioning
  assembly_type text DEFAULT 'rough_cut' CHECK (assembly_type IN ('rough_cut', 'final_cut', 'trailer', 'preview')),
  version integer DEFAULT 1,

  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',          -- waiting to start
    'building_timeline',-- constructing Shotstack JSON
    'rendering',        -- submitted to Shotstack, waiting
    'completed',        -- render done, output_url available
    'failed'            -- error occurred
  )),

  -- Shotstack integration
  shotstack_render_id text,
  shotstack_status text,   -- raw status from Shotstack API

  -- Output
  output_url text,                     -- final rendered video URL
  output_duration_seconds numeric(8,2),
  output_file_size_bytes bigint,
  thumbnail_url text,

  -- Assembly configuration snapshot
  timeline_config jsonb,               -- full Shotstack timeline JSON submitted
  shot_order jsonb DEFAULT '[]',       -- ordered array of {shot_plan_id, video_url, duration_seconds}
  audio_config jsonb DEFAULT '{}',     -- music/dialogue mix settings used
  render_settings jsonb DEFAULT '{}',  -- resolution, fps, format used

  -- Shot source summary
  total_shots integer DEFAULT 0,
  shots_with_video integer DEFAULT 0,    -- shots that had a Veo3 video
  shots_with_lipsync integer DEFAULT 0,  -- shots that used lip-sync video
  shots_as_stills integer DEFAULT 0,     -- shots that used static image as fallback

  -- Cost tracking
  cost_estimate_usd numeric(10,4),
  actual_cost_usd numeric(10,4),

  -- Error info
  error_message text,
  error_details jsonb,

  -- Timestamps
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_assemblies_episode ON video_assemblies(episode_id);
CREATE INDEX IF NOT EXISTS idx_video_assemblies_series ON video_assemblies(series_id);
CREATE INDEX IF NOT EXISTS idx_video_assemblies_org ON video_assemblies(organization_id);
CREATE INDEX IF NOT EXISTS idx_video_assemblies_status ON video_assemblies(status);
CREATE INDEX IF NOT EXISTS idx_video_assemblies_type ON video_assemblies(assembly_type);
CREATE INDEX IF NOT EXISTS idx_assembly_settings_org ON assembly_settings(organization_id);

-- RLS
ALTER TABLE video_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_settings ENABLE ROW LEVEL SECURITY;

-- video_assemblies policies
CREATE POLICY "Users can view their org assemblies"
  ON video_assemblies FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create assemblies for their org"
  ON video_assemblies FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their org assemblies"
  ON video_assemblies FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their org assemblies"
  ON video_assemblies FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- assembly_settings policies
CREATE POLICY "Users can view their org assembly settings"
  ON assembly_settings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their org assembly settings"
  ON assembly_settings FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their org assembly settings"
  ON assembly_settings FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_video_assemblies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_assemblies_updated_at
  BEFORE UPDATE ON video_assemblies
  FOR EACH ROW EXECUTE FUNCTION update_video_assemblies_updated_at();

CREATE OR REPLACE FUNCTION update_assembly_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assembly_settings_updated_at
  BEFORE UPDATE ON assembly_settings
  FOR EACH ROW EXECUTE FUNCTION update_assembly_settings_updated_at();
