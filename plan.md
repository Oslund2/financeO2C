# financeO2C — Orders-to-Cash Automation Planning Tool

## Purpose
An interactive web application for presenting to finance leadership that maps the current manual Order-to-Cash (O2C) workflow (based on Wide Orbit data mirrored in Snowflake), compares it against an AI-automated workflow, calculates time/cost savings, and lets stakeholders edit/add/delete workflow steps in real-time to model different automation scenarios. AI is embedded throughout — both as a feature of the tool itself and as the automation engine being proposed.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React + Vite + TypeScript + Tailwind CSS | Interactive SPA |
| **Backend/DB** | Supabase (Postgres + Edge Functions + Auth) | Workflow persistence, user auth, real-time sync |
| **Data Source** | Snowflake (via Supabase Edge Function proxy) | Read-only access to Wide Orbit mirror data |
| **AI Engine** | Claude API (Anthropic SDK) | Workflow analysis, time estimation, automation scoring, dispute summarization, collections drafting |
| **Hosting** | Netlify | Static site + serverless functions |
| **Connectors** | Snowflake Node.js SDK (in Edge Functions) | Query Wide Orbit mirror tables |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Netlify (Hosting)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │         React SPA (Vite + Tailwind)               │  │
│  │                                                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐│  │
│  │  │ Workflow  │ │ Savings  │ │   AI Insights      ││  │
│  │  │ Editor   │ │ Dashboard│ │   Panel            ││  │
│  │  └──────────┘ └──────────┘ └────────────────────┘│  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐│  │
│  │  │ Live Data│ │ Scenario │ │   Presentation     ││  │
│  │  │ Explorer │ │ Modeler  │ │   Mode             ││  │
│  │  └──────────┘ └──────────┘ └────────────────────┘│  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ API calls
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│    Supabase      │    │  Supabase Edge       │
│  (Postgres DB)   │    │  Functions           │
│                  │    │                      │
│ • workflows      │    │ • /snowflake-query   │
│ • steps          │    │ • /claude-analyze    │
│ • scenarios      │    │ • /claude-estimate   │
│ • time_estimates │    │ • /claude-draft      │
│ • audit_log      │    │                      │
└──────────────────┘    └──────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
          ┌──────────────────┐          ┌──────────────────┐
          │    Snowflake     │          │   Claude API     │
          │  (Wide Orbit     │          │   (Anthropic)    │
          │   Mirror)        │          │                  │
          │                  │          │ • Workflow analysis│
          │ • Orders         │          │ • Time estimation │
          │ • As-run logs    │          │ • Automation score│
          │ • Invoices       │          │ • Draft comms     │
          │ • AR aging       │          │ • Dispute summary │
          │ • Payments       │          │ • Cash matching   │
          │ • Rate cards     │          └──────────────────┘
          │ • Contracts      │
          └──────────────────┘
```

---

## Database Schema (Supabase/Postgres)

### Core Tables

```sql
-- A named workflow template (e.g., "Standard O2C", "Automated O2C")
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('manual', 'automated', 'hybrid')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual steps within a workflow
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  phase TEXT NOT NULL, -- 'order_entry','traffic_billing','invoice','aging','collections','disputes','cash_application'
  name TEXT NOT NULL,
  description TEXT,
  actor TEXT NOT NULL CHECK (actor IN ('human', 'ai', 'hybrid')),
  manual_time_minutes NUMERIC NOT NULL DEFAULT 0,
  automated_time_minutes NUMERIC NOT NULL DEFAULT 0,
  frequency_per_month INTEGER NOT NULL DEFAULT 1,
  error_rate_manual NUMERIC DEFAULT 0,     -- e.g., 0.05 = 5%
  error_rate_automated NUMERIC DEFAULT 0,  -- e.g., 0.005 = 0.5%
  ai_capability TEXT,          -- which Claude capability handles this
  data_source TEXT,            -- which Snowflake tables/views feed this step
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Saved comparison scenarios
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  baseline_workflow_id UUID REFERENCES workflows(id),
  automated_workflow_id UUID REFERENCES workflows(id),
  assumptions JSONB DEFAULT '{}',  -- hourly_cost, fte_count, etc.
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit trail for edits during live sessions
CREATE TABLE scenario_edit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(id),
  action TEXT NOT NULL, -- 'add_step','remove_step','edit_step','change_assumption'
  step_id UUID,
  old_value JSONB,
  new_value JSONB,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshot of Snowflake data stats for the presentation
