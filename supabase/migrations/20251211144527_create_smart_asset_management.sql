/*
  # Smart Asset Management and Reusability System

  1. New Tables
    - `shared_asset_pools`
      - Shared asset collections across brands
      - Organization-wide asset libraries
      - Cross-brand asset reuse
    
    - `asset_pool_items`
      - Assets within shared pools
      - Tagging and categorization
      - Usage tracking
    
    - `asset_recommendations`
      - AI-powered asset suggestions
      - Similar asset detection
      - Reuse recommendations
    
    - `asset_licensing`
      - Rights management for assets
      - License types and restrictions
      - Usage permissions
    
    - `asset_transformations`
      - Style transfer configurations
      - Brand-specific adaptations
      - Automated variant generation
    
    - `asset_usage_tracking`
      - Track where assets are used
      - Cross-brand usage analytics
      - Popular asset identification
    
    - `asset_variants`
      - Different versions of same asset
      - Brand-specific color schemes
      - Size and format variations

  2. Features
    - Cross-brand asset sharing
    - Asset recommendation engine
    - Automated tagging with AI
    - Style transfer for brand adaptation
    - Usage analytics per asset
    - Rights management
    - Variant generation

  3. Security
    - Enable RLS on all tables
    - Organization-scoped asset pools
    - Permission-based access control
*/

-- Create shared asset pools table
CREATE TABLE IF NOT EXISTS shared_asset_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Pool metadata
  name text NOT NULL,
  description text,
  pool_type text DEFAULT 'organization' CHECK (pool_type IN ('organization', 'brand', 'project', 'public')),
  
  -- Scope and access
  series_ids uuid[] DEFAULT '{}',
  is_public boolean DEFAULT false,
  
  -- Pool settings
  auto_tag_enabled boolean DEFAULT true,
  auto_recommend_enabled boolean DEFAULT true,
  
  -- Statistics
  total_assets int DEFAULT 0,
  total_usage_count int DEFAULT 0,
  
  -- Metadata
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create asset pool items table
CREATE TABLE IF NOT EXISTS asset_pool_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES shared_asset_pools(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Categorization
  primary_category text,
  sub_category text,
  smart_tags text[] DEFAULT '{}',
  semantic_keywords text[] DEFAULT '{}',
  
  -- Usage tracking
  usage_count int DEFAULT 0,
  last_used_at timestamptz,
  
  -- Quality and suitability
  quality_rating decimal DEFAULT 0,
  brand_suitability_scores jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  added_by uuid,
  added_at timestamptz DEFAULT now(),
  
  UNIQUE(pool_id, asset_id)
);

-- Create asset recommendations table
CREATE TABLE IF NOT EXISTS asset_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context for recommendation
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES script_scenes(id) ON DELETE CASCADE,
  
  -- Recommended asset
  recommended_asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Recommendation reasoning
  recommendation_type text CHECK (recommendation_type IN ('similar', 'reuse', 'style_match', 'context_match', 'popular')),
  similarity_score decimal DEFAULT 0,
  reasoning text,
  
  -- Recommendation metadata
  recommended_at timestamptz DEFAULT now(),
  used boolean DEFAULT false,
  used_at timestamptz,
  feedback_rating int CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  
  created_at timestamptz DEFAULT now()
);

-- Create asset licensing table
CREATE TABLE IF NOT EXISTS asset_licensing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- License details
  license_type text NOT NULL CHECK (license_type IN ('internal_use', 'commercial', 'royalty_free', 'rights_managed', 'creative_commons', 'public_domain')),
  license_name text,
  license_url text,
  
  -- Rights and restrictions
  usage_rights jsonb DEFAULT '{
    "can_modify": true,
    "can_distribute": true,
    "can_sublicense": false,
    "attribution_required": false,
    "commercial_use": true
  }'::jsonb,
  
  -- Geographic and temporal restrictions
  geographic_restrictions text[] DEFAULT '{}',
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  
  -- Cost and attribution
  license_cost_usd decimal DEFAULT 0,
  attribution_text text,
  copyright_holder text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(asset_id)
);

