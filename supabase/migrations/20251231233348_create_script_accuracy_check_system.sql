/*
  # Script Accuracy Check System for Historical Verification
  
  This migration creates a comprehensive fact-checking and verification system
  for historical documentary scripts. The AI analyzes scripts to identify
  verifiable claims and checks them against citations.
  
  ## New Tables
  
  1. `accuracy_check_types` - Types of verifiable claims
     - fact, date, location, person, event, quote, statistic
  
  2. `verification_statuses` - Status of each verification
     - verified, needs_citation, disputed, unverified, corrected
  
  3. `script_accuracy_reports` - Summary reports for each accuracy check run
     - Overall scores and statistics
     - Duration and completion tracking
  
  4. `script_accuracy_checks` - Individual claim verifications
     - Each verifiable claim in the script
     - AI confidence scores and reasoning
     - Links to supporting citations
  
  ## Features
  - AI-powered fact identification and verification
  - Confidence scoring for each claim
  - Citation cross-referencing
  - Script regeneration recommendations
  
  ## Security
  - RLS enabled on all tables
  - Organization-scoped access control
*/

-- Create accuracy check types enum table
CREATE TABLE IF NOT EXISTS accuracy_check_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  icon_name text,
  priority integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- Seed check types with priority (lower = more important)
INSERT INTO accuracy_check_types (id, label, description, icon_name, priority) VALUES
  ('date', 'Date/Timeline', 'Specific dates, years, or chronological claims', 'calendar', 1),
  ('person', 'Person/Identity', 'Names, identities, roles of historical figures', 'user', 2),
  ('event', 'Historical Event', 'Specific events, incidents, or occurrences', 'flag', 3),
  ('quote', 'Quote/Statement', 'Direct quotes or attributed statements', 'quote', 4),
  ('statistic', 'Statistic/Number', 'Statistics, quantities, measurements', 'bar-chart', 5),
  ('location', 'Location/Place', 'Geographic locations, addresses, places', 'map-pin', 6),
  ('fact', 'General Fact', 'Other verifiable factual claims', 'check-circle', 7),
  ('relationship', 'Relationship', 'Connections between people or entities', 'users', 8),
  ('causation', 'Cause/Effect', 'Claims about causes and consequences', 'git-branch', 9)
ON CONFLICT (id) DO NOTHING;

