/*
  # Add Anonymous Access to Backup System Tables

  1. Overview
     Adds anonymous (anon role) access policies to backup system tables to match
     the access pattern used by other tables in the system.

  2. Changes
     - Drops existing authenticated-only policies
     - Creates new policies allowing both authenticated and anonymous users
     - Applies to: recovery_points, backup_schedules, data_integrity_checks, data_audit_log

  3. Security Note
     This maintains read-only access for viewing backup data. The backup creation
     functions remain secure as they use SECURITY DEFINER.
*/

-- ================================================
-- RECOVERY POINTS
-- ================================================

DROP POLICY IF EXISTS "Authenticated users can read recovery points" ON recovery_points;

CREATE POLICY "Anyone can read recovery points"
  ON recovery_points FOR SELECT
  TO authenticated, anon
  USING (true);

-- ================================================
-- BACKUP SCHEDULES
-- ================================================

DROP POLICY IF EXISTS "Authenticated users can read backup schedules" ON backup_schedules;

CREATE POLICY "Anyone can read backup schedules"
  ON backup_schedules FOR SELECT
  TO authenticated, anon
  USING (true);

-- ================================================
-- DATA INTEGRITY CHECKS
-- ================================================

DROP POLICY IF EXISTS "Authenticated users can read integrity checks" ON data_integrity_checks;

CREATE POLICY "Anyone can read integrity checks"
  ON data_integrity_checks FOR SELECT
  TO authenticated, anon
  USING (true);

-- ================================================
-- DATA AUDIT LOG
-- ================================================

DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON data_audit_log;

CREATE POLICY "Anyone can read audit logs"
  ON data_audit_log FOR SELECT
  TO authenticated, anon
  USING (true);

-- ================================================
-- VERSION HISTORY TABLES
-- ================================================

DROP POLICY IF EXISTS "Authenticated users can read character history" ON characters_history;

CREATE POLICY "Anyone can read character history"
  ON characters_history FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read asset history" ON assets_history;

CREATE POLICY "Anyone can read asset history"
  ON assets_history FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read script history" ON scripts_history;

CREATE POLICY "Anyone can read script history"
  ON scripts_history FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read file backups" ON storage_file_backups;

CREATE POLICY "Anyone can read file backups"
  ON storage_file_backups FOR SELECT
  TO authenticated, anon
  USING (true);
