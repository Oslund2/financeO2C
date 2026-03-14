# Plan: FFmpeg Editorial Intelligence Engine

## The Problem with the Previous Plan

The previous plan treated FFmpeg as a dumb tool — trim, concat, overlay, done. That produces technically assembled but **unwatchable** video. A real editor doesn't just join clips. They craft rhythm, breathe emotion into cuts, shape audio landscapes, and make hundreds of micro-decisions per minute that the audience never consciously notices but absolutely *feels*.

This plan builds an **Editorial Intelligence Engine** that sits between the rich metadata Bee Studio already has (shot types, camera angles, dialogue, pacing, emotions, act/scene structure, format configs) and FFmpeg's raw processing power. The engine makes the creative decisions. FFmpeg executes them.

## Philosophy: What Makes Video Watchable

1. **Cuts have intent.** Every cut exists for a reason — to follow action, reveal reaction, shift perspective, compress time, or build rhythm. Random cuts at clip boundaries feel like a slideshow.
2. **Transitions carry meaning.** A hard cut says "this is continuous." A dissolve says "time is passing." A fade says "this chapter is ending." A J-cut says "what you're about to see matters." Wrong transitions break the viewer's subconscious contract.
3. **Audio is 50% of the edit.** Dialogue needs room to breathe. Music should rise and fall with the narrative arc. Silence is a tool. Risers build anticipation. Impacts punctuate reveals. The sound floor tells the viewer how to feel before the image does.
4. **Pacing follows the story, not the clock.** Tension needs fast cuts. Grief needs long holds. Comedy needs beats. A 30-second spot has zero room for breathing; a documentary needs acres of it.
5. **Formats have grammar.** A cold open on a streaming show works differently than a teaser before a commercial break. A trailer front-loads impact; a documentary builds slowly. The same footage cut two ways makes two different shows.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    FFmpegEditor UI                   │
│  (Preview, Timeline Visualization, Manual Overrides) │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│            Editorial Decision Engine                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  Cut Logic    │ │ Transition   │ │  Audio Mix   │ │
│  │  Engine       │ │ Selector     │ │  Engine      │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  Pacing /    │ │  Keyframe /  │ │  Format      │ │
│  │  Rhythm Eng. │ │  Motion Eng. │ │  Profile Mgr │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Edit Decision List (EDL)                 │
│   Ordered, timestamped instructions for FFmpeg       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│            FFmpeg Command Builder                     │
│   Translates EDL → FFmpeg filter_complex chains      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              FFmpeg.wasm Runtime                      │
│   Executes commands, streams progress, outputs video │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Format Profile Manager

Each show format gets a **Format Editorial Profile** that encodes the editorial grammar of that format. This is not a transition dropdown — it's a rule system.

### Format Profiles

```
FormatEditorialProfile {
  formatType: 'broadcast' | 'streaming' | 'short_form' | 'medium_form' | 'spot'

  // Structural rules
  coldOpen: boolean                    // Start in media res before titles?
  titleCardPlacement: 'pre_cold_open' | 'post_cold_open' | 'none'
  actBreakStyle: 'hard_fade' | 'soft_dissolve' | 'smash_cut' | 'music_sting'
  endingStyle: 'fade_to_black' | 'hard_out' | 'cliffhanger_cut' | 'tag_scene'

  // Pacing envelope (normalized 0-1 over runtime)
  pacingCurve: PacingKeyframe[]        // [{time: 0, intensity: 0.3}, {time: 0.4, intensity: 0.7}, ...]
  // ↑ This maps the intended energy arc of the entire piece

  // Cut rate ranges (cuts per minute)
  cutRateRange: { min: number, max: number }  // e.g., spot: 30-60 cpm, documentary: 4-12 cpm

  // Transition budget (what % of transitions can be non-cuts)
  transitionBudget: number             // spot: 0.05 (almost all hard cuts), documentary: 0.25

  // Audio rules
  musicBehavior: 'wall_to_wall' | 'scored_sections' | 'source_only' | 'none'
  dialoguePadding: { pre: number, post: number }  // seconds of clean audio before/after lines
  silenceThreshold: number             // max seconds of dead air before it feels broken

  // Commercial break handling
  breakBumperStyle: 'sting' | 'fade' | 'logo_card' | null
  returnFromBreakStyle: 'recap_shot' | 'establishing' | 'cold_resume'
}
```

