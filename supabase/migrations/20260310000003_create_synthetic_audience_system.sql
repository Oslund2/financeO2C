/*
  # Synthetic Audience Testing System

  Two tables:
  1. audience_panels   – reusable named persona sets (Option C hybrid)
  2. synthetic_focus_groups – individual test runs, optionally linked to a panel

  Workflow:
    startAnalysis()         → phases 1+2, status = 'awaiting_confirmation'
    confirmPersonas()       → status = 'confirmed' (optionally save as panel)
    runSimulation()         → phases 3+4, status = 'complete'
    runComparison()         → phases 3+4 for script B + head-to-head, status = 'complete'
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reusable audience panels
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audience_panels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  description     text,
  personas        jsonb NOT NULL DEFAULT '[]',  -- array of 5 Persona objects
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audience_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage audience panels"
  ON audience_panels FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow anonymous access in development
CREATE POLICY "anon full access audience panels"
  ON audience_panels FOR ALL
  TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Focus group test runs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS synthetic_focus_groups (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  script_id               uuid REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
  comparison_script_id    uuid REFERENCES scripts(id) ON DELETE SET NULL,
  audience_panel_id       uuid REFERENCES audience_panels(id) ON DELETE SET NULL,

  title                   text,  -- auto-named; user can rename

  -- State machine
  -- pending → analyzing → awaiting_confirmation → simulating → complete | failed
  -- comparison adds: comparing → complete
  status                  text NOT NULL DEFAULT 'pending',

  -- Phase results (committed progressively)
  phase1_analysis         jsonb,   -- { core_premise, tone, target_demographic, polarizing_points[] }
  phase2_personas         jsonb,   -- [ { name, age, location, viewing_habits, core_bias, why_click } ×5 ]
  personas_confirmed      boolean NOT NULL DEFAULT false,

  phase3_discussion       jsonb,   -- { hook_moments[], dialogue_critique[], twist_predictions[] }
  phase4_heatmap          jsonb,   -- [ { persona_name, pacing_score, character_relatability, will_watch_ep2, retention_reason } ]

  -- Comparison script results (null in single-script mode)
  comparison_phase3       jsonb,
  comparison_phase4       jsonb,
  head_to_head_summary    jsonb,   -- { winner, margin, ep2_retention_a/b, key_differentiators[], recommendation }

  ai_model_used           text DEFAULT 'gemini-2.0-flash',
  error_message           text,
  started_at              timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE synthetic_focus_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage focus groups"
  ON synthetic_focus_groups FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "anon full access focus groups"
  ON synthetic_focus_groups FOR ALL
  TO anon USING (true) WITH CHECK (true);

CREATE INDEX idx_focus_groups_script    ON synthetic_focus_groups(script_id);
CREATE INDEX idx_focus_groups_org       ON synthetic_focus_groups(organization_id);
CREATE INDEX idx_focus_groups_panel     ON synthetic_focus_groups(audience_panel_id);
CREATE INDEX idx_audience_panels_org    ON audience_panels(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Enable feature for all workspace types
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE workspace_type_configs
SET features = jsonb_set(features, '{synthetic_audience_testing}', 'true'),
    updated_at = now()
WHERE workspace_type IN ('photoreal', 'documentary', 'general', 'claymation');
