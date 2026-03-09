import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown, BarChart3, Star, RefreshCw, Plus, X } from 'lucide-react';
import { analyzePerformanceFeedback, type FeedbackLoopInsight } from '../services/economicsAIService';

const GENRES = [
  'Preschool Educational', 'Kids Adventure', 'Kids Comedy', 'Kids Action',
  'Family Drama', 'Family Comedy', 'Documentary/Factual', 'Animated Shorts',
  'Claymation/Stop-Motion', 'Live-Action Hybrid'
];

const AUDIENCES = [
  'Preschool (2-5)', 'Kids (6-10)', 'Tweens (8-12)', 'Teens (12-17)',
  'Family (all ages)', 'Young Adults (18-34)', 'Adults (35+)'
];

function AccuracyBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-blue-500' :
    score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const label =
    score >= 80 ? 'Excellent accuracy' :
    score >= 60 ? 'Good accuracy' :
    score >= 40 ? 'Moderate accuracy' : 'Low accuracy — review assumptions';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">Projection Accuracy Score</span>
        <span className="text-sm font-bold text-gray-900">{score}/100 — {label}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function VarianceBadge({ projected, actual, label }: { projected: number; actual: number; label: string }) {
  const pct = projected > 0 ? ((actual - projected) / projected) * 100 : 0;
  const positive = pct >= 0;
  return (
    <div className={`p-4 rounded-xl border ${positive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <div>
          <p className="text-xs text-gray-400">Projected</p>
          <p className="text-sm font-semibold text-gray-700">
            {label.toLowerCase().includes('revenue')
              ? `$${projected.toLocaleString()}`
              : `${(projected / 1000).toFixed(0)}K`}
          </p>
        </div>
        <div className={`flex items-center gap-1 font-bold text-lg ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {positive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          {positive ? '+' : ''}{pct.toFixed(0)}%
        </div>
        <div>
          <p className="text-xs text-gray-400">Actual</p>
          <p className="text-sm font-semibold text-gray-700">
            {label.toLowerCase().includes('revenue')
              ? `$${actual.toLocaleString()}`
              : `${(actual / 1000).toFixed(0)}K`}
          </p>
        </div>
      </div>
    </div>
  );
}

interface EpisodeFeedbackLoopProps {
  seriesId: string | null;
  episodeTitle?: string;
  projectedMonthlyViews?: number;
  projectedMonthlyRevenue?: number;
  productionCost?: number;
  currentDecayRate?: number;
}

export function EpisodeFeedbackLoop({
  episodeTitle: propTitle,
  projectedMonthlyViews: propViews,
  projectedMonthlyRevenue: propRevenue,
  productionCost: propCost,
  currentDecayRate: propDecay
}: EpisodeFeedbackLoopProps) {
  const [episodeTitle, setEpisodeTitle] = useState(propTitle || '');
  const [genre, setGenre] = useState('Preschool Educational');
  const [targetAudience, setTargetAudience] = useState('Preschool (2-5)');
  const [daysLive, setDaysLive] = useState(90);
  const [projectedMonthlyViews, setProjectedMonthlyViews] = useState(propViews || 50000);
  const [actualMonthlyViews, setActualMonthlyViews] = useState(0);
  const [projectedMonthlyRevenue, setProjectedMonthlyRevenue] = useState(propRevenue || 500);
  const [actualMonthlyRevenue, setActualMonthlyRevenue] = useState(0);
  const [productionCost, setProductionCost] = useState(propCost || 5000);
  const [currentDecayRate, setCurrentDecayRate] = useState(propDecay || 15);
  const [decisions, setDecisions] = useState<string[]>(['']);

  const [result, setResult] = useState<FeedbackLoopInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geminiAvailable = !!(import.meta.env.VITE_GEMINI_API_KEY);

  const addDecision = () => setDecisions(prev => [...prev, '']);
  const removeDecision = (i: number) => setDecisions(prev => prev.filter((_, idx) => idx !== i));
  const updateDecision = (i: number, val: string) =>
    setDecisions(prev => prev.map((d, idx) => idx === i ? val : d));

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await analyzePerformanceFeedback({
        episodeTitle: episodeTitle || 'Unnamed Episode',
        projectedMonthlyViews,
        actualMonthlyViews,
        projectedMonthlyRevenue,
        actualMonthlyRevenue,
        daysLive,
        productionCost,
        topPerformingProductionDecisions: decisions.filter(d => d.trim()),
        genre,
        targetAudience,
        currentDecayRate
      });
      setResult(r);
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Episode Performance Feedback Loop</h2>
            <p className="text-sm text-emerald-100">Feed in actuals · AI recalibrates your decay model · Get next-episode recommendations</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Episode Title</label>
            <input
              value={episodeTitle}
              onChange={e => setEpisodeTitle(e.target.value)}
              placeholder="Which episode is this for?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Genre</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
            <select
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {AUDIENCES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Days Live</label>
            <input
              type="number"
              value={daysLive}
              onChange={e => setDaysLive(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Production Cost ($)</label>
            <input
              type="number"
              value={productionCost}
              onChange={e => setProductionCost(Math.max(0, parseInt(e.target.value) || 0))}
              step={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Decay Rate (%/year)</label>
            <input
              type="number"
              value={currentDecayRate}
              onChange={e => setCurrentDecayRate(Math.max(0, parseFloat(e.target.value) || 0))}
              step={1}
              min={0}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Views comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              Monthly Views
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Projected</label>
                <input
                  type="number"
                  value={projectedMonthlyViews}
                  onChange={e => setProjectedMonthlyViews(Math.max(0, parseInt(e.target.value) || 0))}
                  step={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Actual (from YouTube Studio)</label>
                <input
                  type="number"
                  value={actualMonthlyViews}
                  onChange={e => setActualMonthlyViews(Math.max(0, parseInt(e.target.value) || 0))}
                  step={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Monthly Revenue
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Projected ($)</label>
                <input
                  type="number"
                  value={projectedMonthlyRevenue}
                  onChange={e => setProjectedMonthlyRevenue(Math.max(0, parseFloat(e.target.value) || 0))}
                  step={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Actual ($)</label>
                <input
                  type="number"
                  value={actualMonthlyRevenue}
                  onChange={e => setActualMonthlyRevenue(Math.max(0, parseFloat(e.target.value) || 0))}
                  step={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Production decisions */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Production Decisions That Felt Right
            <span className="text-xs text-gray-400 font-normal ml-1">(what worked well in making this episode?)</span>
          </label>
          <div className="space-y-2">
            {decisions.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={d}
                  onChange={e => updateDecision(i, e.target.value)}
                  placeholder={`e.g. Used 3 characters instead of 8, kept it simple`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
                {decisions.length > 1 && (
                  <button onClick={() => removeDecision(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addDecision}
            className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add another decision
          </button>
        </div>

        {!geminiAvailable && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            AI analysis requires VITE_GEMINI_API_KEY to be configured.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !geminiAvailable}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analyzing performance...' : 'Analyze & Recalibrate'}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-5 border-t border-gray-200 pt-5">
            <h3 className="text-base font-semibold text-gray-900">Performance Analysis & Recalibration</h3>

            {/* Variance badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <VarianceBadge
                projected={projectedMonthlyViews}
                actual={actualMonthlyViews}
                label="Monthly Views"
              />
              <VarianceBadge
                projected={projectedMonthlyRevenue}
                actual={actualMonthlyRevenue}
                label="Monthly Revenue"
              />
            </div>

            {/* Accuracy bar */}
            <AccuracyBar score={result.projectionAccuracyScore} />

            {/* Performance summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Performance Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.performanceSummary}</p>
              {result.varianceAnalysis && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed border-t border-gray-200 pt-2">{result.varianceAnalysis}</p>
              )}
            </div>

            {/* Revised decay rate */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-blue-800">Revised Decay Rate</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Was: {currentDecayRate}%/yr</span>
                  <span className={`text-lg font-black ${
                    result.revisedDecayRate < currentDecayRate ? 'text-emerald-600' :
                    result.revisedDecayRate > currentDecayRate ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    → {result.revisedDecayRate}%/yr
                  </span>
                </div>
              </div>
              {result.revisedDecayRationale && (
                <p className="text-sm text-blue-700">{result.revisedDecayRationale}</p>
              )}
            </div>

            {/* Top ROI decisions */}
            {result.topRoiDecisions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Top ROI Production Decisions
                </p>
                <ul className="space-y-2">
                  {result.topRoiDecisions.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-gray-800">
                      <span className="font-bold text-amber-600 flex-shrink-0">#{i + 1}</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next episode recommendation */}
            {result.nextEpisodeRecommendation && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800 mb-1">Next Episode Recommendation</p>
                  <p className="text-sm text-emerald-700">{result.nextEpisodeRecommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
