/*
  # Add Human Editing & Rendering Costs with Asset Reuse Decay

  ## Overview
  This migration adds human labor cost tracking for AI-assisted production, including
  a decay model that accounts for asset reuse over time. As productions mature, human
  editing time decreases because established character models, backgrounds, and shot
  compositions can be reused.

  ## New Columns on production_cost_config

  ### Base Human Labor Costs (Episode 1 baseline)
  1. `human_editing_cost_per_minute` (numeric, default: 50.00)
     - Post-production editing labor cost per minute of runtime
     - At default: 24-min episode = ~$1,200 editing labor
     - Covers: Timeline editing, scene assembly, pacing adjustments

  2. `human_scene_setup_cost_per_minute` (numeric, default: 25.00)
     - Shot composition review and scene setup labor
     - Covers: Camera angle verification, background review, continuity checks

  3. `human_character_qc_cost_per_minute` (numeric, default: 10.00)
     - Character consistency quality control
     - Covers: Model verification, expression checks, outfit continuity

  4. `human_render_supervision_cost_per_minute` (numeric, default: 15.00)
     - Technical QC during render process (FLAT - does not decay)
     - Covers: Output verification, technical quality checks

  5. `human_voice_direction_cost_per_session` (numeric, default: 200.00)
     - Voice direction per recording session (FLAT - does not decay)
     - Covers: Director time for voice talent guidance

  6. `human_revision_rate_percentage` (numeric, default: 20.00)
     - Percentage of editing work requiring rework
     - Applied to editing costs, partially decays with experience

  ### Asset Reuse Decay Parameters
  7. `asset_decay_rate` (numeric, default: 0.95)
     - Decay multiplier applied per episode (0.95 = 5% efficiency gain each episode)
     - Formula: adjustedCost = baseCost * max(floor, decayRate ^ episodeNumber)

  8. `asset_decay_floor` (numeric, default: 0.40)
     - Minimum decay threshold (never below 40% of base costs)
     - Represents irreducible human oversight even with full asset library

  ### Production Profile Presets
  9. `human_cost_profile` (text, default: 'standard')
     - Preset profile name: 'lean', 'standard', 'broadcast'
     - Lean: Lower costs, aggressive decay (0.92), low floor (35%)
     - Standard: Moderate costs, standard decay (0.95), standard floor (40%)
     - Broadcast: Higher costs, slower decay (0.97), higher floor (50%)

  ## Decay Model Explanation

  The decay model recognizes that early episodes are expensive because you're
  building the asset library. As the series progresses:

  - Episode 1: 100% of base human costs (all new assets)
  - Episode 5: ~77% (with 0.95 decay rate)
  - Episode 10: ~60%
  - Episode 20+: Approaches floor (40%) as asset library matures

  Costs affected by decay:
  - Scene/shot setup time (reusable backgrounds, camera angles)
  - Character consistency review (established models need less QC)
  - Editing time (familiar templates, established style guides)

  Costs NOT affected by decay (flat):
  - Voice direction (always new dialogue)
  - Render supervision (technical QC always needed)
  - Part of revision work (script-specific fixes)

  ## Security
  - Maintains existing RLS policies for production_cost_config table
  - No new security changes needed
*/

-- Add human labor cost fields to production_cost_config
DO $$
BEGIN
  -- Base editing labor cost per minute of runtime
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'human_editing_cost_per_minute'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN human_editing_cost_per_minute numeric(10,2) DEFAULT 50.00 
    CHECK (human_editing_cost_per_minute >= 0);
    
    COMMENT ON COLUMN production_cost_config.human_editing_cost_per_minute IS 
      'Human editing labor cost per minute of runtime. Decays with asset reuse.';
  END IF;

  -- Scene setup and composition review cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'human_scene_setup_cost_per_minute'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN human_scene_setup_cost_per_minute numeric(10,2) DEFAULT 25.00 
    CHECK (human_scene_setup_cost_per_minute >= 0);
    
    COMMENT ON COLUMN production_cost_config.human_scene_setup_cost_per_minute IS 
      'Shot composition and scene setup review cost per minute. Decays with asset reuse.';
  END IF;

  -- Character QC cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'human_character_qc_cost_per_minute'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN human_character_qc_cost_per_minute numeric(10,2) DEFAULT 10.00 
    CHECK (human_character_qc_cost_per_minute >= 0);
    
    COMMENT ON COLUMN production_cost_config.human_character_qc_cost_per_minute IS 
      'Character consistency QC cost per minute. Decays with established models.';
  END IF;

  -- Render supervision (flat, does not decay)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'human_render_supervision_cost_per_minute'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN human_render_supervision_cost_per_minute numeric(10,2) DEFAULT 15.00 
    CHECK (human_render_supervision_cost_per_minute >= 0);
    
    COMMENT ON COLUMN production_cost_config.human_render_supervision_cost_per_minute IS 
      'Technical render supervision cost per minute. Flat cost, does not decay.';
  END IF;

  -- Voice direction per session (flat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'human_voice_direction_cost_per_session'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN human_voice_direction_cost_per_session numeric(10,2) DEFAULT 200.00 
    CHECK (human_voice_direction_cost_per_session >= 0);
    
    COMMENT ON COLUMN production_cost_config.human_voice_direction_cost_per_session IS 
      'Voice direction cost per recording session. Flat cost per episode.';
  END IF;

  -- Revision rate percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'human_revision_rate_percentage'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN human_revision_rate_percentage numeric(5,2) DEFAULT 20.00 
    CHECK (human_revision_rate_percentage >= 0 AND human_revision_rate_percentage <= 100);
    
    COMMENT ON COLUMN production_cost_config.human_revision_rate_percentage IS 
      'Percentage of work requiring revisions. Partially decays with experience.';
  END IF;

  -- Asset decay rate (per episode)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'asset_decay_rate'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN asset_decay_rate numeric(4,3) DEFAULT 0.950 
    CHECK (asset_decay_rate > 0 AND asset_decay_rate <= 1);
    
    COMMENT ON COLUMN production_cost_config.asset_decay_rate IS 
      'Decay multiplier per episode (0.95 = 5% efficiency gain each episode).';
  END IF;

  -- Asset decay floor (minimum multiplier)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'asset_decay_floor'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN asset_decay_floor numeric(4,3) DEFAULT 0.400 
    CHECK (asset_decay_floor > 0 AND asset_decay_floor <= 1);
    
    COMMENT ON COLUMN production_cost_config.asset_decay_floor IS 
      'Minimum decay threshold (0.40 = never below 40% of base costs).';
  END IF;

  -- Human cost profile preset
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'human_cost_profile'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN human_cost_profile text DEFAULT 'standard';
    
    COMMENT ON COLUMN production_cost_config.human_cost_profile IS 
      'Production profile preset: lean, standard, or broadcast quality.';
  END IF;
END $$;

-- Update the default global configuration with human cost settings
UPDATE production_cost_config
SET 
  human_editing_cost_per_minute = 50.00,
  human_scene_setup_cost_per_minute = 25.00,
  human_character_qc_cost_per_minute = 10.00,
  human_render_supervision_cost_per_minute = 15.00,
  human_voice_direction_cost_per_session = 200.00,
  human_revision_rate_percentage = 20.00,
  asset_decay_rate = 0.950,
  asset_decay_floor = 0.400,
  human_cost_profile = 'standard'
WHERE series_id IS NULL 
AND config_name = 'Global Default Configuration';