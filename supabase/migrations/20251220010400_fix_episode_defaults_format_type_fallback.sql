/*
  # Fix Episode Defaults to Use Format Type Fallback

  ## Problem
  When scripts don't have an explicit program_length_minutes, the function
  calculates from TRT metadata which gives inconsistent results. Instead,
  it should default based on format_type:
  - broadcast: 22 min
  - streaming: 22 min
  - short_form: 5 min
  - medium_form: 10 min

  ## Changes
  - Update get_episode_default_profit_settings to use format-specific defaults
  - Only fall back to TRT calculation if format_type is 'custom'
*/

CREATE OR REPLACE FUNCTION get_episode_default_profit_settings(p_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_episode episodes%ROWTYPE;
  v_script record;
  v_trt_metadata jsonb;
  v_content_minutes int;
  v_program_length_minutes int;
  v_breaks_count int;
  v_format_type text;
BEGIN
  SELECT * INTO v_episode FROM episodes WHERE id = p_episode_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  SELECT program_length_minutes, format_type::text
  INTO v_script
  FROM scripts
  WHERE id = v_episode.script_id;
  
  v_trt_metadata := v_episode.trt_metadata;
  v_format_type := COALESCE(v_script.format_type, 'broadcast');
  
  IF v_script.program_length_minutes IS NOT NULL THEN
    v_program_length_minutes := v_script.program_length_minutes;
  ELSE
    v_program_length_minutes := CASE v_format_type
      WHEN 'broadcast' THEN 22
      WHEN 'streaming' THEN 22
      WHEN 'short_form' THEN 5
      WHEN 'medium_form' THEN 10
      ELSE COALESCE(
        (v_trt_metadata->>'content')::int / 60 + 2,
        v_episode.target_runtime_seconds / 60,
        22
      )
    END;
  END IF;
  
  v_content_minutes := CASE v_format_type
    WHEN 'broadcast' THEN v_program_length_minutes
    WHEN 'streaming' THEN v_program_length_minutes
    ELSE v_program_length_minutes
  END;
  
  v_breaks_count := CASE v_format_type
    WHEN 'broadcast' THEN 
      CASE 
        WHEN v_program_length_minutes <= 11 THEN 2
        WHEN v_program_length_minutes <= 22 THEN 3
        ELSE 4
      END
    WHEN 'streaming' THEN 0
    WHEN 'short_form' THEN 0
    WHEN 'medium_form' THEN 1
    ELSE COALESCE(
      jsonb_array_length(v_trt_metadata->'break_structure'->'break_positions'),
      0
    )
  END;
  
  RETURN jsonb_build_object(
    'program_length_minutes', v_program_length_minutes,
    'breaks_per_episode', v_breaks_count,
    'content_minutes', v_content_minutes,
    'target_runtime_seconds', v_episode.target_runtime_seconds,
    'episode_title', v_episode.title,
    'estimated_cost', v_episode.estimated_cost,
    'format_type', v_format_type
  );
END;
$$;
