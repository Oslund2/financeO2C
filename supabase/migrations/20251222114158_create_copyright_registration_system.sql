/*
  # Copyright Registration System

  1. New Tables
    - `copyright_registrations` - Core table for copyright applications
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `title` (text) - Title of the work
      - `registration_type` (text) - script, character, series, collection
      - `work_type` (text) - dramatic_work, visual_art, literary_work, audiovisual
      - `status` (text) - draft, pending_review, submitted, registered, rejected
      - Work details and dates
      - Author and claimant information
      - AI contribution tracking fields
      - Registration details

    - `copyright_deposits` - Deposit materials for registration
      - `id` (uuid, primary key)
      - `registration_id` (uuid, references copyright_registrations)
      - `deposit_type` (text) - identifying_material, complete_copy, best_edition
      - File information and submission status

    - `copyright_search_results` - Search results and conflict analysis
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `search_query` (text)
      - `results` (jsonb)
      - Analysis fields

  2. Security
    - Enable RLS on all tables
    - Policies for organization member access
*/

-- Copyright Registrations Table
CREATE TABLE IF NOT EXISTS copyright_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  title text NOT NULL,
  alternate_titles text[],
  registration_type text NOT NULL DEFAULT 'script',
  work_type text NOT NULL DEFAULT 'dramatic_work',
  status text NOT NULL DEFAULT 'draft',
  
  -- Work Details
  description text,
  year_of_completion integer,
  creation_date date,
  publication_status text DEFAULT 'unpublished',
  publication_date date,
  publication_country text,
  publication_details text,
  
  -- Author Information
  author_name text NOT NULL,
  author_citizenship text,
  author_domicile text,
  author_birth_year integer,
  author_death_year integer,
  author_type text DEFAULT 'individual',
  is_anonymous boolean DEFAULT false,
  is_pseudonymous boolean DEFAULT false,
  pseudonym text,
  nature_of_authorship text,
  
  -- Claimant Information
  claimant_name text,
  claimant_address jsonb,
  claimant_type text DEFAULT 'individual',
  transfer_statement text,
  
  -- AI Contribution Tracking
  contains_ai_generated_content boolean DEFAULT false,
  ai_contribution_percentage integer DEFAULT 0,
  ai_tools_used text[],
  ai_tool_details jsonb,
  human_authorship_statement text,
  human_creative_elements jsonb,
  ai_disclosure_statement text,
  ai_documentation_complete boolean DEFAULT false,
  
  -- Source References
  source_script_id uuid REFERENCES scripts(id) ON DELETE SET NULL,
  source_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  source_series_id uuid REFERENCES series(id) ON DELETE SET NULL,
  source_episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  
  -- Registration Details
  application_data jsonb,
  application_fee numeric(10,2),
  fee_paid boolean DEFAULT false,
  payment_date timestamptz,
  payment_reference text,
  submission_date timestamptz,
  registration_number text,
  registration_date date,
  certificate_url text,
  examiner_notes text,
  rejection_reason text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_registration_type CHECK (registration_type IN ('script', 'character', 'series', 'collection', 'episode')),
  CONSTRAINT valid_work_type CHECK (work_type IN ('dramatic_work', 'visual_art', 'literary_work', 'audiovisual', 'motion_picture', 'sound_recording', 'compilation')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'pending_review', 'submitted', 'under_examination', 'registered', 'rejected', 'abandoned')),
  CONSTRAINT valid_publication_status CHECK (publication_status IN ('unpublished', 'published', 'published_with_notice', 'published_without_notice')),
  CONSTRAINT valid_author_type CHECK (author_type IN ('individual', 'work_for_hire', 'joint_work', 'collective_work', 'anonymous', 'pseudonymous')),
  CONSTRAINT valid_ai_contribution CHECK (ai_contribution_percentage >= 0 AND ai_contribution_percentage <= 100)
);

