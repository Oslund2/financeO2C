import { supabase } from '../lib/supabase';
import {
  EpisodeProfitSettingsService,
  EpisodeProfitSettings,
  DistributionChannelSettings
} from './episodeProfitSettingsService';
import {
  CostConfig,
  HUMAN_COST_PROFILES,
  HumanCostProfile,
  calculateSeasonHumanCosts
} from './costCalculationService';

export interface PlatformFeeConfig {
  youtube: number;
  tiktok: number;
  instagram: number;
  ownedStreaming: number;
  linearTv: number;
  syndication: number;
}

export const DEFAULT_PLATFORM_FEES: PlatformFeeConfig = {
  youtube: 0.45,
  tiktok: 0.50,
  instagram: 0.45,
  ownedStreaming: 0,
  linearTv: 0,
  syndication: 0.35
};

export interface ChannelEconomics {
  channelId: string;
  channelName: string;
  enabled: boolean;
  buyingModel: 'cpm' | 'spot';
  cpmRate: number;
  impressionsPerRun: number;
  platformFeePercent: number;
  grossRevenuePerRun: number;
  netRevenuePerRun: number;
  annualGrossRevenue: number;
  annualNetRevenue: number;
  breakEvenImpressions: number;
}

export interface CostBreakdown {
  tokenCosts: number;
  humanLaborCosts: number;
  humanHoursEstimate: number;
  licensingCosts: number;
  dubbingCosts: number;
  totalInitialInvestment: number;
  amortizedCostPerYear: number;
  costPerRun: number;
  costPerFinishedMinute: number;
}

export interface BreakEvenAnalysis {
  totalInvestment: number;
  avgNetCpmAcrossChannels: number;
  breakEvenImpressions: number;
  breakEvenRuns: number;
  breakEvenMonths: number;
  breakEvenYears: number;
  channelBreakEven: Array<{
    channelName: string;
    impressionsNeeded: number;
    runsNeeded: number;
  }>;
}

export interface LifetimeProjection {
  yearsInService: number;
  totalRuns: number;
  grossLifetimeRevenue: number;
  netLifetimeRevenue: number;
  lifetimeProfit: number;
  lifetimeMargin: number;
  roiMultiple: number;
  yearlyBreakdown: Array<{
    year: number;
    retentionPercent: number;
    grossRevenue: number;
    netRevenue: number;
    cumulativeNetRevenue: number;
    cumulativeProfit: number;
  }>;
}

export interface EpisodeEconomics {
  episodeId: string;
  episodeTitle: string;
  format: {
    runtimeMinutes: number;
    contentMinutes: number;
    breaksCount: number;
    formatLabel: string;
  };
  costs: CostBreakdown;
  channels: ChannelEconomics[];
  totalAnnualGrossRevenue: number;
  totalAnnualNetRevenue: number;
  netRevenuePerRun: number;
  breakEven: BreakEvenAnalysis;
  lifetime: LifetimeProjection;
  hasCustomSettings: boolean;
  lastUpdated: string | null;
}

export interface EpisodeSummaryMetrics {
  episodeId: string;
  title: string;
  formatLabel: string;
  totalInvestment: number;
  netRevenuePerRun: number;
  breakEvenRuns: number;
  lifetimeProfit: number;
  roiMultiple: number;
  tokenCost: number;
  humanCost: number;
}

function getPlatformFeeForChannel(channelName: string): number {
  const name = channelName.toLowerCase();
  if (name.includes('youtube') || name.includes('social')) return DEFAULT_PLATFORM_FEES.youtube;
  if (name.includes('tiktok')) return DEFAULT_PLATFORM_FEES.tiktok;
  if (name.includes('instagram') || name.includes('reels')) return DEFAULT_PLATFORM_FEES.instagram;
  if (name.includes('o&o') || name.includes('owned')) return DEFAULT_PLATFORM_FEES.ownedStreaming;
  if (name.includes('tv') && !name.includes('syndic')) return DEFAULT_PLATFORM_FEES.linearTv;
  if (name.includes('syndic')) return DEFAULT_PLATFORM_FEES.syndication;
  return 0.30;
}

function getFormatLabel(runtimeMinutes: number, formatType: string): string {
  const formatLabels: Record<string, string> = {
    'broadcast': 'Broadcast',
    'streaming': 'Streaming',
    'short_form': 'Social Short',
    'medium_form': 'Digital',
    'custom': 'Custom'
  };
  const label = formatLabels[formatType] || 'Digital';
  return `${runtimeMinutes} min | ${label}`;
}

