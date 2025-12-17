/*
  # Patent Intelligence System

  1. New Tables
    - `patent_novelty_analyses`
      - Stores AI analysis of codebase features and their novelty
      - Links to patent applications
      - Tracks feature extraction and novelty scoring

    - `patent_prior_art_search_results`
      - Caches patent search results from USPTO and Google Patents
      - Stores relevance scores and technical similarity metrics
      - Links to patent applications

    - `patent_differentiation_reports`
      - Stores comparative analysis between application and prior art
      - Tracks points of novelty and technical advantages
      - Links to patent applications and search results

    - `patent_feature_mappings`
      - Maps extracted code features to patent claims
      - Tracks which services/functions support which claims
      - Links features to novelty analyses

    - `patent_generation_configs`
      - Stores user preferences for patent generation
      - Enables regeneration with preserved edits
      - Tracks generation parameters

  2. Changes to Existing Tables
    - Add fields to `patent_applications` for intelligence features
    - Add approval scoring and confidence metrics

  3. Security
    - Enable RLS on all new tables
    - Restrict access to organization members
*/

-- Patent Novelty Analyses Table
CREATE TABLE IF NOT EXISTS patent_novelty_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patent_application_id uuid REFERENCES patent_applications(id) ON DELETE CASCADE,
  analysis_version integer DEFAULT 1,

  -- Feature Extraction
  extracted_features jsonb DEFAULT '[]'::jsonb,
  service_files_analyzed text[] DEFAULT '{}',
  algorithms_identified jsonb DEFAULT '[]'::jsonb,
  data_structures_identified jsonb DEFAULT '[]'::jsonb,
  integration_patterns jsonb DEFAULT '[]'::jsonb,

  -- Novelty Scoring
  overall_novelty_score numeric(5,2) DEFAULT 0,
  feature_novelty_scores jsonb DEFAULT '{}'::jsonb,
  patentability_assessment text,
  novelty_strengths jsonb DEFAULT '[]'::jsonb,
  novelty_weaknesses jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,

  -- Technical Metrics
  technical_depth_score numeric(5,2) DEFAULT 0,
  implementation_uniqueness_score numeric(5,2) DEFAULT 0,
  commercial_viability_score numeric(5,2) DEFAULT 0,

  -- AI Analysis Metadata
  analysis_model_used text DEFAULT 'gemini-2.0-flash-exp',
  analysis_prompt_version text,
  analysis_timestamp timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Patent Prior Art Search Results Table
CREATE TABLE IF NOT EXISTS patent_prior_art_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patent_application_id uuid REFERENCES patent_applications(id) ON DELETE CASCADE,

  -- Search Parameters
  search_query text NOT NULL,
  search_keywords text[] DEFAULT '{}',
  search_source text NOT NULL, -- 'google_patents', 'uspto', 'manual'
  search_timestamp timestamptz DEFAULT now(),

  -- Patent Details
  patent_number text,
  patent_title text,
  patent_abstract text,
  patent_filing_date date,
  patent_grant_date date,
  patent_assignee text,
  patent_inventors text[] DEFAULT '{}',
  patent_url text,

  -- Relevance Analysis
  relevance_score numeric(5,2) DEFAULT 0,
  technical_similarity_score numeric(5,2) DEFAULT 0,
  feature_overlap_percentage numeric(5,2) DEFAULT 0,
  similarity_explanation text,

  -- Classification
  is_blocking boolean DEFAULT false,
  is_related boolean DEFAULT true,
  relationship_type text, -- 'similar', 'improvement', 'different_approach', 'unrelated'

  -- User Actions
  user_marked_relevant boolean DEFAULT true,
  user_notes text,
  included_in_application boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Patent Differentiation Reports Table
CREATE TABLE IF NOT EXISTS patent_differentiation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patent_application_id uuid NOT NULL REFERENCES patent_applications(id) ON DELETE CASCADE,
  prior_art_result_id uuid REFERENCES patent_prior_art_search_results(id) ON DELETE CASCADE,

  -- Comparative Analysis
  points_of_novelty jsonb DEFAULT '[]'::jsonb,
  technical_advantages jsonb DEFAULT '[]'::jsonb,
  feature_comparison_matrix jsonb DEFAULT '{}'::jsonb,

  -- Differentiation Narrative
  differentiation_summary text,
  improvement_quantification jsonb DEFAULT '{}'::jsonb,
  unexpected_results text,
  non_obviousness_argument text,

  -- Scores
  differentiation_strength_score numeric(5,2) DEFAULT 0,
  patent_distance_score numeric(5,2) DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Patent Feature Mappings Table
CREATE TABLE IF NOT EXISTS patent_feature_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patent_application_id uuid NOT NULL REFERENCES patent_applications(id) ON DELETE CASCADE,
  novelty_analysis_id uuid REFERENCES patent_novelty_analyses(id) ON DELETE CASCADE,

  -- Feature Details
  feature_name text NOT NULL,
  feature_type text NOT NULL, -- 'algorithm', 'data_structure', 'integration', 'ui_pattern', 'optimization'
  source_file_path text,
  source_line_range text,

  -- Code Reference
  code_snippet text,
  technical_description text,

  -- Claim Mapping
  mapped_claim_numbers integer[] DEFAULT '{}',
  claim_type text, -- 'independent', 'dependent', 'method', 'system', 'apparatus'

  -- Novelty Assessment
  novelty_strength text DEFAULT 'moderate', -- 'strong', 'moderate', 'weak'
  is_core_innovation boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

