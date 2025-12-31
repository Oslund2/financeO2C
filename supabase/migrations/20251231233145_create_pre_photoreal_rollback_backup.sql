/*
  # Pre-Photoreal Implementation Rollback Backup
  
  This migration creates a backup of all critical data before implementing
  the photoreal historical documentary system. This enables safe rollback
  if issues are encountered.
  
  ## Backup Strategy
  1. Creates backup schema with timestamp
  2. Copies all script-related tables
  3. Copies prompt templates
  4. Creates restore function for easy rollback
  
  ## Tables Backed Up
  - scripts (all script content)
  - script_acts (act structure)
  - script_scenes (scene content)
  - episodes (episode data)
  - storyboards (storyboard data)
  - storyboard_shots (shot details)
  - prompt_templates (system prompts)
  - organizations (workspace types)
  - series (series configuration)
  
  ## Rollback Instructions
  To restore from backup, call: SELECT restore_from_photoreal_backup();
  
  ## Important Notes
  - Backup created: 2024-12-31
  - This is a point-in-time snapshot
  - New data after this migration will NOT be in backup
*/

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS pre_photoreal_backup_20241231;

-- Backup scripts table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.scripts AS
SELECT * FROM public.scripts;

-- Backup script_acts table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.script_acts AS
SELECT * FROM public.script_acts;

-- Backup script_scenes table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.script_scenes AS
SELECT * FROM public.script_scenes;

-- Backup episodes table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.episodes AS
SELECT * FROM public.episodes;

-- Backup storyboards table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.storyboards AS
SELECT * FROM public.storyboards;

-- Backup storyboard_shots table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.storyboard_shots AS
SELECT * FROM public.storyboard_shots;

-- Backup prompt_templates table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.prompt_templates AS
SELECT * FROM public.prompt_templates;

-- Backup organizations table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.organizations AS
SELECT * FROM public.organizations;

-- Backup series table
CREATE TABLE IF NOT EXISTS pre_photoreal_backup_20241231.series AS
SELECT * FROM public.series;

-- Create restore function for easy rollback
CREATE OR REPLACE FUNCTION restore_from_photoreal_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_scripts_count integer;
  v_acts_count integer;
  v_scenes_count integer;
  v_episodes_count integer;
  v_storyboards_count integer;
  v_shots_count integer;
  v_prompts_count integer;
BEGIN
  -- Check if backup exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = 'pre_photoreal_backup_20241231'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Backup schema does not exist'
    );
  END IF;

  -- Begin restoration (order matters for foreign keys)
  
  -- Restore prompt_templates
  DELETE FROM public.prompt_templates;
  INSERT INTO public.prompt_templates
  SELECT * FROM pre_photoreal_backup_20241231.prompt_templates;
  GET DIAGNOSTICS v_prompts_count = ROW_COUNT;
  
  -- Restore organizations (preserves workspace_type)
  UPDATE public.organizations o
  SET workspace_type = b.workspace_type
  FROM pre_photoreal_backup_20241231.organizations b
  WHERE o.id = b.id;
  
  -- Restore series
  UPDATE public.series s
  SET 
    name = b.name,
    description = b.description,
    updated_at = now()
  FROM pre_photoreal_backup_20241231.series b
  WHERE s.id = b.id;
  
  -- Restore storyboard_shots first (child table)
  DELETE FROM public.storyboard_shots 
  WHERE storyboard_id IN (
    SELECT id FROM pre_photoreal_backup_20241231.storyboards
  );
  INSERT INTO public.storyboard_shots
  SELECT * FROM pre_photoreal_backup_20241231.storyboard_shots;
  GET DIAGNOSTICS v_shots_count = ROW_COUNT;
  
  -- Restore storyboards
  DELETE FROM public.storyboards
  WHERE id IN (SELECT id FROM pre_photoreal_backup_20241231.storyboards);
  INSERT INTO public.storyboards
  SELECT * FROM pre_photoreal_backup_20241231.storyboards;
  GET DIAGNOSTICS v_storyboards_count = ROW_COUNT;
  
  -- Restore script_scenes first (child table)
  DELETE FROM public.script_scenes 
  WHERE act_id IN (
    SELECT id FROM pre_photoreal_backup_20241231.script_acts
  );
  INSERT INTO public.script_scenes
  SELECT * FROM pre_photoreal_backup_20241231.script_scenes;
  GET DIAGNOSTICS v_scenes_count = ROW_COUNT;
  
  -- Restore script_acts
  DELETE FROM public.script_acts
  WHERE script_id IN (SELECT id FROM pre_photoreal_backup_20241231.scripts);
  INSERT INTO public.script_acts
  SELECT * FROM pre_photoreal_backup_20241231.script_acts;
  GET DIAGNOSTICS v_acts_count = ROW_COUNT;
  
  -- Restore scripts
  DELETE FROM public.scripts
  WHERE id IN (SELECT id FROM pre_photoreal_backup_20241231.scripts);
  INSERT INTO public.scripts
  SELECT * FROM pre_photoreal_backup_20241231.scripts;
  GET DIAGNOSTICS v_scripts_count = ROW_COUNT;
  
  -- Restore episodes
  UPDATE public.episodes e
  SET 
    title = b.title,
    description = b.description,
    status = b.status,
    updated_at = now()
  FROM pre_photoreal_backup_20241231.episodes b
  WHERE e.id = b.id;
  GET DIAGNOSTICS v_episodes_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'restored_at', now(),
    'counts', jsonb_build_object(
      'scripts', v_scripts_count,
      'acts', v_acts_count,
      'scenes', v_scenes_count,
      'episodes', v_episodes_count,
      'storyboards', v_storyboards_count,
      'shots', v_shots_count,
      'prompts', v_prompts_count
    )
  );
  
  RETURN v_result;
END;
$$;

-- Create function to check backup status
CREATE OR REPLACE FUNCTION check_photoreal_backup_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'backup_exists', EXISTS (
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = 'pre_photoreal_backup_20241231'
    ),
    'backup_date', '2024-12-31',
    'tables_backed_up', ARRAY[
      'scripts', 'script_acts', 'script_scenes', 
      'episodes', 'storyboards', 'storyboard_shots',
      'prompt_templates', 'organizations', 'series'
    ],
    'restore_function', 'restore_from_photoreal_backup()'
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION restore_from_photoreal_backup() TO authenticated;
GRANT EXECUTE ON FUNCTION check_photoreal_backup_status() TO authenticated;
GRANT EXECUTE ON FUNCTION restore_from_photoreal_backup() TO anon;
GRANT EXECUTE ON FUNCTION check_photoreal_backup_status() TO anon;
