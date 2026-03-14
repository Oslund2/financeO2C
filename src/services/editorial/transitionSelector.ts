// ─────────────────────────────────────────────────────────────
// Transition Selector
// Picks transitions based on narrative context, not a dropdown.
// Hard cuts for dialogue, dissolves for time passage, J-cuts where
// audio should lead video, L-cuts for reaction reveals, fades for
// chapter endings. Every transition has a reason.
// ─────────────────────────────────────────────────────────────

import type {
  EditorialShot,
  CutPoint,
  TransitionDecision,
  TransitionType,
  FormatEditorialProfile,
} from '../../types/editorialEngine';

/**
 * For each cut point, select the appropriate transition type
 * based on narrative context and format rules.
 */
export function selectTransitions(
  shots: EditorialShot[],
  cutPoints: CutPoint[],
  profile: FormatEditorialProfile
): TransitionDecision[] {
  const decisions: TransitionDecision[] = [];
  let nonCutCount = 0;
  const totalTransitions = cutPoints.length;
  const maxNonCuts = Math.floor(totalTransitions * profile.transitionBudget);

  for (const cutPoint of cutPoints) {
    const current = shots[cutPoint.afterShotIndex];
    const next = shots[cutPoint.afterShotIndex + 1];
    if (!current || !next) continue;

    const decision = selectSingleTransition(
      current, next, cutPoint, profile,
      nonCutCount < maxNonCuts
    );

    if (decision.type !== 'cut') {
      nonCutCount++;
    }

    decisions.push(decision);
  }

  return decisions;
}

function selectSingleTransition(
  current: EditorialShot,
  next: EditorialShot,
  cutPoint: CutPoint,
  profile: FormatEditorialProfile,
  nonCutBudgetRemaining: boolean
): TransitionDecision {
  const pair: [number, number] = [cutPoint.afterShotIndex, cutPoint.afterShotIndex + 1];

  // ── Act Break ──
  if (cutPoint.reason === 'act_break') {
    return actBreakTransition(pair, profile);
  }

  // ── Scene Change ──
  if (cutPoint.reason === 'scene_reset') {
    return sceneChangeTransition(current, next, pair, profile, nonCutBudgetRemaining);
  }

  // ── Dialogue Turn — J-cut or L-cut ──
  if (cutPoint.reason === 'dialogue_turn') {
    return dialogueTurnTransition(current, next, pair, cutPoint, profile);
  }

  // ── Match Cut — always hard cut, precisely timed ──
  if (cutPoint.reason === 'match_cut') {
    return {
      betweenShots: pair,
      type: 'cut',
      durationSeconds: 0,
      rationale: 'Match cut: same framing maintains visual continuity with hard cut',
    };
  }

  // ── Action Completion — hard cut after movement lands ──
  if (cutPoint.reason === 'action_completion') {
    return {
      betweenShots: pair,
      type: 'cut',
      durationSeconds: 0,
      rationale: 'Hard cut after camera movement completes — preserves kinetic energy',
    };
  }

  // ── Establishing Hold — entering new visual space ──
  if (cutPoint.reason === 'establishing_hold') {
    if (nonCutBudgetRemaining) {
      return {
        betweenShots: pair,
        type: 'dip_to_black',
        durationSeconds: 0.3,
        audioOverlap: cutPoint.preLapAudioSeconds
          ? { type: 'j_cut', overlapSeconds: cutPoint.preLapAudioSeconds }
          : undefined,
        rationale: 'Brief dip to black before new establishing shot — geographic reset',
      };
    }
    return {
      betweenShots: pair,
      type: 'cut',
      durationSeconds: 0,
      rationale: 'Hard cut to establishing shot (transition budget spent)',
    };
  }

  // ── Default: pacing-driven cut ──
  return {
    betweenShots: pair,
    type: 'cut',
    durationSeconds: 0,
    rationale: 'Standard pacing cut — maintains rhythm',
  };
}

// ── Act Break Transitions ─────────────────────────────────────

