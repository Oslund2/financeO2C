/**
 * Autopilot Decision Engine
 *
 * Derives every creative and technical decision from three user inputs:
 * 1. Format type (streaming, broadcast, short_form, etc.)
 * 2. Target runtime in minutes
 * 3. Quality preset (fast, balanced, max_quality)
 */

export type QualityPreset = 'fast' | 'balanced' | 'max_quality';
export type FormatType = 'streaming' | 'broadcast' | 'short_form' | 'medium_form' | 'spot';
export type Pacing = 'fast' | 'medium' | 'slow';

export interface AutopilotDecisions {
  // Script
  scriptTemperature: number;
  scriptMaxTokens: number;

  // Shot planning
  pacing: Pacing;
  averageShotDuration: number;
  includeEstablishingShots: boolean;

  // Video generation
  veoModel: string;
  resolution: '720p' | '1080p';
  samplesPerShot: number;
  batchSize: number;
  generateAudio: boolean;

  // Audio
  voiceProvider: 'elevenlabs' | 'chatterbox';

  // Lip sync
  skipLipSyncForNonDialogue: boolean;

  // Assembly
  assemblyMethod: 'shotstack' | 'ffmpeg';
  formatProfile: FormatType;

  // Error tolerance
  maxRetriesPerShot: number;
  allowPartialAssembly: boolean;
}

export function deriveDecisions(
  formatType: FormatType,
  targetRuntimeMinutes: number,
  qualityPreset: QualityPreset
): AutopilotDecisions {
  // Script decisions
  const scriptTemperature = formatType === 'spot' ? 0.9
    : formatType === 'short_form' ? 0.8
    : 0.7;
  const scriptMaxTokens = formatType === 'spot' ? 2000
    : formatType === 'short_form' ? 4000
    : formatType === 'broadcast' ? 16000
    : 8000;

  // Pacing decisions
  let pacing: Pacing;
  let averageShotDuration: number;
  if (formatType === 'spot') {
    pacing = 'fast'; averageShotDuration = 3;
  } else if (targetRuntimeMinutes <= 2) {
    pacing = 'fast'; averageShotDuration = 4;
  } else if (targetRuntimeMinutes <= 10) {
    pacing = 'medium'; averageShotDuration = 6;
  } else {
    pacing = 'slow'; averageShotDuration = 7;
  }

  const includeEstablishingShots = formatType !== 'spot' && formatType !== 'short_form';

  // Video generation decisions
  let veoModel: string;
  let resolution: '720p' | '1080p';
  let samplesPerShot: number;
  let batchSize: number;
  switch (qualityPreset) {
    case 'fast':
      veoModel = 'veo-3.0-generate-001';
      resolution = '720p'; samplesPerShot = 1; batchSize = 4;
      break;
    case 'max_quality':
      veoModel = 'veo-3.1-generate-001';
      resolution = '1080p'; samplesPerShot = 2; batchSize = 2;
      break;
    default: // balanced
      veoModel = 'veo-3.1-generate-001';
      resolution = '720p'; samplesPerShot = 1; batchSize = 3;
  }

  // Assembly decisions
  const assemblyMethod = qualityPreset === 'fast' ? 'ffmpeg' as const : 'shotstack' as const;

  return {
    scriptTemperature,
    scriptMaxTokens,
    pacing,
    averageShotDuration,
    includeEstablishingShots,
    veoModel,
    resolution,
    samplesPerShot,
    batchSize,
    generateAudio: true,
    voiceProvider: 'elevenlabs',
    skipLipSyncForNonDialogue: true,
    assemblyMethod,
    formatProfile: formatType,
    maxRetriesPerShot: qualityPreset === 'fast' ? 1 : 2,
    allowPartialAssembly: true,
  };
}

/**
 * Estimate total pipeline time in minutes.
 */
export function estimatePipelineMinutes(
  targetRuntimeMinutes: number,
  qualityPreset: QualityPreset
): number {
  const shotEstimate = Math.ceil((targetRuntimeMinutes * 60) / 6);
  const baseMinutes = {
    fast: 10,
    balanced: 18,
    max_quality: 30,
  }[qualityPreset];
  // Add ~0.5 min per shot for rendering
  return baseMinutes + Math.ceil(shotEstimate * 0.5);
}
