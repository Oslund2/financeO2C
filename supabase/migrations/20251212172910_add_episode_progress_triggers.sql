/*
  # Add Episode Progress Auto-Update Triggers

  1. Triggers
    - Updates episode progress when production elements change
    - Fires on INSERT, UPDATE for relevant tables
    - Recalculates progress automatically

  2. Tables with Triggers
    - production_shot_plans
    - production_shot_prompts
    - lip_sync_jobs
    - episodes (status changes)
*/

-- Trigger for production_shot_plans
DROP TRIGGER IF EXISTS trigger_shot_plans_update_progress ON production_shot_plans;
CREATE TRIGGER trigger_shot_plans_update_progress
  AFTER INSERT OR UPDATE ON production_shot_plans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_episode_progress();

-- Trigger for production_shot_prompts
DROP TRIGGER IF EXISTS trigger_shot_prompts_update_progress ON production_shot_prompts;
CREATE TRIGGER trigger_shot_prompts_update_progress
  AFTER INSERT OR UPDATE ON production_shot_prompts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_episode_progress();

-- Trigger for lip_sync_jobs
DROP TRIGGER IF EXISTS trigger_lip_sync_update_progress ON lip_sync_jobs;
CREATE TRIGGER trigger_lip_sync_update_progress
  AFTER INSERT OR UPDATE ON lip_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_episode_progress();

-- Trigger for episodes (status changes)
DROP TRIGGER IF EXISTS trigger_episodes_status_update_progress ON episodes;
CREATE TRIGGER trigger_episodes_status_update_progress
  AFTER UPDATE OF status ON episodes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_update_episode_progress();