CREATE TABLE data_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_name TEXT NOT NULL,        -- 'monthly_orders', 'open_ar_total', 'avg_days_outstanding', etc.
  metric_value NUMERIC,
  metric_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Application Pages & Features

### Page 1: Dashboard — "The O2C At a Glance"
- **Live Snowflake metrics**: Total open AR, monthly order volume, avg days-to-cash, dispute count, aging buckets
- **Side-by-side summary**: Current manual process cost vs. projected automated cost
- **AI Insight Cards**: Claude-generated observations about the data ("Your top 3 agencies represent 62% of outstanding AR", "Cash application matching rate could reach 94% based on historical patterns")
- **Quick-start buttons**: Jump to workflow editor, scenario modeler, or presentation mode

### Page 2: Workflow Map — Visual Process Editor
- **Swim-lane diagram** showing the 7 O2C phases as columns:
  1. Order Entry & Validation
  2. Traffic & Billing Handoff
  3. Invoice Generation & Delivery
  4. Aging & Collections Prioritization
  5. Collections Outreach Automation
  6. Dispute Resolution Acceleration
  7. Cash Application
- **Each step is a draggable card** showing:
  - Step name & description
  - Actor badge: 👤 Human | 🤖 AI | 🤝 Hybrid
  - Time per occurrence (manual vs. automated)
  - Monthly frequency
  - Error rate comparison
  - Data source tag (which Snowflake table feeds it)
- **Inline editing**: Click any card to edit time, frequency, actor, description
- **Add/Delete steps**: + button between cards, X to remove, drag to reorder
- **AI Assist button** on each step: "Ask Claude to estimate time savings for this step based on our actual data volumes"
- **Two workflow tracks** displayed simultaneously: "Current State" (top) and "Future State" (bottom)

### Page 3: Savings Calculator — Real-Time ROI
- **Assumptions panel** (editable):
  - Average fully-loaded hourly cost per AR/AP FTE
  - Number of FTEs currently allocated
  - Monthly transaction volumes (pulled from Snowflake or manually overridden)
  - AI processing cost per transaction (Claude API estimate)
- **Auto-calculated metrics**:
  - Hours saved per month (sum of all step deltas × frequency)
  - FTE equivalents freed up
  - Dollar savings per month / year
  - Error reduction percentage
  - Days-to-cash improvement estimate
  - ROI timeline (months to break even on implementation)
- **Sensitivity analysis**: Sliders to adjust assumptions and watch savings update live
- **AI Enhancement**: Claude can analyze the scenario and provide a narrative summary: "Based on your current 4,200 monthly orders and 3.2 FTEs in AR, automating order entry and cash application alone would recover approximately 1.4 FTEs, with the highest impact in collections prioritization where your team currently spends 38% of their time."

### Page 4: Live Data Explorer — Snowflake Connection
- **Query builder** (simplified, non-technical) for exploring Wide Orbit data:
  - Pre-built views: "Top 20 Agencies by Open AR", "Orders Missing Billing", "Aging by Bucket", "Unmatched Payments"
  - Results displayed in sortable/filterable tables
  - Charts auto-generated from query results
- **AI Data Analyst**: Natural language query interface — "Show me all invoices over 90 days for Agency X" → Claude translates to SQL, executes against Snowflake, returns formatted results
- **Data freshness indicator**: Shows last sync timestamp from Snowflake mirror

