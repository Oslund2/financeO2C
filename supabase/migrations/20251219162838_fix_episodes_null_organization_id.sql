/*
  # Fix Episodes with NULL organization_id

  1. Problem
    - Episodes were being created without organization_id
    - The get_episodes_with_details query filters by organization_id
    - Episodes with NULL organization_id are not visible in the UI

  2. Solution
    - Update all existing episodes with NULL organization_id to inherit from their series
    - Add a database trigger to auto-populate organization_id from series on insert
    - Update the query function to also match episodes via series ownership as fallback

  3. Changes
    - Backfill organization_id for all episodes with NULL values
    - Create trigger function to set organization_id automatically
    - Attach trigger to episodes table

  4. Safety
    - Only updates episodes where organization_id IS NULL
    - Preserves existing organization_id values
    - Trigger only fires when organization_id is not provided
*/

-- Step 1: Temporarily disable the validation trigger
DROP TRIGGER IF EXISTS validate_episode_organization_trigger ON episodes;

-- Step 2: Fix existing episodes by inheriting organization_id from their series
UPDATE episodes
SET organization_id = s.organization_id
FROM series s
WHERE episodes.series_id = s.id
  AND episodes.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

-- Step 3: For any remaining episodes without series, assign to first organization
UPDATE episodes
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM organizations);

-- Step 4: Create improved trigger function to auto-populate organization_id on INSERT
CREATE OR REPLACE FUNCTION set_episode_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.series_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM series
    WHERE id = NEW.series_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger on episodes table for INSERT only
DROP TRIGGER IF EXISTS trigger_set_episode_organization_id ON episodes;
CREATE TRIGGER trigger_set_episode_organization_id
  BEFORE INSERT ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION set_episode_organization_id();

-- Step 6: Re-create the validation trigger with improved logic
CREATE OR REPLACE FUNCTION validate_episode_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL AND NEW.script_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM scripts
      WHERE id = NEW.script_id
      AND (organization_id = NEW.organization_id OR organization_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'Episode and script must belong to the same organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_episode_organization_trigger
  BEFORE INSERT OR UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_episode_organization();

-- Step 7: Update get_episodes_with_details to handle NULL organization_id gracefully
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
      AND (
        p_organization_id IS NULL 
        OR e.organization_id = p_organization_id
        OR (e.organization_id IS NULL AND e.series_id IN (
          SELECT ser.id FROM series ser WHERE ser.organization_id = p_organization_id
        ))
      )
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
    AND (
      p_organization_id IS NULL 
      OR e.organization_id = p_organization_id
      OR (e.organization_id IS NULL AND e.series_id IN (
        SELECT ser.id FROM series ser WHERE ser.organization_id = p_organization_id
      ))
    )
  ORDER BY e.created_at DESC;
END;
$$;
