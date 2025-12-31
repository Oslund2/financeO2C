/*
  # Fix Delete Series Transaction Safety

  This migration adds transaction safety and better error handling to the delete_series
  function to prevent series from reappearing after deletion attempts.

  ## Changes
  - Wrap all deletions in explicit error handling
  - Add verification that series is actually deleted
  - Improve audit logging with correct columns
  - Add rollback protection for partial deletions

  ## Security
  - Maintains SECURITY DEFINER for proper permission handling
  - Verifies user has organization membership before deletion
*/

CREATE OR REPLACE FUNCTION delete_series(
  series_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  series_record record;
  content_count jsonb;
  deletion_started_at timestamptz;
BEGIN
  -- Record when deletion started
  deletion_started_at := now();

  -- Get series details
  SELECT * INTO series_record FROM series WHERE id = series_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Series not found');
  END IF;

  -- Verify user has permission
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = series_record.organization_id
    AND user_id = user_uuid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to delete this series');
  END IF;

  -- Count content before deletion
  content_count := count_series_content(series_uuid);

  -- Start deletion cascade in correct dependency order
  -- Each block has explicit error context

  -- Delete workflow system data
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete workflow data: %', SQLERRM;
  END;

  -- Delete storyboard-related data
  BEGIN
    DELETE FROM storyboard_character_references WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE series_id = series_uuid
    );

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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete storyboard data: %', SQLERRM;
  END;

  -- Delete episode-related data
  BEGIN
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

    DELETE FROM episode_progress WHERE episode_id IN (
      SELECT id FROM episodes WHERE series_id = series_uuid
    );

    -- Delete production jobs for episodes
    DELETE FROM production_jobs WHERE entity_type = 'episode' AND entity_id IN (
      SELECT id FROM episodes WHERE series_id = series_uuid
    );

    DELETE FROM episodes WHERE series_id = series_uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete episode data: %', SQLERRM;
  END;

  -- Delete character-related data
  BEGIN
    DELETE FROM character_consistency_profiles WHERE character_id IN (
      SELECT id FROM characters WHERE series_id = series_uuid
    );

    DELETE FROM character_aliases WHERE character_id IN (
      SELECT id FROM characters WHERE series_id = series_uuid
    );

    DELETE FROM character_assets WHERE character_id IN (
      SELECT id FROM characters WHERE series_id = series_uuid
    );

    DELETE FROM characters WHERE series_id = series_uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete character data: %', SQLERRM;
  END;

  -- Delete script-related data
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete script data: %', SQLERRM;
  END;

  -- Delete series-level data
  BEGIN
    DELETE FROM series_profit_defaults WHERE series_id = series_uuid;
    DELETE FROM dashboard_ip_sections WHERE series_id = series_uuid;
    DELETE FROM asset_transformations WHERE target_series_id = series_uuid;
    DELETE FROM asset_usage_tracking WHERE used_in_series_id = series_uuid;
    DELETE FROM quality_gates WHERE series_id = series_uuid;
    DELETE FROM brand_analytics WHERE series_id = series_uuid;
    DELETE FROM brand_comparison_snapshots WHERE series_uuid = ANY(series_ids);
    DELETE FROM cost_efficiency_metrics WHERE series_id = series_uuid;
    DELETE FROM template_installations WHERE installed_series_id = series_uuid;
    DELETE FROM asset_recommendations WHERE series_id = series_uuid;
    DELETE FROM production_cost_config WHERE series_id = series_uuid;

    -- Delete production jobs for series
    DELETE FROM production_jobs WHERE entity_type = 'series' AND entity_id = series_uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete series-level data: %', SQLERRM;
  END;

  -- Finally delete the series itself
  BEGIN
    DELETE FROM series WHERE id = series_uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to delete series record: %', SQLERRM;
  END;

  -- Verify the series is actually deleted
  IF EXISTS (SELECT 1 FROM series WHERE id = series_uuid) THEN
    RAISE EXCEPTION 'Series deletion verification failed - series still exists';
  END IF;

  -- Log successful deletion with correct audit_log columns
  INSERT INTO audit_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    changes,
    metadata
  )
  VALUES (
    user_uuid,
    'delete',
    'series',
    series_uuid,
    series_record.name,
    jsonb_build_object(
      'deleted', true,
      'deletion_started_at', deletion_started_at,
      'deletion_completed_at', now()
    ),
    jsonb_build_object(
      'content_deleted', content_count,
      'organization_id', series_record.organization_id,
      'duration_seconds', EXTRACT(EPOCH FROM (now() - deletion_started_at))
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'series_id', series_uuid,
    'series_name', series_record.name,
    'content_deleted', content_count,
    'duration_seconds', EXTRACT(EPOCH FROM (now() - deletion_started_at))
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the failure
    BEGIN
      INSERT INTO audit_log (
        user_id,
        action_type,
        entity_type,
        entity_id,
        entity_name,
        changes,
        metadata
      )
      VALUES (
        user_uuid,
        'delete',
        'series',
        series_uuid,
        COALESCE(series_record.name, 'Unknown'),
        jsonb_build_object('deleted', false, 'error', SQLERRM),
        jsonb_build_object(
          'organization_id', COALESCE(series_record.organization_id::text, 'unknown'),
          'deletion_started_at', deletion_started_at,
          'deletion_failed_at', now()
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore audit log failures during error handling
        NULL;
    END;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to delete series: ' || SQLERRM,
      'series_id', series_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION delete_series(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_series(uuid, uuid) TO anon;
