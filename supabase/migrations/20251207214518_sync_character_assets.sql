/*
  # Sync Character Reference Images to Assets Table

  ## Changes

  1. Schema Updates
    - Add `character_id` column to assets table (nullable, foreign key to characters)
    - Add index on character_id for query performance

  2. Data Migration
    - Migrate all existing character reference images to assets table
    - Create asset records with asset_type='character_ref'
    - Link assets back to characters using character_id

  3. Triggers
    - Auto-create asset when character with image is created
    - Auto-update asset when character image is updated
    - Auto-delete asset when character is deleted

  4. Security
    - RLS policies already in place on assets table
*/

-- Add character_id column to assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'character_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN character_id uuid REFERENCES characters(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_character_id ON assets(character_id);

-- Migrate existing characters with reference images to assets table
INSERT INTO assets (
  character_id,
  series_id,
  asset_type,
  name,
  description,
  file_url,
  thumbnail_url,
  tags,
  ai_generated,
  metadata,
  created_at,
  updated_at
)
SELECT
  c.id as character_id,
  c.series_id,
  'character_ref' as asset_type,
  c.name as name,
  COALESCE(c.description, 'Character reference image for ' || c.name) as description,
  c.reference_image_url as file_url,
  c.reference_image_url as thumbnail_url,
  c.tags,
  false as ai_generated,
  jsonb_build_object(
    'character_name', c.name,
    'character_age', c.age,
    'source', 'character_sync'
  ) as metadata,
  c.created_at,
  c.updated_at
FROM characters c
WHERE c.reference_image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM assets a
    WHERE a.character_id = c.id
  );

-- Function to sync character image to assets on insert
CREATE OR REPLACE FUNCTION sync_character_asset_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create asset if character has reference image
  IF NEW.reference_image_url IS NOT NULL THEN
    INSERT INTO assets (
      character_id,
      series_id,
      asset_type,
      name,
      description,
      file_url,
      thumbnail_url,
      tags,
      ai_generated,
      metadata
    ) VALUES (
      NEW.id,
      NEW.series_id,
      'character_ref',
      NEW.name,
      COALESCE(NEW.description, 'Character reference image for ' || NEW.name),
      NEW.reference_image_url,
      NEW.reference_image_url,
      NEW.tags,
      false,
      jsonb_build_object(
        'character_name', NEW.name,
        'character_age', NEW.age,
        'source', 'character_sync'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync character image to assets on update
CREATE OR REPLACE FUNCTION sync_character_asset_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if reference_image_url changed
  IF NEW.reference_image_url IS DISTINCT FROM OLD.reference_image_url THEN
    -- If new image exists
    IF NEW.reference_image_url IS NOT NULL THEN
      -- Check if asset already exists for this character
      IF EXISTS (SELECT 1 FROM assets WHERE character_id = NEW.id) THEN
        -- Update existing asset
        UPDATE assets SET
          name = NEW.name,
          description = COALESCE(NEW.description, 'Character reference image for ' || NEW.name),
          file_url = NEW.reference_image_url,
          thumbnail_url = NEW.reference_image_url,
          tags = NEW.tags,
          series_id = NEW.series_id,
          metadata = jsonb_build_object(
            'character_name', NEW.name,
            'character_age', NEW.age,
            'source', 'character_sync'
          ),
          updated_at = now()
        WHERE character_id = NEW.id;
      ELSE
        -- Create new asset
        INSERT INTO assets (
          character_id,
          series_id,
          asset_type,
          name,
          description,
          file_url,
          thumbnail_url,
          tags,
          ai_generated,
          metadata
        ) VALUES (
          NEW.id,
          NEW.series_id,
          'character_ref',
          NEW.name,
          COALESCE(NEW.description, 'Character reference image for ' || NEW.name),
          NEW.reference_image_url,
          NEW.reference_image_url,
          NEW.tags,
          false,
          jsonb_build_object(
            'character_name', NEW.name,
            'character_age', NEW.age,
            'source', 'character_sync'
          )
        );
      END IF;
    ELSE
      -- Image was removed, delete asset
      DELETE FROM assets WHERE character_id = NEW.id;
    END IF;
  ELSE
    -- Image URL didn't change, but other fields might have
    IF NEW.reference_image_url IS NOT NULL THEN
      UPDATE assets SET
        name = NEW.name,
        description = COALESCE(NEW.description, 'Character reference image for ' || NEW.name),
        tags = NEW.tags,
        series_id = NEW.series_id,
        metadata = jsonb_build_object(
          'character_name', NEW.name,
          'character_age', NEW.age,
          'source', 'character_sync'
        ),
        updated_at = now()
      WHERE character_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS sync_character_asset_insert ON characters;
CREATE TRIGGER sync_character_asset_insert
  AFTER INSERT ON characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_character_asset_on_insert();

DROP TRIGGER IF EXISTS sync_character_asset_update ON characters;
CREATE TRIGGER sync_character_asset_update
  AFTER UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_character_asset_on_update();
