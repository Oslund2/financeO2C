# Technical Requirements & Replication Guide

Complete documentation for replicating and reskinning this animation production platform powered by Vertex AI Veo 3.1.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Reskinning Guide](#reskinning-guide)
5. [Deployment](#deployment)
6. [Cost Structure](#cost-structure)
7. [File Map](#file-map)

---

## Overview

### What This Platform Does

This is a comprehensive AI-powered animation production platform that enables creators to:
- Generate scripts using AI (Gemini)
- Create shot lists automatically from scripts
- Render video shots using Vertex AI Veo 3.1
- Manage production workflows with batch processing
- Track costs and revenue projections
- Collaborate across multiple organizations

### Key Features

**Script Management**
- AI-powered script generation
- Multi-act structure with scenes and dialogue
- Script translation to multiple languages
- Version control and locking

**Video Production**
- Automatic shot list generation from scripts
- Batch rendering with Vertex AI Veo 3.1
- Two render modes: Speed (8 variations) and Narrative (20 variations)
- Real-time progress tracking
- Variation review and selection

**Cost Tracking**
- Per-shot cost estimation
- Batch cost calculation
- Episode lifetime value (LTV) tracking
- Creator cost breakdown
- Revenue projections

**Multi-Tenancy & Workspace Management**
- Unlimited workspace creation per user
- Organization management with billing tiers (Free, Starter, Professional, Enterprise)
- Series and episode isolation per workspace
- Role-based access control (owner, admin, member)
- Cross-organization analytics
- Automatic slug generation for workspace URLs
- Workspace switcher for quick navigation
- Featured trailer showcase for series

**Prompt Library & AI Enhancement**
- 10+ system default prompts for all AI operations
- Organization-specific prompt customization
- Version control and deployment system
- AI-powered prompt enhancement with Gemini
- Prompt testing and validation
- Category-based organization (script, video, voice, storyboard, style)

**Patent Application System**
- Draft provisional and non-provisional patent applications
- Independent and dependent claims management
- Technical drawings with SVG support
- Prior art tracking and references
- Version control for patent documents
- Export to USPTO-ready formats

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI Services**:
  - Google Gemini (script generation)
  - Vertex AI Veo 3.1 (video generation)
  - ElevenLabs / Chatterbox (voice synthesis)
- **Icons**: Lucide React
- **PDF Generation**: jsPDF

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Application                       │
│                   (React + TypeScript)                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─────────────────────────────────────────┐
                  │                                         │
        ┌─────────▼─────────┐                  ┌──────────▼─────────┐
        │   Supabase DB     │                  │   Edge Functions   │
        │   (PostgreSQL)    │                  │   (Deno Runtime)   │
        │                   │                  │                    │
        │  • Organizations  │                  │  • ElevenLabs      │
        │  • Series         │                  │    Proxy           │
        │  • Episodes       │                  │  • Future APIs     │
        │  • Scripts        │                  │                    │
        │  • Shot Plans     │                  └────────────────────┘
        │  • Batches        │
        │  • Jobs           │
        └───────────────────┘
                  │
                  │
        ┌─────────▼─────────┐
        │   External APIs   │
        │                   │
        │  • Gemini API     │
        │  • Vertex AI Veo  │
        │  • ElevenLabs     │
        │  • Chatterbox     │
        └───────────────────┘
```

### Component Architecture

```
src/
├── components/
│   ├── Layout.tsx              # Main app layout with navigation
│   ├── Dashboard.tsx           # Overview with IP sections
│   ├── Scripts.tsx             # Script management
│   ├── Episodes.tsx            # Episode creation
│   ├── Production.tsx          # Video production workflow
│   ├── Characters.tsx          # Character management
│   ├── Assets.tsx              # Asset library
│   ├── StoryboardViewer.tsx    # Storyboard review
│   ├── Settings.tsx            # Organization settings
│   ├── OrganizationSwitcher.tsx # Workspace selector
│   ├── CreateWorkspaceModal.tsx # Workspace creation
│   ├── PromptLibrary.tsx       # Prompt template management
│   ├── PromptEditorModal.tsx   # Prompt editing with AI enhancement
│   ├── PatentApplication.tsx   # Patent drafting system
│   └── [50+ other components]
│
├── services/
│   ├── vertexAIService.ts      # Veo 3.1 integration
│   ├── shotListGeneratorService.ts  # Shot list logic
│   ├── batchManagementService.ts    # Batch processing
│   ├── geminiService.ts        # Script generation
│   ├── elevenLabsService.ts    # Voice synthesis
│   ├── chatterboxService.ts    # Alternative TTS
│   ├── costCalculationService.ts    # Cost tracking
│   ├── ltvCalculationService.ts     # Lifetime value tracking
│   ├── promptLibraryService.ts      # Prompt template service
│   ├── promptEnhancementService.ts  # AI prompt optimization
│   ├── scriptTranslationService.ts  # Multi-language support
│   ├── lipSyncService.ts       # Lip sync management
│   ├── patentApplicationService.ts  # Patent generation
│   ├── patentClaimsService.ts       # Patent claims management
│   ├── patentDrawingsService.ts     # Patent drawing generation
│   └── [20+ other services]
│
├── contexts/
│   ├── AuthContext.tsx         # Authentication state
│   └── OrganizationContext.tsx # Organization state
│
└── lib/
    ├── supabase.ts             # Supabase client
    └── database.types.ts       # Generated types
```

### Data Flow: Shot List to Video Production

```
1. User selects Episode
         ↓
2. Generate Shot List (AI or manual)
   → shotListGeneratorService.generateShotListFromScript()
   → Inserts into shot_plans table
         ↓
3. User selects shots to render
         ↓
4. Configure batch (Speed/Narrative mode)
         ↓
5. Submit batch
   → Creates rendering_batch record
   → Creates rendering_jobs for each variation
   → Updates shot_plans status to 'rendering'
         ↓
6. Background process (future)
   → Calls Vertex AI Veo 3.1 API
   → Stores video URLs
   → Updates job status
         ↓
7. Review variations
   → User selects best variation
   → Marks as approved
```

---

## Database Schema

### Core Tables

#### organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### series
```sql
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  target_audience TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### episodes
```sql
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  script_id UUID REFERENCES scripts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Production Tables (Vertex AI Veo 3.1)

#### shot_plans
```sql
CREATE TABLE shot_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  shot_number INTEGER NOT NULL,
  act_number INTEGER NOT NULL,
  scene_number INTEGER NOT NULL,
  shot_type TEXT NOT NULL, -- establishing_shot, wide_shot, close_up, etc.
  camera_angle TEXT NOT NULL, -- eye_level, high_angle, aerial, etc.
  description TEXT NOT NULL,
  dialogue TEXT,
  characters TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds IN (4, 6, 8)),
  status TEXT DEFAULT 'pending', -- pending, rendering, completed, failed
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### rendering_batches
```sql
CREATE TABLE rendering_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  batch_number INTEGER NOT NULL,
  render_mode TEXT NOT NULL, -- speed, narrative
  total_shots INTEGER NOT NULL,
  completed_shots INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, submitted, processing, completed, failed
  estimated_cost DECIMAL(10,2) NOT NULL,
  actual_cost DECIMAL(10,2),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### rendering_jobs
```sql
CREATE TABLE rendering_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_id UUID NOT NULL REFERENCES shot_plans(id),
  batch_id UUID REFERENCES rendering_batches(id),
  variation_number INTEGER NOT NULL, -- 1-8 for speed, 1-20 for narrative
  status TEXT DEFAULT 'queued', -- queued, processing, completed, failed
  vertex_job_id TEXT, -- Vertex AI job ID
  video_url TEXT, -- URL to generated video
  thumbnail_url TEXT,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Prompt Library System

#### prompt_templates
```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  prompt_key TEXT NOT NULL,
  prompt_name TEXT NOT NULL,
  category TEXT NOT NULL, -- script, video, voice, storyboard, style
  description TEXT,
  is_system_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  variables_schema JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, prompt_key)
);
```

**System Default Prompts:**
- `script_generation` - Episode script generation with timing
- `claymation_style_base` - Base claymation style description
- `claymation_style_full` - Complete style guide
- `video_negative_prompts` - Terms to exclude from generation
- `audio_directives` - Audio generation instructions
- `shot_description` - Storyboard shot descriptions
- `storyboard_image` - Storyboard panel generation
- `camera_shot_types` - Camera reference guide
- `character_description` - Character template
- `veo3_video_prompt` - Veo 3 video generation template

#### prompt_template_versions
```sql
CREATE TABLE prompt_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_template_id UUID NOT NULL REFERENCES prompt_templates(id),
  version_number INTEGER NOT NULL,
  prompt_content TEXT NOT NULL,
  variables_schema JSONB DEFAULT '[]',
  created_by TEXT,
  change_notes TEXT,
  is_deployed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prompt_template_id, version_number)
);
```

#### prompt_enhancement_history
```sql
CREATE TABLE prompt_enhancement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID NOT NULL REFERENCES prompt_template_versions(id),
  organization_id UUID REFERENCES organizations(id),
  original_content TEXT NOT NULL,
  enhanced_content TEXT NOT NULL,
  enhancement_type TEXT DEFAULT 'clarity', -- clarity, detail, optimize, custom
  custom_instruction TEXT,
  accepted BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Patent Application Tables

#### patent_applications
```sql
CREATE TABLE patent_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  filing_type TEXT NOT NULL, -- provisional, non_provisional, continuation
  status TEXT DEFAULT 'draft', -- draft, in_review, filed, pending, granted, rejected
  inventor_name TEXT NOT NULL,
  inventor_citizenship TEXT DEFAULT 'US Citizen',
  specification TEXT,
  abstract TEXT, -- 150 words max
  prior_art_patents JSONB DEFAULT '[]',
  prior_art_literature JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### patent_claims
```sql
CREATE TABLE patent_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES patent_applications(id),
  claim_number INTEGER NOT NULL,
  claim_type TEXT NOT NULL, -- independent, dependent
  parent_claim_id UUID REFERENCES patent_claims(id),
  claim_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, reviewed, finalized
  category TEXT, -- method, system, apparatus, composition
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### patent_drawings
```sql
CREATE TABLE patent_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES patent_applications(id),
  figure_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  svg_content TEXT,
  image_url TEXT,
  drawing_type TEXT, -- block_diagram, flowchart, wireframe, schematic
  callouts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Cost Tracking Tables

#### episode_ltv_metrics
```sql
CREATE TABLE episode_ltv_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  total_production_cost DECIMAL(10,2) DEFAULT 0,
  estimated_revenue_year_1 DECIMAL(10,2) DEFAULT 0,
  estimated_revenue_year_2 DECIMAL(10,2) DEFAULT 0,
  estimated_revenue_year_3 DECIMAL(10,2) DEFAULT 0,
  total_ltv DECIMAL(10,2) DEFAULT 0,
  ltv_to_cost_ratio DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

All tables have RLS enabled with organization-based policies:

```sql
-- Example policy for shot_plans
CREATE POLICY "Users can view shots in their organization"
  ON shot_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM episodes e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = shot_plans.episode_id
      AND om.user_id = auth.uid()
    )
  );
```

---

## Reskinning Guide

### How to Rebrand This Platform

This platform can be reskinned for different industries:
- **Animation Studios**: Current configuration
- **Live Action Production**: Change terminology from "animation" to "film production"
- **Marketing Agencies**: Focus on ad campaign creation
- **Education**: Course video production
- **Documentary**: News/documentary production workflow

### Step 1: Update Branding

**1. Change Logo and Colors**

Edit `/src/components/Logo.tsx`:
```typescript
export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Film className="w-8 h-8 text-blue-600" /> {/* Change icon */}
      <span className="text-2xl font-bold text-gray-900">
        YourBrand {/* Change name */}
      </span>
    </div>
  );
}
```

Edit `/tailwind.config.js` for color scheme:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#YOUR_PRIMARY_COLOR',
        secondary: '#YOUR_SECONDARY_COLOR',
      }
    }
  }
}
```