### Page 5: Scenario Modeler — "What If" Engine
- **Save/load named scenarios** for different automation rollout plans
- **Phase-based rollout modeling**: "What if we automate only Order Entry and Cash Application in Phase 1?"
  - Toggle individual O2C phases on/off
  - See savings update in real-time for the selected phases
- **Compare up to 3 scenarios side-by-side**
- **AI Recommendation**: Claude suggests optimal phasing based on impact-to-effort ratio using your actual data volumes

### Page 6: Presentation Mode — Finance Meeting Ready
- **Full-screen, slide-like view** for the finance meeting
- **Slides auto-generated from the active scenario**:
  1. Title: "O2C Automation Roadmap"
  2. Current State: Manual workflow visualization with pain points highlighted
  3. Future State: Automated workflow with AI touchpoints
  4. Data Evidence: Real Snowflake metrics proving the opportunity
  5. Savings Summary: FTE, dollar, time, and error-rate improvements
  6. Phase Rollout: Recommended implementation sequence
  7. Risk Mitigation: How data fidelity is maintained (Snowflake read-only mirror, human-in-the-loop for exceptions, audit trail)
- **Interactive during presentation**: Click into any slide to drill down, edit a step, adjust an assumption — changes ripple through all calculations live
- **Export to PDF** for distribution after the meeting

---

## AI Integration Points (Claude API)

| Feature | Trigger | Claude Does |
|---------|---------|-------------|
| **Workflow Time Estimator** | User clicks "AI Estimate" on a step | Analyzes Snowflake data volumes + step description → suggests realistic manual vs. automated time |
| **Savings Narrator** | Scenario is saved or changed | Generates plain-English executive summary of the savings opportunity |
| **Data Insight Cards** | Dashboard loads | Queries Snowflake aggregates → produces 3-5 actionable observations |
| **Natural Language Query** | User types a question in Data Explorer | Translates to safe, read-only Snowflake SQL → executes → formats results with commentary |
| **Automation Scorer** | Any workflow step is added/edited | Rates the step's automation potential (1-10) with rationale |
| **Dispute Simulator** | Demo mode in presentation | Shows a live example: pulls a real dispute scenario from Snowflake, generates the resolution summary in seconds |
| **Collections Draft** | Demo mode in presentation | Generates a sample collections email using real agency/invoice data from Snowflake |
| **Phase Recommender** | User opens Scenario Modeler | Analyzes all steps by impact × complexity → suggests optimal rollout order |
| **Risk Assessor** | Any workflow change | Flags data fidelity risks: "This step touches billing amounts — recommend human approval gate" |

---

## Supabase Edge Functions

### 1. `snowflake-query`
- Accepts a query identifier (not raw SQL) or a Claude-generated read-only query
- Connects to Snowflake using the Node.js SDK with service account credentials
- Executes parameterized queries only (no arbitrary SQL from the client)
- Returns JSON results
- Implements query allowlisting and row limits for safety
- Caches frequent queries (aging summary, order counts) with 15-min TTL

### 2. `claude-analyze`
- Accepts: context type ("workflow_step", "scenario", "data_insight"), relevant data payload
- Calls Claude API with structured prompts specific to O2C domain
- Returns: AI analysis, time estimates, recommendations, risk flags
- Streams responses for long analyses

### 3. `claude-draft`
- Accepts: draft type ("collections_email", "dispute_summary", "executive_summary"), entity data from Snowflake
- Returns: formatted draft text with citations to source data
- Includes confidence score and flags for human review

### 4. `claude-nl-query`
- Accepts: natural language question about the data
- Claude generates a read-only Snowflake SQL query (SELECT only, no mutations)
- Edge function validates the SQL (parsed AST check — SELECT only, allowlisted tables)
- Executes against Snowflake, returns results + the generated SQL for transparency

---

## Data Fidelity Safeguards

This is non-negotiable for finance:

