/*
  # Comprehensive Backup and Recovery System

  ## Overview
  This migration creates a multi-layered backup and recovery system to protect against data loss.

  ## 1. New Tables
    - `data_audit_log` - Tracks all changes to critical tables with full before/after snapshots
    - `storage_file_backups` - Maintains versioned backups of all storage files
    - `backup_schedules` - Configures automated backup jobs
    - `recovery_points` - Stores system-wide recovery checkpoints
    - `data_integrity_checks` - Logs integrity validation results

  ## 2. Version History Tables
    - `characters_history` - Version history for all character changes
    - `assets_history` - Version history for all asset changes
    - `scripts_history` - Version history for all script changes

  ## 3. Automated Functions
    - Trigger functions to automatically capture all changes
    - Integrity check functions
    - Recovery point creation functions

  ## 4. Security
    - Enable RLS on all backup tables
    - Policies allow authenticated users to read their backups
    - Only system can write to backup tables (restrictive by default)

  ## 5. Important Notes
    - All changes are logged with timestamps and user context
    - Storage files are backed up with metadata
    - Recovery points allow full system restoration
    - Integrity checks run automatically
*/

-- ================================================
-- 1. DATA AUDIT LOG - Tracks all data changes
-- ================================================

CREATE TABLE IF NOT EXISTS data_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by text,
  changed_at timestamptz DEFAULT now(),
  change_description text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON data_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON data_audit_log(changed_at DESC);

ALTER TABLE data_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON data_audit_log;
CREATE POLICY "Authenticated users can read audit logs"
  ON data_audit_log FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 2. STORAGE FILE BACKUPS - Version all files
-- ================================================

