/*
  # Link Storyboards to Episodes and Create Shot Plans System V2

  This migration connects the storyboard system to the production system by:
  1. Adding episode_id to storyboards table
  2. Creating a function to sync storyboard_shots to production_shot_plans
  3. Setting up proper relationships between episodes, storyboards, and production

  ## Changes

  1. **storyboards table**
    - Add `episode_id` column to link storyboards to episodes
    - Add index for episode_id lookups

  2. **production_shot_plans table enhancements**
    - Add `storyboard_shot_id` to track source storyboard shots
    - Improve indexing for production queries

  3. **Helper Functions**
    - `sync_storyboard_to_shot_plans`: Converts storyboard_shots to production_shot_plans for an episode
    - `get_or_create_shot_plans_for_episode`: Auto-generates shot plans when needed

  ## Security
  - Maintains existing RLS policies
  - No breaking changes to existing data
*/

-- Add episode_id to storyboards table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboards' AND column_name = 'episode_id'
  ) THEN
    ALTER TABLE storyboards ADD COLUMN episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add storyboard_shot_id to production_shot_plans table to track source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'storyboard_shot_id'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN storyboard_shot_id uuid REFERENCES storyboard_shots(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for episode_id lookups
CREATE INDEX IF NOT EXISTS idx_storyboards_episode_id ON storyboards(episode_id);
CREATE INDEX IF NOT EXISTS idx_production_shot_plans_storyboard_shot_id ON production_shot_plans(storyboard_shot_id);

-- Function to sync storyboard shots to production_shot_plans for an episode
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
  -- Get series_id and organization_id from episode
  SELECT series_id, (SELECT organization_id FROM series WHERE id = episodes.series_id LIMIT 1)
  INTO v_series_id, v_organization_id
  FROM episodes
  WHERE id = p_episode_id;

  -- Delete existing shot plans for this episode if they came from a storyboard
  DELETE FROM production_shot_plans
  WHERE episode_id = p_episode_id
  AND storyboard_shot_id IS NOT NULL;

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
      GREATEST(4, LEAST(8, COALESCE(v_shot.duration_seconds, 6))), -- Clamp to 4, 6, or 8
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

  -- Update storyboard with episode link
  UPDATE storyboards
  SET episode_id = p_episode_id
  WHERE id = p_storyboard_id;

  RETURN v_shot_count;
END;
$$;

-- Function to get or create shot plans for an episode
CREATE OR REPLACE FUNCTION get_or_create_shot_plans_for_episode(
  p_episode_id uuid
)
RETURNS TABLE (
  shot_count integer,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shot_count integer;
  v_script_id uuid;
  v_storyboard_id uuid;
BEGIN
  -- Check if shot plans already exist
  SELECT COUNT(*) INTO v_shot_count
  FROM production_shot_plans
  WHERE episode_id = p_episode_id;

  IF v_shot_count > 0 THEN
    RETURN QUERY SELECT v_shot_count, 'existing'::text;
    RETURN;
  END IF;

  -- Get script_id for this episode
  SELECT script_id INTO v_script_id
  FROM episodes
  WHERE id = p_episode_id;

  IF v_script_id IS NULL THEN
    RETURN QUERY SELECT 0, 'no_script'::text;
    RETURN;
  END IF;

  -- Check if a storyboard exists for this script
  SELECT id INTO v_storyboard_id
  FROM storyboards
  WHERE script_id = v_script_id
  AND status = 'completed'
  AND (episode_id IS NULL OR episode_id = p_episode_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_storyboard_id IS NOT NULL THEN
    -- Sync storyboard to shot plans
    v_shot_count := sync_storyboard_to_shot_plans(p_episode_id, v_storyboard_id);
    RETURN QUERY SELECT v_shot_count, 'storyboard'::text;
    RETURN;
  END IF;

  -- No storyboard found
  RETURN QUERY SELECT 0, 'no_storyboard'::text;
  RETURN;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION sync_storyboard_to_shot_plans IS
'Synchronizes storyboard shots to production shot plans, creating production_shot_plans entries from storyboard_shots';

COMMENT ON FUNCTION get_or_create_shot_plans_for_episode IS
'Gets existing shot plans or creates them from a storyboard if available';
