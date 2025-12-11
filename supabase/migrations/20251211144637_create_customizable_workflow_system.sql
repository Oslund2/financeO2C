/*
  # Customizable Workflow and Approval System

  1. New Tables
    - `workflow_templates`
      - Reusable workflow definitions
      - Brand-specific production processes
      - Stage and approval chain configuration
    
    - `workflow_instances`
      - Active workflows for episodes/content
      - Progress tracking through stages
      - Current state management
    
    - `workflow_stages`
      - Individual stages in workflows
      - Dependencies and prerequisites
      - Auto-progression rules
    
    - `approval_chains`
      - Multi-level approval processes
      - Role-based approvers
      - Parallel vs sequential approvals
    
    - `approval_requests`
      - Pending approval requests
      - Reviewer assignments
      - Decision tracking
    
    - `quality_gates`
      - Quality criteria per stage
      - Automated checks
      - Manual review requirements
    
    - `workflow_notifications`
      - Notification preferences per stage
      - Alert templates
      - Escalation rules

  2. Features
    - Visual workflow editor support
    - Role-based permissions per brand
    - Deadline and milestone tracking
    - Quality gates with brand criteria
    - Escalation rules for delays
    - Workflow analytics

  3. Security
    - Enable RLS on all tables
    - Organization-scoped workflows
    - Role-based approval permissions
*/

-- Create workflow templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  
  -- Template metadata
  name text NOT NULL,
  description text,
  workflow_type text CHECK (workflow_type IN ('episode_production', 'script_approval', 'asset_creation', 'storyboard_review', 'custom')),
  
  -- Workflow configuration
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_stage_order text[] DEFAULT '{}',
  
  -- Settings
  allow_parallel_stages boolean DEFAULT false,
  allow_stage_skipping boolean DEFAULT false,
  require_all_approvals boolean DEFAULT true,
  auto_progress_enabled boolean DEFAULT false,
  
  -- Timing
  default_stage_duration_days int DEFAULT 3,
  total_estimated_days int DEFAULT 14,
  
  -- Usage
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  usage_count int DEFAULT 0,
  
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workflow instances table
CREATE TABLE IF NOT EXISTS workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES workflow_templates(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Content reference
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  script_id uuid REFERENCES scripts(id) ON DELETE CASCADE,
  storyboard_id uuid REFERENCES storyboards(id) ON DELETE CASCADE,
  
  -- Workflow status
  status text DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled', 'failed')),
  current_stage_index int DEFAULT 0,
  current_stage_name text,
  
  -- Progress tracking
  stages_completed int DEFAULT 0,
  total_stages int DEFAULT 0,
  progress_percentage decimal DEFAULT 0,
  
  -- Timing
  started_at timestamptz DEFAULT now(),
  estimated_completion_at timestamptz,
  completed_at timestamptz,
  
  -- Issues and delays
  is_delayed boolean DEFAULT false,
  delay_reason text,
  blocker_count int DEFAULT 0,
  
  -- State data
  workflow_state jsonb DEFAULT '{}'::jsonb,
  
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workflow stages table
CREATE TABLE IF NOT EXISTS workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  
  -- Stage definition
  stage_name text NOT NULL,
  stage_description text,
  stage_index int NOT NULL,
  stage_type text CHECK (stage_type IN ('review', 'approval', 'production', 'quality_check', 'custom')),
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked', 'failed')),
  
  -- Dependencies
  depends_on_stage_ids uuid[] DEFAULT '{}',
  can_run_parallel boolean DEFAULT false,
  
  -- Timing
  estimated_duration_days int DEFAULT 3,
  started_at timestamptz,
  completed_at timestamptz,
  deadline timestamptz,
  is_overdue boolean DEFAULT false,
  
  -- Assignments
  assigned_to_user_ids uuid[] DEFAULT '{}',
  assigned_to_roles text[] DEFAULT '{}',
  
  -- Quality gate reference
  quality_gate_id uuid,
  
  -- Results
  stage_output jsonb DEFAULT '{}'::jsonb,
  failure_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create approval chains table
CREATE TABLE IF NOT EXISTS approval_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  
  -- Chain configuration
  name text NOT NULL,
  description text,
  chain_type text CHECK (chain_type IN ('sequential', 'parallel', 'weighted', 'custom')),
  
  -- Approver configuration
  approver_levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Requirements
  min_approvals_required int DEFAULT 1,
  unanimous_required boolean DEFAULT false,
  allow_delegation boolean DEFAULT true,
  
  -- Timing
  approval_timeout_hours int DEFAULT 48,
  escalation_timeout_hours int DEFAULT 72,
  
  -- Settings
  is_active boolean DEFAULT true,
  
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_stage_id uuid REFERENCES workflow_stages(id) ON DELETE CASCADE,
  approval_chain_id uuid REFERENCES approval_chains(id) ON DELETE RESTRICT,
  
  -- Request details
  request_type text CHECK (request_type IN ('script', 'storyboard', 'asset', 'episode', 'quality', 'custom')),
  title text NOT NULL,
  description text,
  
  -- Content reference
  content_type text,
  content_id uuid,
  content_url text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'revision_requested', 'cancelled')),
  
  -- Approvers
  requested_from_user_ids uuid[] DEFAULT '{}',
  requested_from_roles text[] DEFAULT '{}',
  current_approver_level int DEFAULT 1,
  
  -- Decisions
  approved_by_user_ids uuid[] DEFAULT '{}',
  rejected_by_user_ids uuid[] DEFAULT '{}',
  approvals_received int DEFAULT 0,
  rejections_received int DEFAULT 0,
  
  -- Feedback
  review_notes text,
  revision_notes text[] DEFAULT '{}',
  
  -- Timing
  requested_at timestamptz DEFAULT now(),
  review_deadline timestamptz,
  escalation_deadline timestamptz,
  is_escalated boolean DEFAULT false,
  reviewed_at timestamptz,
  decided_at timestamptz,
  
  requested_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quality gates table
