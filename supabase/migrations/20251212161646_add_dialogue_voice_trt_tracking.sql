/*
  # Dialogue, Voice, and TRT Tracking Enhancement

  ## Overview
  This migration adds comprehensive support for dialogue tracking, voice assignments,
  TRT (Total Run Time) management, and shot list export tracking for Veo 3 production.

  ## Changes

  ### 1. production_shot_plans Enhancements
    - Add `dialogue_content` (jsonb): Stores dialogue lines with character names and timing
    - Add `audio_directives` (text): Specific audio instructions like "NO MUSIC, dialogue only"
    - Add `nat_sound_description` (text): Natural sound effects description
    - Add `sting_in_duration` (numeric): Opening sting duration in seconds
    - Add `sting_out_duration` (numeric): Closing sting duration in seconds

  ### 2. episodes Enhancements
    - Add `trt_metadata` (jsonb): Stores TRT breakdown (content, opening, closing)
    - Add `target_runtime_seconds` (integer): Target episode length (default 1320 for 22 min)
    - Add `actual_runtime_seconds` (integer): Calculated total from all shots

  ### 3. characters Voice Lock
    - Characters already have `voice_provider` and voice IDs from previous migration
    - Add index for efficient voice lookups
    - Add comment clarifying voice assignments are locked per character

  ### 4. shot_exports Table
    - Tracks export history for shot lists
    - Stores export format, filters, and download metadata
    - Links to episodes or series

  ### 5. production_shot_prompts Enhancements
    - Add `dialogue_cues` (jsonb): Character dialogue with voice provider info
    - Add `audio_cues` (text): Nat sound and audio direction for Veo 3

  ## Security
    - RLS enabled on new tables
    - Authenticated users have full access

  ## Notes
    - Voice assignments are locked at character level for consistency
    - TRT target is 22 minutes: 60s opening + 1230s content + 30s closing
    - NO MUSIC directive automatically added to all Veo 3 prompts
*/

-- Enhance production_shot_plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'dialogue_content'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN dialogue_content jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'audio_directives'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN audio_directives text DEFAULT 'NO MUSIC. Dialogue and natural sound effects only.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'nat_sound_description'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN nat_sound_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'sting_in_duration'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN sting_in_duration numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_plans' AND column_name = 'sting_out_duration'
  ) THEN
    ALTER TABLE production_shot_plans ADD COLUMN sting_out_duration numeric(5,2) DEFAULT 0;
  END IF;
END $$;

-- Enhance episodes table for TRT tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'trt_metadata'
  ) THEN
    ALTER TABLE episodes ADD COLUMN trt_metadata jsonb DEFAULT '{"opening_sting": 60, "content": 1230, "closing_sting": 30}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'target_runtime_seconds'
  ) THEN
    ALTER TABLE episodes ADD COLUMN target_runtime_seconds integer DEFAULT 1320;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'actual_runtime_seconds'
  ) THEN
    ALTER TABLE episodes ADD COLUMN actual_runtime_seconds integer DEFAULT 0;
  END IF;
END $$;

-- Enhance production_shot_prompts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_prompts' AND column_name = 'dialogue_cues'
  ) THEN
    ALTER TABLE production_shot_prompts ADD COLUMN dialogue_cues jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_shot_prompts' AND column_name = 'audio_cues'
  ) THEN
    ALTER TABLE production_shot_prompts ADD COLUMN audio_cues text DEFAULT 'NO MUSIC. Dialogue and natural sound effects only.';
  END IF;
END $$;

-- Create shot_exports table
CREATE TABLE IF NOT EXISTS shot_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  export_format text NOT NULL CHECK (export_format IN ('csv', 'excel', 'pdf', 'json')),
  export_name text NOT NULL,
  file_url text,
  filters jsonb DEFAULT '{}',
  include_reference_images boolean DEFAULT true,
  shot_count integer DEFAULT 0,
  file_size_bytes integer,
  metadata jsonb DEFAULT '{}',
  exported_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shot_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shot exports in their organization"
  ON shot_exports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shot exports in their organization"
  ON shot_exports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shot exports in their organization"
  ON shot_exports FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_shot_plans_dialogue ON production_shot_plans USING gin(dialogue_content);
CREATE INDEX IF NOT EXISTS idx_episodes_trt_metadata ON episodes USING gin(trt_metadata);
CREATE INDEX IF NOT EXISTS idx_shot_exports_episode_id ON shot_exports(episode_id);
CREATE INDEX IF NOT EXISTS idx_shot_exports_series_id ON shot_exports(series_id);
CREATE INDEX IF NOT EXISTS idx_shot_exports_organization_id ON shot_exports(organization_id);
CREATE INDEX IF NOT EXISTS idx_shot_exports_format ON shot_exports(export_format);

-- Add helpful comments
COMMENT ON COLUMN characters.voice_provider IS 'Voice provider locked per character for consistency across all episodes';
COMMENT ON COLUMN characters.eleven_labs_voice_id IS 'ElevenLabs voice ID - locked per character';
COMMENT ON COLUMN characters.chatterbox_voice_id IS 'Chatterbox voice ID - locked per character';
COMMENT ON COLUMN production_shot_plans.dialogue_content IS 'Dialogue lines with character names, text, and timing data';
COMMENT ON COLUMN production_shot_plans.audio_directives IS 'Audio instructions for Veo 3, includes NO MUSIC directive';
COMMENT ON COLUMN episodes.trt_metadata IS 'TRT breakdown: opening_sting (60s), content (1230s), closing_sting (30s)';
COMMENT ON COLUMN episodes.target_runtime_seconds IS 'Target episode runtime: 1320 seconds (22 minutes)';
COMMENT ON TABLE shot_exports IS 'Tracks shot list exports with formats: CSV, Excel, PDF, JSON';
