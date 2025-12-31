/*
  # Fix delete_series Function - Correct production_jobs Column Reference

  ## Problem
  The delete_series function tries to delete from production_jobs using episode_id,
  but production_jobs table only has series_id, not episode_id.

  ## Solution
  Update the DELETE statement to use series_id directly instead of filtering through episodes.
*/

CREATE OR REPLACE FUNCTION delete_series(
  series_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  series_record record;
  content_count jsonb;
BEGIN
  SELECT * INTO series_record FROM series WHERE id = series_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Series not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = series_record.organization_id
    AND user_id = user_uuid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to delete this series');
  END IF;

  content_count := count_series_content(series_uuid);

  -- Delete workflow system data in correct dependency order
  DELETE FROM workflow_escalations WHERE approval_request_id IN (
    SELECT id FROM approval_requests WHERE workflow_instance_id IN (
      SELECT id FROM workflow_instances WHERE series_id = series_uuid
    )
  );

  DELETE FROM workflow_escalations WHERE workflow_stage_id IN (
    SELECT id FROM workflow_stages WHERE workflow_instance_id IN (
      SELECT id FROM workflow_instances WHERE series_id = series_uuid
    )
  );

  DELETE FROM approval_requests WHERE workflow_instance_id IN (
    SELECT id FROM workflow_instances WHERE series_id = series_uuid
  );

  DELETE FROM workflow_stages WHERE workflow_instance_id IN (
    SELECT id FROM workflow_instances WHERE series_id = series_uuid
  );

  DELETE FROM workflow_instances WHERE series_id = series_uuid;
  DELETE FROM approval_chains WHERE series_id = series_uuid;
  DELETE FROM workflow_templates WHERE series_id = series_uuid;

  -- Delete storyboard character references
  DELETE FROM storyboard_character_references WHERE storyboard_id IN (
    SELECT id FROM storyboards WHERE series_id = series_uuid
  );

  -- Delete storyboard-related data
  DELETE FROM storyboard_image_versions WHERE shot_id IN (
    SELECT id FROM storyboard_shots WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE series_id = series_uuid
    )
  );

  DELETE FROM storyboard_shot_edits WHERE shot_id IN (
    SELECT id FROM storyboard_shots WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE series_id = series_uuid
    )
  );

  DELETE FROM storyboard_shots WHERE storyboard_id IN (
    SELECT id FROM storyboards WHERE series_id = series_uuid
  );

  DELETE FROM storyboard_revisions WHERE storyboard_id IN (
    SELECT id FROM storyboards WHERE series_id = series_uuid
  );

  DELETE FROM storyboards WHERE series_id = series_uuid;

  -- Delete episode-related data (must be done before episodes)
  DELETE FROM shot_exports WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM dialogue_audio_clips WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM lip_sync_jobs WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM production_shot_plans WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM production_batches WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM episode_progress_milestones WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM episode_profit_settings WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM episode_revenue_config WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM episode_performance_metrics WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM product_placement_sponsors WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  -- FIXED: production_jobs has series_id, not episode_id
  DELETE FROM production_jobs WHERE series_id = series_uuid;

  DELETE FROM episodes WHERE series_id = series_uuid;

  -- Delete character-related data
  DELETE FROM character_consistency_profiles WHERE character_id IN (
    SELECT id FROM characters WHERE series_id = series_uuid
  );

  DELETE FROM character_aliases WHERE character_id IN (
    SELECT id FROM characters WHERE series_id = series_uuid
  );

  DELETE FROM characters WHERE series_id = series_uuid;

  -- Delete script-related data
  DELETE FROM script_scene_translations WHERE scene_id IN (
    SELECT id FROM script_scenes WHERE act_id IN (
      SELECT id FROM script_acts WHERE script_id IN (
        SELECT id FROM scripts WHERE series_id = series_uuid
      )
    )
  );

  DELETE FROM voice_recordings WHERE scene_id IN (
    SELECT id FROM script_scenes WHERE act_id IN (
      SELECT id FROM script_acts WHERE script_id IN (
        SELECT id FROM scripts WHERE series_id = series_uuid
      )
    )
  );

  DELETE FROM scene_shots WHERE scene_id IN (
    SELECT id FROM script_scenes WHERE act_id IN (
      SELECT id FROM script_acts WHERE script_id IN (
        SELECT id FROM scripts WHERE series_id = series_uuid
      )
    )
  );

  DELETE FROM script_scenes WHERE act_id IN (
    SELECT id FROM script_acts WHERE script_id IN (
      SELECT id FROM scripts WHERE series_id = series_uuid
    )
  );

  DELETE FROM script_act_translations WHERE act_id IN (
    SELECT id FROM script_acts WHERE script_id IN (
      SELECT id FROM scripts WHERE series_id = series_uuid
    )
  );

  DELETE FROM script_acts WHERE script_id IN (
    SELECT id FROM scripts WHERE series_id = series_uuid
  );

  DELETE FROM script_translations WHERE script_id IN (
    SELECT id FROM scripts WHERE series_id = series_uuid
  );

  DELETE FROM script_locks WHERE script_id IN (
    SELECT id FROM scripts WHERE series_id = series_uuid
  );

  DELETE FROM scripts_history WHERE script_id IN (
    SELECT id FROM scripts WHERE series_id = series_uuid
  );

  DELETE FROM scripts WHERE series_id = series_uuid;

  -- Delete series-level data
  DELETE FROM series_profit_defaults WHERE series_id = series_uuid;
  DELETE FROM creator_cost_settings WHERE series_id = series_uuid;
  DELETE FROM production_cost_settings WHERE series_id = series_uuid;
  DELETE FROM dashboard_ip_sections WHERE series_id = series_uuid;

  -- Finally delete the series
  DELETE FROM series WHERE id = series_uuid;

  INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, entity_name, changes, metadata)
  VALUES (
    user_uuid,
    'delete',
    'series',
    series_uuid,
    series_record.title,
    jsonb_build_object('deleted', true),
    jsonb_build_object(
      'content_deleted', content_count,
      'organization_id', series_record.organization_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'series_id', series_uuid,
    'series_title', series_record.title,
    'content_deleted', content_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to delete series: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
