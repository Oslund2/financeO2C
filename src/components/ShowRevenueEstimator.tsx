import { useState, useMemo } from 'react';
import { DollarSign, Users, TrendingUp, BarChart3, Info, Plus, X, Globe, Tv, Monitor, Youtube, Baby } from 'lucide-react';

interface ShowRevenueEstimatorProps {
  initialProductionCost?: number;
}

interface Sponsor {
  id: string;
  name: string;
  cost: number;
}

interface DistributionChannel {
  id: string;
  name: string;
  icon: typeof Tv;
  rate: number;
  enabled: boolean;
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

  const [distributionChannels, setDistributionChannels] = useState<DistributionChannel[]>([
    { id: '1', name: 'O&O TV', icon: Tv, rate: 500, enabled: true },
    { id: '2', name: 'O&O Streaming', icon: Monitor, rate: 400, enabled: true },
    { id: '3', name: 'Social (YouTube)', icon: Youtube, rate: 300, enabled: true },
    { id: '4', name: 'Tablo Kids', icon: Baby, rate: 350, enabled: true }
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

  const toggleLanguage = (code: string) => {
    if (code === 'en') return;
    setLanguages(langs =>
      langs.map(l => l.code === code ? { ...l, enabled: !l.enabled } : l)
    );
  };

  const calculations = useMemo(() => {
    const enabledChannels = distributionChannels.filter(c => c.enabled);
    const enabledLanguages = enableMultiLanguage ? languages.filter(l => l.enabled) : [languages[0]];

    const revenuePerSpotPerChannel = enabledChannels.reduce((sum, channel) => sum + channel.rate, 0);
    const totalSpotsPerEpisode = spotsPerBreak * breaksPerEpisode;
    const revenuePerEpisodePerRun = revenuePerSpotPerChannel * totalSpotsPerEpisode;
    const revenuePerEpisode = revenuePerEpisodePerRun * annualRunsPerEpisode;
    const totalAdRevenue = revenuePerEpisode * numberOfEpisodes * enabledLanguages.length;

    const totalSponsorCost = sponsors.reduce((sum, s) => sum + s.cost, 0);
    const productPlacementRevenue = totalSponsorCost * annualRunsPerEpisode * numberOfEpisodes;

    const totalRevenue = totalAdRevenue + productPlacementRevenue;

    const languageDubbingCost = enabledLanguages
      .filter(l => !l.isDefault)
      .reduce((sum, l) => sum + l.dubbingCost, 0) * numberOfEpisodes;

    const adjustedProductionCost = totalProductionCost + languageDubbingCost;

    const grossProfit = totalRevenue - adjustedProductionCost;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const avgRatePerSpot = enabledChannels.length > 0
      ? revenuePerSpotPerChannel / enabledChannels.length
      : 0;
    const requiredAudience = targetCPM > 0 ? (avgRatePerSpot / targetCPM) * 1000 : 0;

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
      enabledLanguages
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          </div>
          <div className="text-3xl font-bold text-blue-700">{formatCurrency(calculations.totalRevenue)}</div>
          <div className="text-xs text-gray-600 mt-1">
            Ad: {formatCurrency(calculations.totalAdRevenue)} | Sponsor: {formatCurrency(calculations.productPlacementRevenue)}
          </div>
        </div>

        <div className={`bg-gradient-to-br ${
          calculations.grossProfit >= 0 ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-pink-50 border-red-200'
        } border-2 rounded-xl p-6`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <div className="text-sm font-medium text-gray-600">Gross Profit</div>
          </div>
          <div className={`text-3xl font-bold ${calculations.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(calculations.grossProfit)}
          </div>
          <div className={`text-sm font-semibold mt-1 ${calculations.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {calculations.margin.toFixed(1)}% Margin
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-orange-600" />
            <div className="text-sm font-medium text-gray-600">Required Viewers</div>
          </div>
          <div className="text-3xl font-bold text-orange-700">{formatNumber(calculations.requiredAudience)}</div>
          <div className="text-xs text-gray-600 mt-1">per episode to justify rate</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <div className="text-sm font-medium text-gray-600">Total Reach</div>
          </div>
          <div className="text-3xl font-bold text-purple-700">{calculations.enabledLanguages.length}</div>
          <div className="text-xs text-gray-600 mt-1">language version{calculations.enabledLanguages.length !== 1 ? 's' : ''}</div>
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
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tv className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Distribution Channels</h4>
          </div>

          <div className="space-y-3">
            {distributionChannels.map((channel) => {
              const IconComponent = channel.icon;
              return (
                <div
                  key={channel.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    channel.enabled
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={channel.enabled}
                      onChange={() => toggleChannel(channel.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <IconComponent className="w-5 h-5 text-gray-700" />
                    <span className="font-medium text-gray-900 flex-1">{channel.name}</span>
                  </div>
                  {channel.enabled && (
                    <div className="ml-7">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Rate per Spot</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          value={channel.rate}
                          onChange={(e) => updateChannelRate(channel.id, Number(e.target.value))}
                          min="0"
                          step="50"
                          className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Annual revenue: {formatCurrency(channel.rate * calculations.totalSpotsPerEpisode * annualRunsPerEpisode * numberOfEpisodes * calculations.enabledLanguages.length)}
                      </p>
                    </div>
                  )}
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
