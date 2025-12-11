/*
  # Fix count_series_content Function
  
  ## Problem
  The `count_series_content` function is trying to reference an `archived` column 
  in the `characters` table, which doesn't exist, causing the error:
  "column 'archived' does not exist"
  
  ## Solution
  Update the `count_series_content` function to remove the check for the 
  `archived` column in the characters table, since characters don't have 
  an archived field.
  
  ## Changes
  - Recreate `count_series_content` function without checking archived on characters
*/

-- Drop and recreate the count_series_content function
CREATE OR REPLACE FUNCTION count_series_content(series_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'characters', (SELECT COUNT(*) FROM characters WHERE series_id = series_uuid),
    'scripts', (SELECT COUNT(*) FROM scripts WHERE series_id = series_uuid),
    'episodes', (SELECT COUNT(*) FROM episodes WHERE series_id = series_uuid),
    'assets', (SELECT COUNT(*) FROM assets WHERE series_id = series_uuid),
    'storyboards', (SELECT COUNT(*) FROM storyboards WHERE series_id = series_uuid)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION count_series_content(uuid) TO authenticated;
