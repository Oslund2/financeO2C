/*
  # Fix permanently_delete_organization - Remove Invalid episode_progress Reference

  ## Problem
  The permanently_delete_organization function tries to delete from episode_progress table,
  but that table doesn't exist. The correct table is episode_progress_milestones.

  ## Solution
  Change the DELETE statement to use episode_progress_milestones instead of episode_progress.
*/

-- Get the full function and fix it
CREATE OR REPLACE FUNCTION permanently_delete_organization(
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
  v_deleted_counts jsonb;
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
    RETURN jsonb_build_object('success', false, 'error', 'Only the organization owner can permanently delete');
  END IF;

  -- Check if deletion is scheduled
  IF v_org.scheduled_deletion_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deletion must be scheduled first');
  END IF;

  -- Check if grace period has elapsed
  IF v_org.scheduled_deletion_at > now() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Grace period has not yet elapsed',
      'scheduled_deletion_at', v_org.scheduled_deletion_at,
      'time_remaining', v_org.scheduled_deletion_at - now()
    );
  END IF;

  -- Count content before deletion for the final audit log
  SELECT jsonb_build_object(
    'series', (SELECT count(*) FROM series WHERE organization_id = org_uuid),
    'episodes', (SELECT count(*) FROM episodes e JOIN series s ON e.series_id = s.id WHERE s.organization_id = org_uuid),
    'scripts', (SELECT count(*) FROM scripts s2 JOIN series s ON s2.series_id = s.id WHERE s.organization_id = org_uuid),
    'characters', (SELECT count(*) FROM characters c JOIN series s ON c.series_id = s.id WHERE s.organization_id = org_uuid),
    'assets', (SELECT count(*) FROM assets a JOIN series s ON a.series_id = s.id WHERE s.organization_id = org_uuid),
    'storyboards', (SELECT count(*) FROM storyboards sb JOIN episodes e ON sb.episode_id = e.id JOIN series s ON e.series_id = s.id WHERE s.organization_id = org_uuid),
    'members', (SELECT count(*) FROM organization_members WHERE organization_id = org_uuid)
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
    'permanent_delete',
    'organization',
    org_uuid,
    jsonb_build_object(
      'name', v_org.name,
      'slug', v_org.slug,
      'archived_at', v_org.archived_at,
      'scheduled_deletion_at', v_org.scheduled_deletion_at
    ),
    jsonb_build_object('deleted', true),
    jsonb_build_object(
      'organization_name', v_org.name,
      'content_deleted', v_content_counts,
      'action_description', 'Organization permanently deleted'
    )
  );

  -- Begin cascade deletion in proper order
  
  -- Delete storyboard shots
  DELETE FROM storyboard_shots 
  WHERE storyboard_id IN (
    SELECT sb.id FROM storyboards sb
    JOIN episodes e ON sb.episode_id = e.id
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_build_object('storyboard_shots', v_count);

  -- Delete storyboards
  DELETE FROM storyboards 
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('storyboards', v_count);

  -- Delete episode progress milestones (FIXED: was episode_progress)
  DELETE FROM episode_progress_milestones 
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('episode_progress_milestones', v_count);

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

  -- Delete series
  DELETE FROM series WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('series', v_count);

  -- Delete organization members
  DELETE FROM organization_members WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('members', v_count);

  -- Delete the organization itself
  DELETE FROM organizations WHERE id = org_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', org_uuid,
    'organization_name', v_org.name,
    'content_counts', v_content_counts,
    'deleted_counts', v_deleted_counts,
    'message', 'Organization permanently deleted'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to delete organization: ' || SQLERRM
    );
END;
$$;