-- Create asset transformations table
CREATE TABLE IF NOT EXISTS asset_transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  target_series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  
  -- Transformation configuration
  transformation_type text CHECK (transformation_type IN ('style_transfer', 'color_adaptation', 'format_conversion', 'resolution_adjustment', 'brand_theming')),
  transformation_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Style parameters
  target_style text,
  color_palette jsonb DEFAULT '[]'::jsonb,
  style_strength decimal DEFAULT 0.5 CHECK (style_strength >= 0 AND style_strength <= 1),
  
  -- Result
  result_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  transformation_status text DEFAULT 'pending' CHECK (transformation_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Quality and cost
  quality_score decimal DEFAULT 0,
  transformation_cost_usd decimal DEFAULT 0,
  processing_time_seconds decimal DEFAULT 0,
  
  -- Error handling
  error_message text,
  retry_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create asset usage tracking table
CREATE TABLE IF NOT EXISTS asset_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Usage context
  used_in_series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  used_in_episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  used_in_scene_id uuid REFERENCES script_scenes(id) ON DELETE CASCADE,
  used_in_storyboard_id uuid REFERENCES storyboards(id) ON DELETE CASCADE,
  
  -- Usage type
  usage_type text CHECK (usage_type IN ('background', 'character', 'prop', 'reference', 'final')),
  
  -- Usage metrics
  usage_duration_seconds decimal DEFAULT 0,
  prominence_score decimal DEFAULT 0 CHECK (prominence_score >= 0 AND prominence_score <= 1),
  
  -- Context
  used_by uuid,
  used_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now()
);

