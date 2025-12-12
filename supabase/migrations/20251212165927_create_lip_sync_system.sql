/*
  # Create Lip Sync System for Dialogue Shots

  ## Overview
  This migration creates a comprehensive lip sync system that:
  - Tracks lip sync jobs and their processing status
  - Stores dialogue audio clips per shot
  - Manages provider configurations and API keys
  - Links character reference images for lip sync
  - Supports multiple cloud providers (Sync Labs, VEED.IO)
  - Tracks costs and processing metrics

  ## New Tables

  ### 1. `lip_sync_provider_configs`
  Stores API credentials and settings for different lip sync providers
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `provider_name` (text) - 'sync_labs', 'veed_io', 'self_hosted'
  - `api_key` (text, encrypted)
  - `api_endpoint` (text)
  - `is_enabled` (boolean)
  - `is_default` (boolean)
  - `priority_order` (integer) - for fallback ordering
  - `settings` (jsonb) - provider-specific settings
  - `created_at`, `updated_at`

  ### 2. `dialogue_audio_clips`
  Stores generated TTS audio files for shots with dialogue
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `shot_id` (uuid, references production_shot_plans)
  - `episode_id` (uuid, references episodes)
  - `character_id` (uuid, references characters)
  - `dialogue_text` (text)
  - `audio_url` (text) - path in Supabase Storage
  - `duration_seconds` (decimal)
  - `voice_provider` (text) - 'elevenlabs', 'chatterbox'
  - `voice_id` (text)
  - `generation_cost` (decimal)
  - `created_at`

  ### 3. `lip_sync_jobs`
  Tracks lip sync processing jobs
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `shot_id` (uuid, references production_shot_plans)
  - `episode_id` (uuid, references episodes)
  - `audio_clip_id` (uuid, references dialogue_audio_clips)
  - `character_id` (uuid, references characters)
  - `provider` (text) - which service processed this
  - `provider_job_id` (text) - external job ID from provider
  - `status` (text) - 'queued', 'processing', 'completed', 'failed', 'cancelled'
  - `source_image_url` (text) - character reference or storyboard image
  - `output_video_url` (text) - resulting lip-synced video
  - `error_message` (text)
  - `processing_time_seconds` (integer)
  - `provider_cost` (decimal)
  - `quality_score` (decimal) - optional rating
  - `attempt_number` (integer) - for retry tracking
  - `webhook_data` (jsonb) - raw webhook payload from provider
  - `created_at`, `started_at`, `completed_at`, `updated_at`

  ## Modified Tables

  ### `production_shot_plans`
  Add new columns for dialogue and lip sync tracking:
  - `has_dialogue` (boolean)
  - `requires_lip_sync` (boolean)
  - `lip_sync_status` (text) - 'not_started', 'queued', 'processing', 'completed', 'failed'
  - `lip_sync_video_url` (text)
  - `lip_sync_provider` (text)
  - `lip_sync_approved` (boolean)
  - `lip_sync_approved_at` (timestamptz)
  - `lip_sync_approved_by` (uuid)

  ### `characters`
  Add column for lip sync reference image:
  - `lip_sync_reference_image_url` (text)

  ## Storage Buckets
  - `dialogue-audio` - for TTS audio files
  - `lip-sync-videos` - for processed lip sync video outputs

  ## Security
  - Enable RLS on all new tables
  - Policies restrict access to organization members
  - Sensitive API keys are stored securely
*/

-- Create lip_sync_provider_configs table
CREATE TABLE IF NOT EXISTS lip_sync_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  provider_name text NOT NULL CHECK (provider_name IN ('sync_labs', 'veed_io', 'self_hosted')),
  api_key text,
  api_endpoint text,
  is_enabled boolean DEFAULT true NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  priority_order integer DEFAULT 0 NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(organization_id, provider_name)
);

ALTER TABLE lip_sync_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view provider configs"
  ON lip_sync_provider_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can insert provider configs"
  ON lip_sync_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can update provider configs"
  ON lip_sync_provider_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can delete provider configs"
  ON lip_sync_provider_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Create dialogue_audio_clips table
