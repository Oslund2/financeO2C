/*
  # Create Optimized Script Queries RPC Function
  
  1. New Function
    - `get_scripts_with_lock_info(p_series_id uuid, p_organization_id uuid)` - Returns scripts with pre-joined lock info and episode counts
    
  2. Purpose
    - Eliminates N+1 query pattern by fetching all related data in a single database query
    - Returns scripts with: locked, locked_by, locked_at, episode_count, associated_episodes (JSON array)
    
  3. Performance Impact
    - Reduces database round trips from O(n*2) to O(1)
    - For 50 scripts: from ~100 queries to 1 query

  4. Second Function
    - `get_script_acts_with_scenes(p_script_id uuid)` - Returns acts with pre-joined scenes
    - Eliminates N+1 when loading script editor content
*/

CREATE OR REPLACE FUNCTION get_scripts_with_lock_info(
  p_series_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  series_id uuid,
  organization_id uuid,
  title text,
  episode_number int,
  season_number int,
  runtime_minutes int,
  synopsis text,
  theme text,
  vocabulary_words text[],
  status text,
  ai_generated boolean,
  generation_prompt text,
  content text,
  format text,
  version int,
  locked boolean,
  locked_by text,
  locked_at timestamptz,
  created_by text,
  created_at timestamptz,
  updated_at timestamptz,
  episode_count int,
  associated_episodes jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH episode_data AS (
    SELECT 
      e.script_id,
      COUNT(*)::int AS episode_count,
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'title', e.title,
          'status', e.status
        ) ORDER BY e.created_at
      ) AS associated_episodes
    FROM episodes e
    WHERE e.script_id IS NOT NULL
    GROUP BY e.script_id
  )
  SELECT 
    s.id,
    s.series_id,
    s.organization_id,
    s.title,
    s.episode_number,
    s.season_number,
    s.runtime_minutes,
    s.synopsis,
    s.theme,
    s.vocabulary_words,
    s.status,
    s.ai_generated,
    s.generation_prompt,
    s.content,
    s.format,
    s.version,
    COALESCE(s.locked, false) AS locked,
    s.locked_by,
    s.locked_at,
    s.created_by,
    s.created_at,
    s.updated_at,
    COALESCE(ed.episode_count, 0) AS episode_count,
    COALESCE(ed.associated_episodes, '[]'::jsonb) AS associated_episodes
  FROM scripts s
  LEFT JOIN episode_data ed ON ed.script_id = s.id
  WHERE (p_series_id IS NULL OR s.series_id = p_series_id)
    AND (p_organization_id IS NULL OR s.organization_id = p_organization_id)
  ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_script_acts_with_scenes(p_script_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'script_id', a.script_id,
      'act_number', a.act_number,
      'content', a.content,
      'duration_estimate', a.duration_estimate,
      'notes', a.notes,
      'created_at', a.created_at,
      'updated_at', a.updated_at,
      'scenes', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', sc.id,
              'act_id', sc.act_id,
              'scene_number', sc.scene_number,
              'setting', sc.setting,
              'description', sc.description,
              'dialogue', sc.dialogue,
              'stage_directions', sc.stage_directions,
              'characters', sc.characters,
              'duration_estimate', sc.duration_estimate,
              'created_at', sc.created_at,
              'updated_at', sc.updated_at
            ) ORDER BY sc.scene_number
          )
          FROM script_scenes sc
          WHERE sc.act_id = a.id
        ),
        '[]'::jsonb
      )
    ) ORDER BY a.act_number
  )
  INTO v_result
  FROM script_acts a
  WHERE a.script_id = p_script_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