-- Copyright Deposits Table
CREATE TABLE IF NOT EXISTS copyright_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES copyright_registrations(id) ON DELETE CASCADE,
  
  -- Deposit Information
  deposit_type text NOT NULL DEFAULT 'identifying_material',
  deposit_category text,
  description text,
  
  -- File Information
  file_name text,
  file_url text,
  file_type text,
  file_size_bytes bigint,
  file_hash text,
  
  -- Submission Status
  submission_status text DEFAULT 'pending',
  submitted_at timestamptz,
  accepted_at timestamptz,
  rejection_reason text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_deposit_type CHECK (deposit_type IN ('identifying_material', 'complete_copy', 'best_edition', 'supplementary')),
  CONSTRAINT valid_submission_status CHECK (submission_status IN ('pending', 'uploaded', 'submitted', 'accepted', 'rejected'))
);

-- Copyright Search Results Table
CREATE TABLE IF NOT EXISTS copyright_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES copyright_registrations(id) ON DELETE CASCADE,
  
  -- Search Information
  search_query text NOT NULL,
  search_type text NOT NULL DEFAULT 'title',
  search_date timestamptz DEFAULT now(),
  
  -- Results
  results jsonb DEFAULT '[]'::jsonb,
  total_results integer DEFAULT 0,
  
  -- Analysis
  relevance_scores jsonb,
  similarity_analysis jsonb,
  conflict_assessment text,
  conflict_risk_level text DEFAULT 'low',
  recommendation text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_search_type CHECK (search_type IN ('title', 'author', 'keyword', 'registration_number', 'comprehensive')),
  CONSTRAINT valid_conflict_risk CHECK (conflict_risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_copyright_registrations_org ON copyright_registrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_copyright_registrations_status ON copyright_registrations(status);
CREATE INDEX IF NOT EXISTS idx_copyright_registrations_type ON copyright_registrations(registration_type);
CREATE INDEX IF NOT EXISTS idx_copyright_registrations_source_script ON copyright_registrations(source_script_id);
CREATE INDEX IF NOT EXISTS idx_copyright_registrations_source_character ON copyright_registrations(source_character_id);
CREATE INDEX IF NOT EXISTS idx_copyright_deposits_registration ON copyright_deposits(registration_id);
CREATE INDEX IF NOT EXISTS idx_copyright_search_results_org ON copyright_search_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_copyright_search_results_registration ON copyright_search_results(registration_id);

-- Enable RLS
ALTER TABLE copyright_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE copyright_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE copyright_search_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for copyright_registrations
CREATE POLICY "Organization members can view copyright registrations"
  ON copyright_registrations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert copyright registrations"
  ON copyright_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update copyright registrations"
  ON copyright_registrations FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete copyright registrations"
  ON copyright_registrations FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for copyright_deposits
CREATE POLICY "Organization members can view copyright deposits"
  ON copyright_deposits FOR SELECT
  TO authenticated
  USING (
    registration_id IN (
      SELECT id FROM copyright_registrations 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can insert copyright deposits"
  ON copyright_deposits FOR INSERT
  TO authenticated
  WITH CHECK (
    registration_id IN (
      SELECT id FROM copyright_registrations 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can update copyright deposits"
  ON copyright_deposits FOR UPDATE
  TO authenticated
  USING (
    registration_id IN (
      SELECT id FROM copyright_registrations 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    registration_id IN (
      SELECT id FROM copyright_registrations 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can delete copyright deposits"
  ON copyright_deposits FOR DELETE
  TO authenticated
  USING (
    registration_id IN (
      SELECT id FROM copyright_registrations 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for copyright_search_results
CREATE POLICY "Organization members can view copyright search results"
  ON copyright_search_results FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert copyright search results"
  ON copyright_search_results FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete copyright search results"
  ON copyright_search_results FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_copyright_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_copyright_registrations_timestamp
  BEFORE UPDATE ON copyright_registrations
  FOR EACH ROW EXECUTE FUNCTION update_copyright_timestamp();

CREATE TRIGGER update_copyright_deposits_timestamp
  BEFORE UPDATE ON copyright_deposits
  FOR EACH ROW EXECUTE FUNCTION update_copyright_timestamp();
