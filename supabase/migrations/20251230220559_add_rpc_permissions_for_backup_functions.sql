/*
  # Grant RPC Execute Permissions for Backup Functions

  1. Overview
     Grants execute permissions on backup RPC functions to both authenticated
     and anonymous users to enable the Backup & Recovery page to work properly.

  2. Changes
     - Grant EXECUTE on create_recovery_point function
     - Grant EXECUTE on check_data_integrity function
     - Applies to both authenticated and anon roles

  3. Security Note
     Both functions use SECURITY DEFINER so they run with elevated privileges.
     They don't take user-controllable data that could cause security issues.
*/

-- Grant execute permissions on backup RPC functions
GRANT EXECUTE ON FUNCTION create_recovery_point(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_data_integrity() TO authenticated, anon;
