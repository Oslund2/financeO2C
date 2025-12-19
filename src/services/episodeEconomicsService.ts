import { supabase } from '../lib/supabase';
import {
  EpisodeProfitSettingsService,
  EpisodeProfitSettings,
  DistributionChannelSettings,
  ChannelDistributionType,
  isLinearChannel,
  isOnDemandChannel,
  getChannelAnnualImpressions,
  getChannelMonthlyImpressions
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
  channelType: ChannelDistributionType;
  enabled: boolean;
  buyingModel: 'cpm' | 'spot';
  cpmRate: number;
  impressionsPerAiring: number;
  airingsPerYear: number;
  monthlyProjectedViews: number;
  platformFeePercent: number;
  grossMonthlyRevenue: number;
  netMonthlyRevenue: number;
  annualGrossRevenue: number;
  annualNetRevenue: number;
  breakEvenImpressions: number;
  breakEvenMonths: number;
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
  breakEvenMonths: number;
  breakEvenYears: number;
  totalMonthlyNetRevenue: number;
  linearChannelBreakEven: Array<{
    channelName: string;
    impressionsNeeded: number;
    airingsNeeded: number;
    monthsNeeded: number;
  }>;
  onDemandChannelBreakEven: Array<{
    channelName: string;
    viewsNeeded: number;
    monthsNeeded: number;
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
  totalMonthlyNetRevenue: number;
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
  monthlyNetRevenue: number;
  breakEvenMonths: number;
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
  totalInvestment: number
): ChannelEconomics {
  const platformFeePercent = getPlatformFeeForChannel(channel.name);

  let annualGrossRevenue: number;
  let monthlyGrossRevenue: number;

  if (isLinearChannel(channel)) {
    const annualImpressions = channel.impressionsPerAiring * channel.airingsPerYear;
    if (channel.buyingModel === 'cpm') {
      annualGrossRevenue = (channel.cpmRate * annualImpressions) / 1000;
    } else {
      annualGrossRevenue = channel.rate * channel.airingsPerYear;
    }
    monthlyGrossRevenue = annualGrossRevenue / 12;
  } else {
    const annualViews = channel.monthlyProjectedViews * 12;
    annualGrossRevenue = (channel.cpmRate * annualViews) / 1000;
    monthlyGrossRevenue = (channel.cpmRate * channel.monthlyProjectedViews) / 1000;
  }

  const annualNetRevenue = annualGrossRevenue * (1 - platformFeePercent);
  const monthlyNetRevenue = monthlyGrossRevenue * (1 - platformFeePercent);

  const annualImpressions = getChannelAnnualImpressions(channel);
  const effectiveNetCpm = annualImpressions > 0
    ? (annualNetRevenue / annualImpressions) * 1000
    : 0;
  const breakEvenImpressions = effectiveNetCpm > 0
    ? (totalInvestment / effectiveNetCpm) * 1000
    : Infinity;

  const breakEvenMonths = monthlyNetRevenue > 0
    ? totalInvestment / monthlyNetRevenue
    : Infinity;

  return {
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.channelType,
    enabled: channel.enabled,
    buyingModel: channel.buyingModel,
    cpmRate: channel.cpmRate,
    impressionsPerAiring: channel.impressionsPerAiring,
    airingsPerYear: channel.airingsPerYear,
    monthlyProjectedViews: channel.monthlyProjectedViews,
    platformFeePercent: platformFeePercent * 100,
    grossMonthlyRevenue: monthlyGrossRevenue,
    netMonthlyRevenue: monthlyNetRevenue,
    annualGrossRevenue,
    annualNetRevenue,
    breakEvenImpressions: isFinite(breakEvenImpressions) ? breakEvenImpressions : 0,
    breakEvenMonths: isFinite(breakEvenMonths) ? breakEvenMonths : 0
  };
}

function calculateBreakEven(
  totalInvestment: number,
  channels: ChannelEconomics[]
): BreakEvenAnalysis {
  const enabledChannels = channels.filter(c => c.enabled);

  const totalMonthlyNetRevenue = enabledChannels.reduce((sum, c) => sum + c.netMonthlyRevenue, 0);
  const totalAnnualImpressions = enabledChannels.reduce((sum, c) => {
    if (c.channelType === 'linear') {
      return sum + (c.impressionsPerAiring * c.airingsPerYear);
    }
    return sum + (c.monthlyProjectedViews * 12);
  }, 0);

  const totalAnnualNetRevenue = enabledChannels.reduce((sum, c) => sum + c.annualNetRevenue, 0);
  const avgNetCpm = totalAnnualImpressions > 0
    ? (totalAnnualNetRevenue / totalAnnualImpressions) * 1000
    : 0;

  const breakEvenImpressions = avgNetCpm > 0
    ? (totalInvestment / avgNetCpm) * 1000
    : Infinity;

  const breakEvenMonths = totalMonthlyNetRevenue > 0
    ? totalInvestment / totalMonthlyNetRevenue
    : Infinity;

  const linearChannels = enabledChannels.filter(c => c.channelType === 'linear');
  const onDemandChannels = enabledChannels.filter(c => c.channelType === 'onDemand');

  const linearChannelBreakEven = linearChannels.map(channel => {
    const monthlyRevenue = channel.netMonthlyRevenue;
    const monthsNeeded = monthlyRevenue > 0 ? totalInvestment / monthlyRevenue : Infinity;
    const airingsPerMonth = channel.airingsPerYear / 12;
    const airingsNeeded = airingsPerMonth > 0 ? monthsNeeded * airingsPerMonth : Infinity;

    return {
      channelName: channel.channelName,
      impressionsNeeded: channel.breakEvenImpressions,
      airingsNeeded: isFinite(airingsNeeded) ? airingsNeeded : 0,
      monthsNeeded: isFinite(monthsNeeded) ? monthsNeeded : 0
    };
  });

  const onDemandChannelBreakEven = onDemandChannels.map(channel => {
    const monthlyRevenue = channel.netMonthlyRevenue;
    const monthsNeeded = monthlyRevenue > 0 ? totalInvestment / monthlyRevenue : Infinity;

    return {
      channelName: channel.channelName,
      viewsNeeded: channel.breakEvenImpressions,
      monthsNeeded: isFinite(monthsNeeded) ? monthsNeeded : 0
    };
  });

  return {
    totalInvestment,
    avgNetCpmAcrossChannels: avgNetCpm,
    breakEvenImpressions: isFinite(breakEvenImpressions) ? breakEvenImpressions : 0,
    breakEvenMonths: isFinite(breakEvenMonths) ? breakEvenMonths : 0,
    breakEvenYears: isFinite(breakEvenMonths) ? breakEvenMonths / 12 : 0,
    totalMonthlyNetRevenue,
    linearChannelBreakEven,
    onDemandChannelBreakEven
  };
}

function calculateLifetimeProjection(
  totalInvestment: number,
  annualGrossRevenue: number,
  annualNetRevenue: number,
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
    totalRuns: yearsInService,
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
      costPerRun: yearsInService > 0 ? totalInitialInvestment / yearsInService : totalInitialInvestment,
      costPerFinishedMinute: contentMinutes > 0 ? totalInitialInvestment / contentMinutes : 0
    };

    const channels = (settings?.distributionChannels ??
      EpisodeProfitSettingsService.getDefaultChannelsForEpisode(contentMinutes))
      .map(channel => calculateChannelEconomics(channel, totalInitialInvestment));

    const enabledChannels = channels.filter(c => c.enabled);
    const totalAnnualGrossRevenue = enabledChannels.reduce((sum, c) => sum + c.annualGrossRevenue, 0);
    const totalAnnualNetRevenue = enabledChannels.reduce((sum, c) => sum + c.annualNetRevenue, 0);
    const totalMonthlyNetRevenue = enabledChannels.reduce((sum, c) => sum + c.netMonthlyRevenue, 0);

    const breakEven = calculateBreakEven(totalInitialInvestment, channels);

    const lifetime = calculateLifetimeProjection(
      totalInitialInvestment,
      totalAnnualGrossRevenue,
      totalAnnualNetRevenue,
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
      totalMonthlyNetRevenue,
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
      totalMonthlyNetRevenue: number;
      totalLifetimeProfit: number;
      averageRoiMultiple: number;
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
    const totalMonthlyNetRevenue = episodes.reduce((sum, e) => sum + e.totalMonthlyNetRevenue, 0);
    const totalLifetimeProfit = episodes.reduce((sum, e) => sum + e.lifetime.lifetimeProfit, 0);
    const averageRoiMultiple = episodes.length > 0
      ? episodes.reduce((sum, e) => sum + e.lifetime.roiMultiple, 0) / episodes.length
      : 0;
    const seriesBreakEvenMonths = totalMonthlyNetRevenue > 0
      ? totalInvestment / totalMonthlyNetRevenue
      : 0;

    return {
      episodes,
      totals: {
        totalInvestment,
        totalAnnualNetRevenue,
        totalMonthlyNetRevenue,
        totalLifetimeProfit,
        averageRoiMultiple,
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
      monthlyNetRevenue: economics.totalMonthlyNetRevenue,
      breakEvenMonths: economics.breakEven.breakEvenMonths,
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
