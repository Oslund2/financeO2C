import { useState, useMemo, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, BarChart3, Info, Plus, X, Globe, Tv, Monitor, Youtube, Baby, AlertTriangle, Eye, Clock, TrendingDown } from 'lucide-react';
import { LTVCalculationService, type LTVCalculation } from '../services/ltvCalculationService';
import { YearByYearBreakdown } from './YearByYearBreakdown';

export interface RevenueCalculations {
  revenuePerEpisodePerRun: number;
  revenuePerEpisode: number;
  totalAdRevenue: number;
  productPlacementRevenue: number;
  totalRevenue: number;
  adjustedProductionCost: number;
  languageDubbingCost: number;
  grossProfit: number;
  margin: number;
  requiredAudience: number;
  totalSpotsPerEpisode: number;
  totalImpressions: number;
  avgCPM: number;
  costPerImpression: number;
  breakEvenImpressions: number;
  yearsInService: number;
  decayRatePercent: number;
  minimumRetentionPercent: number;
  lifetimeRevenue: number;
  lifetimeProfit: number;
  lifetimeMargin: number;
  paybackPeriodYears: number | null;
  averageAnnualProfit: number;
  ltvCalculation: LTVCalculation;
}

interface ShowRevenueEstimatorProps {
  initialProductionCost?: number;
  onCalculationsChange?: (calculations: RevenueCalculations) => void;
}

interface Sponsor {
  id: string;
  name: string;
  cost: number;
}

type BuyingModel = 'cpm' | 'spot';

interface DistributionChannel {
  id: string;
  name: string;
  icon: typeof Tv;
  buyingModel: BuyingModel;
  rate: number;
  cpmRate: number;
  impressionsPerRun: number;
  enabled: boolean;
  recommendedCPMRange: { min: number; max: number };
  description: string;
}

interface Language {
  code: string;
  name: string;
  dubbingCost: number;
  enabled: boolean;
  isDefault: boolean;
  marketShare: number; // percentage of global podcast market
  regionalCPM: number; // region-specific CPM multiplier
  audienceMultiplier: number; // potential audience expansion
}