-- Patent Generation Configs Table
CREATE TABLE IF NOT EXISTS patent_generation_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patent_application_id uuid NOT NULL REFERENCES patent_applications(id) ON DELETE CASCADE,

  -- Generation Parameters
  config_name text DEFAULT 'Default Configuration',
  emphasis_features text[] DEFAULT '{}',
  claims_breadth text DEFAULT 'medium', -- 'broad', 'medium', 'narrow'
  claims_count_target integer DEFAULT 20,

  -- AI Model Configuration
  specification_model text DEFAULT 'gemini-2.0-flash-exp',
  claims_model text DEFAULT 'gemini-2.0-flash-exp',
  temperature numeric(3,2) DEFAULT 0.7,

  -- User Preferences
  include_code_examples boolean DEFAULT true,
  include_flowcharts boolean DEFAULT true,
  include_comparison_tables boolean DEFAULT true,
  technical_detail_level text DEFAULT 'high', -- 'high', 'medium', 'low'

  -- Sections Manual Override
  manual_edits jsonb DEFAULT '{}'::jsonb,
  preserved_sections text[] DEFAULT '{}',

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to existing patent_applications table
DO $$
BEGIN
  -- Intelligence Integration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'novelty_analysis_id'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN novelty_analysis_id uuid REFERENCES patent_novelty_analyses(id);
  END IF;

  -- Approval Scoring
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'approval_score'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN approval_score numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'approval_confidence'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN approval_confidence numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'novelty_score'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN novelty_score numeric(5,2) DEFAULT 0;
  END IF;

  -- Detailed Specification Sections
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'field_of_invention'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN field_of_invention text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'background_art'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN background_art text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'summary_invention'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN summary_invention text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'detailed_description'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN detailed_description text;
  END IF;

  -- Search Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'prior_art_search_status'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN prior_art_search_status text DEFAULT 'not_started';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'prior_art_search_completed_at'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN prior_art_search_completed_at timestamptz;
  END IF;

  -- Generation Configuration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'generation_config_id'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN generation_config_id uuid REFERENCES patent_generation_configs(id);
  END IF;

  -- Auto-generation flags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'auto_generated'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN auto_generated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'last_regenerated_at'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN last_regenerated_at timestamptz;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_novelty_analyses_org ON patent_novelty_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_novelty_analyses_app ON patent_novelty_analyses(patent_application_id);
CREATE INDEX IF NOT EXISTS idx_prior_art_org ON patent_prior_art_search_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_prior_art_app ON patent_prior_art_search_results(patent_application_id);
CREATE INDEX IF NOT EXISTS idx_prior_art_search ON patent_prior_art_search_results(search_query);
CREATE INDEX IF NOT EXISTS idx_differentiation_org ON patent_differentiation_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_differentiation_app ON patent_differentiation_reports(patent_application_id);
CREATE INDEX IF NOT EXISTS idx_feature_mappings_org ON patent_feature_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_mappings_app ON patent_feature_mappings(patent_application_id);
CREATE INDEX IF NOT EXISTS idx_generation_configs_org ON patent_generation_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_generation_configs_app ON patent_generation_configs(patent_application_id);

-- Enable Row Level Security
ALTER TABLE patent_novelty_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_prior_art_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_differentiation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_feature_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_generation_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patent_novelty_analyses
CREATE POLICY "Users can view novelty analyses in their organization"
  ON patent_novelty_analyses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create novelty analyses in their organization"
  ON patent_novelty_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update novelty analyses in their organization"
  ON patent_novelty_analyses FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete novelty analyses in their organization"
  ON patent_novelty_analyses FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for patent_prior_art_search_results
CREATE POLICY "Users can view prior art results in their organization"
  ON patent_prior_art_search_results FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create prior art results in their organization"
  ON patent_prior_art_search_results FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update prior art results in their organization"
  ON patent_prior_art_search_results FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete prior art results in their organization"
  ON patent_prior_art_search_results FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for patent_differentiation_reports
CREATE POLICY "Users can view differentiation reports in their organization"
  ON patent_differentiation_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create differentiation reports in their organization"
  ON patent_differentiation_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update differentiation reports in their organization"
  ON patent_differentiation_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete differentiation reports in their organization"
  ON patent_differentiation_reports FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for patent_feature_mappings
CREATE POLICY "Users can view feature mappings in their organization"
  ON patent_feature_mappings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create feature mappings in their organization"
  ON patent_feature_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update feature mappings in their organization"
  ON patent_feature_mappings FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete feature mappings in their organization"
  ON patent_feature_mappings FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for patent_generation_configs
CREATE POLICY "Users can view generation configs in their organization"
  ON patent_generation_configs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generation configs in their organization"
  ON patent_generation_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update generation configs in their organization"
  ON patent_generation_configs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete generation configs in their organization"
  ON patent_generation_configs FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );