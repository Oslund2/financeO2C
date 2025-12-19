import { supabase } from '../lib/supabase';

export type ChannelDistributionType = 'linear' | 'onDemand';

export interface DistributionChannelSettings {
  id: string;
  name: string;
  channelType: ChannelDistributionType;
  buyingModel: 'cpm' | 'spot';
  rate: number;
  cpmRate: number;
  impressionsPerAiring: number;
  airingsPerYear: number;
  monthlyProjectedViews: number;
  enabled: boolean;
}

export function isLinearChannel(channel: DistributionChannelSettings): boolean {
  return channel.channelType === 'linear';
}

export function isOnDemandChannel(channel: DistributionChannelSettings): boolean {
  return channel.channelType === 'onDemand';
}

export function getChannelAnnualImpressions(channel: DistributionChannelSettings): number {
  if (channel.channelType === 'linear') {
    return channel.impressionsPerAiring * channel.airingsPerYear;
  }
  return channel.monthlyProjectedViews * 12;
}

export function getChannelMonthlyImpressions(channel: DistributionChannelSettings): number {
  if (channel.channelType === 'linear') {
    return (channel.impressionsPerAiring * channel.airingsPerYear) / 12;
  }
  return channel.monthlyProjectedViews;
}

export interface SponsorSettings {
  id: string;
  name: string;
  cost: number;
}

export interface EpisodeProfitSettings {
  id: string;
  episodeId: string;
  organizationId: string | null;
  programLengthMinutes: number;
  breaksPerEpisode: number;
  spotsPerBreak: number;
  spotLengthSeconds: number;
  annualRunsPerEpisode: number;
  yearsInService: number;
  decayRatePercent: number;
  minimumRetentionPercent: number;
  targetCpm: number;
  baseProductionCost: number;
  distributionChannels: DistributionChannelSettings[];
  sponsors: SponsorSettings[];
  enableMultiLanguage: boolean;
  dubbingTier: 'ai' | 'bulk_professional' | 'premium_professional';
  enabledLanguages: string[];
  enableHumanCosts: boolean;
  humanCostProfile: string;
  customCostRates: Record<string, number> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EpisodeDefaults {
  programLengthMinutes: number;
  breaksPerEpisode: number;
  contentMinutes: number;
  targetRuntimeSeconds: number;
  episodeTitle: string;
  estimatedCost: number | null;
  formatType: string;
}

const DEFAULT_DISTRIBUTION_CHANNELS: DistributionChannelSettings[] = [
  {
    id: '1',
    name: 'O&O TV',
    channelType: 'linear',
    buyingModel: 'spot',
    rate: 350,
    cpmRate: 28,
    impressionsPerAiring: 200000,
    airingsPerYear: 4,
    monthlyProjectedViews: 0,
    enabled: true
  },
  {
    id: '2',
    name: 'O&O Streaming (On-Demand)',
    channelType: 'onDemand',
    buyingModel: 'cpm',
    rate: 750,
    cpmRate: 25,
    impressionsPerAiring: 0,
    airingsPerYear: 0,
    monthlyProjectedViews: 30000,
    enabled: true
  },
  {
    id: '3',
    name: 'YouTube (Ad Revenue)',
    channelType: 'onDemand',
    buyingModel: 'cpm',
    rate: 400,
    cpmRate: 4.00,
    impressionsPerAiring: 0,
    airingsPerYear: 0,
    monthlyProjectedViews: 100000,
    enabled: true
  },
  {
    id: '4',
    name: 'YouTube (Sponsorship)',
    channelType: 'onDemand',
    buyingModel: 'cpm',
    rate: 2000,
    cpmRate: 20.00,
    impressionsPerAiring: 0,
    airingsPerYear: 0,
    monthlyProjectedViews: 100000,
    enabled: true
  },
  {
    id: '5',
    name: 'Tablo Kids',
    channelType: 'onDemand',
    buyingModel: 'cpm',
    rate: 300,
    cpmRate: 15,
    impressionsPerAiring: 0,
    airingsPerYear: 0,
    monthlyProjectedViews: 20000,
    enabled: true
  }
];

const SHORT_FORM_CHANNELS: DistributionChannelSettings[] = [
  {
    id: '1',
    name: 'YouTube (Ad Revenue)',
    channelType: 'onDemand',
    buyingModel: 'cpm',
    rate: 200,
    cpmRate: 2.00,
    impressionsPerAiring: 0,
    airingsPerYear: 0,
    monthlyProjectedViews: 100000,
    enabled: true
  },
  {
    id: '2',
    name: 'YouTube (Sponsorship)',
    channelType: 'onDemand',
    buyingModel: 'cpm',
    rate: 1500,
    cpmRate: 15.00,
    impressionsPerAiring: 0,
    airingsPerYear: 0,
    monthlyProjectedViews: 100000,
    enabled: true
  },
  {
    id: '3',
    name: 'TikTok Creator Fund',
    channelType: 'onDemand',
    buyingModel: 'cpm',
    rate: 20,
    cpmRate: 0.04,
    impressionsPerAiring: 0,
    airingsPerYear: 0,
    monthlyProjectedViews: 500000,
    enabled: true
  }
];

export class EpisodeProfitSettingsService {
  static async getSettings(episodeId: string): Promise<EpisodeProfitSettings | null> {
    const { data, error } = await supabase
      .from('episode_profit_settings')
      .select('*')
      .eq('episode_id', episodeId)
      .maybeSingle();

    if (error) {
      console.error('Error loading episode profit settings:', error);
      return null;
    }

    if (!data) return null;

    return this.mapFromDatabase(data);
  }

