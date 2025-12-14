import { supabase } from '../lib/supabase';
import { calculateCreatorCosts, type CreatorCostBreakdown } from './creatorCostCalculationService';

export interface CostConfig {
  id: string;
  series_id: string | null;
  config_name: string;
  cost_per_minute_ai: number;
  cost_per_minute_traditional: number;
  cost_per_act: number;
  cost_per_scene: number;
  cost_per_character: number;
  cost_per_voice_line: number;
  complexity_multiplier_simple: number;
  complexity_multiplier_medium: number;
  complexity_multiplier_complex: number;
  video_generation_cost_per_minute?: number;
  video_generation_provider?: string;
  video_generation_quality_tier?: string;
  human_editing_cost_per_minute?: number;
  human_scene_setup_cost_per_minute?: number;
  human_character_qc_cost_per_minute?: number;
  human_render_supervision_cost_per_minute?: number;
  human_voice_direction_cost_per_session?: number;
  human_revision_rate_percentage?: number;
  asset_decay_rate?: number;
  asset_decay_floor?: number;
  human_cost_profile?: string;
}

export type HumanCostProfile = 'lean' | 'standard' | 'broadcast';

export interface HumanCostProfileSettings {
  name: string;
  description: string;
  editingCostPerMinute: number;
  sceneSetupCostPerMinute: number;
  characterQCCostPerMinute: number;
  renderSupervisionCostPerMinute: number;
  voiceDirectionCostPerSession: number;
  revisionRatePercentage: number;
  decayRate: number;
  decayFloor: number;
}

export const HUMAN_COST_PROFILES: Record<HumanCostProfile, HumanCostProfileSettings> = {
  lean: {
    name: 'Lean Production',
    description: 'Lower overhead, aggressive efficiency gains, smaller teams',
    editingCostPerMinute: 25,
    sceneSetupCostPerMinute: 12,
    characterQCCostPerMinute: 5,
    renderSupervisionCostPerMinute: 8,
    voiceDirectionCostPerSession: 125,
    revisionRatePercentage: 12,
    decayRate: 0.90,
    decayFloor: 0.30,
  },
  standard: {
    name: 'Standard Production',
    description: 'Industry-standard oversight, balanced efficiency gains',
    editingCostPerMinute: 40,
    sceneSetupCostPerMinute: 18,
    characterQCCostPerMinute: 8,
    renderSupervisionCostPerMinute: 12,
    voiceDirectionCostPerSession: 175,
    revisionRatePercentage: 18,
    decayRate: 0.93,
    decayFloor: 0.35,
  },
  broadcast: {
    name: 'Broadcast Quality',
    description: 'Premium oversight, conservative efficiency, higher QC standards',
    editingCostPerMinute: 65,
    sceneSetupCostPerMinute: 30,
    characterQCCostPerMinute: 12,
    renderSupervisionCostPerMinute: 18,
    voiceDirectionCostPerSession: 275,
    revisionRatePercentage: 22,
    decayRate: 0.95,
    decayFloor: 0.45,
  },
};

export interface HumanCostBreakdown {
  editingCost: number;
  sceneSetupCost: number;
  characterQCCost: number;
  renderSupervisionCost: number;
  voiceDirectionCost: number;
  revisionCost: number;
  decayMultiplier: number;
  episodeNumber: number;
  baseCostBeforeDecay: number;
  totalHumanCost: number;
  decayingCosts: number;
  flatCosts: number;
}

export interface ScriptData {
  runtime_minutes: number;
  acts: Array<{
    scenes: Array<{
      dialogue: Array<{ character: string; line: string }>;
      description?: string;
    }>;
  }>;
  unique_characters: string[];
}

export interface CostBreakdown {
  baseCost: number;
  actsCost: number;
  scenesCost: number;
  charactersCost: number;
  voicesCost: number;
  videoGenerationCost: number;
  lipSyncCost?: number;
  complexityAdjustment: number;
  humanCosts?: HumanCostBreakdown;
  totalCost: number;
}

export interface CostComparison {
  aiCost: CostBreakdown;
  traditionalCost: CostBreakdown;
  creatorCost?: CreatorCostBreakdown;
  savings: number;
  savingsPercentage: number;
  savingsVsCreator?: number;
  savingsVsCreatorPercentage?: number;
}

async function getCostConfig(seriesId: string | null): Promise<CostConfig> {
  let config: CostConfig | null = null;

  if (seriesId) {
    const { data } = await supabase
      .from('production_cost_config')
      .select('*')
      .eq('series_id', seriesId)
      .maybeSingle();
    config = data;
  }

  if (!config) {
    const { data } = await supabase
      .from('production_cost_config')
      .select('*')
      .is('series_id', null)
      .maybeSingle();
    config = data;
  }

  if (!config) {
    throw new Error('No cost configuration found. Please set up cost configuration first.');
  }

  return config;
}

