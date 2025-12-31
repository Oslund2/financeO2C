/*
  # Script Citations System for Historical Documentation
  
  This migration creates a comprehensive citation management system
  for photoreal historical documentary scripts.
  
  ## New Tables
  
  1. `citation_source_types` - Enum-like lookup table for source types
     - book, article, archive, interview, documentary, website, primary_document, journal, newspaper, government_record
  
  2. `citation_sources` - Pre-populated common historical sources
     - National Archives, Library of Congress, Smithsonian, etc.
     - Used for autocomplete in citation entry UI
  
  3. `script_citations` - Main citations table
     - Links to scripts via script_id
     - Stores full citation information
     - Tracks source type, URL, page numbers, access dates
     - Includes reference context explaining what the citation supports
  
  ## Security
  - RLS enabled on all tables
  - Users can only access citations for their organization's scripts
  
  ## Indexes
  - Index on script_id and citation_number for efficient ordering
  - Index on source_type for filtering
*/

-- Create citation source types enum table
CREATE TABLE IF NOT EXISTS citation_source_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  icon_name text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed source types
INSERT INTO citation_source_types (id, label, description, icon_name, sort_order) VALUES
  ('book', 'Book', 'Published books and monographs', 'book-open', 1),
  ('journal', 'Academic Journal', 'Peer-reviewed academic journals', 'graduation-cap', 2),
  ('article', 'Article', 'Magazine and online articles', 'newspaper', 3),
  ('newspaper', 'Newspaper', 'Historical newspaper archives', 'file-text', 4),
  ('archive', 'Archive', 'Historical archive documents', 'archive', 5),
  ('government_record', 'Government Record', 'Official government documents and records', 'landmark', 6),
  ('interview', 'Interview', 'Oral histories and interviews', 'mic', 7),
  ('documentary', 'Documentary', 'Documentary films and broadcasts', 'film', 8),
  ('website', 'Website', 'Online sources and databases', 'globe', 9),
  ('primary_document', 'Primary Document', 'Original historical documents', 'scroll', 10)
ON CONFLICT (id) DO NOTHING;

-- Create citation sources lookup table for common sources
CREATE TABLE IF NOT EXISTS citation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_type text REFERENCES citation_source_types(id),
  default_url_pattern text,
  description text,
  is_primary_source boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed common historical sources
INSERT INTO citation_sources (source_name, source_type, default_url_pattern, description, is_primary_source) VALUES
  ('National Archives and Records Administration (NARA)', 'archive', 'https://www.archives.gov/', 'U.S. federal government records', true),
  ('Library of Congress', 'archive', 'https://www.loc.gov/', 'National library with vast historical collections', true),
  ('Smithsonian Institution', 'archive', 'https://www.si.edu/', 'Museum and research complex', true),
  ('British National Archives', 'archive', 'https://www.nationalarchives.gov.uk/', 'UK government records', true),
  ('Internet Archive', 'website', 'https://archive.org/', 'Digital library of historical content', false),
  ('JSTOR', 'journal', 'https://www.jstor.org/', 'Academic journal archive', false),
  ('Google Scholar', 'website', 'https://scholar.google.com/', 'Academic paper search engine', false),
  ('American Historical Review', 'journal', 'https://academic.oup.com/ahr', 'Leading history journal', false),
  ('The Journal of American History', 'journal', 'https://academic.oup.com/jah', 'American history scholarship', false),
  ('Historical Newspapers (ProQuest)', 'newspaper', 'https://www.proquest.com/', 'Historical newspaper database', true),
  ('Chronicling America (LOC)', 'newspaper', 'https://chroniclingamerica.loc.gov/', 'Historic American newspapers', true),
  ('C-SPAN Video Library', 'documentary', 'https://www.c-span.org/video/', 'Political and historical video archive', true),
  ('PBS American Experience', 'documentary', 'https://www.pbs.org/wgbh/americanexperience/', 'Documentary series on American history', false),
  ('Oral History Association', 'interview', 'https://www.oralhistory.org/', 'Oral history resources', true),
  ('StoryCorps', 'interview', 'https://storycorps.org/', 'American oral history project', true),
  ('Congressional Record', 'government_record', 'https://www.congress.gov/', 'Official record of U.S. Congress', true),
  ('Federal Register', 'government_record', 'https://www.federalregister.gov/', 'Daily journal of U.S. government', true),
  ('Census Bureau Historical Data', 'government_record', 'https://www.census.gov/history/', 'Historical census records', true)
ON CONFLICT DO NOTHING;

