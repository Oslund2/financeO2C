/*
  # Fix immediately_delete_organization: column "template_id" does not exist

  ## Problem
  The `immediately_delete_organization` function tried to delete from
  `prompt_template_versions` using a column named `template_id`, but the
  actual FK column is `prompt_template_id`. This caused every workspace
  deletion to fail with: "column "template_id" does not exist"

  ## Fix
  Replace the function with a corrected version using the correct column name
  `prompt_template_id` when deleting from `prompt_template_versions`.
*/

CREATE OR REPLACE FUNCTION immediately_delete_organization(
  org_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  org_record record;
  series_ids uuid[];
  episode_ids uuid[];
  script_ids uuid[];
  prompt_template_ids uuid[];
BEGIN
  -- Verify org exists
  SELECT * INTO org_record FROM organizations WHERE id = org_uuid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Verify user is an owner/admin member
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_uuid
      AND user_id = user_uuid
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to delete this workspace');
  END IF;

  -- Collect IDs for cascaded deletes
  SELECT ARRAY(SELECT id FROM series WHERE organization_id = org_uuid)
    INTO series_ids;

  SELECT ARRAY(SELECT id FROM episodes WHERE series_id = ANY(series_ids))
    INTO episode_ids;

  SELECT ARRAY(SELECT id FROM scripts WHERE series_id = ANY(series_ids))
    INTO script_ids;

  SELECT ARRAY(SELECT id FROM prompt_templates WHERE organization_id = org_uuid)
    INTO prompt_template_ids;

  -- Delete prompt library (FK is prompt_template_id, NOT template_id)
  DELETE FROM prompt_template_versions
    WHERE prompt_template_id = ANY(prompt_template_ids);
  DELETE FROM prompt_templates WHERE organization_id = org_uuid;

  -- Delete episode-level production data
  DELETE FROM episode_progress_milestones WHERE episode_id = ANY(episode_ids);
  DELETE FROM episode_profit_settings    WHERE episode_id = ANY(episode_ids);
  DELETE FROM episode_revenue_config     WHERE episode_id = ANY(episode_ids);
  DELETE FROM episode_performance_metrics WHERE episode_id = ANY(episode_ids);
  DELETE FROM product_placement_sponsors WHERE episode_id = ANY(episode_ids);
  DELETE FROM shot_exports               WHERE episode_id = ANY(episode_ids);
  DELETE FROM lip_sync_jobs              WHERE episode_id = ANY(episode_ids);
  DELETE FROM dialogue_audio_clips       WHERE episode_id = ANY(episode_ids);
  DELETE FROM production_shot_prompts
    WHERE production_shot_plan_id IN (
      SELECT id FROM production_shot_plans WHERE episode_id = ANY(episode_ids)
    );
  DELETE FROM production_shot_plans  WHERE episode_id = ANY(episode_ids);
  DELETE FROM production_batches     WHERE episode_id = ANY(episode_ids);

  -- Delete storyboard data
  DELETE FROM storyboard_character_references
    WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE series_id = ANY(series_ids)
    );
  DELETE FROM storyboard_shots
    WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE series_id = ANY(series_ids)
    );
  DELETE FROM storyboards WHERE series_id = ANY(series_ids);

  -- Delete script data
  DELETE FROM script_accuracy_checks
    WHERE script_id = ANY(script_ids);
  DELETE FROM script_accuracy_reports
    WHERE script_id = ANY(script_ids);
  DELETE FROM script_locks   WHERE script_id = ANY(script_ids);
  DELETE FROM script_scenes
    WHERE script_act_id IN (
      SELECT id FROM script_acts WHERE script_id = ANY(script_ids)
    );
  DELETE FROM script_acts    WHERE script_id = ANY(script_ids);
  DELETE FROM scripts        WHERE series_id = ANY(series_ids);

  -- Delete episodes, then series
  DELETE FROM episodes WHERE series_id = ANY(series_ids);

  -- Delete character data
  DELETE FROM character_consistency_profiles
    WHERE character_id IN (
      SELECT id FROM characters WHERE organization_id = org_uuid
    );
  DELETE FROM characters WHERE organization_id = org_uuid;

  -- Delete location profiles
  DELETE FROM location_consistency_profiles WHERE organization_id = org_uuid;

  -- Delete assets
  DELETE FROM assets WHERE organization_id = org_uuid;

  -- Delete series
  DELETE FROM series WHERE organization_id = org_uuid;

  -- Delete workspace settings
  DELETE FROM workspace_missions              WHERE organization_id = org_uuid;
  DELETE FROM workspace_feature_recommendations WHERE organization_id = org_uuid;

  -- Delete members, then the org itself
  DELETE FROM organization_members WHERE organization_id = org_uuid;
  DELETE FROM organizations        WHERE id = org_uuid;

  -- Audit log entry (best-effort — table may not always be accessible)
  BEGIN
    INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, entity_name, changes, metadata)
    VALUES (
      user_uuid,
      'delete',
      'organization',
      org_uuid,
      org_record.name,
      jsonb_build_object('deleted', true, 'immediate', true),
      jsonb_build_object('deletion_type', 'immediate')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: log failure but continue
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', org_uuid,
    'organization_name', org_record.name
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error during deletion: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION immediately_delete_organization(uuid, uuid) TO authenticated;
