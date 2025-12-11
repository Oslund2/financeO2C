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

**Multi-Tenancy**
- Organization management
- Series and episode isolation
- Role-based access control
- Cross-organization analytics

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
│   ├── Production.tsx          # Video production (NEW)
│   ├── Characters.tsx          # Character management
│   ├── Assets.tsx              # Asset library
│   ├── StoryboardViewer.tsx    # Storyboard review
│   ├── Settings.tsx            # Organization settings
│   └── OrganizationSwitcher.tsx # Org selector
│
├── services/
│   ├── vertexAIService.ts      # Veo 3.1 integration
│   ├── shotListGeneratorService.ts  # Shot list logic
│   ├── batchManagementService.ts    # Batch processing
│   ├── geminiService.ts        # Script generation
│   ├── elevenLabsService.ts    # Voice synthesis
│   ├── costCalculationService.ts    # Cost tracking
│   └── [other services...]
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

1. **Create First Organization**
   ```sql
   INSERT INTO organizations (name, slug)
   VALUES ('My Studio', 'my-studio');
   ```

2. **Add Yourself as Member**
   ```sql
   INSERT INTO organization_members (organization_id, user_id, role)
   VALUES (
     '<organization-id>',
     '<your-user-id>',
     'owner'
   );
   ```

3. **Test Production Flow**
   - Create a series
   - Create an episode
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
├── components/                 # React components
│   ├── Layout.tsx             # 580 lines - Main layout
│   ├── Production.tsx         # 806 lines - Video production (NEW)
│   ├── Dashboard.tsx          # 350 lines - Overview
│   ├── Scripts.tsx            # 450 lines - Script management
│   ├── Episodes.tsx           # 400 lines - Episode creation
│   ├── Characters.tsx         # 380 lines - Character library
│   ├── Assets.tsx             # 420 lines - Asset management
│   ├── StoryboardViewer.tsx   # 520 lines - Storyboard review
│   ├── Settings.tsx           # 380 lines - App settings
│   ├── OrganizationSwitcher.tsx # 180 lines - Org selector
│   ├── SeriesSwitcher.tsx     # 150 lines - Series selector
│   ├── VoiceGenerationTab.tsx # 380 lines - Voice synthesis
│   ├── ScriptTranslationManager.tsx # 320 lines
│   ├── ApprovalWorkflow.tsx   # 280 lines
│   ├── CostComparison.tsx     # 250 lines
│   └── [28 other components]
│
├── services/                  # Business logic
│   ├── vertexAIService.ts    # 339 lines - Veo 3.1 integration
│   ├── shotListGeneratorService.ts # 339 lines - Shot generation
│   ├── batchManagementService.ts # 458 lines - Batch processing
│   ├── geminiService.ts      # 245 lines - Script AI
│   ├── elevenLabsService.ts  # 180 lines - Voice synthesis
│   ├── chatterboxService.ts  # 220 lines - Alternative TTS
│   ├── costCalculationService.ts # 195 lines
│   ├── ltvCalculationService.ts # 280 lines
│   ├── scriptTranslationService.ts # 160 lines
│   ├── storyboardService.ts  # 320 lines
│   └── [8 other services]
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
└── 20251211223945_create_vertex_ai_veo3_production_system.sql  # NEW
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
- [ ] Configure `.env` file
- [ ] Run database migrations
- [ ] Update branding in `Logo.tsx`
- [ ] Customize colors in `tailwind.config.js`
- [ ] Deploy Edge Functions
- [ ] Build frontend (`npm run build`)
- [ ] Deploy to hosting platform
- [ ] Create first organization
- [ ] Test production workflow
- [ ] Configure API keys in Supabase secrets

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

**Last Updated:** December 2024
**Version:** 2.0.0
**License:** MIT
