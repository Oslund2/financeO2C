/*
  # Create Script Translation System

  1. New Tables
    - `script_translations`
      - `id` (uuid, primary key)
      - `script_id` (uuid, foreign key to scripts)
      - `language_code` (text) - ISO 639-1 language code (e.g., 'hi', 'es', 'zh')
      - `language_name` (text) - Full language name for display
      - `translated_title` (text) - Translated script title
      - `translated_synopsis` (text, nullable) - Translated synopsis
      - `translated_theme` (text, nullable) - Translated theme
      - `status` (text) - Translation status: 'pending', 'in_progress', 'completed', 'failed'
      - `progress_percentage` (integer) - Progress from 0-100
      - `error_message` (text, nullable) - Error details if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `script_act_translations`
      - `id` (uuid, primary key)
      - `act_id` (uuid, foreign key to script_acts)
      - `language_code` (text)
      - `translated_content` (text) - Translated act content
      - `translated_notes` (text, nullable) - Translated notes
      - `created_at` (timestamptz)
      
    - `script_scene_translations`
      - `id` (uuid, primary key)
      - `scene_id` (uuid, foreign key to script_scenes)
      - `language_code` (text)
      - `translated_setting` (text) - Translated setting/location
      - `translated_description` (text) - Translated scene description
      - `translated_dialogue` (jsonb) - Translated dialogue JSON
      - `translated_stage_directions` (text, nullable) - Translated stage directions
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage translations
    
  3. Indexes
    - Add indexes for efficient lookups by script_id and language_code
    - Add indexes for act_id and scene_id lookups
*/

-- Create script_translations table
CREATE TABLE IF NOT EXISTS script_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  language_name text NOT NULL,
  translated_title text NOT NULL,
  translated_synopsis text,
  translated_theme text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(script_id, language_code)
);

-- Create script_act_translations table
CREATE TABLE IF NOT EXISTS script_act_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id uuid NOT NULL REFERENCES script_acts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  translated_content text NOT NULL,
  translated_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(act_id, language_code)
);

-- Create script_scene_translations table
CREATE TABLE IF NOT EXISTS script_scene_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES script_scenes(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  translated_setting text NOT NULL,
  translated_description text NOT NULL,
  translated_dialogue jsonb DEFAULT '[]'::jsonb,
  translated_stage_directions text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(scene_id, language_code)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_script_translations_script_id ON script_translations(script_id);
CREATE INDEX IF NOT EXISTS idx_script_translations_language ON script_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_script_translations_status ON script_translations(status);

CREATE INDEX IF NOT EXISTS idx_script_act_translations_act_id ON script_act_translations(act_id);
CREATE INDEX IF NOT EXISTS idx_script_act_translations_language ON script_act_translations(language_code);

CREATE INDEX IF NOT EXISTS idx_script_scene_translations_scene_id ON script_scene_translations(scene_id);
CREATE INDEX IF NOT EXISTS idx_script_scene_translations_language ON script_scene_translations(language_code);

-- Enable Row Level Security
ALTER TABLE script_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_act_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_scene_translations ENABLE ROW LEVEL SECURITY;

-- Policies for script_translations
CREATE POLICY "Anyone can view script translations"
  ON script_translations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert script translations"
  ON script_translations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update script translations"
  ON script_translations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete script translations"
  ON script_translations FOR DELETE
  TO anon, authenticated
  USING (true);

-- Policies for script_act_translations
CREATE POLICY "Anyone can view act translations"
  ON script_act_translations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert act translations"
  ON script_act_translations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update act translations"
  ON script_act_translations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete act translations"
  ON script_act_translations FOR DELETE
  TO anon, authenticated
  USING (true);

-- Policies for script_scene_translations
CREATE POLICY "Anyone can view scene translations"
  ON script_scene_translations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert scene translations"
  ON script_scene_translations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update scene translations"
  ON script_scene_translations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete scene translations"
  ON script_scene_translations FOR DELETE
  TO anon, authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_script_translation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_script_translations_updated_at ON script_translations;
CREATE TRIGGER update_script_translations_updated_at
  BEFORE UPDATE ON script_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_script_translation_updated_at();