/*
  # Add 'commercial' workspace type

  ## Problem
  The `create_organization_with_membership` DB function validates workspace_type
  against a hardcoded list ('claymation', 'photoreal', 'documentary', 'general')
  and rejects 'commercial' with:
    "Invalid workspace type. Must be one of: claymation, photoreal, documentary, general"

  ## Fix
  1. Add 'commercial' to the workspace_type enum (if the column uses one)
  2. Replace create_organization_with_membership with a version that accepts 'commercial'
  3. Insert the commercial row into workspace_type_configs
*/

-- Step 1: extend the enum if it exists (no-op if it's a plain text column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'workspace_type_enum'
  ) THEN
    ALTER TYPE workspace_type_enum ADD VALUE IF NOT EXISTS 'commercial';
  END IF;
END;
$$;

-- Step 2: replace the creation function with one that accepts 'commercial'
CREATE OR REPLACE FUNCTION create_organization_with_membership(
  org_name text,
  org_slug text,
  org_billing_tier text,
  user_uuid uuid,
  org_workspace_type text DEFAULT 'general'
)
RETURNS jsonb AS $$
DECLARE
  new_org_id uuid;
  valid_types text[] := ARRAY['claymation', 'photoreal', 'documentary', 'general', 'commercial'];
BEGIN
  -- Validate workspace type
  IF NOT (org_workspace_type = ANY(valid_types)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid workspace type. Must be one of: ' || array_to_string(valid_types, ', ')
    );
  END IF;

  -- Validate billing tier
  IF org_billing_tier NOT IN ('free', 'starter', 'professional', 'enterprise') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid billing tier'
    );
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, slug, billing_tier, workspace_type, created_by)
  VALUES (org_name, org_slug, org_billing_tier, org_workspace_type, user_uuid)
  RETURNING id INTO new_org_id;

  -- Add the creator as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, user_uuid, 'owner');

  RETURN jsonb_build_object(
    'success', true,
    'id', new_org_id,
    'name', org_name,
    'slug', org_slug,
    'workspace_type', org_workspace_type
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A workspace with that URL already exists. Please choose a different name.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create workspace: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_organization_with_membership(text, text, text, uuid, text) TO authenticated;

-- Step 3: insert commercial workspace_type_configs row (idempotent)
INSERT INTO public.workspace_type_configs (
  workspace_type,
  display_name,
  description,
  primary_color,
  features,
  system_prompt_prefix
)
VALUES (
  'commercial',
  'Commercial & Promo',
  'AI-powered production for advertising spots, promos, and branded content',
  '#f59e0b',
  '{
    "concept_generator": true,
    "campaign_brief_intake": true,
    "variant_manager": true,
    "legal_compliance_checklist": true,
    "talent_profiles": true,
    "music_generation": true,
    "ai_advantage_calculator": true
  }'::jsonb,
  'You are a senior marketing and commercial production expert working for an agency that produces advertising spots and branded content for clients.'
)
ON CONFLICT (workspace_type) DO NOTHING;
