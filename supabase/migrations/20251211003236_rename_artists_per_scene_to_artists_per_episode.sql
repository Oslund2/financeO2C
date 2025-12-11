/*
  # Refactor Artists per Scene to Artists per Episode

  ## Overview
  This migration corrects a fundamental conceptual issue in the creator cost model.
  Previously, "artists_per_scene" implied a fresh team for each scene, which inflated
  costs unrealistically. The new "artists_per_episode" represents the total team size
  working on the entire episode, which aligns with actual animation production practices.

  ## Changes Made

  1. **Column Rename**: `artists_per_scene` → `artists_per_episode`
     - Old meaning: Number of artists assigned to work on each individual scene
     - New meaning: Total team size working on the entire episode production

  2. **Constraint Update**: Range expanded from 1-6 to 1-20 artists
     - Allows for more realistic team sizes in production environments
     - Small teams: 3-5 artists
     - Medium teams: 6-12 artists
     - Large teams: 13-20 artists

  3. **Default Value Updates**: Preset configurations adjusted to reflect team-based model
     - Global Default: 4.0 → 8.0 (standard production team)
     - Small Studio: 2.0 → 5.0 (small but viable team)
     - Large Studio: 5.0 → 15.0 (large production team)

  ## Mathematical Impact

  ### Old Calculation (Incorrect):
  - Total Hours = scenes × artists_per_scene × time_per_scene
  - Example: 165 scenes × 4 artists × 1 hour = 660 artist-hours
  - Problem: Assumes you need 4 fresh artists for each of 165 scenes

  ### New Calculation (Correct):
  - Total Work = scenes × time_per_scene = 165 hours of work
  - Team Capacity = artists_per_episode × production_days × hours_per_day
  - Example: 8 artists × 10 days × 8 hours = 640 artist-hours available
  - Validates if team can complete work in timeframe

  ## Security
  - No changes to RLS policies
  - Existing permissions remain unchanged
*/

-- Rename the column
ALTER TABLE creator_cost_config
  RENAME COLUMN artists_per_scene TO artists_per_episode;

-- Drop the old constraint
ALTER TABLE creator_cost_config
  DROP CONSTRAINT IF EXISTS creator_cost_config_artists_per_scene_check;

-- Add new constraint with expanded range (1-20 instead of 1-6)
ALTER TABLE creator_cost_config
  ADD CONSTRAINT creator_cost_config_artists_per_episode_check
  CHECK (artists_per_episode >= 1 AND artists_per_episode <= 20);

-- Update column comment
COMMENT ON COLUMN creator_cost_config.artists_per_episode IS
  'Total team size (number of artists) working on the entire episode. Used to calculate if team capacity is sufficient for the workload within the production timeline.';

-- Update Global Default preset to use realistic team size
UPDATE creator_cost_config
SET artists_per_episode = 8.0
WHERE series_id IS NULL
  AND config_name = 'Global Default Creator Cost Configuration'
  AND artists_per_episode = 4.0;

-- Update Small Studio preset
UPDATE creator_cost_config
SET artists_per_episode = 5.0
WHERE series_id IS NULL
  AND config_name = 'Small Studio Preset'
  AND artists_per_episode = 2.0;

-- Update Large Studio preset
UPDATE creator_cost_config
SET artists_per_episode = 15.0
WHERE series_id IS NULL
  AND config_name = 'Large Studio Preset'
  AND artists_per_episode = 5.0;
