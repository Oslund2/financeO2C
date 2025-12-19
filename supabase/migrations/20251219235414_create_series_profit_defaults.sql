/*
  # Create Series-Level Profit Settings Defaults

  1. New Tables
    - `series_profit_defaults`
      - `id` (uuid, primary key)
      - `series_id` (uuid, references series)
      - `organization_id` (uuid, references organizations)
      - `distribution_channels` (jsonb) - default channel configurations
      - `years_in_service` (integer) - default years content generates revenue
      - `decay_rate_percent` (numeric) - default annual view decay rate
      - `minimum_retention_percent` (numeric) - minimum retention floor
      - `enable_human_costs` (boolean) - whether to include human costs
      - `human_cost_profile` (text) - default cost profile
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modifications to episode_profit_settings
    - Add `use_series_defaults` column (boolean) - whether to inherit from series
    - Add `settings_source` column (text) - track where settings came from

  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users

  4. Functions
    - Function to sync settings from one episode to others
    - Function to apply series defaults to all episodes
*/

-- Create series_profit_defaults table
CREATE TABLE IF NOT EXISTS series_profit_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  distribution_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  years_in_service integer NOT NULL DEFAULT 5,
  decay_rate_percent numeric(5,2) NOT NULL DEFAULT 10,
  minimum_retention_percent numeric(5,2) NOT NULL DEFAULT 20,
  annual_runs_per_episode integer NOT NULL DEFAULT 4,
  enable_human_costs boolean NOT NULL DEFAULT true,
  human_cost_profile text NOT NULL DEFAULT 'standard',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(series_id)
);

-- Add columns to episode_profit_settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episode_profit_settings' AND column_name = 'use_series_defaults'
  ) THEN
    ALTER TABLE episode_profit_settings ADD COLUMN use_series_defaults boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episode_profit_settings' AND column_name = 'settings_source'
  ) THEN
    ALTER TABLE episode_profit_settings ADD COLUMN settings_source text DEFAULT 'custom';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE series_profit_defaults ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view series profit defaults" ON series_profit_defaults;
DROP POLICY IF EXISTS "Users can insert series profit defaults" ON series_profit_defaults;
DROP POLICY IF EXISTS "Users can update series profit defaults" ON series_profit_defaults;
DROP POLICY IF EXISTS "Users can delete series profit defaults" ON series_profit_defaults;

-- Create RLS policies
CREATE POLICY "Users can view series profit defaults"
  ON series_profit_defaults
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert series profit defaults"
  ON series_profit_defaults
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update series profit defaults"
  ON series_profit_defaults
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete series profit defaults"
  ON series_profit_defaults
  FOR DELETE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Function to sync settings from one episode to multiple other episodes
CREATE OR REPLACE FUNCTION sync_episode_profit_settings(
  p_source_episode_id uuid,
  p_target_episode_ids uuid[],
  p_sync_channels boolean DEFAULT true,
  p_sync_parameters boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_settings record;
  v_updated_count integer := 0;
  v_target_id uuid;
BEGIN
  -- Get source episode settings
  SELECT * INTO v_source_settings
  FROM episode_profit_settings
  WHERE episode_id = p_source_episode_id;

  IF v_source_settings IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Source episode settings not found',
      'updated_count', 0
    );
  END IF;

  -- Update each target episode
  FOREACH v_target_id IN ARRAY p_target_episode_ids
  LOOP
    IF v_target_id != p_source_episode_id THEN
      -- Check if target has existing settings
      IF EXISTS (SELECT 1 FROM episode_profit_settings WHERE episode_id = v_target_id) THEN
        -- Update existing settings
        UPDATE episode_profit_settings
        SET
          distribution_channels = CASE WHEN p_sync_channels THEN v_source_settings.distribution_channels ELSE distribution_channels END,
          years_in_service = CASE WHEN p_sync_parameters THEN v_source_settings.years_in_service ELSE years_in_service END,
          decay_rate_percent = CASE WHEN p_sync_parameters THEN v_source_settings.decay_rate_percent ELSE decay_rate_percent END,
          minimum_retention_percent = CASE WHEN p_sync_parameters THEN v_source_settings.minimum_retention_percent ELSE minimum_retention_percent END,
          annual_runs_per_episode = CASE WHEN p_sync_parameters THEN v_source_settings.annual_runs_per_episode ELSE annual_runs_per_episode END,
          enable_human_costs = CASE WHEN p_sync_parameters THEN v_source_settings.enable_human_costs ELSE enable_human_costs END,
          human_cost_profile = CASE WHEN p_sync_parameters THEN v_source_settings.human_cost_profile ELSE human_cost_profile END,
          settings_source = 'synced',
          updated_at = now()
        WHERE episode_id = v_target_id;
      ELSE
        -- Insert new settings
        INSERT INTO episode_profit_settings (
          episode_id,
          organization_id,
          distribution_channels,
          years_in_service,
          decay_rate_percent,
          minimum_retention_percent,
          annual_runs_per_episode,
          enable_human_costs,
          human_cost_profile,
          settings_source
        )
        VALUES (
          v_target_id,
          v_source_settings.organization_id,
          v_source_settings.distribution_channels,
          v_source_settings.years_in_service,
          v_source_settings.decay_rate_percent,
          v_source_settings.minimum_retention_percent,
          v_source_settings.annual_runs_per_episode,
          v_source_settings.enable_human_costs,
          v_source_settings.human_cost_profile,
          'synced'
        );
      END IF;
      
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'source_episode_id', p_source_episode_id
  );
END;
$$;

-- Function to get episodes with mismatched settings in a series
CREATE OR REPLACE FUNCTION get_episodes_settings_comparison(
  p_series_id uuid
)
RETURNS TABLE (
  episode_id uuid,
  episode_title text,
  format_type text,
  program_length_minutes integer,
  has_custom_settings boolean,
  settings_source text,
  channel_count integer,
  enabled_channel_count integer,
  total_monthly_projected_views bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS episode_id,
    e.title AS episode_title,
    COALESCE(e.format_type, 'broadcast') AS format_type,
    COALESCE(e.program_length_minutes, 30) AS program_length_minutes,
    (eps.id IS NOT NULL) AS has_custom_settings,
    COALESCE(eps.settings_source, 'default') AS settings_source,
    COALESCE(jsonb_array_length(eps.distribution_channels), 0)::integer AS channel_count,
    COALESCE(
      (SELECT COUNT(*)::integer FROM jsonb_array_elements(eps.distribution_channels) ch WHERE (ch->>'enabled')::boolean = true),
      0
    ) AS enabled_channel_count,
    COALESCE(
      (SELECT SUM((ch->>'monthlyProjectedViews')::bigint) FROM jsonb_array_elements(eps.distribution_channels) ch WHERE (ch->>'enabled')::boolean = true),
      0
    ) AS total_monthly_projected_views
  FROM episodes e
  LEFT JOIN episode_profit_settings eps ON eps.episode_id = e.id
  WHERE e.series_id = p_series_id
  ORDER BY e.episode_number, e.created_at;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_series_profit_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS series_profit_defaults_updated_at ON series_profit_defaults;
CREATE TRIGGER series_profit_defaults_updated_at
  BEFORE UPDATE ON series_profit_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_series_profit_defaults_updated_at();
