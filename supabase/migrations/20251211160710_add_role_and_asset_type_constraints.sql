/*
  # Add Role and Asset Type Validation Constraints

  1. Database Enhancements
    - Add CHECK constraint on `characters.role` to enforce valid role values
    - Add CHECK constraint on `assets.asset_type` to document and enforce valid asset types
    - Add indexes on role and asset_type for better query performance
    - Add database comments for documentation

  2. Valid Role Values
    - 'Primary': Main characters central to the story
    - 'Ensemble': Supporting cast members with significant roles
    - 'Recurring': Characters that appear regularly but in smaller roles
    - 'Cameo': Brief appearances or background characters

  3. Valid Asset Types
    - 'character_ref': Character reference images
    - 'background': Scene backgrounds and environments
    - 'prop': Physical objects and items
    - 'word_manifestation': Visual representations of words
    - 'scene_image': Storyboard and scene images
    - 'video_clip': Video assets
    - 'audio': Audio files and voice recordings
    - 'document': Documents and scripts
*/

-- Add CHECK constraint for character roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'characters' AND constraint_name = 'characters_role_check'
  ) THEN
    ALTER TABLE characters 
    ADD CONSTRAINT characters_role_check 
    CHECK (role IN ('Primary', 'Ensemble', 'Recurring', 'Cameo'));
  END IF;
END $$;

-- Add CHECK constraint for asset types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'assets' AND constraint_name = 'assets_asset_type_check'
  ) THEN
    ALTER TABLE assets 
    ADD CONSTRAINT assets_asset_type_check 
    CHECK (asset_type IN (
      'character_ref', 
      'background', 
      'prop', 
      'word_manifestation', 
      'scene_image', 
      'video_clip', 
      'audio', 
      'document'
    ));
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(role);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_series_type ON assets(series_id, asset_type);

-- Add helpful comments
COMMENT ON COLUMN characters.role IS 'Character role classification: Primary (main characters), Ensemble (supporting cast), Recurring (regular appearances), Cameo (brief appearances)';
COMMENT ON COLUMN assets.asset_type IS 'Asset type classification: character_ref, background, prop, word_manifestation, scene_image, video_clip, audio, document';
