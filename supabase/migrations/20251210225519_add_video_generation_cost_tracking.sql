/*
  # Add Video Generation Cost Tracking

  ## Overview
  This migration adds video generation cost configuration fields to track AI-powered video 
  generation expenses per episode. This enables accurate cost modeling for the complete 
  animation production pipeline including video generation.

  ## Changes to production_cost_config table
  
  1. New Columns:
    - `video_generation_cost_per_minute` (numeric, default: 120.00) 
      * Cost per minute for AI video generation
      * Based on typical AI video generation pricing ($120/min)
      * For 22-minute episode: $2,640 per episode
    
    - `video_generation_provider` (text, default: 'AI Video Platform')
      * Name of the video generation service/provider
      * Allows tracking which platform is being used
    
    - `video_generation_quality_tier` (text, default: 'standard')
      * Quality/resolution tier (standard, premium, etc.)
      * Different tiers may have different pricing

  ## Business Logic
  
  Video generation represents the final step in the animation pipeline:
  - Storyboard images → Character animations → Video generation
  - Default: $120 per minute of finished video
  - Standard 22-minute episode: $2,640 video generation cost
  - Combined with other costs for total episode production cost

  ## Security
  - Maintains existing RLS policies for production_cost_config table
  - No new security policies needed
*/

-- Add video generation cost fields to production_cost_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'video_generation_cost_per_minute'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN video_generation_cost_per_minute numeric DEFAULT 120.00 CHECK (video_generation_cost_per_minute >= 0);
    
    COMMENT ON COLUMN production_cost_config.video_generation_cost_per_minute IS 
      'Cost per minute for AI video generation. Default $120/min based on industry pricing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'video_generation_provider'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN video_generation_provider text DEFAULT 'AI Video Platform';
    
    COMMENT ON COLUMN production_cost_config.video_generation_provider IS 
      'Name of the AI video generation service provider being used.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_cost_config' AND column_name = 'video_generation_quality_tier'
  ) THEN
    ALTER TABLE production_cost_config 
    ADD COLUMN video_generation_quality_tier text DEFAULT 'standard';
    
    COMMENT ON COLUMN production_cost_config.video_generation_quality_tier IS 
      'Quality tier for video generation (standard, premium, etc.). May affect pricing.';
  END IF;
END $$;