/*
  # USPTO Application Data Sheet (ADS) Form Enhancements

  1. New Fields on patent_applications
    - `attorney_docket_number` (text) - Internal tracking number for the application (e.g., "KO-SSP1")
    - `suggested_publication_figure` (integer) - Which drawing figure to use for publication
    - `domestic_benefit_claims` (jsonb) - Array of prior application claims for priority
    - `number_of_pages` (integer) - Total page count for specification
    - `number_of_drawing_sheets` (integer) - Total number of drawing sheets

  2. Purpose
    These fields support generation of the complete USPTO Application Data Sheet (PTO/AIA/14)
    which is used for web-based electronic filing through USPTO Patent Center
*/

-- Add attorney docket number field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'attorney_docket_number'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN attorney_docket_number text;
  END IF;
END $$;

-- Add suggested publication figure field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'suggested_publication_figure'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN suggested_publication_figure integer DEFAULT 1;
  END IF;
END $$;

-- Add domestic benefit claims field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'domestic_benefit_claims'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN domestic_benefit_claims jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add number of pages field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'number_of_pages'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN number_of_pages integer;
  END IF;
END $$;

-- Add number of drawing sheets field (distinct from drawing count which is auto-calculated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'number_of_drawing_sheets'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN number_of_drawing_sheets integer;
  END IF;
END $$;

-- Create index for attorney docket number lookups
CREATE INDEX IF NOT EXISTS idx_patent_apps_attorney_docket
ON patent_applications(attorney_docket_number)
WHERE attorney_docket_number IS NOT NULL;

-- Add comment documenting the domestic_benefit_claims structure
COMMENT ON COLUMN patent_applications.domestic_benefit_claims IS
'Array of prior application claims in format: [{"applicationNumber": "16/123456", "filingDate": "2023-01-15", "patentNumber": null, "continuityType": "continuation", "priorApplicationNumber": "15/987654"}]';

-- Function to auto-generate attorney docket number if not provided
CREATE OR REPLACE FUNCTION generate_attorney_docket_number(p_title text, p_org_id uuid)
RETURNS text AS $$
DECLARE
  v_prefix text;
  v_sequence_num integer;
  v_docket_number text;
BEGIN
  -- Get organization prefix (first 3 letters of first word in title, uppercase)
  v_prefix := UPPER(SUBSTRING(REGEXP_REPLACE(p_title, '[^a-zA-Z ]', '', 'g') FROM 1 FOR 3));

  IF v_prefix = '' OR v_prefix IS NULL THEN
    v_prefix := 'PAT';
  END IF;

  -- Get next sequence number for this organization
  SELECT COUNT(*) + 1 INTO v_sequence_num
  FROM patent_applications
  WHERE organization_id = p_org_id;

  -- Format: PREFIX-NNN (e.g., "SYS-001", "MET-042")
  v_docket_number := v_prefix || '-' || LPAD(v_sequence_num::text, 3, '0');

  RETURN v_docket_number;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger to auto-populate attorney docket number on insert if not provided
CREATE OR REPLACE FUNCTION set_attorney_docket_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.attorney_docket_number IS NULL OR NEW.attorney_docket_number = '' THEN
    NEW.attorney_docket_number := generate_attorney_docket_number(NEW.title, NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_set_attorney_docket_number ON patent_applications;
CREATE TRIGGER trigger_set_attorney_docket_number
  BEFORE INSERT ON patent_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_attorney_docket_number_trigger();

-- Function to update drawing sheet count automatically
CREATE OR REPLACE FUNCTION update_drawing_sheet_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE patent_applications
  SET number_of_drawing_sheets = (
    SELECT COUNT(*)
    FROM patent_drawings
    WHERE application_id = NEW.application_id
  )
  WHERE id = NEW.application_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating drawing sheet count
DROP TRIGGER IF EXISTS trigger_update_drawing_count ON patent_drawings;
CREATE TRIGGER trigger_update_drawing_count
  AFTER INSERT OR DELETE ON patent_drawings
  FOR EACH ROW
  EXECUTE FUNCTION update_drawing_sheet_count();
