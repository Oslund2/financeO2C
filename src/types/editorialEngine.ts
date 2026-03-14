// ─────────────────────────────────────────────────────────────
// Editorial Intelligence Engine — Type Definitions
// ─────────────────────────────────────────────────────────────

import type { FormatType } from './formatConfig';

// ── Format Editorial Profile ──────────────────────────────────

export type ActBreakStyle = 'hard_fade' | 'soft_dissolve' | 'smash_cut' | 'music_sting';
export type EndingStyle = 'fade_to_black' | 'hard_out' | 'cliffhanger_cut' | 'tag_scene';
export type TitleCardPlacement = 'pre_cold_open' | 'post_cold_open' | 'none';
export type MusicBehavior = 'wall_to_wall' | 'scored_sections' | 'source_only' | 'none';
export type BreakBumperStyle = 'sting' | 'fade' | 'logo_card' | null;
export type ReturnFromBreakStyle = 'recap_shot' | 'establishing' | 'cold_resume';

export interface PacingKeyframe {
  /** Normalized position in runtime (0.0 = start, 1.0 = end) */
  time: number;
  /** Intensity level (0.0 = very calm, 1.0 = maximum energy) */
  intensity: number;
}

export interface FormatEditorialProfile {
  formatType: FormatType;
  name: string;

  // Structural rules
  coldOpen: boolean;
  titleCardPlacement: TitleCardPlacement;
  actBreakStyle: ActBreakStyle;
  endingStyle: EndingStyle;

  // Pacing envelope (normalized 0–1 over runtime)
  pacingCurve: PacingKeyframe[];

  // Cut rate ranges (cuts per minute)
  cutRateRange: { min: number; max: number };

  // Transition budget (% of transitions allowed to be non-cuts)
  transitionBudget: number;

  // Audio rules
  musicBehavior: MusicBehavior;
  dialoguePadding: { preSec: number; postSec: number };
  silenceThresholdSec: number;

  // Break handling
  breakBumperStyle: BreakBumperStyle;
  returnFromBreakStyle: ReturnFromBreakStyle;
}

// ── Shot Metadata (editorial view) ────────────────────────────

export type ShotType =
  | 'establishing_shot' | 'wide_shot' | 'medium_shot'
  | 'close_up' | 'extreme_close_up' | 'over_the_shoulder'
  | 'two_shot' | 'reaction_shot';

export type CameraAngle =
  | 'eye_level' | 'high_angle' | 'low_angle'
  | 'dutch_angle' | 'aerial' | 'birds_eye';

export type CameraMovement =
  | 'static' | 'pan' | 'tilt' | 'dolly' | 'track' | 'zoom';

export interface EditorialShot {
  id: string;
  shotNumber: number;
  actNumber: number;
  sceneNumber: number;

  shotType: ShotType;
  cameraAngle: CameraAngle;
  cameraMovement: CameraMovement;
  durationSeconds: number;

  hasDialogue: boolean;
  dialogueContent?: DialogueLine[];
  dialogueAudioUrl?: string;
  dialogueDurationSeconds?: number;

  characters: string[];
  location: string;
  narrativeDescription: string;

  // Asset sources (priority: lipsync > veo3 > still)
  videoUrl?: string;
  imageUrl?: string;
  sourceType: 'lipsync' | 'veo3' | 'still' | 'missing';
}

export interface DialogueLine {
  character: string;
  text: string;
  emotion?: string;
}

// ── Edit Decision List (EDL) ──────────────────────────────────

export type TransitionType =
  | 'cut' | 'dissolve' | 'fade_black' | 'fade_white'
  | 'wipe' | 'j_cut' | 'l_cut' | 'dip_to_black';

export type AudioTrack = 'dialogue' | 'music' | 'sfx' | 'room_tone';
export type VolumeCurve = 'linear' | 'exponential' | 'scurve';
export type FilterType = 'vignette' | 'deshake' | 'loudnorm' | 'colorgrade' | 'zoompan' | 'eq';

export interface VolumeKeyframe {
  /** Time in seconds relative to the decision's timeline position */
  time: number;
  /** Volume level (0.0 = silent, 1.0 = unity) */
  volume: number;
  curve: VolumeCurve;
}

export interface MotionKeyframe {
  /** Time in seconds relative to the decision's timeline position */
  time: number;
  scale: number;
  x: number;
  y: number;
}

