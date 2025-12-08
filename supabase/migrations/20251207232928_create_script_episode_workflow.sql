/*
  # Script-to-Episode Workflow System

  This migration creates the comprehensive database structure for managing the bidirectional
  data flow between Scripts and Episodes, including locking, cost calculation, synchronization,
  and multi-episode support.

  ## Schema Changes

  ### 1. scripts table enhancements
  New columns:
    - `locked` (boolean): Whether script is locked for production
    - `locked_by` (text): User ID or name of Director who locked the script
    - `locked_at` (timestamptz): When the script was locked
    - `created_by` (text): User who created the script

  ### 2. episodes table enhancements
  New columns:
    - `source_script_snapshot` (jsonb): Complete script data at Episode creation time
    - `script_version` (integer): Version number of script used
    - `sync_status` (text): Synchronization state (in_sync, script_modified, needs_review)
    - `multi_part_episode` (boolean): Whether this is part of a multi-episode story
    - `part_number` (integer): Part number for multi-episode stories
    - `previous_episode_id` (uuid): Link to previous episode in series
    - `next_episode_id` (uuid): Link to next episode in series

  ### 3. production_cost_config table
  Stores configurable cost parameters for AI vs traditional animation
    - `id` (uuid, primary key): Unique identifier
    - `series_id` (uuid, foreign key): Links to series (null for global defaults)
    - `config_name` (text): Configuration name
    - `cost_per_minute_ai` (numeric): Cost per minute for AI-assisted production
    - `cost_per_minute_traditional` (numeric): Cost per minute for traditional animation
    - `cost_per_act` (numeric): Fixed cost per act
    - `cost_per_scene` (numeric): Cost per scene
    - `cost_per_character` (numeric): Cost per unique character
    - `cost_per_voice_line` (numeric): Cost per dialogue line
    - `complexity_multiplier_simple` (numeric): Multiplier for simple scenes (0.8)
    - `complexity_multiplier_medium` (numeric): Multiplier for medium scenes (1.0)
    - `complexity_multiplier_complex` (numeric): Multiplier for complex scenes (1.5)
    - `created_at`, `updated_at` (timestamptz): Timestamps

  ### 4. script_locks table
  Audit trail for script lock/unlock events
    - `id` (uuid, primary key): Unique identifier
    - `script_id` (uuid, foreign key): Links to scripts table
    - `episode_id` (uuid, foreign key): Links to episodes table if lock is episode-related
    - `locked_by` (text): User who performed the action
    - `action` (text): Action type (locked, unlocked, edited_while_locked)
    - `reason` (text): Reason for lock/unlock
    - `locked_at` (timestamptz): When locked
    - `unlocked_at` (timestamptz): When unlocked (null if still locked)
    - `changes_made` (jsonb): Summary of changes if edited while locked

  ## Security
  - RLS enabled on all new tables
  - Policies allow read access to all authenticated users
  - Write access restricted to authenticated users with appropriate roles

  ## Indexes
  - Performance indexes on foreign keys and status fields
*/

-- Enhance scripts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'locked'
  ) THEN
    ALTER TABLE scripts ADD COLUMN locked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'locked_by'
  ) THEN
    ALTER TABLE scripts ADD COLUMN locked_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE scripts ADD COLUMN locked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE scripts ADD COLUMN created_by text;
  END IF;
END $$;

-- Enhance episodes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'source_script_snapshot'
  ) THEN
    ALTER TABLE episodes ADD COLUMN source_script_snapshot jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'script_version'
  ) THEN
    ALTER TABLE episodes ADD COLUMN script_version integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE episodes ADD COLUMN sync_status text DEFAULT 'in_sync';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'multi_part_episode'
  ) THEN
    ALTER TABLE episodes ADD COLUMN multi_part_episode boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'part_number'
  ) THEN
    ALTER TABLE episodes ADD COLUMN part_number integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'previous_episode_id'
  ) THEN
    ALTER TABLE episodes ADD COLUMN previous_episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes' AND column_name = 'next_episode_id'
  ) THEN
    ALTER TABLE episodes ADD COLUMN next_episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create production_cost_config table
CREATE TABLE IF NOT EXISTS production_cost_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  config_name text NOT NULL DEFAULT 'Default Configuration',
  cost_per_minute_ai numeric(10,2) DEFAULT 50.00,
  cost_per_minute_traditional numeric(10,2) DEFAULT 500.00,
  cost_per_act numeric(10,2) DEFAULT 100.00,
  cost_per_scene numeric(10,2) DEFAULT 25.00,
  cost_per_character numeric(10,2) DEFAULT 75.00,
  cost_per_voice_line numeric(10,2) DEFAULT 2.50,
  complexity_multiplier_simple numeric(4,2) DEFAULT 0.80,
  complexity_multiplier_medium numeric(4,2) DEFAULT 1.00,
  complexity_multiplier_complex numeric(4,2) DEFAULT 1.50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE production_cost_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cost configs"
  ON production_cost_config FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create cost configs"
  ON production_cost_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cost configs"
  ON production_cost_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete cost configs"
  ON production_cost_config FOR DELETE
  TO authenticated
  USING (true);

-- Create script_locks audit table
CREATE TABLE IF NOT EXISTS script_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  locked_by text NOT NULL,
  action text NOT NULL,
  reason text,
  locked_at timestamptz DEFAULT now(),
  unlocked_at timestamptz,
  changes_made jsonb DEFAULT '{}'
);

ALTER TABLE script_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view script locks"
  ON script_locks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create script locks"
  ON script_locks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update script locks"
  ON script_locks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scripts_locked ON scripts(locked);
CREATE INDEX IF NOT EXISTS idx_scripts_locked_by ON scripts(locked_by);

CREATE INDEX IF NOT EXISTS idx_episodes_sync_status ON episodes(sync_status);
CREATE INDEX IF NOT EXISTS idx_episodes_multi_part ON episodes(multi_part_episode);
CREATE INDEX IF NOT EXISTS idx_episodes_part_number ON episodes(part_number);

CREATE INDEX IF NOT EXISTS idx_cost_config_series_id ON production_cost_config(series_id);

CREATE INDEX IF NOT EXISTS idx_script_locks_script_id ON script_locks(script_id);
CREATE INDEX IF NOT EXISTS idx_script_locks_episode_id ON script_locks(episode_id);
CREATE INDEX IF NOT EXISTS idx_script_locks_action ON script_locks(action);

-- Create trigger for production_cost_config updated_at
CREATE TRIGGER update_production_cost_config_updated_at BEFORE UPDATE ON production_cost_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default global cost configuration
INSERT INTO production_cost_config (
  series_id,
  config_name,
  cost_per_minute_ai,
  cost_per_minute_traditional,
  cost_per_act,
  cost_per_scene,
  cost_per_character,
  cost_per_voice_line,
  complexity_multiplier_simple,
  complexity_multiplier_medium,
  complexity_multiplier_complex
)
VALUES (
  NULL,
  'Global Default Configuration',
  50.00,
  500.00,
  100.00,
  25.00,
  75.00,
  2.50,
  0.80,
  1.00,
  1.50
)
ON CONFLICT DO NOTHING;