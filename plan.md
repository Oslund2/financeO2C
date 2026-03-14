# Plan: Step-Away Autonomous Video Production Pipeline

## The Vision

User enters a storyline. Walks away. Comes back to a finished, watchable video.

No intermediate clicks. No "review shot list." No "configure generation options." No "trigger assembly." The system makes every decision a human producer would make, and the user only intervenes if they *want* to — not because the system can't proceed without them.

## What Exists Today (and Why It's Not Step-Away)

The current pipeline has **7 manual gates** that require user interaction:

```
Current Flow (each → is a MANUAL click/decision):

1. User selects/creates episode → picks characters, writes theme
2. User clicks "Generate Script" → waits, reviews output
3. User clicks "Generate Shot List" → configures pacing, reviews
4. User clicks "Generate Storyboards" → approves each image
5. User clicks "Generate Video" per batch → selects model, triggers
6. User clicks "Generate Dialogue Audio" → per character
7. User clicks "Assemble Rough Cut" → waits for Shotstack
   (8. User clicks "Smart Edit" → FFmpeg editor, optional)
```

Each step has its own UI, its own loading state, its own error handling. A user must babysit the entire process, often waiting 5-30 minutes between steps for AI generation to complete. This is a **supervised pipeline**, not an autonomous one.

### Services That Already Exist (and Work)

| Service | What It Does | Status |
|---------|-------------|--------|
| `geminiService.ts` | Generates scripts from episode theme + characters | Works, needs episode + characters input |
| `shotListGeneratorService.ts` | Generates shot plans from script with pacing control | Works, needs script + pacing config |
| `storyboardService.ts` | Generates storyboard images per shot | Works, needs shot plans |
| `veo3PromptService.ts` | Generates video prompts from shot metadata | Works, needs shot plans + workspace style |
| `vertexAIService.ts` | Submits Veo3 video generation jobs + polls for completion | Works, needs prompts |
| `dialogueAudioService.ts` | Generates dialogue audio via ElevenLabs/Chatterbox | Works, needs dialogue text + voice IDs |
| `lipSyncService.ts` | Applies lip sync via SyncLabs/VEED.IO | Works, needs video + audio |
| `videoAssemblyService.ts` | Assembles final video via Shotstack | Works, needs shots + API key |
| `editorial/*` (new) | Intelligent editing via FFmpeg | Works, needs shots + format profile |

**Key insight: Every service works. They just aren't connected.** Each one is a standalone tool that a human manually invokes in sequence. The pipeline needs an orchestrator.

### What's Missing

1. **No orchestrator** — Nothing connects script → shots → storyboard → video → audio → assembly into an automated chain
2. **No progress tracking** — No unified view of "where is my video in the pipeline?"
3. **No decision engine** — The system can't decide pacing, model selection, or quality thresholds without human input
4. **No error recovery** — If video generation fails for shot 14/30, nothing retries it or works around it
5. **No completion detection** — Nothing knows "all steps are done, the video is ready"

---

## Architecture: The Autopilot Engine

