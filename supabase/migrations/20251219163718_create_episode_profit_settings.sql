/*
  # Create Episode Profit Settings Table

  1. Purpose
    - Store per-episode revenue and profit analysis settings
    - Each episode has unique characteristics (runtime, breaks, distribution)
    - Settings persist for users to save and revisit

  2. New Tables
    - `episode_profit_settings`
      - `id` (uuid, primary key)
      - `episode_id` (uuid, references episodes, unique)
      - `organization_id` (uuid, references organizations)
      - Inventory Structure settings
      - Distribution Channel settings  
      - Lifetime Value settings
      - Financial settings
      - Created/updated timestamps

  3. Features
    - Each episode gets its own profit model inputs
    - Auto-populate defaults from episode metadata (runtime, breaks)
    - Distribution channels configurable per episode
    - Sponsors/product placement tracked per episode

  4. Security
    - Enable RLS
    - Users can only access settings for their organization's episodes
*/

CREATE TABLE IF NOT EXISTS episode_profit_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  program_length_minutes int NOT NULL DEFAULT 30,
  breaks_per_episode int NOT NULL DEFAULT 4,
  spots_per_break int NOT NULL DEFAULT 4,
  spot_length_seconds int NOT NULL DEFAULT 30,
  annual_runs_per_episode int NOT NULL DEFAULT 4,
  
  years_in_service int NOT NULL DEFAULT 5,
  decay_rate_percent numeric(5,2) NOT NULL DEFAULT 0,
  minimum_retention_percent numeric(5,2) NOT NULL DEFAULT 100,
  
  target_cpm numeric(10,2) NOT NULL DEFAULT 15,
  base_production_cost numeric(10,2) DEFAULT 0,
  
  distribution_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  sponsors jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  enable_multi_language boolean NOT NULL DEFAULT false,
  dubbing_tier text NOT NULL DEFAULT 'bulk_professional',
  enabled_languages jsonb NOT NULL DEFAULT '["en"]'::jsonb,
  
  enable_human_costs boolean NOT NULL DEFAULT true,
  human_cost_profile text NOT NULL DEFAULT 'standard',
  custom_cost_rates jsonb,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT unique_episode_profit_settings UNIQUE (episode_id)
);

CREATE INDEX IF NOT EXISTS idx_episode_profit_settings_episode ON episode_profit_settings(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_profit_settings_org ON episode_profit_settings(organization_id);

ALTER TABLE episode_profit_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization episode profit settings"
  ON episode_profit_settings
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their organization episode profit settings"
  ON episode_profit_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization episode profit settings"
  ON episode_profit_settings
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization episode profit settings"
  ON episode_profit_settings
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_episode_profit_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_episode_profit_settings_timestamp ON episode_profit_settings;
CREATE TRIGGER trigger_update_episode_profit_settings_timestamp
  BEFORE UPDATE ON episode_profit_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_episode_profit_settings_timestamp();

CREATE OR REPLACE FUNCTION get_episode_default_profit_settings(p_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_episode episodes%ROWTYPE;
  v_trt_metadata jsonb;
  v_content_minutes int;
  v_breaks_count int;
BEGIN
  SELECT * INTO v_episode FROM episodes WHERE id = p_episode_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  v_trt_metadata := v_episode.trt_metadata;
  
  v_content_minutes := COALESCE(
    (v_trt_metadata->>'content')::int / 60,
    v_episode.target_runtime_seconds / 60,
    22
  );
  
  v_breaks_count := COALESCE(
    jsonb_array_length(v_trt_metadata->'break_structure'->'break_positions'),
    CASE 
      WHEN v_content_minutes <= 5 THEN 0
      WHEN v_content_minutes <= 15 THEN 1
      WHEN v_content_minutes <= 22 THEN 3
      ELSE 4
    END
  );
  
  RETURN jsonb_build_object(
    'program_length_minutes', v_content_minutes + COALESCE((v_trt_metadata->>'opening_sting')::int / 60, 1) + COALESCE((v_trt_metadata->>'closing_sting')::int / 60, 0.5),
    'breaks_per_episode', v_breaks_count,
    'content_minutes', v_content_minutes,
    'target_runtime_seconds', v_episode.target_runtime_seconds,
    'episode_title', v_episode.title,
    'estimated_cost', v_episode.estimated_cost
  );
END;
$$;
