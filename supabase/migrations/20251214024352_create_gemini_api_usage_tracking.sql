/*
  # Create Gemini API Usage Tracking System

  1. New Tables
    - `gemini_api_usage`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, nullable)
      - `operation_type` (text) - script_generation, translation, prompt_enhancement, etc.
      - `model_used` (text) - gemini-2.5-flash, etc.
      - `input_tokens_estimate` (integer) - estimated input tokens
      - `output_tokens_estimate` (integer) - estimated output tokens
      - `success` (boolean) - whether the API call succeeded
      - `error_message` (text, nullable) - error details if failed
      - `latency_ms` (integer, nullable) - response time in milliseconds
      - `metadata` (jsonb, nullable) - additional context (script_id, language, etc.)
      - `created_at` (timestamptz)

  2. Indexes
    - Index on organization_id for organization-level analytics
    - Index on operation_type for filtering by operation
    - Index on created_at for time-based queries
    - Index on model_used for model comparison

  3. Security
    - Enable RLS on `gemini_api_usage` table
    - Add policies for organization members to view their usage
    - Add policy for system to insert usage records

  4. Functions
    - Function to get usage statistics for an organization
    - Function to get daily/weekly/monthly usage summaries
*/

-- Create the gemini_api_usage table
CREATE TABLE IF NOT EXISTS gemini_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  operation_type text NOT NULL,
  model_used text NOT NULL DEFAULT 'gemini-2.5-flash',
  input_tokens_estimate integer NOT NULL DEFAULT 0,
  output_tokens_estimate integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  latency_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gemini_api_usage_organization_id
  ON gemini_api_usage(organization_id);

CREATE INDEX IF NOT EXISTS idx_gemini_api_usage_operation_type
  ON gemini_api_usage(operation_type);

CREATE INDEX IF NOT EXISTS idx_gemini_api_usage_created_at
  ON gemini_api_usage(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gemini_api_usage_model_used
  ON gemini_api_usage(model_used);

-- Enable RLS
ALTER TABLE gemini_api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert usage records (for system tracking)
CREATE POLICY "Allow system to insert API usage"
  ON gemini_api_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Organization members can view their usage
CREATE POLICY "Organization members can view their API usage"
  ON gemini_api_usage
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = gemini_api_usage.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Function to get usage statistics for an organization
CREATE OR REPLACE FUNCTION get_gemini_usage_stats(
  org_id uuid,
  start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  end_date timestamptz DEFAULT NOW()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'successful_requests', COUNT(*) FILTER (WHERE success = true),
    'failed_requests', COUNT(*) FILTER (WHERE success = false),
    'total_input_tokens', COALESCE(SUM(input_tokens_estimate), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens_estimate), 0),
    'average_latency_ms', COALESCE(AVG(latency_ms), 0),
    'by_operation', jsonb_object_agg(
      operation_type,
      jsonb_build_object(
        'count', operation_count,
        'success_rate', success_rate
      )
    ),
    'by_model', jsonb_object_agg(
      model_used,
      model_count
    )
  ) INTO result
  FROM (
    SELECT
      operation_type,
      COUNT(*) as operation_count,
      ROUND(
        (COUNT(*) FILTER (WHERE success = true)::numeric / COUNT(*)::numeric) * 100,
        2
      ) as success_rate
    FROM gemini_api_usage
    WHERE organization_id = org_id
      AND created_at BETWEEN start_date AND end_date
    GROUP BY operation_type
  ) ops
  CROSS JOIN (
    SELECT model_used, COUNT(*) as model_count
    FROM gemini_api_usage
    WHERE organization_id = org_id
      AND created_at BETWEEN start_date AND end_date
    GROUP BY model_used
  ) models;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to get daily usage summary
CREATE OR REPLACE FUNCTION get_daily_gemini_usage(
  org_id uuid,
  days integer DEFAULT 30
)
RETURNS TABLE (
  date date,
  total_requests bigint,
  successful_requests bigint,
  failed_requests bigint,
  total_tokens bigint,
  average_latency numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    COUNT(*) FILTER (WHERE success = false) as failed_requests,
    SUM(input_tokens_estimate + output_tokens_estimate) as total_tokens,
    ROUND(AVG(latency_ms)::numeric, 2) as average_latency
  FROM gemini_api_usage
  WHERE organization_id = org_id
    AND created_at >= NOW() - (days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
$$;

-- Add comment
COMMENT ON TABLE gemini_api_usage IS 'Tracks all Gemini API usage for monitoring and analytics';