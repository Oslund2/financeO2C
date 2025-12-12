/*
  # Remove Duplicate Anonymous Access Policies

  ## Overview
  Removes old "Anyone can..." policies that conflict with organization-based policies

  ## Changes
  - Removes old anon policies for episodes, scripts, characters, assets, storyboards
  - Keeps only the organization-aware policies that allow NULL organization_id

  ## Safety
  - Only removes the overly permissive policies
  - Keeps the secure organization-based policies
*/

-- Remove old anon policies for episodes
DROP POLICY IF EXISTS "Anyone can view all episodes" ON episodes;
DROP POLICY IF EXISTS "Anyone can create episodes" ON episodes;
DROP POLICY IF EXISTS "Anyone can update episodes" ON episodes;
DROP POLICY IF EXISTS "Anyone can delete episodes" ON episodes;

-- Remove old anon policies for scripts
DROP POLICY IF EXISTS "Anyone can view all scripts" ON scripts;
DROP POLICY IF EXISTS "Anyone can create scripts" ON scripts;
DROP POLICY IF EXISTS "Anyone can update scripts" ON scripts;
DROP POLICY IF EXISTS "Anyone can delete scripts" ON scripts;

-- Remove old anon policies for characters
DROP POLICY IF EXISTS "Anyone can view all characters" ON characters;
DROP POLICY IF EXISTS "Anyone can create characters" ON characters;
DROP POLICY IF EXISTS "Anyone can update characters" ON characters;
DROP POLICY IF EXISTS "Anyone can delete characters" ON characters;

-- Remove old anon policies for assets
DROP POLICY IF EXISTS "Anyone can view all assets" ON assets;
DROP POLICY IF EXISTS "Anyone can manage assets" ON assets;

-- Remove old anon policies for storyboards
DROP POLICY IF EXISTS "Anyone can view all storyboards" ON storyboards;
DROP POLICY IF EXISTS "Anyone can manage storyboards" ON storyboards;