**2. Update Terminology**

Search and replace across the codebase:
- "Series" → "Project" / "Show" / "Campaign"
- "Episode" → "Video" / "Asset" / "Module"
- "Shot" → "Clip" / "Scene" / "Segment"
- "Production" → "Creation" / "Generation" / "Workflow"

**3. Customize Navigation**

Edit `/src/components/Layout.tsx` to add/remove menu items:
```typescript
const navigation = [
  { name: 'Dashboard', icon: Home },
  { name: 'Projects', icon: Film },
  { name: 'Production', icon: PlayCircle },
  // Add your custom items
];
```

### Step 2: Configure Features

**Enable/Disable Modules**

Edit `/src/App.tsx` to control which features are available:
```typescript
const FEATURE_FLAGS = {
  enableScriptGeneration: true,
  enableVideoProduction: true,
  enableCharacters: true,
  enableTranslations: false, // Disable if not needed
  enableCostTracking: true,
  enableAnalytics: true
};
```

**Customize Production Modes**

Edit `/src/components/Production.tsx` to change render modes:
```typescript
// Change from Speed/Narrative to your own modes
type RenderMode = 'draft' | 'final' | 'hq';

const RENDER_MODES = {
  draft: { variations: 4, cost: 0.40, time: '1-2 min' },
  final: { variations: 8, cost: 0.75, time: '2-4 min' },
  hq: { variations: 20, cost: 1.88, time: '5-10 min' }
};
```

