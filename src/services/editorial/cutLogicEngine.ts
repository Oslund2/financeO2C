// ─────────────────────────────────────────────────────────────
// Cut Logic Engine
// Decides WHERE and WHY to cut. Reads shot metadata and applies
// the same instinctive rules a human editor uses — cut on dialogue
// turns, complete camera movements, hold establishing shots,
// respect emotional beats, find match cuts, and reset for scenes.
// ─────────────────────────────────────────────────────────────

import type {
  EditorialShot,
  CutPoint,
  FormatEditorialProfile,
} from '../../types/editorialEngine';

export interface CutAnalysis {
  cutPoints: CutPoint[];
  shotDurations: { shotIndex: number; adjustedDuration: number; reason: string }[];
}

/**
 * Analyze a sequence of shots and determine optimal cut points,
 * trim adjustments, and audio pre-laps.
 */
export function analyzeCuts(
  shots: EditorialShot[],
  profile: FormatEditorialProfile
): CutAnalysis {
  const cutPoints: CutPoint[] = [];
  const shotDurations: CutAnalysis['shotDurations'] = [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const next = shots[i + 1] ?? null;
    const prev = shots[i - 1] ?? null;

    // ── Determine adjusted duration for this shot ──

    let adjustedDuration = shot.durationSeconds;
    let durationReason = 'default duration';

    // Rule 1: Establishing shots get room to breathe
    if (isEstablishingEntry(shot, prev)) {
      const minHold = profile.formatType === 'short_form' ? 1.5 : 2.5;
      if (adjustedDuration < minHold) {
        adjustedDuration = minHold;
        durationReason = 'establishing shot minimum hold';
      }
    }

    // Rule 2: Close-ups earn their time based on content
    if (shot.shotType === 'close_up' || shot.shotType === 'extreme_close_up') {
      if (shot.hasDialogue && shot.dialogueDurationSeconds) {
        // Hold for dialogue + reaction beat
        const needed = shot.dialogueDurationSeconds + 0.5;
        adjustedDuration = Math.max(adjustedDuration, needed);
        durationReason = 'close-up held for dialogue + reaction beat';
      } else if (!shot.hasDialogue) {
        // Reaction shot: 1.5–3s based on format
        const holdRange = profile.formatType === 'short_form'
          ? { min: 0.8, max: 1.5 }
          : { min: 1.5, max: 3.0 };
        adjustedDuration = Math.max(holdRange.min, Math.min(adjustedDuration, holdRange.max));
        durationReason = 'reaction/emotional close-up hold';
      }
    }

    // Rule 3: Moving camera shots need time to complete their movement
    if (shot.cameraMovement !== 'static') {
      // Don't trim more than 20% off a moving shot — let the movement land
      const minMovingDuration = shot.durationSeconds * 0.8;
      adjustedDuration = Math.max(adjustedDuration, minMovingDuration);
      durationReason = adjustedDuration !== shot.durationSeconds
        ? 'camera movement completion'
        : durationReason;
    }

    shotDurations.push({ shotIndex: i, adjustedDuration, reason: durationReason });

    // ── Determine cut point after this shot (if not last) ──

    if (!next) continue;

    const cutPoint = determineCutPoint(shot, next, i, profile);
    cutPoints.push(cutPoint);
  }

  return { cutPoints, shotDurations };
}

function determineCutPoint(
  current: EditorialShot,
  next: EditorialShot,
  currentIndex: number,
  profile: FormatEditorialProfile
): CutPoint {
  // Priority 1: Act break
  if (current.actNumber !== next.actNumber) {
    return {
      afterShotIndex: currentIndex,
      reason: 'act_break',
      trimEndSeconds: 0,
    };
  }

  // Priority 2: Scene change
  if (current.sceneNumber !== next.sceneNumber) {
    return {
      afterShotIndex: currentIndex,
      reason: 'scene_reset',
      // Slight trim at end of outgoing scene to keep it tight
      trimEndSeconds: 0.2,
      // Pre-lap the new scene's ambient audio
      preLapAudioSeconds: isEstablishingEntry(next, current) ? 0.5 : 0.3,
    };
  }

  // Priority 3: Dialogue turn (character switch)
  if (isDialogueTurn(current, next)) {
    return {
      afterShotIndex: currentIndex,
      reason: 'dialogue_turn',
      // Hold on speaker for reaction beat after their line
      trimEndSeconds: -0.3, // negative = extend (add 0.3s reaction hold)
      // Pre-lap next speaker's audio (J-cut)
      preLapAudioSeconds: profile.dialoguePadding.preSec,
    };
  }

  // Priority 4: Match cut opportunity
  if (isMatchCut(current, next)) {
    return {
      afterShotIndex: currentIndex,
      reason: 'match_cut',
      // Precise cut — no trim, no overlap
      trimEndSeconds: 0,
    };
  }

  // Priority 5: Camera movement completion
  if (current.cameraMovement !== 'static') {
    return {
      afterShotIndex: currentIndex,
      reason: 'action_completion',
      // Let the movement finish — don't trim the end
      trimEndSeconds: 0,
    };
  }

  // Priority 6: Establishing shot hold
  if (isEstablishingEntry(next, current)) {
    return {
      afterShotIndex: currentIndex,
      reason: 'establishing_hold',
      trimEndSeconds: 0.1,
      // Pre-lap new location's ambient sound
      preLapAudioSeconds: 0.5,
    };
  }

  // Default: clean cut based on pacing
  return {
    afterShotIndex: currentIndex,
    reason: 'pacing_trim',
    trimEndSeconds: 0,
  };
}

// ── Helper: Is this an establishing shot at the start of a scene? ──

function isEstablishingEntry(shot: EditorialShot, prev: EditorialShot | null): boolean {
  const isEstablishingType = shot.shotType === 'establishing_shot' || shot.shotType === 'wide_shot';
  const isFirstInScene = !prev || prev.sceneNumber !== shot.sceneNumber;
  return isEstablishingType && isFirstInScene;
}

// ── Helper: Are these two shots a dialogue turn? ──

function isDialogueTurn(current: EditorialShot, next: EditorialShot): boolean {
  if (!current.hasDialogue || !next.hasDialogue) return false;
  if (!current.dialogueContent?.length || !next.dialogueContent?.length) return false;

  const currentSpeaker = current.dialogueContent[current.dialogueContent.length - 1]?.character;
  const nextSpeaker = next.dialogueContent[0]?.character;

  return !!currentSpeaker && !!nextSpeaker && currentSpeaker !== nextSpeaker;
}

// ── Helper: Do these shots form a match cut? ──

function isMatchCut(current: EditorialShot, next: EditorialShot): boolean {
  // Same framing + same angle = match cut opportunity
  return (
    current.shotType === next.shotType &&
    current.cameraAngle === next.cameraAngle &&
    current.sceneNumber === next.sceneNumber
  );
}

/**
 * Given a shot, determine if it should have a hard entry (no lead-in)
 * or a soft entry (brief buffer). Used by the transition selector.
 */
export function needsHardEntry(shot: EditorialShot): boolean {
  // Reaction shots and close-ups on dialogue need hard entries
  // to preserve timing precision
  return (
    shot.shotType === 'reaction_shot' ||
    (shot.shotType === 'close_up' && shot.hasDialogue) ||
    shot.shotType === 'extreme_close_up'
  );
}
