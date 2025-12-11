/*
  # Create Vertex AI Veo 3.1 Production System

  1. New Tables
    - `production_shot_plans`
      - Complete shot breakdown for episodes optimized for Veo 3.1
      - Includes 4/6/8 second duration options, camera details, Veo 3.1 parameters

    - `production_shot_prompts`
      - Veo 3.1-optimized prompts for each shot
      - Includes character/location references, negative prompts, Cloud Storage URIs

    - `production_batches`
      - Batch organization for Vertex AI rendering
      - Speed Mode and Narrative Mode support with Veo 3.1 configuration

    - `character_consistency_profiles`
      - Canonical character descriptions and reference images
      - Cloud Storage URIs for Veo 3.1 image-to-video generation

    - `location_consistency_profiles`
      - Standardized location descriptions and visual specifications
      - Time-of-day variants and lighting rules

    - `vertex_ai_rendering_jobs`
      - Tracks individual Vertex AI API calls and rendering jobs
      - Stores Cloud Storage URIs and variation management

    - `shot_rendering_results`
      - Individual variation results (1-4 per shot)
      - Quality scoring and selection tracking

  2. Important Notes
    - Optimized for Veo 3.1 in Vertex AI with Cloud Storage integration
    - Supports 4, 6, and 8 second shot durations
    - Handles 1-4 variations per shot for quality selection
    - Tracks consistency across characters, locations, and episodes
    - Full cost tracking at $0.75/second for Veo 3.1 with audio

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users with organization context
*/

-- Production Shot Plans (optimized for Veo 3.1)
CREATE TABLE IF NOT EXISTS production_shot_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  act_number integer NOT NULL,
  scene_number integer NOT NULL,
  shot_number integer NOT NULL,
  shot_type text DEFAULT 'medium_shot',
  camera_angle text DEFAULT 'eye_level',
  camera_movement text DEFAULT 'static',
  duration_seconds integer NOT NULL CHECK (duration_seconds IN (4, 6, 8)),
  narrative_description text,
  technical_description text,
  characters text[] DEFAULT '{}',
  location text,
  props text[] DEFAULT '{}',
  batch_id uuid,
  rendering_order integer,
  veo3_parameters jsonb DEFAULT '{
    "aspectRatio": "16:9",
    "resolution": "1080p",
    "sampleCount": 2,
    "generateAudio": true,
    "seed": null
  }'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'rendering', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Production Shot Prompts (Veo 3.1 optimized)
CREATE TABLE IF NOT EXISTS production_shot_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_plan_id uuid REFERENCES production_shot_plans(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  veo3_prompt_text text NOT NULL,
  negative_prompt text,
  style_directives text,
  character_references text[] DEFAULT '{}',
  location_reference text,
  audio_cues text,
  reference_image_uri text,
  generation_parameters jsonb DEFAULT '{}'::jsonb,
  prompt_version integer DEFAULT 1,
  validated boolean DEFAULT false,
  validation_errors text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Production Batches
CREATE TABLE IF NOT EXISTS production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  batch_number integer NOT NULL,
  batch_name text NOT NULL,
  batch_type text DEFAULT 'narrative' CHECK (batch_type IN ('speed', 'narrative', 'hybrid')),
  shot_count integer DEFAULT 0,
  api_call_count integer DEFAULT 0,
  estimated_duration_minutes numeric DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  veo3_config jsonb DEFAULT '{
    "aspectRatio": "16:9",
    "resolution": "1080p",
    "sampleCount": 2,
    "generateAudio": true
  }'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'completed', 'failed', 'paused')),
  priority_order integer DEFAULT 0,
  vertex_ai_quota_reserved integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Character Consistency Profiles
CREATE TABLE IF NOT EXISTS character_consistency_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  canonical_description text NOT NULL,
  reference_image_cloud_storage_uris text[] DEFAULT '{}',
  reference_image_signed_urls text[] DEFAULT '{}',
  appearance_rules jsonb DEFAULT '{}'::jsonb,
  veo3_character_prompt_template text,
  consistency_score numeric DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  usage_count integer DEFAULT 0,
  success_rate numeric DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
  first_appearance_episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Location Consistency Profiles
CREATE TABLE IF NOT EXISTS location_consistency_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  canonical_description text NOT NULL,
  reference_image_cloud_storage_uris text[] DEFAULT '{}',
  reference_image_signed_urls text[] DEFAULT '{}',
  time_of_day_variants jsonb DEFAULT '{
    "morning": "",
    "afternoon": "",
    "evening": "",
    "night": ""
  }'::jsonb,
  lighting_specifications jsonb DEFAULT '{}'::jsonb,
  veo3_location_prompt_template text,
  usage_count integer DEFAULT 0,
  consistency_score numeric DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vertex AI Rendering Jobs
CREATE TABLE IF NOT EXISTS vertex_ai_rendering_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_plan_id uuid REFERENCES production_shot_plans(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES production_batches(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  vertex_ai_job_id text,
  vertex_ai_operation_name text,
  model_version text DEFAULT 'veo-3.1-generate-001',
  request_payload jsonb DEFAULT '{}'::jsonb,
  cloud_storage_output_uri text,
  variations_count integer DEFAULT 2 CHECK (variations_count >= 1 AND variations_count <= 4),
  selected_variation_number integer CHECK (selected_variation_number >= 1 AND selected_variation_number <= 4),
  render_start_time timestamptz,
  render_completion_time timestamptz,
  render_duration_seconds integer,
  render_cost numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'rendering', 'completed', 'failed', 'cancelled')),
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shot Rendering Results (individual variations)
CREATE TABLE IF NOT EXISTS shot_rendering_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_plan_id uuid REFERENCES production_shot_plans(id) ON DELETE CASCADE,
  rendering_job_id uuid REFERENCES vertex_ai_rendering_jobs(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  variation_number integer NOT NULL CHECK (variation_number >= 1 AND variation_number <= 4),
  video_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  cloud_storage_uri text NOT NULL,
  signed_url text,
  signed_url_expires_at timestamptz,
  video_duration_seconds numeric,
  video_resolution text,
  video_file_size_mb numeric,
  quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 100),
  consistency_score numeric CHECK (consistency_score >= 0 AND consistency_score <= 100),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  selected_as_final boolean DEFAULT false,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shot_plans_episode ON production_shot_plans(episode_id);