function estimateHumanHours(
  runtimeMinutes: number,
  profile: HumanCostProfile
): number {
  const profileSettings = HUMAN_COST_PROFILES[profile];
  const baseHoursPerMinute = {
    lean: 2.5,
    standard: 4,
    broadcast: 6
  }[profile];

  return runtimeMinutes * baseHoursPerMinute;
}

function calculateHumanCosts(
  runtimeMinutes: number,
  profile: HumanCostProfile,
  customRates: Record<string, number> | null
): { cost: number; hours: number } {
  const profileSettings = HUMAN_COST_PROFILES[profile];

  const editingRate = customRates?.editingCostPerMinute ?? profileSettings.editingCostPerMinute;
  const sceneSetupRate = customRates?.sceneSetupCostPerMinute ?? profileSettings.sceneSetupCostPerMinute;
  const characterQCRate = customRates?.characterQCCostPerMinute ?? profileSettings.characterQCCostPerMinute;
  const renderSupervisionRate = customRates?.renderSupervisionCostPerMinute ?? profileSettings.renderSupervisionCostPerMinute;
  const voiceDirectionRate = customRates?.voiceDirectionCostPerSession ?? profileSettings.voiceDirectionCostPerSession;
  const revisionRate = customRates?.revisionRatePercentage ?? profileSettings.revisionRatePercentage;

  const baseCost =
    (editingRate * runtimeMinutes) +
    (sceneSetupRate * runtimeMinutes) +
    (characterQCRate * runtimeMinutes) +
    (renderSupervisionRate * runtimeMinutes) +
    voiceDirectionRate;

  const withRevisions = baseCost * (1 + revisionRate / 100);
  const hours = estimateHumanHours(runtimeMinutes, profile);

  return { cost: withRevisions, hours };
}

function calculateChannelEconomics(
  channel: DistributionChannelSettings,
  totalInvestment: number,
  runsPerYear: number
): ChannelEconomics {
  const platformFeePercent = getPlatformFeeForChannel(channel.name);

  let grossRevenuePerRun: number;
  if (channel.buyingModel === 'cpm') {
    grossRevenuePerRun = (channel.cpmRate * channel.impressionsPerRun) / 1000;
  } else {
    grossRevenuePerRun = channel.rate * 4;
  }

  const netRevenuePerRun = grossRevenuePerRun * (1 - platformFeePercent);
  const annualGrossRevenue = grossRevenuePerRun * runsPerYear;
  const annualNetRevenue = netRevenuePerRun * runsPerYear;

  const effectiveNetCpm = channel.impressionsPerRun > 0
    ? (netRevenuePerRun / channel.impressionsPerRun) * 1000
    : 0;
  const breakEvenImpressions = effectiveNetCpm > 0
    ? (totalInvestment / effectiveNetCpm) * 1000
    : Infinity;

  return {
    channelId: channel.id,
    channelName: channel.name,
    enabled: channel.enabled,
    buyingModel: channel.buyingModel,
    cpmRate: channel.cpmRate,
    impressionsPerRun: channel.impressionsPerRun,
    platformFeePercent: platformFeePercent * 100,
    grossRevenuePerRun,
    netRevenuePerRun,
    annualGrossRevenue,
    annualNetRevenue,
    breakEvenImpressions
  };
}

function calculateBreakEven(
  totalInvestment: number,
  channels: ChannelEconomics[],
  runsPerYear: number
): BreakEvenAnalysis {
  const enabledChannels = channels.filter(c => c.enabled);

  const totalNetRevenuePerRun = enabledChannels.reduce((sum, c) => sum + c.netRevenuePerRun, 0);
  const totalImpressions = enabledChannels.reduce((sum, c) => sum + c.impressionsPerRun, 0);

  const avgNetCpm = totalImpressions > 0
    ? (totalNetRevenuePerRun / totalImpressions) * 1000
    : 0;

  const breakEvenImpressions = avgNetCpm > 0
    ? (totalInvestment / avgNetCpm) * 1000
    : Infinity;

  const breakEvenRuns = totalNetRevenuePerRun > 0
    ? totalInvestment / totalNetRevenuePerRun
    : Infinity;

  const breakEvenMonths = runsPerYear > 0
    ? (breakEvenRuns / runsPerYear) * 12
    : Infinity;

  const channelBreakEven = enabledChannels.map(channel => {
    const runsNeeded = channel.netRevenuePerRun > 0
      ? totalInvestment / channel.netRevenuePerRun
      : Infinity;
    return {
      channelName: channel.channelName,
      impressionsNeeded: channel.breakEvenImpressions,
      runsNeeded
    };
  });

  return {
    totalInvestment,
    avgNetCpmAcrossChannels: avgNetCpm,
    breakEvenImpressions: isFinite(breakEvenImpressions) ? breakEvenImpressions : 0,
    breakEvenRuns: isFinite(breakEvenRuns) ? breakEvenRuns : 0,
    breakEvenMonths: isFinite(breakEvenMonths) ? breakEvenMonths : 0,
    breakEvenYears: isFinite(breakEvenMonths) ? breakEvenMonths / 12 : 0,
    channelBreakEven
  };
}