CREATE TABLE IF NOT EXISTS quality_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  
  -- Gate configuration
  name text NOT NULL,
  description text,
  gate_type text CHECK (gate_type IN ('automated', 'manual', 'hybrid')),
  
  -- Criteria
  quality_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Scoring
  min_quality_score decimal DEFAULT 0.7,
  weight decimal DEFAULT 1.0,
  
  -- Actions
  auto_fail_on_criteria_miss boolean DEFAULT false,
  require_manual_override boolean DEFAULT true,
  
  -- Settings
  is_active boolean DEFAULT true,
  
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workflow notifications table
CREATE TABLE IF NOT EXISTS workflow_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Notification trigger
  trigger_event text NOT NULL CHECK (trigger_event IN (
    'stage_started', 'stage_completed', 'stage_delayed', 'stage_blocked',
    'approval_requested', 'approval_received', 'approval_rejected',
    'deadline_approaching', 'deadline_missed', 'workflow_completed', 'workflow_failed'
  )),
  
  -- Recipients
  notify_user_ids uuid[] DEFAULT '{}',
  notify_roles text[] DEFAULT '{}',
  notify_creator boolean DEFAULT false,
  notify_assignees boolean DEFAULT true,
  
  -- Notification content
  notification_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Channel preferences
  send_email boolean DEFAULT true,
  send_in_app boolean DEFAULT true,
  send_slack boolean DEFAULT false,
  
  -- Timing
  delay_minutes int DEFAULT 0,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create workflow escalations table
CREATE TABLE IF NOT EXISTS workflow_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_stage_id uuid REFERENCES workflow_stages(id) ON DELETE CASCADE,
  approval_request_id uuid REFERENCES approval_requests(id) ON DELETE CASCADE,
  
  -- Escalation details
  escalation_type text CHECK (escalation_type IN ('deadline_missed', 'approval_delayed', 'quality_issue', 'blocker', 'manual')),
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Description
  title text NOT NULL,
  description text,
  
  -- Escalated to
  escalated_to_user_ids uuid[] DEFAULT '{}',
  escalated_to_roles text[] DEFAULT '{}',
  
  -- Status
  status text DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'closed')),
  resolution_notes text,
  
  escalated_by uuid,
  escalated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_org ON workflow_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_series ON workflow_templates(series_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_episode ON workflow_instances(episode_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_instance ON workflow_stages(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_status ON workflow_stages(status);
CREATE INDEX IF NOT EXISTS idx_approval_chains_org ON approval_chains(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow ON approval_requests(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_quality_gates_org ON quality_gates(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_template ON workflow_notifications(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_escalations_instance ON workflow_escalations(workflow_instance_id);

-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_templates
CREATE POLICY "Organization members can view workflow templates"
  ON workflow_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage workflow templates"
  ON workflow_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for workflow_instances
CREATE POLICY "Organization members can view workflow instances"
  ON workflow_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create workflow instances"
  ON workflow_instances FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for approval_requests
CREATE POLICY "Users can view approval requests assigned to them"
  ON approval_requests FOR SELECT
  USING (
    auth.uid() = ANY(requested_from_user_ids) OR
    requested_by = auth.uid() OR
    workflow_instance_id IN (
      SELECT id FROM workflow_instances
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Function to advance workflow to next stage
CREATE OR REPLACE FUNCTION advance_workflow_stage(
  instance_id uuid
) RETURNS void AS $$
DECLARE
  current_idx int;
  total_stages_count int;
  next_stage_name text;
BEGIN
  -- Get current stage index
  SELECT current_stage_index, total_stages INTO current_idx, total_stages_count
  FROM workflow_instances
  WHERE id = instance_id;
  
  -- Check if workflow is complete
  IF current_idx >= total_stages_count - 1 THEN
    UPDATE workflow_instances
    SET 
      status = 'completed',
      completed_at = now(),
      progress_percentage = 100,
      updated_at = now()
    WHERE id = instance_id;
    RETURN;
  END IF;
  
  -- Advance to next stage
  UPDATE workflow_instances
  SET 
    current_stage_index = current_idx + 1,
    stages_completed = stages_completed + 1,
    progress_percentage = ((current_idx + 1)::decimal / total_stages_count) * 100,
    updated_at = now()
  WHERE id = instance_id;
  
  -- Start next stage
  UPDATE workflow_stages
  SET 
    status = 'in_progress',
    started_at = now(),
    updated_at = now()
  WHERE workflow_instance_id = instance_id
  AND stage_index = current_idx + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check quality gate
CREATE OR REPLACE FUNCTION check_quality_gate(
  gate_id uuid,
  content_data jsonb
) RETURNS TABLE(
  passed boolean,
  score decimal,
  failed_criteria text[]
) AS $$
DECLARE
  gate_criteria jsonb;
  min_score decimal;
  calc_score decimal := 1.0;
  failures text[] := '{}';
BEGIN
  SELECT quality_criteria, min_quality_score INTO gate_criteria, min_score
  FROM quality_gates
  WHERE id = gate_id;
  
  -- Simplified quality check (would be more complex in production)
  -- This is a placeholder for actual quality checking logic
  
  RETURN QUERY SELECT 
    calc_score >= min_score as passed,
    calc_score as score,
    failures as failed_criteria;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;