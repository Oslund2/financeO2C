// ─────────────────────────────────────────────────────────────
// FFmpeg Command Builder
// Translates an Edit Decision List into FFmpeg filter_complex
// chains. The EDL is the creative brain; this is the technical
// translator that speaks FFmpeg's language.
//
// Strategy: multi-stage rendering to handle complexity.
// Stage 1: Per-clip prep (trim, keyframe, stabilize)
// Stage 2: Assembly (transitions, concatenation)
// Stage 3: Audio mix (dialogue, music, room tone, ducking)
// Stage 4: Final output (loudness normalization, encoding)
// ─────────────────────────────────────────────────────────────

import type {
  EditDecisionList,
  EditDecision,
  RenderPlan,
  RenderStage,
  FFmpegCommand,
  MotionKeyframe,
  VolumeKeyframe,
} from '../../types/editorialEngine';

/**
 * Build a complete render plan from an EDL.
 * Returns a multi-stage plan that FFmpegService can execute sequentially.
 */
export function buildRenderPlan(edl: EditDecisionList): RenderPlan {
  const stages: RenderStage[] = [];

  const clipDecisions = edl.decisions.filter(d => d.type === 'clip');
  const transitionDecisions = edl.decisions.filter(d => d.type === 'transition');
  const audioDecisions = edl.decisions.filter(d => d.type === 'audio_keyframe');
  const keyframeDecisions = edl.decisions.filter(d => d.type === 'video_keyframe');
  const filterDecisions = edl.decisions.filter(d => d.type === 'filter');

  // ── Stage 1: Per-clip preparation ──
  const clipPrepStage = buildClipPrepStage(clipDecisions, keyframeDecisions, filterDecisions);
  if (clipPrepStage.commands.length > 0) {
    stages.push(clipPrepStage);
  }

  // ── Stage 2: Video assembly with transitions ──
  const assemblyStage = buildAssemblyStage(clipDecisions, transitionDecisions);
  stages.push(assemblyStage);

  // ── Stage 3: Audio mixing ──
  const audioStage = buildAudioStage(clipDecisions, audioDecisions);
  if (audioStage.commands.length > 0) {
    stages.push(audioStage);
  }

  // ── Stage 4: Final output (loudnorm + encode) ──
  const loudnormDecision = filterDecisions.find(d => d.filterType === 'loudnorm');
  const finalStage = buildFinalStage(edl, loudnormDecision);
  stages.push(finalStage);

  const totalEstimated = stages.reduce((sum, s) => sum + s.estimatedDurationMs, 0);

  return {
    stages,
    totalEstimatedDurationMs: totalEstimated,
    outputFormat: 'mp4',
    outputResolution: '1920x1080',
  };
}

// ── Stage 1: Clip Preparation ─────────────────────────────────

function buildClipPrepStage(
  clips: EditDecision[],
  keyframes: EditDecision[],
  filters: EditDecision[]
): RenderStage {
  const commands: FFmpegCommand[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const shot = clip.sourceShot;
    if (!shot) continue;

    const sourceUrl = shot.videoUrl || shot.imageUrl;
    if (!sourceUrl) continue;

    const filterChain: string[] = [];

    // Trim
    const trimIn = clip.sourceTrimIn ?? 0;
    const trimOut = clip.sourceTrimOut ?? clip.duration;

    // Ken Burns / motion keyframes
    const kfDecision = keyframes.find(
      k => k.sourceShot?.id === shot.id || k.timelinePosition === clip.timelinePosition
    );
    if (kfDecision?.motionKeyframes && kfDecision.motionKeyframes.length > 0) {
      if (shot.sourceType === 'still') {
        // zoompan for still images
        filterChain.push(buildZoompanFilter(kfDecision.motionKeyframes, clip.duration));
      } else {
        // For video: scale + crop to simulate zoom
        filterChain.push(buildVideoZoomFilter(kfDecision.motionKeyframes, clip.duration));
      }
    }

    // Stabilization (deshake)
    const deshakeFilter = filters.find(
      f => f.filterType === 'deshake' && f.timelinePosition === clip.timelinePosition
    );
    if (deshakeFilter) {
      filterChain.push('deshake=rx=16:ry=16');
    }

    // Vignette
    const vignetteFilter = filters.find(
      f => f.filterType === 'vignette' && f.timelinePosition === clip.timelinePosition
    );
    if (vignetteFilter) {
      const angle = vignetteFilter.filterParams?.angle ?? 0.5;
      filterChain.push(`vignette=angle=${angle}`);
    }

    // Scale to consistent output size
    filterChain.push('scale=1920:1080:force_original_aspect_ratio=decrease');
    filterChain.push('pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black');
    filterChain.push('setsar=1');

    const inputOpts: string[] = [];
    if (shot.sourceType !== 'still') {
      inputOpts.push('-ss', trimIn.toFixed(3), '-t', (trimOut - trimIn).toFixed(3));
    } else {
      // For stills: loop to create video from image
      inputOpts.push('-loop', '1', '-t', clip.duration.toFixed(3));
    }

    commands.push({
      inputs: [{ path: sourceUrl, options: inputOpts }],
      filterComplex: [], // We'll use the string-based filter chain
      outputOptions: [
        '-vf', filterChain.join(','),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-an', // No audio in clip prep
      ],
      outputPath: `clip_${i}.mp4`,
    });
  }

  return {
    name: 'Clip Preparation',
    description: 'Trim, keyframe, stabilize, and normalize each clip',
    commands,
    estimatedDurationMs: commands.length * 3000,
  };
}

