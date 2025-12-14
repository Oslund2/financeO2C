/*
  # Add Stuck Translation Recovery Function

  1. New Functions
    - `complete_stuck_translation` - Marks stuck translations at 100% as completed
    - `reset_stuck_translation` - Resets stuck translations to allow retry
  
  2. Changes
    - Adds helper functions to recover from stuck translation states
    - Ensures translations at 100% progress can be force-completed
    
  3. Purpose
    - Handles edge cases where translations reach 100% but don't mark as completed
    - Provides manual recovery options for stuck translations
*/

-- Function to complete a stuck translation that's at 100% progress
CREATE OR REPLACE FUNCTION complete_stuck_translation(
  p_translation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only complete if it's at 100% and in_progress
  UPDATE script_translations
  SET 
    status = 'completed',
    error_message = NULL,
    updated_at = now()
  WHERE 
    id = p_translation_id 
    AND status = 'in_progress'
    AND progress_percentage = 100;
  
  RETURN FOUND;
END;
$$;

-- Function to reset a stuck translation to allow retry
CREATE OR REPLACE FUNCTION reset_stuck_translation(
  p_translation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset the translation to pending state
  UPDATE script_translations
  SET 
    status = 'pending',
    progress_percentage = 0,
    error_message = NULL,
    updated_at = now()
  WHERE 
    id = p_translation_id 
    AND status = 'in_progress';
  
  RETURN FOUND;
END;
$$;

-- Automatically complete any stuck translations at 100%
UPDATE script_translations
SET 
  status = 'completed',
  updated_at = now()
WHERE 
  status = 'in_progress' 
  AND progress_percentage = 100;