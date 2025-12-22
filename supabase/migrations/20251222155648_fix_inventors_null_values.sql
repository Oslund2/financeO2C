/*
  # Fix Null Inventors Values

  This migration:
  1. Updates any existing patent_applications records with null inventors to empty array
  2. Ensures inventors column always has a valid value for data consistency

  This fixes persistence issues where inventors weren't saving/loading correctly.
*/

-- Update any existing records with null inventors to empty array
UPDATE patent_applications
SET inventors = '[]'::jsonb
WHERE inventors IS NULL;

-- Update any existing records with null correspondence_address to empty object
UPDATE patent_applications
SET correspondence_address = '{}'::jsonb
WHERE correspondence_address IS NULL;

-- Update any existing records with null attorney_info to empty object
UPDATE patent_applications
SET attorney_info = '{}'::jsonb
WHERE attorney_info IS NULL;

-- Update any existing records with null foreign_priority_claims to empty array
UPDATE patent_applications
SET foreign_priority_claims = '[]'::jsonb
WHERE foreign_priority_claims IS NULL;

-- Update any existing records with null filing_checklist_status to empty object
UPDATE patent_applications
SET filing_checklist_status = '{}'::jsonb
WHERE filing_checklist_status IS NULL;

-- Add NOT NULL constraints to ensure data consistency going forward
ALTER TABLE patent_applications
  ALTER COLUMN inventors SET NOT NULL,
  ALTER COLUMN correspondence_address SET NOT NULL,
  ALTER COLUMN attorney_info SET NOT NULL,
  ALTER COLUMN foreign_priority_claims SET NOT NULL,
  ALTER COLUMN filing_checklist_status SET NOT NULL;