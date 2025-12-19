/*
  # Update Episode Defaults Function to Include Format Type
  
  1. Changes
    - Updates get_episode_default_profit_settings function to include format_type from script
    - Returns format_type as part of the default settings JSON
    
  2. Purpose
    - Format labels in Production Economics should match AI Studio format presets
    - Currently format labels are computed from runtime; should use script's format_type
*/

CREATE OR REPLACE FUNCTION public.get_episode_default_profit_settings(p_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_episode episodes%ROWTYPE;
  v_script_format_type text;
  v_trt_metadata jsonb;
  v_content_minutes int;
  v_breaks_count int;
BEGIN
  SELECT * INTO v_episode FROM episodes WHERE id = p_episode_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT s.format_type::text INTO v_script_format_type 
  FROM scripts s 
  WHERE s.id = v_episode.script_id;

  v_trt_metadata := v_episode.trt_metadata;

  v_content_minutes := COALESCE(
    (v_trt_metadata->>'content')::int / 60,
    v_episode.target_runtime_seconds / 60,
    22
  );

  v_breaks_count := COALESCE(
    jsonb_array_length(v_trt_metadata->'break_structure'->'break_positions'),
    CASE 
      WHEN v_content_minutes <= 5 THEN 0
      WHEN v_content_minutes <= 15 THEN 1
      WHEN v_content_minutes <= 22 THEN 3
      ELSE 4
    END
  );

  RETURN jsonb_build_object(
    'program_length_minutes', v_content_minutes + COALESCE((v_trt_metadata->>'opening_sting')::int / 60, 1) + COALESCE((v_trt_metadata->>'closing_sting')::int / 60, 0.5),
    'breaks_per_episode', v_breaks_count,
    'content_minutes', v_content_minutes,
    'target_runtime_seconds', v_episode.target_runtime_seconds,
    'episode_title', v_episode.title,
    'estimated_cost', v_episode.estimated_cost,
    'format_type', COALESCE(v_script_format_type, 'broadcast')
  );
END;
$function$;
