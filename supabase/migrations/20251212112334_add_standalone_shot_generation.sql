/*
  # Add Standalone Shot Generation Support

  This migration adds support for generating production shot plans
  without being tied to a specific episode (for pre-production planning).

  ## Changes

  1. **New Function: sync_storyboard_to_standalone_shot_plans**
    - Generates production_shot_plans from storyboard without episode
    - Uses storyboard's series_id and organization directly
    - Useful for pre-production planning before episode creation

  2. **Updated Function: sync_storyboard_to_shot_plans**
    - Now handles NULL episode_id by calling standalone version
    - Maintains backward compatibility with existing code

  ## Security
  - Maintains existing RLS policies
  - Uses SECURITY DEFINER for proper access control
*/

-- Function to sync storyboard shots to standalone production_shot_plans (no episode)
CREATE OR REPLACE FUNCTION sync_storyboard_to_standalone_shot_plans(
  p_storyboard_id uuid,
  p_series_id uuid,
  p_organization_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shot_count integer := 0;
  v_shot record;
BEGIN
  -- Delete existing standalone shot plans for this storyboard
  DELETE FROM production_shot_plans
  WHERE series_id = p_series_id
  AND organization_id = p_organization_id
  AND episode_id IS NULL
  AND storyboard_shot_id IN (
    SELECT id FROM storyboard_shots WHERE storyboard_id = p_storyboard_id
  );

  -- Copy storyboard shots to production_shot_plans
  FOR v_shot IN
    SELECT *
    FROM storyboard_shots
    WHERE storyboard_id = p_storyboard_id
    ORDER BY shot_number
  LOOP
    INSERT INTO production_shot_plans (
      episode_id,
      series_id,
      organization_id,
      storyboard_shot_id,
      shot_number,
      act_number,
      scene_number,
      shot_type,
      camera_angle,
      camera_movement,
      duration_seconds,
      narrative_description,
      technical_description,
      characters,
      location,
      status
    )
    SELECT
      NULL,
      p_series_id,
      p_organization_id,
      v_shot.id,
      v_shot.shot_number,
      COALESCE((
        SELECT sa.act_number
        FROM script_scenes ss
        JOIN script_acts sa ON sa.id = ss.act_id
        WHERE ss.id = v_shot.scene_id
        LIMIT 1
      ), 1),
      v_shot.scene_shot_number,
      v_shot.shot_type,
      v_shot.camera_angle,
      COALESCE(v_shot.camera_movement, 'static'),
      GREATEST(4, LEAST(8, COALESCE(v_shot.duration_seconds, 6))),
      v_shot.shot_description,
      COALESCE(v_shot.composition_notes, v_shot.shot_description),
      COALESCE((
        SELECT array_agg(DISTINCT (pos->>'character')::text)
        FROM jsonb_array_elements(v_shot.character_positions) pos
        WHERE pos->>'character' IS NOT NULL
      ), ARRAY[]::text[]),
      (
        SELECT ss.setting
        FROM script_scenes ss
        WHERE ss.id = v_shot.scene_id
        LIMIT 1
      ),
      CASE
        WHEN v_shot.approved THEN 'ready'
        WHEN v_shot.generation_status = 'completed' THEN 'draft'
        ELSE 'draft'
      END;

    v_shot_count := v_shot_count + 1;
  END LOOP;

  RETURN v_shot_count;
END;
$$;

-- Update the main sync function to handle NULL episode_id
CREATE OR REPLACE FUNCTION sync_storyboard_to_shot_plans(
  p_episode_id uuid,
  p_storyboard_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shot_count integer := 0;
  v_shot record;
  v_series_id uuid;
  v_organization_id uuid;
BEGIN
  -- If episode_id is NULL, use standalone version
  IF p_episode_id IS NULL THEN
    SELECT s.series_id, s.organization_id
    INTO v_series_id, v_organization_id
    FROM storyboards sb
    JOIN series s ON s.id = sb.series_id
    WHERE sb.id = p_storyboard_id;

    IF v_series_id IS NULL THEN
      RAISE EXCEPTION 'Storyboard not found or missing series information';
    END IF;

    RETURN sync_storyboard_to_standalone_shot_plans(
      p_storyboard_id,
      v_series_id,
      v_organization_id
    );
  END IF;

  -- Original episode-based logic
  SELECT series_id, (SELECT organization_id FROM series WHERE id = episodes.series_id LIMIT 1)
  INTO v_series_id, v_organization_id
  FROM episodes
  WHERE id = p_episode_id;

  IF v_series_id IS NULL THEN
    RAISE EXCEPTION 'Episode not found';
  END IF;

  DELETE FROM production_shot_plans
  WHERE episode_id = p_episode_id
  AND storyboard_shot_id IS NOT NULL;

  FOR v_shot IN
    SELECT *
    FROM storyboard_shots
    WHERE storyboard_id = p_storyboard_id
    ORDER BY shot_number
  LOOP
    INSERT INTO production_shot_plans (
      episode_id,
      series_id,
      organization_id,
      storyboard_shot_id,
      shot_number,
      act_number,
      scene_number,
      shot_type,
      camera_angle,
      camera_movement,
      duration_seconds,
      narrative_description,
      technical_description,
      characters,
      location,
      status
    )
    SELECT
      p_episode_id,
      v_series_id,
      v_organization_id,
      v_shot.id,
      v_shot.shot_number,
      COALESCE((
        SELECT sa.act_number
        FROM script_scenes ss
        JOIN script_acts sa ON sa.id = ss.act_id
        WHERE ss.id = v_shot.scene_id
        LIMIT 1
      ), 1),
      v_shot.scene_shot_number,
      v_shot.shot_type,
      v_shot.camera_angle,
      COALESCE(v_shot.camera_movement, 'static'),
      GREATEST(4, LEAST(8, COALESCE(v_shot.duration_seconds, 6))),
      v_shot.shot_description,
      COALESCE(v_shot.composition_notes, v_shot.shot_description),
      COALESCE((
        SELECT array_agg(DISTINCT (pos->>'character')::text)
        FROM jsonb_array_elements(v_shot.character_positions) pos
        WHERE pos->>'character' IS NOT NULL
      ), ARRAY[]::text[]),
      (
        SELECT ss.setting
        FROM script_scenes ss
        WHERE ss.id = v_shot.scene_id
        LIMIT 1
      ),
      CASE
        WHEN v_shot.approved THEN 'ready'
        WHEN v_shot.generation_status = 'completed' THEN 'draft'
        ELSE 'draft'
      END;

    v_shot_count := v_shot_count + 1;
  END LOOP;

  UPDATE storyboards
  SET episode_id = p_episode_id
  WHERE id = p_storyboard_id;

  RETURN v_shot_count;
END;
$$;

COMMENT ON FUNCTION sync_storyboard_to_standalone_shot_plans IS
'Creates production shot plans from storyboard without episode assignment for pre-production planning';

COMMENT ON FUNCTION sync_storyboard_to_shot_plans IS
'Synchronizes storyboard shots to production shot plans. Handles both episode-based and standalone generation.';
