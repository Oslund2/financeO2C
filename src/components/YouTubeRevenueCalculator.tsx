import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Sparkles, ChevronDown, Info, BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import {
  YouTubeRevenueService,
  ContentNiche,
  AudienceType,
  NICHE_MODIFIERS
} from '../services/youtubeRevenueService';
import { analyzeYouTubeRevenue, type YouTubeInsight } from '../services/economicsAIService';

interface YouTubeRevenueCalculatorProps {
  defaultMonthlyViews?: number;
  onRevenueCalculated?: (revenue: { adRevenue: number; sponsorship: number; total: number }) => void;
}

const VIEW_PRESETS = [
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
  { label: '250K', value: 250000 },
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '5M', value: 5000000 }
];

export function YouTubeRevenueCalculator({
  defaultMonthlyViews = 100000,
  onRevenueCalculated
}: YouTubeRevenueCalculatorProps) {
  const [monthlyViews, setMonthlyViews] = useState(defaultMonthlyViews);
  const [niche, setNiche] = useState<ContentNiche>('animation_storytelling');
  const [audienceType, setAudienceType] = useState<AudienceType>('general');
  const [scenario, setScenario] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiInsight, setAiInsight] = useState<YouTubeInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);

  const geminiAvailable = !!(import.meta.env.VITE_GEMINI_API_KEY);

  async function handleAnalyze() {
    setAiInsight(null);
    setAiLoading(true);
    setAiError(null);
    setShowAI(true);
    try {
      const insight = await analyzeYouTubeRevenue(
        monthlyViews,
        niche,
        audienceType,
        scenario,
        projection.adRevenue.creatorNet,
        projection.sponsorship.estimatedMid,
        projection.totalMid
      );
      setAiInsight(insight);
    } catch (e: any) {
      setAiError(e.message ?? 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  }

  const projection = useMemo(() => {
    const result = YouTubeRevenueService.calculateTotalProjection(
      monthlyViews,
      niche,
      audienceType,
      0,
      scenario
    );

    if (onRevenueCalculated) {
      onRevenueCalculated({
        adRevenue: result.adRevenue.creatorNet,
        sponsorship: result.sponsorship.estimatedMid,
        total: result.totalMid
      });
    }

    return result;
  }, [monthlyViews, niche, audienceType, scenario, onRevenueCalculated]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">YouTube Revenue Calculator</h3>
              <p className="text-sm text-white/80">Estimate your monthly earnings potential</p>
            </div>
          </div>
          {geminiAvailable && (
            <button
              onClick={handleAnalyze}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Strategy
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Monthly Views
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {VIEW_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setMonthlyViews(preset.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  monthlyViews === preset.value
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min="10000"
            max="10000000"
            step="10000"
            value={monthlyViews}
            onChange={(e) => setMonthlyViews(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10K</span>
            <span className="font-semibold text-gray-900">
              {YouTubeRevenueService.formatViews(monthlyViews)} views/month
            </span>
            <span>10M</span>
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Niche</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value as ContentNiche)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {Object.entries(NICHE_MODIFIERS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{NICHE_MODIFIERS[niche].description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audience Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAudienceType('general')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    audienceType === 'general'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  General Audience
                </button>
                <button
                  onClick={() => setAudienceType('kids')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    audienceType === 'kids'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Kids (COPPA)
                </button>
              </div>
              {audienceType === 'kids' && (
                <p className="text-xs text-amber-600 mt-2">
                  COPPA restrictions reduce ad revenue, but sponsorships remain viable.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Revenue Scenario</label>
              <div className="flex gap-2">
                {(['conservative', 'moderate', 'optimistic'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      scenario === s
                        ? s === 'conservative' ? 'bg-gray-600 text-white' :
                          s === 'moderate' ? 'bg-blue-500 text-white' :
                          'bg-emerald-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Ad Revenue</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(projection.adRevenue.creatorNet)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              RPM: ${projection.adRevenue.effectiveRPM.toFixed(2)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-gray-700">Sponsorship</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">
              {formatCurrency(projection.sponsorship.estimatedMid)}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              {projection.sponsorship.likelihoodLabel}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Total Potential</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(projection.totalMid)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCurrency(projection.totalLow)} - {formatCurrency(projection.totalHigh)}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ad Revenue Share</span>
                <span className="font-medium text-gray-900">
                  {((projection.adRevenue.creatorNet / (projection.adRevenue.creatorNet + projection.sponsorship.estimatedMid)) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gray-400"
                  style={{
                    width: `${(projection.adRevenue.creatorNet / (projection.adRevenue.creatorNet + projection.sponsorship.estimatedMid)) * 100}%`
                  }}
                />
                <div
                  className="h-full bg-amber-400"
                  style={{
                    width: `${(projection.sponsorship.estimatedMid / (projection.adRevenue.creatorNet + projection.sponsorship.estimatedMid)) * 100}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Ads: {formatCurrency(projection.adRevenue.creatorNet)}</span>
                <span className="text-amber-600">Sponsors: {formatCurrency(projection.sponsorship.estimatedMid)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Estimates based on 2024 industry averages. Actual earnings vary significantly based on
            content quality, audience engagement, upload frequency, and market conditions.
            Sponsorship revenue assumes regular brand partnership opportunities.
          </p>
        </div>

        {/* AI Strategy Panel */}
        {showAI && (
          <div className="border border-purple-200 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">AI YouTube Revenue Strategy</span>
            </div>
            <div className="p-4 bg-purple-50 space-y-4">
              {aiLoading && (
                <div className="flex items-center gap-2 text-purple-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating revenue strategy...</span>
                </div>
              )}
              {aiError && (
                <div className="flex items-start gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{aiError}</span>
                </div>
              )}
              {aiInsight && !aiLoading && (
                <>
                  <p className="text-sm text-gray-700">{aiInsight.summary}</p>
                  {aiInsight.growthStrategy.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-purple-900 mb-1">Growth Strategy</p>
                      <ul className="space-y-1">
                        {aiInsight.growthStrategy.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-purple-500 mt-0.5">•</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiInsight.monetizationTips.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-purple-900 mb-1">Monetisation Tips</p>
                      <ul className="space-y-1">
                        {aiInsight.monetizationTips.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-indigo-500 font-bold mt-0.5">→</span>{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiInsight.nicheAdvice && (
                    <div className="bg-white border border-purple-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-purple-700 mb-1">Niche-Specific Advice</p>
                      <p className="text-sm text-gray-700">{aiInsight.nicheAdvice}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
