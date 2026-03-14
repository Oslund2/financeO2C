// ─────────────────────────────────────────────────────────────
// Audio Mix Engine
// Manages the sound floor: dialogue ducking with smooth curves,
// musical risers before reveals and act breaks, room tone to fill
// every gap, silence-as-a-tool for emotional beats, and loudness
// normalization to broadcast standards.
//
// Audio is 50% of the edit. A flat mono mix sounds amateur.
// Layered dialogue/music/ambience makes it watchable.
// ─────────────────────────────────────────────────────────────

import type {
  EditorialShot,
  TransitionDecision,
  AudioMixDecision,
  AudioMixPlan,
  FormatEditorialProfile,
  VolumeKeyframe,
} from '../../types/editorialEngine';

// ── Constants ─────────────────────────────────────────────────

/** Target integrated loudness (streaming standard) */
const TARGET_LUFS = -14;
/** Maximum true peak */
const TARGET_TRUE_PEAK = -1;

/** Music volume levels (0–1 scale, relative to unity) */
const MUSIC_FULL = 0.7;          // Solo music (no dialogue)
const MUSIC_UNDER_DIALOGUE = 0.2; // Ducked under dialogue
const MUSIC_RISER = 0.85;         // Rising before impact moment
const MUSIC_IMPACT = 0.0;         // Brief silence after impact hit

/** Dialogue volume */
const DIALOGUE_FULL = 1.0;

/** Room tone level */
const ROOM_TONE_LEVEL = 0.08;     // Barely audible — fills digital silence

// ── Public API ────────────────────────────────────────────────

/**
 * Generate a complete audio mix plan from shot sequence and transitions.
 */
export function generateAudioMixPlan(
  shots: EditorialShot[],
  shotTimecodes: { start: number; end: number }[],
  transitions: TransitionDecision[],
  profile: FormatEditorialProfile,
  hasBackgroundMusic: boolean
): AudioMixPlan {
  const dialogueMix = buildDialogueMix(shots, shotTimecodes, profile);
  const musicMix = hasBackgroundMusic
    ? buildMusicMix(shots, shotTimecodes, transitions, profile)
    : [];
  const roomToneFills = buildRoomToneFills(shots, shotTimecodes, dialogueMix, profile);

  return {
    dialogueMix,
    musicMix,
    roomToneFills,
    targetLUFS: TARGET_LUFS,
    targetTruePeak: TARGET_TRUE_PEAK,
  };
}

// ── Dialogue Mix ──────────────────────────────────────────────

function buildDialogueMix(
  shots: EditorialShot[],
  timecodes: { start: number; end: number }[],
  profile: FormatEditorialProfile
): AudioMixDecision[] {
  const decisions: AudioMixDecision[] = [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    if (!shot.hasDialogue || !shot.dialogueAudioUrl) continue;

    const tc = timecodes[i];
    const dialogueDur = shot.dialogueDurationSeconds ?? (tc.end - tc.start);

    // Dialogue fades in slightly before the visual cut and out after
    const fadeIn = profile.dialoguePadding.preSec;
    const fadeOut = profile.dialoguePadding.postSec;

    decisions.push({
      timelineStart: tc.start,
      timelineEnd: tc.start + dialogueDur,
      track: 'dialogue',
      volumeKeyframes: [
        // Quick fade in (not a hard start — sounds jarring)
        { time: 0, volume: 0, curve: 'exponential' },
        { time: fadeIn, volume: DIALOGUE_FULL, curve: 'exponential' },
        // Hold at full for dialogue duration
        { time: dialogueDur - fadeOut, volume: DIALOGUE_FULL, curve: 'linear' },
        // Gentle fade out
        { time: dialogueDur, volume: 0, curve: 'exponential' },
      ],
      rationale: `Dialogue for shot ${shot.shotNumber} — fade in/out prevents hard audio pops`,
    });
  }

  return decisions;
}

// ── Music Mix ─────────────────────────────────────────────────

