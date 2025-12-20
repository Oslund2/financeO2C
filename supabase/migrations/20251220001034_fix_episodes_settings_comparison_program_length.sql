/*
  # Fix Episode Settings Comparison Program Length Source

  1. Changes
    - Updates get_episodes_settings_comparison to get program_length_minutes from scripts table
    - Uses same data source as get_episode_default_profit_settings for consistency
    - Joins episodes to scripts via script_id
    - Applies fallback chain: script.program_length_minutes -> script.runtime_minutes -> episode.program_length_minutes -> 30

  2. Purpose
    - Fixes bug where sync modal shows "No other X-minute episodes" despite matching episodes existing
    - The issue was caused by comparing runtimeMinutes from scripts table (source) against 
      program_length_minutes from episodes table (targets) which often defaults to 30
    - Now both source and target episode durations come from the same source (scripts table)

  3. Impact
    - Episodes with the same script format length will now correctly appear in sync modals
    - Example: "The Torsion Challenge" (5 min) will now appear when syncing from "The Pococurante Challenge" (5 min)
*/

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
    COALESCE(s.format_type::text, e.format_type, 'broadcast') AS format_type,
    COALESCE(
      s.program_length_minutes,
      s.runtime_minutes,
      e.program_length_minutes,
      30
    )::integer AS program_length_minutes,
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
  LEFT JOIN scripts s ON s.id = e.script_id
  LEFT JOIN episode_profit_settings eps ON eps.episode_id = e.id
  WHERE e.series_id = p_series_id
  ORDER BY e.episode_number, e.created_at;
END;
$$;