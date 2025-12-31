/*
  # Create Storyboard Character References System

  This migration creates a system to persist character reference image selections
  at the storyboard level. This allows users to set reference images once per
  character and have them apply to all shots containing that character.

  1. New Tables
    - `storyboard_character_references`
      - `id` (uuid, primary key)
      - `storyboard_id` (uuid, foreign key to storyboards)
      - `character_name` (text) - the name as it appears in shot character_positions
      - `linked_character_id` (uuid, nullable) - link to characters table
      - `linked_asset_id` (uuid, nullable) - link to assets table
      - `custom_reference_url` (text, nullable) - for custom uploaded references
      - `reference_source` (text) - 'character_library', 'asset_library', or 'custom_upload'
      - `shot_count` (integer) - cached count of shots this character appears in
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on the table
    - Add policies for authenticated users to manage their own references
    - Add anon access for development/testing

  3. Indexes
    - Index on storyboard_id for fast lookups
    - Unique constraint on storyboard_id + character_name

  4. Functions
    - Function to extract unique characters from storyboard shots
    - Function to get or create reference entries for a storyboard
*/

-- Create the storyboard_character_references table
CREATE TABLE IF NOT EXISTS storyboard_character_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id uuid NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  linked_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  linked_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  custom_reference_url text,
  reference_source text NOT NULL DEFAULT 'auto' CHECK (reference_source IN ('character_library', 'asset_library', 'custom_upload', 'auto')),
  shot_count integer DEFAULT 0,
  match_confidence numeric(3,2) DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint to prevent duplicate character entries per storyboard
CREATE UNIQUE INDEX IF NOT EXISTS storyboard_character_references_unique_idx 
ON storyboard_character_references(storyboard_id, character_name);

-- Create index for fast lookups by storyboard
CREATE INDEX IF NOT EXISTS storyboard_character_references_storyboard_idx 
ON storyboard_character_references(storyboard_id);

-- Enable RLS
ALTER TABLE storyboard_character_references ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Users can view storyboard character references"
  ON storyboard_character_references
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN scripts sc ON s.script_id = sc.id
      JOIN series ser ON sc.series_id = ser.id
      WHERE s.id = storyboard_character_references.storyboard_id
      AND ser.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert storyboard character references"
  ON storyboard_character_references
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN scripts sc ON s.script_id = sc.id
      JOIN series ser ON sc.series_id = ser.id
      WHERE s.id = storyboard_character_references.storyboard_id
      AND ser.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update storyboard character references"
  ON storyboard_character_references
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN scripts sc ON s.script_id = sc.id
      JOIN series ser ON sc.series_id = ser.id
      WHERE s.id = storyboard_character_references.storyboard_id
      AND ser.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN scripts sc ON s.script_id = sc.id
      JOIN series ser ON sc.series_id = ser.id
      WHERE s.id = storyboard_character_references.storyboard_id
      AND ser.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete storyboard character references"
  ON storyboard_character_references
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN scripts sc ON s.script_id = sc.id
      JOIN series ser ON sc.series_id = ser.id
      WHERE s.id = storyboard_character_references.storyboard_id
      AND ser.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Anon policies for development
CREATE POLICY "Anon can view storyboard character references"
  ON storyboard_character_references
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert storyboard character references"
  ON storyboard_character_references
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update storyboard character references"
  ON storyboard_character_references
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete storyboard character references"
  ON storyboard_character_references
  FOR DELETE
  TO anon
  USING (true);

-- Function to extract unique characters from a storyboard's shots
CREATE OR REPLACE FUNCTION get_storyboard_characters(p_storyboard_id uuid)
RETURNS TABLE (
  character_name text,
  shot_count bigint,
  shot_ids uuid[]
) AS $$
BEGIN
  RETURN QUERY
  WITH character_positions AS (
    SELECT 
      ss.id as shot_id,
      jsonb_array_elements(ss.character_positions::jsonb) as pos
    FROM storyboard_shots ss
    WHERE ss.storyboard_id = p_storyboard_id
    AND ss.character_positions IS NOT NULL
    AND jsonb_array_length(ss.character_positions::jsonb) > 0
  ),
  extracted_characters AS (
    SELECT 
      shot_id,
      COALESCE(
        pos->>'character',
        pos->>'name'
      ) as char_name
    FROM character_positions
    WHERE pos->>'character' IS NOT NULL OR pos->>'name' IS NOT NULL
  )
  SELECT 
    ec.char_name as character_name,
    COUNT(DISTINCT ec.shot_id) as shot_count,
    array_agg(DISTINCT ec.shot_id) as shot_ids
  FROM extracted_characters ec
  WHERE ec.char_name IS NOT NULL AND ec.char_name != ''
  GROUP BY ec.char_name
  ORDER BY shot_count DESC, ec.char_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize or refresh character references for a storyboard
