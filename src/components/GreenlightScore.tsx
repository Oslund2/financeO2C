import { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertTriangle, CheckCircle, TrendingUp, Target, Radio, Users, Film, ChevronDown, ChevronUp, Tv } from 'lucide-react';
import { analyzeGreenlightScore, type GreenlightScoreResult } from '../services/economicsAIService';
import { supabase } from '../lib/supabase';

const GENRES = [
  'Preschool Educational', 'Kids Adventure', 'Kids Comedy', 'Kids Action',
  'Family Drama', 'Family Comedy', 'Documentary/Factual', 'Animated Shorts',
  'Claymation/Stop-Motion', 'Live-Action Hybrid'
];

const AUDIENCES = [
  'Preschool (2-5)', 'Kids (6-10)', 'Tweens (8-12)', 'Teens (12-17)',
  'Family (all ages)', 'Young Adults (18-34)', 'Adults (35+)'
];

const RUNTIMES = [
  { label: '1 min (YouTube Short)', value: 1 },
  { label: '5 min (Social Short)', value: 5 },
  { label: '10 min (YouTube Standard)', value: 10 },
  { label: '11 min (TV 15-min Broadcast, 1 break)', value: 11 },
  { label: '15 min (YouTube Long Form)', value: 15 },
  { label: '22 min (TV Half-Hour, Standard Broadcast)', value: 22 },
  { label: '22 min (Streaming, No Breaks)', value: 22 },
  { label: '42 min (TV Hour Drama)', value: 42 },
];

