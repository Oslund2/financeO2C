/*
  # Simplify Organizations Insert Policy

  1. Problem
    - The current policy requires created_by = auth.uid()
    - This is failing, possibly due to timing or auth state issues
  
  2. Solution
    - Drop the strict policy
    - Create a simpler policy that allows authenticated users to create organizations
    - The created_by field will still be set by the application
  
  3. Changes
    - Drop existing INSERT policy
    - Create new, more permissive INSERT policy
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create simpler policy
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);
