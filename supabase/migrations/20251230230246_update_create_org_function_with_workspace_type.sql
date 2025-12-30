/*
  # Update Create Organization Function with Workspace Type

  This migration updates the create_organization_with_membership function
  to accept and set the workspace_type for new organizations.

  1. Function Changes
    - Drop existing function with specific signature
    - Add org_workspace_type parameter (default: 'claymation')
    - Set workspace_type when creating organization
    - Return workspace_type in the result

  2. Backward Compatible
    - Default workspace_type to 'claymation' so existing calls work
*/

-- Drop the existing function with its exact signature
DROP FUNCTION IF EXISTS create_organization_with_membership(text, text, text, uuid);

-- Create the updated function with workspace_type parameter
CREATE OR REPLACE FUNCTION create_organization_with_membership(
  org_name text,
  org_slug text,
  org_billing_tier text DEFAULT 'professional',
  user_uuid uuid DEFAULT auth.uid(),
  org_workspace_type text DEFAULT 'claymation'
)
RETURNS json AS $$
DECLARE
  new_org_id uuid;
  result json;
BEGIN
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF org_workspace_type NOT IN ('claymation', 'photoreal', 'documentary', 'general') THEN
    RAISE EXCEPTION 'Invalid workspace type. Must be one of: claymation, photoreal, documentary, general';
  END IF;

  INSERT INTO organizations (name, slug, billing_tier, created_by, workspace_type)
  VALUES (org_name, org_slug, org_billing_tier, user_uuid, org_workspace_type)
  RETURNING id INTO new_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, user_uuid, 'owner');

  SELECT row_to_json(o.*) INTO result
  FROM organizations o
  WHERE o.id = new_org_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_organization_with_membership(text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_membership(text, text, text, uuid, text) TO anon;
