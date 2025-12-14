/*
  # Add Featured Trailer Support to Series

  1. New Columns on `series` table
    - `featured_trailer_id` (uuid, nullable) - References an asset from the asset library
    - `featured_trailer_title` (text, nullable) - Custom display title for the trailer
    - `featured_trailer_association_type` (text, nullable) - Type of association: 'script' or 'character'
    - `featured_trailer_association_id` (uuid, nullable) - ID of the associated script or character

  2. Security
    - Foreign key constraint to assets table
    - No RLS changes needed (inherits from existing series policies)

  3. Notes
    - The featured trailer allows series to showcase a video on their dashboard
    - Association links the trailer to related content (script or character)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'featured_trailer_id'
  ) THEN
    ALTER TABLE series ADD COLUMN featured_trailer_id uuid REFERENCES assets(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'featured_trailer_title'
  ) THEN
    ALTER TABLE series ADD COLUMN featured_trailer_title text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'featured_trailer_association_type'
  ) THEN
    ALTER TABLE series ADD COLUMN featured_trailer_association_type text CHECK (featured_trailer_association_type IN ('script', 'character'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'featured_trailer_association_id'
  ) THEN
    ALTER TABLE series ADD COLUMN featured_trailer_association_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_series_featured_trailer ON series(featured_trailer_id) WHERE featured_trailer_id IS NOT NULL;