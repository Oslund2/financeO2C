/*
  # Add Traditional Animation Cost Breakdown with Industry-Accurate Pricing

  ## Overview
  This migration adds comprehensive traditional animation cost tracking based on
  industry research from Beverly Boy Productions, ZipRecruiter, Upwork, and Animation Iconic.

  ## Research Basis
  - Stop-motion animation: 300-500 labor hours per minute of finished content
  - Animator hourly rates: $25-65/hour depending on tier
  - Cost per minute: $10,000-$50,000 depending on style and production tier
  - Physical materials: $500-$2,000 per character
  - Set construction: $1,000-$5,000 per unique set

  ## Animation Style Multipliers
  - Claymation: 1.0x (baseline) - 300-400 hours/minute
  - Hyper Real 2D: 1.5x - 450-600 hours/minute  
  - Full 3D Animation: 2.5x - 750-1000 hours/minute

  ## Production Tier Presets
  - Indie: Lower rates, smaller teams (~$10,000-15,000/minute)
  - Mid-Tier (default): Industry standard (~$25,000-35,000/minute)
  - Broadcast: Premium quality (~$40,000-50,000/minute)

  ## New Columns Added to production_cost_config
  1. animation_style - Type of animation being produced
  2. production_tier - Production quality tier
  3. traditional_labor_hours_per_minute - Base labor hours
  4. traditional_animator_hourly_rate - Animator pay rate
  5. traditional_materials_cost_per_character - Physical materials
  6. traditional_set_cost_per_scene - Set construction costs
  7. traditional_voice_talent_per_session - Professional voice actor rates
  8. traditional_studio_daily_rate - Studio rental cost
  9. traditional_reshoot_percentage - Contingency for reshoots
  10. traditional_frame_rate - Target FPS (12 or 24)

  ## Creator Economy Fields (Fiverr/Upwork freelancers)
  1. freelance_tier - Entry/mid/senior level
  2. freelance_hourly_rate - Freelancer rate
  3. freelance_platform_fee_percentage - Platform fees (Fiverr ~20%, Upwork ~10-20%)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'animation_style'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN animation_style text DEFAULT 'claymation' 
    CHECK (animation_style IN ('claymation', 'hyper_real', '3d'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'production_tier'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN production_tier text DEFAULT 'mid_tier' 
    CHECK (production_tier IN ('indie', 'mid_tier', 'broadcast'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_labor_hours_per_minute'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_labor_hours_per_minute numeric(10,2) DEFAULT 400.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_animator_hourly_rate'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_animator_hourly_rate numeric(10,2) DEFAULT 40.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_materials_cost_per_character'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_materials_cost_per_character numeric(10,2) DEFAULT 1000.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_set_cost_per_scene'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_set_cost_per_scene numeric(10,2) DEFAULT 2500.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_voice_talent_per_session'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_voice_talent_per_session numeric(10,2) DEFAULT 500.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_studio_daily_rate'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_studio_daily_rate numeric(10,2) DEFAULT 350.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_reshoot_percentage'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_reshoot_percentage numeric(5,2) DEFAULT 25.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'traditional_frame_rate'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN traditional_frame_rate integer DEFAULT 24 
    CHECK (traditional_frame_rate IN (12, 24));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'freelance_tier'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN freelance_tier text DEFAULT 'mid' 
    CHECK (freelance_tier IN ('entry', 'mid', 'senior'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'freelance_hourly_rate'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN freelance_hourly_rate numeric(10,2) DEFAULT 50.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_cost_config' AND column_name = 'freelance_platform_fee_percentage'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN freelance_platform_fee_percentage numeric(5,2) DEFAULT 15.00;
  END IF;
END $$;

UPDATE production_cost_config
SET
  animation_style = 'claymation',
  production_tier = 'mid_tier',
  traditional_labor_hours_per_minute = 400.00,
  traditional_animator_hourly_rate = 40.00,
  traditional_materials_cost_per_character = 1000.00,
  traditional_set_cost_per_scene = 2500.00,
  traditional_voice_talent_per_session = 500.00,
  traditional_studio_daily_rate = 350.00,
  traditional_reshoot_percentage = 25.00,
  traditional_frame_rate = 24,
  freelance_tier = 'mid',
  freelance_hourly_rate = 50.00,
  freelance_platform_fee_percentage = 15.00,
  updated_at = now()
WHERE series_id IS NULL;