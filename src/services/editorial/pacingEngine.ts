// ─────────────────────────────────────────────────────────────
// Pacing and Rhythm Engine
// Makes the whole edit FEEL right. Looks at the big picture —
// the arc of an episode — and adjusts cut timing globally.
// High intensity = faster cuts, shorter holds, urgency.
// Low intensity = longer holds, breathing room, weight.
// Prevents the edit from feeling metronomic or monotonous.
// ─────────────────────────────────────────────────────────────

import type {
  EditorialShot,
  FormatEditorialProfile,
  PacingAnalysis,
  PacingKeyframe,
} from '../../types/editorialEngine';
import { samplePacingCurve } from './formatProfileManager';

/**
 * Analyze the shot sequence against the format's pacing curve
 * and produce per-shot duration adjustments.
 */
export function analyzePacing(
  shots: EditorialShot[],
  profile: FormatEditorialProfile
): PacingAnalysis {
  const totalRawDuration = shots.reduce((sum, s) => sum + s.durationSeconds, 0);
  const adjustments: PacingAnalysis['shotAdjustments'] = [];

  let runningTime = 0;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const normalizedPosition = totalRawDuration > 0
      ? runningTime / totalRawDuration
      : 0;

    const intensity = samplePacingCurve(profile.pacingCurve, normalizedPosition);
    const adjusted = adjustShotDuration(shot, intensity, profile);

    adjustments.push({
      shotIndex: i,
      originalDuration: shot.durationSeconds,
      adjustedDuration: adjusted,
      intensityAtPosition: intensity,
    });

    runningTime += shot.durationSeconds;
  }

  // Calculate estimated cuts per minute
  const totalAdjustedDuration = adjustments.reduce((sum, a) => sum + a.adjustedDuration, 0);
  const estimatedCPM = totalAdjustedDuration > 0
    ? (adjustments.length / totalAdjustedDuration) * 60
    : 0;

  return {
    overallPacingCurve: profile.pacingCurve,
    shotAdjustments: adjustments,
    estimatedCPM,
  };
}

/**
 * Adjust a single shot's duration based on the intensity level
 * at its position in the timeline.
 */
function adjustShotDuration(
  shot: EditorialShot,
  intensity: number,
  profile: FormatEditorialProfile
): number {
  const base = shot.durationSeconds;

  // ── Intensity-based compression/expansion ──
  // High intensity (→ 1.0): trim tighter — up to 40% shorter
  // Low intensity (→ 0.0): allow full duration or extend — up to 20% longer
  //
  // The mapping: intensity 0.5 = no change
  //              intensity 1.0 = multiply by 0.6 (40% trim)
  //              intensity 0.0 = multiply by 1.2 (20% extend)
  const multiplier = 1.2 - (intensity * 0.6);

  let adjusted = base * multiplier;

  // ── Hard constraints ──

  // Dialogue shots: never shorter than the dialogue itself
  if (shot.hasDialogue && shot.dialogueDurationSeconds) {
    const minForDialogue = shot.dialogueDurationSeconds + 0.3; // + brief reaction
    adjusted = Math.max(adjusted, minForDialogue);
  }

  // Moving camera: preserve at least 80% of duration
  if (shot.cameraMovement !== 'static') {
    adjusted = Math.max(adjusted, base * 0.8);
  }

  // Establishing shots: minimum hold based on format
  if (shot.shotType === 'establishing_shot' || shot.shotType === 'wide_shot') {
    const minEstablishing = profile.formatType === 'short_form' ? 1.0 : 2.0;
    adjusted = Math.max(adjusted, minEstablishing);
  }

  // Short-form: no shot longer than 4s unless it has dialogue
  if (profile.formatType === 'short_form' && !shot.hasDialogue) {
    adjusted = Math.min(adjusted, 4.0);
  }

  // Spot format: extremely tight — max 3s per shot unless dialogue
  if (profile.formatType === 'spot' && !shot.hasDialogue) {
    adjusted = Math.min(adjusted, 3.0);
  }

  // Global clamp: never trim more than 40% or extend more than 25%
  adjusted = Math.max(base * 0.6, Math.min(adjusted, base * 1.25));

  // Round to nearest 0.1s for clean timeline
  return Math.round(adjusted * 10) / 10;
}

/**
 * Generate a pacing curve from act/scene structure when no predefined
 * curve exists. Useful for custom formats.
 */
export function generatePacingCurveFromStructure(
  shots: EditorialShot[]
): PacingKeyframe[] {
  if (shots.length === 0) return [{ time: 0, intensity: 0.5 }, { time: 1, intensity: 0.5 }];

  const totalShots = shots.length;
  const acts = new Set(shots.map(s => s.actNumber));
  const keyframes: PacingKeyframe[] = [];

  // Identify act boundaries
  const actBoundaries: { actNumber: number; startIndex: number; endIndex: number }[] = [];
  for (const actNum of [...acts].sort()) {
    const actShots = shots
      .map((s, i) => ({ shot: s, index: i }))
      .filter(({ shot }) => shot.actNumber === actNum);
    if (actShots.length > 0) {
      actBoundaries.push({
        actNumber: actNum,
        startIndex: actShots[0].index,
        endIndex: actShots[actShots.length - 1].index,
      });
    }
  }

  // Generate curve: each act has its own mini-arc
  for (const act of actBoundaries) {
    const actStart = act.startIndex / totalShots;
    const actEnd = (act.endIndex + 1) / totalShots;
    const isFirstAct = act === actBoundaries[0];
    const isLastAct = act === actBoundaries[actBoundaries.length - 1];

    if (isFirstAct) {
      // Hook at start
      keyframes.push({ time: actStart, intensity: 0.7 });
    }

    // Each act: build from low to high
    const actMid = (actStart + actEnd) / 2;
    keyframes.push({ time: actStart + 0.02, intensity: isFirstAct ? 0.5 : 0.4 });
    keyframes.push({ time: actMid, intensity: 0.55 });
    keyframes.push({ time: actEnd - 0.02, intensity: isLastAct ? 0.95 : 0.7 });

    if (isLastAct) {
      // Denouement
      keyframes.push({ time: Math.min(1.0, actEnd + 0.03), intensity: 0.3 });
    }
  }

  // Ensure we have start and end
  if (keyframes[0]?.time > 0) {
    keyframes.unshift({ time: 0, intensity: 0.6 });
  }
  if (keyframes[keyframes.length - 1]?.time < 1) {
    keyframes.push({ time: 1.0, intensity: 0.25 });
  }

  return keyframes;
}

/**
 * Check if the estimated CPM is within the format's acceptable range.
 * Returns a diagnostic message if out of range.
 */
export function validatePacing(
  analysis: PacingAnalysis,
  profile: FormatEditorialProfile
): { valid: boolean; message: string } {
  const { min, max } = profile.cutRateRange;

  if (analysis.estimatedCPM < min * 0.8) {
    return {
      valid: false,
      message: `Cut rate ${analysis.estimatedCPM.toFixed(1)} CPM is below minimum for ${profile.name} (${min} CPM). Consider trimming shots tighter.`,
    };
  }

  if (analysis.estimatedCPM > max * 1.2) {
    return {
      valid: false,
      message: `Cut rate ${analysis.estimatedCPM.toFixed(1)} CPM exceeds maximum for ${profile.name} (${max} CPM). Consider longer holds.`,
    };
  }

  return {
    valid: true,
    message: `Cut rate ${analysis.estimatedCPM.toFixed(1)} CPM is within range for ${profile.name} (${min}–${max} CPM).`,
  };
}
