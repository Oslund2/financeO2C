/*
  # Revenue Tracking Enhancements

  1. New Tables
    - `episode_revenue_config`
      - `id` (uuid, primary key)
      - `episode_id` (uuid, references episodes)
      - `annual_runs` (integer, default 4)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `product_placement_sponsors`
      - `id` (uuid, primary key)
      - `episode_id` (uuid, references episodes, nullable for show-level)
      - `sponsor_name` (text)
      - `sponsor_cost` (numeric, default 1000)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `distribution_channels`
      - `id` (uuid, primary key)
      - `channel_name` (text)
      - `channel_type` (text)
      - `rate_per_spot` (numeric, default 500)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
    
    - `language_versions`
      - `id` (uuid, primary key)
      - `language_code` (text)
      - `language_name` (text)
      - `is_default` (boolean, default false)
      - `dubbing_cost_per_episode` (numeric, default 2000)
      - `is_enabled` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (for now, can be restricted later)
  
  3. Initial Data
    - Insert default distribution channels
    - Insert 10 most-spoken languages with English as default
*/

-- Create episode revenue configuration table
CREATE TABLE IF NOT EXISTS episode_revenue_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  annual_runs integer DEFAULT 4 NOT NULL CHECK (annual_runs >= 1 AND annual_runs <= 52),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(episode_id)
);

ALTER TABLE episode_revenue_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view episode revenue config"
  ON episode_revenue_config FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert episode revenue config"
  ON episode_revenue_config FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update episode revenue config"
  ON episode_revenue_config FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete episode revenue config"
  ON episode_revenue_config FOR DELETE
  USING (true);

-- Create product placement sponsors table
CREATE TABLE IF NOT EXISTS product_placement_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  sponsor_cost numeric DEFAULT 1000 NOT NULL CHECK (sponsor_cost >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_placement_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sponsors"
  ON product_placement_sponsors FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sponsors"
  ON product_placement_sponsors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sponsors"
  ON product_placement_sponsors FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete sponsors"
  ON product_placement_sponsors FOR DELETE
  USING (true);

-- Create distribution channels table
CREATE TABLE IF NOT EXISTS distribution_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name text NOT NULL UNIQUE,
  channel_type text NOT NULL,
  rate_per_spot numeric DEFAULT 500 NOT NULL CHECK (rate_per_spot >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE distribution_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view channels"
  ON distribution_channels FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert channels"
  ON distribution_channels FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update channels"
  ON distribution_channels FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete channels"
  ON distribution_channels FOR DELETE
  USING (true);

-- Create language versions table
CREATE TABLE IF NOT EXISTS language_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL UNIQUE,
  language_name text NOT NULL,
  is_default boolean DEFAULT false,
  dubbing_cost_per_episode numeric DEFAULT 2000 NOT NULL CHECK (dubbing_cost_per_episode >= 0),
  is_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE language_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view languages"
  ON language_versions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert languages"
  ON language_versions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update languages"
  ON language_versions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete languages"
  ON language_versions FOR DELETE
  USING (true);

-- Insert default distribution channels
INSERT INTO distribution_channels (channel_name, channel_type, rate_per_spot, is_active)
VALUES 
  ('O&O TV', 'television', 500, true),
  ('O&O Streaming', 'streaming', 400, true),
  ('Social (YouTube)', 'social', 300, true),
  ('Tablo Kids', 'streaming', 350, true)
ON CONFLICT (channel_name) DO NOTHING;

-- Insert 10 most-spoken languages
INSERT INTO language_versions (language_code, language_name, is_default, dubbing_cost_per_episode, is_enabled)
VALUES 
  ('en', 'English', true, 0, true),
  ('es', 'Spanish (Español)', false, 2000, false),
  ('zh', 'Mandarin Chinese (中文)', false, 2500, false),
  ('hi', 'Hindi (हिन्दी)', false, 2000, false),
  ('ar', 'Arabic (العربية)', false, 2500, false),
  ('pt', 'Portuguese (Português)', false, 2000, false),
  ('bn', 'Bengali (বাংলা)', false, 2000, false),
  ('fr', 'French (Français)', false, 2000, false),
  ('ru', 'Russian (Русский)', false, 2000, false),
  ('ja', 'Japanese (日本語)', false, 2500, false)
ON CONFLICT (language_code) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_episode_revenue_config_episode_id ON episode_revenue_config(episode_id);
CREATE INDEX IF NOT EXISTS idx_product_placement_sponsors_episode_id ON product_placement_sponsors(episode_id);
CREATE INDEX IF NOT EXISTS idx_distribution_channels_active ON distribution_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_language_versions_enabled ON language_versions(is_enabled);