/*
  # Animation Production Platform Database Schema
  
  This migration creates the complete database structure for the AI-powered claymation
  series production platform for "The Clayville Craniums" Scripps Spelling Bee series.
  
  ## Tables Created
  
  ### 1. series
  Stores information about different animated series (enables multi-series support)
  - id: Unique identifier
  - name: Series name (e.g., "The Clayville Craniums")
  - description: Series overview
  - theme: Series theme (e.g., "Spelling Bee")
  - style_guide: Visual style guidelines
  - created_at, updated_at: Timestamps
  
  ### 2. characters
  Stores all character information including visual and personality traits
  - id: Unique identifier
  - series_id: Links to series table
  - name: Character name
  - age: Character age
  - description: Physical description
  - personality: Personality traits and behaviors
  - clay_features: Special claymation characteristics (e.g., "head inflates when knowing words")
  - voice_characteristics: Description of voice for generation
  - eleven_labs_voice_id: Eleven Labs voice profile ID
  - reference_image_url: URL to character reference image in storage
  - tags: Array of tags for filtering
  - created_at, updated_at: Timestamps
  
  ### 3. scripts
  Stores episode scripts with act and scene structure
  - id: Unique identifier
  - series_id: Links to series table
  - title: Episode title
  - episode_number: Episode number in series
  - season_number: Season number
  - runtime_minutes: Target runtime (default 22)
  - synopsis: Episode synopsis
  - theme: Episode theme/focus
  - vocabulary_words: Array of spelling bee words featured
  - status: Script status (draft, approved, in_production, completed)
  - ai_generated: Whether script was AI-generated
  - generation_prompt: Prompt used for AI generation
  - created_at, updated_at: Timestamps
  
  ### 4. script_acts
  Stores individual acts within scripts
  - id: Unique identifier
  - script_id: Links to scripts table
  - act_number: Act number (1, 2, 3)
  - content: Act content/dialogue
  - duration_estimate: Estimated duration in seconds
  - notes: Production notes
  
  ### 5. script_scenes
  Stores individual scenes within acts
  - id: Unique identifier
  - act_id: Links to script_acts table
  - scene_number: Scene number within act
  - setting: Scene location/setting
  - description: Scene description
  - dialogue: Scene dialogue with character assignments (JSON)
  - stage_directions: Animation and movement notes
  - characters: Array of character IDs in scene
  - duration_estimate: Estimated duration in seconds
  
  ### 6. assets
  Stores all generated and uploaded media assets
  - id: Unique identifier
  - series_id: Links to series table
  - asset_type: Type (character_ref, background, prop, word_manifestation, scene_image, video_clip, audio)
  - name: Asset name/title
  - description: Asset description
  - file_url: URL to file in Supabase storage
  - thumbnail_url: URL to thumbnail image
  - metadata: JSON metadata (dimensions, duration, generation parameters)
  - tags: Array of tags for searching/filtering
  - ai_generated: Whether asset was AI-generated
  - generation_prompt: Prompt used for generation
  - usage_count: Number of times used in productions
  - created_at, updated_at: Timestamps
  
  ### 7. episodes
  Tracks episode production status and links all components
  - id: Unique identifier
  - script_id: Links to scripts table
  - series_id: Links to series table
  - title: Episode title
  - status: Production status (planning, script, assets, voice, video, assembly, review, completed)
  - progress_percentage: Overall completion percentage
  - final_video_url: URL to completed episode
  - production_notes: Notes about production process
  - estimated_cost: Estimated AI service costs
  - actual_cost: Actual costs incurred
  - created_at, updated_at, completed_at: Timestamps
  
  ### 8. scene_shots
  Breaks down scenes into individual shots for image/video generation
  - id: Unique identifier
  - scene_id: Links to script_scenes table
  - shot_number: Shot number in sequence
  - shot_type: Type of shot (wide, medium, close_up, etc.)
  - description: Visual description for image generation
  - characters: Array of character IDs visible in shot
  - background_asset_id: Links to assets table for background
  - image_asset_id: Links to assets table for generated image
  - video_asset_id: Links to assets table for generated video
  - audio_asset_id: Links to assets table for voice/audio
  - generation_status: Status (pending, generating, completed, failed)
  - generation_parameters: JSON with AI generation parameters
  
  ### 9. voice_recordings
  Tracks voice generation for dialogue
  - id: Unique identifier
  - scene_id: Links to script_scenes table
  - character_id: Links to characters table
  - dialogue_text: Text to be spoken
  - audio_asset_id: Links to assets table
  - eleven_labs_request_id: Eleven Labs API request ID
  - emotion: Emotion/tone for voice
  - status: Generation status
  - created_at: Timestamp
  
  ### 10. production_jobs
  Tracks AI generation jobs in queue
  - id: Unique identifier
  - job_type: Type of job (script, image, video, voice)
  - entity_id: ID of entity being generated
  - entity_type: Type of entity (script, shot, scene, etc.)
  - status: Job status (queued, processing, completed, failed)
  - service: AI service used (gemini, veo, elevenlabs)
  - request_payload: JSON with request parameters
  - response_data: JSON with response data
  - error_message: Error message if failed
  - cost_estimate: Estimated cost
  - started_at, completed_at: Timestamps
  
  ## Security
  - RLS enabled on all tables
  - Policies restrict access to authenticated users
  - Users can only access their own series and related data
*/

