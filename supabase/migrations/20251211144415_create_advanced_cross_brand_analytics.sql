/*
  # Advanced Cross-Brand Analytics System

  1. New Tables
    - `brand_analytics`
      - Performance metrics per brand (series)
      - Production velocity, cost efficiency, quality scores
      - Time-series data for trend analysis
    
    - `episode_performance_metrics`
      - Detailed metrics per episode
      - Generation quality scores, production time
      - Cost breakdown and efficiency metrics
    
    - `brand_comparison_snapshots`
      - Saved comparison views
      - Custom benchmark configurations
      - Historical comparison data
    
    - `ai_generation_quality_scores`
      - Quality scoring for AI-generated content
      - Per-asset quality metrics
      - A/B test results for prompts
    
    - `production_velocity_tracking`
      - Timeline tracking for production phases
      - Bottleneck identification
      - Team productivity metrics
    
    - `cost_efficiency_metrics`
      - Cost per minute analysis
      - Budget variance tracking
      - ROI calculations per brand

  2. Features
    - Brand performance comparison dashboard
    - Production velocity analytics
    - Cost efficiency tracking
    - AI generation quality scoring
    - A/B testing for prompt variations
    - Trend analysis and forecasting
    - Custom benchmark creation

  3. Security
    - Enable RLS on all tables
    - Organization-scoped analytics
    - Team member access based on permissions
*/

-- Create brand analytics table
CREATE TABLE IF NOT EXISTS brand_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Time period
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text DEFAULT 'month' CHECK (period_type IN ('day', 'week', 'month', 'quarter', 'year')),
  
  -- Production metrics
  episodes_created int DEFAULT 0,
  scenes_produced int DEFAULT 0,
  assets_generated int DEFAULT 0,
  total_production_time_hours decimal DEFAULT 0,
  
  -- Cost metrics
  total_cost_usd decimal DEFAULT 0,
  ai_cost_usd decimal DEFAULT 0,
  labor_cost_usd decimal DEFAULT 0,
  cost_per_episode decimal DEFAULT 0,
  cost_per_minute decimal DEFAULT 0,
  budget_utilization_percent decimal DEFAULT 0,
  
  -- Quality metrics
  average_quality_score decimal DEFAULT 0,
  approval_rate_percent decimal DEFAULT 0,
  revision_count int DEFAULT 0,
  average_revisions_per_asset decimal DEFAULT 0,
  
  -- Velocity metrics
  average_days_per_episode decimal DEFAULT 0,
  average_scenes_per_day decimal DEFAULT 0,
  production_efficiency_score decimal DEFAULT 0,
  
  -- AI generation metrics
  total_ai_generations int DEFAULT 0,
  successful_generations int DEFAULT 0,
  failed_generations int DEFAULT 0,
  ai_success_rate_percent decimal DEFAULT 0,
  average_generation_time_seconds decimal DEFAULT 0,
  
  -- Team metrics
  active_team_members int DEFAULT 0,
  total_work_hours decimal DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(series_id, period_start, period_end, period_type)
);

-- Create episode performance metrics table
CREATE TABLE IF NOT EXISTS episode_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Production timeline
  planning_started_at timestamptz,
  scripting_started_at timestamptz,
  storyboarding_started_at timestamptz,
  production_started_at timestamptz,
  post_production_started_at timestamptz,
  completed_at timestamptz,
  
  -- Time durations (in hours)
  planning_duration_hours decimal DEFAULT 0,
  scripting_duration_hours decimal DEFAULT 0,
  storyboarding_duration_hours decimal DEFAULT 0,
  production_duration_hours decimal DEFAULT 0,
  post_production_duration_hours decimal DEFAULT 0,
  total_duration_hours decimal DEFAULT 0,
  
  -- Cost breakdown
  scripting_cost_usd decimal DEFAULT 0,
  storyboarding_cost_usd decimal DEFAULT 0,
  asset_generation_cost_usd decimal DEFAULT 0,
  voice_generation_cost_usd decimal DEFAULT 0,
  video_generation_cost_usd decimal DEFAULT 0,
  post_production_cost_usd decimal DEFAULT 0,
  total_cost_usd decimal DEFAULT 0,
  
  -- Quality metrics
  script_quality_score decimal DEFAULT 0,
  storyboard_quality_score decimal DEFAULT 0,
  asset_quality_score decimal DEFAULT 0,
  overall_quality_score decimal DEFAULT 0,
  
  -- Revision tracking
  script_revisions int DEFAULT 0,
  storyboard_revisions int DEFAULT 0,
  asset_revisions int DEFAULT 0,
  total_revisions int DEFAULT 0,
  
  -- AI generation stats
  ai_generations_used int DEFAULT 0,
  ai_generation_cost_usd decimal DEFAULT 0,
  ai_success_rate_percent decimal DEFAULT 0,
  
  -- Team involvement
  team_members_involved int DEFAULT 0,
  total_work_hours decimal DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(episode_id)
);

