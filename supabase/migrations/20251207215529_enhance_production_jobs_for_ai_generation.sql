/*
  # Enhance Production Jobs Table for AI Script Generation

  1. Changes to production_jobs table
    - Add script_id column to directly link to scripts table
    - Add series_id column for easier filtering
    - Add index on script_id for performance
    - Add index on job_type and status for queue management

  2. Notes
    - Existing fields (request_payload, response_data) are sufficient for storing generation details
    - script_id allows direct linking to generated scripts
    - Indexes improve query performance for job monitoring
*/

-- Add script_id column to production_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_jobs' AND column_name = 'script_id'
  ) THEN
    ALTER TABLE production_jobs ADD COLUMN script_id uuid REFERENCES scripts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add series_id column to production_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_jobs' AND column_name = 'series_id'
  ) THEN
    ALTER TABLE production_jobs ADD COLUMN series_id uuid REFERENCES series(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_production_jobs_script_id ON production_jobs(script_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_series_id ON production_jobs(series_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_status ON production_jobs(status);
CREATE INDEX IF NOT EXISTS idx_production_jobs_job_type ON production_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_production_jobs_created_at ON production_jobs(created_at DESC);