```
┌─────────────────────────────────────────────────────────────┐
│                    Autopilot Launch UI                       │
│  Story input → format selection → "Go" button → walk away   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│               Pipeline Orchestrator Service                  │
│  State machine that drives the entire pipeline autonomously  │
│                                                              │
│  States:                                                     │
│  script_generation → shot_planning → storyboard_generation   │
│  → video_generation → dialogue_audio → lip_sync              │
│  → editorial_assembly → complete                             │
│                                                              │
│  Each state:                                                 │
│  1. Checks preconditions                                     │
│  2. Invokes the appropriate service                          │
│  3. Polls for completion                                     │
│  4. Handles errors (retry / skip / degrade gracefully)       │
│  5. Advances to next state                                   │
│  6. Updates progress in real-time                            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│             Autopilot Decision Engine                         │
│  Makes the creative/technical decisions humans currently make │
│                                                              │
│  - Pacing: derived from format + genre + runtime             │
│  - Model selection: Veo 3.1 for quality, 3.0-fast for speed │
│  - Shot duration: from pacing profile                        │
│  - Voice assignment: from character voice configs             │
│  - Quality gates: auto-approve if score > threshold          │
│  - Assembly format: from format profile                      │
│  - Retry strategy: 2 retries, then skip + log               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Autopilot Monitor UI                             │
│  Real-time progress dashboard — the "check back" screen      │
│                                                              │
│  - Pipeline stage indicator with estimated time remaining     │
│  - Per-shot status grid (generating / complete / failed)      │
│  - Live log of decisions made                                │
│  - "Your video is ready" notification                        │
│  - Preview + download when complete                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Pipeline States (State Machine)

```
                    ┌──────────────┐
                    │   INITIATED   │
                    │ (user input)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   SCRIPTING   │  ← Gemini generates full script
                    │  ~30-60s      │    with acts, scenes, dialogue
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ SHOT_PLANNING │  ← Shot list from script
                    │  ~10-20s      │    auto-configured pacing
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ STORYBOARDING │  ← Image generation per shot
                    │  ~2-5 min     │    (parallel, batched)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │VIDEO_RENDERING│  ← Veo3 video generation
                    │  ~5-20 min    │    (parallel, batched by API limits)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ DIALOGUE_AUDIO│  ← ElevenLabs/Chatterbox TTS
                    │  ~1-3 min     │    (parallel per character)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   LIP_SYNC    │  ← SyncLabs/VEED.IO
                    │  ~2-5 min     │    (parallel per dialogue shot)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  ASSEMBLING   │  ← Editorial engine → FFmpeg
                    │  ~1-3 min     │    or Shotstack cloud render
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   COMPLETE    │  ← Video ready for download
                    └──────────────┘

    At any point → FAILED (with partial results + retry option)
```

**Total estimated time: ~15-40 minutes** depending on episode length, shot count, and API response times. The user walks away after ~10 seconds of input.

---

## Implementation Steps

### Step 1: Database — Pipeline Runs Table

Track each autonomous pipeline execution.

```sql
create table autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  series_id uuid references series(id),
  organization_id uuid references organizations(id),

  -- Input
  storyline text not null,
  format_type text not null default 'streaming',
  target_runtime_minutes integer default 5,
  quality_preset text default 'balanced', -- 'fast' | 'balanced' | 'max_quality'

  -- State machine
  current_state text not null default 'initiated',
  -- 'initiated' | 'scripting' | 'shot_planning' | 'storyboarding'
  -- | 'video_rendering' | 'dialogue_audio' | 'lip_sync'
  -- | 'assembling' | 'complete' | 'failed'

  -- Progress tracking
  progress_percent integer default 0,
  current_stage_detail text,          -- e.g., "Rendering shot 14/30"
  stages_completed text[] default '{}',
  decision_log jsonb default '[]',    -- Array of {timestamp, decision, rationale}

  -- Timing
  started_at timestamptz,
  estimated_completion_at timestamptz,
  completed_at timestamptz,

  -- Output
  output_video_url text,
  output_edl_id uuid references edit_decision_lists(id),

  -- Error handling
  error_message text,
  retry_count integer default 0,
  skipped_shots integer[] default '{}',

  -- Cost tracking
  estimated_cost_usd numeric(10, 4),
  actual_cost_usd numeric(10, 4),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**File:** `supabase/migrations/XXXXXX_create_autopilot_runs.sql`

### Step 2: Autopilot Decision Engine

Makes the creative and technical decisions that currently require human input.