export interface EditDecision {
  id: string;
  type: 'clip' | 'transition' | 'audio_keyframe' | 'video_keyframe' | 'filter';
  timelinePosition: number;
  duration: number;

  // For clips
  sourceShot?: EditorialShot;
  sourceTrimIn?: number;
  sourceTrimOut?: number;

  // For transitions
  transitionType?: TransitionType;
  transitionDuration?: number;

  // For audio
  audioTrack?: AudioTrack;
  volumeKeyframes?: VolumeKeyframe[];

  // For video keyframes (Ken Burns, emphasis zoom)
  motionKeyframes?: MotionKeyframe[];

  // For filters
  filterType?: FilterType;
  filterParams?: Record<string, number | string>;

  // Metadata
  rationale: string;
  overrideable: boolean;
}

export interface EditDecisionList {
  id: string;
  episodeId: string;
  assemblyType: 'rough_cut' | 'final_cut' | 'trailer' | 'preview';
  formatProfile: FormatEditorialProfile;
  decisions: EditDecision[];
  totalDurationSeconds: number;
  createdAt: string;

  // Stats
  totalCuts: number;
  transitionsUsed: Record<TransitionType, number>;
  averageCutRateCPM: number;
  peakIntensity: number;
}

// ── Cut Logic Engine types ────────────────────────────────────

export type CutReason =
  | 'dialogue_turn'
  | 'action_completion'
  | 'establishing_hold'
  | 'emotional_hold'
  | 'match_cut'
  | 'scene_reset'
  | 'pacing_trim'
  | 'act_break';

export interface CutPoint {
  afterShotIndex: number;
  reason: CutReason;
  trimEndSeconds?: number;
  trimStartNextSeconds?: number;
  preLapAudioSeconds?: number;
}

// ── Transition Selector types ─────────────────────────────────

export interface TransitionDecision {
  betweenShots: [number, number];
  type: TransitionType;
  durationSeconds: number;
  audioOverlap?: {
    type: 'j_cut' | 'l_cut';
    overlapSeconds: number;
  };
  rationale: string;
}

// ── Audio Mix Engine types ────────────────────────────────────

export interface AudioMixDecision {
  timelineStart: number;
  timelineEnd: number;
  track: AudioTrack;
  volumeKeyframes: VolumeKeyframe[];
  rationale: string;
}

export interface AudioMixPlan {
  dialogueMix: AudioMixDecision[];
  musicMix: AudioMixDecision[];
  roomToneFills: AudioMixDecision[];
  targetLUFS: number;
  targetTruePeak: number;
}

// ── Keyframe Engine types ─────────────────────────────────────

export interface KeyframeDecision {
  shotIndex: number;
  motionKeyframes: MotionKeyframe[];
  filters: { type: FilterType; params: Record<string, number | string> }[];
  rationale: string;
}

// ── Pacing Engine types ───────────────────────────────────────

export interface PacingAnalysis {
  overallPacingCurve: PacingKeyframe[];
  shotAdjustments: {
    shotIndex: number;
    originalDuration: number;
    adjustedDuration: number;
    intensityAtPosition: number;
  }[];
  estimatedCPM: number;
}

// ── FFmpeg Command Builder types ──────────────────────────────

export interface FFmpegFilterNode {
  filterId: string;
  filterName: string;
  inputs: string[];
  outputs: string[];
  params: Record<string, string | number>;
}

export interface FFmpegCommand {
  inputs: { path: string; options?: string[] }[];
  filterComplex?: FFmpegFilterNode[];
  outputOptions: string[];
  outputPath: string;
}

export interface RenderStage {
  name: string;
  description: string;
  commands: FFmpegCommand[];
  estimatedDurationMs: number;
}

export interface RenderPlan {
  stages: RenderStage[];
  totalEstimatedDurationMs: number;
  outputFormat: string;
  outputResolution: string;
}

// ── Editor UI State ───────────────────────────────────────────

export interface EditorState {
  edl: EditDecisionList | null;
  renderPlan: RenderPlan | null;
  isGeneratingEDL: boolean;
  isRendering: boolean;
  renderProgress: number;
  currentStage: string;
  previewUrl: string | null;
  outputUrl: string | null;
  selectedDecisionId: string | null;
  overrides: Map<string, Partial<EditDecision>>;
}
