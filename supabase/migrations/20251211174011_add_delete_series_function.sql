/*
  # Add Permanent Delete Function for Series

  ## Overview
  Adds a permanent delete function for series that removes all database records
  while leaving storage files intact. Includes cascade deletion of all related
  content and audit logging.

  ## New Functions

  ### delete_series
  - Permanently deletes a series and all related database records
  - Cascade deletes: characters, scripts, episodes, assets, storyboards, and related data
  - Storage files (images, uploads) are NOT deleted
  - Logs deletion in audit_log for accountability
  - Returns success/failure with detailed information

  ## Security
  - Uses SECURITY DEFINER to bypass RLS for cascade operations
  - Includes permission checks to ensure user has access to the series
  - Available to all authenticated users in the organization
*/

-- Function to permanently delete series
CREATE OR REPLACE FUNCTION delete_series(
  series_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  series_record record;
  content_count jsonb;
  deleted_count jsonb := '{}'::jsonb;
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

  -- Delete storyboard image versions
  DELETE FROM storyboard_image_versions WHERE shot_id IN (
    SELECT id FROM storyboard_shots WHERE storyboard_id IN (
      SELECT id FROM storyboards WHERE series_id = series_uuid
    )
  );

  -- Delete storyboard shots
  DELETE FROM storyboard_shots WHERE storyboard_id IN (
    SELECT id FROM storyboards WHERE series_id = series_uuid
  );

  -- Delete storyboards
  DELETE FROM storyboards WHERE series_id = series_uuid;

  -- Delete script scenes
  DELETE FROM script_scenes WHERE act_id IN (
    SELECT id FROM script_acts WHERE script_id IN (
      SELECT id FROM scripts WHERE series_id = series_uuid
    )
  );

  -- Delete script acts
  DELETE FROM script_acts WHERE script_id IN (
    SELECT id FROM scripts WHERE series_id = series_uuid
  );

  -- Delete script translations
  DELETE FROM script_translations WHERE script_id IN (
    SELECT id FROM scripts WHERE series_id = series_uuid
  );

  -- Delete episode cost tracking
  DELETE FROM episode_costs WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  -- Delete episode LTV tracking
  DELETE FROM episode_ltv_tracking WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  -- Delete production jobs
  DELETE FROM production_jobs WHERE episode_id IN (
    SELECT id FROM episodes WHERE series_id = series_uuid
  );

  -- Delete episodes
  DELETE FROM episodes WHERE series_id = series_uuid;

  -- Delete scripts
  DELETE FROM scripts WHERE series_id = series_uuid;

  -- Delete assets
  DELETE FROM assets WHERE series_id = series_uuid;

  -- Delete characters
  DELETE FROM characters WHERE series_id = series_uuid;

  -- Delete backup records
  DELETE FROM backup_records WHERE series_id = series_uuid;

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_series(uuid, uuid) TO authenticated;

-- Also grant execute permission for the archive and restore functions to ensure they work
GRANT EXECUTE ON FUNCTION archive_series(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_series(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION count_series_content(uuid) TO authenticated;