```ts
// Key decisions:
interface AutopilotDecisions {
  // Script generation
  scriptTemperature: number;        // 0.7 for drama, 0.9 for comedy
  includeVocabularyWords: boolean;

  // Shot planning
  pacing: 'fast' | 'medium' | 'slow';  // Derived from format
  averageShotDuration: number;          // Derived from runtime target
  includeEstablishingShots: boolean;

  // Video generation
  veoModel: string;                 // Quality preset → model mapping
  resolution: '720p' | '1080p';
  samplesPerShot: number;           // 1 for fast, 2 for balanced, 4 for max
  batchSize: number;                // Parallel generation limit

  // Audio
  voiceProvider: 'elevenlabs' | 'chatterbox';
  autoAssignVoices: boolean;

  // Lip sync
  lipSyncProvider: string;
  skipLipSyncForNonDialogue: boolean;

  // Assembly
  assemblyMethod: 'ffmpeg' | 'shotstack';
  formatProfile: FormatType;
  editorialQualityThreshold: number;  // Auto-approve above this

  // Error tolerance
  maxRetriesPerShot: number;
  allowPartialAssembly: boolean;    // Assemble with stills for failed shots
}
```

The decision engine derives all values from three user inputs:
1. **Storyline** (text)
2. **Format** (broadcast/streaming/short/etc)
3. **Quality preset** (fast/balanced/max_quality)

**File:** `src/services/autopilotDecisionEngine.ts`

### Step 3: Pipeline Orchestrator Service

The state machine that drives everything. This is the core of step-away.

```ts
export async function runAutopilotPipeline(runId: string): Promise<void> {
  // Load run config from database
  // Enter state machine loop:

  while (currentState !== 'complete' && currentState !== 'failed') {
    switch (currentState) {
      case 'initiated':
        // Create episode + series records if needed
        // Fetch characters for series (or use defaults)
        advanceTo('scripting');
        break;

      case 'scripting':
        // Call geminiService.generateScriptWithGemini()
        // Save script to database
        // Parse into acts/scenes/dialogue
        advanceTo('shot_planning');
        break;

      case 'shot_planning':
        // Call shotListGeneratorService.generateShotListFromScript()
        // Save production_shot_plans to database
        advanceTo('storyboarding');
        break;

      case 'storyboarding':
        // Call storyboardService to generate images for all shots
        // Batch parallel, poll for completion
        // Auto-approve all (or quality-gate if max_quality)
        advanceTo('video_rendering');
        break;

      case 'video_rendering':
        // Generate Veo3 prompts via veo3PromptService
        // Submit batch via vertexAIService.submitVeo3Request()
        // Poll all jobs until complete (with retry on failure)
        // Store results in shot_rendering_results
        advanceTo('dialogue_audio');
        break;

      case 'dialogue_audio':
        // Extract dialogue lines per character
        // Generate audio via dialogueAudioService
        // Store in dialogue_audio_clips
        advanceTo('lip_sync');
        break;

      case 'lip_sync':
        // For each shot with dialogue + video:
        // Submit lip sync job via lipSyncService
        // Poll for completion
        advanceTo('assembling');
        break;

      case 'assembling':
        // Convert shots to EditorialShot[]
        // Run editorial engine (generateEDL)
        // Render via FFmpeg (renderEDL) or Shotstack
        // Store output URL
        advanceTo('complete');
        break;
    }
  }
}
```

Each state transition:
- Updates `autopilot_runs.current_state` and `progress_percent`
- Logs decisions to `decision_log`
- Handles errors with retry → skip → fail gracefully
- Writes `current_stage_detail` for the UI to show

**File:** `src/services/autopilotPipelineOrchestrator.ts`

### Step 4: Progress Tracker

Real-time progress updates that the monitor UI can poll or subscribe to.

```ts
interface PipelineProgress {
  runId: string;
  state: PipelineState;
  progressPercent: number;
  stageDetail: string;
  estimatedMinutesRemaining: number;
  shotsStatus: {
    total: number;
    storyboarded: number;
    rendered: number;
    withAudio: number;
    withLipSync: number;
    failed: number;
  };
  recentDecisions: { timestamp: string; decision: string }[];
  costSoFar: number;
}
```

Updates are written to the `autopilot_runs` table on every state change and sub-step completion. The UI polls every 3 seconds or uses Supabase Realtime subscription.

