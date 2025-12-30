/*
  # Add Workspace Types to Prompt Templates

  This migration adds workspace type filtering to prompts so each workspace type
  can have its own tailored set of prompts.

  1. Schema Changes
    - Add `workspace_types` text array column to prompt_templates
    - Prompts can apply to multiple workspace types (or all if null)
    - Default existing prompts to ['claymation'] for backward compatibility

  2. Index
    - Add GIN index for efficient array containment queries

  3. Functions
    - Add helper function to get prompts filtered by workspace type

  4. Notes
    - A prompt with workspace_types = ['claymation'] only shows in claymation workspaces
    - A prompt with workspace_types = ['claymation', 'photoreal'] shows in both
    - System default prompts (organization_id IS NULL) can be tagged for specific types
*/

-- Add workspace_types array column to prompt_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompt_templates' AND column_name = 'workspace_types'
  ) THEN
    ALTER TABLE prompt_templates ADD COLUMN workspace_types text[] DEFAULT ARRAY['claymation']::text[];
  END IF;
END $$;

-- Create GIN index for efficient array queries
CREATE INDEX IF NOT EXISTS idx_prompt_templates_workspace_types 
  ON prompt_templates USING GIN(workspace_types);

-- Update existing prompts to include claymation (backward compatibility)
UPDATE prompt_templates 
SET workspace_types = ARRAY['claymation']::text[]
WHERE workspace_types IS NULL OR workspace_types = '{}';

-- Function to get prompts for a specific workspace type
CREATE OR REPLACE FUNCTION get_prompts_for_workspace_type(
  p_organization_id uuid,
  p_workspace_type text
)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  prompt_key text,
  prompt_name text,
  category text,
  description text,
  is_system_default boolean,
  is_active boolean,
  variables_schema jsonb,
  workspace_types text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (pt.prompt_key)
    pt.id,
    pt.organization_id,
    pt.prompt_key,
    pt.prompt_name,
    pt.category,
    pt.description,
    pt.is_system_default,
    pt.is_active,
    pt.variables_schema,
    pt.workspace_types,
    pt.created_at,
    pt.updated_at
  FROM prompt_templates pt
  WHERE pt.is_active = true
    AND (
      -- Include prompts for this organization
      pt.organization_id = p_organization_id
      OR 
      -- Include system defaults if no org-specific version exists
      (pt.organization_id IS NULL AND pt.is_system_default = true)
    )
    AND (
      -- Match workspace type (null/empty means all types)
      pt.workspace_types IS NULL 
      OR pt.workspace_types = '{}'
      OR p_workspace_type = ANY(pt.workspace_types)
    )
  ORDER BY pt.prompt_key, pt.organization_id NULLS LAST;
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN prompt_templates.workspace_types IS 
  'Array of workspace types this prompt applies to. Options: claymation, photoreal, documentary, general. NULL or empty means all types.';

COMMENT ON FUNCTION get_prompts_for_workspace_type IS 
  'Returns prompts filtered by workspace type, preferring organization-specific prompts over system defaults';
