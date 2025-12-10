/*
  # Add Creator Cost Tracking System

  ## Overview
  This migration creates a comprehensive system for tracking labor-based production costs
  for animation episodes. It models the true cost of creator labor including preproduction,
  production, postproduction, and all associated overhead costs.

  ## New Table: creator_cost_config

  Stores configurable parameters for calculating creator labor costs:

  ### Scene and Production Metrics
  - `scenes_per_episode` (integer, default: 165) - Total scenes in a typical episode
    * Range: 1-500 scenes
    * Used to calculate total production workload

  - `artists_per_scene` (numeric, default: 4.0) - Average artists working on each scene
    * Range: 1-6 artists
    * Includes animators, background artists, character artists

  - `time_per_scene_hours` (numeric, default: 1.0) - Hours to complete one scene
    * Range: 0-3 hours per scene
    * Varies based on complexity and team experience

  - `production_days` (integer, default: 10) - Days allocated for production phase
    * Range: 5-30 days
    * Main production period excluding pre/post

  - `working_hours_per_day` (numeric, default: 8.0) - Standard work day length
    * Range: 4-12 hours
    * Typically 8 hours for sustainable production

  ### Labor Cost Parameters
  - `artist_annual_salary` (numeric, default: 75000.00) - Average artist annual salary
    * Used to calculate hourly rate
    * Basis: $75k/year ÷ 2080 hours = $36.06/hour

  - `overhead_percentage` (numeric, default: 25.0) - Benefits and overhead
    * Range: 0-50%
    * Includes health insurance, payroll taxes, equipment

  ### Production Phase Multipliers
  - `preproduction_percentage` (numeric, default: 15.0) - Pre-production time
    * Range: 0-30%
    * Storyboarding, planning, asset preparation

  - `postproduction_percentage` (numeric, default: 20.0) - Post-production time
    * Range: 0-40%
    * Editing, compositing, color correction, final polish

  - `revision_buffer_percentage` (numeric, default: 10.0) - Revision cycles
    * Range: 0-25%
    * Feedback implementation, director notes, QA

  - `project_management_percentage` (numeric, default: 15.0) - PM overhead
    * Range: 0-30%
    * Coordination, meetings, planning, administration

  ### Facility and Equipment Costs (Monthly per Artist)
  - `software_cost_per_artist_monthly` (numeric, default: 100.00)
    * Licenses for Adobe CC, Toon Boom, etc.

  - `equipment_cost_per_artist_monthly` (numeric, default: 200.00)
    * Amortized hardware costs (computers, tablets)

  - `studio_space_cost_per_artist_monthly` (numeric, default: 300.00)
    * Rent, utilities, furniture per artist workstation

  ## Calculation Examples

  ### Example 1: Standard 22-minute episode with default settings
  - 165 scenes × 4 artists × 1 hour = 660 total artist-hours
  - Production days: 10 days × 8 hours = 80 hours available per artist
  - Artists needed: 660 hours ÷ 80 hours = 8.25 artists (round to 9)
  - Base labor: 660 hours × $36.06/hour = $23,800
  - With all multipliers (15% pre + 20% post + 10% revision + 15% PM = 60%):
  - Total labor: $23,800 × 1.60 = $38,080
  - Overhead (25%): $38,080 × 1.25 = $47,600
  - Equipment (9 artists × $600/month): ~$5,400
  - **Total Creator Cost: ~$53,000 per episode**

  ### Example 2: Fast production (5 days, 6 artists per scene)
  - 165 scenes × 6 artists × 0.75 hours = 743 artist-hours
  - 5 days × 8 hours = 40 hours per artist
  - Artists needed: 743 ÷ 40 = 18.6 artists (19 artists)
  - Higher team coordination overhead required

  ## Security
  - RLS enabled with policies for authenticated access
  - Anyone can view configurations (for cost estimation)
  - Only authenticated users can create/modify configurations
*/

-- Create creator_cost_config table
CREATE TABLE IF NOT EXISTS creator_cost_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  config_name text NOT NULL DEFAULT 'Default Creator Cost Configuration',

  -- Scene and Production Metrics
  scenes_per_episode integer DEFAULT 165 CHECK (scenes_per_episode >= 1 AND scenes_per_episode <= 500),
  artists_per_scene numeric(4,2) DEFAULT 4.0 CHECK (artists_per_scene >= 1 AND artists_per_scene <= 6),
  time_per_scene_hours numeric(4,2) DEFAULT 1.0 CHECK (time_per_scene_hours >= 0 AND time_per_scene_hours <= 3),
  production_days integer DEFAULT 10 CHECK (production_days >= 5 AND production_days <= 30),
  working_hours_per_day numeric(4,2) DEFAULT 8.0 CHECK (working_hours_per_day >= 4 AND working_hours_per_day <= 12),

  -- Labor Cost Parameters
  artist_annual_salary numeric(10,2) DEFAULT 75000.00 CHECK (artist_annual_salary >= 0),
  overhead_percentage numeric(5,2) DEFAULT 25.0 CHECK (overhead_percentage >= 0 AND overhead_percentage <= 50),

  -- Production Phase Multipliers (as percentages of base production time)
  preproduction_percentage numeric(5,2) DEFAULT 15.0 CHECK (preproduction_percentage >= 0 AND preproduction_percentage <= 30),
  postproduction_percentage numeric(5,2) DEFAULT 20.0 CHECK (postproduction_percentage >= 0 AND postproduction_percentage <= 40),
  revision_buffer_percentage numeric(5,2) DEFAULT 10.0 CHECK (revision_buffer_percentage >= 0 AND revision_buffer_percentage <= 25),
  project_management_percentage numeric(5,2) DEFAULT 15.0 CHECK (project_management_percentage >= 0 AND project_management_percentage <= 30),

  -- Facility and Equipment Costs (monthly per artist)
  software_cost_per_artist_monthly numeric(10,2) DEFAULT 100.00 CHECK (software_cost_per_artist_monthly >= 0),
  equipment_cost_per_artist_monthly numeric(10,2) DEFAULT 200.00 CHECK (equipment_cost_per_artist_monthly >= 0),
  studio_space_cost_per_artist_monthly numeric(10,2) DEFAULT 300.00 CHECK (studio_space_cost_per_artist_monthly >= 0),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(series_id, config_name)
);