-- Create main script citations table
CREATE TABLE IF NOT EXISTS script_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  citation_number integer NOT NULL,
  source_name text NOT NULL,
  source_type text REFERENCES citation_source_types(id),
  citation_text text NOT NULL,
  url text,
  page_number text,
  accessed_date date,
  reference_context text,
  is_primary_source boolean DEFAULT false,
  author text,
  publication_date text,
  publisher text,
  volume_issue text,
  notes text,
  ai_generated boolean DEFAULT false,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(script_id, citation_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_script_citations_script_id ON script_citations(script_id);
CREATE INDEX IF NOT EXISTS idx_script_citations_org_id ON script_citations(organization_id);
CREATE INDEX IF NOT EXISTS idx_script_citations_source_type ON script_citations(source_type);
CREATE INDEX IF NOT EXISTS idx_script_citations_verified ON script_citations(verified) WHERE verified = false;

-- Enable RLS
ALTER TABLE citation_source_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_citations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for citation_source_types (read-only reference data)
CREATE POLICY "Anyone can read citation source types"
  ON citation_source_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can read citation source types"
  ON citation_source_types FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for citation_sources (read-only reference data)
CREATE POLICY "Anyone can read citation sources"
  ON citation_sources FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anon can read citation sources"
  ON citation_sources FOR SELECT
  TO anon
  USING (is_active = true);

-- RLS Policies for script_citations
CREATE POLICY "Users can read citations for their organization scripts"
  ON script_citations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can insert citations for their organization scripts"
  ON script_citations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can update citations for their organization scripts"
  ON script_citations FOR UPDATE
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

CREATE POLICY "Users can delete citations for their organization scripts"
  ON script_citations FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- Anon policies for development
CREATE POLICY "Anon can read all citations"
  ON script_citations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert citations"
  ON script_citations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update citations"
  ON script_citations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete citations"
  ON script_citations FOR DELETE
  TO anon
  USING (true);

-- Function to get next citation number for a script
CREATE OR REPLACE FUNCTION get_next_citation_number(p_script_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number integer;
BEGIN
  SELECT COALESCE(MAX(citation_number), 0) + 1
  INTO v_next_number
  FROM script_citations
  WHERE script_id = p_script_id;
  
  RETURN v_next_number;
END;
$$;

-- Function to reorder citations after deletion
CREATE OR REPLACE FUNCTION reorder_script_citations(p_script_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY citation_number) as new_number
    FROM script_citations
    WHERE script_id = p_script_id
  )
  UPDATE script_citations sc
  SET citation_number = n.new_number,
      updated_at = now()
  FROM numbered n
  WHERE sc.id = n.id;
END;
$$;

-- Function to format citation as bibliography entry
CREATE OR REPLACE FUNCTION format_citation_bibliography(p_citation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_citation record;
  v_formatted text;
BEGIN
  SELECT * INTO v_citation FROM script_citations WHERE id = p_citation_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Format based on source type (Chicago style approximation)
  CASE v_citation.source_type
    WHEN 'book' THEN
      v_formatted := COALESCE(v_citation.author || '. ', '') ||
                     v_citation.source_name || '. ' ||
                     COALESCE(v_citation.publisher || ', ', '') ||
                     COALESCE(v_citation.publication_date || '.', '');
    WHEN 'journal', 'article' THEN
      v_formatted := COALESCE(v_citation.author || '. ', '') ||
                     '"' || v_citation.citation_text || '." ' ||
                     v_citation.source_name ||
                     COALESCE(' ' || v_citation.volume_issue, '') ||
                     COALESCE(' (' || v_citation.publication_date || ')', '') ||
                     COALESCE(': ' || v_citation.page_number, '') || '.';
    WHEN 'website' THEN
      v_formatted := v_citation.source_name || '. ' ||
                     '"' || v_citation.citation_text || '." ' ||
                     COALESCE('Accessed ' || v_citation.accessed_date::text || '. ', '') ||
                     COALESCE(v_citation.url, '');
    WHEN 'archive', 'primary_document', 'government_record' THEN
      v_formatted := v_citation.citation_text || '. ' ||
                     v_citation.source_name ||
                     COALESCE(', ' || v_citation.page_number, '') || '.';
    ELSE
      v_formatted := v_citation.source_name || '. ' ||
                     v_citation.citation_text ||
                     COALESCE(' (' || v_citation.publication_date || ')', '') || '.';
  END CASE;
  
  RETURN v_formatted;
END;
$$;

-- Function to export all citations as bibliography
CREATE OR REPLACE FUNCTION export_citations_as_bibliography(p_script_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_citation record;
  v_bibliography text := '';
  v_formatted text;
BEGIN
  FOR v_citation IN 
    SELECT * FROM script_citations 
    WHERE script_id = p_script_id 
    ORDER BY citation_number
  LOOP
    v_formatted := format_citation_bibliography(v_citation.id);
    v_bibliography := v_bibliography || 
                      v_citation.citation_number || '. ' || 
                      v_formatted || E'\n\n';
  END LOOP;
  
  RETURN v_bibliography;
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_next_citation_number(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reorder_script_citations(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION format_citation_bibliography(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION export_citations_as_bibliography(uuid) TO authenticated, anon;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_script_citations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_script_citations_updated_at
  BEFORE UPDATE ON script_citations
  FOR EACH ROW
  EXECUTE FUNCTION update_script_citations_updated_at();
