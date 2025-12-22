/*
  # Trademark Application System

  1. New Tables
    - `trademark_applications` - Core table for trademark applications
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - Mark details (type, text, description)
      - Classification (Nice Classification, goods/services)
      - Filing basis (use in commerce, intent to use)
      - Owner information
      - Status tracking
      - Registration details

    - `trademark_specimens` - Specimens showing mark in use
      - `id` (uuid, primary key)
      - `application_id` (uuid, references trademark_applications)
      - Specimen details and file information

    - `trademark_search_results` - Search results and conflict analysis
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - Search details and conflict analysis

    - `nice_classifications` - Reference table for Nice Classification
      - All 45 classes with descriptions

  2. Security
    - Enable RLS on all tables
    - Policies for organization member access
*/

-- Trademark Applications Table
CREATE TABLE IF NOT EXISTS trademark_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Mark Information
  mark_type text NOT NULL DEFAULT 'word_mark',
  mark_text text,
  mark_description text,
  mark_image_url text,
  design_search_codes text[],
  mark_colors text[],
  color_claim text,
  is_stylized boolean DEFAULT false,
  translation text,
  transliteration text,
  
  -- Classification
  international_class integer NOT NULL,
  additional_classes integer[],
  goods_services_description text NOT NULL,
  
  -- Filing Basis
  filing_basis text NOT NULL DEFAULT 'use_in_commerce',
  first_use_date date,
  first_use_commerce_date date,
  foreign_registration_country text,
  foreign_registration_number text,
  foreign_registration_date date,
  foreign_application_country text,
  foreign_application_number text,
  foreign_application_date date,
  
  -- Owner Information
  owner_name text NOT NULL,
  owner_type text NOT NULL DEFAULT 'individual',
  owner_citizenship text,
  owner_state_of_organization text,
  owner_address jsonb,
  
  -- Attorney/Representative
  attorney_name text,
  attorney_bar_membership text,
  attorney_email text,
  attorney_address jsonb,
  
  -- Source References
  source_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  source_series_id uuid REFERENCES series(id) ON DELETE SET NULL,
  
  -- Status Tracking
  status text NOT NULL DEFAULT 'draft',
  status_date timestamptz DEFAULT now(),
  
  -- USPTO Information
  serial_number text,
  filing_date date,
  publication_date date,
  registration_number text,
  registration_date date,
  
  -- Examination
  office_action_date date,
  office_action_response_due date,
  office_action_details jsonb,
  examiner_name text,
  examiner_notes text,
  
  -- Fees
  application_fee numeric(10,2),
  fee_paid boolean DEFAULT false,
  payment_date timestamptz,
  payment_reference text,
  
  -- Maintenance
  declaration_of_use_due date,
  renewal_due date,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_mark_type CHECK (mark_type IN ('word_mark', 'design_mark', 'combined_mark', 'sound_mark', 'motion_mark')),
  CONSTRAINT valid_filing_basis CHECK (filing_basis IN ('use_in_commerce', 'intent_to_use', 'foreign_registration', 'foreign_application')),
  CONSTRAINT valid_owner_type CHECK (owner_type IN ('individual', 'corporation', 'llc', 'partnership', 'trust', 'joint_venture', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'pending_review', 'filed', 'published', 'opposed', 'registered', 'abandoned', 'cancelled', 'expired')),
  CONSTRAINT valid_international_class CHECK (international_class >= 1 AND international_class <= 45)
);

-- Trademark Specimens Table
CREATE TABLE IF NOT EXISTS trademark_specimens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES trademark_applications(id) ON DELETE CASCADE,
  
  -- Specimen Information
  specimen_type text NOT NULL DEFAULT 'product_label',
  class_number integer NOT NULL,
  description text,
  
  -- File Information
  file_name text,
  file_url text,
  file_type text,
  file_size_bytes bigint,
  
  -- Usage Information
  use_date date,
  use_location text,
  
  -- Submission Status
  submission_status text DEFAULT 'pending',
  submitted_at timestamptz,
  accepted_at timestamptz,
  rejection_reason text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_specimen_type CHECK (specimen_type IN ('product_label', 'product_tag', 'product_packaging', 'product_display', 'website_screenshot', 'advertisement', 'brochure', 'promotional_material', 'store_signage', 'other')),
  CONSTRAINT valid_submission_status CHECK (submission_status IN ('pending', 'uploaded', 'submitted', 'accepted', 'rejected'))
);

