# Plan: Add FFmpeg as a Video Editing Option

## Context

Currently, Bee Studio uses **Shotstack** (a cloud API at ~$0.05/min) as its sole video assembly/editing engine. This plan adds **FFmpeg.wasm** (client-side, in-browser FFmpeg) as an alternative editing option — giving users a free, local, zero-latency way to perform common video edits on generated videos.

## Architecture Decision

Use **@ffmpeg/ffmpeg** (FFmpeg compiled to WebAssembly) to run entirely in the browser. This avoids needing a backend FFmpeg server and fits the existing Vite + React frontend architecture.

**Why browser-side FFmpeg?**
- No server costs for editing operations
- Instant feedback loop — no upload/download round-trips
- Works offline once loaded
- Complements Shotstack (which remains the option for full production assembly)

## Scope of FFmpeg Editing Capabilities

Phase 1 (this implementation):
1. **Trim/Cut** — trim start/end of individual shots or assembled videos
2. **Concatenate** — join multiple clips in order (lightweight local assembly)
3. **Add Text Overlay** — burn-in titles, subtitles, watermarks
4. **Adjust Speed** — slow-mo or speed-up clips
5. **Extract Audio** — pull audio track from a video
6. **Convert Format** — re-encode to mp4/webm/gif

## Implementation Steps

### Step 1: Install FFmpeg.wasm dependency
- `npm install @ffmpeg/ffmpeg @ffmpeg/util`
- Update `vite.config.js` to set required headers for SharedArrayBuffer (Cross-Origin-Isolation)

**Files changed:**
- `package.json`
- `vite.config.js`

### Step 2: Create FFmpeg service (`src/services/ffmpegService.ts`)
Core service that manages the FFmpeg.wasm instance lifecycle and exposes editing operations.

```ts
// Key exports:
initFFmpeg()          // Load & initialize the WASM binary (singleton)
trimVideo(input, startSec, endSec) → Blob
concatenateVideos(inputs[]) → Blob
addTextOverlay(input, text, position, style) → Blob
adjustSpeed(input, factor) → Blob
extractAudio(input) → Blob
convertFormat(input, targetFormat) → Blob
```

**Files created:**
- `src/services/ffmpegService.ts`

### Step 3: Create FFmpeg Editor component (`src/components/FFmpegEditor.tsx`)
A modal/panel UI that lets users pick an editing operation and configure parameters. Includes a before/after video preview.

**UI Layout:**
- Operation selector (trim, concat, text overlay, speed, extract audio, convert)
- Per-operation parameter controls (time range slider, text input, speed dial, format picker)
- Source video preview (left) + output preview (right)
- Progress bar during processing
- Download / Save button for the result

**Files created:**
- `src/components/FFmpegEditor.tsx`

### Step 4: Create FFmpeg types (`src/types/ffmpeg.ts`)
TypeScript interfaces for editor state, operation configs, and results.

**Files created:**
- `src/types/ffmpeg.ts`

### Step 5: Integrate into VideoAssemblyPanel
Add an "Edit with FFmpeg" button next to each completed assembly's download button. Clicking it opens the FFmpegEditor modal with that video pre-loaded.

**Files changed:**
- `src/components/VideoAssemblyPanel.tsx`

### Step 6: Integrate into VideoGenerationTab
Add an "Edit" action on individual rendered shots so users can trim/adjust individual clips before assembly.

**Files changed:**
- `src/components/VideoGenerationTab.tsx`

### Step 7: Add Supabase storage for edited videos (optional persistence)
Save FFmpeg-edited videos back to Supabase storage so they can be used in subsequent assemblies or shared.

**Files changed:**
- `src/services/ffmpegService.ts` (add `saveEditedVideo()`)

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add @ffmpeg/ffmpeg, @ffmpeg/util |
| `vite.config.js` | Modify | Add COOP/COEP headers for SharedArrayBuffer |
| `src/types/ffmpeg.ts` | Create | TypeScript types for FFmpeg operations |
| `src/services/ffmpegService.ts` | Create | Core FFmpeg.wasm service (init, trim, concat, overlay, speed, extract, convert) |
| `src/components/FFmpegEditor.tsx` | Create | Editor UI component with operation selector, params, preview, progress |
| `src/components/VideoAssemblyPanel.tsx` | Modify | Add "Edit with FFmpeg" button on completed assemblies |
| `src/components/VideoGenerationTab.tsx` | Modify | Add "Edit" action on individual rendered shots |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large WASM binary (~30MB) | Lazy-load FFmpeg only when user opens the editor |
| SharedArrayBuffer requires COOP/COEP headers | Configure in Vite dev server + Netlify headers |
| Browser memory limits on large videos | Show file size warning; recommend Shotstack for videos >200MB |
| Processing speed slower than server-side | Show progress bar; note that this is a local/free option vs Shotstack |
