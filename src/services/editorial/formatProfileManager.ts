// ─────────────────────────────────────────────────────────────
// Format Profile Manager
// Maps show formats to editorial grammar — cut rates, transition
// budgets, pacing curves, audio rules, and structural conventions.
// ─────────────────────────────────────────────────────────────

import type { FormatType } from '../../types/formatConfig';
import type { FormatEditorialProfile, PacingKeyframe } from '../../types/editorialEngine';

// ── Default Profiles ──────────────────────────────────────────

const BROADCAST_PROFILE: FormatEditorialProfile = {
  formatType: 'broadcast',
  name: 'Broadcast Drama/Comedy',

  coldOpen: true,
  titleCardPlacement: 'post_cold_open',
  actBreakStyle: 'hard_fade',
  endingStyle: 'fade_to_black',

  // Classic three-act broadcast arc: hook → build → commercial → escalate → commercial → climax → resolve
  pacingCurve: [
    { time: 0.00, intensity: 0.70 }, // Cold open hook
    { time: 0.05, intensity: 0.50 }, // Title card settle
    { time: 0.15, intensity: 0.35 }, // Act 1: establishing
    { time: 0.25, intensity: 0.55 }, // Act 1: rising action
    { time: 0.33, intensity: 0.65 }, // Act 1: climax → break
    { time: 0.37, intensity: 0.40 }, // Return from break, reorient
    { time: 0.50, intensity: 0.60 }, // Act 2: midpoint turn
    { time: 0.60, intensity: 0.50 }, // Act 2: fallout
    { time: 0.66, intensity: 0.70 }, // Act 2: climax → break
    { time: 0.70, intensity: 0.45 }, // Return from break
    { time: 0.80, intensity: 0.75 }, // Act 3: building
    { time: 0.90, intensity: 0.95 }, // Act 3: climax
    { time: 0.95, intensity: 0.40 }, // Denouement
    { time: 1.00, intensity: 0.25 }, // Tag/end card
  ],

  cutRateRange: { min: 8, max: 20 },
  transitionBudget: 0.15,

  musicBehavior: 'scored_sections',
  dialoguePadding: { preSec: 0.2, postSec: 0.5 },
  silenceThresholdSec: 2.0,

  breakBumperStyle: 'sting',
  returnFromBreakStyle: 'establishing',
};

const STREAMING_PROFILE: FormatEditorialProfile = {
  formatType: 'streaming',
  name: 'Streaming (No Breaks)',

  coldOpen: true,
  titleCardPlacement: 'post_cold_open',
  actBreakStyle: 'smash_cut',
  endingStyle: 'cliffhanger_cut',

  // Continuous flow — no break resets, steady build with breathing room
  pacingCurve: [
    { time: 0.00, intensity: 0.65 }, // Cold open
    { time: 0.08, intensity: 0.40 }, // Settle into world
    { time: 0.20, intensity: 0.35 }, // Character/world building
    { time: 0.35, intensity: 0.55 }, // Inciting incident
    { time: 0.50, intensity: 0.45 }, // Midpoint — breath
    { time: 0.55, intensity: 0.65 }, // Midpoint turn
    { time: 0.70, intensity: 0.55 }, // Building complications
    { time: 0.80, intensity: 0.75 }, // Acceleration
    { time: 0.90, intensity: 0.95 }, // Climax
    { time: 0.95, intensity: 0.50 }, // Quick resolution
    { time: 1.00, intensity: 0.80 }, // Cliffhanger hook for next episode
  ],

  cutRateRange: { min: 10, max: 25 },
  transitionBudget: 0.10,

  musicBehavior: 'wall_to_wall',
  dialoguePadding: { preSec: 0.15, postSec: 0.4 },
  silenceThresholdSec: 1.5,

  breakBumperStyle: null,
  returnFromBreakStyle: 'cold_resume',
};

const SHORT_FORM_PROFILE: FormatEditorialProfile = {
  formatType: 'short_form',
  name: 'Short Form (TikTok/Shorts)',

  coldOpen: false, // No time for it — you ARE the cold open
  titleCardPlacement: 'none',
  actBreakStyle: 'smash_cut',
  endingStyle: 'hard_out',

  // Relentless pace — hook immediately, never let go
  pacingCurve: [
    { time: 0.00, intensity: 0.90 }, // Immediate hook
    { time: 0.10, intensity: 0.80 }, // Sustain interest
    { time: 0.30, intensity: 0.85 }, // Escalate
    { time: 0.50, intensity: 0.75 }, // Micro-breath (still high)
    { time: 0.70, intensity: 0.90 }, // Push to payoff
    { time: 0.85, intensity: 1.00 }, // Peak
    { time: 1.00, intensity: 0.70 }, // Quick exit or loop point
  ],

  cutRateRange: { min: 25, max: 60 },
  transitionBudget: 0.03,

  musicBehavior: 'wall_to_wall',
  dialoguePadding: { preSec: 0.05, postSec: 0.15 },
  silenceThresholdSec: 0.5,

  breakBumperStyle: null,
  returnFromBreakStyle: 'cold_resume',
};

