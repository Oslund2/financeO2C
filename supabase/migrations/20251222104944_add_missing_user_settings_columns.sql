/*
  # Add Missing User Settings Columns

  1. Changes
    - Add `voice_preferences` (jsonb) - Voice generation settings (stability, speed, provider)
    - Add `video_preferences` (jsonb) - Video generation settings (resolution, aspect ratio, duration)
    - Add `translation_preferences` (jsonb) - Script translation settings
    - Add `patent_preferences` (jsonb) - Patent analysis settings
    - Add `vertex_ai_config` (jsonb) - Vertex AI configuration (project, location, bucket)

  2. Notes
    - These columns were expected by the application but never added to the database
    - All columns use JSONB with sensible default values
    - Existing rows will get default values automatically
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'voice_preferences'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN voice_preferences jsonb DEFAULT '{
      "stability": 0.5,
      "similarity_boost": 0.75,
      "speed": 1.0,
      "default_provider": "elevenlabs"
    }'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'video_preferences'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN video_preferences jsonb DEFAULT '{
      "default_resolution": "1080p",
      "default_aspect_ratio": "16:9",
      "default_duration": 8,
      "sample_count": 1,
      "generate_audio": false,
      "no_music": true
    }'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'translation_preferences'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN translation_preferences jsonb DEFAULT '{
      "default_languages": [],
      "auto_translate": false,
      "preserve_timing": true
    }'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'patent_preferences'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN patent_preferences jsonb DEFAULT '{
      "auto_prior_art_search": true,
      "prior_art_timeout": 30000,
      "include_default_patents": true,
      "analysis_target": "both"
    }'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'vertex_ai_config'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN vertex_ai_config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

UPDATE user_settings
SET 
  voice_preferences = COALESCE(voice_preferences, '{
    "stability": 0.5,
    "similarity_boost": 0.75,
    "speed": 1.0,
    "default_provider": "elevenlabs"
  }'::jsonb),
  video_preferences = COALESCE(video_preferences, '{
    "default_resolution": "1080p",
    "default_aspect_ratio": "16:9",
    "default_duration": 8,
    "sample_count": 1,
    "generate_audio": false,
    "no_music": true
  }'::jsonb),
  translation_preferences = COALESCE(translation_preferences, '{
    "default_languages": [],
    "auto_translate": false,
    "preserve_timing": true
  }'::jsonb),
  patent_preferences = COALESCE(patent_preferences, '{
    "auto_prior_art_search": true,
    "prior_art_timeout": 30000,
    "include_default_patents": true,
    "analysis_target": "both"
  }'::jsonb),
  vertex_ai_config = COALESCE(vertex_ai_config, '{}'::jsonb)
WHERE voice_preferences IS NULL 
   OR video_preferences IS NULL 
   OR translation_preferences IS NULL 
   OR patent_preferences IS NULL 
   OR vertex_ai_config IS NULL;