### Step 3: Customize Workflows

**Add Custom Approval Steps**

Create a new approval workflow component:
```typescript
// src/components/CustomApprovalFlow.tsx
export function CustomApprovalFlow({ itemId }) {
  const [approvalStage, setApprovalStage] = useState('draft');

  const stages = ['draft', 'review', 'approved', 'published'];

  // Your custom approval logic
}
```

**Add Custom Metadata Fields**

Extend the database schema:
```sql
-- Add custom fields to episodes
ALTER TABLE episodes ADD COLUMN custom_field_1 TEXT;
ALTER TABLE episodes ADD COLUMN custom_field_2 JSONB;
```

---

## Deployment

### Prerequisites

1. **Supabase Project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Google Cloud Account** (for Vertex AI)
   - Enable Vertex AI API
   - Create service account with Vertex AI permissions
   - Generate API key

3. **Optional: Voice Synthesis**
   - ElevenLabs API key
   - Or Chatterbox TTS setup

### Step-by-Step Deployment

**1. Clone and Install**
```bash
git clone <your-repo>
cd <project-folder>
npm install
```

**2. Configure Environment**

Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Keys (add via Supabase Edge Function secrets)
GOOGLE_VERTEX_AI_KEY=your-vertex-key
GOOGLE_PROJECT_ID=your-gcp-project-id
GEMINI_API_KEY=your-gemini-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

