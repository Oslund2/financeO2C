/*
  # Create User Settings Table

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key) - Unique identifier for settings record
      - `user_id` (uuid, nullable) - Optional user reference for future auth
      - `default_series_id` (uuid, nullable) - Default series for quick access
      - `ui_preferences` (jsonb) - UI customization preferences (theme, layout, etc.)
      - `generation_preferences` (jsonb) - Default AI generation settings
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last modification timestamp

  2. Security
    - Enable RLS on `user_settings` table
    - Add policy for anonymous users to manage their own settings
    - Add policy for reading settings

  3. Indexes
    - Index on user_id for faster lookups
    - Index on default_series_id for quick series access

  4. Notes
    - API keys are stored in Bolt Secrets, not in this table
    - Settings are per-user (when auth is added) or global for anonymous access
    - JSONB fields allow flexible storage of various preference types
*/

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  default_series_id uuid REFERENCES series(id) ON DELETE SET NULL,
  ui_preferences jsonb DEFAULT '{}'::jsonb,
  generation_preferences jsonb DEFAULT '{
    "temperature": 0.7,
    "max_tokens": 4000,
    "tone": "educational and entertaining",
    "pacing": "moderate"
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous users to read settings
CREATE POLICY "Anyone can read settings"
  ON user_settings
  FOR SELECT
  USING (true);

-- Policy for anonymous users to insert settings
CREATE POLICY "Anyone can create settings"
  ON user_settings
  FOR INSERT
  WITH CHECK (true);

-- Policy for anonymous users to update settings
CREATE POLICY "Anyone can update settings"
  ON user_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy for anonymous users to delete settings
CREATE POLICY "Anyone can delete settings"
  ON user_settings
  FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_default_series ON user_settings(default_series_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();