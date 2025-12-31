/*
  # Fix delete_script_cascade Function - Remove Incorrect Production Jobs Reference

  ## Problem
  The delete_script_cascade function tries to delete from production_jobs using episode_id,
  but production_jobs table only has series_id field, not episode_id.
  
  ## Solution
  Remove the incorrect production_jobs deletion line since production jobs are linked 
  to series, not episodes.
*/

CREATE OR REPLACE FUNCTION delete_script_cascade(
  script_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  script_record record;
  acts_count integer := 0;
  scenes_count integer := 0;
  episodes_count integer := 0;
  storyboards_count integer := 0;
BEGIN
  SELECT * INTO script_record FROM scripts WHERE id = script_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Script not found');
  END IF;

  IF script_record.organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = script_record.organization_id
      AND user_id = user_uuid
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to delete this script');
    END IF;
  END IF;

  SELECT COUNT(*) INTO acts_count FROM script_acts WHERE script_id = script_uuid;
  
  SELECT COUNT(*) INTO scenes_count 
  FROM script_scenes 
  WHERE act_id IN (SELECT id FROM script_acts WHERE script_id = script_uuid);
  
  SELECT COUNT(*) INTO episodes_count FROM episodes WHERE script_id = script_uuid;
  
  SELECT COUNT(*) INTO storyboards_count FROM storyboards WHERE script_id = script_uuid;

  DELETE FROM storyboard_character_references WHERE storyboard_id IN (
    SELECT id FROM storyboards WHERE script_id = script_uuid
  );

  DELETE FROM storyboard_image_versions WHERE shot_id IN (
    SELECT id FROM storyboard_shots WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE script_id = script_uuid
    )
  );

  DELETE FROM storyboard_shot_edits WHERE shot_id IN (
    SELECT id FROM storyboard_shots WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE script_id = script_uuid
    )
  );

  DELETE FROM storyboard_shots WHERE storyboard_id IN (
    SELECT id FROM storyboards WHERE script_id = script_uuid
  );

  DELETE FROM storyboard_revisions WHERE storyboard_id IN (
    SELECT id FROM storyboards WHERE script_id = script_uuid
  );

  DELETE FROM storyboards WHERE script_id = script_uuid;

  DELETE FROM shot_exports WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM dialogue_audio_clips WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM lip_sync_jobs WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM production_shot_plans WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM production_batches WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM episode_progress_milestones WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM episode_progress WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM episode_profit_settings WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM episode_revenue_config WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM episode_performance_metrics WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  DELETE FROM product_placement_sponsors WHERE episode_id IN (
    SELECT id FROM episodes WHERE script_id = script_uuid
  );

  -- REMOVED: production_jobs line that incorrectly used episode_id
  -- Production jobs are linked to series, not episodes

  DELETE FROM episodes WHERE script_id = script_uuid;

  DELETE FROM script_scene_translations WHERE scene_id IN (
    SELECT id FROM script_scenes WHERE act_id IN (
      SELECT id FROM script_acts WHERE script_id = script_uuid
    )
  );

  DELETE FROM voice_recordings WHERE scene_id IN (
    SELECT id FROM script_scenes WHERE act_id IN (
      SELECT id FROM script_acts WHERE script_id = script_uuid
    )
  );

  DELETE FROM scene_shots WHERE scene_id IN (
    SELECT id FROM script_scenes WHERE act_id IN (
      SELECT id FROM script_acts WHERE script_id = script_uuid
    )
  );

  DELETE FROM script_scenes WHERE act_id IN (
    SELECT id FROM script_acts WHERE script_id = script_uuid
  );

  DELETE FROM script_act_translations WHERE act_id IN (
    SELECT id FROM script_acts WHERE script_id = script_uuid
  );

  DELETE FROM script_acts WHERE script_id = script_uuid;

  DELETE FROM script_translations WHERE script_id = script_uuid;

  DELETE FROM script_locks WHERE script_id = script_uuid;

  DELETE FROM scripts_history WHERE script_id = script_uuid;

  DELETE FROM scripts WHERE id = script_uuid;

  INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, entity_name, changes, metadata)
  VALUES (
    user_uuid,
    'delete',
    'script',
    script_uuid,
    script_record.title,
    jsonb_build_object('deleted', true, 'cascade', true),
    jsonb_build_object(
      'acts_deleted', acts_count,
      'scenes_deleted', scenes_count,
      'episodes_deleted', episodes_count,
      'storyboards_deleted', storyboards_count,
      'series_id', script_record.series_id,
      'organization_id', script_record.organization_id,
      'deletion_type', 'cascade'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'script_id', script_uuid,
    'script_title', script_record.title,
    'content_deleted', jsonb_build_object(
      'acts', acts_count,
      'scenes', scenes_count,
      'episodes', episodes_count,
      'storyboards', storyboards_count
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to delete script: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_script_cascade(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_script_cascade(uuid, uuid) TO anon;
