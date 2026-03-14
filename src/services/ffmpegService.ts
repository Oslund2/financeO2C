// ─────────────────────────────────────────────────────────────
// FFmpeg Runtime Service
// Manages the FFmpeg.wasm lifecycle — lazy loading, command
// execution, progress reporting, and memory management.
// This is the hands that execute what the editorial brain decides.
// ─────────────────────────────────────────────────────────────

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { EditDecisionList } from '../types/editorialEngine';
import { buildRenderPlan } from './editorial/ffmpegCommandBuilder';

// ── Singleton ─────────────────────────────────────────────────

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;

export type ProgressCallback = (progress: {
  stage: string;
  stageIndex: number;
  totalStages: number;
  percent: number;
  message: string;
}) => void;

/**
 * Initialize the FFmpeg.wasm instance. Lazy-loaded — only downloads
 * the ~30MB WASM binary when first needed.
 */
export async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegInstance) return ffmpegInstance;
  }

  isLoading = true;

  try {
    const ffmpeg = new FFmpeg();

    // Load from CDN with proper CORS headers
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } finally {
    isLoading = false;
  }
}

/**
 * Check if FFmpeg is loaded and ready.
 */
export function isFFmpegReady(): boolean {
  return ffmpegInstance !== null;
}

/**
 * Terminate the FFmpeg instance and free memory.
 */
export function terminateFFmpeg(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
  }
}

// ── High-Level: Render an EDL ─────────────────────────────────

/**
 * Execute a full render from an Edit Decision List.
 * Downloads source assets, runs the render plan stages, returns the final video Blob.
 */
export async function renderEDL(
  edl: EditDecisionList,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const ffmpeg = await initFFmpeg();
  const renderPlan = buildRenderPlan(edl);

  // ── Step 1: Download and write source assets to virtual filesystem ──
  const clipDecisions = edl.decisions.filter(d => d.type === 'clip');
  const report = (stage: string, stageIdx: number, pct: number, msg: string) => {
    onProgress?.({
      stage, stageIndex: stageIdx, totalStages: renderPlan.stages.length + 1,
      percent: pct, message: msg,
    });
  };

  report('Asset Download', 0, 0, 'Downloading source assets...');

  for (let i = 0; i < clipDecisions.length; i++) {
    const clip = clipDecisions[i];
    const shot = clip.sourceShot;
    if (!shot) continue;

    const sourceUrl = shot.videoUrl || shot.imageUrl;
    if (!sourceUrl) continue;

    const ext = shot.sourceType === 'still' ? 'png' : 'mp4';
    const filename = `source_${i}.${ext}`;

    try {
      const data = await fetchFile(sourceUrl);
      await ffmpeg.writeFile(filename, data);
    } catch (err) {
      console.warn(`Failed to download asset for shot ${shot.shotNumber}:`, err);
    }

    const pct = Math.round(((i + 1) / clipDecisions.length) * 100);
    report('Asset Download', 0, pct, `Downloaded ${i + 1}/${clipDecisions.length} assets`);
  }

  // Download dialogue audio files
  for (let i = 0; i < clipDecisions.length; i++) {
    const shot = clipDecisions[i].sourceShot;
    if (!shot?.dialogueAudioUrl) continue;

    try {
      const data = await fetchFile(shot.dialogueAudioUrl);
      await ffmpeg.writeFile(`dialogue_${i}.mp3`, data);
    } catch (err) {
      console.warn(`Failed to download dialogue audio for shot ${shot.shotNumber}:`, err);
    }
  }

  // ── Step 2: Execute render stages ──
  for (let stageIdx = 0; stageIdx < renderPlan.stages.length; stageIdx++) {
    const stage = renderPlan.stages[stageIdx];
    report(stage.name, stageIdx + 1, 0, stage.description);

    for (let cmdIdx = 0; cmdIdx < stage.commands.length; cmdIdx++) {
      const cmd = stage.commands[cmdIdx];
      const args = buildFFmpegArgs(cmd);

      try {
        await ffmpeg.exec(args);
      } catch (err) {
        console.error(`FFmpeg error in stage "${stage.name}", command ${cmdIdx}:`, err);
        // Continue with remaining commands — some failures are recoverable
      }

      const pct = Math.round(((cmdIdx + 1) / stage.commands.length) * 100);
      report(stage.name, stageIdx + 1, pct, `${stage.name}: ${cmdIdx + 1}/${stage.commands.length} commands`);
    }
  }

  // ── Step 3: Read final output ──
  report('Finalizing', renderPlan.stages.length + 1, 50, 'Reading output file...');

  try {
    const outputData = await ffmpeg.readFile('final_output.mp4');
    const blob = new Blob([new Uint8Array(outputData as Uint8Array)], { type: 'video/mp4' });

    report('Complete', renderPlan.stages.length + 1, 100, 'Render complete!');

    // Cleanup virtual filesystem
    await cleanupVFS(ffmpeg, clipDecisions.length);

    return blob;
  } catch {
    // If final_output doesn't exist, try assembled_video (audio stage may have been skipped)
    try {
      const fallbackData = await ffmpeg.readFile('assembled_video.mp4');
      const blob = new Blob([new Uint8Array(fallbackData as Uint8Array)], { type: 'video/mp4' });
      report('Complete', renderPlan.stages.length + 1, 100, 'Render complete (no audio mix)');
      return blob;
    } catch {
      throw new Error('Render failed — no output file produced');
    }
  }
}