CREATE INDEX IF NOT EXISTS idx_shot_plans_series ON production_shot_plans(series_id);
CREATE INDEX IF NOT EXISTS idx_shot_plans_org ON production_shot_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_shot_plans_batch ON production_shot_plans(batch_id);
CREATE INDEX IF NOT EXISTS idx_shot_plans_status ON production_shot_plans(status);

CREATE INDEX IF NOT EXISTS idx_shot_prompts_plan ON production_shot_prompts(shot_plan_id);
CREATE INDEX IF NOT EXISTS idx_shot_prompts_org ON production_shot_prompts(organization_id);

CREATE INDEX IF NOT EXISTS idx_batches_episode ON production_batches(episode_id);
CREATE INDEX IF NOT EXISTS idx_batches_series ON production_batches(series_id);
CREATE INDEX IF NOT EXISTS idx_batches_org ON production_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON production_batches(status);

CREATE INDEX IF NOT EXISTS idx_character_profiles_char ON character_consistency_profiles(character_id);
CREATE INDEX IF NOT EXISTS idx_character_profiles_series ON character_consistency_profiles(series_id);
CREATE INDEX IF NOT EXISTS idx_character_profiles_org ON character_consistency_profiles(organization_id);

CREATE INDEX IF NOT EXISTS idx_location_profiles_series ON location_consistency_profiles(series_id);
CREATE INDEX IF NOT EXISTS idx_location_profiles_org ON location_consistency_profiles(organization_id);

CREATE INDEX IF NOT EXISTS idx_rendering_jobs_shot ON vertex_ai_rendering_jobs(shot_plan_id);
CREATE INDEX IF NOT EXISTS idx_rendering_jobs_batch ON vertex_ai_rendering_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_rendering_jobs_org ON vertex_ai_rendering_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_rendering_jobs_status ON vertex_ai_rendering_jobs(status);

CREATE INDEX IF NOT EXISTS idx_rendering_results_shot ON shot_rendering_results(shot_plan_id);
CREATE INDEX IF NOT EXISTS idx_rendering_results_job ON shot_rendering_results(rendering_job_id);
CREATE INDEX IF NOT EXISTS idx_rendering_results_org ON shot_rendering_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_rendering_results_approval ON shot_rendering_results(approval_status);

-- Enable RLS
ALTER TABLE production_shot_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_shot_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_consistency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_consistency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertex_ai_rendering_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_rendering_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for production_shot_plans
CREATE POLICY "Users can view shot plans in their organization"
  ON production_shot_plans FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert shot plans in their organization"
  ON production_shot_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shot plans in their organization"
  ON production_shot_plans FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shot plans in their organization"
  ON production_shot_plans FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for production_shot_prompts
CREATE POLICY "Users can view prompts in their organization"
  ON production_shot_prompts FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert prompts in their organization"
  ON production_shot_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update prompts in their organization"
  ON production_shot_prompts FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete prompts in their organization"
  ON production_shot_prompts FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for production_batches
CREATE POLICY "Users can view batches in their organization"
  ON production_batches FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert batches in their organization"
  ON production_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update batches in their organization"
  ON production_batches FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete batches in their organization"
  ON production_batches FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for character_consistency_profiles
CREATE POLICY "Users can view character profiles in their organization"
  ON character_consistency_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert character profiles in their organization"
  ON character_consistency_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update character profiles in their organization"
  ON character_consistency_profiles FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete character profiles in their organization"
  ON character_consistency_profiles FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for location_consistency_profiles
CREATE POLICY "Users can view location profiles in their organization"
  ON location_consistency_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert location profiles in their organization"
  ON location_consistency_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update location profiles in their organization"
  ON location_consistency_profiles FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete location profiles in their organization"
  ON location_consistency_profiles FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for vertex_ai_rendering_jobs
CREATE POLICY "Users can view rendering jobs in their organization"
  ON vertex_ai_rendering_jobs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rendering jobs in their organization"
  ON vertex_ai_rendering_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rendering jobs in their organization"
  ON vertex_ai_rendering_jobs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rendering jobs in their organization"
  ON vertex_ai_rendering_jobs FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for shot_rendering_results
CREATE POLICY "Users can view rendering results in their organization"
  ON shot_rendering_results FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rendering results in their organization"
  ON shot_rendering_results FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rendering results in their organization"
  ON shot_rendering_results FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rendering results in their organization"
  ON shot_rendering_results FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_production_shot_plans_updated_at
  BEFORE UPDATE ON production_shot_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_shot_prompts_updated_at
  BEFORE UPDATE ON production_shot_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_batches_updated_at
  BEFORE UPDATE ON production_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_character_consistency_profiles_updated_at
  BEFORE UPDATE ON character_consistency_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_consistency_profiles_updated_at
  BEFORE UPDATE ON location_consistency_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vertex_ai_rendering_jobs_updated_at
  BEFORE UPDATE ON vertex_ai_rendering_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shot_rendering_results_updated_at
  BEFORE UPDATE ON shot_rendering_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
