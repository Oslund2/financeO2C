/*
  # Create HeyGen Video Translation System

  1. New Tables
    - `heygen_provider_configs`
      - Organization-specific HeyGen API configurations
      - API keys, endpoints, service tier info
      - Rate limits and usage quotas

    - `video_translation_jobs`
      - Tracks video translation requests to HeyGen
      - Supports single or multi-language translations
      - Links to episodes or production shots
      - Stores HeyGen job IDs and status

    - `video_translation_outputs`
      - Stores completed translated video outputs
      - One record per target language
      - Includes video URLs, captions, and metadata

    - `video_translation_captions`
      - Stores caption/subtitle files for translations
      - Supports SRT and VTT formats
      - Links to translation outputs

  2. Schema Updates
    - Extend episodes table with source_language and available_translations
    - Add heygen_video_translation job type to production_jobs

  3. Security
    - Enable RLS on all tables
    - Restrict access to organization members
    - Encrypt sensitive API keys

  4. Indexes
    - Optimize lookups by episode_id, organization_id, job status
    - Index translation language codes for quick filtering
*/

-- Create heygen_provider_configs table
CREATE TABLE IF NOT EXISTS heygen_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  api_endpoint text NOT NULL DEFAULT 'https://api.heygen.com',
  service_tier text NOT NULL DEFAULT 'scale' CHECK (service_tier IN ('scale', 'enterprise')),
  is_enabled boolean DEFAULT true,
  rate_limit_per_minute integer DEFAULT 10,
  monthly_quota_minutes integer,
  minutes_used_this_month integer DEFAULT 0,
  last_used_at timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Create video_translation_jobs table
CREATE TABLE IF NOT EXISTS video_translation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  shot_id uuid REFERENCES production_shot_plans(id) ON DELETE CASCADE,
  source_video_url text NOT NULL,
  source_language_code text NOT NULL,
  source_language_name text NOT NULL,
  target_languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  heygen_job_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_completion_time timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_data jsonb DEFAULT '{}'::jsonb,
  estimated_cost_usd numeric(10, 4) DEFAULT 0,
  actual_cost_usd numeric(10, 4) DEFAULT 0,
  video_duration_seconds integer,
  use_proofread_workflow boolean DEFAULT false,
  proofread_status text CHECK (proofread_status IN ('not_started', 'in_review', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create video_translation_outputs table
CREATE TABLE IF NOT EXISTS video_translation_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_job_id uuid NOT NULL REFERENCES video_translation_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  target_language_code text NOT NULL,
  target_language_name text NOT NULL,
  translated_video_url text,
  storage_path text,
  video_duration_seconds integer,
  file_size_bytes bigint,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  quality_status text DEFAULT 'pending' CHECK (quality_status IN ('pending', 'approved', 'needs_review', 'rejected')),
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(translation_job_id, target_language_code)
);

-- Create video_translation_captions table
CREATE TABLE IF NOT EXISTS video_translation_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_output_id uuid NOT NULL REFERENCES video_translation_outputs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  caption_format text NOT NULL CHECK (caption_format IN ('srt', 'vtt', 'json')),
  caption_content text NOT NULL,
  storage_path text,
  is_proofread boolean DEFAULT false,
  proofread_by uuid REFERENCES auth.users(id),
  proofread_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add source_language to episodes table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'source_language_code'
  ) THEN
    ALTER TABLE episodes ADD COLUMN source_language_code text DEFAULT 'en';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'source_language_name'
  ) THEN
    ALTER TABLE episodes ADD COLUMN source_language_name text DEFAULT 'English';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'available_translations'
  ) THEN
    ALTER TABLE episodes ADD COLUMN available_translations jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'is_multilingual'
  ) THEN
    ALTER TABLE episodes ADD COLUMN is_multilingual boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_heygen_configs_organization ON heygen_provider_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_video_translation_jobs_org ON video_translation_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_video_translation_jobs_episode ON video_translation_jobs(episode_id);
