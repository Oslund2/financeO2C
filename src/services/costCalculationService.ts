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
  complexityAdjustment: number;
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

function calculateAICost(scriptData: ScriptData, config: CostConfig): CostBreakdown {
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
  const videoGenerationCost = scriptData.runtime_minutes * (config.video_generation_cost_per_minute || 120);

  let complexityAdjustment = 0;
  scriptData.acts.forEach(act => {
    act.scenes.forEach(scene => {
      const multiplier = calculateComplexityMultiplier(scene.description, config);
      const sceneCost = config.cost_per_scene;
      complexityAdjustment += sceneCost * (multiplier - 1);
    });
  });

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
  includeCreatorCosts: boolean = false
): Promise<CostComparison> {
  const config = await getCostConfig(seriesId);

  const aiCost = calculateAICost(scriptData, config);
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
