/*
  # Fix Patent Application Column Name Conflict

  1. Changes
    - Drop the duplicate `summary` column from patent_applications table
    - Keep `summary_invention` as the canonical column name
    - This resolves the conflict between migrations 20251217115004 and 20251217133808

  2. Rationale
    - Migration 20251217115004 created `summary_invention`
    - Migration 20251217133808 created `summary`
    - The AI workflow uses `summary_invention`, so we keep that one
    - The `summary` column is redundant and causes confusion
*/

-- Drop the duplicate summary column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'summary'
  ) THEN
    ALTER TABLE patent_applications DROP COLUMN summary;
  END IF;
END $$;