1. **Read-only Snowflake access**: The service account has SELECT-only permissions on the mirror database. No writes, no deletes, no DDL.
2. **Query allowlisting**: Pre-approved query templates for standard views. AI-generated queries are validated against an AST parser before execution.
3. **Audit trail**: Every scenario edit, assumption change, and AI-generated estimate is logged with timestamp and user in `scenario_edit_log`.
4. **Source attribution**: Every number shown in the UI links back to the Snowflake query that produced it. No "magic numbers."
5. **Human-in-the-loop markers**: Any automated step in the workflow is tagged with its review gate (who approves, what threshold triggers escalation).
6. **Snapshot pinning**: For the finance meeting, data can be "pinned" to a snapshot so numbers don't shift during the presentation.
7. **Calculation transparency**: Every savings number shows its formula: `(manual_time - auto_time) × frequency × hourly_cost`. No hidden logic.

---

## Implementation Phases

### Phase 1: Foundation (Build First)
1. Initialize new project in `financeO2C` repo — React + Vite + TypeScript + Tailwind
2. Set up Supabase project — create all tables, RLS policies, edge functions skeleton
3. Set up Netlify deployment pipeline
4. Build the 7-phase O2C workflow data model with pre-seeded manual baseline steps
5. Build the Workflow Map page (visual editor with cards, drag-and-drop, inline editing)
6. Build the Savings Calculator (formulas, assumptions panel, live recalculation)

### Phase 2: AI + Data Layer
7. Build Snowflake Edge Function connector (with allowlisted queries)
8. Integrate Claude API via Edge Function (workflow analysis, time estimation)
9. Build Dashboard with Snowflake live metrics + AI insight cards
10. Build Natural Language Data Explorer
11. Add AI-powered automation scoring to each workflow step

### Phase 3: Presentation & Polish
12. Build Scenario Modeler (save/load, phase toggle, side-by-side compare)
13. Build Presentation Mode (full-screen slides, interactive drill-down)
14. Add PDF export
15. Add demo capabilities (live dispute resolution, collections email generation)
16. Polish UI — animations, transitions, responsive design, dark mode

---

## Pre-seeded O2C Workflow Steps (Baseline)

These are loaded on first run so the tool is immediately useful in the finance meeting:

### Manual Baseline (Current State)
| Phase | Step | Actor | Time (min) | Freq/mo | Error Rate |
|-------|------|-------|-----------|---------|------------|
| Order Entry | Receive order via email/fax/portal | Human | 5 | 4200 | 0% |
| Order Entry | Manually key order into WideOrbit | Human | 12 | 4200 | 4.2% |
| Order Entry | Validate against rate card & avails | Human | 8 | 4200 | 3.1% |
| Traffic & Billing | Reconcile aired spots vs. orders (as-run) | Human | 15 | 3800 | 2.8% |
| Traffic & Billing | Flag missing affidavits | Human | 10 | 600 | 5.0% |
| Traffic & Billing | Generate billing records | Human | 8 | 3800 | 3.5% |
| Invoice | Format invoices per agency specs | Human | 6 | 3200 | 2.0% |
| Invoice | Deliver via email/portal | Human | 3 | 3200 | 1.5% |
| Invoice | Apply credit terms per client | Human | 4 | 3200 | 2.5% |
| Aging | Run aging report | Human | 20 | 30 | 1.0% |
| Aging | Prioritize collections queue | Human | 45 | 30 | N/A |
| Collections | Draft & send first notice | Human | 8 | 800 | 1.0% |
| Collections | Draft & send second notice | Human | 10 | 400 | 1.5% |
| Collections | Escalation communications | Human | 15 | 100 | 2.0% |
| Disputes | Research dispute (pull docs) | Human | 45 | 150 | N/A |
| Disputes | Compile evidence & respond | Human | 30 | 150 | N/A |
| Cash App | Match payments to invoices | Human | 10 | 2800 | 3.8% |
| Cash App | Research short-pays/unmatched | Human | 20 | 500 | N/A |