### Default Profiles

**Broadcast Drama/Comedy:**
- Cold open → title card → Act 1 → commercial bump → Act 2 → commercial bump → Act 3 → end card
- Act breaks: 1.5s fade to black + musical sting
- Cut rate: 8-20 cpm (varies with scene energy)
- Transition budget: 15% (dissolves for time passage, fades for act breaks)
- Music: scored sections, ducks -12dB under dialogue

**Streaming (no breaks):**
- Cold open or cold start → continuous flow → cliffhanger or resolution
- No act break fades — scene changes use J-cuts or establishing shot resets
- Cut rate: 10-25 cpm
- Transition budget: 10%
- Music: wall-to-wall at low bed, rises in transitions

**Short Form (TikTok/Shorts):**
- Immediate hook in first 1.5s — no slate, no establishing shot
- Cut rate: 25-60 cpm (attention retention)
- Transition budget: 3% (almost entirely hard cuts)
- Music: beat-synced cuts, bass drops on reveals
- Every shot must justify its existence — no breathing room

**Spot (Commercial):**
- Product/problem in first 2s
- Cut rate: 30-60 cpm for 10-15s spots, 20-40 for 30s
- Transition budget: 5%
- Music: wall-to-wall, synced to edit points
- Final frame holds 2s minimum (logo/CTA)

**Documentary:**
- Slow build, interview pacing, B-roll breathes
- Cut rate: 4-12 cpm
- Transition budget: 25% (dissolves between interview segments, fades between chapters)
- Music: minimal, rises in montage sequences
- Long holds on establishing shots (3-5s before cutting)
- Room tone fills gaps — never pure silence

---

## Layer 2: Cut Logic Engine

The cut engine decides **where** and **why** to cut. It reads shot metadata and makes decisions a human editor would make instinctively.

### Cut Decision Rules

**Rule 1: Cut on Dialogue Turns**
When a new character speaks, cut to them. But not immediately — use a **reaction beat** first.
```
If shot[n] has dialogue from Character A
  AND shot[n+1] has dialogue from Character B:
    → Hold on A for 0.3-0.5s after their last word (reaction beat)
    → Cut to B 0.2s before their first word (pre-lap / J-cut)
```

**Rule 2: Cut on Action, Not Between**
When camera_movement is 'track', 'dolly', or 'pan' — the shot has internal motion. Cut at the natural end of the movement, not mid-motion.
```
If shot has camera_movement != 'static':
    → Prefer cutting at duration boundary (let movement complete)
    → Never cut in first 0.8s of a moving shot (let it establish)
```

**Rule 3: Establishing Shots Get Room to Breathe**
An establishing_shot or wide_shot at the start of a scene must hold long enough to orient the viewer.
```
If shot_type == 'establishing_shot' AND is first shot in scene:
    → Minimum hold: 2.5s (documentary: 4s)
    → No preceding transition shorter than 1s
```

**Rule 4: Close-ups Earn Their Duration**
A close_up or extreme_close_up carries emotional weight. Cutting away too fast wastes it. Holding too long makes it awkward.
```
If shot_type == 'close_up' || 'extreme_close_up':
    → If has_dialogue: hold for dialogue duration + 0.5s reaction
    → If no dialogue (reaction shot): hold 1.5-3s based on pacing profile
    → If followed by another close_up: use cut (no transition)
```

