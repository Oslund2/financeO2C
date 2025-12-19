/*
  # Use Script Program Length for Format Label
  
  1. Changes
    - Updates get_episode_default_profit_settings to return script's program_length_minutes
    - The runtime in format labels should match what was pre-selected in AI Studio
    - Falls back to runtime_minutes if program_length_minutes is not set
    
  2. Purpose
    - Format labels like "22 min | Broadcast" should use the script's pre-selected format length
    - Not computed from episode TRT metadata or target_runtime_seconds
*/

CREATE OR REPLACE FUNCTION public.get_episode_default_profit_settings(p_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_episode episodes%ROWTYPE;
  v_script_format_type text;
  v_script_program_length int;
  v_script_runtime int;
  v_trt_metadata jsonb;
  v_content_minutes int;
  v_breaks_count int;
  v_display_minutes int;
BEGIN
  SELECT * INTO v_episode FROM episodes WHERE id = p_episode_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT 
    s.format_type::text, 
    s.program_length_minutes,
    s.runtime_minutes
  INTO v_script_format_type, v_script_program_length, v_script_runtime
  FROM scripts s 
  WHERE s.id = v_episode.script_id;

  v_trt_metadata := v_episode.trt_metadata;

  v_content_minutes := COALESCE(
    (v_trt_metadata->>'content')::int / 60,
    v_episode.target_runtime_seconds / 60,
    22
  );

  v_display_minutes := COALESCE(
    v_script_program_length,
    v_script_runtime,
    v_content_minutes
  );

  v_breaks_count := COALESCE(
    jsonb_array_length(v_trt_metadata->'break_structure'->'break_positions'),
    CASE 
      WHEN v_display_minutes <= 5 THEN 0
      WHEN v_display_minutes <= 15 THEN 1
      WHEN v_display_minutes <= 22 THEN 3
      ELSE 4
    END
  );

  RETURN jsonb_build_object(
    'program_length_minutes', v_display_minutes,
    'breaks_per_episode', v_breaks_count,
    'content_minutes', v_content_minutes,
    'target_runtime_seconds', v_episode.target_runtime_seconds,
    'episode_title', v_episode.title,
    'estimated_cost', v_episode.estimated_cost,
    'format_type', COALESCE(v_script_format_type, 'broadcast'),
    'script_program_length', v_script_program_length,
    'script_runtime_minutes', v_script_runtime
  );
END;
$function$;