function buildMusicMix(
  shots: EditorialShot[],
  timecodes: { start: number; end: number }[],
  transitions: TransitionDecision[],
  profile: FormatEditorialProfile
): AudioMixDecision[] {
  const decisions: AudioMixDecision[] = [];
  const totalDuration = timecodes.length > 0
    ? timecodes[timecodes.length - 1].end
    : 0;

  if (totalDuration === 0) return decisions;

  // Build a volume envelope for the entire music track
  const keyframes: VolumeKeyframe[] = [];

  // Start: fade in from silence
  keyframes.push({ time: 0, volume: 0, curve: 'exponential' });
  keyframes.push({ time: 1.0, volume: musicLevelForSection(shots, 0, profile), curve: 'exponential' });

  // Walk through each shot and adjust music level
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const tc = timecodes[i];

    if (shot.hasDialogue && shot.dialogueDurationSeconds) {
      // ── Dialogue Ducking ──
      // Duck music BEFORE dialogue starts (anticipatory duck)
      const duckLeadIn = profile.dialoguePadding.preSec + 0.2;
      const duckRelease = profile.dialoguePadding.postSec + 0.3;
      const dialogueEnd = tc.start + shot.dialogueDurationSeconds;

      keyframes.push({
        time: Math.max(0, tc.start - duckLeadIn),
        volume: musicLevelForSection(shots, i, profile),
        curve: 'exponential',
      });
      keyframes.push({
        time: tc.start,
        volume: MUSIC_UNDER_DIALOGUE,
        curve: 'exponential',
      });
      keyframes.push({
        time: dialogueEnd,
        volume: MUSIC_UNDER_DIALOGUE,
        curve: 'linear',
      });
      keyframes.push({
        time: Math.min(totalDuration, dialogueEnd + duckRelease),
        volume: musicLevelForSection(shots, i + 1, profile),
        curve: 'exponential',
      });
    }

    // ── Musical Risers before Act Breaks ──
    const transition = transitions.find(t => t.betweenShots[0] === i);
    if (transition && isActBreakTransition(transition)) {
      const riserStart = Math.max(0, tc.end - 3.0);
      keyframes.push({ time: riserStart, volume: MUSIC_FULL, curve: 'linear' });
      keyframes.push({ time: tc.end - 0.5, volume: MUSIC_RISER, curve: 'exponential' });
      // Brief impact silence at the cut
      keyframes.push({ time: tc.end, volume: MUSIC_IMPACT, curve: 'exponential' });
      // Rebuild after break
      keyframes.push({ time: tc.end + 1.5, volume: MUSIC_UNDER_DIALOGUE, curve: 'exponential' });
    }

    // ── Swell before reveals ──
    // A close_up following a wide/establishing = reveal moment
    if (isRevealMoment(shot, shots[i - 1])) {
      const swellStart = Math.max(0, tc.start - 1.0);
      keyframes.push({ time: swellStart, volume: MUSIC_FULL, curve: 'linear' });
      keyframes.push({ time: tc.start - 0.1, volume: MUSIC_RISER * 0.7, curve: 'exponential' });
      keyframes.push({ time: tc.start + 0.3, volume: MUSIC_FULL * 0.6, curve: 'exponential' });
    }
  }

  // End: fade out to silence
  keyframes.push({ time: Math.max(0, totalDuration - 2.0), volume: MUSIC_FULL * 0.5, curve: 'linear' });
  keyframes.push({ time: totalDuration, volume: 0, curve: 'exponential' });

  // Deduplicate and sort keyframes
  const cleaned = deduplicateKeyframes(keyframes);

  decisions.push({
    timelineStart: 0,
    timelineEnd: totalDuration,
    track: 'music',
    volumeKeyframes: cleaned,
    rationale: 'Music envelope: ducks under dialogue, rises at act breaks, swells before reveals',
  });

  return decisions;
}

// ── Room Tone Fills ───────────────────────────────────────────