-- Trademark Search Results Table
CREATE TABLE IF NOT EXISTS trademark_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id uuid REFERENCES trademark_applications(id) ON DELETE CASCADE,
  
  -- Search Information
  search_query text NOT NULL,
  search_type text NOT NULL DEFAULT 'knockout',
  search_date timestamptz DEFAULT now(),
  
  -- Results
  results jsonb DEFAULT '[]'::jsonb,
  total_results integer DEFAULT 0,
  
  -- Analysis
  phonetic_matches jsonb,
  visual_matches jsonb,
  conceptual_matches jsonb,
  likelihood_of_confusion_score numeric(5,2),
  conflict_analysis text,
  conflict_risk_level text DEFAULT 'low',
  recommendation text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_search_type CHECK (search_type IN ('knockout', 'comprehensive', 'design_code', 'phonetic', 'goods_services')),
  CONSTRAINT valid_conflict_risk CHECK (conflict_risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- Nice Classification Reference Table
CREATE TABLE IF NOT EXISTS nice_classifications (
  class_number integer PRIMARY KEY,
  class_heading text NOT NULL,
  class_description text NOT NULL,
  example_goods_services text[],
  common_terms text[],
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trademark_applications_org ON trademark_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_trademark_applications_status ON trademark_applications(status);
CREATE INDEX IF NOT EXISTS idx_trademark_applications_class ON trademark_applications(international_class);
CREATE INDEX IF NOT EXISTS idx_trademark_applications_source_character ON trademark_applications(source_character_id);
CREATE INDEX IF NOT EXISTS idx_trademark_applications_source_series ON trademark_applications(source_series_id);
CREATE INDEX IF NOT EXISTS idx_trademark_specimens_application ON trademark_specimens(application_id);
CREATE INDEX IF NOT EXISTS idx_trademark_search_results_org ON trademark_search_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_trademark_search_results_application ON trademark_search_results(application_id);

-- Enable RLS
ALTER TABLE trademark_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trademark_specimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE trademark_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE nice_classifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trademark_applications
CREATE POLICY "Organization members can view trademark applications"
  ON trademark_applications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert trademark applications"
  ON trademark_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can update trademark applications"
  ON trademark_applications FOR UPDATE
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

CREATE POLICY "Organization members can delete trademark applications"
  ON trademark_applications FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for trademark_specimens
CREATE POLICY "Organization members can view trademark specimens"
  ON trademark_specimens FOR SELECT
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM trademark_applications 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can insert trademark specimens"
  ON trademark_specimens FOR INSERT
  TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT id FROM trademark_applications 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can update trademark specimens"
  ON trademark_specimens FOR UPDATE
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM trademark_applications 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT id FROM trademark_applications 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can delete trademark specimens"
  ON trademark_specimens FOR DELETE
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM trademark_applications 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for trademark_search_results
CREATE POLICY "Organization members can view trademark search results"
  ON trademark_search_results FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can insert trademark search results"
  ON trademark_search_results FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete trademark search results"
  ON trademark_search_results FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Nice Classifications is read-only reference data
CREATE POLICY "Anyone can view Nice classifications"
  ON nice_classifications FOR SELECT
  TO authenticated
  USING (true);

-- Update triggers for timestamps
CREATE TRIGGER update_trademark_applications_timestamp
  BEFORE UPDATE ON trademark_applications
  FOR EACH ROW EXECUTE FUNCTION update_copyright_timestamp();

CREATE TRIGGER update_trademark_specimens_timestamp
  BEFORE UPDATE ON trademark_specimens
  FOR EACH ROW EXECUTE FUNCTION update_copyright_timestamp();