**File:** `src/services/autopilotProgressTracker.ts`

### Step 5: Autopilot Launch UI

The "walk away" interface. Minimal — storyline, format, go.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  🎬 Autopilot Video Production                  │
│                                                  │
│  Storyline:                                      │
│  ┌─────────────────────────────────────────────┐ │
│  │ A young chef discovers her grandmother's     │ │
│  │ secret recipe book and enters a cooking      │ │
│  │ competition to save the family restaurant... │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Format: [Streaming ▾]    Runtime: [5 min ▾]    │
│                                                  │
│  Quality: ○ Fast (~15 min)                       │
│           ● Balanced (~25 min)                   │
│           ○ Maximum (~40 min)                    │
│                                                  │
│  Series: [Auto-detect / Select ▾]               │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │         🚀 Start Production                  │ │
│  │    You can close this tab and come back.     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

After clicking "Start Production," immediately transitions to the Monitor UI.

**File:** `src/components/AutopilotLaunch.tsx`

### Step 6: Autopilot Monitor UI

The "check back" dashboard. Shows real-time progress without requiring interaction.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Autopilot: "The Secret Recipe" — Streaming, 5 min          │
│                                                              │
│  ████████████████████░░░░░░░░░░  67%  ~8 min remaining      │
│                                                              │
│  ✅ Script Generated (42s)                                   │
│  ✅ Shot Plan (24 shots) (18s)                               │
│  ✅ Storyboards (24/24) (2m 14s)                             │
│  🔄 Video Rendering (16/24 complete) — Rendering shot 17... │
│  ⬜ Dialogue Audio                                           │
│  ⬜ Lip Sync                                                 │
│  ⬜ Editorial Assembly                                       │
│                                                              │
│  ┌─ Shot Grid ─────────────────────────────────────────────┐ │
│  │ 1✅ 2✅ 3✅ 4✅ 5✅ 6✅ 7✅ 8✅ 9✅ 10✅ 11✅ 12✅  │ │
│  │ 13✅ 14✅ 15✅ 16🔄 17🔄 18⬜ 19⬜ 20⬜ 21⬜ 22⬜  │ │
│  │ 23⬜ 24⬜                                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Recent decisions:                                           │
│  · Shot 15: Used Veo 3.1 (dialogue scene, needs audio sync) │
│  · Shot 14: Retried once (timeout), succeeded on retry       │
│  · Pacing set to "medium" (streaming format, 5 min runtime)  │
│                                                              │
│  Cost so far: $1.24                                          │
└─────────────────────────────────────────────────────────────┘
```

When pipeline reaches `complete`:
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Your video is ready!                                     │
│                                                              │
│  "The Secret Recipe" — 4:52 runtime                          │
│  24 shots · 18 with video · 6 with lip-sync                 │
│  Total cost: $2.18 · Total time: 23 min                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              [Video Player]                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Download MP4]  [Open in FFmpeg Editor]  [Run Again]        │
└─────────────────────────────────────────────────────────────┘
```

**File:** `src/components/AutopilotMonitor.tsx`

### Step 7: Sidebar Navigation

Add "Autopilot" to the sidebar as the first production-related item with a distinctive icon.

**File:** `src/components/Layout.tsx`, `src/App.tsx`

### Step 8: Active Runs Dashboard

When the user navigates to Autopilot, show:
- Any active/running pipelines with live progress
- Recent completed pipelines with output links
- "Start New" button to launch a new run

**File:** `src/components/AutopilotDashboard.tsx`

---

## The Autopilot Decision Engine — Detail

The key to step-away is that the system must make every decision a producer would. Here's how each is derived:

### Script Decisions
| Input | Decision | Logic |
|-------|----------|-------|
| Format = short_form | temperature = 0.8, maxTokens = 4000 | Short scripts need punchier writing |
| Format = broadcast | temperature = 0.7, maxTokens = 16000 | Longer, more structured scripts |
| Format = spot | temperature = 0.9, maxTokens = 2000 | Creative, concise copy |
| No characters in series | Auto-create 2-3 from storyline | Use Gemini to extract character descriptions from storyline |