**Rule 5: Match Cut Opportunities**
When consecutive shots share camera_angle or shot_type, this is a match cut opportunity. Use a hard cut with precise timing.
```
If shot[n].camera_angle == shot[n+1].camera_angle
  AND shot[n].shot_type == shot[n+1].shot_type:
    → Hard cut, zero transition
    → Trim to exact movement/beat alignment
```

**Rule 6: Scene-First Resets**
First shot of a new scene always gets an establishing moment, even if it's a medium_shot.
```
If shot is first in new scene:
    → Add 0.3s of black/room-tone before if previous scene was high-energy
    → Or: J-cut ambient sound of new location over last 0.5s of previous scene
```

---

## Layer 3: Transition Selector

Not a dropdown. A rule engine that picks transitions based on narrative context.

### Transition Decision Matrix

| Context | Transition | Duration | Rationale |
|---------|-----------|----------|-----------|
| Same scene, dialogue exchange | Hard cut | 0 frames | Continuous time, don't interrupt |
| Same scene, shift in focus | Hard cut | 0 frames | Follow the action |
| Scene change, same act | Dissolve or J-cut | 0.5-1.0s | Time passing, same energy |
| Scene change, different location | Establishing shot + dip to black | 0.3s black | Geographic reset |
| Act break (broadcast) | Fade to black + music sting | 1.5-2.0s | Chapter ending |
| Act break (streaming) | Smash cut or hard cut to new establishing | 0 frames | Momentum preserved |
| Flashback entry | Dissolve + desaturation | 1.0-1.5s | Time displacement |
| Montage sequence | Rhythmic cuts synced to music | Beat-matched | Energy building |
| Emotional climax → aftermath | Long dissolve | 2.0-3.0s | Weight and release |
| Comedy beat → punchline | Hard cut | 0 frames | Timing is everything |
| Tension building | Accelerating cut rate | Progressive | Compression creates anxiety |
| Post-reveal | Hold + slow dissolve | 2.0s+ | Let it land |
| Cold open → title card | Smash cut to black + title | 1.0s | Hook → brand |
| End of show → credits | Fade to black | 2.0-3.0s | Closure |

### J-Cut and L-Cut Logic

These are what separate professional edits from amateur ones. The audio and video don't cut at the same time.

```
J-Cut (audio leads video):
  → Next shot's audio starts 0.3-0.8s before the visual cut
  → Used for: dialogue scenes, scene transitions, building anticipation
  → FFmpeg: overlap audio tracks with crossfade, cut video at offset

L-Cut (video leads audio):
  → Current shot's audio continues 0.3-0.8s after visual cut to next shot
  → Used for: reaction shots, emotional beats, showing impact of words
  → FFmpeg: extend audio track, cut video at offset
```

**When to J-Cut vs L-Cut:**
- New character about to speak → J-cut (we hear them, then see them)
- Character's words have impact → L-cut to reaction_shot (we see the effect)
- New location establishing → J-cut ambient sound (we hear where we are before we see it)

---

## Layer 4: Audio Mix Engine

The most neglected part of automated editing, and the part that makes the biggest difference in watchability.

### Audio Layer Architecture

```
Audio Stack (top to bottom priority):
┌──────────────────────────┐
│  Dialogue (primary)       │  Target: -6 dBFS peak, -14 LUFS integrated
├──────────────────────────┤
│  Sound Effects / Impacts  │  Target: -12 dBFS peak, ducked during dialogue
├──────────────────────────┤
│  Music (score/bed)        │  Target: -18 dBFS under dialogue, -12 dBFS solo
├──────────────────────────┤
│  Room Tone / Ambience     │  Target: -30 dBFS continuous, fills all silence
└──────────────────────────┘
```

### Music Behavior Rules

**Music Ducking:**
```
When dialogue is present:
  → Duck music to musicVolume * 0.3 (roughly -10dB)
  → Begin duck 0.2s before first word
  → Release duck 0.5s after last word
  → Use smooth exponential curve, never hard volume jump
  FFmpeg: afade, volume filter with keyframed enable
```