-- Create brand comparison snapshots table
CREATE TABLE IF NOT EXISTS brand_comparison_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Snapshot metadata
  name text NOT NULL,
  description text,
  created_by uuid,
  
  -- Brands being compared
  series_ids uuid[] NOT NULL,
  
  -- Comparison configuration
  metrics_compared text[] DEFAULT '{}',
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Snapshot data
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Benchmarks
  custom_benchmarks jsonb DEFAULT '{}'::jsonb,
  
  is_favorite boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create AI generation quality scores table
CREATE TABLE IF NOT EXISTS ai_generation_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Asset reference
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  
  -- Generation details
  generation_service text NOT NULL,
  generation_model text,
  prompt_version text,
  prompt_text text,
  
  -- Quality scores (1-10 scale)
  technical_quality_score decimal CHECK (technical_quality_score >= 0 AND technical_quality_score <= 10),
  aesthetic_quality_score decimal CHECK (aesthetic_quality_score >= 0 AND aesthetic_quality_score <= 10),
  prompt_adherence_score decimal CHECK (prompt_adherence_score >= 0 AND prompt_adherence_score <= 10),
  brand_consistency_score decimal CHECK (brand_consistency_score >= 0 AND brand_consistency_score <= 10),
  overall_score decimal CHECK (overall_score >= 0 AND overall_score <= 10),
  
  -- Performance metrics
  generation_time_seconds decimal DEFAULT 0,
  generation_cost_usd decimal DEFAULT 0,
  retry_count int DEFAULT 0,
  
  -- Feedback
  user_rating int CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback text,
  approved boolean DEFAULT false,
  
  -- A/B testing
  ab_test_group text,
  ab_test_id uuid,
  
  created_at timestamptz DEFAULT now(),
  scored_by uuid,
  scored_at timestamptz
);

-- Create production velocity tracking table
CREATE TABLE IF NOT EXISTS production_velocity_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Time period
  tracking_date date NOT NULL,
  tracking_week int,
  tracking_month int,
  tracking_quarter int,
  tracking_year int,
  
  -- Daily production metrics
  episodes_completed int DEFAULT 0,
  scenes_completed int DEFAULT 0,
  assets_created int DEFAULT 0,
  scripts_written int DEFAULT 0,
  storyboards_completed int DEFAULT 0,
  
  -- Velocity indicators
  completion_velocity decimal DEFAULT 0,
  planned_vs_actual_ratio decimal DEFAULT 0,
  
  -- Bottlenecks
  bottleneck_phase text,
  bottleneck_severity text CHECK (bottleneck_severity IN ('none', 'minor', 'moderate', 'severe')),
  
  -- Team productivity
  team_size int DEFAULT 0,
  total_hours_worked decimal DEFAULT 0,
  productivity_score decimal DEFAULT 0,
  
  -- Blockers
  active_blockers int DEFAULT 0,
  blocker_details jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(series_id, tracking_date)
);