**3. Run Database Migrations**

The migrations are in `/supabase/migrations/`. They run automatically via Supabase.

To apply manually:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**4. Deploy Edge Functions**

```bash
supabase functions deploy elevenlabs-proxy
```

**5. Build and Deploy Frontend**

```bash
# Build for production
npm run build

# Deploy to your hosting (e.g., Netlify, Vercel)
# The dist/ folder contains the static files
```

### Hosting Options

**Option 1: Netlify**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Option 2: Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Option 3: Traditional Hosting**
- Upload `dist/` folder to any static hosting
- Configure redirects: `/* /index.html 200`

### Post-Deployment Setup

1. **User Registration**
   - Sign up via the authentication form
   - Verify email if email confirmation is enabled

2. **Create First Workspace**
   - Click "Create Workspace" button in the workspace switcher
   - Enter workspace name (e.g., "My Animation Studio")
   - Select billing tier (Free, Starter, Professional, or Enterprise)
   - The system automatically:
     - Generates a unique slug for the workspace URL
     - Creates the organization record
     - Adds you as the owner
     - Initializes default prompt templates

3. **Initialize Prompt Library** (Optional)
   ```sql
   -- Copy system default prompts to your organization
   SELECT initialize_organization_prompts('<your-organization-id>');
   ```

4. **Test Production Flow**
   - Create a series within your workspace
   - Create an episode
   - Upload or generate a script
   - Navigate to Production tab
   - Generate shot list
   - Submit a test batch

---

## Cost Structure

### Vertex AI Veo 3.1 Pricing

**Per-Shot Costs:**
- Speed Mode: $0.75 per shot (8 variations)
- Narrative Mode: $1.88 per shot (20 variations)

