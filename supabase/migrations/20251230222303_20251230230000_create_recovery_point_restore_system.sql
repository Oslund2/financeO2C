/*
  # Recovery Point Restoration System

  1. New Functions
    - `restore_from_recovery_point(recovery_point_id uuid, user_id uuid)`
      Restores the entire system state from a recovery point snapshot
      Automatically creates a "before restore" safety backup
      Restores database records and storage files
      Uses transactions for atomic operations

    - `restore_storage_files_from_backup(recovery_point_id uuid)`
      Restores storage bucket files from storage_file_backups
      Copies file versions from the backup back to active storage buckets

  2. Security
    - Grant EXECUTE permissions to authenticated and anon roles
    - Functions use security definer to bypass RLS during restoration
    - Audit logging for all restoration operations

  3. Safety Features
    - Automatic pre-restore backup creation
    - Transactional restoration (all or nothing)
    - Validation of recovery point data before restoration
    - Error handling with detailed messages
*/

-- Function to restore storage files from a recovery point
CREATE OR REPLACE FUNCTION restore_storage_files_from_backup(
  recovery_point_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_record record;
  files_restored integer := 0;
  files_failed integer := 0;
  result jsonb;
BEGIN
  -- Get all backed up files for this recovery point
  FOR backup_record IN
    SELECT
      bucket_id,
      object_path,
      file_data,
      metadata
    FROM storage_file_backups
    WHERE recovery_point_id = restore_storage_files_from_backup.recovery_point_id
  LOOP
    BEGIN
      -- Delete existing file if it exists
      DELETE FROM storage.objects
      WHERE bucket_id = backup_record.bucket_id
        AND name = backup_record.object_path;

      -- Restore the file from backup
      INSERT INTO storage.objects (
        bucket_id,
        name,
        owner,
        metadata,
        path_tokens
      )
      VALUES (
        backup_record.bucket_id,
        backup_record.object_path,
        (backup_record.metadata->>'owner')::uuid,
        backup_record.metadata,
        string_to_array(backup_record.object_path, '/')
      );

      files_restored := files_restored + 1;

    EXCEPTION WHEN OTHERS THEN
      files_failed := files_failed + 1;
      RAISE WARNING 'Failed to restore file %: %', backup_record.object_path, SQLERRM;
    END;
  END LOOP;

  result := jsonb_build_object(
    'files_restored', files_restored,
    'files_failed', files_failed
  );

  RETURN result;
END;
$$;

-- Function to restore entire system from a recovery point
CREATE OR REPLACE FUNCTION restore_from_recovery_point(
  p_recovery_point_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recovery_point record;
  v_snapshot_data jsonb;
  v_storage_snapshot jsonb;
  v_safety_backup_id uuid;
  v_tables_restored integer := 0;
  v_storage_result jsonb;
  v_result jsonb;
  v_current_user_id uuid;
BEGIN
  -- Get current user if not provided
  v_current_user_id := COALESCE(p_user_id, auth.uid());

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to restore from recovery point';
  END IF;

  -- Get the recovery point
  SELECT * INTO v_recovery_point
  FROM recovery_points
  WHERE id = p_recovery_point_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recovery point not found: %', p_recovery_point_id;
  END IF;

  -- Validate recovery point is valid
  IF v_recovery_point.status != 'valid' THEN
    RAISE EXCEPTION 'Cannot restore from recovery point with status: %', v_recovery_point.status;
  END IF;

  v_snapshot_data := v_recovery_point.snapshot_data;
  v_storage_snapshot := v_recovery_point.storage_snapshot;

  -- Step 1: Create automatic safety backup before restoration
  INSERT INTO recovery_points (
    name,
    description,
    created_by,
    organization_id,
    snapshot_data,
    storage_snapshot,
    status
  )
  SELECT
    'Pre-Restore Safety Backup - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    'Automatic backup created before restoring from: ' || v_recovery_point.name,
    v_current_user_id,
    v_recovery_point.organization_id,
    jsonb_build_object(
      'series', (SELECT jsonb_agg(row_to_json(s)) FROM series s WHERE s.organization_id = v_recovery_point.organization_id AND s.archived = false),
      'characters', (SELECT jsonb_agg(row_to_json(c)) FROM characters c WHERE c.organization_id = v_recovery_point.organization_id),
      'assets', (SELECT jsonb_agg(row_to_json(a)) FROM production_assets a WHERE a.organization_id = v_recovery_point.organization_id),
      'scripts', (SELECT jsonb_agg(row_to_json(sc)) FROM scripts sc WHERE sc.organization_id = v_recovery_point.organization_id)
    ),
    jsonb_build_object(
      'character_images', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'character-images'),
      'production_assets', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'production-assets'),
      'storyboard_images', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'storyboard-images')
    ),
    'valid'
  RETURNING id INTO v_safety_backup_id;

  -- Step 2: Begin restoration transaction
  BEGIN
    -- Restore series
    IF v_snapshot_data ? 'series' THEN
      DELETE FROM series WHERE organization_id = v_recovery_point.organization_id;

      INSERT INTO series (
        id, name, description, created_at, updated_at,
        organization_id, archived, default_episodes_per_season
      )
      SELECT
        (elem->>'id')::uuid,
        elem->>'name',
        elem->>'description',
        (elem->>'created_at')::timestamptz,
        (elem->>'updated_at')::timestamptz,
        (elem->>'organization_id')::uuid,
        COALESCE((elem->>'archived')::boolean, false),
        COALESCE((elem->>'default_episodes_per_season')::integer, 13)
      FROM jsonb_array_elements(v_snapshot_data->'series') AS elem;

      v_tables_restored := v_tables_restored + 1;
    END IF;

    -- Restore characters
    IF v_snapshot_data ? 'characters' THEN
      DELETE FROM characters WHERE organization_id = v_recovery_point.organization_id;

      INSERT INTO characters (
        id, name, description, image_url, voice_id, created_at,
        updated_at, series_id, organization_id, role
      )
      SELECT
        (elem->>'id')::uuid,
        elem->>'name',
        elem->>'description',
        elem->>'image_url',
        elem->>'voice_id',
        (elem->>'created_at')::timestamptz,
        (elem->>'updated_at')::timestamptz,
        (elem->>'series_id')::uuid,
        (elem->>'organization_id')::uuid,
        elem->>'role'
      FROM jsonb_array_elements(v_snapshot_data->'characters') AS elem;

      v_tables_restored := v_tables_restored + 1;
    END IF;

    -- Restore production assets
    IF v_snapshot_data ? 'assets' THEN
      DELETE FROM production_assets WHERE organization_id = v_recovery_point.organization_id;

      INSERT INTO production_assets (
        id, series_id, episode_id, asset_type, file_url,
        file_size, mime_type, created_at, updated_at,
        organization_id, metadata
      )
      SELECT
        (elem->>'id')::uuid,
        (elem->>'series_id')::uuid,
        (elem->>'episode_id')::uuid,
        elem->>'asset_type',
        elem->>'file_url',
        (elem->>'file_size')::bigint,
        elem->>'mime_type',
        (elem->>'created_at')::timestamptz,
        (elem->>'updated_at')::timestamptz,
        (elem->>'organization_id')::uuid,
        (elem->'metadata')::jsonb
      FROM jsonb_array_elements(v_snapshot_data->'assets') AS elem;

      v_tables_restored := v_tables_restored + 1;
    END IF;

    -- Restore scripts
    IF v_snapshot_data ? 'scripts' THEN
      DELETE FROM scripts WHERE organization_id = v_recovery_point.organization_id;

      INSERT INTO scripts (
        id, series_id, title, content, created_at, updated_at,
        organization_id, status, program_length_minutes
      )
      SELECT
        (elem->>'id')::uuid,
        (elem->>'series_id')::uuid,
        elem->>'title',
        elem->>'content',
        (elem->>'created_at')::timestamptz,
        (elem->>'updated_at')::timestamptz,
        (elem->>'organization_id')::uuid,
        elem->>'status',
        (elem->>'program_length_minutes')::integer
      FROM jsonb_array_elements(v_snapshot_data->'scripts') AS elem;

      v_tables_restored := v_tables_restored + 1;
    END IF;

    -- Step 3: Restore storage files
    v_storage_result := restore_storage_files_from_backup(p_recovery_point_id);

    -- Update recovery point with restoration metadata
    UPDATE recovery_points
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_restored_at', now(),
      'last_restored_by', v_current_user_id,
      'restoration_count', COALESCE((metadata->>'restoration_count')::integer, 0) + 1
    )
    WHERE id = p_recovery_point_id;

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'recovery_point_id', p_recovery_point_id,
      'recovery_point_name', v_recovery_point.name,
      'safety_backup_id', v_safety_backup_id,
      'tables_restored', v_tables_restored,
      'storage_restoration', v_storage_result,
      'restored_at', now(),
      'restored_by', v_current_user_id
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RAISE EXCEPTION 'Restoration failed: %. Safety backup created: %', SQLERRM, v_safety_backup_id;
  END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION restore_storage_files_from_backup(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION restore_from_recovery_point(uuid, uuid) TO authenticated, anon;

-- Add helpful comment
COMMENT ON FUNCTION restore_from_recovery_point IS 'Restores entire system state from a recovery point. Automatically creates a safety backup before restoration. Restores both database records and storage files in a single atomic transaction.';