CREATE OR REPLACE FUNCTION initialize_storyboard_references(p_storyboard_id uuid)
RETURNS void AS $$
DECLARE
  v_series_id uuid;
  v_char record;
  v_matched_character_id uuid;
  v_matched_reference_url text;
  v_match_confidence numeric(3,2);
BEGIN
  -- Get the series ID for character matching
  SELECT ser.id INTO v_series_id
  FROM storyboards s
  JOIN scripts sc ON s.script_id = sc.id
  JOIN series ser ON sc.series_id = ser.id
  WHERE s.id = p_storyboard_id;

  -- Loop through all characters in the storyboard
  FOR v_char IN SELECT * FROM get_storyboard_characters(p_storyboard_id)
  LOOP
    -- Try to match character to character library
    v_matched_character_id := NULL;
    v_matched_reference_url := NULL;
    v_match_confidence := 0;

    -- Exact match first
    SELECT c.id, c.reference_image_url, 1.0
    INTO v_matched_character_id, v_matched_reference_url, v_match_confidence
    FROM characters c
    WHERE c.series_id = v_series_id
    AND lower(c.name) = lower(v_char.character_name)
    LIMIT 1;

    -- If no exact match, try matching without parenthetical suffix
    IF v_matched_character_id IS NULL THEN
      SELECT c.id, c.reference_image_url, 0.9
      INTO v_matched_character_id, v_matched_reference_url, v_match_confidence
      FROM characters c
      WHERE c.series_id = v_series_id
      AND lower(regexp_replace(c.name, '\s*\([^)]*\)\s*$', '')) = lower(v_char.character_name)
      LIMIT 1;
    END IF;

    -- If still no match, try partial match
    IF v_matched_character_id IS NULL THEN
      SELECT c.id, c.reference_image_url, 0.7
      INTO v_matched_character_id, v_matched_reference_url, v_match_confidence
      FROM characters c
      WHERE c.series_id = v_series_id
      AND (
        lower(c.name) LIKE '%' || lower(v_char.character_name) || '%'
        OR lower(v_char.character_name) LIKE '%' || lower(regexp_replace(c.name, '\s*\([^)]*\)\s*$', '')) || '%'
      )
      ORDER BY length(c.name) ASC
      LIMIT 1;
    END IF;

    -- Also check character aliases
    IF v_matched_character_id IS NULL THEN
      SELECT c.id, c.reference_image_url, 0.85
      INTO v_matched_character_id, v_matched_reference_url, v_match_confidence
      FROM characters c
      WHERE c.series_id = v_series_id
      AND c.aliases IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(c.aliases::jsonb) alias
        WHERE lower(alias) = lower(v_char.character_name)
      )
      LIMIT 1;
    END IF;

    -- Insert or update the reference entry
    INSERT INTO storyboard_character_references (
      storyboard_id,
      character_name,
      linked_character_id,
      custom_reference_url,
      reference_source,
      shot_count,
      match_confidence,
      is_verified
    ) VALUES (
      p_storyboard_id,
      v_char.character_name,
      v_matched_character_id,
      v_matched_reference_url,
      CASE WHEN v_matched_character_id IS NOT NULL THEN 'character_library' ELSE 'auto' END,
      v_char.shot_count,
      v_match_confidence,
      false
    )
    ON CONFLICT (storyboard_id, character_name) 
    DO UPDATE SET
      shot_count = EXCLUDED.shot_count,
      -- Only update matching if not already verified by user
      linked_character_id = CASE 
        WHEN storyboard_character_references.is_verified THEN storyboard_character_references.linked_character_id
        ELSE EXCLUDED.linked_character_id
      END,
      custom_reference_url = CASE 
        WHEN storyboard_character_references.is_verified THEN storyboard_character_references.custom_reference_url
        ELSE EXCLUDED.custom_reference_url
      END,
      match_confidence = CASE 
        WHEN storyboard_character_references.is_verified THEN storyboard_character_references.match_confidence
        ELSE EXCLUDED.match_confidence
      END,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_storyboard_characters(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION initialize_storyboard_references(uuid) TO authenticated, anon;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_storyboard_character_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_storyboard_character_references_timestamp ON storyboard_character_references;
CREATE TRIGGER update_storyboard_character_references_timestamp
  BEFORE UPDATE ON storyboard_character_references
  FOR EACH ROW
  EXECUTE FUNCTION update_storyboard_character_references_updated_at();
