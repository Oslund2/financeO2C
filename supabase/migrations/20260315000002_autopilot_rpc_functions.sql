-- RPC functions for autopilot_runs
-- Bypasses PostgREST table schema cache by using function calls instead

-- Insert a new autopilot run, returns the new row's id
CREATE OR REPLACE FUNCTION public.insert_autopilot_run(
  p_series_id uuid,
  p_organization_id uuid,
  p_storyline text,
  p_format_type text DEFAULT 'streaming',
  p_target_runtime_minutes integer DEFAULT 5,
  p_quality_preset text DEFAULT 'balanced'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.autopilot_runs (
    series_id, organization_id, storyline,
    format_type, target_runtime_minutes, quality_preset,
    current_state, progress_percent
  ) VALUES (
    p_series_id, p_organization_id, p_storyline,
    p_format_type, p_target_runtime_minutes, p_quality_preset,
    'initiated', 0
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Update an autopilot run with a JSONB payload of fields
CREATE OR REPLACE FUNCTION public.update_autopilot_run(
  p_run_id uuid,
  p_data jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.autopilot_runs SET
    current_state = COALESCE(p_data->>'current_state', current_state),
    progress_percent = COALESCE((p_data->>'progress_percent')::integer, progress_percent),
    current_stage_detail = CASE WHEN p_data ? 'current_stage_detail' THEN p_data->>'current_stage_detail' ELSE current_stage_detail END,
    stages_completed = CASE WHEN p_data ? 'stages_completed' THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'stages_completed')) ELSE stages_completed END,
    decision_log = CASE WHEN p_data ? 'decision_log' THEN p_data->'decision_log' ELSE decision_log END,
    episode_id = CASE WHEN p_data ? 'episode_id' THEN (p_data->>'episode_id')::uuid ELSE episode_id END,
    script_id = CASE WHEN p_data ? 'script_id' THEN (p_data->>'script_id')::uuid ELSE script_id END,
    started_at = CASE WHEN p_data ? 'started_at' THEN (p_data->>'started_at')::timestamptz ELSE started_at END,
    completed_at = CASE WHEN p_data ? 'completed_at' THEN (p_data->>'completed_at')::timestamptz ELSE completed_at END,
    output_video_url = CASE WHEN p_data ? 'output_video_url' THEN p_data->>'output_video_url' ELSE output_video_url END,
    error_message = CASE WHEN p_data ? 'error_message' THEN p_data->>'error_message' ELSE error_message END,
    retry_count = COALESCE((p_data->>'retry_count')::integer, retry_count),
    estimated_cost_usd = CASE WHEN p_data ? 'estimated_cost_usd' THEN (p_data->>'estimated_cost_usd')::numeric ELSE estimated_cost_usd END,
    actual_cost_usd = CASE WHEN p_data ? 'actual_cost_usd' THEN (p_data->>'actual_cost_usd')::numeric ELSE actual_cost_usd END
  WHERE id = p_run_id;
END;
$$;

-- Get a single autopilot run by id
CREATE OR REPLACE FUNCTION public.get_autopilot_run(
  p_run_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT to_jsonb(r) INTO v_result
  FROM public.autopilot_runs r
  WHERE r.id = p_run_id;
  RETURN v_result;
END;
$$;

-- Get autopilot runs for an organization (most recent 20)
CREATE OR REPLACE FUNCTION public.get_autopilot_runs_for_org(
  p_organization_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(to_jsonb(r))
  INTO v_result
  FROM (
    SELECT *
    FROM public.autopilot_runs
    WHERE organization_id = p_organization_id
    ORDER BY created_at DESC
    LIMIT 20
  ) r;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_autopilot_run TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_autopilot_run TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_autopilot_run TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_autopilot_runs_for_org TO authenticated;
