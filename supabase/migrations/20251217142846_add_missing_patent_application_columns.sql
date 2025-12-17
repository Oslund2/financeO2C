/*
  # Add Missing Patent Application Columns

  This migration adds columns that were missing from the patent_applications table
  which were causing query failures.

  1. Changes to `patent_applications` table
    - Add `novelty_score` (numeric) - Score indicating novelty level (0-100)
    - Add `summary_invention` (text) - Summary of the invention

  These columns are required by the application queries but were not created
  in the previous migrations.
*/

-- Add missing columns
DO $$
BEGIN
  -- Novelty Score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'novelty_score'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN novelty_score numeric(5,2) DEFAULT 0;
  END IF;

  -- Summary of Invention
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'summary_invention'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN summary_invention text;
  END IF;
END $$;