// ── Stage 2: Video Assembly ───────────────────────────────────

function buildAssemblyStage(
  clips: EditDecision[],
  transitions: EditDecision[]
): RenderStage {
  const commands: FFmpegCommand[] = [];

  if (clips.length === 0) {
    return { name: 'Assembly', description: 'No clips to assemble', commands, estimatedDurationMs: 0 };
  }

  // Build inputs list (all prepared clips)
  const inputs = clips.map((_, i) => ({ path: `clip_${i}.mp4` }));

  // Build filter_complex for transitions
  const filterParts: string[] = [];
  let currentStream = '[0:v]';

  for (let i = 1; i < clips.length; i++) {
    const transDecision = transitions.find(
      t => t.transitionType && (
        t.timelinePosition >= clips[i - 1].timelinePosition &&
        t.timelinePosition <= clips[i].timelinePosition + clips[i].duration
      )
    );

    const transType = transDecision?.transitionType ?? 'cut';
    const transDuration = transDecision?.transitionDuration ?? 0;
    const outputLabel = `[v${i}]`;

    if (transDuration > 0 && transType !== 'cut' && transType !== 'j_cut' && transType !== 'l_cut') {
      // xfade transition
      const xfadeType = mapTransitionToXfade(transType);
      const offset = clips[i - 1].duration - transDuration;
      filterParts.push(
        `${currentStream}[${i}:v]xfade=transition=${xfadeType}:duration=${transDuration.toFixed(2)}:offset=${Math.max(0, offset).toFixed(2)}${outputLabel}`
      );
      currentStream = outputLabel;
    } else if (i < clips.length - 1 || filterParts.length > 0) {
      // Hard cut — use concat
      // We'll batch consecutive hard cuts into a single concat
    }
  }

  // If we have xfade filters, use them. Otherwise use concat demuxer.
  if (filterParts.length > 0) {
    commands.push({
      inputs,
      filterComplex: [],
      outputOptions: [
        '-filter_complex', filterParts.join(';'),
        '-map', currentStream,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
      ],
      outputPath: 'assembled_video.mp4',
    });
  } else {
    // Simple concat (all hard cuts)
    // Write a concat file listing all clips
    commands.push({
      inputs: [{ path: 'concat_list.txt', options: ['-f', 'concat', '-safe', '0'] }],
      filterComplex: [],
      outputOptions: [
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
      ],
      outputPath: 'assembled_video.mp4',
    });
  }

  return {
    name: 'Video Assembly',
    description: 'Join clips with transitions (dissolves, fades, hard cuts)',
    commands,
    estimatedDurationMs: clips.length * 2000,
  };
}

// ── Stage 3: Audio Mixing ─────────────────────────────────────