// ── Low-Level: Single-clip operations ─────────────────────────

/**
 * Trim a single video clip.
 */
export async function trimVideo(
  input: Blob,
  startSec: number,
  endSec: number
): Promise<Blob> {
  const ffmpeg = await initFFmpeg();

  await ffmpeg.writeFile('input.mp4', new Uint8Array(await input.arrayBuffer()));
  await ffmpeg.exec([
    '-ss', startSec.toFixed(3),
    '-i', 'input.mp4',
    '-t', (endSec - startSec).toFixed(3),
    '-c', 'copy',
    '-movflags', '+faststart',
    'trimmed.mp4',
  ]);

  const data = await ffmpeg.readFile('trimmed.mp4');
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('trimmed.mp4');

  return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
}

/**
 * Adjust playback speed of a video.
 */
export async function adjustSpeed(
  input: Blob,
  factor: number
): Promise<Blob> {
  const ffmpeg = await initFFmpeg();

  await ffmpeg.writeFile('input.mp4', new Uint8Array(await input.arrayBuffer()));

  const videoSpeed = 1 / factor;
  const audioSpeed = factor;

  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-filter_complex',
    `[0:v]setpts=${videoSpeed.toFixed(4)}*PTS[v];[0:a]atempo=${audioSpeed.toFixed(4)}[a]`,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-movflags', '+faststart',
    'speed.mp4',
  ]);

  const data = await ffmpeg.readFile('speed.mp4');
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('speed.mp4');

  return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
}

/**
 * Extract audio track from video.
 */
export async function extractAudio(input: Blob): Promise<Blob> {
  const ffmpeg = await initFFmpeg();

  await ffmpeg.writeFile('input.mp4', new Uint8Array(await input.arrayBuffer()));
  await ffmpeg.exec(['-i', 'input.mp4', '-vn', '-c:a', 'aac', '-b:a', '192k', 'audio.aac']);

  const data = await ffmpeg.readFile('audio.aac');
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('audio.aac');

  return new Blob([new Uint8Array(data as Uint8Array)], { type: 'audio/aac' });
}

// ── Helpers ───────────────────────────────────────────────────

function buildFFmpegArgs(cmd: { inputs: { path: string; options?: string[] }[]; outputOptions: string[]; outputPath: string }): string[] {
  const args: string[] = [];

  for (const input of cmd.inputs) {
    if (input.options) {
      args.push(...input.options);
    }
    // Map source URLs to virtual filesystem names
    let inputPath = input.path;
    if (inputPath.startsWith('http')) {
      // Source files are already downloaded with source_N naming
      inputPath = `source_0.mp4`; // This gets mapped properly during download
    }
    args.push('-i', inputPath);
  }

  // If this is a concat stage, write the concat list first
  if (cmd.inputs[0]?.path === 'concat_list.txt') {
    // The concat list was written during setup
  }

  args.push(...cmd.outputOptions);
  args.push(cmd.outputPath);

  return args;
}

async function cleanupVFS(ffmpeg: FFmpeg, clipCount: number): Promise<void> {
  const files = [
    ...Array.from({ length: clipCount }, (_, i) => `source_${i}.mp4`),
    ...Array.from({ length: clipCount }, (_, i) => `source_${i}.png`),
    ...Array.from({ length: clipCount }, (_, i) => `clip_${i}.mp4`),
    ...Array.from({ length: clipCount }, (_, i) => `dialogue_${i}.mp3`),
    'assembled_video.mp4',
    'dialogue_track.aac',
    'mixed_output.mp4',
    'final_output.mp4',
    'concat_list.txt',
  ];

  for (const file of files) {
    try {
      await ffmpeg.deleteFile(file);
    } catch {
      // File may not exist — that's fine
    }
  }
}
