/*
  # Create Production Draft Sessions System

  1. New Tables
    - `production_draft_sessions`
      - `id` (uuid, primary key)
      - `script_id` (uuid, references scripts)
      - `series_id` (uuid, references series)
      - `organization_id` (uuid, references organizations)
      - `workflow_step` (text) - Current step: 'select', 'configure', 'generating', 'review', 'batches'
      - `generation_options` (jsonb) - Stores pacing, includeEstablishing, etc.
      - `generated_shot_ids` (text[]) - Array of shot plan IDs
      - `batch_recommendations` (jsonb) - Stores batch configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `production_draft_sessions` table
    - Add policies for authenticated users to manage their own draft sessions

  3. Indexes
    - Add index on (script_id, organization_id, updated_at DESC) for fast lookups
*/

CREATE TABLE IF NOT EXISTS production_draft_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_step TEXT NOT NULL DEFAULT 'select',
  generation_options JSONB DEFAULT '{}',
  generated_shot_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  batch_recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_draft_sessions_lookup 
  ON production_draft_sessions(script_id, organization_id, updated_at DESC);

-- Enable RLS
ALTER TABLE production_draft_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view draft sessions in their organization
CREATE POLICY "Users can view organization draft sessions"
  ON production_draft_sessions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create draft sessions in their organization
CREATE POLICY "Users can create organization draft sessions"
  ON production_draft_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update draft sessions in their organization
CREATE POLICY "Users can update organization draft sessions"
  ON production_draft_sessions
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete draft sessions in their organization
CREATE POLICY "Users can delete organization draft sessions"
  ON production_draft_sessions
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_production_draft_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER production_draft_sessions_updated_at
  BEFORE UPDATE ON production_draft_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_production_draft_sessions_updated_at();