-- Add helpful column comments
COMMENT ON COLUMN creator_cost_config.scenes_per_episode IS
  'Total number of scenes in a typical episode. Used to calculate total production workload.';

COMMENT ON COLUMN creator_cost_config.artists_per_scene IS
  'Average number of artists working simultaneously on each scene (animators, background, character artists).';

COMMENT ON COLUMN creator_cost_config.time_per_scene_hours IS
  'Average hours required to complete one scene with the specified number of artists.';

COMMENT ON COLUMN creator_cost_config.production_days IS
  'Number of working days allocated for the main production phase (excludes pre and post production).';

COMMENT ON COLUMN creator_cost_config.artist_annual_salary IS
  'Average annual salary per artist. Divided by 2080 hours to get hourly rate.';

COMMENT ON COLUMN creator_cost_config.overhead_percentage IS
  'Percentage added for benefits, insurance, payroll taxes, and general overhead.';

COMMENT ON COLUMN creator_cost_config.preproduction_percentage IS
  'Preproduction time as percentage of production time. Includes storyboarding, planning, asset prep.';

COMMENT ON COLUMN creator_cost_config.postproduction_percentage IS
  'Postproduction time as percentage of production time. Includes editing, compositing, polish.';

COMMENT ON COLUMN creator_cost_config.revision_buffer_percentage IS
  'Additional time buffer for revision cycles, feedback, and QA as percentage of production time.';

COMMENT ON COLUMN creator_cost_config.project_management_percentage IS
  'Time allocated to project management, coordination, meetings as percentage of production time.';

-- Enable RLS
ALTER TABLE creator_cost_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view creator cost configs"
  ON creator_cost_config FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create creator cost configs"
  ON creator_cost_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update creator cost configs"
  ON creator_cost_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete creator cost configs"
  ON creator_cost_config FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_cost_config_series_id
  ON creator_cost_config(series_id);

-- Create trigger for updated_at
CREATE TRIGGER update_creator_cost_config_updated_at
  BEFORE UPDATE ON creator_cost_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert global default configuration
INSERT INTO creator_cost_config (
  series_id,
  config_name,
  scenes_per_episode,
  artists_per_scene,
  time_per_scene_hours,
  production_days,
  working_hours_per_day,
  artist_annual_salary,
  overhead_percentage,
  preproduction_percentage,
  postproduction_percentage,
  revision_buffer_percentage,
  project_management_percentage,
  software_cost_per_artist_monthly,
  equipment_cost_per_artist_monthly,
  studio_space_cost_per_artist_monthly
)
VALUES (
  NULL,
  'Global Default Creator Cost Configuration',
  165,
  4.0,
  1.0,
  10,
  8.0,
  75000.00,
  25.0,
  15.0,
  20.0,
  10.0,
  15.0,
  100.00,
  200.00,
  300.00
)
ON CONFLICT DO NOTHING;

-- Insert preset configurations for different studio sizes

-- Small Studio / Freelancer Network
INSERT INTO creator_cost_config (
  series_id,
  config_name,
  scenes_per_episode,
  artists_per_scene,
  time_per_scene_hours,
  production_days,
  working_hours_per_day,
  artist_annual_salary,
  overhead_percentage,
  preproduction_percentage,
  postproduction_percentage,
  revision_buffer_percentage,
  project_management_percentage,
  software_cost_per_artist_monthly,
  equipment_cost_per_artist_monthly,
  studio_space_cost_per_artist_monthly
)
VALUES (
  NULL,
  'Small Studio Preset',
  165,
  2.0,
  1.5,
  15,
  8.0,
  65000.00,
  20.0,
  20.0,
  25.0,
  15.0,
  10.0,
  150.00,
  150.00,
  200.00
)
ON CONFLICT DO NOTHING;

-- Large Studio / Production House
INSERT INTO creator_cost_config (
  series_id,
  config_name,
  scenes_per_episode,
  artists_per_scene,
  time_per_scene_hours,
  production_days,
  working_hours_per_day,
  artist_annual_salary,
  overhead_percentage,
  preproduction_percentage,
  postproduction_percentage,
  revision_buffer_percentage,
  project_management_percentage,
  software_cost_per_artist_monthly,
  equipment_cost_per_artist_monthly,
  studio_space_cost_per_artist_monthly
)
VALUES (
  NULL,
  'Large Studio Preset',
  165,
  5.0,
  0.75,
  7,
  8.0,
  85000.00,
  30.0,
  12.0,
  18.0,
  8.0,
  18.0,
  120.00,
  250.00,
  400.00
)
ON CONFLICT DO NOTHING;