  static async getEpisodeDefaults(episodeId: string): Promise<EpisodeDefaults | null> {
    const { data, error } = await supabase.rpc('get_episode_default_profit_settings', {
      p_episode_id: episodeId
    });

    if (error) {
      console.error('Error getting episode defaults:', error);
      return null;
    }

    if (!data) return null;

    return {
      programLengthMinutes: data.program_length_minutes || 30,
      breaksPerEpisode: data.breaks_per_episode || 0,
      contentMinutes: data.content_minutes || 22,
      targetRuntimeSeconds: data.target_runtime_seconds || 1320,
      episodeTitle: data.episode_title || 'Episode',
      estimatedCost: data.estimated_cost,
      formatType: data.format_type || 'broadcast'
    };
  }

  static async saveSettings(
    episodeId: string,
    organizationId: string | null,
    settings: Partial<Omit<EpisodeProfitSettings, 'id' | 'episodeId' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EpisodeProfitSettings | null> {
    const existing = await this.getSettings(episodeId);

    const dbData = {
      episode_id: episodeId,
      organization_id: organizationId,
      program_length_minutes: settings.programLengthMinutes ?? 30,
      breaks_per_episode: settings.breaksPerEpisode ?? 4,
      spots_per_break: settings.spotsPerBreak ?? 4,
      spot_length_seconds: settings.spotLengthSeconds ?? 30,
      annual_runs_per_episode: settings.annualRunsPerEpisode ?? 4,
      years_in_service: settings.yearsInService ?? 5,
      decay_rate_percent: settings.decayRatePercent ?? 0,
      minimum_retention_percent: settings.minimumRetentionPercent ?? 100,
      target_cpm: settings.targetCpm ?? 15,
      base_production_cost: settings.baseProductionCost ?? 0,
      distribution_channels: settings.distributionChannels ?? DEFAULT_DISTRIBUTION_CHANNELS,
      sponsors: settings.sponsors ?? [],
      enable_multi_language: settings.enableMultiLanguage ?? false,
      dubbing_tier: settings.dubbingTier ?? 'bulk_professional',
      enabled_languages: settings.enabledLanguages ?? ['en'],
      enable_human_costs: settings.enableHumanCosts ?? true,
      human_cost_profile: settings.humanCostProfile ?? 'standard',
      custom_cost_rates: settings.customCostRates ?? null
    };

    if (existing) {
      const { data, error } = await supabase
        .from('episode_profit_settings')
        .update(dbData)
        .eq('episode_id', episodeId)
        .select()
        .single();

      if (error) {
        console.error('Error updating episode profit settings:', error);
        return null;
      }

      return this.mapFromDatabase(data);
    } else {
      const { data, error } = await supabase
        .from('episode_profit_settings')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        console.error('Error creating episode profit settings:', error);
        return null;
      }

      return this.mapFromDatabase(data);
    }
  }

