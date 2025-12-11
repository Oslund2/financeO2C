/*
  # Brand Template Marketplace System

  1. New Tables
    - `brand_templates`
      - Community-contributed brand configurations
      - Template metadata, preview images, and configuration
      - Pricing (free or paid templates)
      - Usage statistics and ratings
    
    - `template_categories`
      - Categories for organizing templates
      - Genres: Education, History, Entertainment, Documentary, Kids Shows, etc.
    
    - `template_ratings`
      - User ratings and reviews for templates
      - Star ratings and written feedback
    
    - `template_installations`
      - Track which users/organizations installed which templates
      - Installation history and success tracking
    
    - `template_assets`
      - Sample content included with templates
      - Characters, scripts, assets bundled with template
    
    - `template_submissions`
      - Workflow for submitting new templates for review
      - Approval process before going live in marketplace

  2. Features
    - One-click brand installation from template
    - Community-contributed configurations
    - Template gallery with previews
    - Rating and review system
    - Paid template marketplace support
    - Template categories and search
    - Sample content bundles

  3. Security
    - Enable RLS on all tables
    - Public templates viewable by all
    - Only creators can edit their templates
    - Admin approval workflow for submissions
*/

-- Create template categories table
CREATE TABLE IF NOT EXISTS template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  parent_category_id uuid REFERENCES template_categories(id),
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create brand templates table
CREATE TABLE IF NOT EXISTS brand_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  long_description text,
  
  -- Creator information
  created_by uuid,
  creator_name text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Template configuration
  template_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  series_settings jsonb DEFAULT '{}'::jsonb,
  style_guide text,
  
  -- Categorization
  category_id uuid REFERENCES template_categories(id),
  tags text[] DEFAULT '{}',
  genre text,
  target_audience text,
  content_type text,
  
  -- Visual assets
  preview_image_url text,
  thumbnail_url text,
  demo_video_url text,
  screenshot_urls text[] DEFAULT '{}',
  
  -- Pricing and availability
  is_free boolean DEFAULT true,
  price_usd decimal DEFAULT 0.00,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  
  -- Statistics
  install_count int DEFAULT 0,
  view_count int DEFAULT 0,
  average_rating decimal DEFAULT 0.0,
  rating_count int DEFAULT 0,
  
  -- Sample content references
  includes_characters boolean DEFAULT false,
  includes_scripts boolean DEFAULT false,
  includes_assets boolean DEFAULT false,
  sample_episode_count int DEFAULT 0,
  
  -- Metadata
  version text DEFAULT '1.0.0',
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  published_at timestamptz,
  
  -- Requirements and compatibility
  requires_features text[] DEFAULT '{}',
  min_plan_tier text DEFAULT 'free'
);

-- Create template ratings table
CREATE TABLE IF NOT EXISTS template_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES brand_templates(id) ON DELETE CASCADE,
  user_id uuid,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Rating details
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title text,
  review_text text,
  
  -- Helpful votes
  helpful_count int DEFAULT 0,
  
  -- Verification
  is_verified_purchase boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(template_id, user_id)
);

-- Create template installations table
CREATE TABLE IF NOT EXISTS template_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES brand_templates(id) ON DELETE CASCADE,
  user_id uuid,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Installation details
  installed_series_id uuid REFERENCES series(id) ON DELETE SET NULL,
  installation_status text DEFAULT 'completed' CHECK (installation_status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message text,
  
  -- Configuration overrides
  customizations jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  installed_at timestamptz DEFAULT now(),
  template_version text,
  
  UNIQUE(template_id, organization_id, installed_series_id)
);

-- Create template assets table
CREATE TABLE IF NOT EXISTS template_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES brand_templates(id) ON DELETE CASCADE,
  
  -- Asset details
  asset_type text NOT NULL CHECK (asset_type IN ('character', 'script', 'storyboard', 'background', 'prop', 'audio', 'other')),
  name text NOT NULL,
  description text,
  
  -- Asset data (can be file URL or embedded JSON)
  file_url text,
  asset_data jsonb DEFAULT '{}'::jsonb,
  
  -- Ordering and organization
  sort_order int DEFAULT 0,
  is_required boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

-- Create template submissions table
CREATE TABLE IF NOT EXISTS template_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES brand_templates(id) ON DELETE CASCADE,
  
  -- Submitter information
  submitted_by uuid,
  submitter_email text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Submission details
  submission_type text NOT NULL CHECK (submission_type IN ('new', 'update', 'feature')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'revision_requested')),
  
  -- Review process
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  rejection_reason text,
  
  -- Template data at time of submission
  submitted_data jsonb NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_templates_category ON brand_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_brand_templates_creator ON brand_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_brand_templates_published ON brand_templates(is_published, is_featured);
