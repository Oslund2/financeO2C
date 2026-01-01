/*
  # Add Immediate Workspace Deletion Option

  This migration adds functionality to allow workspace owners to immediately delete their workspace
  without waiting for the 7-day grace period, as long as the workspace is archived.

  1. New Function
    - `immediately_delete_organization`: Delete organization immediately (bypasses grace period)

  2. Security
    - Only owner can use this function
    - Workspace must be archived first
    - All data is permanently deleted with no recovery option

  3. Comprehensive Deletion
    - Ensures all related tables are properly cleaned up
    - Deletes in proper order to respect foreign key constraints
    - Logs deletion to audit trail before removing data
*/

-- Function to immediately delete organization (bypasses grace period)
CREATE OR REPLACE FUNCTION immediately_delete_organization(
  org_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org record;
  v_member_role text;
  v_content_counts jsonb;
  v_deleted_counts jsonb := '{}'::jsonb;
  v_count int;
BEGIN
  -- Get organization details
  SELECT * INTO v_org FROM organizations WHERE id = org_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Check if user is owner
  SELECT role INTO v_member_role
  FROM organization_members
  WHERE organization_id = org_uuid AND user_id = user_uuid;

  IF v_member_role IS NULL OR v_member_role != 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the organization owner can delete this workspace');
  END IF;

  -- Check if organization is archived (for safety)
  IF v_org.archived_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization must be archived before deletion. Please archive it first.');
  END IF;

  -- Count content before deletion for the final audit log
  SELECT jsonb_build_object(
    'series', COALESCE((SELECT count(*) FROM series WHERE organization_id = org_uuid), 0),
    'episodes', COALESCE((SELECT count(*) FROM episodes e JOIN series s ON e.series_id = s.id WHERE s.organization_id = org_uuid), 0),
    'scripts', COALESCE((SELECT count(*) FROM scripts s2 JOIN series s ON s2.series_id = s.id WHERE s.organization_id = org_uuid), 0),
    'characters', COALESCE((SELECT count(*) FROM characters c JOIN series s ON c.series_id = s.id WHERE s.organization_id = org_uuid), 0),
    'assets', COALESCE((SELECT count(*) FROM assets a JOIN series s ON a.series_id = s.id WHERE s.organization_id = org_uuid), 0),
    'members', COALESCE((SELECT count(*) FROM organization_members WHERE organization_id = org_uuid), 0)
  ) INTO v_content_counts;

  -- Create final audit log entry before deletion
  INSERT INTO audit_log (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    org_uuid,
    user_uuid,
    'immediate_permanent_delete',
    'organization',
    org_uuid,
    jsonb_build_object(
      'name', v_org.name,
      'slug', v_org.slug,
      'archived_at', v_org.archived_at
    ),
    jsonb_build_object('deleted', true),
    jsonb_build_object(
      'organization_name', v_org.name,
      'content_deleted', v_content_counts,
      'action_description', 'Organization immediately deleted (bypassed grace period)',
      'deletion_type', 'immediate'
    )
  );

  -- Begin cascade deletion in proper order to respect foreign key constraints

  -- Delete script citations
  DELETE FROM script_citations
  WHERE script_id IN (
    SELECT sc.id FROM scripts sc
    JOIN series s ON sc.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('script_citations', v_count);

  -- Delete script accuracy checks
  DELETE FROM script_accuracy_checks
  WHERE script_id IN (
    SELECT sc.id FROM scripts sc
    JOIN series s ON sc.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('script_accuracy_checks', v_count);

  -- Delete storyboard character references
  DELETE FROM storyboard_character_references
  WHERE storyboard_shot_id IN (
    SELECT ss.id FROM storyboard_shots ss
    JOIN storyboards sb ON ss.storyboard_id = sb.id
    JOIN episodes e ON sb.episode_id = e.id
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('storyboard_character_references', v_count);

  -- Delete storyboard shots
  DELETE FROM storyboard_shots
  WHERE storyboard_id IN (
    SELECT sb.id FROM storyboards sb
    JOIN episodes e ON sb.episode_id = e.id
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('storyboard_shots', v_count);

  -- Delete storyboards
  DELETE FROM storyboards
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('storyboards', v_count);

  -- Delete episode progress
  DELETE FROM episode_progress
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('episode_progress', v_count);

  -- Delete dialogue audio
  DELETE FROM dialogue_audio
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('dialogue_audio', v_count);

  -- Delete lip sync jobs
  DELETE FROM lip_sync_jobs
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('lip_sync_jobs', v_count);

  -- Delete episode profit settings
  DELETE FROM episode_profit_settings
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('episode_profit_settings', v_count);

  -- Delete episodes
  DELETE FROM episodes
  WHERE series_id IN (SELECT id FROM series WHERE organization_id = org_uuid);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('episodes', v_count);

  -- Delete script translation exports
  DELETE FROM script_translation_exports
  WHERE translation_id IN (
    SELECT st.id FROM script_translations st
    JOIN scripts sc ON st.script_id = sc.id
    JOIN series s ON sc.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('script_translation_exports', v_count);

  -- Delete script translations
  DELETE FROM script_translations
  WHERE script_id IN (
    SELECT sc.id FROM scripts sc
    JOIN series s ON sc.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('script_translations', v_count);

  -- Delete script scenes
  DELETE FROM script_scenes
  WHERE act_id IN (
    SELECT sa.id FROM script_acts sa
    JOIN scripts sc ON sa.script_id = sc.id
    JOIN series s ON sc.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('script_scenes', v_count);

  -- Delete script acts
  DELETE FROM script_acts
  WHERE script_id IN (
    SELECT sc.id FROM scripts sc
    JOIN series s ON sc.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('script_acts', v_count);

  -- Delete scripts
  DELETE FROM scripts
  WHERE series_id IN (SELECT id FROM series WHERE organization_id = org_uuid);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('scripts', v_count);

  -- Delete character aliases
  DELETE FROM character_aliases
  WHERE character_id IN (
    SELECT c.id FROM characters c
    JOIN series s ON c.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('character_aliases', v_count);

  -- Delete character assets
  DELETE FROM character_assets
  WHERE character_id IN (
    SELECT c.id FROM characters c
    JOIN series s ON c.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('character_assets', v_count);

  -- Delete characters
  DELETE FROM characters
  WHERE series_id IN (SELECT id FROM series WHERE organization_id = org_uuid);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('characters', v_count);

  -- Delete assets
  DELETE FROM assets
  WHERE series_id IN (SELECT id FROM series WHERE organization_id = org_uuid);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('assets', v_count);

  -- Delete series profit defaults
  DELETE FROM series_profit_defaults
  WHERE series_id IN (SELECT id FROM series WHERE organization_id = org_uuid);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('series_profit_defaults', v_count);

  -- Delete series
  DELETE FROM series WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('series', v_count);

  -- Delete workflow-related tables (if they exist)
  DELETE FROM workflow_notifications WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('workflow_notifications', v_count);

  DELETE FROM workflow_step_instances WHERE workflow_instance_id IN (
    SELECT id FROM workflow_instances WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('workflow_step_instances', v_count);

  DELETE FROM workflow_instances WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('workflow_instances', v_count);

  DELETE FROM workflow_steps WHERE workflow_template_id IN (
    SELECT id FROM workflow_templates WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('workflow_steps', v_count);

  DELETE FROM workflow_templates WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('workflow_templates', v_count);

  -- Delete patent-related data
  DELETE FROM patent_workflow_state WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('patent_workflow_state', v_count);

  DELETE FROM patent_prior_art_results WHERE search_id IN (
    SELECT id FROM patent_prior_art_searches WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('patent_prior_art_results', v_count);

  DELETE FROM patent_prior_art_searches WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('patent_prior_art_searches', v_count);

  DELETE FROM patent_differentiation_analysis WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('patent_differentiation_analysis', v_count);

  DELETE FROM patent_feature_extractions WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('patent_feature_extractions', v_count);

  DELETE FROM patent_novelty_analysis WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('patent_novelty_analysis', v_count);

  DELETE FROM patent_applications WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('patent_applications', v_count);

  -- Delete trademark-related data
  DELETE FROM trademark_search_results WHERE application_id IN (
    SELECT id FROM trademark_applications WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('trademark_search_results', v_count);

  DELETE FROM trademark_applications WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('trademark_applications', v_count);

  -- Delete copyright-related data
  DELETE FROM copyright_ai_authorship_disclosures WHERE registration_id IN (
    SELECT id FROM copyright_registrations WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('copyright_ai_authorship_disclosures', v_count);

  DELETE FROM bulk_copyright_works WHERE batch_id IN (
    SELECT id FROM bulk_copyright_batches WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('bulk_copyright_works', v_count);

  DELETE FROM bulk_copyright_batches WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('bulk_copyright_batches', v_count);

  DELETE FROM copyright_international_filings WHERE registration_id IN (
    SELECT id FROM copyright_registrations WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('copyright_international_filings', v_count);

  DELETE FROM copyright_registrations WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('copyright_registrations', v_count);

  -- Delete brand template marketplace data
  DELETE FROM brand_comparison_snapshots WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('brand_comparison_snapshots', v_count);

  DELETE FROM template_customizations WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('template_customizations', v_count);

  DELETE FROM template_ratings WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('template_ratings', v_count);

  -- Delete analytics data
  DELETE FROM asset_usage_analytics WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('asset_usage_analytics', v_count);

  DELETE FROM cross_brand_performance_metrics WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('cross_brand_performance_metrics', v_count);

  DELETE FROM brand_health_scores WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('brand_health_scores', v_count);

  DELETE FROM content_roi_analysis WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('content_roi_analysis', v_count);

  DELETE FROM audience_insights WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('audience_insights', v_count);

  -- Delete asset tags
  DELETE FROM asset_tags WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('asset_tags', v_count);

  -- Delete production system data
  DELETE FROM video_generation_jobs WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('video_generation_jobs', v_count);

  DELETE FROM video_generation_batches WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('video_generation_batches', v_count);

  DELETE FROM image_generation_jobs WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('image_generation_jobs', v_count);

  DELETE FROM image_generation_batches WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('image_generation_batches', v_count);

  DELETE FROM voice_generation_jobs WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('voice_generation_jobs', v_count);

  DELETE FROM voice_cloning_models WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('voice_cloning_models', v_count);

  DELETE FROM lip_sync_providers WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('lip_sync_providers', v_count);

  -- Delete prompt library data
  DELETE FROM prompt_template_versions WHERE template_id IN (
    SELECT id FROM prompt_templates WHERE organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('prompt_template_versions', v_count);

  DELETE FROM prompt_templates WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('prompt_templates', v_count);

  -- Delete dashboard IP sections
  DELETE FROM dashboard_ip_sections WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('dashboard_ip_sections', v_count);

  -- Delete organization invitations
  DELETE FROM organization_invitations WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('invitations', v_count);

  -- Delete organization members
  DELETE FROM organization_members WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('members', v_count);

  -- Finally delete the organization itself
  DELETE FROM organizations WHERE id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('organization', v_count);

  RETURN jsonb_build_object(
    'success', true,
    'deleted_organization', v_org.name,
    'deleted_counts', v_deleted_counts,
    'message', 'Workspace "' || v_org.name || '" and all associated data have been permanently deleted'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error during deletion: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION immediately_delete_organization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION immediately_delete_organization(uuid, uuid) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION immediately_delete_organization IS
  'Immediately and permanently deletes an organization and all its data without grace period. Owner-only. Workspace must be archived first.';
