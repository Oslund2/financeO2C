/*
  # Create Prompt Library System

  This migration establishes a comprehensive prompt management system with version control,
  AI-powered enhancements, and organization-specific customization.

  1. New Tables
    - `prompt_templates` - Master table for prompt configurations
      - `id` (uuid, primary key)
      - `organization_id` (uuid, nullable for system defaults)
      - `prompt_key` (text) - Unique identifier like 'script_generation', 'claymation_style'
      - `prompt_name` (text) - Human-readable name
      - `category` (text) - Category for grouping: script, video, voice, storyboard, style
      - `description` (text) - Description of what this prompt does
      - `is_system_default` (boolean) - Whether this is a system-provided default
      - `is_active` (boolean) - Whether this prompt is enabled
      - `variables_schema` (jsonb) - JSON schema defining available placeholder variables
      - `created_at`, `updated_at` timestamps
    
    - `prompt_template_versions` - Version history for prompts
      - `id` (uuid, primary key)
      - `prompt_template_id` (uuid, FK to prompt_templates)
      - `version_number` (integer) - Incrementing version
      - `prompt_content` (text) - The actual prompt text
      - `variables_schema` (jsonb) - Schema for this specific version
      - `created_by` (text) - User who created this version
      - `change_notes` (text) - Notes about what changed
      - `is_deployed` (boolean) - Whether this version is currently active
      - `created_at` timestamp
    
    - `prompt_enhancement_history` - Track AI enhancement suggestions
      - `id` (uuid, primary key)
      - `prompt_version_id` (uuid, FK to prompt_template_versions)
      - `organization_id` (uuid, FK to organizations)
      - `original_content` (text)
      - `enhanced_content` (text)
      - `enhancement_type` (text) - clarity, detail, optimize, custom
      - `custom_instruction` (text) - User's custom enhancement request
      - `accepted` (boolean, nullable) - Whether user accepted the enhancement
      - `created_at` timestamp

  2. Security
    - Enable RLS on all tables
    - Organization members can manage their org's prompts
    - System defaults (organization_id IS NULL) are readable by all authenticated users

  3. Indexes
    - Index on prompt_templates(organization_id, prompt_key) for fast lookup
    - Index on prompt_template_versions(prompt_template_id, is_deployed)
*/

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_key text NOT NULL,
  prompt_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_system_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  variables_schema jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, prompt_key)
);

-- Create prompt_template_versions table
CREATE TABLE IF NOT EXISTS prompt_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_template_id uuid NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  prompt_content text NOT NULL,
  variables_schema jsonb DEFAULT '[]'::jsonb,
  created_by text,
  change_notes text,
  is_deployed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prompt_template_id, version_number)
);

-- Create prompt_enhancement_history table
CREATE TABLE IF NOT EXISTS prompt_enhancement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid NOT NULL REFERENCES prompt_template_versions(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  original_content text NOT NULL,
  enhanced_content text NOT NULL,
  enhancement_type text NOT NULL DEFAULT 'clarity',
  custom_instruction text,
  accepted boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_org_key 
  ON prompt_templates(organization_id, prompt_key);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_category 
  ON prompt_templates(category);

CREATE INDEX IF NOT EXISTS idx_prompt_template_versions_deployed 
  ON prompt_template_versions(prompt_template_id, is_deployed) 
  WHERE is_deployed = true;

CREATE INDEX IF NOT EXISTS idx_prompt_enhancement_history_version 
  ON prompt_enhancement_history(prompt_version_id);

-- Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_enhancement_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompt_templates

-- Users can view system defaults (org_id IS NULL) and their organization's prompts
CREATE POLICY "Users can view system defaults and own org prompts"
  ON prompt_templates
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Users can insert prompts for their organizations
CREATE POLICY "Users can create prompts for their organization"
  ON prompt_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Users can update their organization's prompts (not system defaults)
CREATE POLICY "Users can update their org prompts"
  ON prompt_templates
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Users can delete their organization's prompts
CREATE POLICY "Users can delete their org prompts"
  ON prompt_templates
  FOR DELETE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- RLS Policies for prompt_template_versions

-- Users can view versions for prompts they can access
CREATE POLICY "Users can view versions for accessible prompts"
  ON prompt_template_versions
  FOR SELECT
  TO authenticated
  USING (
    prompt_template_id IN (
      SELECT id FROM prompt_templates pt
      WHERE pt.organization_id IS NULL
      OR pt.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
      )
    )
  );

-- Users can create versions for their org's prompts
CREATE POLICY "Users can create versions for their org prompts"
  ON prompt_template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    prompt_template_id IN (
      SELECT id FROM prompt_templates pt
      WHERE pt.organization_id IS NOT NULL
      AND pt.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
      )
    )
  );

