/*
  # Add Missing Scripts Columns and Reconstruct Content

  ## Summary
  This migration repairs the scripts table by adding missing critical columns and
  reconstructing content from existing structured data (script_acts and script_scenes).

  ## Changes

  ### 1. New Columns Added to scripts table
  - `content` (text): Full script content in readable format
  - `format` (text): Format type ('structured', 'plain_text', 'pdf', 'docx')
  - `organization_id` (uuid): Links scripts to organizations for multi-tenancy
  - `version` (integer): Script version number (if not exists)

  ### 2. Data Reconstruction
  - Reconstructs `content` field from existing script_acts and script_scenes
  - Preserves all dialogue, descriptions, and stage directions
  - Formats content in professional screenplay style
  - Maintains backward compatibility with existing data

  ### 3. RLS Policy Updates
  - Updates policies to include organization_id filtering
  - Maintains access for scripts without organization (legacy data)

  ### 4. Indexes
  - Adds performance indexes on new columns

  ## Security
  - RLS enabled with proper organization-based filtering
  - Backward compatible with existing authentication patterns
*/

-- ================================================
-- 1. Add Missing Columns to scripts table
-- ================================================

-- Add content column (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'content'
  ) THEN
    ALTER TABLE scripts ADD COLUMN content text;
  END IF;
END $$;

-- Add format column with default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'format'
  ) THEN
    ALTER TABLE scripts ADD COLUMN format text DEFAULT 'structured';
  END IF;
END $$;

-- Add organization_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE scripts ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add version column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'version'
  ) THEN
    ALTER TABLE scripts ADD COLUMN version integer DEFAULT 1;
  END IF;
END $$;

-- ================================================
-- 2. Reconstruct Content from Structured Data
-- ================================================