function calculateLifetimeProjection(
  totalInvestment: number,
  annualGrossRevenue: number,
  annualNetRevenue: number,
  runsPerYear: number,
  yearsInService: number,
  decayRatePercent: number,
  minimumRetentionPercent: number
): LifetimeProjection {
  const yearlyBreakdown: LifetimeProjection['yearlyBreakdown'] = [];
  let cumulativeNetRevenue = 0;
  let cumulativeProfit = -totalInvestment;

  for (let year = 1; year <= yearsInService; year++) {
    const retentionPercent = Math.max(
      100 - (year - 1) * decayRatePercent,
      minimumRetentionPercent
    );

    const yearGrossRevenue = annualGrossRevenue * (retentionPercent / 100);
    const yearNetRevenue = annualNetRevenue * (retentionPercent / 100);

    cumulativeNetRevenue += yearNetRevenue;
    cumulativeProfit += yearNetRevenue;

    yearlyBreakdown.push({
      year,
      retentionPercent,
      grossRevenue: yearGrossRevenue,
      netRevenue: yearNetRevenue,
      cumulativeNetRevenue,
      cumulativeProfit
    });
  }

  const grossLifetimeRevenue = yearlyBreakdown.reduce((sum, y) => sum + y.grossRevenue, 0);
  const netLifetimeRevenue = cumulativeNetRevenue;
  const lifetimeProfit = netLifetimeRevenue - totalInvestment;
  const lifetimeMargin = netLifetimeRevenue > 0 ? (lifetimeProfit / netLifetimeRevenue) * 100 : 0;
  const roiMultiple = totalInvestment > 0 ? netLifetimeRevenue / totalInvestment : 0;

  return {
    yearsInService,
    totalRuns: runsPerYear * yearsInService,
    grossLifetimeRevenue,
    netLifetimeRevenue,
    lifetimeProfit,
    lifetimeMargin,
    roiMultiple,
    yearlyBreakdown
  };
}

export class EpisodeEconomicsService {
  static async calculateEpisodeEconomics(
    episodeId: string,
    tokenCost: number = 0
  ): Promise<EpisodeEconomics | null> {
    const settings = await EpisodeProfitSettingsService.getSettings(episodeId);
    const defaults = await EpisodeProfitSettingsService.getEpisodeDefaults(episodeId);

    if (!defaults) {
      return null;
    }

    const runtimeMinutes = settings?.programLengthMinutes ?? defaults.programLengthMinutes;
    const contentMinutes = defaults.contentMinutes ?? runtimeMinutes * 0.73;
    const breaksCount = settings?.breaksPerEpisode ?? defaults.breaksPerEpisode;
    const runsPerYear = settings?.annualRunsPerEpisode ?? 4;
    const yearsInService = settings?.yearsInService ?? 5;
    const decayRatePercent = settings?.decayRatePercent ?? 10;
    const minimumRetentionPercent = settings?.minimumRetentionPercent ?? 20;

    const humanProfile = (settings?.humanCostProfile ?? 'standard') as HumanCostProfile;
    const enableHumanCosts = settings?.enableHumanCosts ?? true;

    const humanCostCalc = enableHumanCosts
      ? calculateHumanCosts(runtimeMinutes, humanProfile, settings?.customCostRates ?? null)
      : { cost: 0, hours: 0 };

    const episodeTokenCost = tokenCost || (defaults.estimatedCost ?? 0);

    const dubbingCosts = settings?.enableMultiLanguage
      ? (settings.enabledLanguages.length - 1) * (settings.dubbingTier === 'ai' ? 50 : settings.dubbingTier === 'bulk_professional' ? 200 : 500)
      : 0;

    const totalInitialInvestment = episodeTokenCost + humanCostCalc.cost + dubbingCosts;

    const costs: CostBreakdown = {
      tokenCosts: episodeTokenCost,
      humanLaborCosts: humanCostCalc.cost,
      humanHoursEstimate: humanCostCalc.hours,
      licensingCosts: 0,
      dubbingCosts,
      totalInitialInvestment,
      amortizedCostPerYear: yearsInService > 0 ? totalInitialInvestment / yearsInService : totalInitialInvestment,
      costPerRun: (runsPerYear * yearsInService) > 0 ? totalInitialInvestment / (runsPerYear * yearsInService) : totalInitialInvestment,
      costPerFinishedMinute: contentMinutes > 0 ? totalInitialInvestment / contentMinutes : 0
    };

    const channels = (settings?.distributionChannels ??
      EpisodeProfitSettingsService.getDefaultChannelsForEpisode(contentMinutes))
      .map(channel => calculateChannelEconomics(channel, totalInitialInvestment, runsPerYear));

    const enabledChannels = channels.filter(c => c.enabled);
    const totalAnnualGrossRevenue = enabledChannels.reduce((sum, c) => sum + c.annualGrossRevenue, 0);
    const totalAnnualNetRevenue = enabledChannels.reduce((sum, c) => sum + c.annualNetRevenue, 0);
    const netRevenuePerRun = enabledChannels.reduce((sum, c) => sum + c.netRevenuePerRun, 0);

    const breakEven = calculateBreakEven(totalInitialInvestment, channels, runsPerYear);

    const lifetime = calculateLifetimeProjection(
      totalInitialInvestment,
      totalAnnualGrossRevenue,
      totalAnnualNetRevenue,
      runsPerYear,
      yearsInService,
      decayRatePercent,
      minimumRetentionPercent
    );

    return {
      episodeId,
      episodeTitle: defaults.episodeTitle,
      format: {
        runtimeMinutes,
        contentMinutes,
        breaksCount,
        formatLabel: getFormatLabel(runtimeMinutes, defaults.formatType)
      },
      costs,
      channels,
      totalAnnualGrossRevenue,
      totalAnnualNetRevenue,
      netRevenuePerRun,
      breakEven,
      lifetime,
      hasCustomSettings: settings !== null,
      lastUpdated: settings?.updatedAt ?? null
    };
  }