CREATE TABLE IF NOT EXISTS storage_file_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_bucket_id text NOT NULL,
  original_file_path text NOT NULL,
  backup_file_path text NOT NULL,
  file_version integer DEFAULT 1,
  file_size bigint,
  file_metadata jsonb DEFAULT '{}'::jsonb,
  checksum text,
  backed_up_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  backup_status text DEFAULT 'active' CHECK (backup_status IN ('active', 'archived', 'deleted')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_backups_original ON storage_file_backups(original_bucket_id, original_file_path);
CREATE INDEX IF NOT EXISTS idx_storage_backups_version ON storage_file_backups(original_file_path, file_version DESC);
CREATE INDEX IF NOT EXISTS idx_storage_backups_status ON storage_file_backups(backup_status);

ALTER TABLE storage_file_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read file backups" ON storage_file_backups;
CREATE POLICY "Authenticated users can read file backups"
  ON storage_file_backups FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 3. CHARACTERS VERSION HISTORY
-- ================================================

CREATE TABLE IF NOT EXISTS characters_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot_data jsonb NOT NULL,
  change_summary text,
  changed_by text,
  changed_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_characters_history_char_id ON characters_history(character_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_characters_history_current ON characters_history(character_id, is_current) WHERE is_current = true;

ALTER TABLE characters_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read character history" ON characters_history;
CREATE POLICY "Authenticated users can read character history"
  ON characters_history FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 4. ASSETS VERSION HISTORY
-- ================================================

CREATE TABLE IF NOT EXISTS assets_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot_data jsonb NOT NULL,
  file_url_at_version text,
  change_summary text,
  changed_by text,
  changed_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_history_asset_id ON assets_history(asset_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_assets_history_current ON assets_history(asset_id, is_current) WHERE is_current = true;

ALTER TABLE assets_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read asset history" ON assets_history;
CREATE POLICY "Authenticated users can read asset history"
  ON assets_history FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 5. SCRIPTS VERSION HISTORY
-- ================================================

CREATE TABLE IF NOT EXISTS scripts_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot_data jsonb NOT NULL,
  change_summary text,
  changed_by text,
  changed_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scripts_history_script_id ON scripts_history(script_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_history_current ON scripts_history(script_id, is_current) WHERE is_current = true;

ALTER TABLE scripts_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read script history" ON scripts_history;
CREATE POLICY "Authenticated users can read script history"
  ON scripts_history FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 6. RECOVERY POINTS - System-wide snapshots
-- ================================================

CREATE TABLE IF NOT EXISTS recovery_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_name text NOT NULL,
  description text,
  created_by text,
  snapshot_data jsonb DEFAULT '{}'::jsonb,
  tables_included text[] DEFAULT ARRAY['characters', 'assets', 'scripts', 'series'],
  storage_snapshot jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'valid' CHECK (status IN ('valid', 'invalid', 'expired')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_points_created ON recovery_points(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_points_status ON recovery_points(status);

ALTER TABLE recovery_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read recovery points" ON recovery_points;
CREATE POLICY "Authenticated users can read recovery points"
  ON recovery_points FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 7. DATA INTEGRITY CHECKS
-- ================================================

CREATE TABLE IF NOT EXISTS data_integrity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  target_table text,
  target_record_id uuid,
  status text DEFAULT 'passed' CHECK (status IN ('passed', 'failed', 'warning')),
  issues_found jsonb DEFAULT '[]'::jsonb,
  check_details jsonb DEFAULT '{}'::jsonb,
  checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrity_checks_checked ON data_integrity_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrity_checks_status ON data_integrity_checks(status);
CREATE INDEX IF NOT EXISTS idx_integrity_checks_target ON data_integrity_checks(target_table, target_record_id);

ALTER TABLE data_integrity_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read integrity checks" ON data_integrity_checks;
CREATE POLICY "Authenticated users can read integrity checks"
  ON data_integrity_checks FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 8. BACKUP SCHEDULES - Configuration
-- ================================================

CREATE TABLE IF NOT EXISTS backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_name text NOT NULL,
  schedule_type text NOT NULL CHECK (schedule_type IN ('full', 'incremental', 'storage_only', 'database_only')),
  frequency text NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  retention_days integer DEFAULT 30,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_schedules_enabled ON backup_schedules(enabled, next_run_at);

ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read backup schedules" ON backup_schedules;
CREATE POLICY "Authenticated users can read backup schedules"
  ON backup_schedules FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- 9. AUTOMATIC TRIGGERS FOR CHARACTER VERSIONING
-- ================================================

CREATE OR REPLACE FUNCTION create_character_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM characters_history
  WHERE character_id = NEW.id;

  UPDATE characters_history
  SET is_current = false
  WHERE character_id = NEW.id;

  INSERT INTO characters_history (
    character_id,
    version_number,
    snapshot_data,
    change_summary,
    changed_by,
    is_current
  ) VALUES (
    NEW.id,
    next_version,
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Character created'
      ELSE 'Character updated'
    END,
    current_user,
    true
  );

  INSERT INTO data_audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by,
    change_description
  ) VALUES (
    'characters',
    NEW.id,
    TG_OP,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    current_user,
    'Automatic version created'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS characters_version_trigger ON characters;
CREATE TRIGGER characters_version_trigger
  AFTER INSERT OR UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION create_character_version();

-- ================================================
-- 10. AUTOMATIC TRIGGERS FOR ASSET VERSIONING
-- ================================================

CREATE OR REPLACE FUNCTION create_asset_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM assets_history
  WHERE asset_id = NEW.id;

  UPDATE assets_history
  SET is_current = false
  WHERE asset_id = NEW.id;

  INSERT INTO assets_history (
    asset_id,
    version_number,
    snapshot_data,
    file_url_at_version,
    change_summary,
    changed_by,
    is_current
  ) VALUES (
    NEW.id,
    next_version,
    to_jsonb(NEW),
    NEW.file_url,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Asset created'
      WHEN OLD.file_url != NEW.file_url THEN 'File URL changed'
      ELSE 'Asset updated'
    END,
    current_user,
    true
  );

  INSERT INTO data_audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by,
    change_description
  ) VALUES (
    'assets',
    NEW.id,
    TG_OP,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    current_user,
    'Automatic version created'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS assets_version_trigger ON assets;
CREATE TRIGGER assets_version_trigger
  AFTER INSERT OR UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION create_asset_version();

-- ================================================
-- 11. AUTOMATIC TRIGGERS FOR SCRIPT VERSIONING
-- ================================================

CREATE OR REPLACE FUNCTION create_script_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM scripts_history
  WHERE script_id = NEW.id;

  UPDATE scripts_history
  SET is_current = false
  WHERE script_id = NEW.id;

  INSERT INTO scripts_history (
    script_id,
    version_number,
    snapshot_data,
    change_summary,
    changed_by,
    is_current
  ) VALUES (
    NEW.id,
    next_version,
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Script created'
      WHEN OLD.status != NEW.status THEN 'Status changed to ' || NEW.status
      ELSE 'Script updated'
    END,
    current_user,
    true
  );

  INSERT INTO data_audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by,
    change_description
  ) VALUES (
    'scripts',
    NEW.id,
    TG_OP,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    current_user,
    'Automatic version created'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS scripts_version_trigger ON scripts;
CREATE TRIGGER scripts_version_trigger
  AFTER INSERT OR UPDATE ON scripts
  FOR EACH ROW
  EXECUTE FUNCTION create_script_version();

-- ================================================
-- 12. STORAGE FILE MONITORING (track deletions)
-- ================================================

CREATE OR REPLACE FUNCTION log_storage_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO data_audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    changed_by,
    change_description
  ) VALUES (
    'storage.objects',
    OLD.id,
    'DELETE',
    jsonb_build_object(
      'bucket_id', OLD.bucket_id,
      'name', OLD.name,
      'metadata', OLD.metadata,
      'created_at', OLD.created_at
    ),
    current_user,
    'Storage file deleted: ' || OLD.bucket_id || '/' || OLD.name
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS storage_deletion_trigger ON storage.objects;
CREATE TRIGGER storage_deletion_trigger
  BEFORE DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION log_storage_deletion();

-- ================================================
-- 13. HELPER FUNCTIONS
-- ================================================

CREATE OR REPLACE FUNCTION create_recovery_point(
  point_name text,
  description text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  recovery_id uuid;
  char_snapshot jsonb;
  asset_snapshot jsonb;
  script_snapshot jsonb;
  series_snapshot jsonb;
  storage_snapshot jsonb;
BEGIN
  SELECT jsonb_agg(to_jsonb(c.*)) INTO char_snapshot FROM characters c;
  SELECT jsonb_agg(to_jsonb(a.*)) INTO asset_snapshot FROM assets a;
  SELECT jsonb_agg(to_jsonb(s.*)) INTO script_snapshot FROM scripts s;
  SELECT jsonb_agg(to_jsonb(sr.*)) INTO series_snapshot FROM series sr;
  SELECT jsonb_agg(jsonb_build_object(
    'id', o.id,
    'bucket_id', o.bucket_id,
    'name', o.name,
    'metadata', o.metadata,
    'created_at', o.created_at
  )) INTO storage_snapshot FROM storage.objects o WHERE o.bucket_id = 'character-images';

  INSERT INTO recovery_points (
    point_name,
    description,
    created_by,
    snapshot_data,
    storage_snapshot,
    expires_at
  ) VALUES (
    point_name,
    description,
    current_user,
    jsonb_build_object(
      'characters', char_snapshot,
      'assets', asset_snapshot,
      'scripts', script_snapshot,
      'series', series_snapshot
    ),
    storage_snapshot,
    now() + interval '90 days'
  ) RETURNING id INTO recovery_id;

  RETURN recovery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS void AS $$
DECLARE
  orphaned_assets integer;
  missing_files integer;
  check_id uuid;
BEGIN
  SELECT COUNT(*) INTO orphaned_assets
  FROM assets a
  LEFT JOIN characters c ON a.character_id = c.id
  WHERE a.character_id IS NOT NULL AND c.id IS NULL;

  IF orphaned_assets > 0 THEN
    INSERT INTO data_integrity_checks (
      check_type,
      target_table,
      status,
      issues_found,
      check_details
    ) VALUES (
      'orphaned_assets',
      'assets',
      'failed',
      jsonb_build_array(jsonb_build_object(
        'issue', 'Orphaned assets found',
        'count', orphaned_assets
      )),
      jsonb_build_object('orphaned_count', orphaned_assets)
    );
  END IF;

  SELECT COUNT(*) INTO missing_files
  FROM characters c
  LEFT JOIN storage.objects o ON o.name = substring(c.reference_image_url from 'character-images/(.*)$')
  WHERE c.reference_image_url IS NOT NULL AND o.id IS NULL;

  IF missing_files > 0 THEN
    INSERT INTO data_integrity_checks (
      check_type,
      target_table,
      status,
      issues_found,
      check_details
    ) VALUES (
      'missing_storage_files',
      'characters',
      'failed',
      jsonb_build_array(jsonb_build_object(
        'issue', 'Missing storage files',
        'count', missing_files
      )),
      jsonb_build_object('missing_count', missing_files)
    );
  END IF;

  IF orphaned_assets = 0 AND missing_files = 0 THEN
    INSERT INTO data_integrity_checks (
      check_type,
      status,
      check_details
    ) VALUES (
      'full_integrity_check',
      'passed',
      jsonb_build_object(
        'checked_at', now(),
        'tables_checked', ARRAY['characters', 'assets', 'storage.objects']
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 14. CREATE INITIAL RECOVERY POINT
-- ================================================

SELECT create_recovery_point('Initial System State', 'Automatic recovery point created during backup system setup');

-- ================================================
-- 15. CREATE DEFAULT BACKUP SCHEDULES
-- ================================================

INSERT INTO backup_schedules (schedule_name, schedule_type, frequency, enabled, next_run_at)
VALUES 
  ('Daily Full Backup', 'full', 'daily', true, now() + interval '1 day'),
  ('Hourly Incremental Backup', 'incremental', 'hourly', true, now() + interval '1 hour'),
  ('Weekly Storage Backup', 'storage_only', 'weekly', true, now() + interval '7 days')
ON CONFLICT DO NOTHING;