### Shot Planning Decisions
| Input | Decision | Logic |
|-------|----------|-------|
| Runtime ≤ 2 min | pacing = 'fast', avg shot = 4s | Short content = tight cuts |
| Runtime 2-10 min | pacing = 'medium', avg shot = 6s | Standard pacing |
| Runtime > 10 min | pacing = 'slow', avg shot = 7s | Room to breathe |
| Format = spot | pacing = 'fast', avg shot = 3s | Every frame sells |
| Format = documentary | includeEstablishing = true | Documentary needs establishing shots |

### Video Generation Decisions
| Quality Preset | Model | Resolution | Samples | Parallel |
|---------------|-------|-----------|---------|----------|
| fast | veo-3.0-generate-001 | 720p | 1 | 4 at once |
| balanced | veo-3.1-generate-001 | 720p | 1 | 3 at once |
| max_quality | veo-3.1-generate-001 | 1080p | 2 | 2 at once |

### Assembly Decisions
| Condition | Decision | Logic |
|-----------|----------|-------|
| Shotstack API key configured | Use Shotstack | Cloud render, higher quality |
| No Shotstack key | Use FFmpeg editorial engine | Free, local, still watchable |
| Quality preset = max_quality | FFmpeg editorial + Shotstack final | Best of both |

### Error Recovery
| Error | Recovery | Fallback |
|-------|----------|----------|
| Video render timeout | Retry once with shorter duration | Use storyboard still |
| Dialogue audio fails | Retry with alternate provider | Skip dialogue audio for shot |
| Lip sync fails | Retry once | Use non-lip-synced video |
| Storyboard generation fails | Retry with simplified prompt | Skip storyboard, use placeholder |
| Script generation fails | Retry with adjusted temperature | Fail pipeline (can't proceed without script) |
| Assembly fails | Retry | Fall back to simple concat |

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/..._autopilot_runs.sql` | Create | Pipeline runs table + RLS |
| `src/services/autopilotDecisionEngine.ts` | Create | Derives all creative/technical decisions from 3 inputs |
| `src/services/autopilotPipelineOrchestrator.ts` | Create | State machine that drives the full pipeline |
| `src/services/autopilotProgressTracker.ts` | Create | Progress updates + cost tracking |
| `src/components/AutopilotLaunch.tsx` | Create | Story input → format → quality → go |
| `src/components/AutopilotMonitor.tsx` | Create | Real-time progress dashboard |
| `src/components/AutopilotDashboard.tsx` | Create | Active runs + history + start new |
| `src/components/Layout.tsx` | Modify | Add "Autopilot" nav item |
| `src/App.tsx` | Modify | Add autopilot route |

## What This Does NOT Include (Future)

- **Email/push notification** when video is ready (would need a notification service)
- **Batch production** (generate 10 episodes at once)
- **A/B variant generation** (make two versions with different pacing)
- **Human-in-the-loop mode** (pause at each stage for approval)
- **Scheduling** (start production at 2am when API costs are lower)

These are all natural extensions but not needed for the core step-away experience.

## Success Criteria

The pipeline passes the **"Dinner Test"**:
1. User types a 2-sentence storyline
2. Selects format and quality
3. Clicks "Start Production"
4. Goes to dinner
5. Comes back to a watchable video with:
   - [ ] Coherent script with proper act structure
   - [ ] Shot variety (establishing, medium, close-up, reaction)
   - [ ] Generated video for most/all shots (stills for failures)
   - [ ] Audible, properly mixed dialogue
   - [ ] Lip sync on dialogue shots (where possible)
   - [ ] Format-aware editing (pacing, transitions, audio ducking)
   - [ ] No dead air, no frozen frames, no abrupt ending
   - [ ] A video they'd actually want to show someone