### Automated Future State
Each step above gets a mirrored entry with `actor: 'ai'` or `actor: 'hybrid'`, dramatically reduced times (e.g., order entry: 12min → 0.5min AI + 2min human review for exceptions only), reduced error rates, and the specific Claude capability noted.

---

## File Structure (New Project)

```
financeO2C/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── netlify.toml
├── .env.example                    # Template (no secrets)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── Layout.tsx              # Shell with sidebar nav
│   │   ├── Dashboard.tsx           # O2C metrics overview
│   │   ├── WorkflowMap.tsx         # Visual swim-lane editor
│   │   ├── WorkflowStepCard.tsx    # Draggable step card
│   │   ├── WorkflowStepEditor.tsx  # Inline edit modal
│   │   ├── SavingsCalculator.tsx   # ROI calculations
│   │   ├── AssumptionsPanel.tsx    # Editable cost assumptions
│   │   ├── DataExplorer.tsx        # Snowflake query UI
│   │   ├── NLQueryInput.tsx        # Natural language → SQL
│   │   ├── ScenarioModeler.tsx     # What-if engine
│   │   ├── ScenarioCompare.tsx     # Side-by-side comparison
│   │   ├── PresentationMode.tsx    # Full-screen slide view
│   │   ├── AIInsightCard.tsx       # Claude-generated insight
│   │   ├── AutomationScoreBadge.tsx
│   │   ├── PhaseToggle.tsx         # On/off per O2C phase
│   │   ├── SavingsSummaryChart.tsx # Bar/donut charts
│   │   └── ExportPDF.tsx           # PDF generation
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── WorkflowContext.tsx     # Global workflow state
│   │   └── ScenarioContext.tsx     # Active scenario state
│   ├── hooks/
│   │   ├── useWorkflow.ts
│   │   ├── useScenario.ts
│   │   ├── useSavingsCalc.ts       # Core calculation engine
│   │   ├── useSnowflakeQuery.ts
│   │   └── useClaudeAnalysis.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── calculations.ts         # Pure savings math
│   │   └── constants.ts            # O2C phase definitions, defaults
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   └── data/
│       └── baselineWorkflow.ts     # Pre-seeded steps (table above)
├── supabase/
│   ├── migrations/
│   │   └── 001_create_o2c_tables.sql
│   └── functions/
│       ├── snowflake-query/index.ts
│       ├── claude-analyze/index.ts
│       ├── claude-draft/index.ts
│       └── claude-nl-query/index.ts
└── public/
    └── favicon.svg
```

---

## Key Interactions for the Finance Meeting

1. **Open Dashboard** → Finance sees real AR numbers from Snowflake, AI-generated insights about their data
2. **View Workflow Map** → "Here's how your team processes orders today" (manual baseline, all human badges)
3. **Toggle to Future State** → Same process, now showing AI handling 80% of steps, humans approving exceptions
4. **Click a step** → Edit the time estimate, add a step they forgot, delete one that doesn't apply
5. **Watch savings recalculate live** → "We just added your custom review step and savings only dropped by 3%"
6. **Open Scenario Modeler** → "What if we only automate Phase 1-3 this year?" → instant ROI for partial rollout
7. **AI demo** → Click "Resolve Dispute" → Claude pulls real dispute data from Snowflake, generates resolution in 60 seconds
8. **Export** → PDF summary goes to the CFO the same afternoon

---

## Environment Variables Required

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Snowflake (Edge Functions only — never exposed to client)
SNOWFLAKE_ACCOUNT=
SNOWFLAKE_USERNAME=
SNOWFLAKE_PASSWORD=
SNOWFLAKE_DATABASE=
SNOWFLAKE_SCHEMA=
SNOWFLAKE_WAREHOUSE=
SNOWFLAKE_ROLE=

# Claude API (Edge Functions only)
ANTHROPIC_API_KEY=
```
