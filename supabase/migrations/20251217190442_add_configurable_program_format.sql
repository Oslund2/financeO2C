/*
  # Add Configurable Program Format System

  ## Overview
  This migration adds comprehensive format configuration support for episodes, allowing
  configurable program lengths, break structures, and timing for different distribution
  channels (broadcast, streaming, YouTube, etc.).

  ## Changes

  ### 1. Series Table Enhancements
  - `program_length_minutes` - Default content duration (22 minutes)
  - `total_episode_minutes` - Default total episode slot (30 minutes)
  - `break_structure` - Default break configuration (JSONB)
    - segment_count: Number of content segments
    - break_positions: Array of break timecodes
    - break_durations: Array of break durations in seconds
    - break_types: Array of break types (commercial, chapter, end)

  ### 2. Scripts Table Enhancements
  - `program_length_minutes` - Override series default (nullable)
  - `total_episode_minutes` - Override series total time (nullable)
  - `break_structure` - Override series break structure (nullable, JSONB)
  - `format_type` - Distribution format preset (enum)
  - Update runtime_minutes interpretation (now means content time)

  ### 3. Format Types
  - broadcast: Traditional TV with commercial breaks (22/30/4-segment)
  - streaming: No breaks continuous content (22/22/1-segment)
  - short_form: YouTube shorts, TikTok (5/5/1-segment)
  - medium_form: Standard YouTube (10-15/10-15/1-2 segments)
  - custom: User-defined configuration

  ### 4. Backward Compatibility
  - All existing series default to 22 min content / 30 min total / 4 segments
  - All existing scripts inherit from series or get implied defaults
  - Episodes preserve format in format_metadata field

  ## Security
  - Maintains existing RLS policies
  - Format configuration accessible to organization members
*/

-- Create format type enum
DO $$ BEGIN
  CREATE TYPE format_type AS ENUM ('broadcast', 'streaming', 'short_form', 'medium_form', 'custom');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add format configuration fields to series table
DO $$
BEGIN
  -- Program length (content duration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'program_length_minutes'
  ) THEN
    ALTER TABLE series ADD COLUMN program_length_minutes integer NOT NULL DEFAULT 22;
    COMMENT ON COLUMN series.program_length_minutes IS 'Default content duration in minutes (scripted content only, excludes breaks)';
  END IF;

  -- Total episode length (including breaks)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'total_episode_minutes'
  ) THEN
    ALTER TABLE series ADD COLUMN total_episode_minutes integer NOT NULL DEFAULT 30;
    COMMENT ON COLUMN series.total_episode_minutes IS 'Default total episode duration in minutes (includes content + breaks)';
  END IF;

  -- Break structure configuration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'series' AND column_name = 'break_structure'
  ) THEN
    ALTER TABLE series ADD COLUMN break_structure jsonb DEFAULT jsonb_build_object(
      'segment_count', 4,
      'break_positions', jsonb_build_array('00:05:30', '00:11:00', '00:16:30'),
      'break_durations', jsonb_build_array(120, 120, 120),
      'break_types', jsonb_build_array('commercial', 'commercial', 'commercial'),
      'end_break_duration', 120
    );
    COMMENT ON COLUMN series.break_structure IS 'Default break structure configuration (JSONB: segment_count, break_positions, break_durations, break_types)';
  END IF;
END $$;

-- Add format configuration fields to scripts table
DO $$
BEGIN
  -- Program length override
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'program_length_minutes'
  ) THEN
    ALTER TABLE scripts ADD COLUMN program_length_minutes integer;
    COMMENT ON COLUMN scripts.program_length_minutes IS 'Content duration override (null = inherit from series)';
  END IF;

  -- Total episode length override
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'total_episode_minutes'
  ) THEN
    ALTER TABLE scripts ADD COLUMN total_episode_minutes integer;
    COMMENT ON COLUMN scripts.total_episode_minutes IS 'Total episode duration override (null = inherit from series)';
  END IF;

  -- Break structure override
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'break_structure'
  ) THEN
    ALTER TABLE scripts ADD COLUMN break_structure jsonb;
    COMMENT ON COLUMN scripts.break_structure IS 'Break structure override (null = inherit from series)';
  END IF;

  -- Format type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'format_type'
  ) THEN
    ALTER TABLE scripts ADD COLUMN format_type format_type DEFAULT 'broadcast';
    COMMENT ON COLUMN scripts.format_type IS 'Distribution format preset (broadcast, streaming, short_form, medium_form, custom)';
  END IF;
END $$;

