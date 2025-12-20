/*
  # Fix Episode Default Profit Settings to Use Script Format

  ## Problem
  The get_episode_default_profit_settings function calculates program_length_minutes
  from TRT metadata instead of using the script's actual program_length_minutes and
  format_type. This causes:
  - Wrong format labels (showing "30 min" when script is "5 min")
  - Wrong lifetime profit calculations
  - Inconsistent ROI calculations

  ## Solution
  Update the function to use the script's program_length_minutes and format_type
  as the primary source, falling back to TRT metadata only when script values are NULL.
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
  
  -- Get script info for program_length and format_type
  SELECT program_length_minutes, format_type::text
  INTO v_script
  FROM scripts
  WHERE id = v_episode.script_id;
  
  v_trt_metadata := v_episode.trt_metadata;
  
  -- Use script's program_length_minutes as primary source
  -- Fall back to TRT metadata or defaults if not set
  IF v_script.program_length_minutes IS NOT NULL THEN
    v_program_length_minutes := v_script.program_length_minutes;
    v_content_minutes := GREATEST(v_program_length_minutes - 2, 1); -- Estimate content as program minus stings
  ELSE
    v_content_minutes := COALESCE(
      (v_trt_metadata->>'content')::int / 60,
      v_episode.target_runtime_seconds / 60,
      22
    );
    v_program_length_minutes := v_content_minutes + 
      COALESCE((v_trt_metadata->>'opening_sting')::int / 60, 1) + 
      COALESCE((v_trt_metadata->>'closing_sting')::int / 60, 1);
  END IF;
  
  -- Use script's format_type, default to 'broadcast' if not set
  v_format_type := COALESCE(v_script.format_type, 'broadcast');
  
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
