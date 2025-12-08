/*
  # Storyboard Generation System

  This migration creates the comprehensive database structure for AI-powered storyboard generation.

  ## New Tables

  ### 1. storyboards
  Master table tracking complete storyboard sets for each script
  - `id` (uuid, primary key): Unique storyboard identifier
  - `script_id` (uuid, foreign key): Links to scripts table
  - `series_id` (uuid, foreign key): Links to series table
  - `title` (text): Storyboard title
  - `status` (text): Generation status (pending, generating, completed, failed)
  - `total_shots` (integer): Total number of shots in storyboard
  - `completed_shots` (integer): Number of shots generated
  - `style_preferences` (jsonb): Visual style settings and preferences
  - `generation_settings` (jsonb): AI generation parameters used
  - `ai_generated` (boolean): Whether storyboard was AI-generated
  - `created_at`, `updated_at`, `completed_at` (timestamptz): Timestamps

  ### 2. storyboard_shots
  Individual shot panels with detailed visual descriptions and generated images
  - `id` (uuid, primary key): Unique shot identifier
  - `storyboard_id` (uuid, foreign key): Links to storyboards table
  - `scene_id` (uuid, foreign key): Links to script_scenes table
  - `shot_number` (integer): Sequential shot number in storyboard
  - `scene_shot_number` (integer): Shot number within the scene
  - `shot_type` (text): Type (establishing, wide, medium, close_up, over_shoulder, reaction, insert)
  - `camera_angle` (text): Camera angle (eye_level, high, low, dutch, overhead, pov)
  - `camera_movement` (text): Movement (static, pan, tilt, zoom, dolly, tracking)
  - `shot_description` (text): Detailed visual description for image generation
  - `composition_notes` (text): Framing and composition guidance
  - `character_positions` (jsonb): Array of character positions and expressions
  - `lighting_notes` (text): Lighting setup and mood
  - `props_needed` (text[]): Props visible in shot
  - `duration_seconds` (integer): Estimated shot duration
  - `dialogue_text` (text): Dialogue occurring during this shot
  - `stage_directions` (text): Action and movement notes
  - `image_prompt` (text): Complete AI image generation prompt
  - `image_url` (text): Generated storyboard panel image URL
  - `thumbnail_url` (text): Thumbnail image URL
  - `generation_status` (text): Status (pending, generating, completed, failed, needs_revision)
  - `generation_metadata` (jsonb): AI generation parameters and results
  - `revision_notes` (text): Notes for regeneration or editing
  - `approved` (boolean): Whether shot is approved for production
  - `created_at`, `updated_at` (timestamptz): Timestamps

  ### 3. storyboard_revisions
  Tracks different versions and iterations of storyboards
  - `id` (uuid, primary key): Unique revision identifier
  - `storyboard_id` (uuid, foreign key): Links to storyboards table
  - `revision_number` (integer): Version number
  - `created_by` (text): User who created this revision
  - `revision_notes` (text): Description of changes
  - `snapshot_data` (jsonb): Complete snapshot of storyboard state
  - `created_at` (timestamptz): Timestamp

  ## Enhanced Existing Tables

  Updates to scene_shots table:
  - Add `storyboard_shot_id` (uuid): Links to storyboard_shots table
  - Add `visual_style_notes` (text): Additional style guidance
  - Add `continuity_notes` (text): Continuity tracking between shots

  ## Security
  - RLS enabled on all new tables
  - Anonymous users can view but not modify
  - Policies restrict create/update/delete to authenticated users

  ## Indexes
  - Performance indexes on foreign keys and status fields
  - Composite indexes for common query patterns
*/

-- Create storyboards table
CREATE TABLE IF NOT EXISTS storyboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text DEFAULT 'pending',
  total_shots integer DEFAULT 0,
  completed_shots integer DEFAULT 0,
  style_preferences jsonb DEFAULT '{}',
  generation_settings jsonb DEFAULT '{}',
  ai_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE storyboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view storyboards"
  ON storyboards FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create storyboards"
  ON storyboards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update storyboards"
  ON storyboards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete storyboards"
  ON storyboards FOR DELETE
  TO authenticated
  USING (true);

-- Create storyboard_shots table
CREATE TABLE IF NOT EXISTS storyboard_shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id uuid REFERENCES storyboards(id) ON DELETE CASCADE NOT NULL,
  scene_id uuid REFERENCES script_scenes(id) ON DELETE CASCADE,
  shot_number integer NOT NULL,
  scene_shot_number integer NOT NULL,
  shot_type text DEFAULT 'medium',
  camera_angle text DEFAULT 'eye_level',
  camera_movement text DEFAULT 'static',
  shot_description text,
  composition_notes text,
  character_positions jsonb DEFAULT '[]',
  lighting_notes text,
  props_needed text[] DEFAULT '{}',
  duration_seconds integer DEFAULT 5,
  dialogue_text text,
  stage_directions text,
  image_prompt text,
  image_url text,
  thumbnail_url text,
  generation_status text DEFAULT 'pending',
  generation_metadata jsonb DEFAULT '{}',
  revision_notes text,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE storyboard_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view storyboard shots"
  ON storyboard_shots FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create storyboard shots"
  ON storyboard_shots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update storyboard shots"
  ON storyboard_shots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete storyboard shots"
  ON storyboard_shots FOR DELETE
  TO authenticated
  USING (true);

-- Create storyboard_revisions table
CREATE TABLE IF NOT EXISTS storyboard_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id uuid REFERENCES storyboards(id) ON DELETE CASCADE NOT NULL,
  revision_number integer NOT NULL,
  created_by text,
  revision_notes text,
  snapshot_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE storyboard_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view storyboard revisions"
  ON storyboard_revisions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create storyboard revisions"
  ON storyboard_revisions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enhance scene_shots table with storyboard integration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scene_shots' AND column_name = 'storyboard_shot_id'
  ) THEN
    ALTER TABLE scene_shots ADD COLUMN storyboard_shot_id uuid REFERENCES storyboard_shots(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scene_shots' AND column_name = 'visual_style_notes'
  ) THEN
    ALTER TABLE scene_shots ADD COLUMN visual_style_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scene_shots' AND column_name = 'continuity_notes'
  ) THEN
    ALTER TABLE scene_shots ADD COLUMN continuity_notes text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storyboards_script_id ON storyboards(script_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_series_id ON storyboards(series_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_status ON storyboards(status);

CREATE INDEX IF NOT EXISTS idx_storyboard_shots_storyboard_id ON storyboard_shots(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_scene_id ON storyboard_shots(scene_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_shot_number ON storyboard_shots(shot_number);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_generation_status ON storyboard_shots(generation_status);

CREATE INDEX IF NOT EXISTS idx_storyboard_revisions_storyboard_id ON storyboard_revisions(storyboard_id);

-- Create triggers for updated_at
CREATE TRIGGER update_storyboards_updated_at BEFORE UPDATE ON storyboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storyboard_shots_updated_at BEFORE UPDATE ON storyboard_shots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();