**Musical Risers and Impacts:**
```
Before act breaks or major scene transitions:
  → If music track present, ramp volume up 3-6dB over last 2-3s of scene
  → On cut: either hard stop (sting) or resolve to new section

Before reveals (close_up following establishing/wide):
  → Brief 1s volume swell + subtle high-frequency emphasis
  → Drops back on cut to close_up

Emotional peaks (close_up with dialogue, last shot before act break):
  → Music sustain, no ducking — let music and dialogue compete briefly
  → This signals to viewer: this moment matters
```

**Silence as a Tool:**
```
After high-intensity sequence (3+ fast cuts):
  → 0.5-1.0s of reduced music + room tone only
  → Gives the ear a reset — makes next sound hit harder

Before a character's critical dialogue line:
  → 0.3s of near-silence (room tone only)
  → The quiet makes the words louder
```

**Room Tone Management:**
```
Every scene gets continuous room tone:
  → Generate or use a 2s loopable ambient bed per location
  → Crossfade room tone on scene changes (0.5s)
  → Never allow pure digital silence (0 samples) — it sounds broken
  FFmpeg: anullsrc for tone generation, amix for layering
```

### Loudness Normalization

All output must hit broadcast-safe levels:
```
Target: -14 LUFS integrated (streaming standard)
True Peak: -1 dBTP maximum
FFmpeg: loudnorm filter with dual-pass for accurate normalization
```

---

## Layer 5: Keyframe and Motion Engine

Static clips on a timeline feel dead. This layer adds life to shots — especially still-image fallbacks.

### Still Image Animation (Ken Burns)

When a shot falls back to a storyboard still image, it *must* have motion or it looks broken.

```
Rules by shot_type:
  establishing_shot → Slow zoom out (1.05x → 1.0x) over duration, slight pan
  wide_shot         → Gentle lateral pan, 10% of frame width over duration
  medium_shot       → Subtle push-in (1.0x → 1.03x)
  close_up          → Very subtle drift (barely perceptible motion)
  extreme_close_up  → Slow zoom in (1.0x → 1.05x) — draws viewer in

FFmpeg: zoompan filter with keyframed parameters
```

### Video Shot Enhancement

Even rendered video clips benefit from subtle keyframing:

```
Emphasis zoom on reaction shots:
  If shot_type == 'reaction_shot' AND no camera_movement:
    → Subtle 2% push-in over shot duration
    → Draws focus to facial expression

Stabilization:
  All clips → mild deshake pass if source is AI-generated
  FFmpeg: deshake or vidstabdetect/vidstabtransform

Vignette on emotional moments:
  If shot_type in ['close_up', 'extreme_close_up'] AND scene has emotional weight:
    → Subtle vignette darkening at edges (10-15%)
    → FFmpeg: vignette filter
```

---

## Layer 6: Pacing and Rhythm Engine

The engine that makes the whole edit *feel* right. It looks at the big picture — the arc of an episode — and adjusts cut timing globally.

### Pacing Curve System

Each format has a **pacing curve** — a normalized intensity map over the runtime. The rhythm engine uses this to modulate cut rates and hold durations.

```
Example: 22-minute Streaming Drama

Time:      0%   10%   20%   30%   40%   50%   60%   70%   80%   90%   100%
Intensity: 0.7  0.4   0.3   0.5   0.6   0.4   0.5   0.7   0.9   1.0   0.3
           ↑         ↑                        ↑              ↑         ↑
         hook    breathing              midpoint turn    climax     denouement

→ Higher intensity = faster cuts, shorter holds, more hard cuts, music up
→ Lower intensity = longer holds, dissolves allowed, music beds, breathing room
```

### Cut Rate Modulation