  static getDefaultChannelsForEpisode(contentMinutes: number): DistributionChannelSettings[] {
    if (contentMinutes <= 10) {
      return SHORT_FORM_CHANNELS;
    }
    return DEFAULT_DISTRIBUTION_CHANNELS;
  }

  static getDefaultBreaksForDuration(contentMinutes: number): number {
    if (contentMinutes <= 5) return 0;
    if (contentMinutes <= 10) return 0;
    if (contentMinutes <= 15) return 1;
    if (contentMinutes <= 22) return 3;
    return 4;
  }

  private static inferChannelType(channelName: string): ChannelDistributionType {
    const name = channelName.toLowerCase();
    if (name.includes('tv') && !name.includes('on-demand')) return 'linear';
    if (name.includes('fast')) return 'linear';
    if (name.includes('broadcast')) return 'linear';
    if (name.includes('syndication')) return 'linear';
    return 'onDemand';
  }

  private static migrateChannel(channel: any, annualRuns: number): DistributionChannelSettings {
    if (channel.channelType) {
      return channel as DistributionChannelSettings;
    }

    const channelType = this.inferChannelType(channel.name);
    const legacyImpressions = channel.impressionsPerRun || channel.impressionsPerAiring || 100000;

    if (channelType === 'linear') {
      return {
        id: channel.id,
        name: channel.name,
        channelType: 'linear',
        buyingModel: channel.buyingModel,
        rate: channel.rate,
        cpmRate: channel.cpmRate,
        impressionsPerAiring: legacyImpressions,
        airingsPerYear: annualRuns || 4,
        monthlyProjectedViews: 0,
        enabled: channel.enabled
      };
    }

    return {
      id: channel.id,
      name: channel.name,
      channelType: 'onDemand',
      buyingModel: channel.buyingModel,
      rate: channel.rate,
      cpmRate: channel.cpmRate,
      impressionsPerAiring: 0,
      airingsPerYear: 0,
      monthlyProjectedViews: legacyImpressions,
      enabled: channel.enabled
    };
  }

  private static mapFromDatabase(data: any): EpisodeProfitSettings {
    const annualRuns = data.annual_runs_per_episode || 4;
    const rawChannels = data.distribution_channels || DEFAULT_DISTRIBUTION_CHANNELS;
    const migratedChannels = rawChannels.map((ch: any) => this.migrateChannel(ch, annualRuns));

    return {
      id: data.id,
      episodeId: data.episode_id,
      organizationId: data.organization_id,
      programLengthMinutes: data.program_length_minutes,
      breaksPerEpisode: data.breaks_per_episode,
      spotsPerBreak: data.spots_per_break,
      spotLengthSeconds: data.spot_length_seconds,
      annualRunsPerEpisode: annualRuns,
      yearsInService: data.years_in_service,
      decayRatePercent: parseFloat(data.decay_rate_percent),
      minimumRetentionPercent: parseFloat(data.minimum_retention_percent),
      targetCpm: parseFloat(data.target_cpm),
      baseProductionCost: parseFloat(data.base_production_cost || '0'),
      distributionChannels: migratedChannels,
      sponsors: data.sponsors || [],
      enableMultiLanguage: data.enable_multi_language,
      dubbingTier: data.dubbing_tier,
      enabledLanguages: data.enabled_languages || ['en'],
      enableHumanCosts: data.enable_human_costs,
      humanCostProfile: data.human_cost_profile,
      customCostRates: data.custom_cost_rates,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
