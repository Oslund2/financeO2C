/*
  # Dashboard IP Sections Customization

  ## Overview
  Creates a system for customizing the "Leveraging Iconic IP" section on the dashboard
  per organization and per series. Supports three-tier fallback: series-specific,
  organization default, or system default (hardcoded).

  ## New Tables

  ### dashboard_ip_sections
  - `id` (uuid, primary key): Unique identifier
  - `organization_id` (uuid, required): Links to organizations table
  - `series_id` (uuid, nullable): Links to series table (null = org-wide default)
  - `section_title` (text): Main section title
  - `section_description_1` (text): First paragraph of description
  - `section_description_2` (text): Second paragraph of description
  - `card_1_title` (text): Title for first card
  - `card_1_icon` (text): Icon name for first card
  - `card_1_items` (jsonb): Array of bullet points for first card
  - `card_2_title` (text): Title for second card
  - `card_2_icon` (text): Icon name for second card
  - `card_2_items` (jsonb): Array of bullet points for second card
  - `card_3_title` (text): Title for third card
  - `card_3_icon` (text): Icon name for third card
  - `card_3_items` (jsonb): Array of bullet points for third card
  - `created_at` (timestamptz): Creation timestamp
  - `updated_at` (timestamptz): Last update timestamp
  - `created_by` (uuid): User who created this customization
  - `updated_by` (uuid): User who last updated this customization

  ## Security
  - RLS enabled with policies for organization members
  - Users can only view/edit their own organization's customizations
  - Audit trail with created_by and updated_by fields
*/