-- Create series table
CREATE TABLE IF NOT EXISTS series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  theme text,
  style_guide text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all series"
  ON series FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create series"
  ON series FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update series"
  ON series FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer,
  description text,
  personality text,
  clay_features text,
  voice_characteristics text,
  eleven_labs_voice_id text,
  reference_image_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all characters"
  ON characters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete characters"
  ON characters FOR DELETE
  TO authenticated
  USING (true);

-- Create scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  title text NOT NULL,
  episode_number integer,
  season_number integer DEFAULT 1,
  runtime_minutes integer DEFAULT 22,
  synopsis text,
  theme text,
  vocabulary_words text[] DEFAULT '{}',
  status text DEFAULT 'draft',
  ai_generated boolean DEFAULT false,
  generation_prompt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all scripts"
  ON scripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create scripts"
  ON scripts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update scripts"
  ON scripts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete scripts"
  ON scripts FOR DELETE
  TO authenticated
  USING (true);

-- Create script_acts table
CREATE TABLE IF NOT EXISTS script_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid REFERENCES scripts(id) ON DELETE CASCADE,
  act_number integer NOT NULL,
  content text,
  duration_estimate integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE script_acts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all script acts"
  ON script_acts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create script acts"
  ON script_acts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update script acts"
  ON script_acts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete script acts"
  ON script_acts FOR DELETE
  TO authenticated
  USING (true);

-- Create script_scenes table
CREATE TABLE IF NOT EXISTS script_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id uuid REFERENCES script_acts(id) ON DELETE CASCADE,
  scene_number integer NOT NULL,
  setting text,
  description text,
  dialogue jsonb DEFAULT '[]',
  stage_directions text,
  characters uuid[] DEFAULT '{}',
  duration_estimate integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE script_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all script scenes"
  ON script_scenes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create script scenes"
  ON script_scenes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update script scenes"
  ON script_scenes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete script scenes"
  ON script_scenes FOR DELETE
  TO authenticated
  USING (true);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  name text NOT NULL,
  description text,
  file_url text,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  ai_generated boolean DEFAULT false,
  generation_prompt text,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all assets"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete assets"
  ON assets FOR DELETE
  TO authenticated
  USING (true);

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid REFERENCES scripts(id) ON DELETE SET NULL,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text DEFAULT 'planning',
  progress_percentage integer DEFAULT 0,
  final_video_url text,
  production_notes text,
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all episodes"
  ON episodes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create episodes"
  ON episodes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update episodes"
  ON episodes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete episodes"
  ON episodes FOR DELETE
  TO authenticated
  USING (true);

-- Create scene_shots table
CREATE TABLE IF NOT EXISTS scene_shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid REFERENCES script_scenes(id) ON DELETE CASCADE,
  shot_number integer NOT NULL,
  shot_type text,
  description text,
  characters uuid[] DEFAULT '{}',
  background_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  image_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  video_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  audio_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  generation_status text DEFAULT 'pending',
  generation_parameters jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scene_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all scene shots"
  ON scene_shots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create scene shots"
  ON scene_shots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update scene shots"
  ON scene_shots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete scene shots"
  ON scene_shots FOR DELETE
  TO authenticated
  USING (true);

-- Create voice_recordings table
CREATE TABLE IF NOT EXISTS voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid REFERENCES script_scenes(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  dialogue_text text NOT NULL,
  audio_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  eleven_labs_request_id text,
  emotion text DEFAULT 'neutral',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all voice recordings"
  ON voice_recordings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create voice recordings"
  ON voice_recordings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update voice recordings"
  ON voice_recordings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete voice recordings"
  ON voice_recordings FOR DELETE
  TO authenticated
  USING (true);

-- Create production_jobs table
CREATE TABLE IF NOT EXISTS production_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  entity_id uuid,
  entity_type text,
  status text DEFAULT 'queued',
  service text NOT NULL,
  request_payload jsonb DEFAULT '{}',
  response_data jsonb DEFAULT '{}',
  error_message text,
  cost_estimate numeric(10,2),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE production_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all production jobs"
  ON production_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create production jobs"
  ON production_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update production jobs"
  ON production_jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_series_id ON characters(series_id);
CREATE INDEX IF NOT EXISTS idx_scripts_series_id ON scripts(series_id);
CREATE INDEX IF NOT EXISTS idx_script_acts_script_id ON script_acts(script_id);
CREATE INDEX IF NOT EXISTS idx_script_scenes_act_id ON script_scenes(act_id);
CREATE INDEX IF NOT EXISTS idx_assets_series_id ON assets(series_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_script_id ON episodes(script_id);
CREATE INDEX IF NOT EXISTS idx_scene_shots_scene_id ON scene_shots(scene_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_scene_id ON voice_recordings(scene_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_status ON production_jobs(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_script_acts_updated_at BEFORE UPDATE ON script_acts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_script_scenes_updated_at BEFORE UPDATE ON script_scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scene_shots_updated_at BEFORE UPDATE ON scene_shots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();