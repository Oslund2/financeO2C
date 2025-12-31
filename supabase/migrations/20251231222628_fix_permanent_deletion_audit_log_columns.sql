/*
  # Fix Permanent Deletion Functions - Correct Audit Log Columns

  ## Changes
  - Update schedule_organization_deletion to use correct audit_log columns
  - Update cancel_organization_deletion to use correct audit_log columns  
  - Update permanently_delete_organization to use correct audit_log columns
  
  ## Audit Log Schema
  - action_type (not action)
  - entity_type, entity_id, entity_name
  - changes (not old_values/new_values)
  - metadata
  - user_id
*/

-- Function to schedule organization deletion
CREATE OR REPLACE FUNCTION schedule_organization_deletion(
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
  v_scheduled_date timestamptz;
  v_grace_days int := 7;
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
    RETURN jsonb_build_object('success', false, 'error', 'Only the organization owner can schedule deletion');
  END IF;

  -- Check if organization is archived
  IF v_org.archived_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization must be archived before scheduling permanent deletion');
  END IF;

  -- Check if already scheduled
  IF v_org.scheduled_deletion_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Deletion is already scheduled',
      'scheduled_deletion_at', v_org.scheduled_deletion_at
    );
  END IF;

  -- Calculate scheduled deletion date (7 days from now)
  v_scheduled_date := now() + (v_grace_days || ' days')::interval;

  -- Update organization with scheduled deletion
  UPDATE organizations
  SET 
    scheduled_deletion_at = v_scheduled_date,
    deletion_confirmed_at = now(),
    updated_at = now()
  WHERE id = org_uuid;

  -- Log the action to audit_log
  INSERT INTO audit_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    changes,
    metadata
  ) VALUES (
    user_uuid,
    'schedule_deletion',
    'organization',
    org_uuid,
    v_org.name,
    jsonb_build_object(
      'scheduled_deletion_at', v_scheduled_date,
      'deletion_confirmed_at', now()
    ),
    jsonb_build_object(
      'grace_period_days', v_grace_days,
      'organization_name', v_org.name,
      'action_description', 'Permanent deletion scheduled'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'scheduled_deletion_at', v_scheduled_date,
    'deletion_confirmed_at', now(),
    'grace_period_days', v_grace_days,
    'message', 'Permanent deletion scheduled. You have ' || v_grace_days || ' days to cancel.'
  );
END;
$$;

-- Function to cancel scheduled deletion
CREATE OR REPLACE FUNCTION cancel_organization_deletion(
  org_uuid uuid,
  user_uuid uuid,
  restore_from_archive boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org record;
  v_member_role text;
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
    RETURN jsonb_build_object('success', false, 'error', 'Only the organization owner can cancel deletion');
  END IF;

  -- Check if deletion is scheduled
  IF v_org.scheduled_deletion_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No deletion is currently scheduled');
  END IF;

  -- Clear deletion scheduling
  UPDATE organizations
  SET 
    scheduled_deletion_at = NULL,
    deletion_confirmed_at = NULL,
    archived_at = CASE WHEN restore_from_archive THEN NULL ELSE archived_at END,
    updated_at = now()
  WHERE id = org_uuid;

  -- Log the cancellation
  INSERT INTO audit_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    changes,
    metadata
  ) VALUES (
    user_uuid,
    'cancel_deletion',
    'organization',
    org_uuid,
    v_org.name,
    jsonb_build_object(
      'scheduled_deletion_at', null,
      'deletion_confirmed_at', null,
      'restored_from_archive', restore_from_archive
    ),
    jsonb_build_object(
      'organization_name', v_org.name,
      'action_description', 'Scheduled deletion cancelled',
      'restored_from_archive', restore_from_archive,
      'previous_scheduled_deletion_at', v_org.scheduled_deletion_at
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'restored_from_archive', restore_from_archive,
    'message', CASE 
      WHEN restore_from_archive THEN 'Deletion cancelled and workspace restored from archive'
      ELSE 'Deletion cancelled. Workspace remains archived.'
    END
  );
END;
$$;

-- Function to permanently delete organization
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
    user_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    changes,
    metadata
  ) VALUES (
    user_uuid,
    'permanent_delete',
    'organization',
    org_uuid,
    v_org.name,
    jsonb_build_object('deleted', true),
    jsonb_build_object(
      'organization_name', v_org.name,
      'organization_slug', v_org.slug,
      'content_deleted', v_content_counts,
      'archived_at', v_org.archived_at,
      'scheduled_deletion_at', v_org.scheduled_deletion_at,
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

  -- Delete episode progress
  DELETE FROM episode_progress 
  WHERE episode_id IN (
    SELECT e.id FROM episodes e
    JOIN series s ON e.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('episode_progress', v_count);

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

  -- Delete script translations
  DELETE FROM script_translations 
  WHERE script_id IN (
    SELECT sc.id FROM scripts sc
    JOIN series s ON sc.series_id = s.id
    WHERE s.organization_id = org_uuid
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('script_translations', v_count);

  -- Delete scripts
  DELETE FROM scripts 
  WHERE series_id IN (SELECT id FROM series WHERE organization_id = org_uuid);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('scripts', v_count);

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

  -- Delete organization invitations
  DELETE FROM organization_invitations WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('invitations', v_count);

  -- Delete organization members
  DELETE FROM organization_members WHERE organization_id = org_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('members', v_count);

  -- Delete dashboard IP sections
  DELETE FROM dashboard_ip_sections WHERE organization_id = org_uuid;

  -- Finally delete the organization
  DELETE FROM organizations WHERE id = org_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_organization', v_org.name,
    'deleted_counts', v_deleted_counts,
    'message', 'Organization and all associated data have been permanently deleted'
  );
END;
$$;
