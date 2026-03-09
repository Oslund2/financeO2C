import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, Copy, Check, ChevronDown, ChevronUp, Youtube, Tv, Radio } from 'lucide-react';
import { generateDistributionPackage, type DistributionPackage } from '../services/economicsAIService';

const GENRES = [
  'Preschool Educational', 'Kids Adventure', 'Kids Comedy', 'Kids Action',
  'Family Drama', 'Family Comedy', 'Documentary/Factual', 'Animated Shorts',
  'Claymation/Stop-Motion', 'Live-Action Hybrid'
];

const AUDIENCES = [
  'Preschool (2-5)', 'Kids (6-10)', 'Tweens (8-12)', 'Teens (12-17)',
  'Family (all ages)', 'Young Adults (18-34)', 'Adults (35+)'
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Section({
  title, icon, color, children, defaultOpen = false
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border overflow-hidden ${color}`}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3 font-semibold text-sm">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-black/10">{children}</div>}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <CopyButton text={value} />
      </div>
      <p className={`text-sm text-gray-800 ${mono ? 'font-mono bg-gray-100 rounded p-3 text-xs whitespace-pre-wrap overflow-x-auto' : ''}`}>
        {value}
      </p>
    </div>
  );
}

interface DistributionPackageGeneratorProps {
  seriesId: string | null;
  episodeTitle?: string;
  productionCost?: number;
  roiMultiple?: number;
  breakEvenMonths?: number;
  distributionChannels?: string[];
}

export function DistributionPackageGenerator({
  episodeTitle: propEpisodeTitle,
  productionCost: propProductionCost,
  roiMultiple: propRoiMultiple,
  breakEvenMonths: propBreakEvenMonths,
  distributionChannels: propChannels
}: DistributionPackageGeneratorProps) {
  const [episodeTitle, setEpisodeTitle] = useState(propEpisodeTitle || '');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [genre, setGenre] = useState('Preschool Educational');
  const [targetAudience, setTargetAudience] = useState('Preschool (2-5)');
  const [runtimeMinutes, setRuntimeMinutes] = useState(11);
  const [synopsis, setSynopsis] = useState('');
  const [productionCost, setProductionCost] = useState(propProductionCost || 5000);
  const [roiMultiple, setRoiMultiple] = useState(propRoiMultiple || 2.5);
  const [breakEvenMonths, setBreakEvenMonths] = useState(propBreakEvenMonths || 18);
  const [channelsText, setChannelsText] = useState((propChannels || ['YouTube Kids', 'Tubi']).join(', '));

  const [result, setResult] = useState<DistributionPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geminiAvailable = !!(import.meta.env.VITE_GEMINI_API_KEY);

  const handleGenerate = async () => {
    if (!episodeTitle.trim() || !synopsis.trim()) {
      setError('Episode title and synopsis are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await generateDistributionPackage({
        episodeTitle: episodeTitle.trim(),
        seriesTitle: seriesTitle.trim() || undefined,
        genre,
        targetAudience,
        runtimeMinutes,
        synopsis: synopsis.trim(),
        productionCost,
        roiMultiple,
        breakEvenMonths,
        distributionChannels: channelsText.split(',').map(c => c.trim()).filter(Boolean)
      });
      setResult(r);
    } catch (e: any) {
      setError(e.message ?? 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Distribution Package Generator</h2>
            <p className="text-sm text-blue-100">YouTube SEO · FAST/AVOD metadata · Broadcast pitch — all in one click</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Input grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Episode Title *</label>
            <input
              value={episodeTitle}
              onChange={e => setEpisodeTitle(e.target.value)}
              placeholder="e.g. The Spelunking Spellbinder"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Series Title</label>
            <input
              value={seriesTitle}
              onChange={e => setSeriesTitle(e.target.value)}
              placeholder="e.g. The Spelling Bee Show"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Genre</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
            <select
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {AUDIENCES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Runtime (minutes)</label>
            <input
              type="number"
              value={runtimeMinutes}
              onChange={e => setRuntimeMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Distribution Channels</label>
            <input
              value={channelsText}
              onChange={e => setChannelsText(e.target.value)}
              placeholder="YouTube Kids, Tubi, Pluto TV"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Production Cost ($)</label>
            <input
              type="number"
              value={productionCost}
              onChange={e => setProductionCost(Math.max(0, parseInt(e.target.value) || 0))}
              step={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ROI Multiple</label>
              <input
                type="number"
                value={roiMultiple}
                onChange={e => setRoiMultiple(parseFloat(e.target.value) || 1)}
                step={0.1}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Break-Even (months)</label>
              <input
                type="number"
                value={breakEvenMonths}
                onChange={e => setBreakEvenMonths(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Episode Synopsis *</label>
          <textarea
            value={synopsis}
            onChange={e => setSynopsis(e.target.value)}
            placeholder="Brief description of the episode — characters, conflict, resolution, themes..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {!geminiAvailable && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            AI generation requires VITE_GEMINI_API_KEY to be configured.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !geminiAvailable}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generating package...' : 'Generate Distribution Package'}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* YouTube */}
            <Section
              title="YouTube Distribution"
              icon={<Youtube className="w-4 h-4 text-red-600" />}
              color="border-red-200 bg-red-50 text-red-900"
              defaultOpen
            >
              <Field label="SEO Title" value={result.youtube.title} />
              <Field label="Description" value={result.youtube.description} />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</p>
                  <CopyButton text={result.youtube.tags.join(', ')} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.youtube.tags.map((t, i) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              <Field label="Chapter Timestamps" value={result.youtube.chapterTimestamps} mono />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Thumbnail Concepts</p>
                <div className="space-y-2">
                  {result.youtube.thumbnailConcepts.map((tc, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-200 text-sm text-gray-800">
                      <span className="font-bold text-red-500 flex-shrink-0">#{i + 1}</span>
                      <span>{tc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* FAST/AVOD */}
            <Section
              title="FAST / AVOD Metadata"
              icon={<Tv className="w-4 h-4 text-cyan-700" />}
              color="border-cyan-200 bg-cyan-50 text-cyan-900"
            >
              <Field label="EPG Title" value={result.fastAvod.epgTitle} />
              <Field label="EPG Description (≤150 chars)" value={result.fastAvod.epgDescription} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Recommended Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {result.fastAvod.recommendedPlatforms.map((p, i) => (
                    <span key={i} className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">{p}</span>
                  ))}
                </div>
              </div>
              <Field label="XMLTV Snippet" value={result.fastAvod.xmlSnippet} mono />
            </Section>

            {/* Broadcast Pitch */}
            <Section
              title="Broadcast Pitch One-Pager"
              icon={<Radio className="w-4 h-4 text-indigo-700" />}
              color="border-indigo-200 bg-indigo-50 text-indigo-900"
            >
              <Field label="Logline" value={result.broadcastPitch.logline} />
              <Field label="Format Specification" value={result.broadcastPitch.formatSpec} />
              <Field label="Cost & ROI Snapshot" value={result.broadcastPitch.costRoiSnapshot} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Comp Titles</p>
                <div className="flex flex-wrap gap-2">
                  {result.broadcastPitch.compTitles.map((c, i) => (
                    <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{c}</span>
                  ))}
                </div>
              </div>
              <Field label="Pitch Summary" value={result.broadcastPitch.pitchSummary} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