function actBreakTransition(
  pair: [number, number],
  profile: FormatEditorialProfile
): TransitionDecision {
  switch (profile.actBreakStyle) {
    case 'hard_fade':
      return {
        betweenShots: pair,
        type: 'fade_black',
        durationSeconds: 1.5,
        rationale: 'Act break: fade to black signals chapter ending to viewer',
      };

    case 'soft_dissolve':
      return {
        betweenShots: pair,
        type: 'dissolve',
        durationSeconds: 2.0,
        rationale: 'Act break: slow dissolve creates emotional transition between acts',
      };

    case 'smash_cut':
      return {
        betweenShots: pair,
        type: 'cut',
        durationSeconds: 0,
        rationale: 'Act break: smash cut preserves momentum (streaming format)',
      };

    case 'music_sting':
      return {
        betweenShots: pair,
        type: 'fade_black',
        durationSeconds: 1.0,
        rationale: 'Act break: fade with music sting punctuates the chapter turn',
      };
  }
}

// ── Scene Change Transitions ──────────────────────────────────

function sceneChangeTransition(
  current: EditorialShot,
  next: EditorialShot,
  pair: [number, number],
  _profile: FormatEditorialProfile,
  budgetRemaining: boolean
): TransitionDecision {
  // Different location = geographic reset
  const locationChange = current.location !== next.location;

  // Emotional weight: close-up ending a scene carries weight
  const emotionalExit = current.shotType === 'close_up' || current.shotType === 'extreme_close_up';

  if (emotionalExit && budgetRemaining) {
    // Lingering dissolve after emotional close-up
    return {
      betweenShots: pair,
      type: 'dissolve',
      durationSeconds: 1.5,
      audioOverlap: { type: 'j_cut', overlapSeconds: 0.5 },
      rationale: 'Dissolve from emotional close-up — lets the moment resonate before scene change',
    };
  }

  if (locationChange && budgetRemaining) {
    // Dip to black for geographic jump
    return {
      betweenShots: pair,
      type: 'dip_to_black',
      durationSeconds: 0.4,
      audioOverlap: { type: 'j_cut', overlapSeconds: 0.5 },
      rationale: 'Dip to black for location change — resets viewer spatial awareness',
    };
  }

  // Same location scene change or budget spent — hard cut with audio pre-lap
  return {
    betweenShots: pair,
    type: 'cut',
    durationSeconds: 0,
    audioOverlap: locationChange
      ? { type: 'j_cut', overlapSeconds: 0.3 }
      : undefined,
    rationale: locationChange
      ? 'Hard cut with ambient J-cut into new location'
      : 'Hard cut between scenes at same location — time compression',
  };
}

// ── Dialogue Turn Transitions ─────────────────────────────────

function dialogueTurnTransition(
  _current: EditorialShot,
  next: EditorialShot,
  pair: [number, number],
  cutPoint: CutPoint,
  profile: FormatEditorialProfile
): TransitionDecision {
  // Determine if this should be a J-cut (hear next speaker before seeing them)
  // or an L-cut (see next shot while hearing current speaker finish)

  const nextIsReaction = next.shotType === 'reaction_shot' ||
    (next.shotType === 'close_up' && !next.hasDialogue);

  if (nextIsReaction) {
    // L-cut: current speaker's words continue over the reaction shot
    // We see the listener's reaction while still hearing the speaker
    return {
      betweenShots: pair,
      type: 'cut',
      durationSeconds: 0,
      audioOverlap: {
        type: 'l_cut',
        overlapSeconds: Math.min(0.8, profile.dialoguePadding.postSec + 0.3),
      },
      rationale: 'L-cut to reaction shot — viewer sees impact of words on listener',
    };
  }

  // J-cut: we hear the next speaker begin before we see them
  // Creates anticipation and smoother dialogue flow
  const preLap = cutPoint.preLapAudioSeconds ?? profile.dialoguePadding.preSec;

  return {
    betweenShots: pair,
    type: 'cut',
    durationSeconds: 0,
    audioOverlap: preLap > 0
      ? { type: 'j_cut', overlapSeconds: preLap }
      : undefined,
    rationale: preLap > 0
      ? 'J-cut into next speaker — audio leads video for natural dialogue flow'
      : 'Hard cut on dialogue turn — rapid exchange rhythm',
  };
}

/**
 * Summarize transition usage for the EDL stats.
 */
export function countTransitions(decisions: TransitionDecision[]): Record<TransitionType, number> {
  const counts: Record<TransitionType, number> = {
    cut: 0, dissolve: 0, fade_black: 0, fade_white: 0,
    wipe: 0, j_cut: 0, l_cut: 0, dip_to_black: 0,
  };

  for (const d of decisions) {
    counts[d.type]++;
    // Also count audio overlaps as J/L-cuts
    if (d.audioOverlap) {
      counts[d.audioOverlap.type]++;
    }
  }

  return counts;
}
