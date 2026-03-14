// ─────────────────────────────────────────────────────────────
// Editorial Decision Engine (Orchestrator)
// Takes shots + script structure + format profile + audio assets
// and runs all sub-engines to produce a complete Edit Decision List.
// This is the brain — it makes the creative decisions.
// FFmpeg is just the hands that execute them.
// ─────────────────────────────────────────────────────────────

import type {
  EditorialShot,
  EditDecision,
  EditDecisionList,
  FormatEditorialProfile,
} from '../../types/editorialEngine';
import type { FormatType } from '../../types/formatConfig';

import { getFormatProfile } from './formatProfileManager';
import { analyzeCuts } from './cutLogicEngine';
import { selectTransitions, countTransitions } from './transitionSelector';
import { generateAudioMixPlan } from './audioMixEngine';
import { generateKeyframeDecisions } from './keyframeEngine';
import { analyzePacing, validatePacing } from './pacingEngine';

export interface EditorialEngineInput {
  episodeId: string;
  shots: EditorialShot[];
  formatType: FormatType;
  assemblyType: 'rough_cut' | 'final_cut' | 'trailer' | 'preview';
  hasBackgroundMusic: boolean;
  formatProfileOverrides?: Partial<FormatEditorialProfile>;
}

export interface EditorialEngineResult {
  edl: EditDecisionList;
  warnings: string[];
}

/**
 * Generate a complete Edit Decision List from shots and configuration.
 * This is the main entry point for the editorial intelligence system.
 */
