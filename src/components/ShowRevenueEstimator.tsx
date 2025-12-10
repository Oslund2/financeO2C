import { useState, useMemo } from 'react';
import { DollarSign, Users, TrendingUp, BarChart3, Info, Plus, X, Globe, Tv, Monitor, Youtube, Baby, AlertTriangle, Eye } from 'lucide-react';

interface ShowRevenueEstimatorProps {
  initialProductionCost?: number;
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
}

export function ShowRevenueEstimator({ initialProductionCost = 0 }: ShowRevenueEstimatorProps) {
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

  const [calculationMode, setCalculationMode] = useState<'impression' | 'spot'>('impression');

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
    { code: 'en', name: 'English', dubbingCost: 0, enabled: true, isDefault: true },
    { code: 'es', name: 'Spanish (Español)', dubbingCost: 2000, enabled: false, isDefault: false },
    { code: 'zh', name: 'Mandarin Chinese (中文)', dubbingCost: 2500, enabled: false, isDefault: false },
    { code: 'hi', name: 'Hindi (हिन्दी)', dubbingCost: 2000, enabled: false, isDefault: false },
    { code: 'ar', name: 'Arabic (العربية)', dubbingCost: 2500, enabled: false, isDefault: false },
    { code: 'pt', name: 'Portuguese (Português)', dubbingCost: 2000, enabled: false, isDefault: false },
    { code: 'bn', name: 'Bengali (বাংলা)', dubbingCost: 2000, enabled: false, isDefault: false },
    { code: 'fr', name: 'French (Français)', dubbingCost: 2000, enabled: false, isDefault: false },
    { code: 'ru', name: 'Russian (Русский)', dubbingCost: 2000, enabled: false, isDefault: false },
    { code: 'ja', name: 'Japanese (日本語)', dubbingCost: 2500, enabled: false, isDefault: false }
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
      let revenuePerRun = 0;
      let impressionsPerRun = 0;

      if (channel.buyingModel === 'cpm') {
        impressionsPerRun = channel.impressionsPerRun;
        revenuePerRun = (channel.cpmRate * impressionsPerRun) / 1000;
      } else {
        revenuePerRun = channel.rate * totalSpotsPerEpisode;
        impressionsPerRun = channel.impressionsPerRun;
      }

      const annualRevenue =
        revenuePerRun * annualRunsPerEpisode * numberOfEpisodes * enabledLanguages.length;
      const annualImpressions =
        impressionsPerRun * annualRunsPerEpisode * numberOfEpisodes * enabledLanguages.length;

      totalAdRevenue += annualRevenue;
      totalImpressions += annualImpressions;

      const effectiveCPM = annualImpressions > 0 ? (annualRevenue / annualImpressions) * 1000 : 0;

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
        revenue: annualRevenue,
        impressions: annualImpressions,
        effectiveCPM,
        warning
      });
    });

    const totalSponsorCost = sponsors.reduce((sum, s) => sum + s.cost, 0);
    const productPlacementRevenue = totalSponsorCost * annualRunsPerEpisode * numberOfEpisodes;

    const totalRevenue = totalAdRevenue + productPlacementRevenue;

    const languageDubbingCost = enabledLanguages
      .filter(l => !l.isDefault)
      .reduce((sum, l) => sum + l.dubbingCost, 0) * numberOfEpisodes;

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
      channelBreakdown
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
    enableMultiLanguage
  ]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      </div>
                      {language.enabled && !language.isDefault && (
                        <div className="text-xs text-gray-600 mt-1">
                          Dubbing cost: {formatCurrency(language.dubbingCost)} × {numberOfEpisodes} eps = {formatCurrency(language.dubbingCost * numberOfEpisodes)}
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
    </div>
  );
}