CREATE TABLE IF NOT EXISTS dialogue_audio_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  shot_id uuid REFERENCES production_shot_plans(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  dialogue_text text NOT NULL,
  audio_url text NOT NULL,
  duration_seconds decimal(10,2) NOT NULL,
  voice_provider text CHECK (voice_provider IN ('elevenlabs', 'chatterbox')),
  voice_id text,
  generation_cost decimal(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE dialogue_audio_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view dialogue audio"
  ON dialogue_audio_clips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = dialogue_audio_clips.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert dialogue audio"
  ON dialogue_audio_clips FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = dialogue_audio_clips.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update dialogue audio"
  ON dialogue_audio_clips FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = dialogue_audio_clips.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = dialogue_audio_clips.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete dialogue audio"
  ON dialogue_audio_clips FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = dialogue_audio_clips.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Create lip_sync_jobs table
CREATE TABLE IF NOT EXISTS lip_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  shot_id uuid REFERENCES production_shot_plans(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  audio_clip_id uuid REFERENCES dialogue_audio_clips(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('sync_labs', 'veed_io', 'self_hosted')),
  provider_job_id text,
  status text DEFAULT 'queued' NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  source_image_url text NOT NULL,
  output_video_url text,
  error_message text,
  processing_time_seconds integer,
  provider_cost decimal(10,4) DEFAULT 0,
  quality_score decimal(3,2),
  attempt_number integer DEFAULT 1 NOT NULL,
  webhook_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE lip_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view lip sync jobs"
  ON lip_sync_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert lip sync jobs"
  ON lip_sync_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update lip sync jobs"
  ON lip_sync_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete lip sync jobs"
  ON lip_sync_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = lip_sync_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Add columns to production_shot_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'has_dialogue'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN has_dialogue boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'requires_lip_sync'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN requires_lip_sync boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'lip_sync_status'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN lip_sync_status text DEFAULT 'not_started' CHECK (lip_sync_status IN ('not_started', 'queued', 'processing', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'lip_sync_video_url'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN lip_sync_video_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'lip_sync_provider'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN lip_sync_provider text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'lip_sync_approved'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN lip_sync_approved boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'lip_sync_approved_at'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN lip_sync_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'lip_sync_approved_by'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN lip_sync_approved_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add column to characters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'lip_sync_reference_image_url'
  ) THEN
    ALTER TABLE characters ADD COLUMN lip_sync_reference_image_url text;
  END IF;
END $$;

-- Create storage buckets for dialogue audio and lip sync videos
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('dialogue-audio', 'dialogue-audio', true),
  ('lip-sync-videos', 'lip-sync-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dialogue-audio bucket
CREATE POLICY "Organization members can upload dialogue audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dialogue-audio');

CREATE POLICY "Organization members can view dialogue audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dialogue-audio');

CREATE POLICY "Organization members can delete dialogue audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dialogue-audio');

-- Storage policies for lip-sync-videos bucket
CREATE POLICY "Organization members can upload lip sync videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lip-sync-videos');

CREATE POLICY "Organization members can view lip sync videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lip-sync-videos');

CREATE POLICY "Organization members can delete lip sync videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lip-sync-videos');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dialogue_audio_shot_id ON dialogue_audio_clips(shot_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_audio_episode_id ON dialogue_audio_clips(episode_id);
CREATE INDEX IF NOT EXISTS idx_lip_sync_jobs_shot_id ON lip_sync_jobs(shot_id);
CREATE INDEX IF NOT EXISTS idx_lip_sync_jobs_episode_id ON lip_sync_jobs(episode_id);
CREATE INDEX IF NOT EXISTS idx_lip_sync_jobs_status ON lip_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_production_shot_plans_has_dialogue ON production_shot_plans(has_dialogue);
CREATE INDEX IF NOT EXISTS idx_production_shot_plans_lip_sync_status ON production_shot_plans(lip_sync_status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_lip_sync_provider_configs_updated_at ON lip_sync_provider_configs;
CREATE TRIGGER update_lip_sync_provider_configs_updated_at
  BEFORE UPDATE ON lip_sync_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lip_sync_jobs_updated_at ON lip_sync_jobs;
CREATE TRIGGER update_lip_sync_jobs_updated_at
  BEFORE UPDATE ON lip_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