  static async calculateSeriesEconomics(
    episodeIds: string[],
    tokenCosts: Record<string, number> = {}
  ): Promise<{
    episodes: EpisodeEconomics[];
    totals: {
      totalInvestment: number;
      totalAnnualNetRevenue: number;
      totalLifetimeProfit: number;
      averageRoiMultiple: number;
      seriesBreakEvenRuns: number;
      seriesBreakEvenMonths: number;
    };
  }> {
    const episodes: EpisodeEconomics[] = [];

    for (const episodeId of episodeIds) {
      const economics = await this.calculateEpisodeEconomics(
        episodeId,
        tokenCosts[episodeId] ?? 0
      );
      if (economics) {
        episodes.push(economics);
      }
    }

    const totalInvestment = episodes.reduce((sum, e) => sum + e.costs.totalInitialInvestment, 0);
    const totalAnnualNetRevenue = episodes.reduce((sum, e) => sum + e.totalAnnualNetRevenue, 0);
    const totalLifetimeProfit = episodes.reduce((sum, e) => sum + e.lifetime.lifetimeProfit, 0);
    const averageRoiMultiple = episodes.length > 0
      ? episodes.reduce((sum, e) => sum + e.lifetime.roiMultiple, 0) / episodes.length
      : 0;
    const seriesBreakEvenRuns = totalAnnualNetRevenue > 0
      ? totalInvestment / (totalAnnualNetRevenue / 4)
      : 0;
    const seriesBreakEvenMonths = seriesBreakEvenRuns * 3;

    return {
      episodes,
      totals: {
        totalInvestment,
        totalAnnualNetRevenue,
        totalLifetimeProfit,
        averageRoiMultiple,
        seriesBreakEvenRuns,
        seriesBreakEvenMonths
      }
    };
  }

  static getSummaryMetrics(economics: EpisodeEconomics): EpisodeSummaryMetrics {
    return {
      episodeId: economics.episodeId,
      title: economics.episodeTitle,
      formatLabel: economics.format.formatLabel,
      totalInvestment: economics.costs.totalInitialInvestment,
      netRevenuePerRun: economics.netRevenuePerRun,
      breakEvenRuns: economics.breakEven.breakEvenRuns,
      lifetimeProfit: economics.lifetime.lifetimeProfit,
      roiMultiple: economics.lifetime.roiMultiple,
      tokenCost: economics.costs.tokenCosts,
      humanCost: economics.costs.humanLaborCosts
    };
  }

  static formatCurrency(value: number): string {
    if (!isFinite(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  static formatNumber(value: number): string {
    if (!isFinite(value)) return '0';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return Math.round(value).toLocaleString();
  }

  static formatPercent(value: number): string {
    if (!isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
  }
}
