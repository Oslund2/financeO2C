import { supabase } from '../lib/supabase';

export interface CreatorCostConfig {
  id: string;
  series_id: string | null;
  config_name: string;
  scenes_per_episode: number;
  artists_per_scene: number;
  time_per_scene_hours: number;
  production_days: number;
  working_hours_per_day: number;
  artist_annual_salary: number;
  overhead_percentage: number;
  preproduction_percentage: number;
  postproduction_percentage: number;
  revision_buffer_percentage: number;
  project_management_percentage: number;
  software_cost_per_artist_monthly: number;
  equipment_cost_per_artist_monthly: number;
  studio_space_cost_per_artist_monthly: number;
}

export interface CreatorCostMetrics {
  totalSceneHours: number;
  scenesPerDay: number;
  artistsNeeded: number;
  totalProductionHours: number;
  artistHourlyRate: number;
  baseLaborCost: number;
  preproductionCost: number;
  postproductionCost: number;
  revisionCost: number;
  projectManagementCost: number;
  totalLaborCost: number;
  overheadCost: number;
  laborWithOverhead: number;
  softwareCost: number;
  equipmentCost: number;
  studioSpaceCost: number;
  totalFacilityCost: number;
  totalCreatorCost: number;
}

export interface CreatorCostBreakdown {
  config: CreatorCostConfig;
  metrics: CreatorCostMetrics;
  phaseBreakdown: {
    preproduction: { hours: number; cost: number; };
    production: { hours: number; cost: number; };
    postproduction: { hours: number; cost: number; };
    revision: { hours: number; cost: number; };
    projectManagement: { hours: number; cost: number; };
  };
  perArtistCosts: {
    monthlySalary: number;
    hourlySalary: number;
    monthlyFacilityCost: number;
    monthlyTotalCost: number;
  };
}

async function getCreatorCostConfig(seriesId: string | null): Promise<CreatorCostConfig> {
  let config: CreatorCostConfig | null = null;

  if (seriesId) {
    const { data } = await supabase
      .from('creator_cost_config')
      .select('*')
      .eq('series_id', seriesId)
      .maybeSingle();
    config = data;
  }

  if (!config) {
    const { data } = await supabase
      .from('creator_cost_config')
      .select('*')
      .is('series_id', null)
      .eq('config_name', 'Global Default Creator Cost Configuration')
      .maybeSingle();
    config = data;
  }

  if (!config) {
    throw new Error('No creator cost configuration found. Please set up creator cost configuration first.');
  }

  return config;
}

function calculateCreatorCostMetrics(config: CreatorCostConfig): CreatorCostMetrics {
  const totalSceneHours = config.scenes_per_episode * config.artists_per_scene * config.time_per_scene_hours;

  const totalProductionHoursAvailable = config.production_days * config.working_hours_per_day;

  const artistsNeeded = Math.ceil(totalSceneHours / totalProductionHoursAvailable);

  const totalProductionHours = artistsNeeded * totalProductionHoursAvailable;

  const artistHourlyRate = config.artist_annual_salary / 2080;

  const baseLaborCost = totalSceneHours * artistHourlyRate;

  const preproductionHours = totalSceneHours * (config.preproduction_percentage / 100);
  const preproductionCost = preproductionHours * artistHourlyRate;

  const postproductionHours = totalSceneHours * (config.postproduction_percentage / 100);
  const postproductionCost = postproductionHours * artistHourlyRate;

  const revisionHours = totalSceneHours * (config.revision_buffer_percentage / 100);
  const revisionCost = revisionHours * artistHourlyRate;

  const projectManagementHours = totalSceneHours * (config.project_management_percentage / 100);
  const projectManagementCost = projectManagementHours * artistHourlyRate;

  const totalLaborCost = baseLaborCost + preproductionCost + postproductionCost + revisionCost + projectManagementCost;

  const overheadCost = totalLaborCost * (config.overhead_percentage / 100);
  const laborWithOverhead = totalLaborCost + overheadCost;

  const totalProductionDays = config.production_days * (
    1 +
    (config.preproduction_percentage / 100) +
    (config.postproduction_percentage / 100) +
    (config.revision_buffer_percentage / 100) +
    (config.project_management_percentage / 100)
  );
  const monthsInProduction = totalProductionDays / 20;

  const softwareCost = artistsNeeded * config.software_cost_per_artist_monthly * monthsInProduction;
  const equipmentCost = artistsNeeded * config.equipment_cost_per_artist_monthly * monthsInProduction;
  const studioSpaceCost = artistsNeeded * config.studio_space_cost_per_artist_monthly * monthsInProduction;

  const totalFacilityCost = softwareCost + equipmentCost + studioSpaceCost;

  const totalCreatorCost = laborWithOverhead + totalFacilityCost;

  const scenesPerDay = (config.working_hours_per_day / config.time_per_scene_hours) / config.artists_per_scene;

  return {
    totalSceneHours,
    scenesPerDay,
    artistsNeeded,
    totalProductionHours,
    artistHourlyRate,
    baseLaborCost,
    preproductionCost,
    postproductionCost,
    revisionCost,
    projectManagementCost,
    totalLaborCost,
    overheadCost,
    laborWithOverhead,
    softwareCost,
    equipmentCost,
    studioSpaceCost,
    totalFacilityCost,
    totalCreatorCost,
  };
}