-- Add validation constraints
DO $$
BEGIN
  -- Ensure program length is positive
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'series_program_length_positive'
  ) THEN
    ALTER TABLE series ADD CONSTRAINT series_program_length_positive
      CHECK (program_length_minutes > 0 AND program_length_minutes <= 180);
  END IF;

  -- Ensure total episode length is at least program length
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'series_total_length_valid'
  ) THEN
    ALTER TABLE series ADD CONSTRAINT series_total_length_valid
      CHECK (total_episode_minutes >= program_length_minutes);
  END IF;

  -- Same constraints for scripts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scripts_program_length_positive'
  ) THEN
    ALTER TABLE scripts ADD CONSTRAINT scripts_program_length_positive
      CHECK (program_length_minutes IS NULL OR (program_length_minutes > 0 AND program_length_minutes <= 180));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scripts_total_length_valid'
  ) THEN
    ALTER TABLE scripts ADD CONSTRAINT scripts_total_length_valid
      CHECK (total_episode_minutes IS NULL OR program_length_minutes IS NULL OR total_episode_minutes >= program_length_minutes);
  END IF;
END $$;

-- Create helper function to get effective format configuration for a script
CREATE OR REPLACE FUNCTION get_script_format_config(script_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
  script_record RECORD;
  series_record RECORD;
BEGIN
  -- Get script and series data
  SELECT
    s.*,
    se.program_length_minutes as series_program_length,
    se.total_episode_minutes as series_total_length,
    se.break_structure as series_break_structure
  INTO script_record
  FROM scripts s
  JOIN series se ON s.series_id = se.id
  WHERE s.id = script_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Build effective configuration (script overrides series)
  result := jsonb_build_object(
    'program_length_minutes', COALESCE(script_record.program_length_minutes, script_record.series_program_length, 22),
    'total_episode_minutes', COALESCE(script_record.total_episode_minutes, script_record.series_total_length, 30),
    'break_structure', COALESCE(script_record.break_structure, script_record.series_break_structure,
      jsonb_build_object(
        'segment_count', 4,
        'break_positions', jsonb_build_array('00:05:30', '00:11:00', '00:16:30'),
        'break_durations', jsonb_build_array(120, 120, 120),
        'break_types', jsonb_build_array('commercial', 'commercial', 'commercial'),
        'end_break_duration', 120
      )
    ),
    'format_type', script_record.format_type,
    'content_only_seconds', COALESCE(script_record.program_length_minutes, script_record.series_program_length, 22) * 60,
    'total_seconds', COALESCE(script_record.total_episode_minutes, script_record.series_total_length, 30) * 60
  );

  RETURN result;
END;
$$;

-- Create helper function to calculate break time
CREATE OR REPLACE FUNCTION calculate_total_break_time(break_struct jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  total_seconds integer := 0;
  break_duration integer;
BEGIN
  -- Sum all break durations
  IF break_struct ? 'break_durations' THEN
    FOR break_duration IN
      SELECT jsonb_array_elements_text(break_struct->'break_durations')::integer
    LOOP
      total_seconds := total_seconds + break_duration;
    END LOOP;
  END IF;

  -- Add end break if present
  IF break_struct ? 'end_break_duration' THEN
    total_seconds := total_seconds + (break_struct->>'end_break_duration')::integer;
  END IF;

  RETURN total_seconds;
END;
$$;

-- Backfill existing series with default format configuration
UPDATE series
SET
  program_length_minutes = 22,
  total_episode_minutes = 30,
  break_structure = jsonb_build_object(
    'segment_count', 4,
    'break_positions', jsonb_build_array('00:05:30', '00:11:00', '00:16:30'),
    'break_durations', jsonb_build_array(120, 120, 120),
    'break_types', jsonb_build_array('commercial', 'commercial', 'commercial'),
    'end_break_duration', 120
  )
WHERE program_length_minutes IS NULL OR break_structure IS NULL;

-- Backfill existing scripts with format_type
UPDATE scripts
SET format_type = 'broadcast'
WHERE format_type IS NULL;

-- Create index for format queries
CREATE INDEX IF NOT EXISTS idx_scripts_format_type ON scripts(format_type);
CREATE INDEX IF NOT EXISTS idx_scripts_program_length ON scripts(program_length_minutes) WHERE program_length_minutes IS NOT NULL;

-- Add helpful comments
COMMENT ON FUNCTION get_script_format_config IS 'Returns effective format configuration for a script, including inheritance from series defaults';
COMMENT ON FUNCTION calculate_total_break_time IS 'Calculates total break time in seconds from break_structure JSONB';
