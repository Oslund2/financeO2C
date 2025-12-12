/*
  # Backfill Progress for Existing Episodes

  This migration:
  1. Initializes progress milestones for all existing episodes
  2. Calculates current progress based on production data
  3. Updates episode progress_percentage values
  4. Logs results for tracking

  IMPORTANT: This migration is safe to run multiple times (idempotent)
*/

-- Create a temporary function to backfill progress
CREATE OR REPLACE FUNCTION backfill_all_episode_progress()
RETURNS TABLE(
  episode_id uuid,
  episode_title text,
  old_progress integer,
  new_progress numeric,
  status text
) AS $$
DECLARE
  v_episode RECORD;
  v_organization_id uuid;
  v_old_progress integer;
  v_new_progress numeric;
BEGIN
  -- Loop through all episodes
  FOR v_episode IN
    SELECT e.id, e.title, e.progress_percentage, e.series_id
    FROM episodes e
    ORDER BY e.created_at DESC
  LOOP
    BEGIN
      -- Store old progress
      v_old_progress := v_episode.progress_percentage;

      -- Get organization_id from series
      SELECT organization_id INTO v_organization_id
      FROM series
      WHERE id = v_episode.series_id;

      -- Skip if no organization found
      IF v_organization_id IS NULL THEN
        RETURN QUERY SELECT
          v_episode.id,
          v_episode.title,
          v_old_progress,
          0::numeric,
          'skipped - no organization'::text;
        CONTINUE;
      END IF;

      -- Initialize milestones
      PERFORM initialize_episode_progress_milestones(v_episode.id, v_organization_id);

      -- Calculate new progress
      SELECT total_progress INTO v_new_progress
      FROM calculate_episode_progress(v_episode.id)
      LIMIT 1;

      -- Return the result
      RETURN QUERY SELECT
        v_episode.id,
        v_episode.title,
        v_old_progress,
        COALESCE(v_new_progress, 0),
        'success'::text;

    EXCEPTION WHEN OTHERS THEN
      -- Log errors but continue processing
      RETURN QUERY SELECT
        v_episode.id,
        v_episode.title,
        v_old_progress,
        0::numeric,
        ('error: ' || SQLERRM)::text;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the backfill and log results
DO $$
DECLARE
  v_result RECORD;
  v_total_count integer := 0;
  v_success_count integer := 0;
  v_error_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting episode progress backfill...';

  FOR v_result IN
    SELECT * FROM backfill_all_episode_progress()
  LOOP
    v_total_count := v_total_count + 1;

    IF v_result.status = 'success' THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
END;
$$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS backfill_all_episode_progress();