-- Create cost efficiency metrics table
CREATE TABLE IF NOT EXISTS cost_efficiency_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Time period
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Cost analysis
  total_budget_usd decimal DEFAULT 0,
  total_spent_usd decimal DEFAULT 0,
  budget_variance_usd decimal DEFAULT 0,
  budget_variance_percent decimal DEFAULT 0,
  
  -- Efficiency ratios
  cost_per_episode decimal DEFAULT 0,
  cost_per_minute decimal DEFAULT 0,
  cost_per_scene decimal DEFAULT 0,
  cost_per_asset decimal DEFAULT 0,
  
  -- AI cost optimization
  ai_cost_optimization_savings_usd decimal DEFAULT 0,
  ai_vs_traditional_cost_ratio decimal DEFAULT 0,
  
  -- ROI metrics
  estimated_revenue_usd decimal DEFAULT 0,
  estimated_roi_percent decimal DEFAULT 0,
  break_even_episodes int DEFAULT 0,
  
  -- Cost trends
  cost_trend text CHECK (cost_trend IN ('decreasing', 'stable', 'increasing')),
  efficiency_trend text CHECK (efficiency_trend IN ('improving', 'stable', 'declining')),
  
  -- Recommendations
  cost_saving_opportunities jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(series_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_analytics_series ON brand_analytics(series_id);
CREATE INDEX IF NOT EXISTS idx_brand_analytics_org ON brand_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_analytics_period ON brand_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_episode_metrics_episode ON episode_performance_metrics(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_metrics_series ON episode_performance_metrics(series_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_series ON ai_generation_quality_scores(series_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_asset ON ai_generation_quality_scores(asset_id);
CREATE INDEX IF NOT EXISTS idx_velocity_tracking_series ON production_velocity_tracking(series_id);
CREATE INDEX IF NOT EXISTS idx_velocity_tracking_date ON production_velocity_tracking(tracking_date);
CREATE INDEX IF NOT EXISTS idx_cost_efficiency_series ON cost_efficiency_metrics(series_id);

-- Enable RLS
ALTER TABLE brand_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_comparison_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_velocity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_efficiency_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_analytics
CREATE POLICY "Organization members can view brand analytics"
  ON brand_analytics FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for episode_performance_metrics
CREATE POLICY "Organization members can view episode metrics"
  ON episode_performance_metrics FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for brand_comparison_snapshots
CREATE POLICY "Organization members can view comparison snapshots"
  ON brand_comparison_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create comparison snapshots"
  ON brand_comparison_snapshots FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own snapshots"
  ON brand_comparison_snapshots FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for ai_generation_quality_scores
CREATE POLICY "Organization members can view quality scores"
  ON ai_generation_quality_scores FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create quality scores"
  ON ai_generation_quality_scores FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for production_velocity_tracking
CREATE POLICY "Organization members can view velocity tracking"
  ON production_velocity_tracking FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for cost_efficiency_metrics
CREATE POLICY "Organization members can view cost efficiency"
  ON cost_efficiency_metrics FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to calculate brand analytics for a period
CREATE OR REPLACE FUNCTION calculate_brand_analytics(
  brand_series_id uuid,
  start_date date,
  end_date date
) RETURNS void AS $$
DECLARE
  org_id uuid;
  episode_count int;
  total_cost decimal;
  avg_quality decimal;
BEGIN
  -- Get organization ID for this series
  SELECT organization_id INTO org_id FROM series WHERE id = brand_series_id;
  
  -- Count episodes in period
  SELECT COUNT(*) INTO episode_count
  FROM episodes
  WHERE series_id = brand_series_id
  AND created_at >= start_date
  AND created_at < (end_date + interval '1 day');
  
  -- Calculate total cost
  SELECT COALESCE(SUM(actual_cost), 0) INTO total_cost
  FROM episodes
  WHERE series_id = brand_series_id
  AND created_at >= start_date
  AND created_at < (end_date + interval '1 day');
  
  -- Calculate average quality
  SELECT COALESCE(AVG(overall_quality_score), 0) INTO avg_quality
  FROM episode_performance_metrics epm
  JOIN episodes e ON e.id = epm.episode_id
  WHERE e.series_id = brand_series_id
  AND e.created_at >= start_date
  AND e.created_at < (end_date + interval '1 day');
  
  -- Insert or update analytics
  INSERT INTO brand_analytics (
    series_id,
    organization_id,
    period_start,
    period_end,
    period_type,
    episodes_created,
    total_cost_usd,
    average_quality_score,
    cost_per_episode
  ) VALUES (
    brand_series_id,
    org_id,
    start_date,
    end_date,
    'custom',
    episode_count,
    total_cost,
    avg_quality,
    CASE WHEN episode_count > 0 THEN total_cost / episode_count ELSE 0 END
  )
  ON CONFLICT (series_id, period_start, period_end, period_type)
  DO UPDATE SET
    episodes_created = EXCLUDED.episodes_created,
    total_cost_usd = EXCLUDED.total_cost_usd,
    average_quality_score = EXCLUDED.average_quality_score,
    cost_per_episode = EXCLUDED.cost_per_episode,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track daily production velocity
CREATE OR REPLACE FUNCTION track_daily_velocity(
  brand_series_id uuid,
  track_date date DEFAULT CURRENT_DATE
) RETURNS void AS $$
DECLARE
  org_id uuid;
  daily_episodes int;
  daily_scenes int;
  daily_assets int;
BEGIN
  SELECT organization_id INTO org_id FROM series WHERE id = brand_series_id;
  
  -- Count completed episodes for the day
  SELECT COUNT(*) INTO daily_episodes
  FROM episodes
  WHERE series_id = brand_series_id
  AND DATE(completed_at) = track_date;
  
  -- Count completed scenes
  SELECT COUNT(*) INTO daily_scenes
  FROM scene_shots ss
  JOIN script_scenes sc ON sc.id = ss.scene_id
  JOIN script_acts sa ON sa.id = sc.act_id
  JOIN scripts s ON s.id = sa.script_id
  WHERE s.series_id = brand_series_id
  AND DATE(ss.updated_at) = track_date
  AND ss.generation_status = 'completed';
  
  -- Count created assets
  SELECT COUNT(*) INTO daily_assets
  FROM assets
  WHERE series_id = brand_series_id
  AND DATE(created_at) = track_date;
  
  -- Insert or update velocity tracking
  INSERT INTO production_velocity_tracking (
    series_id,
    organization_id,
    tracking_date,
    tracking_week,
    tracking_month,
    tracking_quarter,
    tracking_year,
    episodes_completed,
    scenes_completed,
    assets_created
  ) VALUES (
    brand_series_id,
    org_id,
    track_date,
    EXTRACT(WEEK FROM track_date),
    EXTRACT(MONTH FROM track_date),
    EXTRACT(QUARTER FROM track_date),
    EXTRACT(YEAR FROM track_date),
    daily_episodes,
    daily_scenes,
    daily_assets
  )
  ON CONFLICT (series_id, tracking_date)
  DO UPDATE SET
    episodes_completed = EXCLUDED.episodes_completed,
    scenes_completed = EXCLUDED.scenes_completed,
    assets_created = EXCLUDED.assets_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;