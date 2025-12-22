/*
  # International Copyright and AI Authorship Documentation System

  1. New Tables
    - `international_copyright_registrations` - Track copyright in foreign jurisdictions
      - `id` (uuid, primary key)
      - `parent_registration_id` (uuid, references copyright_registrations)
      - Country and treaty information
      - Registration status and details

    - `copyright_treaties` - Reference table for copyright treaties by country
      - `country_code` (text, primary key)
      - Treaty memberships and requirements

    - `ai_authorship_documentation` - Document human creative contribution for AI-assisted works
      - `id` (uuid, primary key)
      - `registration_id` (uuid, references copyright_registrations)
      - AI tool details and usage
      - Human creative contributions
      - Certification statements

  2. Security
    - Enable RLS on all tables
    - Policies for organization member access
*/

-- International Copyright Registrations Table
CREATE TABLE IF NOT EXISTS international_copyright_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_registration_id uuid NOT NULL REFERENCES copyright_registrations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Country Information
  country_code text NOT NULL,
  country_name text NOT NULL,
  
  -- Treaty Basis
  treaty_basis text NOT NULL DEFAULT 'berne',
  receives_automatic_protection boolean DEFAULT true,
  
  -- Registration Details
  registration_required boolean DEFAULT false,
  registration_status text DEFAULT 'not_required',
  registration_number text,
  registration_date date,
  registration_expiry_date date,
  
  -- Local Agent
  local_agent_required boolean DEFAULT false,
  local_agent_name text,
  local_agent_contact jsonb,
  
  -- Translation
  translation_required boolean DEFAULT false,
  translation_status text DEFAULT 'not_required',
  translated_title text,
  translation_date date,
  
  -- Enforcement
  enforcement_notes text,
  enforcement_contacts jsonb,
  takedown_procedure text,
  
  -- Fees
  registration_fee numeric(10,2),
  currency_code text DEFAULT 'USD',
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_treaty_basis CHECK (treaty_basis IN ('berne', 'wipo_wct', 'wipo_wppt', 'trips', 'bilateral', 'none')),
  CONSTRAINT valid_registration_status CHECK (registration_status IN ('not_required', 'pending', 'submitted', 'registered', 'rejected', 'expired')),
  CONSTRAINT valid_translation_status CHECK (translation_status IN ('not_required', 'pending', 'in_progress', 'completed', 'submitted'))
);

-- Copyright Treaties Reference Table
CREATE TABLE IF NOT EXISTS copyright_treaties (
  country_code text PRIMARY KEY,
  country_name text NOT NULL,
  
  -- Treaty Memberships
  berne_member boolean DEFAULT false,
  berne_join_date date,
  wipo_wct_member boolean DEFAULT false,
  wipo_wct_join_date date,
  wipo_wppt_member boolean DEFAULT false,
  wipo_wppt_join_date date,
  trips_member boolean DEFAULT false,
  trips_join_date date,
  
  -- Registration Requirements
  registration_required boolean DEFAULT false,
  formalities_required boolean DEFAULT false,
  deposit_required boolean DEFAULT false,
  
  -- Protection Details
  term_of_protection_years integer DEFAULT 70,
  term_basis text DEFAULT 'life_plus',
  moral_rights_protected boolean DEFAULT true,
  
  -- Special Requirements
  special_requirements jsonb,
  enforcement_strength text DEFAULT 'moderate',
  
  -- Administrative
  copyright_office_name text,
  copyright_office_url text,
  registration_fee_usd numeric(10,2),
  
  -- Metadata
  notes text,
  last_updated timestamptz DEFAULT now(),
  
  CONSTRAINT valid_term_basis CHECK (term_basis IN ('life_plus', 'publication_date', 'creation_date', 'fixed_term')),
  CONSTRAINT valid_enforcement_strength CHECK (enforcement_strength IN ('weak', 'moderate', 'strong', 'very_strong'))
);

