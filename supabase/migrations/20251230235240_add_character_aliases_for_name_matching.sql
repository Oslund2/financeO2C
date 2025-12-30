/*
  # Add Character Aliases for Flexible Name Matching

  1. Overview
    - Adds an `aliases` column to the characters table to support multiple name variations
    - This enables matching "Mrs. H" to "Mrs. Higginbottom" or "Higgenbottom" variations
    - Critical for character consistency in storyboard and video generation pipeline

  2. Changes
    - Add `aliases` column (text array) to `characters` table with default empty array
    - Add `required_visual_features` column for storing critical visual elements that MUST appear
    - Add index on aliases for efficient lookups

  3. Benefits
    - Characters can be found regardless of name variations in dialogue
    - Supports honorific variations (Mrs., Mrs, Ms.)
    - Supports spelling variations (Higginbottom, Higgenbottom)
    - Supports nicknames (Mrs. H, Barnaby, Barney)
*/

-- Add aliases column for alternative character names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'aliases'
  ) THEN
    ALTER TABLE characters ADD COLUMN aliases text[] DEFAULT '{}';
  END IF;
END $$;

-- Add required_visual_features column for critical visual elements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'required_visual_features'
  ) THEN
    ALTER TABLE characters ADD COLUMN required_visual_features text[] DEFAULT '{}';
  END IF;
END $$;

-- Create index for efficient alias lookups
CREATE INDEX IF NOT EXISTS idx_characters_aliases ON characters USING GIN (aliases);

-- Add comment explaining the columns
COMMENT ON COLUMN characters.aliases IS 'Alternative names for the character (e.g., "Mrs. H", "Higgenbottom"). Used for flexible name matching in dialogue.';
COMMENT ON COLUMN characters.required_visual_features IS 'Critical visual features that MUST appear in every image (e.g., "library cart lower body", "lightbulb in left ear").';