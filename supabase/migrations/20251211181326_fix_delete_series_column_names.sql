/*
  # Fix delete_series Function - Column Name Corrections

  ## Problem
  The `delete_series` function was using incorrect column names causing foreign key violations:
  - `template_installations` uses `installed_series_id` not `series_id`
  - `shared_asset_pools` uses array column `series_ids`, not `source_series_id`/`target_series_id`

  ## Solution
  1. Fix template_installations deletion to use correct column name `installed_series_id`
  2. Change shared_asset_pools to UPDATE (remove from array) instead of DELETE to preserve shared pools
  3. Template_assets deletion already exists with correct column name

  ## Changes
  - Update template_installations DELETE to use `installed_series_id` column
  - Replace shared_asset_pools DELETE with UPDATE to remove series from `series_ids` array
  - This preserves shared asset pools while removing the series reference
*/

-- Drop and recreate the delete_series function with correct column names
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

  -- Delete workflow system data FIRST (in correct dependency order)
  
  -- 1. Delete workflow notifications (references workflow_instances and approval_requests)
  DELETE FROM workflow_notifications WHERE workflow_instance_id IN (
    SELECT id FROM workflow_instances WHERE series_id = series_uuid
  );

  DELETE FROM workflow_notifications WHERE approval_request_id IN (
    SELECT id FROM approval_requests WHERE workflow_instance_id IN (
      SELECT id FROM workflow_instances WHERE series_id = series_uuid
    )
  );

  -- 2. Delete workflow escalations (references approval_requests and workflow_stages)
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

  -- 3. Delete approval requests (references approval_chains with RESTRICT)
  DELETE FROM approval_requests WHERE workflow_instance_id IN (
    SELECT id FROM workflow_instances WHERE series_id = series_uuid
  );

  -- 4. Delete workflow stages (references workflow_instances)
  DELETE FROM workflow_stages WHERE workflow_instance_id IN (
    SELECT id FROM workflow_instances WHERE series_id = series_uuid
  );

  -- 5. Delete workflow instances (references series, episodes, scripts, storyboards)
  DELETE FROM workflow_instances WHERE series_id = series_uuid;

  -- 6. Delete approval chains (references series)
  DELETE FROM approval_chains WHERE series_id = series_uuid;

  -- 7. Delete workflow templates (references series)
  DELETE FROM workflow_templates WHERE series_id = series_uuid;

  -- Now delete other series content in proper order

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
  DELETE FROM asset_variants WHERE target_series_id = series_uuid;
  DELETE FROM asset_transformations WHERE target_series_id = series_uuid;
  DELETE FROM asset_usage_tracking WHERE used_in_series_id = series_uuid;
  DELETE FROM asset_recommendations WHERE series_id = series_uuid;
  DELETE FROM template_assets WHERE series_id = series_uuid;
  DELETE FROM asset_pool_items WHERE asset_id IN (
    SELECT id FROM assets WHERE series_id = series_uuid
  );
  DELETE FROM assets_history WHERE asset_id IN (
    SELECT id FROM assets WHERE series_id = series_uuid
  );
  DELETE FROM assets WHERE series_id = series_uuid;

  -- Delete analytics and tracking data
  DELETE FROM brand_analytics WHERE series_id = series_uuid;
  DELETE FROM brand_comparison_snapshots WHERE series_id = series_uuid;
  DELETE FROM production_velocity_tracking WHERE series_id = series_uuid;
  DELETE FROM cost_efficiency_metrics WHERE series_id = series_uuid;
  DELETE FROM ai_generation_quality_scores WHERE series_id = series_uuid;

  -- Delete configuration data
  DELETE FROM production_cost_config WHERE series_id = series_uuid;
  DELETE FROM creator_cost_config WHERE series_id = series_uuid;
  DELETE FROM distribution_channels WHERE series_id = series_uuid;

  -- Delete compliance and quality data
  DELETE FROM quality_gates WHERE series_id = series_uuid;
  DELETE FROM brand_safety_rules WHERE series_id = series_uuid;
  DELETE FROM content_screening_results WHERE series_id = series_uuid;
  DELETE FROM content_flags WHERE series_id = series_uuid;
  DELETE FROM series_compliance_mapping WHERE series_id = series_uuid;
  DELETE FROM content_versions WHERE series_id = series_uuid;
  DELETE FROM watermark_configurations WHERE series_id = series_uuid;

  -- Delete template and marketplace data
  -- FIXED: Use correct column name 'installed_series_id' instead of 'series_id'
  DELETE FROM template_installations WHERE installed_series_id = series_uuid;

  -- FIXED: Update shared_asset_pools to remove series from array instead of deleting the pool
  UPDATE shared_asset_pools
  SET series_ids = array_remove(series_ids, series_uuid)
  WHERE series_uuid = ANY(series_ids);

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