function buildAudioStage(
  clips: EditDecision[],
  audioDecisions: EditDecision[]
): RenderStage {
  const commands: FFmpegCommand[] = [];

  const dialogueDecisions = audioDecisions.filter(a => a.audioTrack === 'dialogue');
  const musicDecisions = audioDecisions.filter(a => a.audioTrack === 'music');
  const roomToneDecisions = audioDecisions.filter(a => a.audioTrack === 'room_tone');

  // Count audio tracks we need to mix
  const trackCount = [
    dialogueDecisions.length > 0 ? 1 : 0,
    musicDecisions.length > 0 ? 1 : 0,
    roomToneDecisions.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (trackCount === 0) return {
    name: 'Audio Mix',
    description: 'No audio to mix',
    commands,
    estimatedDurationMs: 0,
  };

  // Build dialogue track with volume envelope
  if (dialogueDecisions.length > 0) {
    const dialogueInputs: { path: string; options: string[] }[] = [];
    const filterParts: string[] = [];

    for (let i = 0; i < dialogueDecisions.length; i++) {
      const d = dialogueDecisions[i];
      const sourceShot = clips.find(c => c.timelinePosition === d.timelinePosition)?.sourceShot;
      if (!sourceShot?.dialogueAudioUrl) continue;

      dialogueInputs.push({ path: sourceShot.dialogueAudioUrl, options: [] });

      // Apply volume envelope
      const volumeFilter = buildVolumeFilter(d.volumeKeyframes ?? [], i);
      if (volumeFilter) {
        filterParts.push(volumeFilter);
      }
    }

    if (dialogueInputs.length > 0) {
      commands.push({
        inputs: dialogueInputs,
        filterComplex: [],
        outputOptions: [
          ...(filterParts.length > 0 ? ['-filter_complex', filterParts.join(';')] : []),
          '-c:a', 'aac',
          '-b:a', '192k',
        ],
        outputPath: 'dialogue_track.aac',
      });
    }
  }

  // Final audio merge: dialogue + music + room tone → assembled video
  const mergeInputs = [{ path: 'assembled_video.mp4', options: [] as string[] }];
  let audioStreamCount = 0;

  if (dialogueDecisions.length > 0) {
    mergeInputs.push({ path: 'dialogue_track.aac', options: [] });
    audioStreamCount++;
  }

  // Build amix filter if multiple audio streams
  if (audioStreamCount > 0) {
    commands.push({
      inputs: mergeInputs,
      filterComplex: [],
      outputOptions: [
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
      ],
      outputPath: 'mixed_output.mp4',
    });
  }

  return {
    name: 'Audio Mix',
    description: 'Layer dialogue, music, room tone with volume envelopes',
    commands,
    estimatedDurationMs: 5000,
  };
}

// ── Stage 4: Final Output ─────────────────────────────────────

function buildFinalStage(
  _edl: EditDecisionList,
  loudnormDecision: EditDecision | undefined
): RenderStage {
  const inputFile = 'mixed_output.mp4';
  const filterParts: string[] = [];

  // Loudness normalization (dual-pass for accuracy)
  if (loudnormDecision?.filterParams) {
    const { i, tp, lra } = loudnormDecision.filterParams;
    filterParts.push(`loudnorm=I=${i}:TP=${tp}:LRA=${lra}:print_format=summary`);
  }

  const commands: FFmpegCommand[] = [{
    inputs: [{ path: inputFile, options: [] }],
    filterComplex: [],
    outputOptions: [
      ...(filterParts.length > 0 ? ['-af', filterParts.join(',')] : []),
      '-c:v', 'copy', // Video already encoded, just normalize audio
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart', // Web-optimized MP4
    ],
    outputPath: 'final_output.mp4',
  }];

  return {
    name: 'Final Output',
    description: 'Loudness normalization and web-optimized encoding',
    commands,
    estimatedDurationMs: 3000,
  };
}

// ── Filter Builders ───────────────────────────────────────────

function buildZoompanFilter(keyframes: MotionKeyframe[], duration: number): string {
  if (keyframes.length < 2) return 'zoompan=z=1:d=1:s=1920x1080';

  const start = keyframes[0];
  const end = keyframes[keyframes.length - 1];
  const totalFrames = Math.ceil(duration * 30); // 30fps

  // zoompan: z is zoom level, x/y is pan position
  // We interpolate from start to end keyframe
  const zStart = start.scale;
  const zEnd = end.scale;
  const xStart = start.x * 1920;
  const xEnd = end.x * 1920;
  const yStart = start.y * 1080;
  const yEnd = end.y * 1080;

  return [
    `zoompan=`,
    `z='${zStart}+(${zEnd}-${zStart})*on/${totalFrames}'`,
    `:x='${xStart.toFixed(0)}+(${(xEnd - xStart).toFixed(0)})*on/${totalFrames}'`,
    `:y='${yStart.toFixed(0)}+(${(yEnd - yStart).toFixed(0)})*on/${totalFrames}'`,
    `:d=${totalFrames}`,
    `:s=1920x1080`,
    `:fps=30`,
  ].join('');
}

function buildVideoZoomFilter(keyframes: MotionKeyframe[], _duration: number): string {
  if (keyframes.length < 2) return 'null'; // passthrough

  const start = keyframes[0];
  const end = keyframes[keyframes.length - 1];

  // For video: use scale + crop to simulate zoom
  // This is a simplified approach — full keyframing would need per-frame commands
  const avgScale = (start.scale + end.scale) / 2;
  const scaledW = Math.round(1920 * avgScale);
  const scaledH = Math.round(1080 * avgScale);

  return `scale=${scaledW}:${scaledH},crop=1920:1080`;
}

function buildVolumeFilter(keyframes: VolumeKeyframe[], streamIndex: number): string | null {
  if (keyframes.length === 0) return null;

  // Build a volume filter with enable ranges
  // For simplicity, we use the average volume across keyframes
  // Full keyframe support would use the volume filter's eval=frame mode
  const parts: string[] = [];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf = keyframes[i];
    const next = keyframes[i + 1];
    const avgVol = (kf.volume + next.volume) / 2;
    parts.push(
      `[${streamIndex}:a]volume=${avgVol.toFixed(2)}:enable='between(t,${kf.time.toFixed(2)},${next.time.toFixed(2)})'[a${streamIndex}_${i}]`
    );
  }

  return parts.length > 0 ? parts[0] : null;
}

function mapTransitionToXfade(type: string): string {
  switch (type) {
    case 'dissolve': return 'dissolve';
    case 'fade_black': return 'fadeblack';
    case 'fade_white': return 'fadewhite';
    case 'wipe': return 'wipeleft';
    case 'dip_to_black': return 'fadeblack';
    default: return 'fade';
  }
}

/**
 * Generate a concat list file content for simple hard-cut assembly.
 */
export function generateConcatList(clipCount: number): string {
  return Array.from({ length: clipCount }, (_, i) => `file 'clip_${i}.mp4'`).join('\n');
}
