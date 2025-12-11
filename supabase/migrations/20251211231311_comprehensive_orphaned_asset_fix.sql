/*
  # Comprehensive Orphaned Asset and Character Fix

  This migration provides a complete solution for all orphaned data that lacks organization_id.
  It handles both series-linked and standalone assets/characters.

  ## Changes
  1. Fix assets linked to series (inherit organization_id from series)
  2. Fix standalone assets (assign to first available organization)
  3. Fix characters linked to series (inherit organization_id from series)
  4. Fix standalone characters (assign to first available organization)
  5. Ensure all series have organization_id
  6. Create a default organization if none exists

  ## Safety
  - Only updates records with NULL organization_id
  - Preserves all existing data and relationships
  - Idempotent (safe to run multiple times)
*/

-- Step 1: Ensure at least one organization exists
DO $$
DECLARE
  org_count int;
  default_org_id uuid;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations;

  IF org_count = 0 THEN
    INSERT INTO organizations (name, slug, created_at)
    VALUES ('Default Workspace', 'default-workspace', now())
    RETURNING id INTO default_org_id;

    RAISE NOTICE 'Created default organization: %', default_org_id;
  END IF;
END $$;

-- Step 2: Fix orphaned series (assign to first organization)
UPDATE series
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 3: Fix assets that have a series_id (inherit from series)
UPDATE assets
SET organization_id = s.organization_id
FROM series s
WHERE assets.series_id = s.id
  AND assets.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

-- Step 4: Fix standalone assets (no series_id) - assign to first organization
UPDATE assets
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL
  AND (series_id IS NULL OR series_id NOT IN (SELECT id FROM series));

-- Step 5: Fix any remaining orphaned assets (edge case)
UPDATE assets
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 6: Fix characters that have a series_id (inherit from series)
UPDATE characters
SET organization_id = s.organization_id
FROM series s
WHERE characters.series_id = s.id
  AND characters.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

-- Step 7: Fix standalone characters (no series_id) - assign to first organization
UPDATE characters
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL
  AND (series_id IS NULL OR series_id NOT IN (SELECT id FROM series));

-- Step 8: Fix any remaining orphaned characters (edge case)
UPDATE characters
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 9: Fix episodes
UPDATE episodes
SET organization_id = s.organization_id
FROM series s
WHERE episodes.series_id = s.id
  AND episodes.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

UPDATE episodes
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 10: Fix scripts
UPDATE scripts
SET organization_id = s.organization_id
FROM series s
WHERE scripts.series_id = s.id
  AND scripts.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

UPDATE scripts
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 11: Fix storyboards
UPDATE storyboards
SET organization_id = s.organization_id
FROM series s
WHERE storyboards.series_id = s.id
  AND storyboards.organization_id IS NULL
  AND s.organization_id IS NOT NULL;

UPDATE storyboards
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 12: Verify and log results
DO $$
DECLARE
  orphaned_assets_count int;
  orphaned_characters_count int;
  orphaned_series_count int;
  total_assets int;
  total_characters int;
  total_organizations int;
BEGIN
  SELECT COUNT(*) INTO orphaned_assets_count FROM assets WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO orphaned_characters_count FROM characters WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO orphaned_series_count FROM series WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO total_assets FROM assets;
  SELECT COUNT(*) INTO total_characters FROM characters;
  SELECT COUNT(*) INTO total_organizations FROM organizations;

  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Total Organizations: %', total_organizations;
  RAISE NOTICE 'Total Assets: %', total_assets;
  RAISE NOTICE 'Total Characters: %', total_characters;
  RAISE NOTICE 'Orphaned Assets Remaining: %', orphaned_assets_count;
  RAISE NOTICE 'Orphaned Characters Remaining: %', orphaned_characters_count;
  RAISE NOTICE 'Orphaned Series Remaining: %', orphaned_series_count;

  IF orphaned_assets_count > 0 OR orphaned_characters_count > 0 OR orphaned_series_count > 0 THEN
    RAISE WARNING 'Some orphaned records still exist. Manual review may be needed.';
  ELSE
    RAISE NOTICE 'All records successfully assigned to organizations!';
  END IF;
END $$;
