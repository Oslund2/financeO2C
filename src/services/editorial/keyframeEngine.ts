// ─────────────────────────────────────────────────────────────
// Keyframe and Motion Engine
// Adds life to shots: Ken Burns on stills (they MUST move or they
// look broken), emphasis zoom on reaction shots, vignette on
// emotional close-ups, stabilization on AI-generated clips.
// Static clips on a timeline feel dead. This layer prevents that.
// ─────────────────────────────────────────────────────────────

import type {
  EditorialShot,
  KeyframeDecision,
  MotionKeyframe,
} from '../../types/editorialEngine';

/**
 * Generate keyframe and filter decisions for all shots.
 */
export function generateKeyframeDecisions(
  shots: EditorialShot[],
  shotDurations: { shotIndex: number; adjustedDuration: number }[]
): KeyframeDecision[] {
  const decisions: KeyframeDecision[] = [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const durInfo = shotDurations.find(d => d.shotIndex === i);
    const duration = durInfo?.adjustedDuration ?? shot.durationSeconds;

    const decision: KeyframeDecision = {
      shotIndex: i,
      motionKeyframes: [],
      filters: [],
      rationale: '',
    };

    const reasons: string[] = [];

    // ── Still Image Animation (Ken Burns) ──
    // If a shot falls back to a storyboard still, it MUST have motion
    if (shot.sourceType === 'still') {
      const motion = kenBurnsForShotType(shot, duration);
      decision.motionKeyframes = motion.keyframes;
      reasons.push(motion.rationale);
    }

    // ── Emphasis Zoom on Reaction Shots ──
    if (
      shot.sourceType !== 'still' &&
      (shot.shotType === 'reaction_shot' ||
        (shot.shotType === 'close_up' && !shot.hasDialogue))
    ) {
      const zoom = emphasisZoom(duration);
      decision.motionKeyframes = zoom.keyframes;
      reasons.push(zoom.rationale);
    }

    // ── Vignette on Emotional Close-ups ──
    if (
      (shot.shotType === 'close_up' || shot.shotType === 'extreme_close_up') &&
      shot.hasDialogue
    ) {
      decision.filters.push({
        type: 'vignette',
        params: { angle: 0.5, aspect: 1.0 }, // Subtle darkening at edges
      });
      reasons.push('subtle vignette draws focus to face');
    }

    // ── Stabilization for AI-generated video ──
    if (shot.sourceType === 'veo3' || shot.sourceType === 'lipsync') {
      decision.filters.push({
        type: 'deshake',
        params: { rx: 16, ry: 16 }, // Mild stabilization radius
      });
      reasons.push('mild deshake for AI-generated content');
    }

    if (reasons.length > 0) {
      decision.rationale = reasons.join('; ');
      decisions.push(decision);
    }
  }

  return decisions;
}

// ── Ken Burns Motion Patterns ─────────────────────────────────
// Each shot type gets a different motion that feels natural for
// how that type of shot is used in professional editing.

interface MotionResult {
  keyframes: MotionKeyframe[];
  rationale: string;
}

function kenBurnsForShotType(shot: EditorialShot, duration: number): MotionResult {
  switch (shot.shotType) {
    case 'establishing_shot':
      // Slow zoom out — reveals the full environment gradually
      return {
        keyframes: [
          { time: 0, scale: 1.08, x: 0.5, y: 0.5 },
          { time: duration, scale: 1.0, x: 0.5, y: 0.48 },
        ],
        rationale: 'Ken Burns zoom-out on establishing still — reveals environment',
      };

    case 'wide_shot':
      // Gentle lateral pan — eye scans the scene
      return {
        keyframes: [
          { time: 0, scale: 1.05, x: 0.45, y: 0.5 },
          { time: duration, scale: 1.05, x: 0.55, y: 0.5 },
        ],
        rationale: 'Ken Burns lateral pan on wide still — simulates eye scanning scene',
      };

    case 'medium_shot':
      // Subtle push-in — draws viewer closer to character
      return {
        keyframes: [
          { time: 0, scale: 1.0, x: 0.5, y: 0.5 },
          { time: duration, scale: 1.04, x: 0.5, y: 0.48 },
        ],
        rationale: 'Ken Burns push-in on medium still — draws viewer toward character',
      };

    case 'close_up':
      // Very subtle drift — barely perceptible, just enough to feel alive
      return {
        keyframes: [
          { time: 0, scale: 1.02, x: 0.49, y: 0.5 },
          { time: duration, scale: 1.02, x: 0.51, y: 0.49 },
        ],
        rationale: 'Ken Burns micro-drift on close-up still — prevents frozen feeling',
      };

    case 'extreme_close_up':
      // Slow zoom in — intensifies the detail
      return {
        keyframes: [
          { time: 0, scale: 1.0, x: 0.5, y: 0.5 },
          { time: duration, scale: 1.06, x: 0.5, y: 0.5 },
        ],
        rationale: 'Ken Burns zoom-in on ECU still — intensifies detail focus',
      };

    case 'over_the_shoulder':
      // Subtle shift toward the far character
      return {
        keyframes: [
          { time: 0, scale: 1.03, x: 0.48, y: 0.5 },
          { time: duration, scale: 1.03, x: 0.52, y: 0.49 },
        ],
        rationale: 'Ken Burns shift on OTS still — guides eye to far character',
      };

    case 'two_shot':
      // Gentle zoom in — draws focus from staging to interaction
      return {
        keyframes: [
          { time: 0, scale: 1.0, x: 0.5, y: 0.5 },
          { time: duration, scale: 1.03, x: 0.5, y: 0.48 },
        ],
        rationale: 'Ken Burns push-in on two-shot still — shifts from staging to interaction',
      };

    case 'reaction_shot':
      // Slow zoom in on face — emphasizes the emotional response
      return {
        keyframes: [
          { time: 0, scale: 1.0, x: 0.5, y: 0.48 },
          { time: duration, scale: 1.05, x: 0.5, y: 0.47 },
        ],
        rationale: 'Ken Burns zoom-in on reaction still — emphasizes emotional response',
      };

    default:
      // Generic subtle drift
      return {
        keyframes: [
          { time: 0, scale: 1.02, x: 0.49, y: 0.5 },
          { time: duration, scale: 1.02, x: 0.51, y: 0.5 },
        ],
        rationale: 'Ken Burns generic drift — prevents static frame',
      };
  }
}

// ── Emphasis Zoom ─────────────────────────────────────────────
// Subtle 2% push-in on video reaction shots. Not visible consciously
// but draws the viewer's focus to the expression.

function emphasisZoom(duration: number): MotionResult {
  return {
    keyframes: [
      { time: 0, scale: 1.0, x: 0.5, y: 0.5 },
      { time: duration, scale: 1.02, x: 0.5, y: 0.49 },
    ],
    rationale: 'Subtle emphasis zoom on reaction — draws focus to expression',
  };
}
