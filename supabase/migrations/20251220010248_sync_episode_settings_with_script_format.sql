/*
  # Sync Episode Profit Settings with Script Format

  ## Problem
  When scripts are updated in AI Studio (program_length_minutes, format_type),
  the episode_profit_settings table can have stale values that override the 
  script's actual settings.

  ## Solution
  1. Create a trigger that updates episode_profit_settings when script format changes
  2. Ensure saved settings always reflect the script's program_length_minutes

  ## Changes
  - Add trigger on scripts table to sync program_length to episode_profit_settings
*/

CREATE OR REPLACE FUNCTION sync_episode_settings_on_script_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.program_length_minutes IS DISTINCT FROM OLD.program_length_minutes THEN
    UPDATE episode_profit_settings eps
    SET program_length_minutes = NEW.program_length_minutes,
        updated_at = now()
    FROM episodes e
    WHERE eps.episode_id = e.id
    AND e.script_id = NEW.id
    AND NEW.program_length_minutes IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_episode_settings_on_script_update ON scripts;

CREATE TRIGGER trigger_sync_episode_settings_on_script_update
  AFTER UPDATE OF program_length_minutes ON scripts
  FOR EACH ROW
  EXECUTE FUNCTION sync_episode_settings_on_script_update();