export function generateEDL(input: EditorialEngineInput): EditorialEngineResult {
  const warnings: string[] = [];

  // ── Step 1: Resolve format profile ──
  let profile = getFormatProfile(input.formatType);
  if (input.formatProfileOverrides) {
    profile = { ...profile, ...input.formatProfileOverrides };
  }

  const shots = input.shots.filter(s => s.sourceType !== 'missing');
  if (shots.length === 0) {
    return {
      edl: emptyEDL(input, profile),
      warnings: ['No shots with available assets — cannot generate EDL'],
    };
  }

  // ── Step 2: Pacing analysis (adjusts shot durations globally) ──
  const pacingAnalysis = analyzePacing(shots, profile);
  const pacingValidation = validatePacing(pacingAnalysis, profile);
  if (!pacingValidation.valid) {
    warnings.push(pacingValidation.message);
  }

  // ── Step 3: Cut analysis (where and why to cut) ──
  const cutAnalysis = analyzeCuts(shots, profile);

  // Merge pacing adjustments with cut engine duration adjustments
  // Take the more conservative (longer) of the two for each shot
  const mergedDurations = shots.map((shot, i) => {
    const pacingDur = pacingAnalysis.shotAdjustments.find(a => a.shotIndex === i)?.adjustedDuration ?? shot.durationSeconds;
    const cutDur = cutAnalysis.shotDurations.find(d => d.shotIndex === i)?.adjustedDuration ?? shot.durationSeconds;
    return {
      shotIndex: i,
      adjustedDuration: Math.max(pacingDur, cutDur),
    };
  });

  // ── Step 4: Build timeline positions from adjusted durations ──
  const shotTimecodes: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const dur of mergedDurations) {
    shotTimecodes.push({ start: cursor, end: cursor + dur.adjustedDuration });
    cursor += dur.adjustedDuration;
  }

  // ── Step 5: Transition selection ──
  const transitionDecisions = selectTransitions(shots, cutAnalysis.cutPoints, profile);

  // Adjust timecodes for transition overlaps
  for (const td of transitionDecisions) {
    if (td.durationSeconds > 0 && td.betweenShots[1] < shotTimecodes.length) {
      // Transitions overlap: pull the next clip's start back
      const overlapHalf = td.durationSeconds / 2;
      shotTimecodes[td.betweenShots[1]].start -= overlapHalf;
    }
  }

  // ── Step 6: Audio mix plan ──
  const audioMix = generateAudioMixPlan(
    shots, shotTimecodes, transitionDecisions, profile, input.hasBackgroundMusic
  );

  // ── Step 7: Keyframe/motion decisions ──
  const keyframeDecisions = generateKeyframeDecisions(shots, mergedDurations);

  // ── Step 8: Assemble all decisions into a flat EDL ──
  const decisions: EditDecision[] = [];
  let decisionIndex = 0;

  const makeId = () => `edl-${++decisionIndex}`;

  // 8a: Clip placement decisions
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const tc = shotTimecodes[i];
    const dur = mergedDurations[i];

    // Calculate trim points
    const trimIn = 0; // Start of source clip
    const trimOut = Math.min(shot.durationSeconds, dur.adjustedDuration);

    decisions.push({
      id: makeId(),
      type: 'clip',
      timelinePosition: tc.start,
      duration: dur.adjustedDuration,
      sourceShot: shot,
      sourceTrimIn: trimIn,
      sourceTrimOut: trimOut,
      rationale: `Shot ${shot.shotNumber}: ${shot.shotType} (${dur.adjustedDuration.toFixed(1)}s)`,
      overrideable: true,
    });
  }

  // 8b: Transition decisions
  for (const td of transitionDecisions) {
    const tc = shotTimecodes[td.betweenShots[0]];
    if (!tc) continue;

    const transitionDecision: EditDecision = {
      id: makeId(),
      type: 'transition',
      timelinePosition: tc.end - (td.durationSeconds / 2),
      duration: td.durationSeconds,
      transitionType: td.type,
      transitionDuration: td.durationSeconds,
      rationale: td.rationale,
      overrideable: true,
    };

    // J-cut / L-cut audio overlap
    if (td.audioOverlap) {
      transitionDecision.transitionType = td.audioOverlap.type === 'j_cut' ? 'j_cut' : 'l_cut';
    }

    decisions.push(transitionDecision);
  }

  // 8c: Audio keyframe decisions
  for (const mix of [...audioMix.dialogueMix, ...audioMix.musicMix, ...audioMix.roomToneFills]) {
    decisions.push({
      id: makeId(),
      type: 'audio_keyframe',
      timelinePosition: mix.timelineStart,
      duration: mix.timelineEnd - mix.timelineStart,
      audioTrack: mix.track,
      volumeKeyframes: mix.volumeKeyframes,
      rationale: mix.rationale,
      overrideable: true,
    });
  }

  // 8d: Video keyframe decisions (Ken Burns, emphasis zoom)
  for (const kf of keyframeDecisions) {
    const tc = shotTimecodes[kf.shotIndex];
    if (!tc) continue;

    if (kf.motionKeyframes.length > 0) {
      decisions.push({
        id: makeId(),
        type: 'video_keyframe',
        timelinePosition: tc.start,
        duration: tc.end - tc.start,
        motionKeyframes: kf.motionKeyframes,
        rationale: kf.rationale,
        overrideable: true,
      });
    }

    // Filters (vignette, deshake)
    for (const filter of kf.filters) {
      decisions.push({
        id: makeId(),
        type: 'filter',
        timelinePosition: tc.start,
        duration: tc.end - tc.start,
        filterType: filter.type,
        filterParams: filter.params,
        rationale: kf.rationale,
        overrideable: true,
      });
    }
  }

  // 8e: Loudness normalization (final pass, covers entire timeline)
  const totalDuration = cursor;
  decisions.push({
    id: makeId(),
    type: 'filter',
    timelinePosition: 0,
    duration: totalDuration,
    filterType: 'loudnorm',
    filterParams: {
      i: audioMix.targetLUFS,
      tp: audioMix.targetTruePeak,
      lra: 11,
    },
    rationale: `Loudness normalization to ${audioMix.targetLUFS} LUFS / ${audioMix.targetTruePeak} dBTP`,
    overrideable: false,
  });

  // ── Step 9: Sort decisions by timeline position ──
  decisions.sort((a, b) => a.timelinePosition - b.timelinePosition);

  // ── Step 10: Build final EDL ──
  const transitionCounts = countTransitions(transitionDecisions);

  const edl: EditDecisionList = {
    id: `edl-${input.episodeId}-${Date.now()}`,
    episodeId: input.episodeId,
    assemblyType: input.assemblyType,
    formatProfile: profile,
    decisions,
    totalDurationSeconds: totalDuration,
    createdAt: new Date().toISOString(),
    totalCuts: transitionDecisions.length,
    transitionsUsed: transitionCounts,
    averageCutRateCPM: pacingAnalysis.estimatedCPM,
    peakIntensity: Math.max(...pacingAnalysis.overallPacingCurve.map(k => k.intensity)),
  };

  // ── Validation ──
  validateEDL(edl, profile, warnings);

  return { edl, warnings };
}

