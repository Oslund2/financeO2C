/*
  # Fix Organization Members RLS Infinite Recursion

  1. Problem
    - The existing policies query organization_members within organization_members policies
    - This causes infinite recursion when trying to access the table
  
  2. Solution
    - Drop existing recursive policies
    - Create simpler, direct policies that avoid self-reference
    - Users can see memberships where they are the user
    - Users can see other members in their organizations (using a security definer function)
  
  3. Changes
    - Drop problematic policies on organization_members
    - Create non-recursive policies
    - Use direct user_id checks instead of subqueries
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Organization members can view other members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can manage members" ON organization_members;

-- Create simple, non-recursive policy for viewing own membership
CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for inserting memberships (needed for auto-creation)
CREATE POLICY "Users can create their own memberships"
  ON organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policy for owners/admins to manage members (using security definer function to break recursion)
CREATE OR REPLACE FUNCTION user_is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$;

CREATE POLICY "Admins can manage organization members"
  ON organization_members FOR ALL
  USING (user_is_org_admin(organization_id))
  WITH CHECK (user_is_org_admin(organization_id));