```
baseCutRate = formatProfile.cutRateRange midpoint
intensityMultiplier = pacingCurve.valueAt(currentTimecode)
actualCutRate = baseCutRate * intensityMultiplier

For each shot:
  adjustedDuration = shot.duration_seconds * (1 / intensityMultiplier)
  → High intensity: shots get trimmed tighter
  → Low intensity: shots get full duration or extended holds

  Clamp to: [shot.duration * 0.6, shot.duration * 1.2]
  → Never trim more than 40% or extend more than 20%
```

### Beat Matching (When Music Present)

```
If backgroundMusic is provided AND formatProfile.musicBehavior != 'none':
  → Detect BPM from music track (FFmpeg: ebur128 or aubio via analysis pass)
  → On high-intensity sections: snap cuts to nearest beat
  → On low-intensity sections: ignore beats (organic feel)
  → At act breaks: align fade with musical phrase boundary
```

---

## Layer 7: Edit Decision List (EDL)

All of the above layers produce an **Edit Decision List** — a precise, ordered set of instructions.

```typescript
interface EditDecision {
  id: string
  type: 'cut' | 'transition' | 'audio_keyframe' | 'video_keyframe' | 'filter'
  timelinePosition: number          // seconds from start
  duration: number                  // how long this decision affects

  // For cuts/transitions
  sourceShot?: string               // shot_plan_id
  sourceTrimIn?: number             // trim start within clip
  sourceTrimOut?: number            // trim end within clip
  transitionType?: 'cut' | 'dissolve' | 'fade_black' | 'fade_white' | 'wipe' | 'j_cut' | 'l_cut'
  transitionDuration?: number

  // For audio
  audioTrack?: 'dialogue' | 'music' | 'sfx' | 'room_tone'
  volumeKeyframes?: { time: number, volume: number, curve: 'linear' | 'exponential' }[]

  // For video keyframes
  keyframes?: { time: number, scale: number, x: number, y: number }[]

  // For filters
  filterType?: 'vignette' | 'deshake' | 'loudnorm' | 'colorgrade'
  filterParams?: Record<string, number | string>

  // Metadata
  rationale: string                 // Human-readable: "J-cut into dialogue scene"
  overrideable: boolean             // Can the user change this in the UI?
}
```

The EDL is the contract between the intelligence layer and FFmpeg. Users can inspect it, override individual decisions, and re-render.

---

## Layer 8: FFmpeg Command Builder

Translates the EDL into actual FFmpeg filter_complex chains.

### Key FFmpeg Capabilities Used

| Capability | FFmpeg Filter/Feature | Purpose |
|------------|----------------------|---------|
| Trim/cut | `-ss`, `-to`, `trim` | Cut points |
| Crossfade transitions | `xfade` | Dissolves, fades, wipes |
| Audio crossfade | `acrossfade` | J-cuts, L-cuts, audio transitions |
| Volume keyframing | `volume=enable='between(t,X,Y)'` | Ducking, risers, impacts |
| Ken Burns / zoom-pan | `zoompan` | Still image animation |
| Text overlay | `drawtext` | Slates, titles, lower thirds |
| Loudness normalization | `loudnorm` (dual-pass) | Broadcast-safe output |
| Vignette | `vignette` | Emotional emphasis |
| Stabilization | `deshake` | AI video cleanup |
| Concatenation | `concat` demuxer | Multi-clip assembly |
| Audio mixing | `amix`, `amerge` | Multi-track audio |
| Room tone | `anullsrc` + `amix` | Silence fill |
| Color adjustment | `eq`, `colorbalance` | Scene mood |

### Command Generation Strategy

For browser-side FFmpeg.wasm, we can't shell out — we build commands programmatically:

```
1. Sort EDL by timeline position
2. Group overlapping decisions into segments
3. Build filter_complex graph:
   - Input files: all source clips + audio tracks
   - Processing chain per segment
   - Output merge
4. Execute as single FFmpeg command (avoids multiple encode passes)
```

