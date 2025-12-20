/*
  # Fix Episode Settings Comparison - Remove Invalid Column References

  1. Changes
    - Removes references to e.format_type (column doesn't exist in episodes table)
    - Removes references to e.program_length_minutes (column doesn't exist in episodes table)
    - Uses only scripts table for format_type and program_length_minutes
    - Falls back to 'broadcast' for format_type and 30 for program_length if no script

  2. Purpose
    - Fixes runtime error when calling get_episodes_settings_comparison
    - The episodes table doesn't have format_type or program_length_minutes columns
    - These values must come from the associated script via script_id
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
    COALESCE(s.format_type::text, 'broadcast') AS format_type,
    COALESCE(
      s.program_length_minutes,
      s.runtime_minutes,
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