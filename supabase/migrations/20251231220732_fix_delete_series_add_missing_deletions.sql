/*
  # Fix delete_series Function - Restore Missing Table Deletions

  ## Problem
  The delete_series function was missing critical DELETE statements for asset-related,
  analytics, configuration, and compliance tables, causing foreign key constraint
  violations when attempting to delete series.

  ## Solution
  Restore all missing DELETE statements from the comprehensive version while keeping
  the field name fix (series_record.name instead of series_record.title).

  ## Tables Added Back
  - Asset management: asset_variants, asset_transformations, asset_usage_tracking,
    asset_recommendations, template_assets, asset_pool_items, assets_history, assets
  - Character history: characters_history, voice_samples, voice_cloning_jobs
  - Analytics: brand_analytics, brand_comparison_snapshots, production_velocity_tracking,
    cost_efficiency_metrics, ai_generation_quality_scores
  - Configuration: production_cost_config, creator_cost_config, distribution_channels
  - Compliance: quality_gates, brand_safety_rules, content_screening_results,
    content_flags, series_compliance_mapping, content_versions, watermark_configurations
  - Marketplace: template_installations
  - Production jobs: Now correctly scoped to series_id, not episode_id
  - Episode progress tracking
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

  DELETE FROM production_jobs WHERE series_id = series_uuid;

  DELETE FROM episodes WHERE series_id = series_uuid;

  -- Delete character-related data
  DELETE FROM character_consistency_profiles WHERE character_id IN (
    SELECT id FROM characters WHERE series_id = series_uuid
  );

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
  DELETE FROM template_installations WHERE installed_series_id = series_uuid;

  -- Update shared asset pools to remove this series
  UPDATE shared_asset_pools
  SET series_ids = array_remove(series_ids, series_uuid)
  WHERE series_uuid = ANY(series_ids);

  -- Delete series-level data
  DELETE FROM series_profit_defaults WHERE series_id = series_uuid;
  DELETE FROM dashboard_ip_sections WHERE series_id = series_uuid;

  -- Finally delete the series
  DELETE FROM series WHERE id = series_uuid;

  INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, entity_name, changes, metadata)
  VALUES (
    user_uuid,
    'delete',
    'series',
    series_uuid,
    series_record.name,
    jsonb_build_object('deleted', true),
    jsonb_build_object(
      'content_deleted', content_count,
      'organization_id', series_record.organization_id
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
