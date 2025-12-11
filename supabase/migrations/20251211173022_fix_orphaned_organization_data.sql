/*
  # Fix Orphaned Organization Data

  This migration fixes data that was created before the multi-tenant organization system was implemented.

  ## Changes
  1. Assigns orphaned series (with NULL organization_id) to the first available organization
  2. Updates all characters to inherit organization_id from their parent series
  3. Updates all assets to inherit organization_id from their parent series
  4. Updates all episodes to inherit organization_id from their parent series
  5. Updates all scripts to inherit organization_id from their parent series
  6. Updates all storyboards to inherit organization_id from their parent series

  ## Safety
  - Uses UPDATE with proper JOIN conditions
  - Only updates records where organization_id IS NULL
  - Preserves all existing data relationships
*/

-- Step 1: Assign orphaned series to the first organization
UPDATE series
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 2: Update characters to inherit organization_id from their series
UPDATE characters
SET organization_id = s.organization_id
FROM series s
WHERE characters.series_id = s.id
  AND characters.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

-- Step 3: Update assets to inherit organization_id from their series
UPDATE assets
SET organization_id = s.organization_id
FROM series s
WHERE assets.series_id = s.id
  AND assets.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

-- Step 4: Update episodes to inherit organization_id from their series
UPDATE episodes
SET organization_id = s.organization_id
FROM series s
WHERE episodes.series_id = s.id
  AND episodes.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

-- Step 5: Update scripts to inherit organization_id from their series
UPDATE scripts
SET organization_id = s.organization_id
FROM series s
WHERE scripts.series_id = s.id
  AND scripts.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

-- Step 6: Update storyboards to inherit organization_id from their series
UPDATE storyboards
SET organization_id = s.organization_id
FROM series s
WHERE storyboards.series_id = s.id
  AND storyboards.organization_id IS NULL
  AND s.organization_id IS NOT NULL;
