/*
  # Fix Organization Members INSERT Policy Conflict

  1. Problem
    - Two INSERT policies exist on organization_members:
      - "Users can create their own memberships" - allows if user_id = auth.uid()
      - "Admins can manage organization members" (FOR ALL) - requires user_is_org_admin()
    - When inserting, BOTH WITH CHECK conditions must pass
    - New users can't create their first membership because they're not admin yet
  
  2. Solution
    - Drop the "FOR ALL" policy
    - Create separate policies for INSERT, UPDATE, DELETE
    - Allow users to insert their own memberships without admin check
    - Require admin check only for managing OTHER users' memberships
  
  3. Changes
    - Drop "Admins can manage organization members" policy
    - Create specific policies for UPDATE and DELETE that require admin
    - Keep INSERT policy for creating own membership
*/

-- Drop the problematic FOR ALL policy
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;

-- Allow users to insert their own memberships
-- (This policy already exists, but ensure it's the only INSERT policy)
DROP POLICY IF EXISTS "Users can create their own memberships" ON organization_members;

CREATE POLICY "Users can create their own memberships"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can update member roles
CREATE POLICY "Admins can update organization members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (user_is_org_admin(organization_id))
  WITH CHECK (user_is_org_admin(organization_id));

-- Admins can remove members
CREATE POLICY "Admins can delete organization members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (user_is_org_admin(organization_id));
