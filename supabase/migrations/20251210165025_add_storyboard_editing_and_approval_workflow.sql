/*
  # Enhanced Storyboard Editing and Approval Workflow

  ## Overview
  Adds comprehensive editing capabilities, approval workflow, and version tracking for storyboard shots.

  ## New Tables

  ### 1. storyboard_shot_edits
  Tracks all modifications made to storyboard shots for audit trail
  - `id` (uuid, primary key): Unique edit record identifier
  - `shot_id` (uuid, foreign key): Links to storyboard_shots table
  - `edited_by` (text): User who made the edit
  - `edit_type` (text): Type of edit (metadata, prompt, image, description)
  - `field_name` (text): Specific field that was edited
  - `old_value` (jsonb): Previous value before edit
  - `new_value` (jsonb): New value after edit
  - `edit_notes` (text): Optional notes about the edit
  - `created_at` (timestamptz): When the edit was made

  ### 2. storyboard_image_versions
  Stores multiple versions of images for each shot
  - `id` (uuid, primary key): Unique version identifier
  - `shot_id` (uuid, foreign key): Links to storyboard_shots table
  - `version_number` (integer): Sequential version number
  - `image_url` (text): URL to the image version
  - `thumbnail_url` (text): URL to thumbnail version
  - `source` (text): Source of image (ai_generated, manual_upload, edited)
  - `generation_metadata` (jsonb): Metadata about how this version was created
  - `is_favorite` (boolean): Whether this version is marked as favorite
  - `created_at` (timestamptz): When this version was created

  ## Enhanced Columns for storyboard_shots

  - `approval_status` (text): Current approval status (draft, pending_review, approved, rejected)
  - `approved_by` (text): Who approved this shot
  - `approved_at` (timestamptz): When the shot was approved
  - `review_notes` (text): Feedback and review comments
  - `current_version` (integer): Current active image version number
  - `last_edited_by` (text): Last person to edit this shot
  - `last_edited_at` (timestamptz): When the shot was last edited
  - `published` (boolean): Whether this shot is published/finalized

  ## Security
  - RLS enabled on all new tables
  - Authenticated users can create/view edit history
  - Authenticated users can manage image versions
  - Policies allow for comprehensive audit trail

  ## Indexes
  - Performance indexes on shot_id, approval_status, and timestamps
  - Composite indexes for common filtering patterns
*/

-- Add new columns to storyboard_shots table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN approval_status text DEFAULT 'draft';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN approved_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN review_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'current_version'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN current_version integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'last_edited_by'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN last_edited_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN last_edited_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storyboard_shots' AND column_name = 'published'
  ) THEN
    ALTER TABLE storyboard_shots ADD COLUMN published boolean DEFAULT false;
  END IF;
END $$;

-- Create storyboard_shot_edits table
CREATE TABLE IF NOT EXISTS storyboard_shot_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_id uuid REFERENCES storyboard_shots(id) ON DELETE CASCADE NOT NULL,
  edited_by text DEFAULT 'system',
  edit_type text NOT NULL,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  edit_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE storyboard_shot_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shot edits"
  ON storyboard_shot_edits FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create shot edits"
  ON storyboard_shot_edits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create storyboard_image_versions table
CREATE TABLE IF NOT EXISTS storyboard_image_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_id uuid REFERENCES storyboard_shots(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  image_url text NOT NULL,
  thumbnail_url text,
  source text DEFAULT 'manual_upload',
  generation_metadata jsonb DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shot_id, version_number)
);

ALTER TABLE storyboard_image_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view image versions"
  ON storyboard_image_versions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create image versions"
  ON storyboard_image_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update image versions"
  ON storyboard_image_versions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete image versions"
  ON storyboard_image_versions FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_approval_status ON storyboard_shots(approval_status);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_published ON storyboard_shots(published);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_last_edited_at ON storyboard_shots(last_edited_at);

CREATE INDEX IF NOT EXISTS idx_storyboard_shot_edits_shot_id ON storyboard_shot_edits(shot_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_shot_edits_created_at ON storyboard_shot_edits(created_at);
CREATE INDEX IF NOT EXISTS idx_storyboard_shot_edits_edit_type ON storyboard_shot_edits(edit_type);

CREATE INDEX IF NOT EXISTS idx_storyboard_image_versions_shot_id ON storyboard_image_versions(shot_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_image_versions_version_number ON storyboard_image_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_storyboard_image_versions_is_favorite ON storyboard_image_versions(is_favorite);

-- Function to automatically track edits when shots are updated
CREATE OR REPLACE FUNCTION track_storyboard_shot_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- Track significant changes to shot metadata
  IF OLD.shot_description IS DISTINCT FROM NEW.shot_description THEN
    INSERT INTO storyboard_shot_edits (shot_id, edit_type, field_name, old_value, new_value)
    VALUES (NEW.id, 'metadata', 'shot_description', to_jsonb(OLD.shot_description), to_jsonb(NEW.shot_description));
  END IF;

  IF OLD.image_prompt IS DISTINCT FROM NEW.image_prompt THEN
    INSERT INTO storyboard_shot_edits (shot_id, edit_type, field_name, old_value, new_value)
    VALUES (NEW.id, 'metadata', 'image_prompt', to_jsonb(OLD.image_prompt), to_jsonb(NEW.image_prompt));
  END IF;

  IF OLD.shot_type IS DISTINCT FROM NEW.shot_type THEN
    INSERT INTO storyboard_shot_edits (shot_id, edit_type, field_name, old_value, new_value)
    VALUES (NEW.id, 'metadata', 'shot_type', to_jsonb(OLD.shot_type), to_jsonb(NEW.shot_type));
  END IF;

  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO storyboard_shot_edits (shot_id, edit_type, field_name, old_value, new_value)
    VALUES (NEW.id, 'approval', 'approval_status', to_jsonb(OLD.approval_status), to_jsonb(NEW.approval_status));
  END IF;

  -- Update last_edited_at timestamp
  NEW.last_edited_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking edits
DROP TRIGGER IF EXISTS trigger_track_storyboard_shot_edit ON storyboard_shots;
CREATE TRIGGER trigger_track_storyboard_shot_edit
  BEFORE UPDATE ON storyboard_shots
  FOR EACH ROW
  EXECUTE FUNCTION track_storyboard_shot_edit();