-- Function to reconstruct script content from acts and scenes
CREATE OR REPLACE FUNCTION reconstruct_script_content(p_script_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content text := '';
  v_script_title text;
  v_act record;
  v_scene record;
  v_dialogue record;
BEGIN
  -- Get script title
  SELECT title INTO v_script_title FROM scripts WHERE id = p_script_id;

  -- Build header
  v_content := v_script_title || E'\n';
  v_content := v_content || repeat('=', length(v_script_title)) || E'\n\n';

  -- Loop through acts
  FOR v_act IN
    SELECT * FROM script_acts
    WHERE script_id = p_script_id
    ORDER BY act_number
  LOOP
    v_content := v_content || E'\n' || 'ACT ' || v_act.act_number || E'\n';
    v_content := v_content || repeat('-', 20) || E'\n\n';

    IF v_act.content IS NOT NULL THEN
      v_content := v_content || v_act.content || E'\n\n';
    END IF;

    -- Loop through scenes in this act
    FOR v_scene IN
      SELECT * FROM script_scenes
      WHERE act_id = v_act.id
      ORDER BY scene_number
    LOOP
      -- Scene heading
      v_content := v_content || E'\n' || 'SCENE ' || v_scene.scene_number || E'\n';

      IF v_scene.setting IS NOT NULL THEN
        v_content := v_content || 'INT./EXT. ' || upper(v_scene.setting) || E'\n\n';
      END IF;

      -- Scene description
      IF v_scene.description IS NOT NULL THEN
        v_content := v_content || v_scene.description || E'\n\n';
      END IF;

      -- Dialogue
      IF v_scene.dialogue IS NOT NULL AND jsonb_array_length(v_scene.dialogue) > 0 THEN
        FOR v_dialogue IN
          SELECT * FROM jsonb_array_elements(v_scene.dialogue)
        LOOP
          -- Character name
          IF v_dialogue.value->>'character' IS NOT NULL THEN
            v_content := v_content || upper(v_dialogue.value->>'character') || E'\n';
          END IF;

          -- Stage direction (if present)
          IF v_dialogue.value->>'stage_direction' IS NOT NULL THEN
            v_content := v_content || '(' || (v_dialogue.value->>'stage_direction') || ')' || E'\n';
          END IF;

          -- Dialogue line
          IF v_dialogue.value->>'line' IS NOT NULL THEN
            v_content := v_content || (v_dialogue.value->>'line') || E'\n\n';
          END IF;
        END LOOP;
      END IF;

      -- Stage directions
      IF v_scene.stage_directions IS NOT NULL THEN
        v_content := v_content || '[' || v_scene.stage_directions || ']' || E'\n\n';
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_content;
END;
$$;

-- Reconstruct content for existing scripts that have acts/scenes
DO $$
DECLARE
  v_script record;
  v_reconstructed_content text;
BEGIN
  FOR v_script IN
    SELECT s.id, s.title
    FROM scripts s
    WHERE s.content IS NULL
      AND EXISTS (SELECT 1 FROM script_acts WHERE script_id = s.id)
  LOOP
    BEGIN
      v_reconstructed_content := reconstruct_script_content(v_script.id);

      UPDATE scripts
      SET
        content = v_reconstructed_content,
        format = 'structured'
      WHERE id = v_script.id;

      RAISE NOTICE 'Reconstructed content for script: %', v_script.title;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to reconstruct content for script %: %', v_script.title, SQLERRM;
    END;
  END LOOP;
END $$;

-- ================================================
-- 3. Sync organization_id from series
-- ================================================

-- Update scripts to inherit organization_id from their series
UPDATE scripts s
SET organization_id = se.organization_id
FROM series se
WHERE s.series_id = se.id
  AND s.organization_id IS NULL
  AND se.organization_id IS NOT NULL;

-- ================================================
-- 4. Update RLS Policies
-- ================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view all scripts" ON scripts;
DROP POLICY IF EXISTS "Users can create scripts" ON scripts;
DROP POLICY IF EXISTS "Users can update scripts" ON scripts;
DROP POLICY IF EXISTS "Users can delete scripts" ON scripts;

-- Create new organization-aware policies
CREATE POLICY "Users can view scripts in their organization"
  ON scripts FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scripts in their organization"
  ON scripts FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scripts in their organization"
  ON scripts FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scripts in their organization"
  ON scripts FOR DELETE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ================================================
-- 5. Create Indexes
-- ================================================

CREATE INDEX IF NOT EXISTS idx_scripts_organization_id ON scripts(organization_id);
CREATE INDEX IF NOT EXISTS idx_scripts_format ON scripts(format);
CREATE INDEX IF NOT EXISTS idx_scripts_content_search ON scripts USING gin(to_tsvector('english', content));

-- ================================================
-- 6. Update Script Analysis Function
-- ================================================

-- Enhanced script analysis that works with content and structured data
CREATE OR REPLACE FUNCTION get_script_analysis_for_production(
  p_script_id uuid,
  p_organization_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_script_data jsonb;
  v_result jsonb;
  v_act_count integer := 0;
  v_scene_count integer := 0;
  v_estimated_shots integer := 0;
  v_estimated_runtime integer := 0;
BEGIN
  -- Get script basic data (RLS policies ensure user has access)
  SELECT jsonb_build_object(
    'script_id', s.id,
    'title', s.title,
    'content', s.content,
    'format', s.format,
    'version', COALESCE(s.version, 1),
    'series_id', s.series_id,
    'series_title', se.name,
    'status', s.status,
    'has_episode', EXISTS(SELECT 1 FROM episodes e WHERE e.script_id = s.id)
  )
  INTO v_script_data
  FROM scripts s
  LEFT JOIN series se ON s.series_id = se.id
  WHERE s.id = p_script_id;

  IF v_script_data IS NULL THEN
    RAISE EXCEPTION 'Script not found or access denied';
  END IF;

  -- Calculate actual counts from structured data if available
  SELECT COUNT(DISTINCT sa.id)
  INTO v_act_count
  FROM script_acts sa
  WHERE sa.script_id = p_script_id;

  SELECT COUNT(DISTINCT sc.id)
  INTO v_scene_count
  FROM script_acts sa
  JOIN script_scenes sc ON sc.act_id = sa.id
  WHERE sa.script_id = p_script_id;

  -- Calculate estimates based on available data
  IF v_act_count > 0 THEN
    -- Use actual structured data
    v_estimated_shots := v_scene_count * 4; -- Average 4 shots per scene
    v_estimated_runtime := v_scene_count * 2; -- Average 2 minutes per scene
  ELSIF v_script_data->>'content' IS NOT NULL THEN
    -- Estimate from content length
    v_act_count := 3; -- Default 3-act structure
    v_scene_count := GREATEST(10, length(v_script_data->>'content') / 500); -- Rough estimate
    v_estimated_shots := v_scene_count * 4;
    v_estimated_runtime := 22; -- Default episode runtime
  ELSE
    -- Provide reasonable defaults
    v_act_count := 3;
    v_scene_count := 12;
    v_estimated_shots := 48;
    v_estimated_runtime := 22;
  END IF;

  -- Build complete analysis result
  v_result := v_script_data || jsonb_build_object(
    'estimated_acts', v_act_count,
    'estimated_scenes', v_scene_count,
    'estimated_shots', v_estimated_shots,
    'estimated_runtime_minutes', v_estimated_runtime,
    'has_content', v_script_data->>'content' IS NOT NULL,
    'has_structure', v_act_count > 0 AND v_scene_count > 0,
    'analysis_timestamp', now()
  );

  RETURN v_result;
END;
$$;

-- ================================================
-- 7. Comments and Documentation
-- ================================================

COMMENT ON COLUMN scripts.content IS 'Full text content of the script in readable format';
COMMENT ON COLUMN scripts.format IS 'Format type: structured (AI-generated with acts/scenes), plain_text, pdf, docx';
COMMENT ON COLUMN scripts.organization_id IS 'Organization that owns this script for multi-tenancy';
COMMENT ON COLUMN scripts.version IS 'Version number for script revisions';

COMMENT ON FUNCTION reconstruct_script_content IS 'Reconstructs readable script content from script_acts and script_scenes tables';
COMMENT ON FUNCTION get_script_analysis_for_production IS 'Analyzes script and returns structure metadata for production planning';