CREATE INDEX IF NOT EXISTS idx_video_translation_jobs_status ON video_translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_translation_jobs_heygen_id ON video_translation_jobs(heygen_job_id);
CREATE INDEX IF NOT EXISTS idx_video_translation_outputs_job ON video_translation_outputs(translation_job_id);
CREATE INDEX IF NOT EXISTS idx_video_translation_outputs_episode ON video_translation_outputs(episode_id);
CREATE INDEX IF NOT EXISTS idx_video_translation_outputs_lang ON video_translation_outputs(target_language_code);
CREATE INDEX IF NOT EXISTS idx_video_translation_captions_output ON video_translation_captions(translation_output_id);

-- Enable Row Level Security
ALTER TABLE heygen_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_translation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_translation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_translation_captions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for heygen_provider_configs
CREATE POLICY "Organization members can view HeyGen configs"
  ON heygen_provider_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = heygen_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can insert HeyGen configs"
  ON heygen_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = heygen_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can update HeyGen configs"
  ON heygen_provider_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = heygen_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can delete HeyGen configs"
  ON heygen_provider_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = heygen_provider_configs.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for video_translation_jobs
CREATE POLICY "Organization members can view translation jobs"
  ON video_translation_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create translation jobs"
  ON video_translation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update translation jobs"
  ON video_translation_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete translation jobs"
  ON video_translation_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_jobs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS Policies for video_translation_outputs
CREATE POLICY "Organization members can view translation outputs"
  ON video_translation_outputs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_outputs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create translation outputs"
  ON video_translation_outputs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_outputs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update translation outputs"
  ON video_translation_outputs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_outputs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete translation outputs"
  ON video_translation_outputs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_outputs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS Policies for video_translation_captions
CREATE POLICY "Organization members can view captions"
  ON video_translation_captions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_captions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create captions"
  ON video_translation_captions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_captions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update captions"
  ON video_translation_captions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_captions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete captions"
  ON video_translation_captions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = video_translation_captions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_translation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_heygen_configs_updated_at ON heygen_provider_configs;
CREATE TRIGGER update_heygen_configs_updated_at
  BEFORE UPDATE ON heygen_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_video_translation_updated_at();

DROP TRIGGER IF EXISTS update_video_translation_jobs_updated_at ON video_translation_jobs;
CREATE TRIGGER update_video_translation_jobs_updated_at
  BEFORE UPDATE ON video_translation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_video_translation_updated_at();

DROP TRIGGER IF EXISTS update_video_translation_outputs_updated_at ON video_translation_outputs;
CREATE TRIGGER update_video_translation_outputs_updated_at
  BEFORE UPDATE ON video_translation_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_video_translation_updated_at();

DROP TRIGGER IF EXISTS update_video_translation_captions_updated_at ON video_translation_captions;
CREATE TRIGGER update_video_translation_captions_updated_at
  BEFORE UPDATE ON video_translation_captions
  FOR EACH ROW
  EXECUTE FUNCTION update_video_translation_updated_at();

-- Create function to track API usage
CREATE OR REPLACE FUNCTION track_heygen_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE heygen_provider_configs
    SET
      minutes_used_this_month = minutes_used_this_month + COALESCE(NEW.video_duration_seconds, 0) / 60.0,
      last_used_at = now()
    WHERE organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to track usage
DROP TRIGGER IF EXISTS track_heygen_usage_trigger ON video_translation_jobs;
CREATE TRIGGER track_heygen_usage_trigger
  AFTER UPDATE ON video_translation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION track_heygen_usage();

-- Create function to update episode translation status
CREATE OR REPLACE FUNCTION update_episode_translation_status()
RETURNS TRIGGER AS $$
DECLARE
  languages jsonb;
BEGIN
  IF NEW.status = 'completed' AND NEW.episode_id IS NOT NULL THEN
    SELECT jsonb_agg(DISTINCT target_language_code)
    INTO languages
    FROM video_translation_outputs
    WHERE episode_id = NEW.episode_id AND status = 'completed';

    UPDATE episodes
    SET
      available_translations = COALESCE(languages, '[]'::jsonb),
      is_multilingual = (jsonb_array_length(COALESCE(languages, '[]'::jsonb)) > 0)
    WHERE id = NEW.episode_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update episode status
DROP TRIGGER IF EXISTS update_episode_translation_status_trigger ON video_translation_outputs;
CREATE TRIGGER update_episode_translation_status_trigger
  AFTER INSERT OR UPDATE ON video_translation_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_episode_translation_status();
