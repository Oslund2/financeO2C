/*
  # Create Workspace Type Configurations

  This migration creates a configuration system for workspace types, defining
  default settings, available features, and UI customizations per type.

  1. New Tables
    - `workspace_type_configs` - Master configuration for each workspace type
      - `workspace_type` (text, primary key)
      - `display_name` (text) - Human readable name
      - `description` (text) - Description of this workspace type
      - `icon_name` (text) - Lucide icon name for UI
      - `primary_color` (text) - Theme color
      - `features` (jsonb) - Feature flags for this workspace type
      - `default_settings` (jsonb) - Default settings applied to new workspaces
      - `video_style_presets` (jsonb) - Video generation style defaults
      - `created_at`, `updated_at` timestamps

  2. Seed Data
    - Claymation (Spelling Bee) configuration
    - Photoreal (History with AI) configuration
    - Documentary configuration
    - General configuration

  3. Security
    - Enable RLS on workspace_type_configs
    - All authenticated users can read configurations
    - Only system admins can modify (protected by is_system_default flag)
*/

-- Create workspace_type_configs table
CREATE TABLE IF NOT EXISTS workspace_type_configs (
  workspace_type text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  icon_name text DEFAULT 'Layers',
  primary_color text DEFAULT '#3B82F6',
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_style_presets jsonb DEFAULT '{}'::jsonb,
  is_system_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE workspace_type_configs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read configurations
CREATE POLICY "Authenticated users can view workspace type configs"
  ON workspace_type_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can also read for public pages
CREATE POLICY "Anonymous users can view workspace type configs"
  ON workspace_type_configs
  FOR SELECT
  TO anon
  USING (true);

-- Only allow updates to non-system configs (for future custom types)
CREATE POLICY "Users cannot modify system configurations"
  ON workspace_type_configs
  FOR UPDATE
  TO authenticated
  USING (is_system_default = false)
  WITH CHECK (is_system_default = false);

-- Seed workspace type configurations
INSERT INTO workspace_type_configs (
  workspace_type,
  display_name,
  description,
  icon_name,
  primary_color,
  features,
  default_settings,
  video_style_presets,
  is_system_default
) VALUES 
(
  'claymation',
  'Claymation Animation',
  'Stop-motion style animation with clay characters, perfect for educational content like Spelling Bee programs.',
  'Palette',
  '#F59E0B',
  '{
    "vocabulary_randomizer": true,
    "historical_fact_checker": false,
    "clay_texture_settings": true,
    "miniature_set_designer": true,
    "character_rig_library": true,
    "spelling_word_integration": true,
    "documentary_narration": false,
    "realistic_environments": false
  }'::jsonb,
  '{
    "video_fps": 12,
    "animation_style": "stop_motion",
    "character_style": "clay_exaggerated",
    "background_style": "miniature_handcrafted",
    "color_palette": "warm_saturated",
    "lighting_style": "soft_diffused"
  }'::jsonb,
  '{
    "motion_blur": false,
    "frame_hold": 2,
    "texture_emphasis": "clay_fingerprints",
    "camera_movement": "subtle_handheld"
  }'::jsonb,
  true
),
(
  'photoreal',
  'Photorealistic',
  'Cinematic photorealistic content, ideal for historical documentaries and realistic storytelling.',
  'Film',
  '#2563EB',
  '{
    "vocabulary_randomizer": false,
    "historical_fact_checker": true,
    "clay_texture_settings": false,
    "miniature_set_designer": false,
    "character_rig_library": false,
    "spelling_word_integration": false,
    "documentary_narration": true,
    "realistic_environments": true,
    "citation_manager": true,
    "period_accuracy_checker": true
  }'::jsonb,
  '{
    "video_fps": 24,
    "animation_style": "cinematic",
    "character_style": "realistic_human",
    "background_style": "historically_accurate",
    "color_palette": "period_appropriate",
    "lighting_style": "natural_cinematic"
  }'::jsonb,
  '{
    "motion_blur": true,
    "depth_of_field": "cinematic",
    "film_grain": "subtle",
    "camera_movement": "smooth_dolly"
  }'::jsonb,
  true
),
(
  'documentary',
  'Documentary',
  'Documentary-style content with interview formats, archival footage integration, and factual presentation.',
  'Video',
  '#059669',
  '{
    "vocabulary_randomizer": false,
    "historical_fact_checker": true,
    "clay_texture_settings": false,
    "miniature_set_designer": false,
    "character_rig_library": false,
    "spelling_word_integration": false,
    "documentary_narration": true,
    "realistic_environments": true,
    "citation_manager": true,
    "interview_format": true,
    "archival_integration": true
  }'::jsonb,
  '{
    "video_fps": 24,
    "animation_style": "documentary",
    "character_style": "realistic_human",
    "background_style": "location_based",
    "color_palette": "natural",
    "lighting_style": "documentary"
  }'::jsonb,
  '{
    "motion_blur": true,
    "depth_of_field": "shallow",
    "film_grain": "documentary",
    "camera_movement": "handheld_stable"
  }'::jsonb,
  true
),
(
  'general',
  'General Purpose',
  'Flexible workspace for various content types without specific style constraints.',
  'Layers',
  '#6366F1',
  '{
    "vocabulary_randomizer": true,
    "historical_fact_checker": true,
    "clay_texture_settings": true,
    "miniature_set_designer": true,
    "character_rig_library": true,
    "spelling_word_integration": true,
    "documentary_narration": true,
    "realistic_environments": true
  }'::jsonb,
  '{
    "video_fps": 24,
    "animation_style": "flexible",
    "character_style": "flexible",
    "background_style": "flexible",
    "color_palette": "flexible",
    "lighting_style": "flexible"
  }'::jsonb,
  '{
    "motion_blur": true,
    "depth_of_field": "standard",
    "film_grain": "none",
    "camera_movement": "flexible"
  }'::jsonb,
  true
)
ON CONFLICT (workspace_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  primary_color = EXCLUDED.primary_color,
  features = EXCLUDED.features,
  default_settings = EXCLUDED.default_settings,
  video_style_presets = EXCLUDED.video_style_presets,
  is_system_default = EXCLUDED.is_system_default,
  updated_at = now();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_workspace_type_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_type_configs_updated_at ON workspace_type_configs;
CREATE TRIGGER workspace_type_configs_updated_at
  BEFORE UPDATE ON workspace_type_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_type_configs_updated_at();

-- Helper function to get features for a workspace type
CREATE OR REPLACE FUNCTION get_workspace_features(p_workspace_type text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT features FROM workspace_type_configs WHERE workspace_type = p_workspace_type),
    '{}'::jsonb
  );
$$;

-- Helper function to check if a feature is enabled for a workspace type
CREATE OR REPLACE FUNCTION is_feature_enabled(p_workspace_type text, p_feature_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (features->>p_feature_name)::boolean 
     FROM workspace_type_configs 
     WHERE workspace_type = p_workspace_type),
    false
  );
$$;

-- Add comments for documentation
COMMENT ON TABLE workspace_type_configs IS 
  'Configuration table defining features, settings, and UI customizations for each workspace type';

COMMENT ON FUNCTION get_workspace_features IS 
  'Returns the feature flags jsonb for a given workspace type';

COMMENT ON FUNCTION is_feature_enabled IS 
  'Checks if a specific feature is enabled for a workspace type';