**Breakdown:**
```
Speed Mode:
- 8 variations × 6 seconds average = 48 seconds total
- $0.75 per shot / 48 seconds = $0.0156 per second
- Each variation: $0.09375

Narrative Mode:
- 20 variations × 6 seconds average = 120 seconds total
- $1.88 per shot / 120 seconds = $0.0157 per second
- Each variation: $0.094
```

### Example Episode Costs

**10-Minute Episode (100 shots)**
```
Speed Mode:
- 100 shots × $0.75 = $75
- 800 variations total
- ~3-6 hours processing time

Narrative Mode:
- 100 shots × $1.88 = $188
- 2,000 variations total
- ~8-16 hours processing time
```

### Total Platform Costs

**Monthly Operating Costs (Estimated):**
```
Supabase Pro: $25/month
  - Includes 500MB database
  - 50GB bandwidth
  - Edge functions

Hosting (Netlify/Vercel): $0-20/month
  - Free tier available
  - Pro for custom domain

Total Fixed Costs: ~$25-45/month
Variable Costs: Pay-per-use for video generation
```

### Cost Optimization Tips

1. **Use Speed Mode for Drafts**: Review with 8 variations before committing to 20
2. **Batch Similar Shots**: Group shots by location/characters for consistency
3. **Optimize Shot Duration**: Prefer 4-6 second shots over 8 seconds when possible
4. **Review Shot Lists**: Remove unnecessary shots before rendering
5. **Selective Regeneration**: Only regenerate shots that need improvement

---

## File Map

### Frontend Structure

```
src/
├── components/                 # React components (50+ files)
│   ├── Layout.tsx             # 580 lines - Main layout
│   ├── Production.tsx         # 806 lines - Video production workflow
│   ├── Dashboard.tsx          # 350 lines - Overview with IP sections
│   ├── Scripts.tsx            # 450 lines - Script management
│   ├── Episodes.tsx           # 400 lines - Episode creation & tracking
│   ├── Characters.tsx         # 380 lines - Character library
│   ├── Assets.tsx             # 420 lines - Asset management
│   ├── StoryboardViewer.tsx   # 520 lines - Storyboard review
│   ├── Settings.tsx           # 380 lines - App settings
│   ├── OrganizationSwitcher.tsx # 180 lines - Workspace selector
│   ├── CreateWorkspaceModal.tsx # 264 lines - Workspace creation
│   ├── SeriesSwitcher.tsx     # 150 lines - Series selector
│   ├── PromptLibrary.tsx      # 343 lines - Prompt management
│   ├── PromptEditorModal.tsx  # 280 lines - Prompt editing with AI
│   ├── PatentApplication.tsx  # 520 lines - Patent drafting
│   ├── VoiceGenerationTab.tsx # 380 lines - Voice synthesis
│   ├── ScriptTranslationManager.tsx # 320 lines - Multi-language
│   ├── LipSyncManager.tsx     # 280 lines - Lip sync tracking
│   ├── ApprovalWorkflow.tsx   # 280 lines - Review workflow
│   ├── CostComparison.tsx     # 250 lines - Cost analysis
│   ├── EpisodeProfitAnalytics.tsx # 340 lines - LTV tracking
│   └── [35+ other components]
│
├── services/                  # Business logic (30+ files)
│   ├── vertexAIService.ts    # 339 lines - Veo 3.1 integration
│   ├── shotListGeneratorService.ts # 339 lines - Shot generation
│   ├── batchManagementService.ts # 458 lines - Batch processing
│   ├── geminiService.ts      # 245 lines - Script AI
│   ├── elevenLabsService.ts  # 180 lines - Voice synthesis
│   ├── chatterboxService.ts  # 220 lines - Alternative TTS
│   ├── costCalculationService.ts # 195 lines - Cost tracking
│   ├── ltvCalculationService.ts # 280 lines - Lifetime value
│   ├── creatorCostCalculationService.ts # 250 lines - Creator costs
│   ├── scriptTranslationService.ts # 160 lines - Multi-language
│   ├── storyboardService.ts  # 320 lines - Storyboard generation
│   ├── promptLibraryService.ts # 280 lines - Prompt management
│   ├── promptEnhancementService.ts # 220 lines - AI optimization
│   ├── lipSyncService.ts     # 240 lines - Lip sync management
│   ├── dialogueAudioService.ts # 190 lines - Audio processing
│   ├── episodeProgressService.ts # 210 lines - Progress tracking
│   ├── patentApplicationService.ts # 180 lines - Patent generation
│   ├── patentClaimsService.ts # 140 lines - Claims management
│   ├── patentDrawingsService.ts # 120 lines - Drawing generation
│   └── [15+ other services]
│
├── contexts/                  # React contexts
│   ├── AuthContext.tsx       # 120 lines
│   └── OrganizationContext.tsx # 140 lines
│
├── lib/                       # Core libraries
│   ├── supabase.ts           # 15 lines - Client setup
│   └── database.types.ts     # 450 lines - Generated types
│
├── utils/                     # Helper functions
│   └── sampleData.ts         # 150 lines
│
├── App.tsx                    # 85 lines - Main app
├── main.tsx                   # 25 lines - Entry point
└── index.css                  # 180 lines - Global styles
```