export function ShowRevenueEstimator({ initialProductionCost = 0, onCalculationsChange }: ShowRevenueEstimatorProps) {
  const [numberOfEpisodes, setNumberOfEpisodes] = useState(1);
  const [programLength, setProgramLength] = useState(30);
  const [breaksPerEpisode, setBreaksPerEpisode] = useState(4);
  const [spotsPerBreak, setSpotsPerBreak] = useState(4);
  const [spotLength, setSpotLength] = useState(30);
  const [targetCPM, setTargetCPM] = useState(15);
  const [totalProductionCost, setTotalProductionCost] = useState(initialProductionCost);
  const [annualRunsPerEpisode, setAnnualRunsPerEpisode] = useState(4);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [enableMultiLanguage, setEnableMultiLanguage] = useState(false);
  const [yearsInService, setYearsInService] = useState(5);
  const [decayRatePercent, setDecayRatePercent] = useState(0);
  const [minimumRetentionPercent, setMinimumRetentionPercent] = useState(100);
  const [dubbingTier, setDubbingTier] = useState<'ai' | 'bulk_professional' | 'premium_professional'>('bulk_professional');

  const [calculationMode, setCalculationMode] = useState<'impression' | 'spot'>('impression');

  // Dubbing cost per episode based on research
  const dubbingCostPerEpisode = {
    ai: 100,              // AI dubbing: $50-150/episode
    bulk_professional: 420, // Professional bulk: $360-480/episode ($17.50/min * 24min)
    premium_professional: 750 // Premium: $600-900/episode ($31.25/min * 24min)
  };

  const [distributionChannels, setDistributionChannels] = useState<DistributionChannel[]>([
    {
      id: '1',
      name: 'O&O TV',
      icon: Tv,
      buyingModel: 'spot',
      rate: 350,
      cpmRate: 7,
      impressionsPerRun: 50000,
      enabled: true,
      recommendedCPMRange: { min: 16, max: 47 },
      description: 'Traditional broadcast TV - typically sold per spot'
    },
    {
      id: '2',
      name: 'O&O Streaming',
      icon: Monitor,
      buyingModel: 'cpm',
      rate: 750,
      cpmRate: 25,
      impressionsPerRun: 30000,
      enabled: true,
      recommendedCPMRange: { min: 20, max: 65 },
      description: 'CTV/OTT platform - impression-based buying'
    },
    {
      id: '3',
      name: 'Social (YouTube)',
      icon: Youtube,
      buyingModel: 'cpm',
      rate: 35,
      cpmRate: 0.35,
      impressionsPerRun: 100000,
      enabled: true,
      recommendedCPMRange: { min: 0.25, max: 0.50 },
      description: 'Kids content has restricted ads (COPPA)'
    },
    {
      id: '4',
      name: 'Tablo Kids',
      icon: Baby,
      buyingModel: 'cpm',
      rate: 300,
      cpmRate: 15,
      impressionsPerRun: 20000,
      enabled: true,
      recommendedCPMRange: { min: 10, max: 25 },
      description: 'Kids streaming platform - lower rates due to restrictions'
    }
  ]);

  const [languages, setLanguages] = useState<Language[]>([
    {
      code: 'en', name: 'English', dubbingCost: 0, enabled: true, isDefault: true,
      marketShare: 61, regionalCPM: 1.0, audienceMultiplier: 1.0 // Base language (61% global market)
    },
    {
      code: 'es', name: 'Spanish (Español)', dubbingCost: 420, enabled: false, isDefault: false,
      marketShare: 11, regionalCPM: 0.75, audienceMultiplier: 1.85 // 11% market, Latin America growth
    },
    {
      code: 'pt', name: 'Portuguese (Português)', dubbingCost: 420, enabled: false, isDefault: false,
      marketShare: 6, regionalCPM: 0.65, audienceMultiplier: 1.45 // 6% market (Brazil focus)
    },
    {
      code: 'zh', name: 'Mandarin Chinese (中文)', dubbingCost: 480, enabled: false, isDefault: false,
      marketShare: 4, regionalCPM: 0.85, audienceMultiplier: 2.1 // China 2nd largest audience, 25.1% growth
    },
    {
      code: 'hi', name: 'Hindi (हिन्दी)', dubbingCost: 390, enabled: false, isDefault: false,
      marketShare: 2, regionalCPM: 0.55, audienceMultiplier: 1.95 // India rapid growth market
    },
    {
      code: 'fr', name: 'French (Français)', dubbingCost: 420, enabled: false, isDefault: false,
      marketShare: 3, regionalCPM: 0.80, audienceMultiplier: 1.3 // European + African markets
    },
    {
      code: 'ar', name: 'Arabic (العربية)', dubbingCost: 480, enabled: false, isDefault: false,
      marketShare: 2, regionalCPM: 0.70, audienceMultiplier: 1.6 // Middle East growth
    },
    {
      code: 'ja', name: 'Japanese (日本語)', dubbingCost: 540, enabled: false, isDefault: false,
      marketShare: 3, regionalCPM: 1.10, audienceMultiplier: 1.25 // High CPM, mature market
    },
    {
      code: 'de', name: 'German (Deutsch)', dubbingCost: 450, enabled: false, isDefault: false,
      marketShare: 2, regionalCPM: 0.95, audienceMultiplier: 1.15 // European mature market
    },
    {
      code: 'ko', name: 'Korean (한국어)', dubbingCost: 480, enabled: false, isDefault: false,
      marketShare: 1, regionalCPM: 1.05, audienceMultiplier: 1.4 // High engagement, growing
    }
  ]);

  const addSponsor = () => {
    const newSponsor: Sponsor = {
      id: Date.now().toString(),
      name: `Sponsor ${sponsors.length + 1}`,
      cost: 1000
    };
    setSponsors([...sponsors, newSponsor]);
  };

  const removeSponsor = (id: string) => {
    setSponsors(sponsors.filter(s => s.id !== id));
  };

  const updateSponsor = (id: string, field: 'name' | 'cost', value: string | number) => {
    setSponsors(sponsors.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleChannel = (id: string) => {
    setDistributionChannels(channels =>
      channels.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
  };

  const updateChannelRate = (id: string, rate: number) => {
    setDistributionChannels(channels =>
      channels.map(c => c.id === id ? { ...c, rate } : c)
    );
  };

  const updateChannelCPM = (id: string, cpmRate: number) => {
    setDistributionChannels(channels =>
      channels.map(c => c.id === id ? { ...c, cpmRate } : c)
    );
  };

  const updateChannelImpressions = (id: string, impressionsPerRun: number) => {
    setDistributionChannels(channels =>
      channels.map(c => c.id === id ? { ...c, impressionsPerRun } : c)
    );
  };

  const toggleChannelBuyingModel = (id: string) => {
    setDistributionChannels(channels =>
      channels.map(c =>
        c.id === id
          ? { ...c, buyingModel: c.buyingModel === 'cpm' ? 'spot' : 'cpm' }
          : c
      )
    );
  };

  const setChannelEstimationLevel = (id: string, level: 'small' | 'medium' | 'large') => {
    const impressionLevels = {
      small: 10000,
      medium: 100000,
      large: 1000000
    };
    updateChannelImpressions(id, impressionLevels[level]);
  };

  const toggleLanguage = (code: string) => {
    if (code === 'en') return;
    setLanguages(langs =>
      langs.map(l => l.code === code ? { ...l, enabled: !l.enabled } : l)
    );
  };

  const calculations = useMemo(() => {
    const enabledChannels = distributionChannels.filter(c => c.enabled);
    const enabledLanguages = enableMultiLanguage ? languages.filter(l => l.enabled) : [languages[0]];
    const totalSpotsPerEpisode = spotsPerBreak * breaksPerEpisode;

    let totalAdRevenue = 0;
    let totalImpressions = 0;
    const channelBreakdown: Array<{
      name: string;
      revenue: number;
      impressions: number;
      effectiveCPM: number;
      warning?: string;
    }> = [];

    enabledChannels.forEach((channel) => {
      let channelTotalRevenue = 0;
      let channelTotalImpressions = 0;

      // Calculate revenue per language with regional CPM adjustments
      enabledLanguages.forEach((language) => {
        let revenuePerRun = 0;
        let impressionsPerRun = 0;

        if (channel.buyingModel === 'cpm') {
          impressionsPerRun = Math.floor(channel.impressionsPerRun * language.audienceMultiplier);
          const adjustedCPM = channel.cpmRate * language.regionalCPM;
          revenuePerRun = (adjustedCPM * impressionsPerRun) / 1000;
        } else {
          revenuePerRun = channel.rate * totalSpotsPerEpisode * language.regionalCPM;
          impressionsPerRun = Math.floor(channel.impressionsPerRun * language.audienceMultiplier);
        }

        const languageRevenue = revenuePerRun * annualRunsPerEpisode * numberOfEpisodes;
        const languageImpressions = impressionsPerRun * annualRunsPerEpisode * numberOfEpisodes;

        channelTotalRevenue += languageRevenue;
        channelTotalImpressions += languageImpressions;
      });

      totalAdRevenue += channelTotalRevenue;
      totalImpressions += channelTotalImpressions;

      const effectiveCPM = channelTotalImpressions > 0 ? (channelTotalRevenue / channelTotalImpressions) * 1000 : 0;

      let warning: string | undefined;
      if (channel.buyingModel === 'cpm') {
        if (
          channel.cpmRate < channel.recommendedCPMRange.min ||
          channel.cpmRate > channel.recommendedCPMRange.max
        ) {
          warning = `CPM outside typical range ($${channel.recommendedCPMRange.min}-$${channel.recommendedCPMRange.max})`;
        }
      }

      channelBreakdown.push({
        name: channel.name,
        revenue: channelTotalRevenue,
        impressions: channelTotalImpressions,
        effectiveCPM,
        warning
      });
    });

    const totalSponsorCost = sponsors.reduce((sum, s) => sum + s.cost, 0);
    const productPlacementRevenue = totalSponsorCost * annualRunsPerEpisode * numberOfEpisodes;

    const totalRevenue = totalAdRevenue + productPlacementRevenue;

    // Calculate dubbing cost based on selected tier and enabled languages
    const costPerEp = dubbingCostPerEpisode[dubbingTier];
    const languageDubbingCost = enabledLanguages
      .filter(l => !l.isDefault)
      .reduce((sum, l) => sum + costPerEp, 0) * numberOfEpisodes;

    const adjustedProductionCost = totalProductionCost + languageDubbingCost;

    const grossProfit = totalRevenue - adjustedProductionCost;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const avgCPM = totalImpressions > 0 ? (totalAdRevenue / totalImpressions) * 1000 : 0;
    const costPerImpression = totalImpressions > 0 ? adjustedProductionCost / totalImpressions : 0;
    const breakEvenImpressions = avgCPM > 0 ? (adjustedProductionCost / avgCPM) * 1000 : 0;

    const requiredAudience = targetCPM > 0 && enabledChannels.length > 0
      ? (enabledChannels.reduce((sum, c) => sum + (c.buyingModel === 'spot' ? c.rate : (c.cpmRate * c.impressionsPerRun / 1000)), 0) / targetCPM) * 1000 / enabledChannels.length
      : 0;

    const revenuePerEpisodePerRun = totalAdRevenue / (annualRunsPerEpisode * numberOfEpisodes * enabledLanguages.length || 1);
    const revenuePerEpisode = revenuePerEpisodePerRun * annualRunsPerEpisode;

    const ltvCalculation = LTVCalculationService.calculateLifetimeValue(
      totalRevenue,
      adjustedProductionCost,
      yearsInService,
      decayRatePercent,
      minimumRetentionPercent
    );

    return {
      revenuePerEpisodePerRun,
      revenuePerEpisode,
      totalAdRevenue,
      productPlacementRevenue,
      totalRevenue,
      adjustedProductionCost,
      languageDubbingCost,
      grossProfit,
      margin,
      requiredAudience,
      totalSpotsPerEpisode,
      enabledChannels,
      enabledLanguages,
      totalImpressions,
      avgCPM,
      costPerImpression,
      breakEvenImpressions,
      channelBreakdown,
      yearsInService,
      decayRatePercent,
      minimumRetentionPercent,
      lifetimeRevenue: ltvCalculation.lifetimeRevenue,
      lifetimeProfit: ltvCalculation.lifetimeProfit,
      lifetimeMargin: ltvCalculation.lifetimeMargin,
      paybackPeriodYears: ltvCalculation.paybackPeriodYears,
      averageAnnualProfit: ltvCalculation.averageAnnualProfit,
      ltvCalculation
    };
  }, [
    numberOfEpisodes,
    breaksPerEpisode,
    spotsPerBreak,
    totalProductionCost,
    targetCPM,
    annualRunsPerEpisode,
    sponsors,
    distributionChannels,
    languages,
    enableMultiLanguage,
    yearsInService,
    decayRatePercent,
    minimumRetentionPercent
  ]);

  useEffect(() => {
    if (onCalculationsChange) {
      onCalculationsChange({
        revenuePerEpisodePerRun: calculations.revenuePerEpisodePerRun,
        revenuePerEpisode: calculations.revenuePerEpisode,
        totalAdRevenue: calculations.totalAdRevenue,
        productPlacementRevenue: calculations.productPlacementRevenue,
        totalRevenue: calculations.totalRevenue,
        adjustedProductionCost: calculations.adjustedProductionCost,
        languageDubbingCost: calculations.languageDubbingCost,
        grossProfit: calculations.grossProfit,
        margin: calculations.margin,
        requiredAudience: calculations.requiredAudience,
        totalSpotsPerEpisode: calculations.totalSpotsPerEpisode,
        totalImpressions: calculations.totalImpressions,
        avgCPM: calculations.avgCPM,
        costPerImpression: calculations.costPerImpression,
        breakEvenImpressions: calculations.breakEvenImpressions,
        yearsInService: calculations.yearsInService,
        decayRatePercent: calculations.decayRatePercent,
        minimumRetentionPercent: calculations.minimumRetentionPercent,
        lifetimeRevenue: calculations.lifetimeRevenue,
        lifetimeProfit: calculations.lifetimeProfit,
        lifetimeMargin: calculations.lifetimeMargin,
        paybackPeriodYears: calculations.paybackPeriodYears,
        averageAnnualProfit: calculations.averageAnnualProfit,
        ltvCalculation: calculations.ltvCalculation
      });
    }
  }, [calculations, onCalculationsChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Multi-Channel Revenue Estimator</h3>
          <p className="text-sm text-gray-600">Project revenue across distribution channels, languages, and sponsors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-blue-700 break-words">{formatCurrency(calculations.totalRevenue)}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-normal">
            Ad: {formatCurrency(calculations.totalAdRevenue)} | Sponsor: {formatCurrency(calculations.productPlacementRevenue)}
          </div>
        </div>

        <div className={`bg-gradient-to-br ${
          calculations.grossProfit >= 0 ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-pink-50 border-red-200'
        } border-2 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Gross Profit</div>
          </div>
          <div className={`text-xl lg:text-2xl font-bold break-words ${calculations.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(calculations.grossProfit)}
          </div>
          <div className={`text-sm font-semibold mt-1 ${calculations.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {calculations.margin.toFixed(1)}% Margin
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Total Impressions</div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-orange-700 break-words">{formatNumber(calculations.totalImpressions)}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-normal">across all channels annually</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Average CPM</div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-purple-700 break-words">{formatCurrency(calculations.avgCPM)}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-normal">portfolio-wide effective rate</div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Break-Even Views</div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-teal-700 break-words">{formatNumber(calculations.breakEvenImpressions)}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-normal">impressions needed to break even</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <strong>Important:</strong> Annual revenue figures represent <strong>Year 1</strong> at full viewership (100%). The Lifetime Value calculations below project revenue over multiple years with viewership decay.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Lifetime Revenue</div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-yellow-700 break-words">{formatCurrency(calculations.lifetimeRevenue)}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-normal">over {calculations.yearsInService} years</div>
        </div>

        <div className={`bg-gradient-to-br ${
          calculations.lifetimeProfit >= 0 ? 'from-emerald-50 to-green-50 border-emerald-200' : 'from-red-50 to-rose-50 border-red-200'
        } border-2 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Lifetime Profit</div>
          </div>
          <div className={`text-xl lg:text-2xl font-bold break-words ${calculations.lifetimeProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(calculations.lifetimeProfit)}
          </div>
          <div className={`text-sm font-semibold mt-1 ${calculations.lifetimeMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {calculations.lifetimeMargin.toFixed(1)}% LTV Margin
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-cyan-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Payback Period</div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-cyan-700 break-words">
            {LTVCalculationService.formatYearsMonths(calculations.paybackPeriodYears)}
          </div>
          <div className="text-xs text-gray-600 mt-1 whitespace-normal">time to break even</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6 overflow-hidden min-h-[140px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <div className="text-sm font-medium text-gray-600">Avg Annual Profit</div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-indigo-700 break-words">{formatCurrency(calculations.averageAnnualProfit)}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-normal">per year over lifetime</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Lifetime Value Settings</h4>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Years in Service</label>
                <span className="text-sm font-bold text-gray-900">{yearsInService}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={yearsInService}
                onChange={(e) => setYearsInService(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
              />
              <p className="text-xs text-gray-500 mt-1">Expected years content generates revenue</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Annual Decay Rate</label>
                <span className="text-sm font-bold text-gray-900">{decayRatePercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={decayRatePercent}
                onChange={(e) => setDecayRatePercent(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <p className="text-xs text-gray-500 mt-1">Viewership decline per year (0-25%)</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Minimum Retention Floor</label>
                <span className="text-sm font-bold text-gray-900">{minimumRetentionPercent}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={minimumRetentionPercent}
                onChange={(e) => setMinimumRetentionPercent(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <p className="text-xs text-gray-500 mt-1">Stable long-tail revenue baseline</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-900 space-y-1">
                <div><strong>Current Model:</strong></div>
                <div>Year 1: 100% viewership</div>
                <div>Decline: -{decayRatePercent}% per year</div>
                <div>Floor: {minimumRetentionPercent}% stable</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Inventory Structure</h4>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Number of Episodes</label>
                <span className="text-sm font-bold text-gray-900">{numberOfEpisodes}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={numberOfEpisodes}
                onChange={(e) => setNumberOfEpisodes(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Annual Runs per Episode</label>
                <span className="text-sm font-bold text-gray-900">{annualRunsPerEpisode}</span>
              </div>
              <input
                type="range"
                min="1"
                max="52"
                value={annualRunsPerEpisode}
                onChange={(e) => setAnnualRunsPerEpisode(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">How many times each episode airs per year</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Program Length (minutes)</label>
                <span className="text-sm font-bold text-gray-900">{programLength}</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                value={programLength}
                onChange={(e) => setProgramLength(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Total Breaks per Episode</label>
                <span className="text-sm font-bold text-gray-900">{breaksPerEpisode}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={breaksPerEpisode}
                onChange={(e) => setBreaksPerEpisode(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Spots per Break</label>
                <span className="text-sm font-bold text-gray-900">{spotsPerBreak}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={spotsPerBreak}
                onChange={(e) => setSpotsPerBreak(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Spot Length (seconds)</label>
                <span className="text-sm font-bold text-gray-900">{spotLength}</span>
              </div>
              <select
                value={spotLength}
                onChange={(e) => setSpotLength(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-700" />
              <h4 className="text-lg font-bold text-gray-900">Product Placement</h4>
            </div>
            <button
              onClick={addSponsor}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Sponsor
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sponsors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No sponsors added yet</p>
                <p className="text-xs mt-1">Click "Add Sponsor" to start</p>
              </div>
            ) : (
              sponsors.map((sponsor) => (
                <div key={sponsor.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={sponsor.name}
                        onChange={(e) => updateSponsor(sponsor.id, 'name', e.target.value)}
                        placeholder="Sponsor name"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          value={sponsor.cost}
                          onChange={(e) => updateSponsor(sponsor.id, 'cost', Number(e.target.value))}
                          min="0"
                          step="100"
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeSponsor(sponsor.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Annual revenue: {formatCurrency(sponsor.cost * annualRunsPerEpisode * numberOfEpisodes)}
                  </p>
                </div>
              ))
            )}
          </div>

          {sponsors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Total Sponsor Revenue:</span>
                <span className="font-bold text-green-600">{formatCurrency(calculations.productPlacementRevenue)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Financial Settings</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Target CPM (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={targetCPM}
                  onChange={(e) => setTargetCPM(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Cost per thousand impressions</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-900">
                  <strong>Audience Target:</strong> You need{' '}
                  <strong>{formatNumber(calculations.requiredAudience)} viewers</strong> per episode to justify your rates.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Base Production Cost (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={totalProductionCost}
                    onChange={(e) => setTotalProductionCost(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Total cost for all episodes in English</p>
              </div>

              {calculations.languageDubbingCost > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs text-blue-900">
                    <div className="flex items-center justify-between mb-1">
                      <span>Language Dubbing Cost:</span>
                      <strong>+{formatCurrency(calculations.languageDubbingCost)}</strong>
                    </div>
                    <div className="flex items-center justify-between font-bold">
                      <span>Total Production Cost:</span>
                      <span>{formatCurrency(calculations.adjustedProductionCost)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Tv className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Distribution Channels</h4>
          </div>

          <div className="space-y-4">
            {distributionChannels.map((channel) => {
              const IconComponent = channel.icon;
              const breakdown = calculations.channelBreakdown.find(b => b.name === channel.name);

              return (
                <div
                  key={channel.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    channel.enabled
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={channel.enabled}
                      onChange={() => toggleChannel(channel.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <IconComponent className="w-5 h-5 text-gray-700" />
                        <span className="font-medium text-gray-900">{channel.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            channel.buyingModel === 'cpm'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {channel.buyingModel === 'cpm' ? 'CPM' : 'Spot'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{channel.description}</p>

                      {channel.enabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {channel.buyingModel === 'cpm' ? (
                              <>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">CPM Rate</label>
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                      type="number"
                                      value={channel.cpmRate === 0 ? '' : channel.cpmRate}
                                      onChange={(e) => updateChannelCPM(channel.id, e.target.value === '' ? 0 : Number(e.target.value))}
                                      min="0"
                                      step="0.05"
                                      className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Range: ${channel.recommendedCPMRange.min}-${channel.recommendedCPMRange.max}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">Impressions/Run</label>
                                  <input
                                    type="number"
                                    value={channel.impressionsPerRun === 0 ? '' : channel.impressionsPerRun}
                                    onChange={(e) => updateChannelImpressions(channel.id, e.target.value === '' ? 0 : Number(e.target.value))}
                                    min="0"
                                    step="1000"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <div className="flex gap-1 mt-1">
                                    <button
                                      onClick={() => setChannelEstimationLevel(channel.id, 'small')}
                                      className="text-xs px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded"
                                    >
                                      10K
                                    </button>
                                    <button
                                      onClick={() => setChannelEstimationLevel(channel.id, 'medium')}
                                      className="text-xs px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded"
                                    >
                                      100K
                                    </button>
                                    <button
                                      onClick={() => setChannelEstimationLevel(channel.id, 'large')}
                                      className="text-xs px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded"
                                    >
                                      1M
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">Rate per Spot</label>
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                      type="number"
                                      value={channel.rate === 0 ? '' : channel.rate}
                                      onChange={(e) => updateChannelRate(channel.id, e.target.value === '' ? 0 : Number(e.target.value))}
                                      min="0"
                                      step="50"
                                      className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">Est. Impressions/Airing</label>
                                  <input
                                    type="number"
                                    value={channel.impressionsPerRun === 0 ? '' : channel.impressionsPerRun}
                                    onChange={(e) => updateChannelImpressions(channel.id, e.target.value === '' ? 0 : Number(e.target.value))}
                                    min="0"
                                    step="1000"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Implied CPM: ${breakdown ? breakdown.effectiveCPM.toFixed(2) : '0'}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          {breakdown && (
                            <div className="bg-white border border-gray-200 rounded p-2">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Annual Revenue:</span>
                                  <span className="font-bold text-green-600 ml-1">{formatCurrency(breakdown.revenue)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Total Impressions:</span>
                                  <span className="font-bold text-blue-600 ml-1">{formatNumber(breakdown.impressions)}</span>
                                </div>
                              </div>
                              {breakdown.warning && (
                                <div className="flex items-start gap-1 mt-2 text-xs text-orange-700">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{breakdown.warning}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => toggleChannelBuyingModel(channel.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 underline"
                          >
                            Switch to {channel.buyingModel === 'cpm' ? 'Spot' : 'CPM'} mode
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Active Channels:</span>
              <span className="font-bold text-blue-600">{calculations.enabledChannels.length} of {distributionChannels.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-700" />
              <h4 className="text-lg font-bold text-gray-900">Language Versions</h4>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableMultiLanguage}
                onChange={(e) => setEnableMultiLanguage(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Multi-Language</span>
            </label>
          </div>

          {enableMultiLanguage && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Dubbing Quality Tier</label>
              <select
                value={dubbingTier}
                onChange={(e) => setDubbingTier(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="ai">AI Dubbing (~${dubbingCostPerEpisode.ai}/episode) - Fast & Cost-Effective</option>
                <option value="bulk_professional">Professional Bulk (~${dubbingCostPerEpisode.bulk_professional}/episode) - Industry Standard</option>
                <option value="premium_professional">Premium Professional (~${dubbingCostPerEpisode.premium_professional}/episode) - Highest Quality</option>
              </select>
              <p className="text-xs text-gray-600 mt-2">
                Based on industry research: AI ($50-150), Professional Bulk ($360-480), Premium ($600-900) per 24-min episode
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {languages.map((language) => (
              <div
                key={language.code}
                className={`border-2 rounded-lg p-3 transition-all ${
                  language.enabled
                    ? 'border-green-200 bg-green-50'
                    : enableMultiLanguage && !language.isDefault
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={language.enabled}
                      onChange={() => toggleLanguage(language.code)}
                      disabled={language.isDefault || !enableMultiLanguage}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                        {language.name}
                        {language.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Default</span>
                        )}
                        {!language.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            {language.marketShare}% market
                          </span>
                        )}
                      </div>
                      {!language.isDefault && (
                        <div className="text-xs text-gray-600 mt-1">
                          {language.enabled ? (
                            <>
                              Dubbing: {formatCurrency(costPerEp)} × {numberOfEpisodes} eps = {formatCurrency(costPerEp * numberOfEpisodes)}
                              <span className="ml-2 text-green-600">
                                | +{Math.round((language.audienceMultiplier - 1) * 100)}% potential reach
                              </span>
                            </>
                          ) : (
                            <>
                              Est. dubbing: {formatCurrency(costPerEp)}/ep | Regional CPM: {(language.regionalCPM * 100).toFixed(0)}% | Audience: +{Math.round((language.audienceMultiplier - 1) * 100)}%
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {enableMultiLanguage && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Enabled Languages:</span>
                <span className="font-bold text-green-600">{calculations.enabledLanguages.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Total Dubbing Cost:</span>
                <span className="font-bold text-orange-600">{formatCurrency(calculations.languageDubbingCost)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-600" />
          <h4 className="text-lg font-bold text-gray-900">Channel Breakdown & Insights</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {calculations.channelBreakdown.map((breakdown) => (
            <div key={breakdown.name} className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="font-medium text-gray-900 mb-2 text-sm">{breakdown.name}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue:</span>
                  <span className="font-bold text-green-600">{formatCurrency(breakdown.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Impressions:</span>
                  <span className="font-bold text-blue-600">{formatNumber(breakdown.impressions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Effective CPM:</span>
                  <span className="font-bold text-purple-600">${breakdown.effectiveCPM.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-blue-300">
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2 text-sm">About This Calculator</h5>
            <div className="space-y-2 text-xs text-gray-700">
              <p>
                <strong>CPM Mode:</strong> Most streaming and social platforms sell advertising based on impressions (CPM = Cost Per Thousand views). This is the standard for YouTube, OTT, and CTV platforms.
              </p>
              <p>
                <strong>Spot Mode:</strong> Traditional broadcast TV typically sells per-spot with rates based on time slot and audience size. You can toggle between modes for each channel.
              </p>
              <p>
                <strong>Kids Content Note:</strong> Children's content has significantly lower CPMs ($0.25-$0.50) due to COPPA restrictions preventing personalized advertising. Industry research shows kids YouTube channels earn 85-95% less than general content.
              </p>
              <p>
                <strong>Realistic Defaults:</strong> Defaults are based on 2024 industry averages: Broadcast TV ($16-$47 CPM), CTV/OTT ($20-$65 CPM), Kids YouTube ($0.25-$0.50 CPM), Kids Streaming ($10-$25 CPM).
              </p>
              <p>
                <strong>Multilingual Revenue Modeling:</strong> Language-specific projections are based on 2024 global podcast market research. Spanish (11% market share) and Portuguese (6%) offer significant growth, while Asia Pacific shows 27.3% CAGR. Regional CPM adjustments reflect actual advertising rates in each market. Audience multipliers estimate potential reach expansion per language.
              </p>
              <p>
                <strong>Dubbing Costs:</strong> Based on industry research - AI dubbing averages $100/episode, professional bulk contracts $360-480/episode ($17.50/min), and premium quality $600-900/episode ($31.25/min) for 24-minute content. Actual costs vary by language complexity and voice talent.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Revenue Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Revenue per Episode (per run)</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(calculations.revenuePerEpisodePerRun)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Revenue per Episode (annual)</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(calculations.revenuePerEpisode)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Annual Revenue</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(calculations.totalRevenue)}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-green-300 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Ad Revenue ({calculations.enabledChannels.length} channels × {calculations.enabledLanguages.length} languages):</span>
            <span className="font-bold text-gray-900">{formatCurrency(calculations.totalAdRevenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Product Placement Revenue ({sponsors.length} sponsors):</span>
            <span className="font-bold text-gray-900">{formatCurrency(calculations.productPlacementRevenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Total Production Cost:</span>
            <span className="font-bold text-red-600">-{formatCurrency(calculations.adjustedProductionCost)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-green-300">
            <span className="font-bold text-gray-900">Net Profit:</span>
            <span className={`font-bold text-xl ${calculations.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(calculations.grossProfit)}
            </span>
          </div>
        </div>
      </div>

      <YearByYearBreakdown
        yearlyBreakdown={calculations.ltvCalculation.yearlyBreakdown}
        minimumRetentionPercent={calculations.minimumRetentionPercent}
        productionCost={calculations.adjustedProductionCost}
      />
    </div>
  );
}
