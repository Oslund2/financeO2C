/*
  # Add Default Episode Count to Series

  1. Changes
    - Add `default_episode_count` column to `series` table
      - Type: integer
      - Default: 6
      - Constraint: value between 0 and 100
      - Nullable: false (with default value)

  2. Purpose
    - Allows each series to have a customizable default number of episodes for profit projections
    - Improves revenue estimation accuracy by using series-specific defaults
    - Replaces hardcoded default of 1 episode with more realistic default of 6

  3. Notes
    - Existing series will automatically get default value of 6
    - Users can adjust this value per series in Settings (0-100 range)
    - This setting is used in ShowRevenueEstimator component for initial episode count
*/

-- Add default_episode_count column to series table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'default_episode_count'
  ) THEN
    ALTER TABLE series
    ADD COLUMN default_episode_count integer NOT NULL DEFAULT 6
    CHECK (default_episode_count >= 0 AND default_episode_count <= 100);
  END IF;
END $$;

-- Update any existing series that might have NULL values (defensive)
UPDATE series
SET default_episode_count = 6
WHERE default_episode_count IS NULL;

-- Add index for potential queries filtering by episode count
CREATE INDEX IF NOT EXISTS idx_series_default_episode_count
ON series(default_episode_count);

-- Add comment for documentation
COMMENT ON COLUMN series.default_episode_count IS
'Default number of episodes used in profit projections for this series. Range: 0-100, Default: 6';