function calculateComplexityMultiplier(
  sceneDescription: string | undefined,
  config: CostConfig
): number {
  if (!sceneDescription) return config.complexity_multiplier_medium;

  const desc = sceneDescription.toLowerCase();
  const complexKeywords = ['multiple', 'complex', 'elaborate', 'intricate', 'detailed', 'dynamic', 'action'];
  const simpleKeywords = ['simple', 'basic', 'minimal', 'static', 'single'];

  const hasComplexKeywords = complexKeywords.some(keyword => desc.includes(keyword));
  const hasSimpleKeywords = simpleKeywords.some(keyword => desc.includes(keyword));

  if (hasComplexKeywords) return config.complexity_multiplier_complex;
  if (hasSimpleKeywords) return config.complexity_multiplier_simple;
  return config.complexity_multiplier_medium;
}

export function calculateDecayMultiplier(
  episodeNumber: number,
  decayRate: number,
  decayFloor: number
): number {
  if (episodeNumber <= 1) return 1.0;
  const rawDecay = Math.pow(decayRate, episodeNumber - 1);
  return Math.max(decayFloor, rawDecay);
}

export function calculateHumanCosts(
  runtimeMinutes: number,
  config: CostConfig,
  episodeNumber: number = 1
): HumanCostBreakdown {
  const editingRate = config.human_editing_cost_per_minute ?? 40;
  const sceneSetupRate = config.human_scene_setup_cost_per_minute ?? 18;
  const characterQCRate = config.human_character_qc_cost_per_minute ?? 8;
  const renderSupervisionRate = config.human_render_supervision_cost_per_minute ?? 12;
  const voiceDirectionPerSession = config.human_voice_direction_cost_per_session ?? 175;
  const revisionRatePercent = config.human_revision_rate_percentage ?? 18;
  const decayRate = config.asset_decay_rate ?? 0.93;
  const decayFloor = config.asset_decay_floor ?? 0.35;

  const decayMultiplier = calculateDecayMultiplier(episodeNumber, decayRate, decayFloor);

  const baseEditingCost = runtimeMinutes * editingRate;
  const baseSceneSetupCost = runtimeMinutes * sceneSetupRate;
  const baseCharacterQCCost = runtimeMinutes * characterQCRate;

  const editingCost = baseEditingCost * decayMultiplier;
  const sceneSetupCost = baseSceneSetupCost * decayMultiplier;
  const characterQCCost = baseCharacterQCCost * decayMultiplier;

  const renderSupervisionCost = runtimeMinutes * renderSupervisionRate;
  const voiceDirectionCost = voiceDirectionPerSession;

  const revisionBase = editingCost * (revisionRatePercent / 100);
  const flatRevisionPortion = 0.3;
  const revisionCost = (revisionBase * flatRevisionPortion) + (revisionBase * (1 - flatRevisionPortion) * decayMultiplier);

  const decayingCosts = editingCost + sceneSetupCost + characterQCCost + (revisionBase * (1 - flatRevisionPortion) * decayMultiplier);
  const flatCosts = renderSupervisionCost + voiceDirectionCost + (revisionBase * flatRevisionPortion);

  const baseCostBeforeDecay = (baseEditingCost + baseSceneSetupCost + baseCharacterQCCost) +
    renderSupervisionCost + voiceDirectionCost +
    (baseEditingCost * (revisionRatePercent / 100));

  const totalHumanCost = editingCost + sceneSetupCost + characterQCCost +
    renderSupervisionCost + voiceDirectionCost + revisionCost;

  return {
    editingCost,
    sceneSetupCost,
    characterQCCost,
    renderSupervisionCost,
    voiceDirectionCost,
    revisionCost,
    decayMultiplier,
    episodeNumber,
    baseCostBeforeDecay,
    totalHumanCost,
    decayingCosts,
    flatCosts,
  };
}

export function calculateSeasonHumanCosts(
  runtimeMinutes: number,
  config: CostConfig,
  totalEpisodes: number
): { perEpisodeCosts: HumanCostBreakdown[]; totalSeasonCost: number; averageCostPerEpisode: number } {
  const perEpisodeCosts: HumanCostBreakdown[] = [];
  let totalSeasonCost = 0;

  for (let ep = 1; ep <= totalEpisodes; ep++) {
    const episodeCost = calculateHumanCosts(runtimeMinutes, config, ep);
    perEpisodeCosts.push(episodeCost);
    totalSeasonCost += episodeCost.totalHumanCost;
  }

  return {
    perEpisodeCosts,
    totalSeasonCost,
    averageCostPerEpisode: totalSeasonCost / totalEpisodes,
  };
}

export function getDecayCurvePreview(
  decayRate: number,
  decayFloor: number,
  milestones: number[] = [1, 5, 10, 20, 50]
): { episode: number; multiplier: number; percentage: number }[] {
  return milestones.map(episode => {
    const multiplier = calculateDecayMultiplier(episode, decayRate, decayFloor);
    return {
      episode,
      multiplier,
      percentage: Math.round(multiplier * 100),
    };
  });
}

