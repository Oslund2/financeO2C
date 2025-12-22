/*
  # Bulk Copyright Registration System

  1. New Tables
    - `copyright_bulk_registrations`
      - `id` (uuid, primary key) - Unique identifier for the bulk registration batch
      - `organization_id` (uuid) - Organization that created the bulk registration
      - `status` (text) - Status of the bulk registration (pending, processing, completed, failed)
      - `total_items` (int) - Total number of items to register
      - `completed_items` (int) - Number of items successfully registered
      - `author_config` (jsonb) - Common author/claimant configuration used for all items
      - `created_by` (uuid) - User who initiated the bulk registration
      - `created_at`, `updated_at` - Timestamps

    - `copyright_bulk_registration_items`
      - `id` (uuid, primary key) - Unique identifier
      - `bulk_registration_id` (uuid) - Links to the bulk registration batch
      - `registration_id` (uuid) - Links to the individual copyright registration
      - `source_type` (text) - Type of source (character, script)
      - `source_id` (uuid) - ID of the source item
      - `status` (text) - Status of this individual item
      - `error_message` (text) - Error message if failed
      - `created_at` - Timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their organization's bulk registrations

  3. Indexes
    - Index on organization_id for filtering
    - Index on bulk_registration_id for linking items
*/

-- Create bulk registrations table
CREATE TABLE IF NOT EXISTS copyright_bulk_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  author_config jsonb DEFAULT NULL,
  source_filter jsonb DEFAULT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bulk registration items table
CREATE TABLE IF NOT EXISTS copyright_bulk_registration_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_registration_id uuid NOT NULL REFERENCES copyright_bulk_registrations(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES copyright_registrations(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('character', 'script', 'series', 'episode')),
  source_id uuid NOT NULL,
  source_title text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  error_message text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE copyright_bulk_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE copyright_bulk_registration_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for copyright_bulk_registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'copyright_bulk_registrations' 
    AND policyname = 'Users can view own organization bulk registrations'
  ) THEN
    CREATE POLICY "Users can view own organization bulk registrations"
      ON copyright_bulk_registrations FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = copyright_bulk_registrations.organization_id
          AND organization_members.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'copyright_bulk_registrations' 
    AND policyname = 'Users can create bulk registrations for own organization'
  ) THEN
    CREATE POLICY "Users can create bulk registrations for own organization"
      ON copyright_bulk_registrations FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = copyright_bulk_registrations.organization_id
          AND organization_members.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'copyright_bulk_registrations' 
    AND policyname = 'Users can update own organization bulk registrations'
  ) THEN
    CREATE POLICY "Users can update own organization bulk registrations"
      ON copyright_bulk_registrations FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = copyright_bulk_registrations.organization_id
          AND organization_members.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = copyright_bulk_registrations.organization_id
          AND organization_members.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'copyright_bulk_registrations' 
    AND policyname = 'Users can delete own organization bulk registrations'
  ) THEN
    CREATE POLICY "Users can delete own organization bulk registrations"
      ON copyright_bulk_registrations FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = copyright_bulk_registrations.organization_id
          AND organization_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS Policies for copyright_bulk_registration_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'copyright_bulk_registration_items' 
    AND policyname = 'Users can view bulk registration items for own organization'
  ) THEN
    CREATE POLICY "Users can view bulk registration items for own organization"
      ON copyright_bulk_registration_items FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM copyright_bulk_registrations cbr
          JOIN organization_members om ON om.organization_id = cbr.organization_id
          WHERE cbr.id = copyright_bulk_registration_items.bulk_registration_id
          AND om.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'copyright_bulk_registration_items' 
    AND policyname = 'Users can create bulk registration items for own organization'
  ) THEN
    CREATE POLICY "Users can create bulk registration items for own organization"
      ON copyright_bulk_registration_items FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM copyright_bulk_registrations cbr
          JOIN organization_members om ON om.organization_id = cbr.organization_id
          WHERE cbr.id = copyright_bulk_registration_items.bulk_registration_id
          AND om.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'copyright_bulk_registration_items' 
    AND policyname = 'Users can update bulk registration items for own organization'
  ) THEN
    CREATE POLICY "Users can update bulk registration items for own organization"
      ON copyright_bulk_registration_items FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM copyright_bulk_registrations cbr
          JOIN organization_members om ON om.organization_id = cbr.organization_id
          WHERE cbr.id = copyright_bulk_registration_items.bulk_registration_id
          AND om.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM copyright_bulk_registrations cbr
          JOIN organization_members om ON om.organization_id = cbr.organization_id
          WHERE cbr.id = copyright_bulk_registration_items.bulk_registration_id
          AND om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_copyright_bulk_registrations_org 
  ON copyright_bulk_registrations(organization_id);

CREATE INDEX IF NOT EXISTS idx_copyright_bulk_registrations_status 
  ON copyright_bulk_registrations(status);

CREATE INDEX IF NOT EXISTS idx_copyright_bulk_registration_items_bulk 
  ON copyright_bulk_registration_items(bulk_registration_id);

CREATE INDEX IF NOT EXISTS idx_copyright_bulk_registration_items_source 
  ON copyright_bulk_registration_items(source_type, source_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_copyright_bulk_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_copyright_bulk_registrations_timestamp ON copyright_bulk_registrations;
CREATE TRIGGER update_copyright_bulk_registrations_timestamp
  BEFORE UPDATE ON copyright_bulk_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_copyright_bulk_registrations_updated_at();