### Database Migrations

```
supabase/migrations/
├── 20251207173341_create_animation_production_schema.sql
├── 20251207175147_add_anon_access_policies.sql
├── 20251207184846_create_character_images_storage.sql
├── 20251207214518_sync_character_assets.sql
├── 20251207215125_create_user_settings_table.sql
├── 20251207215529_enhance_production_jobs_for_ai_generation.sql
├── 20251207224121_create_storyboards_system.sql
├── 20251207232928_create_script_episode_workflow.sql
├── 20251208004512_create_comprehensive_backup_system.sql
├── 20251208131453_create_production_assets_storage.sql
├── 20251208202243_add_character_role_classification.sql
├── 20251209165223_create_storyboard_images_storage.sql
├── 20251210153907_create_revenue_tracking_enhancements.sql
├── 20251210165025_add_storyboard_editing_and_approval_workflow.sql
├── 20251210200831_add_episode_ltv_tracking.sql
├── 20251210220456_create_script_translation_system.sql
├── 20251210225519_add_video_generation_cost_tracking.sql
├── 20251210233412_create_creator_cost_tracking.sql
├── 20251211000447_add_chatterbox_voice_support.sql
├── 20251211003236_rename_artists_per_scene_to_artists_per_episode.sql
├── 20251211144103_create_multi_tenant_organizations.sql
├── 20251211144258_create_brand_template_marketplace.sql
├── 20251211144415_create_advanced_cross_brand_analytics.sql
├── 20251211144527_create_smart_asset_management.sql
├── 20251211144637_create_customizable_workflow_system.sql
├── 20251211152056_fix_organization_members_rls_recursion.sql
├── 20251211152106_fix_organization_invitations_rls_recursion.sql
├── 20251211152349_simplify_organizations_insert_policy.sql
├── 20251211152925_fix_series_rls_policy_conflicts.sql
├── 20251211153219_fix_organization_members_insert_policy.sql
├── 20251211155242_fix_organizations_insert_policy_final.sql
├── 20251211160710_add_role_and_asset_type_constraints.sql
├── 20251211162110_add_soft_delete_and_management_features.sql
├── 20251211173022_fix_orphaned_organization_data.sql
├── 20251211174011_add_delete_series_function.sql
├── 20251211175811_fix_count_series_content_archived_column.sql
├── 20251211180127_fix_delete_series_function_missing_tables.sql
├── 20251211180539_fix_delete_series_workflow_dependencies.sql
├── 20251211181326_fix_delete_series_column_names.sql
├── 20251211193833_create_dashboard_ip_sections.sql
├── 20251211223945_create_vertex_ai_veo3_production_system.sql
├── 20251211231311_comprehensive_orphaned_asset_fix.sql
├── 20251211233803_link_storyboards_to_episodes_v2.sql
├── 20251211235528_create_script_to_shot_generation_functions.sql
├── 20251212112334_add_standalone_shot_generation.sql
├── 20251212113702_create_production_draft_sessions.sql
├── 20251212143844_fix_episode_script_integrity.sql
├── 20251212145511_comprehensive_organization_repair_v2.sql
├── 20251212150040_remove_duplicate_anon_policies.sql
├── 20251212151006_fix_script_analysis_multi_org_support.sql
├── 20251212154541_add_scripts_content_and_organization.sql
├── 20251212155245_add_episode_number_column.sql
├── 20251212161646_add_dialogue_voice_trt_tracking.sql
├── 20251212165927_create_lip_sync_system.sql
├── 20251212172841_create_episode_progress_tracking.sql
├── 20251212172910_add_episode_progress_triggers.sql
├── 20251212172957_fix_progress_calculation_for_lip_sync_jobs.sql
├── 20251212173302_backfill_existing_episode_progress.sql
├── 20251212180147_create_workflow_progress_tracking.sql
├── 20251212182641_create_optimized_episode_queries.sql
├── 20251212182725_create_optimized_script_queries.sql
├── 20251212191512_create_prompt_library_system.sql
├── 20251212191851_seed_default_system_prompts.sql
├── 20251214024352_create_gemini_api_usage_tracking.sql
├── 20251214025737_create_translation_analytics_and_export_tracking.sql
├── 20251214041112_add_human_editing_costs_with_asset_decay.sql
├── 20251214042150_update_production_cost_defaults_2024_research.sql
├── 20251214042208_update_creator_cost_defaults_2024_research.sql
├── 20251214043944_add_series_default_episode_count.sql
├── 20251214050833_add_traditional_animation_cost_breakdown.sql
├── 20251214060901_add_stuck_translation_recovery.sql
├── 20251214072033_add_featured_trailer_to_series.sql
└── 20251215104915_create_patent_application_system.sql
```

