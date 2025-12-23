/*
  # Create Patent Workflow State Persistence System

  This migration adds support for saving patent generation workflow state,
  enabling users to resume from the last successful step if generation fails.

  1. New Tables
    - `patent_workflow_state`
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key) - The patent application being generated
      - `organization_id` (uuid, foreign key) - Organization ownership
      - `user_id` (uuid) - User who initiated the workflow
      - `current_step` (text) - Current step in the workflow
      - `completed_steps` (jsonb) - Array of completed step names with timestamps
      - `step_data` (jsonb) - Intermediate data from each completed step
      - `status` (text) - pending, in_progress, completed, failed, paused
      - `error_message` (text) - Error message if failed
      - `progress_percentage` (integer) - 0-100 progress indicator
      - `started_at` (timestamptz) - When workflow was started
      - `last_updated` (timestamptz) - Last activity timestamp
      - `completed_at` (timestamptz) - When workflow completed (null if incomplete)

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users based on organization membership

  3. Indexes
    - Index on application_id for quick lookups
    - Index on status for finding incomplete workflows
*/

CREATE TABLE IF NOT EXISTS patent_workflow_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES patent_applications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  current_step text NOT NULL DEFAULT 'initializing',
  completed_steps jsonb DEFAULT '[]'::jsonb,
  step_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  progress_percentage integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_workflow_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'paused')),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_workflow_state_application ON patent_workflow_state(application_id);
CREATE INDEX IF NOT EXISTS idx_workflow_state_status ON patent_workflow_state(status);
CREATE INDEX IF NOT EXISTS idx_workflow_state_org ON patent_workflow_state(organization_id);

ALTER TABLE patent_workflow_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow state in their organization"
  ON patent_workflow_state FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workflow state in their organization"
  ON patent_workflow_state FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workflow state in their organization"
  ON patent_workflow_state FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workflow state in their organization"
  ON patent_workflow_state FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_workflow_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_workflow_state_timestamp'
  ) THEN
    CREATE TRIGGER update_workflow_state_timestamp
      BEFORE UPDATE ON patent_workflow_state
      FOR EACH ROW
      EXECUTE FUNCTION update_workflow_last_updated();
  END IF;
END $$;
