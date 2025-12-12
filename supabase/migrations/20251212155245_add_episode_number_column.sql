/*
  # Add episode_number column to episodes table

  1. Changes
    - Add `episode_number` column to episodes table (integer)
    - Set default value to 1 for episodes without a number
    - Backfill existing episodes with sequential numbers per series
    - Create index for better query performance on series_id + episode_number
  
  2. Notes
    - Existing episodes will be numbered sequentially based on creation date
    - This enables proper ordering and display of episodes within a series
*/

-- Add the episode_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'episode_number'
  ) THEN
    ALTER TABLE episodes ADD COLUMN episode_number integer DEFAULT 1;
  END IF;
END $$;

-- Backfill episode numbers for existing episodes (ordered by created_at)
WITH numbered_episodes AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY created_at) as new_number
  FROM episodes
  WHERE series_id IS NOT NULL
)
UPDATE episodes
SET episode_number = numbered_episodes.new_number
FROM numbered_episodes
WHERE episodes.id = numbered_episodes.id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_episodes_series_episode_number 
ON episodes(series_id, episode_number);
