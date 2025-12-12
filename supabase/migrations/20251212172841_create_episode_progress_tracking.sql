/*
  # Create Episode Progress Tracking System

  1. New Tables
    - `episode_progress_milestones`
      - Tracks individual production milestones for each episode
      - Stores status, progress percentage, and timestamps
      - Enables detailed progress breakdown and analytics

  2. Progress Weight Distribution (reflects actual production time)
    - Pre-production: 25% total
      - Script & Episode Setup: 5%
      - Characters Assigned: 5%
      - Cost Estimation: 5%
      - Shot Plans Generated: 5%
      - Shot Prompts Generated: 5%
    - Production: 50% total (bulk of work)
      - Shot Rendering: 25%
      - Lip Synchronization: 15%
      - Audio Mixing: 10%
    - Post-production: 25% total
      - Video Assembly: 15%
      - Final Review: 5%
      - Export/Delivery: 5%

  3. Functions
    - `calculate_episode_progress()` - Calculates overall progress percentage
    - `get_episode_progress_breakdown()` - Returns detailed milestone breakdown
    - `update_episode_progress()` - Updates progress based on production data

  4. Security
    - Enable RLS on episode_progress_milestones table
    - Organization-scoped access policies
*/

-- Create episode progress milestones table
CREATE TABLE IF NOT EXISTS episode_progress_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Milestone identification
  milestone_name text NOT NULL,
  milestone_category text NOT NULL CHECK (milestone_category IN ('pre_production', 'production', 'post_production')),
  milestone_weight numeric NOT NULL CHECK (milestone_weight >= 0 AND milestone_weight <= 100),

  -- Progress tracking
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'skipped')),
  progress_percentage numeric NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Detailed metrics
  current_count integer DEFAULT 0,
  total_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  -- Constraints
  UNIQUE(episode_id, milestone_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_milestones_episode ON episode_progress_milestones(episode_id);
CREATE INDEX IF NOT EXISTS idx_progress_milestones_status ON episode_progress_milestones(status);
CREATE INDEX IF NOT EXISTS idx_progress_milestones_category ON episode_progress_milestones(milestone_category);

-- Enable RLS
ALTER TABLE episode_progress_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view progress milestones in their organization"
  ON episode_progress_milestones FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert progress milestones in their organization"
  ON episode_progress_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update progress milestones in their organization"
  ON episode_progress_milestones FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to initialize progress milestones for an episode
CREATE OR REPLACE FUNCTION initialize_episode_progress_milestones(
  p_episode_id uuid,
  p_organization_id uuid
) RETURNS void AS $$
BEGIN
  -- Pre-production milestones (25% total)
  INSERT INTO episode_progress_milestones (episode_id, organization_id, milestone_name, milestone_category, milestone_weight)
  VALUES
    (p_episode_id, p_organization_id, 'Script & Episode Setup', 'pre_production', 5),
    (p_episode_id, p_organization_id, 'Characters Assigned', 'pre_production', 5),
    (p_episode_id, p_organization_id, 'Cost Estimation', 'pre_production', 5),
    (p_episode_id, p_organization_id, 'Shot Plans Generated', 'pre_production', 5),
    (p_episode_id, p_organization_id, 'Shot Prompts Generated', 'pre_production', 5)
  ON CONFLICT (episode_id, milestone_name) DO NOTHING;

  -- Production milestones (50% total - bulk of work)
  INSERT INTO episode_progress_milestones (episode_id, organization_id, milestone_name, milestone_category, milestone_weight)
  VALUES
    (p_episode_id, p_organization_id, 'Shot Rendering', 'production', 25),
    (p_episode_id, p_organization_id, 'Lip Synchronization', 'production', 15),
    (p_episode_id, p_organization_id, 'Audio Mixing', 'production', 10)
  ON CONFLICT (episode_id, milestone_name) DO NOTHING;

  -- Post-production milestones (25% total)
  INSERT INTO episode_progress_milestones (episode_id, organization_id, milestone_name, milestone_category, milestone_weight)
  VALUES
    (p_episode_id, p_organization_id, 'Video Assembly', 'post_production', 15),
    (p_episode_id, p_organization_id, 'Final Review', 'post_production', 5),
    (p_episode_id, p_organization_id, 'Export/Delivery', 'post_production', 5)
  ON CONFLICT (episode_id, milestone_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate episode progress
CREATE OR REPLACE FUNCTION calculate_episode_progress(p_episode_id uuid)
RETURNS TABLE(
  total_progress numeric,
  pre_production_progress numeric,
  production_progress numeric,
  post_production_progress numeric,
  milestones jsonb
) AS $$
DECLARE
  v_episode_record episodes%ROWTYPE;
  v_organization_id uuid;
  v_shot_plans_count integer := 0;
  v_shot_prompts_count integer := 0;
  v_shots_total integer := 0;
  v_shots_completed integer := 0;
  v_lip_sync_total integer := 0;
  v_lip_sync_completed integer := 0;
  v_has_characters boolean := false;
  v_has_cost_estimate boolean := false;
  v_total_prog numeric := 0;
  v_pre_prog numeric := 0;
  v_prod_prog numeric := 0;
  v_post_prog numeric := 0;
BEGIN
  -- Get episode and organization
  SELECT * INTO v_episode_record FROM episodes WHERE id = p_episode_id;
  SELECT organization_id INTO v_organization_id FROM series WHERE id = v_episode_record.series_id;

  -- Ensure milestones exist
  PERFORM initialize_episode_progress_milestones(p_episode_id, v_organization_id);

  -- === PRE-PRODUCTION CALCULATIONS ===

  -- 1. Script & Episode Setup (5%) - Always complete if episode exists
  UPDATE episode_progress_milestones
  SET status = 'completed', progress_percentage = 100, completed_at = COALESCE(completed_at, now())
  WHERE episode_id = p_episode_id AND milestone_name = 'Script & Episode Setup';

  -- 2. Characters Assigned (5%) - Check character_consistency_profiles
  SELECT EXISTS(
    SELECT 1 FROM character_consistency_profiles
    WHERE series_id = v_episode_record.series_id
    LIMIT 1
  ) INTO v_has_characters;

  IF v_has_characters THEN
    UPDATE episode_progress_milestones
    SET status = 'completed', progress_percentage = 100, completed_at = COALESCE(completed_at, now())
    WHERE episode_id = p_episode_id AND milestone_name = 'Characters Assigned';
  END IF;

  -- 3. Cost Estimation (5%) - Check if estimated_cost exists
  v_has_cost_estimate := v_episode_record.estimated_cost IS NOT NULL AND v_episode_record.estimated_cost > 0;

  IF v_has_cost_estimate THEN
    UPDATE episode_progress_milestones
    SET status = 'completed', progress_percentage = 100, completed_at = COALESCE(completed_at, now())
    WHERE episode_id = p_episode_id AND milestone_name = 'Cost Estimation';
  END IF;

  -- 4. Shot Plans Generated (5%) - Check production_shot_plans
  SELECT COUNT(*) INTO v_shot_plans_count
  FROM production_shot_plans
  WHERE episode_id = p_episode_id;

  IF v_shot_plans_count > 0 THEN
    UPDATE episode_progress_milestones
    SET
      status = 'completed',
      progress_percentage = 100,
      current_count = v_shot_plans_count,
      total_count = v_shot_plans_count,
      completed_at = COALESCE(completed_at, now())
    WHERE episode_id = p_episode_id AND milestone_name = 'Shot Plans Generated';
  END IF;

  -- 5. Shot Prompts Generated (5%) - Check production_shot_prompts
  SELECT COUNT(*) INTO v_shot_prompts_count
  FROM production_shot_prompts psp
  JOIN production_shot_plans pln ON psp.shot_plan_id = pln.id
  WHERE pln.episode_id = p_episode_id;

  IF v_shot_prompts_count > 0 AND v_shot_plans_count > 0 THEN
    UPDATE episode_progress_milestones
    SET
      status = CASE WHEN v_shot_prompts_count >= v_shot_plans_count THEN 'completed' ELSE 'in_progress' END,
      progress_percentage = LEAST(100, (v_shot_prompts_count::numeric / v_shot_plans_count::numeric * 100)),
      current_count = v_shot_prompts_count,
      total_count = v_shot_plans_count,
      completed_at = CASE WHEN v_shot_prompts_count >= v_shot_plans_count THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE episode_id = p_episode_id AND milestone_name = 'Shot Prompts Generated';
  END IF;

  -- === PRODUCTION CALCULATIONS (50% - bulk of work) ===

  -- 6. Shot Rendering (25%) - Check rendering jobs and completed shots
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_shots_total, v_shots_completed
  FROM production_shot_plans
  WHERE episode_id = p_episode_id;

  IF v_shots_total > 0 THEN
    UPDATE episode_progress_milestones
    SET
      status = CASE
        WHEN v_shots_completed >= v_shots_total THEN 'completed'
        WHEN v_shots_completed > 0 THEN 'in_progress'
        ELSE 'not_started'
      END,
      progress_percentage = (v_shots_completed::numeric / v_shots_total::numeric * 100),
      current_count = v_shots_completed,
      total_count = v_shots_total,
      started_at = CASE WHEN v_shots_completed > 0 THEN COALESCE(started_at, now()) ELSE NULL END,
      completed_at = CASE WHEN v_shots_completed >= v_shots_total THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE episode_id = p_episode_id AND milestone_name = 'Shot Rendering';
  END IF;

  -- 7. Lip Synchronization (15%) - Check lip_sync_data
  SELECT
    COUNT(DISTINCT psp.id),
    COUNT(DISTINCT psp.id) FILTER (WHERE lsd.status = 'completed')
  INTO v_lip_sync_total, v_lip_sync_completed
  FROM production_shot_plans psp
  LEFT JOIN lip_sync_data lsd ON lsd.shot_plan_id = psp.id
  WHERE psp.episode_id = p_episode_id
    AND psp.characters IS NOT NULL
    AND array_length(psp.characters, 1) > 0;

  IF v_lip_sync_total > 0 THEN
    UPDATE episode_progress_milestones
    SET
      status = CASE
        WHEN v_lip_sync_completed >= v_lip_sync_total THEN 'completed'
        WHEN v_lip_sync_completed > 0 THEN 'in_progress'
        ELSE 'not_started'
      END,
      progress_percentage = (v_lip_sync_completed::numeric / v_lip_sync_total::numeric * 100),
      current_count = v_lip_sync_completed,
      total_count = v_lip_sync_total,
      started_at = CASE WHEN v_lip_sync_completed > 0 THEN COALESCE(started_at, now()) ELSE NULL END,
      completed_at = CASE WHEN v_lip_sync_completed >= v_lip_sync_total THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE episode_id = p_episode_id AND milestone_name = 'Lip Synchronization';
  END IF;

  -- 8. Audio Mixing (10%) - Check for audio tracks or mark as not started
  UPDATE episode_progress_milestones
  SET status = 'not_started', progress_percentage = 0
  WHERE episode_id = p_episode_id AND milestone_name = 'Audio Mixing'
    AND status = 'not_started';

  -- === POST-PRODUCTION CALCULATIONS ===

  -- 9. Video Assembly (15%) - Check episode status
  IF v_episode_record.status IN ('assembly', 'review', 'completed') THEN
    UPDATE episode_progress_milestones
    SET
      status = CASE WHEN v_episode_record.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
      progress_percentage = CASE
        WHEN v_episode_record.status = 'completed' THEN 100
        WHEN v_episode_record.status = 'review' THEN 90
        WHEN v_episode_record.status = 'assembly' THEN 50
        ELSE 0
      END,
      started_at = COALESCE(started_at, now()),
      completed_at = CASE WHEN v_episode_record.status = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE episode_id = p_episode_id AND milestone_name = 'Video Assembly';
  END IF;

  -- 10. Final Review (5%) - Check if in review or completed
  IF v_episode_record.status IN ('review', 'completed') THEN
    UPDATE episode_progress_milestones
    SET
      status = CASE WHEN v_episode_record.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
      progress_percentage = CASE WHEN v_episode_record.status = 'completed' THEN 100 ELSE 50 END,
      started_at = COALESCE(started_at, now()),
      completed_at = CASE WHEN v_episode_record.status = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE episode_id = p_episode_id AND milestone_name = 'Final Review';
  END IF;

  -- 11. Export/Delivery (5%) - Check if completed and has final video
  IF v_episode_record.status = 'completed' AND v_episode_record.final_video_url IS NOT NULL THEN
    UPDATE episode_progress_milestones
    SET
      status = 'completed',
      progress_percentage = 100,
      started_at = COALESCE(started_at, now()),
      completed_at = COALESCE(completed_at, now())
    WHERE episode_id = p_episode_id AND milestone_name = 'Export/Delivery';
  END IF;

  -- Calculate total progress as weighted sum
  SELECT
    COALESCE(SUM(progress_percentage * milestone_weight / 100), 0),
    COALESCE(SUM(CASE WHEN milestone_category = 'pre_production' THEN progress_percentage * milestone_weight / 100 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN milestone_category = 'production' THEN progress_percentage * milestone_weight / 100 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN milestone_category = 'post_production' THEN progress_percentage * milestone_weight / 100 ELSE 0 END), 0)
  INTO v_total_prog, v_pre_prog, v_prod_prog, v_post_prog
  FROM episode_progress_milestones
  WHERE episode_id = p_episode_id;

  -- Update episode table with total progress
  UPDATE episodes
  SET
    progress_percentage = ROUND(v_total_prog)::integer,
    updated_at = now()
  WHERE id = p_episode_id;

  -- Return results
  RETURN QUERY
  SELECT
    v_total_prog,
    v_pre_prog,
    v_prod_prog,
    v_post_prog,
    jsonb_agg(
      jsonb_build_object(
        'name', milestone_name,
        'category', milestone_category,
        'status', status,
        'progress', progress_percentage,
        'weight', milestone_weight,
        'current_count', current_count,
        'total_count', total_count,
        'started_at', started_at,
        'completed_at', completed_at
      ) ORDER BY
        CASE milestone_category
          WHEN 'pre_production' THEN 1
          WHEN 'production' THEN 2
          WHEN 'post_production' THEN 3
        END,
        created_at
    ) as milestones
  FROM episode_progress_milestones
  WHERE episode_id = p_episode_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get progress breakdown (user-facing)
CREATE OR REPLACE FUNCTION get_episode_progress_breakdown(p_episode_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_progress', total_progress,
    'pre_production_progress', pre_production_progress,
    'production_progress', production_progress,
    'post_production_progress', post_production_progress,
    'milestones', milestones
  )
  INTO v_result
  FROM calculate_episode_progress(p_episode_id);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to auto-update progress
CREATE OR REPLACE FUNCTION trigger_update_episode_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_episode_id uuid;
BEGIN
  -- Determine episode_id from different table contexts
  IF TG_TABLE_NAME = 'production_shot_plans' THEN
    v_episode_id := COALESCE(NEW.episode_id, OLD.episode_id);
  ELSIF TG_TABLE_NAME = 'production_shot_prompts' THEN
    SELECT episode_id INTO v_episode_id
    FROM production_shot_plans
    WHERE id = COALESCE(NEW.shot_plan_id, OLD.shot_plan_id);
  ELSIF TG_TABLE_NAME = 'lip_sync_data' THEN
    SELECT episode_id INTO v_episode_id
    FROM production_shot_plans
    WHERE id = COALESCE(NEW.shot_plan_id, OLD.shot_plan_id);
  ELSIF TG_TABLE_NAME = 'episodes' THEN
    v_episode_id := COALESCE(NEW.id, OLD.id);
  END IF;

  -- Recalculate progress
  IF v_episode_id IS NOT NULL THEN
    PERFORM calculate_episode_progress(v_episode_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