// ── Validation ────────────────────────────────────────────────

function validateEDL(
  edl: EditDecisionList,
  profile: FormatEditorialProfile,
  warnings: string[]
): void {
  // Check for dead air (gaps with no audio)
  const clipDecisions = edl.decisions.filter(d => d.type === 'clip');
  for (let i = 0; i < clipDecisions.length - 1; i++) {
    const current = clipDecisions[i];
    const next = clipDecisions[i + 1];
    const gap = next.timelinePosition - (current.timelinePosition + current.duration);
    if (gap > profile.silenceThresholdSec) {
      warnings.push(
        `Potential dead air: ${gap.toFixed(1)}s gap between shots at ${current.timelinePosition.toFixed(1)}s (threshold: ${profile.silenceThresholdSec}s)`
      );
    }
  }

  // Check transition budget wasn't violated
  const nonCutTransitions = edl.decisions.filter(
    d => d.type === 'transition' && d.transitionType !== 'cut'
  ).length;
  const totalTransitions = edl.decisions.filter(d => d.type === 'transition').length;
  if (totalTransitions > 0) {
    const actualBudget = nonCutTransitions / totalTransitions;
    if (actualBudget > profile.transitionBudget * 1.2) {
      warnings.push(
        `Transition budget exceeded: ${(actualBudget * 100).toFixed(0)}% non-cuts vs ${(profile.transitionBudget * 100).toFixed(0)}% target`
      );
    }
  }

  // Check that the first shot grabs attention (format-dependent)
  if (clipDecisions.length > 0) {
    const firstClip = clipDecisions[0];
    if (profile.formatType === 'short_form' && firstClip.duration > 2.0) {
      warnings.push(
        'Short-form: first shot is longer than 2s — may lose viewer attention'
      );
    }
  }

  // Check ending feels intentional
  const lastClip = clipDecisions[clipDecisions.length - 1];
  const lastTransitions = edl.decisions.filter(
    d => d.type === 'transition' && d.timelinePosition > (edl.totalDurationSeconds - 3)
  );
  if (lastClip && lastTransitions.length === 0 && profile.endingStyle === 'fade_to_black') {
    warnings.push(
      'No fade-out at end — may feel like an abrupt stop. Consider adding fade to black.'
    );
  }
}

// ── Empty EDL (no usable assets) ──────────────────────────────

function emptyEDL(
  input: EditorialEngineInput,
  profile: FormatEditorialProfile
): EditDecisionList {
  return {
    id: `edl-${input.episodeId}-empty`,
    episodeId: input.episodeId,
    assemblyType: input.assemblyType,
    formatProfile: profile,
    decisions: [],
    totalDurationSeconds: 0,
    createdAt: new Date().toISOString(),
    totalCuts: 0,
    transitionsUsed: {
      cut: 0, dissolve: 0, fade_black: 0, fade_white: 0,
      wipe: 0, j_cut: 0, l_cut: 0, dip_to_black: 0,
    },
    averageCutRateCPM: 0,
    peakIntensity: 0,
  };
}