### Configuration Files

```
/
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite bundler config
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config
├── eslint.config.js          # ESLint config
├── .env                      # Environment variables
└── README.md                 # Project overview
```

### Key Files for Customization

**Must Modify:**
1. `/src/components/Logo.tsx` - Branding
2. `/src/components/Layout.tsx` - Navigation
3. `/.env` - API keys and URLs
4. `/tailwind.config.js` - Colors and styling

**Optional Modify:**
5. `/src/components/Production.tsx` - Production workflow
6. `/src/services/vertexAIService.ts` - Video generation logic
7. `/src/services/batchManagementService.ts` - Batch processing
8. `/src/components/Dashboard.tsx` - Home screen

**Don't Modify Unless Necessary:**
- `/src/lib/supabase.ts` - Core database client
- `/src/contexts/*.tsx` - State management
- `/supabase/migrations/*.sql` - Database schema

---

## Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Create Supabase project
- [ ] Configure `.env` file with Supabase URL and keys
- [ ] Run database migrations (automatic via Supabase)
- [ ] Update branding in `Logo.tsx`
- [ ] Customize colors in `tailwind.config.js`
- [ ] Deploy Edge Functions (`npm run deploy:functions`)
- [ ] Build frontend (`npm run build`)
- [ ] Deploy to hosting platform (Netlify/Vercel)
- [ ] Sign up and create your first account
- [ ] Create first workspace via UI
- [ ] Set up prompt library templates
- [ ] Test production workflow
- [ ] Configure API keys (Gemini, Vertex AI, ElevenLabs) in Settings

---

## Support & Resources

**Documentation:**
- [Vertex AI Veo 3.1 Docs](https://cloud.google.com/vertex-ai/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React + TypeScript](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS](https://tailwindcss.com/docs)

**API References:**
- [Gemini API](https://ai.google.dev/docs)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [Supabase Client](https://supabase.com/docs/reference/javascript)

**Community:**
- GitHub Issues for bug reports
- Discussions for feature requests
- Stack Overflow for technical questions

---

**Last Updated:** December 16, 2024
**Version:** 3.1.0
**License:** MIT

**Major Features:**
- Multi-workspace support with billing tiers
- Comprehensive prompt library system with 10+ default templates
- AI-powered prompt enhancement with version control
- Patent application drafting and management system
- Episode progress tracking and analytics
- Script translation system with export capabilities
- Lip sync management with provider support
- Featured trailer showcase for series
- LTV and cost tracking with traditional animation comparisons
- Gemini API usage monitoring