-- Create dashboard IP sections table
CREATE TABLE IF NOT EXISTS dashboard_ip_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,

  -- Main section content
  section_title text NOT NULL DEFAULT 'Leveraging Iconic IP for Global Entertainment',
  section_description_1 text NOT NULL,
  section_description_2 text NOT NULL,

  -- Card 1 (Production Format)
  card_1_title text NOT NULL,
  card_1_icon text NOT NULL DEFAULT 'Tv',
  card_1_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Card 2 (Dynamic Monetization)
  card_2_title text NOT NULL,
  card_2_icon text NOT NULL DEFAULT 'DollarSign',
  card_2_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Card 3 (Global Scale)
  card_3_title text NOT NULL,
  card_3_icon text NOT NULL DEFAULT 'Globe',
  card_3_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- Ensure only one customization per organization OR per series
  UNIQUE(organization_id, series_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_ip_sections_org ON dashboard_ip_sections(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_ip_sections_series ON dashboard_ip_sections(series_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_ip_sections_lookup ON dashboard_ip_sections(organization_id, series_id);

-- Enable RLS
ALTER TABLE dashboard_ip_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's dashboard customizations
CREATE POLICY "Users can view organization dashboard customizations"
  ON dashboard_ip_sections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert dashboard customizations for their organizations
CREATE POLICY "Users can create organization dashboard customizations"
  ON dashboard_ip_sections FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their organization's dashboard customizations
CREATE POLICY "Users can update organization dashboard customizations"
  ON dashboard_ip_sections FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their organization's dashboard customizations
CREATE POLICY "Users can delete organization dashboard customizations"
  ON dashboard_ip_sections FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to get dashboard IP section with fallback logic
CREATE OR REPLACE FUNCTION get_dashboard_ip_section(
  org_uuid uuid,
  series_uuid uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  series_custom record;
  org_custom record;
BEGIN
  -- Try to get series-specific customization first
  IF series_uuid IS NOT NULL THEN
    SELECT * INTO series_custom
    FROM dashboard_ip_sections
    WHERE organization_id = org_uuid
      AND series_id = series_uuid;

    IF FOUND THEN
      SELECT jsonb_build_object(
        'id', series_custom.id,
        'source', 'series',
        'section_title', series_custom.section_title,
        'section_description_1', series_custom.section_description_1,
        'section_description_2', series_custom.section_description_2,
        'card_1', jsonb_build_object(
          'title', series_custom.card_1_title,
          'icon', series_custom.card_1_icon,
          'items', series_custom.card_1_items
        ),
        'card_2', jsonb_build_object(
          'title', series_custom.card_2_title,
          'icon', series_custom.card_2_icon,
          'items', series_custom.card_2_items
        ),
        'card_3', jsonb_build_object(
          'title', series_custom.card_3_title,
          'icon', series_custom.card_3_icon,
          'items', series_custom.card_3_items
        )
      ) INTO result;
      RETURN result;
    END IF;
  END IF;

  -- Try organization-level default
  SELECT * INTO org_custom
  FROM dashboard_ip_sections
  WHERE organization_id = org_uuid
    AND series_id IS NULL;

  IF FOUND THEN
    SELECT jsonb_build_object(
      'id', org_custom.id,
      'source', 'organization',
      'section_title', org_custom.section_title,
      'section_description_1', org_custom.section_description_1,
      'section_description_2', org_custom.section_description_2,
      'card_1', jsonb_build_object(
        'title', org_custom.card_1_title,
        'icon', org_custom.card_1_icon,
        'items', org_custom.card_1_items
      ),
      'card_2', jsonb_build_object(
        'title', org_custom.card_2_title,
        'icon', org_custom.card_2_icon,
        'items', org_custom.card_2_items
      ),
      'card_3', jsonb_build_object(
        'title', org_custom.card_3_title,
        'icon', org_custom.card_3_icon,
        'items', org_custom.card_3_items
      )
    ) INTO result;
    RETURN result;
  END IF;

  -- Return null if no customization found (will use system defaults in frontend)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert dashboard IP section
CREATE OR REPLACE FUNCTION upsert_dashboard_ip_section(
  org_uuid uuid,
  series_uuid uuid,
  section_data jsonb,
  user_uuid uuid
)
RETURNS jsonb AS $$
DECLARE
  result_id uuid;
  existing_id uuid;
BEGIN
  -- Check if customization already exists
  SELECT id INTO existing_id
  FROM dashboard_ip_sections
  WHERE organization_id = org_uuid
    AND (
      (series_uuid IS NULL AND series_id IS NULL) OR
      (series_uuid IS NOT NULL AND series_id = series_uuid)
    );

  IF existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE dashboard_ip_sections
    SET
      section_title = section_data->>'section_title',
      section_description_1 = section_data->>'section_description_1',
      section_description_2 = section_data->>'section_description_2',
      card_1_title = section_data->'card_1'->>'title',
      card_1_icon = section_data->'card_1'->>'icon',
      card_1_items = section_data->'card_1'->'items',
      card_2_title = section_data->'card_2'->>'title',
      card_2_icon = section_data->'card_2'->>'icon',
      card_2_items = section_data->'card_2'->'items',
      card_3_title = section_data->'card_3'->>'title',
      card_3_icon = section_data->'card_3'->>'icon',
      card_3_items = section_data->'card_3'->'items',
      updated_at = now(),
      updated_by = user_uuid
    WHERE id = existing_id
    RETURNING id INTO result_id;
  ELSE
    -- Insert new
    INSERT INTO dashboard_ip_sections (
      organization_id,
      series_id,
      section_title,
      section_description_1,
      section_description_2,
      card_1_title,
      card_1_icon,
      card_1_items,
      card_2_title,
      card_2_icon,
      card_2_items,
      card_3_title,
      card_3_icon,
      card_3_items,
      created_by,
      updated_by
    ) VALUES (
      org_uuid,
      series_uuid,
      section_data->>'section_title',
      section_data->>'section_description_1',
      section_data->>'section_description_2',
      section_data->'card_1'->>'title',
      section_data->'card_1'->>'icon',
      section_data->'card_1'->'items',
      section_data->'card_2'->>'title',
      section_data->'card_2'->>'icon',
      section_data->'card_2'->'items',
      section_data->'card_3'->>'title',
      section_data->'card_3'->>'icon',
      section_data->'card_3'->'items',
      user_uuid,
      user_uuid
    )
    RETURNING id INTO result_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete dashboard IP section customization
CREATE OR REPLACE FUNCTION delete_dashboard_ip_section(
  org_uuid uuid,
  series_uuid uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM dashboard_ip_sections
  WHERE organization_id = org_uuid
    AND (
      (series_uuid IS NULL AND series_id IS NULL) OR
      (series_uuid IS NOT NULL AND series_id = series_uuid)
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'deleted', deleted_count);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'No customization found to delete');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