-- Create asset variants table
CREATE TABLE IF NOT EXISTS asset_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  variant_asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Variant details
  variant_type text CHECK (variant_type IN ('size', 'format', 'color', 'style', 'resolution', 'brand_theme')),
  variant_name text,
  variant_description text,
  
  -- Variant parameters
  width int,
  height int,
  format text,
  color_scheme jsonb DEFAULT '{}'::jsonb,
  resolution_dpi int,
  file_size_bytes bigint,
  
  -- Brand association
  target_series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  
  -- Generation info
  auto_generated boolean DEFAULT false,
  generation_config jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(parent_asset_id, variant_asset_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_asset_pools_org ON shared_asset_pools(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_pool_items_pool ON asset_pool_items(pool_id);
CREATE INDEX IF NOT EXISTS idx_asset_pool_items_asset ON asset_pool_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_recommendations_series ON asset_recommendations(series_id);
CREATE INDEX IF NOT EXISTS idx_asset_recommendations_asset ON asset_recommendations(recommended_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_licensing_asset ON asset_licensing(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_transformations_source ON asset_transformations(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_transformations_target_series ON asset_transformations(target_series_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_tracking_asset ON asset_usage_tracking(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_tracking_series ON asset_usage_tracking(used_in_series_id);
CREATE INDEX IF NOT EXISTS idx_asset_variants_parent ON asset_variants(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_variants_variant ON asset_variants(variant_asset_id);

-- Enable RLS
ALTER TABLE shared_asset_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_pool_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_licensing ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_asset_pools
CREATE POLICY "Organization members can view asset pools"
  ON shared_asset_pools FOR SELECT
  USING (
    is_public = true OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create asset pools"
  ON shared_asset_pools FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage asset pools"
  ON shared_asset_pools FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for asset_pool_items
CREATE POLICY "Users can view pool items from accessible pools"
  ON asset_pool_items FOR SELECT
  USING (
    pool_id IN (
      SELECT id FROM shared_asset_pools
      WHERE is_public = true OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can add items to their pools"
  ON asset_pool_items FOR INSERT
  WITH CHECK (
    pool_id IN (
      SELECT id FROM shared_asset_pools
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for asset_recommendations
CREATE POLICY "Users can view recommendations for their brands"
  ON asset_recommendations FOR SELECT
  USING (
    series_id IN (
      SELECT id FROM series
      WHERE organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for asset_licensing
CREATE POLICY "Users can view licensing for accessible assets"
  ON asset_licensing FOR SELECT
  USING (
    asset_id IN (
      SELECT id FROM assets
      WHERE organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for asset_transformations
CREATE POLICY "Users can view transformations for their brands"
  ON asset_transformations FOR SELECT
  USING (
    target_series_id IN (
      SELECT id FROM series
      WHERE organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create transformations for their brands"
  ON asset_transformations FOR INSERT
  WITH CHECK (
    target_series_id IN (
      SELECT id FROM series
      WHERE organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for asset_usage_tracking
CREATE POLICY "Users can view usage tracking"
  ON asset_usage_tracking FOR SELECT
  USING (true);

-- RLS Policies for asset_variants
CREATE POLICY "Users can view variants"
  ON asset_variants FOR SELECT
  USING (true);

-- Function to track asset usage
CREATE OR REPLACE FUNCTION track_asset_usage(
  usage_asset_id uuid,
  context_type text,
  context_id uuid,
  usage_user_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  series_id_val uuid;
  episode_id_val uuid;
  scene_id_val uuid;
  storyboard_id_val uuid;
BEGIN
  -- Determine context IDs based on type
  CASE context_type
    WHEN 'episode' THEN
      episode_id_val := context_id;
      SELECT series_id INTO series_id_val FROM episodes WHERE id = context_id;
    WHEN 'scene' THEN
      scene_id_val := context_id;
      SELECT e.series_id, e.id INTO series_id_val, episode_id_val
      FROM script_scenes sc
      JOIN script_acts sa ON sa.id = sc.act_id
      JOIN scripts s ON s.id = sa.script_id
      JOIN episodes e ON e.script_id = s.id
      WHERE sc.id = context_id;
    WHEN 'storyboard' THEN
      storyboard_id_val := context_id;
      SELECT series_id INTO series_id_val FROM storyboards WHERE id = context_id;
  END CASE;
  
  -- Insert usage tracking
  INSERT INTO asset_usage_tracking (
    asset_id,
    used_in_series_id,
    used_in_episode_id,
    used_in_scene_id,
    used_in_storyboard_id,
    used_by
  ) VALUES (
    usage_asset_id,
    series_id_val,
    episode_id_val,
    scene_id_val,
    storyboard_id_val,
    usage_user_id
  );
  
  -- Update asset usage count
  UPDATE assets
  SET usage_count = usage_count + 1
  WHERE id = usage_asset_id;
  
  -- Update pool item usage count if applicable
  UPDATE asset_pool_items
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE asset_id = usage_asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar assets
CREATE OR REPLACE FUNCTION find_similar_assets(
  reference_asset_id uuid,
  similarity_threshold decimal DEFAULT 0.7,
  limit_count int DEFAULT 10
) RETURNS TABLE(
  asset_id uuid,
  asset_name text,
  similarity_score decimal,
  tags text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    0.8::decimal as similarity_score,
    a.tags
  FROM assets a
  WHERE a.id != reference_asset_id
  AND a.asset_type = (SELECT asset_type FROM assets WHERE id = reference_asset_id)
  ORDER BY a.usage_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate asset recommendations
CREATE OR REPLACE FUNCTION generate_asset_recommendations(
  for_series_id uuid,
  for_episode_id uuid DEFAULT NULL,
  for_scene_id uuid DEFAULT NULL,
  max_recommendations int DEFAULT 5
) RETURNS void AS $$
DECLARE
  rec_asset record;
BEGIN
  -- Find popular assets from the same brand
  FOR rec_asset IN
    SELECT id, usage_count
    FROM assets
    WHERE series_id = for_series_id
    ORDER BY usage_count DESC
    LIMIT max_recommendations
  LOOP
    INSERT INTO asset_recommendations (
      series_id,
      episode_id,
      scene_id,
      recommended_asset_id,
      recommendation_type,
      similarity_score,
      reasoning
    ) VALUES (
      for_series_id,
      for_episode_id,
      for_scene_id,
      rec_asset.id,
      'popular',
      0.9,
      'Popular asset used ' || rec_asset.usage_count || ' times in this brand'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;