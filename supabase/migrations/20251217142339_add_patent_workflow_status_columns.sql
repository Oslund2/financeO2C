/*
  # Add Patent Application Workflow Status Columns

  This migration adds missing workflow status columns to track the progress of
  patent application generation steps.

  1. Changes to `patent_applications` table
    - Add `differentiation_analysis` (text) - Analysis of how invention differs from prior art
    - Add `claims_generation_status` (text) - Status of claims generation workflow
    - Add `claims_generation_completed_at` (timestamptz) - When claims generation completed
    - Add `drawings_generation_status` (text) - Status of drawings generation workflow
    - Add `drawings_generation_completed_at` (timestamptz) - When drawings generation completed
    - Add `specification_generation_status` (text) - Status of specification generation workflow
    - Add `specification_generation_completed_at` (timestamptz) - When specification generation completed
    - Add `full_application_status` (text) - Overall application generation status
    - Add `full_application_completed_at` (timestamptz) - When full application completed

  2. Default Values
    - All status columns default to 'not_started'
    - Completed_at columns are nullable and default to NULL
*/

-- Add workflow status columns
DO $$
BEGIN
  -- Differentiation Analysis
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'differentiation_analysis'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN differentiation_analysis text;
  END IF;

  -- Claims Generation Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'claims_generation_status'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN claims_generation_status text DEFAULT 'not_started';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'claims_generation_completed_at'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN claims_generation_completed_at timestamptz;
  END IF;

  -- Drawings Generation Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'drawings_generation_status'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN drawings_generation_status text DEFAULT 'not_started';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'drawings_generation_completed_at'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN drawings_generation_completed_at timestamptz;
  END IF;

  -- Specification Generation Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'specification_generation_status'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN specification_generation_status text DEFAULT 'not_started';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'specification_generation_completed_at'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN specification_generation_completed_at timestamptz;
  END IF;

  -- Full Application Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'full_application_status'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN full_application_status text DEFAULT 'not_started';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'full_application_completed_at'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN full_application_completed_at timestamptz;
  END IF;
END $$;

-- Create indexes for workflow status queries
CREATE INDEX IF NOT EXISTS idx_patent_apps_claims_status 
  ON patent_applications(claims_generation_status) 
  WHERE claims_generation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patent_apps_drawings_status 
  ON patent_applications(drawings_generation_status) 
  WHERE drawings_generation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patent_apps_full_status 
  ON patent_applications(full_application_status) 
  WHERE full_application_status IS NOT NULL;