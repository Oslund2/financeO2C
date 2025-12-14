/*
  # Create Translation Analytics and Export Tracking System

  1. New Tables
    - `translation_export_history`
      - `id` (uuid, primary key)
      - `script_id` (uuid, foreign key to scripts)
      - `translation_id` (uuid, foreign key to script_translations)
      - `language_code` (text)
      - `export_format` (text) - PDF, DOCX, TXT, JSON, CSV, SRT, VTT
      - `exported_by` (uuid, nullable) - user who exported
      - `exported_at` (timestamptz)
      - `file_size_bytes` (bigint, nullable)
      - `metadata` (jsonb) - additional export options used

    - `translation_analytics`
      - `id` (uuid, primary key)
      - `script_id` (uuid, foreign key to scripts)
      - `translation_id` (uuid, foreign key to script_translations)
      - `language_code` (text)
      - `view_count` (integer) - how many times viewed
      - `download_count` (integer) - total downloads
      - `last_viewed_at` (timestamptz)
      - `last_downloaded_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `language_monetization_projections`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, nullable, foreign key)
      - `script_id` (uuid, foreign key to scripts)
      - `language_code` (text)
      - `language_name` (text)
      - `dubbing_cost` (numeric) - actual or estimated dubbing cost
      - `dubbing_tier` (text) - ai, bulk_professional, premium_professional
      - `projected_annual_revenue` (numeric)
      - `projected_audience_size` (integer)
      - `regional_cpm_rate` (numeric)
      - `market_region` (text) - north_america, latin_america, europe, asia_pacific
      - `payback_period_months` (numeric)
      - `roi_percentage` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `translation_cost_tracking`
      - `id` (uuid, primary key)
      - `script_id` (uuid, foreign key to scripts)
      - `translation_id` (uuid, foreign key to script_translations)
      - `language_code` (text)
      - `estimated_cost` (numeric)
      - `actual_cost` (numeric, nullable)
      - `cost_type` (text) - dubbing, translation_api, voice_talent, studio_time
      - `vendor_name` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Indexes
    - Add indexes for efficient lookups
*/

-- Create translation_export_history table
CREATE TABLE IF NOT EXISTS translation_export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  translation_id uuid NOT NULL REFERENCES script_translations(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  export_format text NOT NULL CHECK (export_format IN ('pdf', 'docx', 'txt', 'json', 'csv', 'srt', 'vtt', 'zip')),
  exported_by uuid,
  exported_at timestamptz DEFAULT now(),
  file_size_bytes bigint,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create translation_analytics table
CREATE TABLE IF NOT EXISTS translation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  translation_id uuid NOT NULL REFERENCES script_translations(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  download_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  last_downloaded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(translation_id)
);

-- Create language_monetization_projections table
CREATE TABLE IF NOT EXISTS language_monetization_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  language_name text NOT NULL,
  dubbing_cost numeric NOT NULL DEFAULT 0,
  dubbing_tier text NOT NULL DEFAULT 'bulk_professional' CHECK (dubbing_tier IN ('ai', 'bulk_professional', 'premium_professional')),
  projected_annual_revenue numeric NOT NULL DEFAULT 0,
  projected_audience_size integer NOT NULL DEFAULT 0,
  regional_cpm_rate numeric NOT NULL DEFAULT 0,
  market_region text NOT NULL DEFAULT 'north_america' CHECK (market_region IN ('north_america', 'latin_america', 'europe', 'asia_pacific', 'middle_east', 'africa')),
  payback_period_months numeric,
  roi_percentage numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(script_id, language_code)
);

-- Create translation_cost_tracking table
CREATE TABLE IF NOT EXISTS translation_cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  translation_id uuid NOT NULL REFERENCES script_translations(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  estimated_cost numeric NOT NULL DEFAULT 0,
  actual_cost numeric,
  cost_type text NOT NULL CHECK (cost_type IN ('dubbing', 'translation_api', 'voice_talent', 'studio_time', 'post_production')),
  vendor_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_export_history_script_id ON translation_export_history(script_id);
CREATE INDEX IF NOT EXISTS idx_export_history_translation_id ON translation_export_history(translation_id);
CREATE INDEX IF NOT EXISTS idx_export_history_language ON translation_export_history(language_code);
CREATE INDEX IF NOT EXISTS idx_export_history_format ON translation_export_history(export_format);
CREATE INDEX IF NOT EXISTS idx_export_history_date ON translation_export_history(exported_at);

CREATE INDEX IF NOT EXISTS idx_analytics_script_id ON translation_analytics(script_id);
CREATE INDEX IF NOT EXISTS idx_analytics_translation_id ON translation_analytics(translation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_language ON translation_analytics(language_code);

CREATE INDEX IF NOT EXISTS idx_monetization_script_id ON language_monetization_projections(script_id);
CREATE INDEX IF NOT EXISTS idx_monetization_org_id ON language_monetization_projections(organization_id);
CREATE INDEX IF NOT EXISTS idx_monetization_language ON language_monetization_projections(language_code);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_script_id ON translation_cost_tracking(script_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_translation_id ON translation_cost_tracking(translation_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_language ON translation_cost_tracking(language_code);

-- Enable Row Level Security
ALTER TABLE translation_export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_monetization_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cost_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for translation_export_history
CREATE POLICY "Anyone can view export history"
  ON translation_export_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert export history"
  ON translation_export_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policies for translation_analytics
CREATE POLICY "Anyone can view analytics"
  ON translation_analytics FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert analytics"
  ON translation_analytics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update analytics"
  ON translation_analytics FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for language_monetization_projections
CREATE POLICY "Anyone can view monetization projections"
  ON language_monetization_projections FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert monetization projections"
  ON language_monetization_projections FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update monetization projections"
  ON language_monetization_projections FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete monetization projections"
  ON language_monetization_projections FOR DELETE
  TO anon, authenticated
  USING (true);

-- Policies for translation_cost_tracking
CREATE POLICY "Anyone can view cost tracking"
  ON translation_cost_tracking FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert cost tracking"
  ON translation_cost_tracking FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update cost tracking"
  ON translation_cost_tracking FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_translation_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_analytics_updated_at ON translation_analytics;
CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON translation_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_analytics_updated_at();

DROP TRIGGER IF EXISTS update_monetization_updated_at ON language_monetization_projections;
CREATE TRIGGER update_monetization_updated_at
  BEFORE UPDATE ON language_monetization_projections
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_analytics_updated_at();

DROP TRIGGER IF EXISTS update_cost_tracking_updated_at ON translation_cost_tracking;
CREATE TRIGGER update_cost_tracking_updated_at
  BEFORE UPDATE ON translation_cost_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_analytics_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_translation_view_count(p_translation_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO translation_analytics (translation_id, script_id, language_code, view_count, last_viewed_at)
  SELECT
    p_translation_id,
    st.script_id,
    st.language_code,
    1,
    now()
  FROM script_translations st
  WHERE st.id = p_translation_id
  ON CONFLICT (translation_id)
  DO UPDATE SET
    view_count = translation_analytics.view_count + 1,
    last_viewed_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_translation_download_count(p_translation_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO translation_analytics (translation_id, script_id, language_code, download_count, last_downloaded_at)
  SELECT
    p_translation_id,
    st.script_id,
    st.language_code,
    1,
    now()
  FROM script_translations st
  WHERE st.id = p_translation_id
  ON CONFLICT (translation_id)
  DO UPDATE SET
    download_count = translation_analytics.download_count + 1,
    last_downloaded_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
