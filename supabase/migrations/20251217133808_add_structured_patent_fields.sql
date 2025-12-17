/*
  # Add Structured Patent Application Fields

  This migration adds structured fields to the patent_applications table to support
  the AI-generated patent workflow that requires specific sections.

  ## Changes

  1. New Columns Added to `patent_applications`
    - `field_of_invention` (text) - The technical field of the invention
    - `background_art` (text) - Background of the invention and prior art discussion
    - `summary` (text) - Summary of the invention
    - `detailed_description` (text) - Detailed description section
    
  2. Backward Compatibility
    - All new columns are nullable to preserve existing data
    - Existing `specification` field remains unchanged
    - Applications can use either structured fields or the single specification field

  ## Notes
  - These structured fields enable better AI generation and editing workflows
  - The code references these fields in patentWorkflowOrchestrator.ts
  - No data is lost or modified in this migration
*/

-- Add structured specification fields to patent_applications
DO $$
BEGIN
  -- Add field_of_invention column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'field_of_invention'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN field_of_invention text;
  END IF;

  -- Add background_art column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'background_art'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN background_art text;
  END IF;

  -- Add summary column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'summary'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN summary text;
  END IF;

  -- Add detailed_description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'detailed_description'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN detailed_description text;
  END IF;
END $$;