-- Users can update versions for their org's prompts
CREATE POLICY "Users can update versions for their org prompts"
  ON prompt_template_versions
  FOR UPDATE
  TO authenticated
  USING (
    prompt_template_id IN (
      SELECT id FROM prompt_templates pt
      WHERE pt.organization_id IS NOT NULL
      AND pt.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    prompt_template_id IN (
      SELECT id FROM prompt_templates pt
      WHERE pt.organization_id IS NOT NULL
      AND pt.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
      )
    )
  );

-- Users can delete versions for their org's prompts
CREATE POLICY "Users can delete versions for their org prompts"
  ON prompt_template_versions
  FOR DELETE
  TO authenticated
  USING (
    prompt_template_id IN (
      SELECT id FROM prompt_templates pt
      WHERE pt.organization_id IS NOT NULL
      AND pt.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
      )
    )
  );

-- RLS Policies for prompt_enhancement_history

-- Users can view their org's enhancement history
CREATE POLICY "Users can view their org enhancement history"
  ON prompt_enhancement_history
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Users can create enhancement history for their org
CREATE POLICY "Users can create enhancement history for their org"
  ON prompt_enhancement_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Users can update their org's enhancement history (accept/reject)
CREATE POLICY "Users can update their org enhancement history"
  ON prompt_enhancement_history
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Users can delete their org's enhancement history
CREATE POLICY "Users can delete their org enhancement history"
  ON prompt_enhancement_history
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Function to automatically create the next version number
CREATE OR REPLACE FUNCTION get_next_prompt_version_number(p_template_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM prompt_template_versions
  WHERE prompt_template_id = p_template_id;
$$;

-- Function to deploy a version (sets it as active and deactivates others)
CREATE OR REPLACE FUNCTION deploy_prompt_version(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  -- Get the template ID
  SELECT prompt_template_id INTO v_template_id
  FROM prompt_template_versions
  WHERE id = p_version_id;
  
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;
  
  -- Deactivate all other versions for this template
  UPDATE prompt_template_versions
  SET is_deployed = false
  WHERE prompt_template_id = v_template_id
  AND id != p_version_id;
  
  -- Activate the specified version
  UPDATE prompt_template_versions
  SET is_deployed = true
  WHERE id = p_version_id;
  
  -- Update the template's updated_at
  UPDATE prompt_templates
  SET updated_at = now()
  WHERE id = v_template_id;
END;
$$;

-- Function to copy system defaults to an organization
CREATE OR REPLACE FUNCTION initialize_organization_prompts(p_organization_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_system_prompt record;
  v_new_template_id uuid;
  v_deployed_version record;
BEGIN
  -- Loop through all system default prompts
  FOR v_system_prompt IN
    SELECT * FROM prompt_templates WHERE organization_id IS NULL AND is_system_default = true
  LOOP
    -- Check if org already has this prompt
    IF NOT EXISTS (
      SELECT 1 FROM prompt_templates 
      WHERE organization_id = p_organization_id 
      AND prompt_key = v_system_prompt.prompt_key
    ) THEN
      -- Create the template for the organization
      INSERT INTO prompt_templates (
        organization_id,
        prompt_key,
        prompt_name,
        category,
        description,
        is_system_default,
        is_active,
        variables_schema
      ) VALUES (
        p_organization_id,
        v_system_prompt.prompt_key,
        v_system_prompt.prompt_name,
        v_system_prompt.category,
        v_system_prompt.description,
        false,
        true,
        v_system_prompt.variables_schema
      )
      RETURNING id INTO v_new_template_id;
      
      -- Get the deployed version from system default
      SELECT * INTO v_deployed_version
      FROM prompt_template_versions
      WHERE prompt_template_id = v_system_prompt.id
      AND is_deployed = true
      LIMIT 1;
      
      IF v_deployed_version IS NOT NULL THEN
        -- Copy the deployed version
        INSERT INTO prompt_template_versions (
          prompt_template_id,
          version_number,
          prompt_content,
          variables_schema,
          created_by,
          change_notes,
          is_deployed
        ) VALUES (
          v_new_template_id,
          1,
          v_deployed_version.prompt_content,
          v_deployed_version.variables_schema,
          'system',
          'Copied from system default',
          true
        );
      END IF;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Trigger to update updated_at on prompt_templates
CREATE OR REPLACE FUNCTION update_prompt_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_templates_updated_at ON prompt_templates;
CREATE TRIGGER prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_templates_updated_at();