For complex edits (>20 clips, multi-track audio), the command builder can split into stages:
- Stage 1: Per-clip trim + keyframe + stabilization
- Stage 2: Assemble clips with transitions
- Stage 3: Audio mix + loudness normalization
- Stage 4: Final output encoding

---

## Implementation Steps

### Step 1: Dependencies and Configuration
- Install `@ffmpeg/ffmpeg`, `@ffmpeg/util`
- Configure Vite COOP/COEP headers for SharedArrayBuffer
- Configure Netlify headers for production

**Files:** `package.json`, `vite.config.js`, `netlify.toml`

### Step 2: Types and Interfaces
- `FormatEditorialProfile` — per-format editing rules
- `EditDecision` / `EditDecisionList` — the EDL
- `CutRule`, `TransitionRule`, `AudioMixRule` — rule engine types
- `PacingCurve`, `PacingKeyframe` — intensity mapping
- `FFmpegCommand`, `FilterNode` — command builder types

**File:** `src/types/editorialEngine.ts`

### Step 3: Format Profile Manager
- Default profiles for all 5 format types (broadcast, streaming, short_form, medium_form, spot)
- Profile selection based on episode/series format config
- Override support (users can tune profiles per show)

**File:** `src/services/editorial/formatProfileManager.ts`

### Step 4: Cut Logic Engine
- Implements the 6 cut decision rules
- Reads shot metadata (shot_type, camera_angle, camera_movement, has_dialogue, dialogue_content)
- Outputs cut points with rationale

**File:** `src/services/editorial/cutLogicEngine.ts`

### Step 5: Transition Selector
- Implements the transition decision matrix
- J-cut and L-cut logic
- Scene/act boundary detection from shot ordering + script structure

**File:** `src/services/editorial/transitionSelector.ts`

### Step 6: Audio Mix Engine
- Dialogue ducking with smooth curves
- Music riser/impact placement at act breaks and reveals
- Room tone generation and gap filling
- Silence-as-tool for emotional beats
- Loudness normalization targeting

**File:** `src/services/editorial/audioMixEngine.ts`

### Step 7: Keyframe and Motion Engine
- Ken Burns for still-image fallbacks (per shot_type rules)
- Emphasis zoom on reaction shots
- Vignette on emotional close-ups
- Stabilization pass for AI-generated clips

**File:** `src/services/editorial/keyframeEngine.ts`

### Step 8: Pacing and Rhythm Engine
- Pacing curve generation from format profile + act/scene structure
- Cut rate modulation based on intensity
- Beat detection and beat-synced cutting when music is present
- Shot duration adjustment (trim tighter in high-intensity, breathe in low-intensity)

**File:** `src/services/editorial/pacingEngine.ts`

### Step 9: Editorial Decision Engine (Orchestrator)
- Takes: episode shots, script structure, format profile, audio assets
- Runs all sub-engines in sequence
- Produces the complete EDL
- Validates: no dead air, no jump cuts, transitions budget respected, loudness targets met

**File:** `src/services/editorial/editorialDecisionEngine.ts`

### Step 10: FFmpeg Command Builder
- Translates EDL → FFmpeg filter_complex commands
- Multi-stage rendering for complex edits
- Progress estimation per stage

**File:** `src/services/editorial/ffmpegCommandBuilder.ts`

### Step 11: FFmpeg Runtime Service
- FFmpeg.wasm singleton lifecycle (lazy load, init, cleanup)
- Command execution with progress streaming
- Memory management for large files
- Output Blob generation

**File:** `src/services/ffmpegService.ts`

### Step 12: FFmpeg Editor UI Component
- Timeline visualization showing EDL decisions
- Per-decision override controls (change transition type, adjust timing, tweak audio)
- Before/after preview with A/B comparison
- Format profile selector with visual explanation
- Progress bar with stage indicators
- EDL inspector (collapsible, shows rationale for each decision)
- Download / Save to Supabase

