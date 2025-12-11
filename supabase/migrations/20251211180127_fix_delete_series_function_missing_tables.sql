/*
  # Fix delete_series Function - Remove References to Non-Existent Tables
  
  ## Problem
  The `delete_series` function references tables that don't exist in the database:
  - episode_costs (doesn't exist)
  - episode_ltv_tracking (doesn't exist)  
  - backup_records (doesn't exist)
  
  This causes the error: "relation 'episode_costs' does not exist"
  
  ## Solution
  Recreate the `delete_series` function to only delete from tables that actually exist
  in the database, while maintaining proper cascade deletion order.
  
  ## Changes
  - Remove deletion attempts for non-existent tables
  - Add deletion for tables that were missing (like production_cost_config, creator_cost_config, etc.)
  - Maintain proper foreign key deletion order
*/

-- Drop and recreate the delete_series function with correct table references
CREATE OR REPLACE FUNCTION delete_series(
  series_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  series_record record;
  content_count jsonb;
BEGIN
  -- Check if series exists
  SELECT * INTO series_record FROM series WHERE id = series_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Series not found');
  END IF;

  -- Verify user has access to this series (must be in the organization)
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = series_record.organization_id
    AND user_id = user_uuid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to delete this series');
  END IF;

  -- Get content count before deletion
  content_count := count_series_content(series_uuid);

  -- Delete related content in order (respecting foreign key constraints)

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

  -- Delete episode-related data
  DELETE FROM episode_revenue_config WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM episode_performance_metrics WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM product_placement_sponsors WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM production_jobs WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  DELETE FROM episodes WHERE series_id = series_uuid;

  -- Delete scripts
  DELETE FROM scripts WHERE series_id = series_uuid;

  -- Delete character-related data
  DELETE FROM voice_samples WHERE character_id IN (
    SELECT id FROM characters WHERE series_id = series_uuid
  );

  DELETE FROM voice_cloning_jobs WHERE character_id IN (
    SELECT id FROM characters WHERE series_id = series_uuid
  );

  DELETE FROM characters_history WHERE character_id IN (
    SELECT id FROM characters WHERE series_id = series_uuid
  );

  DELETE FROM characters WHERE series_id = series_uuid;

  -- Delete asset-related data
  DELETE FROM assets_history WHERE asset_id IN (
    SELECT id FROM assets WHERE series_id = series_uuid
  );

  DELETE FROM assets WHERE series_id = series_uuid;

  -- Delete analytics and tracking data
  DELETE FROM brand_analytics WHERE series_id = series_uuid;
  DELETE FROM episode_performance_metrics WHERE series_id = series_uuid;
  DELETE FROM production_velocity_tracking WHERE series_id = series_uuid;
  DELETE FROM cost_efficiency_metrics WHERE series_id = series_uuid;

  -- Delete configuration data
  DELETE FROM production_cost_config WHERE series_id = series_uuid;
  DELETE FROM creator_cost_config WHERE series_id = series_uuid;

  -- Delete workflow and compliance data
  DELETE FROM workflow_instances WHERE series_id = series_uuid;
  DELETE FROM workflow_templates WHERE series_id = series_uuid;
  DELETE FROM approval_chains WHERE series_id = series_uuid;
  DELETE FROM quality_gates WHERE series_id = series_uuid;
  DELETE FROM brand_safety_rules WHERE series_id = series_uuid;
  DELETE FROM content_screening_results WHERE series_id = series_uuid;
  DELETE FROM content_flags WHERE series_id = series_uuid;
  DELETE FROM series_compliance_mapping WHERE series_id = series_uuid;
  DELETE FROM content_versions WHERE series_id = series_uuid;
  DELETE FROM watermark_configurations WHERE series_id = series_uuid;

  -- Delete recommendations and tracking
  DELETE FROM asset_recommendations WHERE series_id = series_uuid;
  DELETE FROM asset_usage_tracking WHERE used_in_series_id = series_uuid;
  DELETE FROM asset_transformations WHERE target_series_id = series_uuid;
  DELETE FROM asset_variants WHERE target_series_id = series_uuid;
  DELETE FROM ai_generation_quality_scores WHERE series_id = series_uuid;

  -- Finally, delete the series itself
  DELETE FROM series WHERE id = series_uuid;

  -- Log the deletion
  INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, entity_name, changes, metadata)
  VALUES (
    user_uuid,
    'delete',
    'series',
    series_uuid,
    series_record.name,
    jsonb_build_object('deleted', true),
    jsonb_build_object(
      'content_count', content_count,
      'organization_id', series_record.organization_id,
      'deletion_type', 'permanent'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'series_id', series_uuid,
    'series_name', series_record.name,
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

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION delete_series(uuid, uuid) TO authenticated;
