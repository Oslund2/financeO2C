/*
  # Create Patent Application Management System

  This migration creates a comprehensive patent application management system
  for tracking and generating patent documents for the AI animation production system.

  1. New Tables
    - `patent_applications`
      - `id` (uuid, primary key) - Unique identifier
      - `organization_id` (uuid, foreign key) - Organization ownership
      - `title` (text) - Patent application title
      - `filing_type` (text) - Type of filing (provisional, non-provisional, continuation)
      - `status` (text) - Application status (draft, in_review, filed, pending, granted, rejected)
      - `inventor_name` (text) - Primary inventor name
      - `inventor_citizenship` (text) - Inventor citizenship (defaults to US Citizen)
      - `specification` (text) - Detailed description/specification
      - `abstract` (text) - Patent abstract (150 words max)
      - `prior_art_patents` (jsonb) - Placeholder for patent references
      - `prior_art_literature` (jsonb) - Placeholder for non-patent literature
      - `metadata` (jsonb) - Additional metadata
      - `version` (integer) - Version number for tracking changes
      - `created_at`, `updated_at` - Timestamps

    - `patent_claims`
      - `id` (uuid, primary key) - Unique identifier
      - `application_id` (uuid, foreign key) - Parent patent application
      - `claim_number` (integer) - Claim number in sequence
      - `claim_type` (text) - independent or dependent
      - `parent_claim_id` (uuid, nullable) - Reference to parent claim for dependent claims
      - `claim_text` (text) - Full claim text
      - `status` (text) - draft, reviewed, finalized
      - `category` (text) - method, system, apparatus, composition
      - `created_at`, `updated_at` - Timestamps

    - `patent_drawings`
      - `id` (uuid, primary key) - Unique identifier
      - `application_id` (uuid, foreign key) - Parent patent application
      - `figure_number` (integer) - Figure number (FIG. 1, FIG. 2, etc.)
      - `title` (text) - Figure title
      - `description` (text) - Brief description for specification
      - `svg_content` (text) - SVG markup for the drawing
      - `image_url` (text, nullable) - URL if exported as image
      - `drawing_type` (text) - block_diagram, flowchart, wireframe, schematic
      - `callouts` (jsonb) - Numbered callout references
      - `created_at`, `updated_at` - Timestamps

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users based on organization membership

  3. Indexes
    - Index on organization_id for patent_applications
    - Index on application_id for claims and drawings
*/

-- Create patent_applications table
CREATE TABLE IF NOT EXISTS patent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  filing_type text NOT NULL DEFAULT 'provisional',
  status text NOT NULL DEFAULT 'draft',
  inventor_name text,
  inventor_citizenship text DEFAULT 'US Citizen',
  specification text,
  abstract text,
  prior_art_patents jsonb DEFAULT '[]'::jsonb,
  prior_art_literature jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_filing_type CHECK (filing_type IN ('provisional', 'non_provisional', 'continuation', 'cip', 'divisional')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'in_review', 'ready_to_file', 'filed', 'pending', 'granted', 'rejected', 'abandoned'))
);

-- Create patent_claims table
CREATE TABLE IF NOT EXISTS patent_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES patent_applications(id) ON DELETE CASCADE,
  claim_number integer NOT NULL,
  claim_type text NOT NULL DEFAULT 'independent',
  parent_claim_id uuid REFERENCES patent_claims(id) ON DELETE SET NULL,
  claim_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  category text NOT NULL DEFAULT 'method',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_claim_type CHECK (claim_type IN ('independent', 'dependent')),
  CONSTRAINT valid_claim_status CHECK (status IN ('draft', 'reviewed', 'finalized')),
  CONSTRAINT valid_claim_category CHECK (category IN ('method', 'system', 'apparatus', 'composition')),
  CONSTRAINT unique_claim_number UNIQUE (application_id, claim_number)
);

-- Create patent_drawings table
CREATE TABLE IF NOT EXISTS patent_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES patent_applications(id) ON DELETE CASCADE,
  figure_number integer NOT NULL,
  title text NOT NULL,
  description text,
  svg_content text,
  image_url text,
  drawing_type text NOT NULL DEFAULT 'block_diagram',
  callouts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_drawing_type CHECK (drawing_type IN ('block_diagram', 'flowchart', 'wireframe', 'schematic', 'sequence_diagram')),
  CONSTRAINT unique_figure_number UNIQUE (application_id, figure_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_patent_applications_org ON patent_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_patent_claims_app ON patent_claims(application_id);
CREATE INDEX IF NOT EXISTS idx_patent_claims_parent ON patent_claims(parent_claim_id);
CREATE INDEX IF NOT EXISTS idx_patent_drawings_app ON patent_drawings(application_id);

-- Enable RLS
ALTER TABLE patent_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent_drawings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patent_applications
CREATE POLICY "Users can view patent applications in their organization"
  ON patent_applications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create patent applications in their organization"
  ON patent_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patent applications in their organization"
  ON patent_applications FOR UPDATE
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

CREATE POLICY "Users can delete patent applications in their organization"
  ON patent_applications FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for patent_claims (through application ownership)
CREATE POLICY "Users can view claims for applications in their organization"
  ON patent_claims FOR SELECT
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create claims for applications in their organization"
  ON patent_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update claims for applications in their organization"
  ON patent_claims FOR UPDATE
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete claims for applications in their organization"
  ON patent_claims FOR DELETE
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for patent_drawings (through application ownership)
CREATE POLICY "Users can view drawings for applications in their organization"
  ON patent_drawings FOR SELECT
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create drawings for applications in their organization"
  ON patent_drawings FOR INSERT
  TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update drawings for applications in their organization"
  ON patent_drawings FOR UPDATE
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete drawings for applications in their organization"
  ON patent_drawings FOR DELETE
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM patent_applications
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_patent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS patent_applications_updated_at ON patent_applications;
CREATE TRIGGER patent_applications_updated_at
  BEFORE UPDATE ON patent_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_patent_updated_at();

DROP TRIGGER IF EXISTS patent_claims_updated_at ON patent_claims;
CREATE TRIGGER patent_claims_updated_at
  BEFORE UPDATE ON patent_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_patent_updated_at();

DROP TRIGGER IF EXISTS patent_drawings_updated_at ON patent_drawings;
CREATE TRIGGER patent_drawings_updated_at
  BEFORE UPDATE ON patent_drawings
  FOR EACH ROW
  EXECUTE FUNCTION update_patent_updated_at();