CREATE INDEX IF NOT EXISTS idx_brand_templates_slug ON brand_templates(slug);
CREATE INDEX IF NOT EXISTS idx_template_ratings_template ON template_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_template_ratings_user ON template_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_template_installations_template ON template_installations(template_id);
CREATE INDEX IF NOT EXISTS idx_template_installations_org ON template_installations(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_assets_template ON template_assets(template_id);
CREATE INDEX IF NOT EXISTS idx_template_submissions_status ON template_submissions(status);

-- Enable RLS
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_categories
CREATE POLICY "Anyone can view active categories"
  ON template_categories FOR SELECT
  USING (is_active = true);

-- RLS Policies for brand_templates
CREATE POLICY "Anyone can view published templates"
  ON brand_templates FOR SELECT
  USING (is_published = true);

CREATE POLICY "Creators can view their own unpublished templates"
  ON brand_templates FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Creators can create templates"
  ON brand_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can update their own templates"
  ON brand_templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for template_ratings
CREATE POLICY "Anyone can view ratings"
  ON template_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create ratings"
  ON template_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ratings"
  ON template_ratings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own ratings"
  ON template_ratings FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for template_installations
CREATE POLICY "Users can view their organization's installations"
  ON template_installations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Users can create installations for their organizations"
  ON template_installations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- RLS Policies for template_assets
CREATE POLICY "Anyone can view assets for published templates"
  ON template_assets FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM brand_templates WHERE is_published = true
    )
  );

CREATE POLICY "Creators can manage their template assets"
  ON template_assets FOR ALL
  USING (
    template_id IN (
      SELECT id FROM brand_templates WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for template_submissions
CREATE POLICY "Users can view their own submissions"
  ON template_submissions FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can create submissions"
  ON template_submissions FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can update their pending submissions"
  ON template_submissions FOR UPDATE
  USING (submitted_by = auth.uid() AND status = 'pending')
  WITH CHECK (submitted_by = auth.uid());

-- Function to update template statistics
CREATE OR REPLACE FUNCTION update_template_stats(
  template_uuid uuid,
  stat_type text
) RETURNS void AS $$
BEGIN
  CASE stat_type
    WHEN 'install' THEN
      UPDATE brand_templates 
      SET install_count = install_count + 1
      WHERE id = template_uuid;
    WHEN 'view' THEN
      UPDATE brand_templates 
      SET view_count = view_count + 1
      WHERE id = template_uuid;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate template rating
CREATE OR REPLACE FUNCTION recalculate_template_rating(template_uuid uuid)
RETURNS void AS $$
DECLARE
  avg_rating decimal;
  rating_ct int;
BEGIN
  SELECT AVG(rating)::decimal, COUNT(*)
  INTO avg_rating, rating_ct
  FROM template_ratings
  WHERE template_id = template_uuid;
  
  UPDATE brand_templates
  SET 
    average_rating = COALESCE(avg_rating, 0),
    rating_count = rating_ct,
    last_updated = now()
  WHERE id = template_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update template rating when rating is added/updated/deleted
CREATE OR REPLACE FUNCTION trigger_recalculate_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_template_rating(OLD.template_id);
  ELSE
    PERFORM recalculate_template_rating(NEW.template_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_template_rating_change
AFTER INSERT OR UPDATE OR DELETE ON template_ratings
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_template_rating();

-- Insert default categories
INSERT INTO template_categories (name, slug, description, icon, sort_order) VALUES
  ('Education', 'education', 'Educational content for schools and learning platforms', '📚', 1),
  ('History', 'history', 'Historical documentaries and period pieces', '🏛️', 2),
  ('Entertainment', 'entertainment', 'General entertainment and comedy shows', '🎭', 3),
  ('Documentary', 'documentary', 'Documentary-style content and non-fiction', '📽️', 4),
  ('Kids Shows', 'kids-shows', 'Content designed for children and families', '🧒', 5),
  ('Science & Tech', 'science-tech', 'Science, technology, and innovation content', '🔬', 6),
  ('Adventure', 'adventure', 'Action and adventure series', '🗺️', 7),
  ('Mystery', 'mystery', 'Mystery and detective stories', '🔍', 8),
  ('Fantasy', 'fantasy', 'Fantasy and magical worlds', '🪄', 9),
  ('News & Current Events', 'news', 'News-style and current events coverage', '📰', 10)
ON CONFLICT (slug) DO NOTHING;