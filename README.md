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
| **General** | Flexible baseline workspace | Full feature set without specialisation defaults |

Workspace capabilities are controlled by per-organisation feature flags stored in `workspace_type_configs`, so the UI adapts automatically to each workspace type.

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
│   ├── WorkspaceSpecificSettings.tsx # Per-workspace settings
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
│   ├── useWorkspaceCapabilities.ts  # Feature flag resolution
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
| Configuration | `workspace_type_configs`, `workspace_missions` |

Full schema with 40+ tables, foreign keys, indexes, and RLS policies is managed via Supabase migrations.

---

## License

Proprietary — all rights reserved.
