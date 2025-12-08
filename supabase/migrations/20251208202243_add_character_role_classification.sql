/*
  # Add Character Role Classification
  
  1. Changes
    - Add `role` column to `characters` table
    - Column accepts: 'Primary', 'Ensemble', 'Recurring', 'Cameo'
    - Default value: 'Ensemble'
    - Add CHECK constraint to enforce valid values
    - Add index for efficient filtering by role
  
  2. Migration Notes
    - Safe for existing data (uses default value)
    - All existing characters will be set to 'Ensemble'
    - Users can update roles individually after migration
*/

-- Add role column with check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'role'
  ) THEN
    ALTER TABLE characters 
    ADD COLUMN role text DEFAULT 'Ensemble' 
    CHECK (role IN ('Primary', 'Ensemble', 'Recurring', 'Cameo'));
  END IF;
END $$;

-- Create index for efficient filtering by role
CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(role);

-- Add helpful comment
COMMENT ON COLUMN characters.role IS 'Character classification: Primary (main characters), Ensemble (regular cast), Recurring (occasional), Cameo (one-off appearances)';
