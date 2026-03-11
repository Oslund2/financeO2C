# BeeStudio — AI Video Production Platform

A full-stack, multi-workspace AI production platform for creating animated and live-action video content. BeeStudio covers every stage of production: concept, scripting, storyboarding, voice synthesis, video generation, lip-sync, assembly, and distribution — plus advanced tools for audience testing, fact-checking, citation management, and IP protection.

---

## Table of Contents

1. [Overview](#overview)
2. [Workspace Types](#workspace-types)
3. [Feature Modules](#feature-modules)
4. [Integrated Services](#integrated-services)
5. [Tech Stack](#tech-stack)
6. [Architecture](#architecture)
7. [Environment Variables](#environment-variables)
8. [Running the Application](#running-the-application)

---

## Overview

BeeStudio is a multi-tenant SaaS platform built on React + TypeScript with a Supabase backend. Each organisation can operate one or more **workspaces**, each tailored to a specific production style (claymation, photoreal, documentary, general). All AI integrations — script generation, image/video generation, voice synthesis, lip-sync, translation, and synthetic audience testing — are fully operational.

---

## Workspace Types

| Type | Description | Signature Features |
|---|---|---|
| **Claymation** | Stop-motion / claymation animation | Clay texture settings, miniature set designer, character rig library, spelling-word curriculum integration |
| **Photoreal** | Live-action and photorealistic video | Realistic environment generation, period-accuracy checker, historical fact verification |
| **Documentary** | Documentary and narrative non-fiction | Citation manager, archival integration, interview-format scripting, narration tools |
| **Commercial & Promo** | Advertising spots and branded content | AI concept generator, :10/:15/:30 spot formats, auto-variant cutdowns, talent profiles, project fee economics, AI Advantage calculator |
| **General** | Flexible baseline workspace | Full feature set without specialisation defaults |

Workspace capabilities are controlled by per-organisation feature flags stored in `workspace_type_configs`, so the UI adapts automatically to each workspace type. Terminology adapts per workspace too (e.g. Series→Campaign, Episode→Spot, Season→Flight for Commercial).

---

## Feature Modules

### Content Creation
- **AI Script Generation** — Gemini-powered script writer with act/scene structure, character dialogue, vocabulary integration, and style guides
- **Script Management** — Versioning, locking, status workflow (draft → approved → in production → completed), duplication
- **Multi-language Translation** — Full script translation with analytics, export, stuck-translation recovery, and cost tracking
- **Storyboard Generation** — AI-generated panel-by-panel storyboards with editing, approval workflow, image versioning, and PDF export
- **Shot List Generation** — AI-driven shot breakdown with camera angles, scene descriptions, and asset linking
- **Character Management** — Character profiles with physical descriptions, personality traits, voice profiles, clay/render features, role classification, and reference images

### Video Production
- **Veo Video Generation** — Google Vertex AI Veo 2 and Veo 3 (including 3.1) video generation from storyboard shots; speed and narrative render tiers; reference-image consistency support
- **Batch Rendering** — Parallel batch jobs with real-time progress tracking; two modes: Speed (8 variations) and Narrative (20 variations)
- **Video Assembly (Shotstack)** — Rough-cut and final-cut assembly with transitions (cut, fade, dissolve, wipe), audio mixing, slates, end cards, watermark support, and multiple output formats/resolutions (720p, 1080p, 4K)
- **Lip-Sync (SyncLabs)** — Audio-to-video lip-sync generation via SyncLabs; job tracking and status polling
- **Video Translation (HeyGen)** — AI-avatar video translation into 60+ languages; per-organisation API key and usage quota management
- **Production Timeline** — Episode progress tracking from pre-production through delivery

### Voice & Audio
- **ElevenLabs TTS** — Voice synthesis and voice cloning; 100+ voices across 60+ languages
- **Chatterbox TTS** — Self-hosted alternative TTS with voice cloning via job queue (runs on `localhost:8001` in dev or `/api/chatterbox` in production)
- **Dialogue Extraction** — Automatic extraction of per-character lines from scripts for batch voice generation
- **TRT Calculator** — Total Running Time calculation based on voice recordings
- **Voice Characteristics** — Per-character voice profiles (stability, similarity boost, style settings)

### Synthetic Audience Testing
Simulate a live focus group using AI-generated viewer personas. Four phases run automatically:

1. **Script Analysis** — Core premise, tone, target demographic, and polarising themes
2. **Audience Generation** — Five diverse synthetic personas (name, age, location, viewing habits, biases); fully editable before proceeding
3. **Focus Group Discussion** — Hook-moment reactions, dialogue authenticity critique, and twist predictability scoring
4. **Retention Heatmap** — Per-persona pacing (1–10), character relatability (1–10), and episode-2 watch intent

**Audience Panels** — Save and reuse persona sets across multiple scripts.
**Head-to-Head Comparison** — Run two script versions through the same panel; outputs average scores, retention rates, key differentiators, and a recommended winner.

### Accuracy & Citation
- **Historical Accuracy Checker** — AI-driven fact verification with confidence scoring, disputed-claim flagging, citation linking, and AI reasoning documentation (active for Photoreal and Documentary workspaces)
- **Citation Manager** — Full citation lifecycle (create, edit, verify, delete); supports books, journals, websites, interviews, and archival sources; primary source designation; AI-generated citation flagging

### Patent Intelligence
A complete USPTO patent-application workflow built into the platform:

- **Patent Application Wizard** — Step-by-step guided application flow
- **CPC Classification** — AI-assisted CPC code suggestions
- **Claims Drafting** — Independent and dependent claim management
- **Specification Generation** — Full spec body generation with sections
- **Patent Drawings** — AI-generated drawings with annotation support
- **Novelty & Differentiation Analysis** — Prior-art and differentiation scoring
- **Prior Art Search** — Research prompts and structured search results
- **USPTO Form Generation** — ADS form generation, fee calculation (base + IDS + drawing fees)
- **Copyright & Trademark** — Copyright registration, trademark application, and bulk copyright filing workflows

### Mission Control
Define a workspace mission to drive AI behaviour across all modules:
- Target audience, content goals, and guardrails
- Visual rendering style definition
- AI feature recommendations based on mission
- Mission health scoring
- Series-level sub-missions
- Feature toggles driven by mission settings

### Commercial & Promo Production
Available when workspace type is set to **Commercial**:

- **Concept Generator** — Multi-step brief intake form (client, product, objective, audience, CTA, brand tone, spot length) → AI generates 3 distinct creative concepts (logline, opening hook, key visual moment, CTA execution, music direction) → full scene-by-scene spot script → auto-generate :15 and :10 cutdowns from approved :30 (skippable at any stage)
- **Talent Profiles** — Unnamed/typed spokesperson descriptions ("Confident professional woman, 30s, business casual") stored as reusable profiles that drive image and video generation without locking into a named cast. Fields: internal label, description, demographic, physical description, style notes, personality/performance notes, tags
- **Commercial Economics** — Project fee P&L model: client billing inputs → per-spot cost breakdown (AI generation, human labor, music, legal/clearance, delivery, revision rounds, variant costs) → gross margin summary. Target ≥80% gross margin; platform designed for 90%+
- **AI Advantage Calculator** — Side-by-side comparison of traditional agency costs vs. AI-assisted production for the selected spot length. Covers creative/concept, production, post, revisions, and variant costs. Ready-made client pitch data
- **Commercial Settings** — Agency identity, default spot length, billing rate, markup %, revision round pricing, preferred music styles, visual style, brand safety level, default legal disclaimer

### Analytics & Economics
- **Production Cost Tracking** — Cost per shot and per episode with Gemini API usage monitoring
- **Creator Cost Calculator** — Labour cost breakdown and traditional animation cost comparison
- **LTV Analytics** — Lifetime value tracking, YouTube/show revenue calculators, year-by-year revenue projections, ROI and profit analysis
- **Gemini Usage Dashboard** — Token usage and cost monitoring per request

### Asset Management
- **Asset Library** — Centralised browser for all media (character references, backgrounds, props, word manifestations, scene images, video clips, audio files)
- **Tag-based Filtering** — Search and filter by type, tag, or usage
- **Usage Tracking** — Asset reuse recommendations and decay tracking
- **Image Versioning** — Full version history for generated images

### Platform & Collaboration
- **Multi-tenant Organisations** — Unlimited workspace creation; four billing tiers (Free, Starter, Professional, Enterprise)
- **Role-based Access Control** — Owner, admin, and member roles with per-resource permissions
- **Prompt Library** — 10 system default templates + organisation-specific prompts; AI-powered prompt enhancement; version control; variable schema support
- **Settings & Backup** — Full configuration backup and restore; per-org API key management for Shotstack, SyncLabs, HeyGen, and others
- **Command Palette** — Keyboard-driven navigation across all modules
- **Notification System** — Toast notifications for async operations

---

## Integrated Services

| Service | Purpose | Status |
|---|---|---|
| **Supabase** | Database, auth, file storage, edge functions | ✅ Active |
| **Google Gemini API** | Script generation, prompt enhancement, accuracy checking, audience analysis | ✅ Active |
| **Google Vertex AI (Veo)** | Video generation (Veo 2.0, 3.0, 3.1) | ✅ Active |
| **ElevenLabs** | Voice synthesis and voice cloning | ✅ Active |
| **HeyGen** | AI-avatar video translation (60+ languages) | ✅ Active |
| **SyncLabs** | AI lip-sync generation | ✅ Active |
| **Shotstack** | Video editing and final assembly | ✅ Active |
| **Chatterbox TTS** | Self-hosted alternative voice synthesis | ✅ Active |
| **VEED.IO** | Alternative video translation/editing | ✅ Available |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS 3 |
| **Icons** | Lucide React |
| **Backend / Database** | Supabase (PostgreSQL + RLS + Edge Functions) |
| **PDF Generation** | jsPDF |
| **PDF Viewing** | pdfjs-dist |
| **DOCX Parsing** | Mammoth |
| **Linting** | ESLint + TypeScript ESLint |
| **Node** | ≥ 18.0.0 |

---

## Architecture

```
src/
├── components/          # 114 React components
│   ├── Layout.tsx                    # App shell and navigation
│   ├── Dashboard.tsx                 # Production overview
│   ├── Characters.tsx                # Character management
│   ├── Scripts.tsx                   # Script browser and editor
│   ├── ScriptViewerModal.tsx         # Script viewer with tabbed tools
│   ├── Episodes.tsx                  # Episode tracking
│   ├── Production.tsx                # Video production workflow
│   ├── Assets.tsx                    # Asset library
│   ├── StoryboardViewer.tsx          # Storyboard review
│   ├── SyntheticAudiencePanel.tsx    # AI focus group testing
│   ├── CitationManager.tsx           # Citation management
│   ├── AccuracyCheckPanel.tsx        # Fact-checking panel
│   ├── PatentApplication.tsx         # Patent application wizard
│   ├── PatentFilingTab.tsx           # USPTO filing workflow
│   ├── MissionControlPanel.tsx       # Workspace mission editor
│   ├── HeyGenConfigPanel.tsx         # HeyGen configuration
│   ├── VideoAssemblyPanel.tsx        # Shotstack assembly panel
│   ├── PromptLibrary.tsx             # Prompt management
│   ├── LipSyncManager.tsx            # Lip-sync tracking
│   ├── EpisodeProfitAnalytics.tsx    # LTV analytics
│   ├── Settings.tsx                  # Platform configuration
│   ├── WorkspaceSpecificSettings.tsx # Per-workspace settings dispatcher
│   ├── CommercialSettings.tsx        # Commercial workspace settings (agency, billing, music, legal)
│   ├── CommercialEconomics.tsx       # Project fee P&L + AI Advantage calculator
│   ├── ConceptGenerator.tsx          # Brief → concepts → spot script → variant cutdowns
│   ├── TalentProfiles.tsx            # Unnamed/typed talent CRUD
│   └── [90+ more components]
│
├── services/            # 87 service modules
│   ├── geminiService.ts                    # Gemini text generation
│   ├── geminiUsageTrackingService.ts       # API usage monitoring
│   ├── vertexAIService.ts                  # Veo video generation
│   ├── elevenLabsService.ts                # Voice synthesis
│   ├── chatterboxService.ts                # Self-hosted TTS
│   ├── heygenVideoTranslationService.ts    # HeyGen translation
│   ├── heygenConfigService.ts              # HeyGen config & quota
│   ├── videoAssemblyService.ts             # Shotstack assembly
│   ├── lipSyncService.ts                   # Lip-sync orchestration
│   ├── syntheticAudienceService.ts         # AI focus groups
│   ├── citationService.ts                  # Citation management
│   ├── accuracyCheckService.ts             # Fact checking
│   ├── missionService.ts                   # Mission control
│   ├── patentApplicationService.ts         # Patent workflow
│   ├── patentClaimsService.ts              # Claims drafting
│   ├── patentSpecificationGenerationService.ts
│   ├── patentDrawingsService.ts
│   ├── patentNoveltyAnalysisService.ts
│   ├── usptoFormGeneratorService.ts
│   ├── filingFeeService.ts
│   ├── copyrightApplicationService.ts
│   ├── trademarkApplicationService.ts
│   ├── promptLibraryService.ts
│   ├── scriptTranslationService.ts
│   ├── costCalculationService.ts
│   ├── ltvCalculationService.ts
│   ├── storyboardService.ts
│   ├── shotListGeneratorService.ts
│   ├── batchManagementService.ts
│   └── [60+ more services]
│
├── contexts/
│   ├── AuthContext.tsx           # Authentication state
│   ├── OrganizationContext.tsx   # Organisation and workspace state
│   └── NotificationContext.tsx  # Toast notifications
│
├── hooks/
│   ├── useWorkspaceCapabilities.ts  # Feature flag resolution + isCommercial
│   ├── useWorkspaceLabels.ts        # Terminology layer (Series→Campaign, etc.)
│   └── [other custom hooks]
│
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── database.types.ts   # Auto-generated DB types
│
└── types/                   # Shared TypeScript types
```

---

## Environment Variables

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI / Generation
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_VERTEX_AI_PROJECT_ID=your-gcp-project-id
VITE_VERTEX_AI_LOCATION=us-central1
VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET=your-gcs-bucket

# Voice Synthesis
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
VITE_CHATTERBOX_SERVER_URL=http://localhost:8001   # Optional, self-hosted TTS

# Video Services (can also be configured per-organisation in Settings)
VITE_SHOTSTACK_API_KEY=your-shotstack-key
VITE_SHOTSTACK_SANDBOX=false

# Optional
VITE_VEED_API_KEY=your-veed-key
VITE_SYNC_LABS_API_KEY=your-synclabs-key
VITE_VERTEX_AI_DEFAULT_MODEL=veo-3.0-generate-001
```

> **Note:** HeyGen and SyncLabs API keys can also be configured per-organisation directly in Settings → Organisation, without needing environment variables.

---

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type-check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

### Self-hosted Chatterbox TTS (optional)

```bash
cd python-tts-server
pip install -r requirements.txt
python server.py
# Runs on http://localhost:8001
```

---

## Database

BeeStudio uses Supabase (PostgreSQL) with Row Level Security enforced on every table. Key table groups:

| Group | Tables |
|---|---|
| Multi-tenancy | `organizations`, `organization_members`, `organization_invitations` |
| Content | `series`, `characters`, `scripts`, `episodes`, `assets` |
| Production | `shot_plans`, `rendering_batches`, `rendering_jobs`, `storyboards`, `storyboard_shots` |
| Audience Testing | `synthetic_focus_groups`, `audience_panels` |
| Accuracy & Citations | `accuracy_checks`, `citations` |
| Patent / IP | `patent_applications`, `patent_claims`, `patent_drawings`, `copyright_applications`, `trademark_applications` |
| Prompt Management | `prompt_templates`, `prompt_template_versions`, `prompt_enhancement_history` |
| Voice & Audio | `dialogue_audio`, `lip_sync_jobs`, `voice_cloning_models` |
| Analytics | `episode_ltv_metrics`, `creator_cost_settings`, `gemini_api_usage`, `episode_progress` |
| Translation | `translated_scripts`, `translation_exports` |
| Commercial | `talent_profiles` |
| Configuration | `workspace_type_configs`, `workspace_missions` |

Full schema with 40+ tables, foreign keys, indexes, and RLS policies is managed via Supabase migrations.

### Commercial Workspace — Required Migration

To activate the Commercial & Promo workspace, run the following SQL in the Supabase SQL Editor:

```sql
-- 1. talent_profiles table
CREATE TABLE IF NOT EXISTS public.talent_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  series_id            uuid REFERENCES public.series(id) ON DELETE SET NULL,
  name                 text NOT NULL,
  description          text NOT NULL DEFAULT '',
  demographic          text NOT NULL DEFAULT '',
  physical_description text NOT NULL DEFAULT '',
  style_notes          text NOT NULL DEFAULT '',
  personality_notes    text NOT NULL DEFAULT '',
  image_url            text,
  tags                 text[] NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS talent_profiles_org_idx ON public.talent_profiles(organization_id);
CREATE INDEX IF NOT EXISTS talent_profiles_series_idx ON public.talent_profiles(series_id);

-- 3. Row Level Security
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_talent_profiles" ON public.talent_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = talent_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_insert_talent_profiles" ON public.talent_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = talent_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_update_talent_profiles" ON public.talent_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = talent_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_delete_talent_profiles" ON public.talent_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = talent_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- 4. Auto-update trigger
CREATE OR REPLACE FUNCTION public.update_talent_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_talent_profiles_updated_at ON public.talent_profiles;
CREATE TRIGGER set_talent_profiles_updated_at
  BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_talent_profiles_updated_at();

-- 5. Insert commercial workspace config row
INSERT INTO public.workspace_type_configs (
  workspace_type, display_name, description, primary_color,
  features, system_prompt_prefix
)
VALUES (
  'commercial',
  'Commercial & Promo',
  'AI-powered production for advertising spots, promos, and branded content',
  '#f59e0b',
  '{
    "concept_generator": true,
    "campaign_brief_intake": true,
    "variant_manager": true,
    "legal_compliance_checklist": true,
    "talent_profiles": true,
    "music_generation": true,
    "ai_advantage_calculator": true
  }'::jsonb,
  'You are a senior marketing and commercial production expert working for an agency that produces advertising spots and branded content for clients.'
)
ON CONFLICT (workspace_type) DO NOTHING;
```

> **Note on `workspace_type` column:** If your `workspace_type_configs` table uses a PostgreSQL enum for `workspace_type`, you will need to add `'commercial'` to the enum first: `ALTER TYPE workspace_type_enum ADD VALUE IF NOT EXISTS 'commercial';`

---

## License

Proprietary — all rights reserved.
