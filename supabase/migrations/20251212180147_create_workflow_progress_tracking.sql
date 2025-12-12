/*
  # Create Workflow-Based Progress Tracking

  1. New Function
    - `get_episode_workflow_milestones()` - Returns workflow milestones matching navigation structure
    
  2. Workflow Milestone Structure
    Episodes are tracked through a user-friendly workflow that matches the left navigation:
    - Episode Setup (episode exists)
    - Characters Available (characters in series)
    - Script Linked (script attached to episode)
    - Storyboard Generated (storyboard with shots)
    - Shot List Created (production shot plans)
    - Prompts Generated (veo3 prompts for shots)
    - Shots Rendered (completed shot renders)
    - Lip Sync Complete (dialogue synchronization)
    - Final Video Exported (final deliverable)
    
  3. Return Data
    Each milestone returns:
    - name: Display name for the milestone
    - status: completed, in_progress, or not_started
    - count: Actual count from database
    - total: Total expected (if applicable)
    - navigation_target: Which view to navigate to
    - completed_at: Timestamp of completion
    - action_label: Label for action button
    - icon: Icon identifier matching left nav
*/

-- Function to get workflow-based progress milestones
CREATE OR REPLACE FUNCTION get_episode_workflow_milestones(p_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_episode record;
  v_series_id uuid;
  v_organization_id uuid;
  v_character_count int := 0;
  v_script_exists boolean := false;
  v_storyboard_count int := 0;
  v_storyboard_shot_count int := 0;
  v_shot_plan_count int := 0;
  v_prompt_count int := 0;
  v_rendered_shot_count int := 0;
  v_lipsync_complete_count int := 0;
  v_lipsync_total_count int := 0;
  v_final_video_exists boolean := false;
  v_milestones jsonb := '[]'::jsonb;
  v_overall_progress numeric := 0;
  v_completed_count int := 0;
  v_total_milestones int := 9;
BEGIN
  -- Get episode details
  SELECT e.*, e.series_id, s.organization_id
  INTO v_episode
  FROM episodes e
  JOIN series s ON s.id = e.series_id
  WHERE e.id = p_episode_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Episode not found',
      'milestones', '[]'::jsonb,
      'overall_progress', 0
    );
  END IF;
  
  v_series_id := v_episode.series_id;
  v_organization_id := v_episode.organization_id;
  
  -- 1. Episode Setup (always complete if we're querying it)
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Episode Created',
    'status', 'completed',
    'count', 1,
    'total', 1,
    'navigation_target', 'episodes',
    'completed_at', v_episode.created_at,
    'action_label', 'View Episode',
    'icon', 'Film',
    'description', v_episode.title
  );
  v_completed_count := v_completed_count + 1;
  
  -- 2. Characters Available (count characters in series)
  SELECT COUNT(*)
  INTO v_character_count
  FROM character_consistency_profiles
  WHERE series_id = v_series_id;
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Characters',
    'status', CASE 
      WHEN v_character_count > 0 THEN 'completed'
      ELSE 'not_started'
    END,
    'count', v_character_count,
    'total', NULL,
    'navigation_target', 'characters',
    'completed_at', CASE WHEN v_character_count > 0 THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_character_count > 0 THEN 'View Characters'
      ELSE 'Add Characters'
    END,
    'icon', 'Users',
    'description', CASE 
      WHEN v_character_count = 0 THEN 'No characters yet'
      WHEN v_character_count = 1 THEN '1 character'
      ELSE v_character_count || ' characters'
    END
  );
  IF v_character_count > 0 THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- 3. Script Linked
  v_script_exists := v_episode.script_id IS NOT NULL;
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Script',
    'status', CASE 
      WHEN v_script_exists THEN 'completed'
      ELSE 'not_started'
    END,
    'count', CASE WHEN v_script_exists THEN 1 ELSE 0 END,
    'total', 1,
    'navigation_target', 'scripts',
    'completed_at', CASE WHEN v_script_exists THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_script_exists THEN 'View Script'
      ELSE 'Add Script'
    END,
    'icon', 'FileText',
    'description', CASE 
      WHEN v_script_exists THEN 'Script linked'
      ELSE 'No script linked'
    END
  );
  IF v_script_exists THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- 4. Storyboard Generated
  SELECT COUNT(*), COALESCE(SUM(total_shots), 0)
  INTO v_storyboard_count, v_storyboard_shot_count
  FROM storyboards
  WHERE episode_id = p_episode_id;
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Storyboard',
    'status', CASE 
      WHEN v_storyboard_count > 0 AND v_storyboard_shot_count > 0 THEN 'completed'
      WHEN v_storyboard_count > 0 THEN 'in_progress'
      ELSE 'not_started'
    END,
    'count', v_storyboard_shot_count,
    'total', NULL,
    'navigation_target', 'storyboard-generator',
    'completed_at', CASE WHEN v_storyboard_shot_count > 0 THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_storyboard_count > 0 THEN 'View Storyboard'
      ELSE 'Generate Storyboard'
    END,
    'icon', 'Camera',
    'description', CASE 
      WHEN v_storyboard_shot_count = 0 THEN 'No storyboard yet'
      WHEN v_storyboard_shot_count = 1 THEN '1 shot'
      ELSE v_storyboard_shot_count || ' shots'
    END
  );
  IF v_storyboard_shot_count > 0 THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- 5. Shot List Created
  SELECT COUNT(*)
  INTO v_shot_plan_count
  FROM production_shot_plans
  WHERE episode_id = p_episode_id;
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Shot List',
    'status', CASE 
      WHEN v_shot_plan_count > 0 THEN 'completed'
      ELSE 'not_started'
    END,
    'count', v_shot_plan_count,
    'total', NULL,
    'navigation_target', 'production',
    'completed_at', CASE WHEN v_shot_plan_count > 0 THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_shot_plan_count > 0 THEN 'View Shot List'
      ELSE 'Create Shot List'
    END,
    'icon', 'List',
    'description', CASE 
      WHEN v_shot_plan_count = 0 THEN 'No shots planned'
      WHEN v_shot_plan_count = 1 THEN '1 shot planned'
      ELSE v_shot_plan_count || ' shots planned'
    END
  );
  IF v_shot_plan_count > 0 THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- 6. Prompts Generated
  SELECT COUNT(*)
  INTO v_prompt_count
  FROM production_shot_prompts psp
  JOIN production_shot_plans psp2 ON psp2.id = psp.shot_plan_id
  WHERE psp2.episode_id = p_episode_id;
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Prompts',
    'status', CASE 
      WHEN v_prompt_count > 0 AND v_prompt_count >= v_shot_plan_count THEN 'completed'
      WHEN v_prompt_count > 0 THEN 'in_progress'
      ELSE 'not_started'
    END,
    'count', v_prompt_count,
    'total', v_shot_plan_count,
    'navigation_target', 'production',
    'completed_at', CASE WHEN v_prompt_count >= v_shot_plan_count AND v_shot_plan_count > 0 THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_prompt_count > 0 THEN 'View Prompts'
      ELSE 'Generate Prompts'
    END,
    'icon', 'Sparkles',
    'description', CASE 
      WHEN v_shot_plan_count = 0 THEN 'No shots to prompt'
      WHEN v_prompt_count = 0 THEN 'No prompts yet'
      ELSE v_prompt_count || ' of ' || v_shot_plan_count || ' prompts'
    END
  );
  IF v_prompt_count > 0 AND v_prompt_count >= v_shot_plan_count AND v_shot_plan_count > 0 THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- 7. Shots Rendered
  SELECT COUNT(*)
  INTO v_rendered_shot_count
  FROM production_shot_plans
  WHERE episode_id = p_episode_id 
    AND status IN ('completed', 'approved');
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Rendering',
    'status', CASE 
      WHEN v_rendered_shot_count > 0 AND v_rendered_shot_count >= v_shot_plan_count THEN 'completed'
      WHEN v_rendered_shot_count > 0 THEN 'in_progress'
      ELSE 'not_started'
    END,
    'count', v_rendered_shot_count,
    'total', v_shot_plan_count,
    'navigation_target', 'production',
    'completed_at', CASE WHEN v_rendered_shot_count >= v_shot_plan_count AND v_shot_plan_count > 0 THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_rendered_shot_count > 0 THEN 'View Renders'
      ELSE 'Start Rendering'
    END,
    'icon', 'Video',
    'description', CASE 
      WHEN v_shot_plan_count = 0 THEN 'No shots to render'
      WHEN v_rendered_shot_count = 0 THEN 'Not started'
      ELSE v_rendered_shot_count || ' of ' || v_shot_plan_count || ' rendered'
    END
  );
  IF v_rendered_shot_count > 0 AND v_rendered_shot_count >= v_shot_plan_count AND v_shot_plan_count > 0 THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- 8. Lip Sync Complete
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*)
  INTO v_lipsync_complete_count, v_lipsync_total_count
  FROM lip_sync_jobs
  WHERE episode_id = p_episode_id;
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Lip Sync',
    'status', CASE 
      WHEN v_lipsync_total_count = 0 THEN 'not_started'
      WHEN v_lipsync_complete_count >= v_lipsync_total_count THEN 'completed'
      WHEN v_lipsync_complete_count > 0 THEN 'in_progress'
      ELSE 'not_started'
    END,
    'count', v_lipsync_complete_count,
    'total', v_lipsync_total_count,
    'navigation_target', 'production',
    'completed_at', CASE WHEN v_lipsync_complete_count >= v_lipsync_total_count AND v_lipsync_total_count > 0 THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_lipsync_total_count > 0 THEN 'View Lip Sync'
      ELSE 'Setup Lip Sync'
    END,
    'icon', 'Mic',
    'description', CASE 
      WHEN v_lipsync_total_count = 0 THEN 'No dialogue shots'
      WHEN v_lipsync_complete_count = 0 THEN 'Not started'
      ELSE v_lipsync_complete_count || ' of ' || v_lipsync_total_count || ' synced'
    END
  );
  IF v_lipsync_complete_count >= v_lipsync_total_count AND v_lipsync_total_count > 0 THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- 9. Final Video Exported
  v_final_video_exists := v_episode.final_video_url IS NOT NULL AND v_episode.final_video_url != '';
  
  v_milestones := v_milestones || jsonb_build_object(
    'name', 'Final Video',
    'status', CASE 
      WHEN v_final_video_exists THEN 'completed'
      ELSE 'not_started'
    END,
    'count', CASE WHEN v_final_video_exists THEN 1 ELSE 0 END,
    'total', 1,
    'navigation_target', 'production',
    'completed_at', CASE WHEN v_final_video_exists THEN now() ELSE NULL END,
    'action_label', CASE 
      WHEN v_final_video_exists THEN 'View Video'
      ELSE 'Export Video'
    END,
    'icon', 'PlayCircle',
    'description', CASE 
      WHEN v_final_video_exists THEN 'Video exported'
      ELSE 'Not exported yet'
    END
  );
  IF v_final_video_exists THEN
    v_completed_count := v_completed_count + 1;
  END IF;
  
  -- Calculate overall progress
  v_overall_progress := (v_completed_count::numeric / v_total_milestones::numeric) * 100;
  
  RETURN jsonb_build_object(
    'milestones', v_milestones,
    'overall_progress', ROUND(v_overall_progress, 1),
    'completed_count', v_completed_count,
    'total_count', v_total_milestones,
    'episode_id', p_episode_id,
    'episode_title', v_episode.title
  );
END;
$$;