function buildRoomToneFills(
  shots: EditorialShot[],
  timecodes: { start: number; end: number }[],
  _dialogueMix: AudioMixDecision[],
  _profile: FormatEditorialProfile
): AudioMixDecision[] {
  const decisions: AudioMixDecision[] = [];
  const totalDuration = timecodes.length > 0
    ? timecodes[timecodes.length - 1].end
    : 0;

  if (totalDuration === 0) return decisions;

  // Room tone runs continuously — it's the "floor" that prevents
  // digital silence (which sounds broken to viewers)
  decisions.push({
    timelineStart: 0,
    timelineEnd: totalDuration,
    track: 'room_tone',
    volumeKeyframes: [
      { time: 0, volume: 0, curve: 'linear' },
      { time: 0.5, volume: ROOM_TONE_LEVEL, curve: 'exponential' },
      { time: totalDuration - 0.5, volume: ROOM_TONE_LEVEL, curve: 'linear' },
      { time: totalDuration, volume: 0, curve: 'exponential' },
    ],
    rationale: 'Continuous room tone prevents digital silence — always audible as ambient bed',
  });

  // ── Silence-as-a-Tool: intentional dips before critical dialogue ──
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const tc = timecodes[i];
    const prev = shots[i - 1];

    // If previous shot was high-energy (fast movement, establishing)
    // and current is a close-up with important dialogue — create a brief "pocket"
    if (
      shot.hasDialogue &&
      shot.shotType === 'close_up' &&
      prev &&
      (prev.cameraMovement !== 'static' || prev.shotType === 'establishing_shot')
    ) {
      const silenceStart = Math.max(0, tc.start - 0.3);
      decisions.push({
        timelineStart: silenceStart,
        timelineEnd: tc.start + 0.1,
        track: 'room_tone',
        volumeKeyframes: [
          { time: 0, volume: ROOM_TONE_LEVEL, curve: 'exponential' },
          { time: 0.15, volume: ROOM_TONE_LEVEL * 0.3, curve: 'exponential' },
          { time: 0.35, volume: ROOM_TONE_LEVEL * 0.3, curve: 'linear' },
          { time: 0.4, volume: ROOM_TONE_LEVEL, curve: 'exponential' },
        ],
        rationale: `Silence pocket before shot ${shot.shotNumber} dialogue — the quiet makes the words louder`,
      });
    }
  }

  return decisions;
}

// ── Helpers ───────────────────────────────────────────────────

function musicLevelForSection(
  shots: EditorialShot[],
  shotIndex: number,
  _profile: FormatEditorialProfile
): number {
  const shot = shots[shotIndex];
  if (!shot) return MUSIC_FULL;

  // During dialogue: ducked
  if (shot.hasDialogue) return MUSIC_UNDER_DIALOGUE;

  // Establishing/wide shots: music can be prominent
  if (shot.shotType === 'establishing_shot' || shot.shotType === 'wide_shot') {
    return MUSIC_FULL;
  }

  // Default: moderate level
  return MUSIC_FULL * 0.7;
}

function isActBreakTransition(transition: TransitionDecision): boolean {
  return transition.rationale.toLowerCase().includes('act break');
}

function isRevealMoment(current: EditorialShot, prev: EditorialShot | undefined): boolean {
  if (!prev) return false;
  const prevIsWide = prev.shotType === 'establishing_shot' || prev.shotType === 'wide_shot';
  const currentIsClose = current.shotType === 'close_up' || current.shotType === 'extreme_close_up';
  return prevIsWide && currentIsClose;
}

function deduplicateKeyframes(keyframes: VolumeKeyframe[]): VolumeKeyframe[] {
  // Sort by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Remove keyframes that are too close together (< 0.05s)
  const result: VolumeKeyframe[] = [];
  for (const kf of sorted) {
    const last = result[result.length - 1];
    if (last && Math.abs(kf.time - last.time) < 0.05) {
      // Keep the one that's more extreme (further from 0.5)
      if (Math.abs(kf.volume - 0.5) > Math.abs(last.volume - 0.5)) {
        result[result.length - 1] = kf;
      }
      continue;
    }
    result.push(kf);
  }

  return result;
}
