/*
  # Add Chatterbox TTS Voice Support

  ## Overview
  This migration adds support for Chatterbox TTS as an alternative voice provider
  alongside ElevenLabs, enabling voice cloning and multi-provider voice selection.

  ## Changes to Existing Tables

  ### 1. characters table
    - Add `voice_provider` column (text): 'elevenlabs' or 'chatterbox', defaults to 'elevenlabs'
    - Add `chatterbox_voice_id` column (text): Stores Chatterbox voice ID
    - Add index on voice_provider for efficient filtering
    - Preserve existing `eleven_labs_voice_id` column for backward compatibility

  ## New Tables

  ### 2. voice_samples table
    - Tracks uploaded audio samples for voice cloning
    - Links to characters for voice profile creation
    - Stores file URLs and metadata about samples
    - Tracks cloning job status

  ### 3. voice_cloning_jobs table
    - Tracks voice cloning jobs submitted to Chatterbox
    - Records job status, progress, and results
    - Links back to voice_samples and characters

  ## Security
    - RLS enabled on all new tables
    - Policies allow authenticated users full access
    - Storage policies for voice samples handled separately

  ## Migration Notes
    - Safe for existing data
    - Existing characters will default to 'elevenlabs' provider
    - No data loss or breaking changes
*/

-- Add voice provider columns to characters table
DO $$
BEGIN
  -- Add voice_provider column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'voice_provider'
  ) THEN
    ALTER TABLE characters 
    ADD COLUMN voice_provider text DEFAULT 'elevenlabs' 
    CHECK (voice_provider IN ('elevenlabs', 'chatterbox'));
  END IF;

  -- Add chatterbox_voice_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'chatterbox_voice_id'
  ) THEN
    ALTER TABLE characters 
    ADD COLUMN chatterbox_voice_id text;
  END IF;
END $$;

-- Create index for efficient filtering by voice provider
CREATE INDEX IF NOT EXISTS idx_characters_voice_provider ON characters(voice_provider);

-- Add helpful comments
COMMENT ON COLUMN characters.voice_provider IS 'Voice generation provider: elevenlabs (ElevenLabs) or chatterbox (Chatterbox TTS)';
COMMENT ON COLUMN characters.chatterbox_voice_id IS 'Chatterbox TTS voice ID for characters using Chatterbox provider';

-- Create voice_samples table for storing audio samples for cloning
CREATE TABLE IF NOT EXISTS voice_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size_bytes integer,
  duration_seconds numeric(10,2),
  sample_rate integer,
  format text DEFAULT 'audio/mpeg',
  quality_score numeric(3,2),
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all voice samples"
  ON voice_samples FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create voice samples"
  ON voice_samples FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update voice samples"
  ON voice_samples FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete voice samples"
  ON voice_samples FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for voice_samples
CREATE INDEX IF NOT EXISTS idx_voice_samples_character_id ON voice_samples(character_id);
CREATE INDEX IF NOT EXISTS idx_voice_samples_status ON voice_samples(status);

-- Create voice_cloning_jobs table for tracking cloning operations
CREATE TABLE IF NOT EXISTS voice_cloning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  voice_name text NOT NULL,
  sample_ids uuid[] DEFAULT '{}',
  chatterbox_job_id text,
  chatterbox_voice_id text,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress_percentage integer DEFAULT 0,
  error_message text,
  quality_metrics jsonb DEFAULT '{}',
  cost_estimate numeric(10,2),
  actual_cost numeric(10,2),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE voice_cloning_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all voice cloning jobs"
  ON voice_cloning_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create voice cloning jobs"
  ON voice_cloning_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update voice cloning jobs"
  ON voice_cloning_jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete voice cloning jobs"
  ON voice_cloning_jobs FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for voice_cloning_jobs
CREATE INDEX IF NOT EXISTS idx_voice_cloning_jobs_character_id ON voice_cloning_jobs(character_id);
CREATE INDEX IF NOT EXISTS idx_voice_cloning_jobs_status ON voice_cloning_jobs(status);

-- Create trigger for voice_samples updated_at
CREATE TRIGGER update_voice_samples_updated_at BEFORE UPDATE ON voice_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE voice_samples IS 'Audio samples uploaded for voice cloning';
COMMENT ON TABLE voice_cloning_jobs IS 'Tracks voice cloning job status and results';
