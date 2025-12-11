/*
  # Fix Series RLS Policy Conflicts

  1. Problem
    - Multiple conflicting INSERT policies exist on the series table
    - Old "Anyone can create series" policy conflicts with new organization-based policies
    - The multi-tenant migration tried to drop policies but used wrong names
  
  2. Solution
    - Drop ALL old permissive policies with correct names
    - Ensure only organization-based policies remain
    - Use security definer function to avoid RLS recursion
  
  3. Changes
    - Drop old "Anyone can X series" policies
    - Drop old "Users can X series" policies
    - Keep only the new organization-based policies
    - Add INSERT policy that allows creating series within user's organizations
*/

-- Drop all old permissive policies on series
DROP POLICY IF EXISTS "Anyone can view all series" ON series;
DROP POLICY IF EXISTS "Anyone can create series" ON series;
DROP POLICY IF EXISTS "Anyone can update series" ON series;
DROP POLICY IF EXISTS "Users can view all series" ON series;
DROP POLICY IF EXISTS "Users can create series" ON series;
DROP POLICY IF EXISTS "Users can update series" ON series;
DROP POLICY IF EXISTS "Users can view organization series" ON series;
DROP POLICY IF EXISTS "Users can manage organization series" ON series;

-- Create new organization-based policies
CREATE POLICY "Users can view organization series"
  ON series FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    user_is_org_admin(organization_id) OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organization series"
  ON series FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update organization series"
  ON series FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete organization series"
  ON series FOR DELETE
  TO authenticated
  USING (
    organization_id IS NULL OR
    user_is_org_admin(organization_id)
  );
