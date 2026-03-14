// ─────────────────────────────────────────────────────────────
// Editorial Intelligence Engine — Public API
// ─────────────────────────────────────────────────────────────

export { generateEDL } from './editorialDecisionEngine';
export type { EditorialEngineInput, EditorialEngineResult } from './editorialDecisionEngine';

export {
  getFormatProfile,
  getAllFormatProfiles,
  createCustomProfile,
  samplePacingCurve,
  targetCutRate,
} from './formatProfileManager';

export { analyzeCuts } from './cutLogicEngine';
export { selectTransitions, countTransitions } from './transitionSelector';
export { generateAudioMixPlan } from './audioMixEngine';
export { generateKeyframeDecisions } from './keyframeEngine';
export { analyzePacing, validatePacing, generatePacingCurveFromStructure } from './pacingEngine';
export { buildRenderPlan, generateConcatList } from './ffmpegCommandBuilder';
