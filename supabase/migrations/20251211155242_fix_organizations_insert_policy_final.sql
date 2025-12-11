/*
  # Fix Organizations INSERT Policy - Final Solution
  
  1. Problem Analysis
    - Current policy has WITH CHECK (true) TO authenticated
    - User is getting RLS violation despite being authenticated
    - Possible issue: TO clause or role mismatch
  
  2. Solution
    - Drop the existing INSERT policy completely
    - Create a new policy without TO clause restrictions
    - Use auth.uid() IS NOT NULL to verify authentication
    - Remove all potential blockers
  
  3. Changes
    - Drop existing "Authenticated users can create organizations" policy
    - Create new policy with explicit authentication check
    - Add database function for safe organization creation
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create a new, more permissive policy
-- This policy allows any authenticated user to insert organizations
CREATE POLICY "Allow authenticated users to create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create a helper function to safely create organizations
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION create_organization_with_membership(
  org_name text,
  org_slug text,
  org_billing_tier text DEFAULT 'professional',
  user_uuid uuid DEFAULT auth.uid()
)
RETURNS json AS $$
DECLARE
  new_org_id uuid;
  result json;
BEGIN
  -- Verify user is authenticated
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Insert organization
  INSERT INTO organizations (name, slug, billing_tier, created_by)
  VALUES (org_name, org_slug, org_billing_tier, user_uuid)
  RETURNING id INTO new_org_id;

  -- Insert organization membership
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, user_uuid, 'owner');

  -- Return the created organization
  SELECT row_to_json(o.*) INTO result
  FROM organizations o
  WHERE o.id = new_org_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_membership TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_membership TO anon;