-- AI Authorship Documentation Table
CREATE TABLE IF NOT EXISTS ai_authorship_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES copyright_registrations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- AI Tool Information
  ai_tool_name text NOT NULL,
  ai_tool_provider text,
  ai_tool_version text,
  ai_tool_url text,
  
  -- Generation Details
  generation_date date,
  generation_session_id text,
  prompt_used text,
  prompt_iterations integer DEFAULT 1,
  total_generations integer DEFAULT 1,
  selected_output_number integer,
  
  -- Human Modification Tracking
  modification_percentage integer DEFAULT 0,
  modifications_made jsonb DEFAULT '[]'::jsonb,
  modification_description text,
  
  -- Human Creative Decisions
  human_creative_decisions jsonb DEFAULT '{}'::jsonb,
  concept_development text,
  creative_direction text,
  narrative_structure text,
  dialogue_refinement text,
  visual_direction text,
  character_development text,
  plot_decisions text,
  
  -- Supporting Evidence
  evidence_files jsonb DEFAULT '[]'::jsonb,
  drafts_preserved boolean DEFAULT false,
  draft_file_urls text[],
  
  -- Certification
  certification_statement text,
  certification_date date,
  certifier_name text,
  certifier_title text,
  
  -- Analysis Results
  ai_contribution_analysis jsonb,
  human_contribution_analysis jsonb,
  copyrightable_elements jsonb,
  non_copyrightable_elements jsonb,
  
  -- Compliance
  disclosure_compliant boolean DEFAULT false,
  copyright_office_compliant boolean DEFAULT false,
  compliance_notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_modification_percentage CHECK (modification_percentage >= 0 AND modification_percentage <= 100)
);

-- AI Tool Registry (Reference)
CREATE TABLE IF NOT EXISTS ai_tool_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text NOT NULL,
  provider text NOT NULL,
  tool_type text NOT NULL DEFAULT 'text_generation',
  description text,
  copyright_considerations text,
  terms_of_service_url text,
  output_ownership text,
  attribution_requirements text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_tool_type CHECK (tool_type IN ('text_generation', 'image_generation', 'audio_generation', 'video_generation', 'code_generation', 'multi_modal')),
  UNIQUE(tool_name, provider)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_intl_copyright_parent ON international_copyright_registrations(parent_registration_id);
CREATE INDEX IF NOT EXISTS idx_intl_copyright_org ON international_copyright_registrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_intl_copyright_country ON international_copyright_registrations(country_code);
CREATE INDEX IF NOT EXISTS idx_ai_authorship_registration ON ai_authorship_documentation(registration_id);
CREATE INDEX IF NOT EXISTS idx_ai_authorship_org ON ai_authorship_documentation(organization_id);
CREATE INDEX IF NOT EXISTS idx_treaties_berne ON copyright_treaties(berne_member);

-- Enable RLS
ALTER TABLE international_copyright_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE copyright_treaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_authorship_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies for international_copyright_registrations
CREATE POLICY "Organization members can view international copyright"
  ON international_copyright_registrations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert international copyright"
  ON international_copyright_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update international copyright"
  ON international_copyright_registrations FOR UPDATE
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

CREATE POLICY "Organization members can delete international copyright"
  ON international_copyright_registrations FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Copyright treaties is read-only reference data
CREATE POLICY "Anyone can view copyright treaties"
  ON copyright_treaties FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for ai_authorship_documentation
CREATE POLICY "Organization members can view AI authorship docs"
  ON ai_authorship_documentation FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert AI authorship docs"
  ON ai_authorship_documentation FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update AI authorship docs"
  ON ai_authorship_documentation FOR UPDATE
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

CREATE POLICY "Organization members can delete AI authorship docs"
  ON ai_authorship_documentation FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- AI Tool Registry is read-only reference data
CREATE POLICY "Anyone can view AI tool registry"
  ON ai_tool_registry FOR SELECT
  TO authenticated
  USING (true);

-- Update triggers
CREATE TRIGGER update_intl_copyright_timestamp
  BEFORE UPDATE ON international_copyright_registrations
  FOR EACH ROW EXECUTE FUNCTION update_copyright_timestamp();

CREATE TRIGGER update_ai_authorship_timestamp
  BEFORE UPDATE ON ai_authorship_documentation
  FOR EACH ROW EXECUTE FUNCTION update_copyright_timestamp();
