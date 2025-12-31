/*
  # Create Cascading Episode Delete Function

  ## Purpose
  Provides a function to delete an episode along with all its dependent data.
  This ensures comprehensive cleanup without leaving orphaned records.

  ## What Gets Deleted
  1. Episode progress tracking:
     - Episode progress milestones
     - Episode progress records
  
  2. Financial data:
     - Episode profit settings
     - Episode revenue config
     - Episode performance metrics
     - Product placement sponsors
  
  3. Production data:
     - Production shot plans
     - Production batches
     - Shot exports
     - Dialogue audio clips
     - Lip sync jobs
  
  4. Assets:
     - Assets linked to this episode
  
  5. Finally, the episode itself

  ## Security
  - SECURITY DEFINER ensures proper permissions
  - User must be a member of the organization that owns the episode
  - Audit log entry created for tracking

  ## Returns
  - JSON object with success status, deleted content counts, or error message
*/

CREATE OR REPLACE FUNCTION delete_episode_cascade(
  episode_uuid uuid,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  episode_record record;
  assets_count integer := 0;
  shot_plans_count integer := 0;
  audio_clips_count integer := 0;
  lip_sync_count integer := 0;
  batches_count integer := 0;
BEGIN
  SELECT * INTO episode_record FROM episodes WHERE id = episode_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Episode not found');
  END IF;

  IF episode_record.organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = episode_record.organization_id
      AND user_id = user_uuid
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to delete this episode');
    END IF;
  END IF;

  -- Count items for reporting
  SELECT COUNT(*) INTO assets_count FROM assets WHERE episode_id = episode_uuid;
  SELECT COUNT(*) INTO shot_plans_count FROM production_shot_plans WHERE episode_id = episode_uuid;
  SELECT COUNT(*) INTO audio_clips_count FROM dialogue_audio_clips WHERE episode_id = episode_uuid;
  SELECT COUNT(*) INTO lip_sync_count FROM lip_sync_jobs WHERE episode_id = episode_uuid;
  SELECT COUNT(*) INTO batches_count FROM production_batches WHERE episode_id = episode_uuid;

  -- Delete episode progress tracking
  DELETE FROM episode_progress_milestones WHERE episode_id = episode_uuid;
  DELETE FROM episode_progress WHERE episode_id = episode_uuid;

  -- Delete financial data
  DELETE FROM episode_profit_settings WHERE episode_id = episode_uuid;
  DELETE FROM episode_revenue_config WHERE episode_id = episode_uuid;
  DELETE FROM episode_performance_metrics WHERE episode_id = episode_uuid;
  DELETE FROM product_placement_sponsors WHERE episode_id = episode_uuid;

  -- Delete production data
  DELETE FROM shot_exports WHERE episode_id = episode_uuid;
  DELETE FROM lip_sync_jobs WHERE episode_id = episode_uuid;
  DELETE FROM dialogue_audio_clips WHERE episode_id = episode_uuid;
  DELETE FROM production_shot_plans WHERE episode_id = episode_uuid;
  DELETE FROM production_batches WHERE episode_id = episode_uuid;

  -- Delete assets
  DELETE FROM assets WHERE episode_id = episode_uuid;

  -- Finally delete the episode
  DELETE FROM episodes WHERE id = episode_uuid;

  -- Create audit log entry
  INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, entity_name, changes, metadata)
  VALUES (
    user_uuid,
    'delete',
    'episode',
    episode_uuid,
    episode_record.title,
    jsonb_build_object('deleted', true, 'cascade', true),
    jsonb_build_object(
      'assets_deleted', assets_count,
      'shot_plans_deleted', shot_plans_count,
      'audio_clips_deleted', audio_clips_count,
      'lip_sync_jobs_deleted', lip_sync_count,
      'batches_deleted', batches_count,
      'series_id', episode_record.series_id,
      'script_id', episode_record.script_id,
      'organization_id', episode_record.organization_id,
      'deletion_type', 'cascade'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'episode_id', episode_uuid,
    'episode_title', episode_record.title,
    'content_deleted', jsonb_build_object(
      'assets', assets_count,
      'shot_plans', shot_plans_count,
      'audio_clips', audio_clips_count,
      'lip_sync_jobs', lip_sync_count,
      'batches', batches_count
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to delete episode: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_episode_cascade(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_episode_cascade(uuid, uuid) TO anon;