const MEDIUM_FORM_PROFILE: FormatEditorialProfile = {
  formatType: 'medium_form',
  name: 'Medium Form (YouTube/Web)',

  coldOpen: true,
  titleCardPlacement: 'post_cold_open',
  actBreakStyle: 'soft_dissolve',
  endingStyle: 'fade_to_black',

  // YouTube rhythm: strong hook, chapter-based flow, re-engagement moments
  pacingCurve: [
    { time: 0.00, intensity: 0.80 }, // Hook (critical first 10s)
    { time: 0.05, intensity: 0.50 }, // Title/intro
    { time: 0.15, intensity: 0.40 }, // Setup
    { time: 0.30, intensity: 0.60 }, // First chapter peak
    { time: 0.40, intensity: 0.45 }, // Bridge
    { time: 0.55, intensity: 0.65 }, // Second chapter peak
    { time: 0.65, intensity: 0.40 }, // Valley (re-engagement dip)
    { time: 0.75, intensity: 0.70 }, // Build to finale
    { time: 0.85, intensity: 0.85 }, // Climax
    { time: 0.92, intensity: 0.50 }, // Wrap-up
    { time: 1.00, intensity: 0.60 }, // CTA / next-video tease
  ],

  cutRateRange: { min: 12, max: 30 },
  transitionBudget: 0.12,

  musicBehavior: 'scored_sections',
  dialoguePadding: { preSec: 0.15, postSec: 0.35 },
  silenceThresholdSec: 1.5,

  breakBumperStyle: null,
  returnFromBreakStyle: 'cold_resume',
};

const SPOT_PROFILE: FormatEditorialProfile = {
  formatType: 'spot',
  name: 'Commercial Spot',

  coldOpen: false,
  titleCardPlacement: 'none',
  actBreakStyle: 'smash_cut',
  endingStyle: 'hard_out',

  // Spots: every frame sells. Front-load problem, rapid middle, hold on CTA.
  pacingCurve: [
    { time: 0.00, intensity: 0.85 }, // Attention grab / problem statement
    { time: 0.15, intensity: 0.75 }, // Set the stakes
    { time: 0.30, intensity: 0.90 }, // Solution reveal
    { time: 0.50, intensity: 0.95 }, // Product/feature montage
    { time: 0.70, intensity: 0.80 }, // Emotional payoff
    { time: 0.85, intensity: 0.50 }, // Settle onto end frame
    { time: 1.00, intensity: 0.30 }, // Logo/CTA hold (2s minimum)
  ],

  cutRateRange: { min: 20, max: 60 },
  transitionBudget: 0.05,

  musicBehavior: 'wall_to_wall',
  dialoguePadding: { preSec: 0.05, postSec: 0.1 },
  silenceThresholdSec: 0.3,

  breakBumperStyle: null,
  returnFromBreakStyle: 'cold_resume',
};

// ── Profile Registry ──────────────────────────────────────────

const DEFAULT_PROFILES: Record<FormatType, FormatEditorialProfile> = {
  broadcast: BROADCAST_PROFILE,
  streaming: STREAMING_PROFILE,
  short_form: SHORT_FORM_PROFILE,
  medium_form: MEDIUM_FORM_PROFILE,
  spot: SPOT_PROFILE,
  custom: STREAMING_PROFILE, // Custom defaults to streaming (no breaks)
};

// ── Public API ────────────────────────────────────────────────

/**
 * Get the editorial profile for a given format type.
 * Returns the default profile which can be overridden per-show.
 */
export function getFormatProfile(formatType: FormatType): FormatEditorialProfile {
  return { ...(DEFAULT_PROFILES[formatType] ?? STREAMING_PROFILE) };
}

/**
 * Get all available format profiles.
 */
export function getAllFormatProfiles(): FormatEditorialProfile[] {
  return Object.values(DEFAULT_PROFILES).map(p => ({ ...p }));
}

/**
 * Create a custom profile by merging overrides onto a base format profile.
 */
export function createCustomProfile(
  base: FormatType,
  overrides: Partial<FormatEditorialProfile>
): FormatEditorialProfile {
  return { ...DEFAULT_PROFILES[base], ...overrides };
}

/**
 * Interpolate the pacing curve at a given normalized time position (0–1).
 * Returns the intensity value at that point via linear interpolation.
 */
export function samplePacingCurve(curve: PacingKeyframe[], normalizedTime: number): number {
  const t = Math.max(0, Math.min(1, normalizedTime));

  if (curve.length === 0) return 0.5;
  if (curve.length === 1) return curve[0].intensity;

  // Find the two keyframes we're between
  let lower = curve[0];
  let upper = curve[curve.length - 1];

  for (let i = 0; i < curve.length - 1; i++) {
    if (t >= curve[i].time && t <= curve[i + 1].time) {
      lower = curve[i];
      upper = curve[i + 1];
      break;
    }
  }

  // Linear interpolation
  if (upper.time === lower.time) return lower.intensity;
  const progress = (t - lower.time) / (upper.time - lower.time);
  return lower.intensity + progress * (upper.intensity - lower.intensity);
}

/**
 * Calculate the target cut rate (cuts per minute) for a given intensity level.
 */
export function targetCutRate(profile: FormatEditorialProfile, intensity: number): number {
  const { min, max } = profile.cutRateRange;
  return min + intensity * (max - min);
}
