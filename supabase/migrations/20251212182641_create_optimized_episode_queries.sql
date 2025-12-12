/*
  # Create Optimized Episode Queries RPC Function
  
  1. New Function
    - `get_episodes_with_details(p_series_id uuid, p_organization_id uuid)` - Returns episodes with pre-joined script titles and storyboard shot counts
    
  2. Purpose
    - Eliminates N+1 query pattern by fetching all related data in a single database query
    - Returns episodes with: script_title, total_shots, completed_shots, has_orphaned_script
    
  3. Performance Impact
    - Reduces database round trips from O(n*m) to O(1)
    - For 100 episodes with 5 storyboards each: from ~700 queries to 1 query
*/

CREATE OR REPLACE FUNCTION get_episodes_with_details(
  p_series_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  script_id uuid,
  series_id uuid,
  organization_id uuid,
  title text,
  episode_number int,
  status text,
  progress_percentage int,
  final_video_url text,
  production_notes text,
  estimated_cost numeric,
  actual_cost numeric,
  source_script_snapshot jsonb,
  script_version int,
  sync_status text,
  multi_part_episode boolean,
  part_number int,
  previous_episode_id uuid,
  next_episode_id uuid,
  trt_metadata jsonb,
  target_runtime_seconds int,
  actual_runtime_seconds int,
  date_put_in_service timestamptz,
  projected_service_years int,
  decay_rate_percent numeric,
  minimum_retention_percent numeric,
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz,
  script_title text,
  has_orphaned_script boolean,
  total_shots int,
  completed_shots int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH episode_shot_counts AS (
    SELECT 
      e.id AS episode_id,
      COALESCE(SUM(CASE WHEN ss.id IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS total_shots,
      COALESCE(SUM(CASE WHEN ss.approval_status = 'approved' OR ss.approved = true THEN 1 ELSE 0 END), 0)::int AS completed_shots
    FROM episodes e
    LEFT JOIN storyboards sb ON sb.episode_id = e.id
    LEFT JOIN storyboard_shots ss ON ss.storyboard_id = sb.id
    WHERE (p_series_id IS NULL OR e.series_id = p_series_id)
      AND (p_organization_id IS NULL OR e.organization_id = p_organization_id)
    GROUP BY e.id
  )
  SELECT 
    e.id,
    e.script_id,
    e.series_id,
    e.organization_id,
    e.title,
    e.episode_number,
    e.status,
    e.progress_percentage,
    e.final_video_url,
    e.production_notes,
    e.estimated_cost,
    e.actual_cost,
    e.source_script_snapshot,
    e.script_version,
    e.sync_status,
    e.multi_part_episode,
    e.part_number,
    e.previous_episode_id,
    e.next_episode_id,
    e.trt_metadata,
    e.target_runtime_seconds,
    e.actual_runtime_seconds,
    e.date_put_in_service,
    e.projected_service_years,
    e.decay_rate_percent,
    e.minimum_retention_percent,
    e.created_at,
    e.updated_at,
    e.completed_at,
    s.title AS script_title,
    (e.script_id IS NOT NULL AND s.id IS NULL) AS has_orphaned_script,
    COALESCE(esc.total_shots, 0) AS total_shots,
    COALESCE(esc.completed_shots, 0) AS completed_shots
  FROM episodes e
  LEFT JOIN scripts s ON s.id = e.script_id
  LEFT JOIN episode_shot_counts esc ON esc.episode_id = e.id
  WHERE (p_series_id IS NULL OR e.series_id = p_series_id)
    AND (p_organization_id IS NULL OR e.organization_id = p_organization_id)
  ORDER BY e.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_available_scripts_for_episodes(
  p_series_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  series_id uuid,
  organization_id uuid,
  title text,
  episode_number int,
  season_number int,
  runtime_minutes int,
  synopsis text,
  theme text,
  status text,
  ai_generated boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.series_id,
    s.organization_id,
    s.title,
    s.episode_number,
    s.season_number,
    s.runtime_minutes,
    s.synopsis,
    s.theme,
    s.status,
    s.ai_generated,
    s.created_at,
    s.updated_at
  FROM scripts s
  WHERE s.status = 'approved'
    AND (p_series_id IS NULL OR s.series_id = p_series_id)
    AND (p_organization_id IS NULL OR s.organization_id = p_organization_id)
    AND NOT EXISTS (
      SELECT 1 FROM episodes e WHERE e.script_id = s.id
    )
  ORDER BY s.created_at DESC;
END;
$$;