**File:** `src/components/FFmpegEditor.tsx`

### Step 13: Integration into VideoAssemblyPanel
- "Smart Edit with FFmpeg" button on completed assemblies
- Shows format profile auto-detected from episode config
- Links to FFmpegEditor with pre-loaded EDL

**File:** `src/components/VideoAssemblyPanel.tsx` (modify)

### Step 14: Integration into VideoGenerationTab
- "Edit Shot" action on individual rendered clips (trim, keyframe, stabilize)
- Subset of the full editor for single-clip operations

**File:** `src/components/VideoGenerationTab.tsx` (modify)

### Step 15: Supabase Schema for EDL Persistence
- Store EDLs per assembly for re-rendering and iteration
- Track editorial overrides (user changes vs engine defaults)
- Version EDLs like assemblies

**Migration:** `supabase/migrations/` — add `edit_decision_lists` table

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | @ffmpeg/ffmpeg, @ffmpeg/util |
| `vite.config.js` | Modify | COOP/COEP headers |
| `netlify.toml` | Modify | Production COOP/COEP headers |
| `src/types/editorialEngine.ts` | Create | All editorial engine types |
| `src/services/editorial/formatProfileManager.ts` | Create | Format-aware editing profiles |
| `src/services/editorial/cutLogicEngine.ts` | Create | Intelligent cut placement |
| `src/services/editorial/transitionSelector.ts` | Create | Context-aware transition picking |
| `src/services/editorial/audioMixEngine.ts` | Create | Ducking, risers, room tone, loudness |
| `src/services/editorial/keyframeEngine.ts` | Create | Ken Burns, emphasis zoom, vignette |
| `src/services/editorial/pacingEngine.ts` | Create | Pacing curves, cut rate modulation |
| `src/services/editorial/editorialDecisionEngine.ts` | Create | Orchestrates all engines → EDL |
| `src/services/editorial/ffmpegCommandBuilder.ts` | Create | EDL → FFmpeg filter_complex |
| `src/services/ffmpegService.ts` | Create | FFmpeg.wasm runtime |
| `src/components/FFmpegEditor.tsx` | Create | Editor UI with timeline + overrides |
| `src/components/VideoAssemblyPanel.tsx` | Modify | "Smart Edit" button |
| `src/components/VideoGenerationTab.tsx` | Modify | Per-shot editing |
| `supabase/migrations/` | Create | EDL persistence table |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WASM binary size (~30MB) | Lazy-load only when editor opens |
| SharedArrayBuffer headers break third-party embeds | Conditional headers, fallback to single-threaded mode |
| Browser memory on long episodes (>10min) | Stage-based rendering; process in segments, concat at end |
| Beat detection accuracy in browser | Pre-analyze music server-side via Supabase Edge Function if needed |
| Pacing engine produces uncanny results | Every EDL decision is overrideable in UI; engine provides rationale |
| Format profile doesn't match creative intent | Profiles are starting points; user can select and customize |
| AI-generated clips have inconsistent timing | Stabilization pass + generous trim margins on cut points |

## Success Criteria

A video assembled by this system should pass the **"Would I Keep Watching?"** test:
- [ ] No dead air or digital silence — room tone fills every gap
- [ ] Dialogue is always intelligible — music ducks, levels are normalized
- [ ] Cuts feel motivated — every cut has a reason visible in the EDL
- [ ] Transitions match narrative context — no dissolves in fast sequences, no hard cuts at act endings
- [ ] Pacing breathes — high energy sections feel urgent, quiet moments feel intentional
- [ ] Still-image fallbacks don't look frozen — Ken Burns motion on every still
- [ ] The first 3 seconds grab attention — format-appropriate hook
- [ ] The ending feels like an ending — not an abrupt stop
- [ ] Audio has depth — not a flat mono mix but layered dialogue/music/ambience
- [ ] The edit is invisible — the viewer thinks about the story, not the editing
