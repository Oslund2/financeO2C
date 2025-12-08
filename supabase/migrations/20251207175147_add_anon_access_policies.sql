/*
  # Add Anonymous Access Policies
  
  Updates RLS policies to allow anonymous users (anon role) to access data
  in addition to authenticated users. This enables the app to work without
  requiring user authentication.
  
  ## Changes
  - Updates all SELECT policies to include anon role
  - Updates INSERT, UPDATE, DELETE policies to include anon role
  - Maintains existing authenticated user access
  
  ## Security Note
  For production deployment, these policies should be restricted based on
  your security requirements. Currently allowing full access for development.
*/

-- Drop existing policies and recreate with anon access

-- Series policies
DROP POLICY IF EXISTS "Users can view all series" ON series;
DROP POLICY IF EXISTS "Users can create series" ON series;
DROP POLICY IF EXISTS "Users can update series" ON series;

CREATE POLICY "Anyone can view all series"
  ON series FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create series"
  ON series FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update series"
  ON series FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Characters policies
DROP POLICY IF EXISTS "Users can view all characters" ON characters;
DROP POLICY IF EXISTS "Users can create characters" ON characters;
DROP POLICY IF EXISTS "Users can update characters" ON characters;
DROP POLICY IF EXISTS "Users can delete characters" ON characters;

CREATE POLICY "Anyone can view all characters"
  ON characters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create characters"
  ON characters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update characters"
  ON characters FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete characters"
  ON characters FOR DELETE
  USING (true);

-- Scripts policies
DROP POLICY IF EXISTS "Users can view all scripts" ON scripts;
DROP POLICY IF EXISTS "Users can create scripts" ON scripts;
DROP POLICY IF EXISTS "Users can update scripts" ON scripts;
DROP POLICY IF EXISTS "Users can delete scripts" ON scripts;

CREATE POLICY "Anyone can view all scripts"
  ON scripts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create scripts"
  ON scripts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scripts"
  ON scripts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete scripts"
  ON scripts FOR DELETE
  USING (true);

-- Script acts policies
DROP POLICY IF EXISTS "Users can view all script acts" ON script_acts;
DROP POLICY IF EXISTS "Users can create script acts" ON script_acts;
DROP POLICY IF EXISTS "Users can update script acts" ON script_acts;
DROP POLICY IF EXISTS "Users can delete script acts" ON script_acts;

CREATE POLICY "Anyone can view all script acts"
  ON script_acts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create script acts"
  ON script_acts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update script acts"
  ON script_acts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete script acts"
  ON script_acts FOR DELETE
  USING (true);

-- Script scenes policies
DROP POLICY IF EXISTS "Users can view all script scenes" ON script_scenes;
DROP POLICY IF EXISTS "Users can create script scenes" ON script_scenes;
DROP POLICY IF EXISTS "Users can update script scenes" ON script_scenes;
DROP POLICY IF EXISTS "Users can delete script scenes" ON script_scenes;

CREATE POLICY "Anyone can view all script scenes"
  ON script_scenes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create script scenes"
  ON script_scenes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update script scenes"
  ON script_scenes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete script scenes"
  ON script_scenes FOR DELETE
  USING (true);

-- Assets policies
DROP POLICY IF EXISTS "Users can view all assets" ON assets;
DROP POLICY IF EXISTS "Users can create assets" ON assets;
DROP POLICY IF EXISTS "Users can update assets" ON assets;
DROP POLICY IF EXISTS "Users can delete assets" ON assets;

CREATE POLICY "Anyone can view all assets"
  ON assets FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create assets"
  ON assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update assets"
  ON assets FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete assets"
  ON assets FOR DELETE
  USING (true);

-- Episodes policies
DROP POLICY IF EXISTS "Users can view all episodes" ON episodes;
DROP POLICY IF EXISTS "Users can create episodes" ON episodes;
DROP POLICY IF EXISTS "Users can update episodes" ON episodes;
DROP POLICY IF EXISTS "Users can delete episodes" ON episodes;

CREATE POLICY "Anyone can view all episodes"
  ON episodes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create episodes"
  ON episodes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update episodes"
  ON episodes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete episodes"
  ON episodes FOR DELETE
  USING (true);

-- Scene shots policies
DROP POLICY IF EXISTS "Users can view all scene shots" ON scene_shots;
DROP POLICY IF EXISTS "Users can create scene shots" ON scene_shots;
DROP POLICY IF EXISTS "Users can update scene shots" ON scene_shots;
DROP POLICY IF EXISTS "Users can delete scene shots" ON scene_shots;

CREATE POLICY "Anyone can view all scene shots"
  ON scene_shots FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create scene shots"
  ON scene_shots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scene shots"
  ON scene_shots FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete scene shots"
  ON scene_shots FOR DELETE
  USING (true);

-- Voice recordings policies
DROP POLICY IF EXISTS "Users can view all voice recordings" ON voice_recordings;
DROP POLICY IF EXISTS "Users can create voice recordings" ON voice_recordings;
DROP POLICY IF EXISTS "Users can update voice recordings" ON voice_recordings;
DROP POLICY IF EXISTS "Users can delete voice recordings" ON voice_recordings;

CREATE POLICY "Anyone can view all voice recordings"
  ON voice_recordings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create voice recordings"
  ON voice_recordings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update voice recordings"
  ON voice_recordings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete voice recordings"
  ON voice_recordings FOR DELETE
  USING (true);

-- Production jobs policies
DROP POLICY IF EXISTS "Users can view all production jobs" ON production_jobs;
DROP POLICY IF EXISTS "Users can create production jobs" ON production_jobs;
DROP POLICY IF EXISTS "Users can update production jobs" ON production_jobs;

CREATE POLICY "Anyone can view all production jobs"
  ON production_jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create production jobs"
  ON production_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update production jobs"
  ON production_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);