-- Create verification status enum table
CREATE TABLE IF NOT EXISTS verification_statuses (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  color text,
  icon_name text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed verification statuses
INSERT INTO verification_statuses (id, label, description, color, icon_name, sort_order) VALUES
  ('verified', 'Verified', 'Claim is supported by citations and confirmed accurate', 'green', 'check-circle', 1),
  ('needs_citation', 'Needs Citation', 'Claim appears accurate but lacks supporting citation', 'yellow', 'alert-circle', 2),
  ('unverified', 'Unverified', 'Claim could not be verified - insufficient information', 'gray', 'help-circle', 3),
  ('disputed', 'Disputed', 'Claim conflicts with historical record or citations', 'red', 'x-circle', 4),
  ('corrected', 'Corrected', 'Claim was disputed but has been corrected in script', 'blue', 'refresh-cw', 5)
ON CONFLICT (id) DO NOTHING;

-- Create accuracy reports table (one per check run)
CREATE TABLE IF NOT EXISTS script_accuracy_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  total_claims_checked integer DEFAULT 0,
  verified_count integer DEFAULT 0,
  needs_citation_count integer DEFAULT 0,
  disputed_count integer DEFAULT 0,
  unverified_count integer DEFAULT 0,
  overall_confidence_score integer DEFAULT 0,
  ai_model_used text,
  check_duration_seconds integer,
  status text DEFAULT 'pending',
  error_message text,
  recommendations text[],
  should_regenerate boolean DEFAULT false,
  regeneration_priority text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create individual accuracy checks table
CREATE TABLE IF NOT EXISTS script_accuracy_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES script_accuracy_reports(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  check_type text REFERENCES accuracy_check_types(id),
  checked_item text NOT NULL,
  original_text text,
  location_act integer,
  location_scene integer,
  location_line_number integer,
  verification_status text REFERENCES verification_statuses(id) DEFAULT 'unverified',
  ai_confidence_score integer DEFAULT 0,
  ai_reasoning text,
  supporting_citation_ids uuid[],
  suggested_correction text,
  correction_source text,
  flagged_for_review boolean DEFAULT false,
  reviewer_notes text,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accuracy_reports_script_id ON script_accuracy_reports(script_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_reports_org_id ON script_accuracy_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_reports_status ON script_accuracy_reports(status);
CREATE INDEX IF NOT EXISTS idx_accuracy_checks_report_id ON script_accuracy_checks(report_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_checks_script_id ON script_accuracy_checks(script_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_checks_status ON script_accuracy_checks(verification_status);
CREATE INDEX IF NOT EXISTS idx_accuracy_checks_flagged ON script_accuracy_checks(flagged_for_review) WHERE flagged_for_review = true;
CREATE INDEX IF NOT EXISTS idx_accuracy_checks_unresolved ON script_accuracy_checks(resolved) WHERE resolved = false;

-- Enable RLS
ALTER TABLE accuracy_check_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_accuracy_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_accuracy_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enum tables (read-only reference data)
CREATE POLICY "Anyone can read accuracy check types"
  ON accuracy_check_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can read accuracy check types"
  ON accuracy_check_types FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can read verification statuses"
  ON verification_statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can read verification statuses"
  ON verification_statuses FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for script_accuracy_reports
CREATE POLICY "Users can read accuracy reports for their organization"
  ON script_accuracy_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can insert accuracy reports for their organization"
  ON script_accuracy_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can update accuracy reports for their organization"
  ON script_accuracy_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can delete accuracy reports for their organization"
  ON script_accuracy_reports FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- RLS Policies for script_accuracy_checks
CREATE POLICY "Users can read accuracy checks for their organization"
  ON script_accuracy_checks FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can insert accuracy checks for their organization"
  ON script_accuracy_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can update accuracy checks for their organization"
  ON script_accuracy_checks FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can delete accuracy checks for their organization"
  ON script_accuracy_checks FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- Anon policies for development
CREATE POLICY "Anon can read all accuracy reports"
  ON script_accuracy_reports FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert accuracy reports"
  ON script_accuracy_reports FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update accuracy reports"
  ON script_accuracy_reports FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete accuracy reports"
  ON script_accuracy_reports FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can read all accuracy checks"
  ON script_accuracy_checks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert accuracy checks"
  ON script_accuracy_checks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update accuracy checks"
  ON script_accuracy_checks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete accuracy checks"
  ON script_accuracy_checks FOR DELETE
  TO anon
  USING (true);

-- Function to get latest accuracy report for a script
CREATE OR REPLACE FUNCTION get_latest_accuracy_report(p_script_id uuid)
RETURNS script_accuracy_reports
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report script_accuracy_reports;
BEGIN
  SELECT * INTO v_report
  FROM script_accuracy_reports
  WHERE script_id = p_script_id
    AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;
  
  RETURN v_report;
END;
$$;

-- Function to get accuracy summary for a script
CREATE OR REPLACE FUNCTION get_script_accuracy_summary(p_script_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report script_accuracy_reports;
  v_result jsonb;
BEGIN
  SELECT * INTO v_report
  FROM script_accuracy_reports
  WHERE script_id = p_script_id
    AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_report', false,
      'status', 'not_checked'
    );
  END IF;
  
  v_result := jsonb_build_object(
    'has_report', true,
    'report_id', v_report.id,
    'overall_score', v_report.overall_confidence_score,
    'total_claims', v_report.total_claims_checked,
    'verified', v_report.verified_count,
    'needs_citation', v_report.needs_citation_count,
    'disputed', v_report.disputed_count,
    'unverified', v_report.unverified_count,
    'should_regenerate', v_report.should_regenerate,
    'checked_at', v_report.completed_at,
    'status', CASE 
      WHEN v_report.disputed_count > 0 THEN 'needs_review'
      WHEN v_report.needs_citation_count > 0 THEN 'needs_citations'
      WHEN v_report.overall_confidence_score >= 80 THEN 'verified'
      ELSE 'partial'
    END
  );
  
  RETURN v_result;
END;
$$;

-- Function to count unresolved issues
CREATE OR REPLACE FUNCTION count_unresolved_accuracy_issues(p_script_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_disputed integer;
  v_needs_citation integer;
  v_flagged integer;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE verification_status = 'disputed' AND NOT resolved),
    COUNT(*) FILTER (WHERE verification_status = 'needs_citation' AND NOT resolved),
    COUNT(*) FILTER (WHERE flagged_for_review AND NOT resolved)
  INTO v_disputed, v_needs_citation, v_flagged
  FROM script_accuracy_checks
  WHERE script_id = p_script_id;
  
  RETURN jsonb_build_object(
    'disputed', v_disputed,
    'needs_citation', v_needs_citation,
    'flagged', v_flagged,
    'total', v_disputed + v_needs_citation
  );
END;
$$;

-- Function to mark check as resolved
CREATE OR REPLACE FUNCTION resolve_accuracy_check(
  p_check_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE script_accuracy_checks
  SET 
    resolved = true,
    resolved_at = now(),
    resolved_by = auth.uid(),
    reviewer_notes = COALESCE(p_notes, reviewer_notes),
    updated_at = now()
  WHERE id = p_check_id;
  
  RETURN FOUND;
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_latest_accuracy_report(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_script_accuracy_summary(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION count_unresolved_accuracy_issues(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION resolve_accuracy_check(uuid, text) TO authenticated, anon;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_accuracy_checks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accuracy_checks_updated_at
  BEFORE UPDATE ON script_accuracy_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_accuracy_checks_updated_at();
