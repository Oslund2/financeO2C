/*
  # Add Invention Description Fields to Patent Applications

  This migration adds fields to capture the user's actual invention details,
  which are essential for generating accurate patent specifications.

  1. New Columns
    - `invention_description` (text): Detailed description of the user's actual invention
    - `technical_field` (text): The technical field/domain of the invention
    - `key_features` (jsonb): Array of key innovative features defined by the user
    - `problem_solved` (text): The technical problem the invention solves

  2. Purpose
    - Enables patent specification generation based on the actual invention
    - Prevents hallucination by grounding AI generation in user-provided details
    - Stores structured invention data for feature extraction
*/

-- Add invention_description column for detailed invention description
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'invention_description'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN invention_description text;
  END IF;
END $$;

-- Add technical_field column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'technical_field'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN technical_field text;
  END IF;
END $$;

-- Add key_features column (jsonb array of feature objects)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'key_features'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN key_features jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add problem_solved column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'problem_solved'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN problem_solved text;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN patent_applications.invention_description IS 'Detailed description of the actual invention provided by the user';
COMMENT ON COLUMN patent_applications.technical_field IS 'The technical field or domain of the invention';
COMMENT ON COLUMN patent_applications.key_features IS 'JSON array of key innovative features defined by the user';
COMMENT ON COLUMN patent_applications.problem_solved IS 'The technical problem that the invention solves';