/*
  # Add Episode Lifetime Value (LTV) Tracking
  
  ## Overview
  This migration adds columns to track episode lifetime value with viewership decay curves.
  Each episode can track its service date and revenue projection parameters for accurate
  long-term monetization modeling.
  
  ## Changes
  
  1. New Columns Added to `episodes` table:
     - `date_put_in_service` (timestamptz, nullable) - When the episode went live/aired
       * Defaults to NULL for episodes not yet in service
       * Used to calculate actual years active
       * Automatically set when episode status changes to completed
     
     - `projected_service_years` (integer, default: 5) - Expected years in service
       * Default is 5 years based on industry standards
       * Can be adjusted per episode based on content type
       * Range: 1-10 years typically
     
     - `decay_rate_percent` (numeric, default: 10.0) - Annual viewership decay rate
       * Represents percentage decline in viewership per year
       * Default: 10% annual decay (Year 1: 100%, Year 2: 90%, etc.)
       * Continues until minimum retention floor is reached
     
     - `minimum_retention_percent` (numeric, default: 20.0) - Stable long-tail retention
       * The floor percentage where viewership stabilizes
       * Default: 20% represents ongoing library/catalog value
       * Revenue stays at this level for remaining service years
  
  ## Business Logic
  
  Revenue Decay Model:
  - Year 1: 100% of projected annual revenue (full viewership)
  - Year 2: 90% (10% decay from Year 1)
  - Year 3: 80% (10% decay from Year 2)
  - Continues declining until reaching minimum retention floor
  - Stabilizes at floor for remaining years (long-tail monetization)
  
  Example with $100k annual revenue, 10% decay, 20% floor, 10 years:
  - Year 1: $100,000 | Year 6: $50,000
  - Year 2: $90,000  | Year 7: $40,000
  - Year 3: $80,000  | Year 8: $30,000
  - Year 4: $70,000  | Year 9: $20,000 (floor reached)
  - Year 5: $60,000  | Year 10: $20,000 (stable)
  
  Lifetime Value = Sum of all years = $550,000
  
  ## Security
  - No RLS changes needed (inherits existing episode policies)
  - All columns use safe defaults
  - Nullable date allows for future episode planning
*/

-- Add LTV tracking columns to episodes table
DO $$
BEGIN
  -- Add date_put_in_service column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'date_put_in_service'
  ) THEN
    ALTER TABLE episodes 
    ADD COLUMN date_put_in_service timestamptz DEFAULT NULL;
    
    COMMENT ON COLUMN episodes.date_put_in_service IS 
      'The date when the episode was put into service (aired/released). Used to calculate actual years active and apply time-based decay curves.';
  END IF;
  
  -- Add projected_service_years column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'projected_service_years'
  ) THEN
    ALTER TABLE episodes 
    ADD COLUMN projected_service_years integer DEFAULT 5 CHECK (projected_service_years >= 1 AND projected_service_years <= 20);
    
    COMMENT ON COLUMN episodes.projected_service_years IS 
      'Expected number of years the episode will remain in service and generate revenue. Default is 5 years.';
  END IF;
  
  -- Add decay_rate_percent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'decay_rate_percent'
  ) THEN
    ALTER TABLE episodes 
    ADD COLUMN decay_rate_percent numeric(5,2) DEFAULT 10.0 CHECK (decay_rate_percent >= 0 AND decay_rate_percent <= 100);
    
    COMMENT ON COLUMN episodes.decay_rate_percent IS 
      'Annual viewership decay rate as a percentage. Default 10% means Year 2 has 90% of Year 1 viewership.';
  END IF;
  
  -- Add minimum_retention_percent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'minimum_retention_percent'
  ) THEN
    ALTER TABLE episodes 
    ADD COLUMN minimum_retention_percent numeric(5,2) DEFAULT 20.0 CHECK (minimum_retention_percent >= 0 AND minimum_retention_percent <= 100);
    
    COMMENT ON COLUMN episodes.minimum_retention_percent IS 
      'The minimum retention floor where viewership stabilizes for long-tail revenue. Default 20% represents stable catalog value.';
  END IF;
END $$;

-- Create an index on date_put_in_service for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_episodes_date_put_in_service 
ON episodes(date_put_in_service) 
WHERE date_put_in_service IS NOT NULL;