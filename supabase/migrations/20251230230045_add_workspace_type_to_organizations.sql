/*
  # Add Workspace Type to Organizations

  This migration adds workspace type categorization to support different content styles
  and feature sets per workspace (e.g., Claymation vs Photoreal).

  1. Schema Changes
    - Add `workspace_type` column to organizations table
    - Valid types: 'claymation', 'photoreal', 'documentary', 'general'
    - Default: 'claymation' (backward compatible with existing Spelling Bee workspace)

  2. Data Migration
    - Set existing "Spelling Bee" related workspaces to 'claymation' type
    - Set all other existing workspaces to 'claymation' type for backward compatibility

  3. Index
    - Add index on workspace_type for efficient filtering

  4. Notes
    - workspace_type determines which features and prompts are available
    - Completely siloed: assets and prompts are NOT shared between workspace types
    - Each workspace type can have its own set of customized prompts
*/

-- Add workspace_type column to organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'workspace_type'
  ) THEN
    ALTER TABLE organizations ADD COLUMN workspace_type text NOT NULL DEFAULT 'claymation';
    
    -- Add check constraint for valid workspace types
    ALTER TABLE organizations ADD CONSTRAINT organizations_workspace_type_check 
      CHECK (workspace_type IN ('claymation', 'photoreal', 'documentary', 'general'));
  END IF;
END $$;

-- Create index for workspace_type queries
CREATE INDEX IF NOT EXISTS idx_organizations_workspace_type 
  ON organizations(workspace_type);

-- Update existing Spelling Bee workspaces to claymation type explicitly
UPDATE organizations 
SET workspace_type = 'claymation' 
WHERE LOWER(name) LIKE '%spelling bee%' 
   OR LOWER(name) LIKE '%claymation%'
   OR LOWER(name) LIKE '%barnaby%';

-- Ensure all existing workspaces have claymation as default (backward compatibility)
UPDATE organizations 
SET workspace_type = 'claymation' 
WHERE workspace_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.workspace_type IS 
  'Type of workspace determining available features and prompts. Options: claymation (animation), photoreal (realistic/historical), documentary, general';