const CHANNEL_OPTIONS = [
  'YouTube Kids', 'YouTube (General)', 'Tubi', 'Pluto TV', 'Peacock Free',
  'Amazon Freevee', 'Samsung TV Plus', 'PBS Kids', 'Nickelodeon',
  'Disney Channel', 'Cartoon Network', 'Netflix', 'Disney+', 'Apple TV+'
];

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? 'text-emerald-600' :
    score >= 60 ? 'text-blue-600' :
    score >= 40 ? 'text-amber-600' : 'text-red-600';
  const bgColor =
    score >= 80 ? 'bg-emerald-50 border-emerald-200' :
    score >= 60 ? 'bg-blue-50 border-blue-200' :
    score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 p-6 ${bgColor}`}>
      <div className={`text-6xl font-black ${color}`}>{score}</div>
      <div className={`text-sm font-bold mt-1 ${color}`}>{label}</div>
      <div className="text-xs text-gray-500 mt-1">out of 100</div>
    </div>
  );
}

interface GreenlightScoreProps {
  seriesId: string | null;
}

export function GreenlightScore({ seriesId }: GreenlightScoreProps) {
  const [seriesName, setSeriesName] = useState<string | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [genre, setGenre] = useState('Preschool Educational');
  const [targetAudience, setTargetAudience] = useState('Preschool (2-5)');
  const [runtimeMinutes, setRuntimeMinutes] = useState(11);
  const [characterCount, setCharacterCount] = useState(8);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['YouTube Kids', 'Tubi']);
  const [budgetPerEpisode, setBudgetPerEpisode] = useState(5000);
  const [episodeCount, setEpisodeCount] = useState(13);

  // Nearest RUNTIME value we support
  const snapRuntime = (mins: number) => {
    const supported = [1, 5, 10, 11, 15, 22, 42];
    return supported.reduce((prev, cur) =>
      Math.abs(cur - mins) < Math.abs(prev - mins) ? cur : prev
    );
  };

  useEffect(() => {
    if (!seriesId) {
      setSeriesName(null);
      return;
    }
    setPrefillLoading(true);

    Promise.all([
      // Series: name + default episode count
      supabase
        .from('series')
        .select('name, default_episode_count')
        .eq('id', seriesId)
        .single(),
      // Character count for this series
      supabase
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .eq('series_id', seriesId),
      // Script runtimes (most reliable source for intended runtime)
      supabase
        .from('scripts')
        .select('runtime_minutes')
        .eq('series_id', seriesId)
        .not('runtime_minutes', 'is', null),
      // Episodes: count, cost, runtime
      supabase
        .from('episodes')
        .select('estimated_cost, target_runtime_seconds')
        .eq('series_id', seriesId),
    ]).then(([seriesRes, charRes, scriptsRes, episodesRes]) => {
      const name = seriesRes.data?.name ?? null;
      setSeriesName(name);
      if (name) setGenre(name);

      // Episode count: prefer series default, fall back to actual count
      const defaultCount = seriesRes.data?.default_episode_count;
      const actualCount = episodesRes.data?.length ?? 0;
      if (defaultCount && defaultCount > 0) setEpisodeCount(defaultCount);
      else if (actualCount > 0) setEpisodeCount(actualCount);

      // Character count
      if ((charRes.count ?? 0) > 0) setCharacterCount(charRes.count!);

      // Runtime: prefer scripts, fall back to episode target_runtime_seconds
      const scriptRuntimes = (scriptsRes.data ?? [])
        .map(s => s.runtime_minutes)
        .filter((r): r is number => typeof r === 'number' && r > 0);
      const episodeRuntimesMins = (episodesRes.data ?? [])
        .map(e => e.target_runtime_seconds)
        .filter((r): r is number => typeof r === 'number' && r > 0)
        .map(s => Math.round(s / 60));

      const runtimes = scriptRuntimes.length > 0 ? scriptRuntimes : episodeRuntimesMins;
      if (runtimes.length > 0) {
        const avg = Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length);
        setRuntimeMinutes(snapRuntime(avg));
      }

      // Budget per episode: average of estimated_cost across episodes
      const costs = (episodesRes.data ?? [])
        .map(e => e.estimated_cost)
        .filter((c): c is number => typeof c === 'number' && c > 0);
      if (costs.length > 0) {
        const avgCost = Math.round(costs.reduce((a, b) => a + b, 0) / costs.length);
        setBudgetPerEpisode(avgCost);
      }
    }).finally(() => setPrefillLoading(false));
  }, [seriesId]);

  const [result, setResult] = useState<GreenlightScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const geminiAvailable = !!(import.meta.env.VITE_GEMINI_API_KEY);

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await analyzeGreenlightScore({
        genre,
        targetAudience,
        runtimeMinutes,
        characterCount,
        targetChannels: selectedChannels,
        estimatedBudgetPerEpisode: budgetPerEpisode,
        episodeCount
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
      <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Pre-Production Greenlight Score</h2>
            <p className="text-sm text-green-100">
              {prefillLoading
                ? 'Loading series data…'
                : seriesName
                  ? `Auto-filled from "${seriesName}" workspace data`
                  : 'AI concept evaluation before a single frame is produced'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Input grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {/* Series name (when active) or Genre dropdown (fallback) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {seriesName ? (
                <><Tv className="w-4 h-4 inline mr-1.5 text-green-500" />Series</>
              ) : (
                <><Film className="w-4 h-4 inline mr-1.5 text-gray-400" />Genre</>
              )}
            </label>
            {seriesName ? (
              <div className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm font-semibold text-green-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                {seriesName}
              </div>
            ) : (
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            )}
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Users className="w-4 h-4 inline mr-1.5 text-gray-400" />
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {AUDIENCES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Runtime */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Runtime Format</label>
            <select
              value={runtimeMinutes}
              onChange={e => setRuntimeMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {RUNTIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Character Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Estimated Character Count
              <span className="text-gray-400 font-normal ml-1">(recurring cast)</span>
            </label>
            <input
              type="number"
              value={characterCount}
              onChange={e => setCharacterCount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Budget per episode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Budget per Episode ($)
            </label>
            <input
              type="number"
              value={budgetPerEpisode}
              onChange={e => setBudgetPerEpisode(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              step={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Episode count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Planned Episode Count</label>
            <input
              type="number"
              value={episodeCount}
              onChange={e => setEpisodeCount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Distribution Channels */}
        <div className="mb-6">
          <button
            onClick={() => setShowChannelPicker(p => !p)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
          >
            <Radio className="w-4 h-4 text-gray-400" />
            Target Distribution Channels ({selectedChannels.length} selected)
            {showChannelPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showChannelPicker && (
            <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {CHANNEL_OPTIONS.map(ch => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedChannels.includes(ch)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          )}
          {!showChannelPicker && selectedChannels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedChannels.map(ch => (
                <span key={ch} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">{ch}</span>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        {!geminiAvailable && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            AI analysis requires VITE_GEMINI_API_KEY to be configured.
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !geminiAvailable}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analyzing concept...' : 'Run Greenlight Analysis'}
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-5">
            <div className="border-t border-gray-200 pt-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Greenlight Assessment</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Score ring */}
                <ScoreRing score={result.overallScore} label={result.scoreLabel} />

                {/* Key metrics */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Break-Even Estimate</p>
                    <p className="text-sm text-gray-800 font-medium">{result.breakEvenEstimate}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">ROI Probability Range</p>
                    <p className="text-sm text-gray-800 font-medium">{result.roiProbabilityRange}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Format Recommendation</p>
                    <p className="text-sm text-gray-800">{result.formatRecommendation}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Distribution Strategy</p>
                    <p className="text-sm text-gray-800">{result.distributionStrategy}</p>
                  </div>
                </div>
              </div>

              {/* Risk factors */}
              {result.riskFactors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Risk Factors
                  </p>
                  <ul className="space-y-1">
                    {result.riskFactors.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-red-400 font-bold mt-0.5">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Score improvements */}
              {result.scoreImprovements && result.scoreImprovements.length > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> How to Improve Your Score
                  </p>
                  <ul className="space-y-1.5">
                    {result.scoreImprovements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-500 font-bold mt-0.5">↑</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Go/No-Go */}
              {result.goNoGo && (
                <div className={`mt-4 rounded-xl p-4 flex items-start gap-3 ${
                  result.overallScore >= 60
                    ? 'bg-emerald-50 border border-emerald-300'
                    : 'bg-amber-50 border border-amber-300'
                }`}>
                  {result.overallScore >= 60
                    ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    : <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  }
                  <p className={`text-sm font-semibold ${result.overallScore >= 60 ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {result.goNoGo}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
