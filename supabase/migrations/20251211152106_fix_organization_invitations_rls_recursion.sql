/*
  # Fix Organization Invitations RLS Recursion

  1. Problem
    - Invitation policies also query organization_members, which could cause issues
  
  2. Solution
    - Use the security definer function to check admin status
    - Simplify policies to avoid complex subqueries
  
  3. Changes
    - Drop existing policies on organization_invitations
    - Create simpler policies using security definer function
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Organization owners and admins can manage invitations" ON organization_invitations;

-- Create simple policies using security definer function
CREATE POLICY "Admins can view organization invitations"
  ON organization_invitations FOR SELECT
  USING (user_is_org_admin(organization_id));

CREATE POLICY "Admins can manage organization invitations"
  ON organization_invitations FOR ALL
  USING (user_is_org_admin(organization_id))
  WITH CHECK (user_is_org_admin(organization_id));