export async function calculateCreatorCosts(
  seriesId: string | null,
  overrides?: Partial<CreatorCostConfig>
): Promise<CreatorCostBreakdown> {
  const baseConfig = await getCreatorCostConfig(seriesId);

  const config: CreatorCostConfig = overrides
    ? { ...baseConfig, ...overrides }
    : baseConfig;

  const metrics = calculateCreatorCostMetrics(config);

  const phaseBreakdown = {
    preproduction: {
      hours: config.scenes_per_episode * config.artists_per_scene * config.time_per_scene_hours * (config.preproduction_percentage / 100),
      cost: metrics.preproductionCost,
    },
    production: {
      hours: config.scenes_per_episode * config.artists_per_scene * config.time_per_scene_hours,
      cost: metrics.baseLaborCost,
    },
    postproduction: {
      hours: config.scenes_per_episode * config.artists_per_scene * config.time_per_scene_hours * (config.postproduction_percentage / 100),
      cost: metrics.postproductionCost,
    },
    revision: {
      hours: config.scenes_per_episode * config.artists_per_scene * config.time_per_scene_hours * (config.revision_buffer_percentage / 100),
      cost: metrics.revisionCost,
    },
    projectManagement: {
      hours: config.scenes_per_episode * config.artists_per_scene * config.time_per_scene_hours * (config.project_management_percentage / 100),
      cost: metrics.projectManagementCost,
    },
  };

  const perArtistCosts = {
    monthlySalary: config.artist_annual_salary / 12,
    hourlySalary: metrics.artistHourlyRate,
    monthlyFacilityCost: config.software_cost_per_artist_monthly +
                         config.equipment_cost_per_artist_monthly +
                         config.studio_space_cost_per_artist_monthly,
    monthlyTotalCost: (config.artist_annual_salary / 12) +
                      config.software_cost_per_artist_monthly +
                      config.equipment_cost_per_artist_monthly +
                      config.studio_space_cost_per_artist_monthly,
  };

  return {
    config,
    metrics,
    phaseBreakdown,
    perArtistCosts,
  };
}

export async function getAllCreatorCostPresets(): Promise<CreatorCostConfig[]> {
  const { data, error } = await supabase
    .from('creator_cost_config')
    .select('*')
    .is('series_id', null)
    .order('config_name');

  if (error) throw error;
  return data || [];
}

export async function updateCreatorCostConfig(
  configId: string,
  updates: Partial<CreatorCostConfig>
): Promise<void> {
  const { error } = await supabase
    .from('creator_cost_config')
    .update(updates)
    .eq('id', configId);

  if (error) throw error;
}

export async function createSeriesCreatorCostConfig(
  seriesId: string,
  configName: string,
  configData: Partial<CreatorCostConfig>
): Promise<string> {
  const { data, error } = await supabase
    .from('creator_cost_config')
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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  }
  return `${hours.toFixed(1)} hours`;
}
