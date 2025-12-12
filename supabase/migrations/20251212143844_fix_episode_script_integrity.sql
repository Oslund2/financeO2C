/*
  # Fix Episode-Script Data Integrity

  1. Schema Changes
    - Change episodes.script_id foreign key from ON DELETE SET NULL to ON DELETE RESTRICT
    - This prevents scripts from being deleted when episodes reference them
    - Add data validation functions

  2. Data Cleanup
    - Identify and log orphaned episodes (episodes with null or invalid script_id)
    - Create function to check episode-script integrity
    - Add function to handle orphaned episodes

  3. Security
    - Maintain existing RLS policies
    - Add organization validation to prevent cross-org data issues

  4. Important Notes
    - This migration will prevent accidental data loss
    - Scripts cannot be deleted if episodes depend on them
    - Orphaned episodes will be identified for manual review
*/

-- Create table to log orphaned episodes for review
CREATE TABLE IF NOT EXISTS orphaned_episodes_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid,
  episode_title text,
  series_id uuid,
  organization_id uuid,
  script_id uuid,
  status text,
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_action text,
  notes text
);

ALTER TABLE orphaned_episodes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orphaned episodes log"
  ON orphaned_episodes_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert orphaned episodes log"
  ON orphaned_episodes_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orphaned episodes log"
  ON orphaned_episodes_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Log existing orphaned episodes before making changes
INSERT INTO orphaned_episodes_log (
  episode_id,
  episode_title,
  series_id,
  organization_id,
  script_id,
  status,
  notes
)
SELECT
  e.id,
  e.title,
  e.series_id,
  e.organization_id,
  e.script_id,
  e.status,
  'Found during integrity fix migration - script_id is null or references non-existent script'
FROM episodes e
WHERE e.script_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM scripts s
     WHERE s.id = e.script_id
   );

-- Drop the existing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'episodes_script_id_fkey'
    AND table_name = 'episodes'
  ) THEN
    ALTER TABLE episodes DROP CONSTRAINT episodes_script_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint with ON DELETE RESTRICT
-- This prevents script deletion when episodes reference them
ALTER TABLE episodes
  ADD CONSTRAINT episodes_script_id_fkey
  FOREIGN KEY (script_id)
  REFERENCES scripts(id)
  ON DELETE RESTRICT;

-- Create function to check episode-script data integrity
CREATE OR REPLACE FUNCTION check_episode_script_integrity()
RETURNS TABLE (
  episode_id uuid,
  episode_title text,
  series_id uuid,
  organization_id uuid,
  script_id uuid,
  issue_type text,
  issue_description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.series_id,
    e.organization_id,
    e.script_id,
    'NULL_SCRIPT_ID'::text,
    'Episode has null script_id'::text
  FROM episodes e
  WHERE e.script_id IS NULL

  UNION ALL

  SELECT
    e.id,
    e.title,
    e.series_id,
    e.organization_id,
    e.script_id,
    'SCRIPT_NOT_FOUND'::text,
    'Episode references script that does not exist'::text
  FROM episodes e
  WHERE e.script_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM scripts s WHERE s.id = e.script_id
    )

  UNION ALL

  SELECT
    e.id,
    e.title,
    e.series_id,
    e.organization_id,
    e.script_id,
    'ORG_MISMATCH'::text,
    'Episode and script belong to different organizations'::text
  FROM episodes e
  INNER JOIN scripts s ON e.script_id = s.id
  WHERE e.organization_id IS NOT NULL
    AND s.organization_id IS NOT NULL
    AND e.organization_id != s.organization_id

  UNION ALL

  SELECT
    e.id,
    e.title,
    e.series_id,
    e.organization_id,
    e.script_id,
    'SERIES_MISMATCH'::text,
    'Episode and script belong to different series'::text
  FROM episodes e
  INNER JOIN scripts s ON e.script_id = s.id
  WHERE e.series_id IS NOT NULL
    AND s.series_id IS NOT NULL
    AND e.series_id != s.series_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if a script can be safely deleted
CREATE OR REPLACE FUNCTION can_delete_script(script_id_param uuid)
RETURNS TABLE (
  can_delete boolean,
  reason text,
  dependent_episodes_count bigint,
  dependent_episode_ids uuid[]
) AS $$
DECLARE
  episode_count bigint;
  episode_ids uuid[];
BEGIN
  SELECT COUNT(*), ARRAY_AGG(id)
  INTO episode_count, episode_ids
  FROM episodes
  WHERE script_id = script_id_param;

  IF episode_count > 0 THEN
    RETURN QUERY SELECT
      false,
      format('Cannot delete script: %s episode(s) depend on it', episode_count),
      episode_count,
      episode_ids;
  ELSE
    RETURN QUERY SELECT
      true,
      'Script can be safely deleted',
      0::bigint,
      ARRAY[]::uuid[];
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get episodes that depend on a script
CREATE OR REPLACE FUNCTION get_script_dependencies(script_id_param uuid)
RETURNS TABLE (
  episode_id uuid,
  episode_title text,
  episode_status text,
  series_id uuid,
  series_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.status,
    e.series_id,
    s.name,
    e.created_at
  FROM episodes e
  LEFT JOIN series s ON e.series_id = s.id
  WHERE e.script_id = script_id_param
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodes_script_id_not_null
  ON episodes(script_id)
  WHERE script_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_episodes_organization_series
  ON episodes(organization_id, series_id);

-- Create trigger to validate organization consistency before insert/update
CREATE OR REPLACE FUNCTION validate_episode_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL AND NEW.script_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM scripts
      WHERE id = NEW.script_id
      AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Episode and script must belong to the same organization';
    END IF;
  END IF;

  IF NEW.series_id IS NOT NULL AND NEW.script_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM scripts
      WHERE id = NEW.script_id
      AND series_id = NEW.series_id
    ) THEN
      RAISE EXCEPTION 'Episode and script must belong to the same series';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_episode_organization_trigger ON episodes;

CREATE TRIGGER validate_episode_organization_trigger
  BEFORE INSERT OR UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_episode_organization();