function calculateAICost(
  scriptData: ScriptData,
  config: CostConfig,
  episodeNumber: number = 1,
  includeHumanCosts: boolean = true
): CostBreakdown {
  const actCount = scriptData.acts.length;
  const sceneCount = scriptData.acts.reduce((sum, act) => sum + act.scenes.length, 0);
  const dialogueCount = scriptData.acts.reduce(
    (sum, act) => sum + act.scenes.reduce(
      (sceneSum, scene) => sceneSum + scene.dialogue.length,
      0
    ),
    0
  );

  const baseCost = scriptData.runtime_minutes * config.cost_per_minute_ai;
  const actsCost = actCount * config.cost_per_act;
  const scenesCost = sceneCount * config.cost_per_scene;
  const charactersCost = scriptData.unique_characters.length * config.cost_per_character;
  const voicesCost = dialogueCount * config.cost_per_voice_line;
  const videoGenerationCost = scriptData.runtime_minutes * (config.video_generation_cost_per_minute || 45);

  let complexityAdjustment = 0;
  scriptData.acts.forEach(act => {
    act.scenes.forEach(scene => {
      const multiplier = calculateComplexityMultiplier(scene.description, config);
      const sceneCost = config.cost_per_scene;
      complexityAdjustment += sceneCost * (multiplier - 1);
    });
  });

  const humanCosts = includeHumanCosts
    ? calculateHumanCosts(scriptData.runtime_minutes, config, episodeNumber)
    : undefined;

  const aiOnlyCost = baseCost + actsCost + scenesCost + charactersCost + voicesCost + videoGenerationCost + complexityAdjustment;
  const totalCost = aiOnlyCost + (humanCosts?.totalHumanCost ?? 0);

  return {
    baseCost,
    actsCost,
    scenesCost,
    charactersCost,
    voicesCost,
    videoGenerationCost,
    complexityAdjustment,
    humanCosts,
    totalCost,
  };
}

function calculateTraditionalCost(scriptData: ScriptData, config: CostConfig): CostBreakdown {
  const actCount = scriptData.acts.length;
  const sceneCount = scriptData.acts.reduce((sum, act) => sum + act.scenes.length, 0);

  const baseCost = scriptData.runtime_minutes * config.cost_per_minute_traditional;
  const actsCost = actCount * config.cost_per_act * 3;
  const scenesCost = sceneCount * config.cost_per_scene * 4;
  const charactersCost = scriptData.unique_characters.length * config.cost_per_character * 5;
  const voicesCost = 0;
  const videoGenerationCost = 0;

  const complexityAdjustment = scenesCost * 0.5;

  const totalCost = baseCost + actsCost + scenesCost + charactersCost + voicesCost + videoGenerationCost + complexityAdjustment;

  return {
    baseCost,
    actsCost,
    scenesCost,
    charactersCost,
    voicesCost,
    videoGenerationCost,
    complexityAdjustment,
    totalCost,
  };
}

export async function calculateProductionCosts(
  scriptData: ScriptData,
  seriesId: string | null,
  includeCreatorCosts: boolean = false,
  episodeNumber: number = 1,
  includeHumanCosts: boolean = true
): Promise<CostComparison> {
  const config = await getCostConfig(seriesId);

  const aiCost = calculateAICost(scriptData, config, episodeNumber, includeHumanCosts);
  const traditionalCost = calculateTraditionalCost(scriptData, config);

  const savings = traditionalCost.totalCost - aiCost.totalCost;
  const savingsPercentage = (savings / traditionalCost.totalCost) * 100;

  let creatorCost: CreatorCostBreakdown | undefined;
  let savingsVsCreator: number | undefined;
  let savingsVsCreatorPercentage: number | undefined;

  if (includeCreatorCosts) {
    try {
      creatorCost = await calculateCreatorCosts(seriesId);
      savingsVsCreator = creatorCost.metrics.totalCreatorCost - aiCost.totalCost;
      savingsVsCreatorPercentage = (savingsVsCreator / creatorCost.metrics.totalCreatorCost) * 100;
    } catch (error) {
      console.error('Error calculating creator costs:', error);
    }
  }

  return {
    aiCost,
    traditionalCost,
    creatorCost,
    savings,
    savingsPercentage,
    savingsVsCreator,
    savingsVsCreatorPercentage,
  };
}

export async function updateCostConfig(
  configId: string,
  updates: Partial<CostConfig>
): Promise<void> {
  const { error } = await supabase
    .from('production_cost_config')
    .update(updates)
    .eq('id', configId);

  if (error) throw error;
}

export async function createSeriesCostConfig(
  seriesId: string,
  configName: string,
  configData: Partial<CostConfig>
): Promise<string> {
  const { data, error } = await supabase
    .from('production_cost_config')
    .insert([{
      series_id: seriesId,
      config_name: configName,
      ...configData,
    }])
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function fetchCostConfig(seriesId: string | null): Promise<CostConfig> {
  return getCostConfig(seriesId);
}
