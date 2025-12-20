/*
  # Fix Episode Profit Settings Sync - Comprehensive Fix

  ## Problem
  The sync functionality fails because:
  1. RLS policies don't allow organization_id IS NULL
  2. getSettings() returns null even when settings exist
  3. saveSettings() tries INSERT (fails on unique constraint) instead of UPDATE
  4. After sync, UI reads null and shows defaults

  ## Solution
  1. Update RLS policies to allow organization_id IS NULL (matching other tables)
  2. Update sync function to properly handle all edge cases
  3. Add upsert capability to avoid unique constraint issues

  ## Changes
  - Drop and recreate RLS policies with NULL support
  - Update sync_episode_profit_settings function
  - Add get_episode_profit_settings function (SECURITY DEFINER)
  - Add upsert_episode_profit_settings function (SECURITY DEFINER)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization episode profit settings" ON episode_profit_settings;
DROP POLICY IF EXISTS "Users can insert their organization episode profit settings" ON episode_profit_settings;
DROP POLICY IF EXISTS "Users can update their organization episode profit settings" ON episode_profit_settings;
DROP POLICY IF EXISTS "Users can delete their organization episode profit settings" ON episode_profit_settings;

-- Create new policies that allow NULL organization_id
CREATE POLICY "Users can view episode profit settings"
  ON episode_profit_settings
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert episode profit settings"
  ON episode_profit_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update episode profit settings"
  ON episode_profit_settings
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete episode profit settings"
  ON episode_profit_settings
  FOR DELETE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

-- Create a SECURITY DEFINER function to get settings (bypasses RLS for sync operations)
CREATE OR REPLACE FUNCTION get_episode_profit_settings_secure(p_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings record;
BEGIN
  SELECT * INTO v_settings
  FROM episode_profit_settings
  WHERE episode_id = p_episode_id;

  IF v_settings IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_settings.id,
    'episode_id', v_settings.episode_id,
    'organization_id', v_settings.organization_id,
    'program_length_minutes', v_settings.program_length_minutes,
    'breaks_per_episode', v_settings.breaks_per_episode,
    'spots_per_break', v_settings.spots_per_break,
    'spot_length_seconds', v_settings.spot_length_seconds,
    'annual_runs_per_episode', v_settings.annual_runs_per_episode,
    'years_in_service', v_settings.years_in_service,
    'decay_rate_percent', v_settings.decay_rate_percent,
    'minimum_retention_percent', v_settings.minimum_retention_percent,
    'target_cpm', v_settings.target_cpm,
    'base_production_cost', v_settings.base_production_cost,
    'distribution_channels', v_settings.distribution_channels,
    'sponsors', v_settings.sponsors,
    'enable_multi_language', v_settings.enable_multi_language,
    'dubbing_tier', v_settings.dubbing_tier,
    'enabled_languages', v_settings.enabled_languages,
    'enable_human_costs', v_settings.enable_human_costs,
    'human_cost_profile', v_settings.human_cost_profile,
    'custom_cost_rates', v_settings.custom_cost_rates,
    'settings_source', v_settings.settings_source,
    'created_at', v_settings.created_at,
    'updated_at', v_settings.updated_at
  );
END;
$$;

-- Create upsert function for episode profit settings (handles INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION upsert_episode_profit_settings(
  p_episode_id uuid,
  p_organization_id uuid,
  p_distribution_channels jsonb,
  p_annual_runs_per_episode int DEFAULT 4,
  p_years_in_service int DEFAULT 5,
  p_decay_rate_percent numeric DEFAULT 10,
  p_minimum_retention_percent numeric DEFAULT 20,
  p_enable_human_costs boolean DEFAULT true,
  p_human_cost_profile text DEFAULT 'standard',
  p_settings_source text DEFAULT 'custom'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result record;
BEGIN
  INSERT INTO episode_profit_settings (
    episode_id,
    organization_id,
    distribution_channels,
    annual_runs_per_episode,
    years_in_service,
    decay_rate_percent,
    minimum_retention_percent,
    enable_human_costs,
    human_cost_profile,
    settings_source,
    updated_at
  )
  VALUES (
    p_episode_id,
    p_organization_id,
    p_distribution_channels,
    p_annual_runs_per_episode,
    p_years_in_service,
    p_decay_rate_percent,
    p_minimum_retention_percent,
    p_enable_human_costs,
    p_human_cost_profile,
    p_settings_source,
    now()
  )
  ON CONFLICT (episode_id) DO UPDATE SET
    organization_id = COALESCE(EXCLUDED.organization_id, episode_profit_settings.organization_id),
    distribution_channels = EXCLUDED.distribution_channels,
    annual_runs_per_episode = EXCLUDED.annual_runs_per_episode,
    years_in_service = EXCLUDED.years_in_service,
    decay_rate_percent = EXCLUDED.decay_rate_percent,
    minimum_retention_percent = EXCLUDED.minimum_retention_percent,
    enable_human_costs = EXCLUDED.enable_human_costs,
    human_cost_profile = EXCLUDED.human_cost_profile,
    settings_source = EXCLUDED.settings_source,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_result.id,
    'episode_id', v_result.episode_id,
    'distribution_channels', v_result.distribution_channels
  );
END;
$$;

-- Update sync function to be more robust
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
  v_channels_to_sync jsonb;
BEGIN
  -- Get source episode settings
  SELECT * INTO v_source_settings
  FROM episode_profit_settings
  WHERE episode_id = p_source_episode_id;

  IF v_source_settings IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Source episode settings not found. Please save settings for the source episode first.',
      'updated_count', 0
    );
  END IF;

  -- Log what we're syncing for debugging
  RAISE NOTICE 'Syncing from source %. Channels: %, Params: %', 
    p_source_episode_id, p_sync_channels, p_sync_parameters;
  RAISE NOTICE 'Source has % channels with % enabled',
    jsonb_array_length(v_source_settings.distribution_channels),
    (SELECT COUNT(*) FROM jsonb_array_elements(v_source_settings.distribution_channels) ch 
     WHERE (ch->>'enabled')::boolean = true);

  -- Update each target episode
  FOREACH v_target_id IN ARRAY p_target_episode_ids
  LOOP
    IF v_target_id != p_source_episode_id THEN
      -- Use upsert pattern for reliability
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
        settings_source,
        updated_at
      )
      VALUES (
        v_target_id,
        v_source_settings.organization_id,
        CASE WHEN p_sync_channels THEN v_source_settings.distribution_channels ELSE '[]'::jsonb END,
        CASE WHEN p_sync_parameters THEN v_source_settings.years_in_service ELSE 5 END,
        CASE WHEN p_sync_parameters THEN v_source_settings.decay_rate_percent ELSE 10 END,
        CASE WHEN p_sync_parameters THEN v_source_settings.minimum_retention_percent ELSE 20 END,
        CASE WHEN p_sync_parameters THEN v_source_settings.annual_runs_per_episode ELSE 4 END,
        CASE WHEN p_sync_parameters THEN v_source_settings.enable_human_costs ELSE true END,
        CASE WHEN p_sync_parameters THEN v_source_settings.human_cost_profile ELSE 'standard' END,
        'synced',
        now()
      )
      ON CONFLICT (episode_id) DO UPDATE SET
        organization_id = COALESCE(episode_profit_settings.organization_id, EXCLUDED.organization_id),
        distribution_channels = CASE 
          WHEN p_sync_channels THEN v_source_settings.distribution_channels 
          ELSE episode_profit_settings.distribution_channels 
        END,
        years_in_service = CASE 
          WHEN p_sync_parameters THEN v_source_settings.years_in_service 
          ELSE episode_profit_settings.years_in_service 
        END,
        decay_rate_percent = CASE 
          WHEN p_sync_parameters THEN v_source_settings.decay_rate_percent 
          ELSE episode_profit_settings.decay_rate_percent 
        END,
        minimum_retention_percent = CASE 
          WHEN p_sync_parameters THEN v_source_settings.minimum_retention_percent 
          ELSE episode_profit_settings.minimum_retention_percent 
        END,
        annual_runs_per_episode = CASE 
          WHEN p_sync_parameters THEN v_source_settings.annual_runs_per_episode 
          ELSE episode_profit_settings.annual_runs_per_episode 
        END,
        enable_human_costs = CASE 
          WHEN p_sync_parameters THEN v_source_settings.enable_human_costs 
          ELSE episode_profit_settings.enable_human_costs 
        END,
        human_cost_profile = CASE 
          WHEN p_sync_parameters THEN v_source_settings.human_cost_profile 
          ELSE episode_profit_settings.human_cost_profile 
        END,
        settings_source = 'synced',
        updated_at = now();
      
      v_updated_count := v_updated_count + 1;
      
      RAISE NOTICE 'Updated target episode %', v_target_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'source_episode_id', p_source_episode_id,
    'synced_channels', p_sync_channels,
    'synced_parameters', p_sync_parameters
  );
END;
$$;

-- Also fix the comparison function to handle NULL organization_id
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
      (SELECT SUM(COALESCE((ch->>'monthlyProjectedViews')::bigint, 0)) FROM jsonb_array_elements(eps.distribution_channels) ch WHERE (ch->>'enabled')::boolean = true),
      0
    ) AS total_monthly_projected_views
  FROM episodes e
  LEFT JOIN episode_profit_settings eps ON eps.episode_id = e.id
  WHERE e.series_id = p_series_id
  ORDER BY e.episode_number, e.created_at;
END;
$$;
