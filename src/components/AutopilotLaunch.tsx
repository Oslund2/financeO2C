import { useState } from 'react';
import { Rocket, Sparkles, Clock, Zap, Scale, Crown } from 'lucide-react';
import { startAutopilotRun } from '../services/autopilotPipelineOrchestrator';
import { estimatePipelineMinutes } from '../services/autopilotDecisionEngine';
import type { FormatType, QualityPreset } from '../services/autopilotDecisionEngine';

interface AutopilotLaunchProps {
  seriesId: string | null;
  organizationId: string;
  onRunStarted: (runId: string) => void;
}

const FORMAT_OPTIONS: { value: FormatType; label: string; desc: string }[] = [
  { value: 'short_form', label: 'Short Form', desc: '< 2 min, social media style' },
  { value: 'medium_form', label: 'Medium Form', desc: '2–10 min, YouTube style' },
  { value: 'streaming', label: 'Streaming', desc: '10–30 min, streaming episode' },
  { value: 'broadcast', label: 'Broadcast', desc: '22+ min, broadcast TV' },
  { value: 'spot', label: 'Spot/Ad', desc: '15–60 sec commercial' },
];

const QUALITY_OPTIONS: { value: QualityPreset; label: string; icon: typeof Zap; desc: string }[] = [
  { value: 'fast', label: 'Fast', icon: Zap, desc: 'Quick turnaround, 720p' },
  { value: 'balanced', label: 'Balanced', icon: Scale, desc: 'Good quality, reasonable time' },
  { value: 'max_quality', label: 'Max Quality', icon: Crown, desc: 'Best quality, 1080p, longer' },
];

export function AutopilotLaunch({ seriesId, organizationId, onRunStarted }: AutopilotLaunchProps) {
  const [storyline, setStoryline] = useState('');
  const [formatType, setFormatType] = useState<FormatType>('streaming');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('balanced');
  const [targetRuntime, setTargetRuntime] = useState(5);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedMinutes = estimatePipelineMinutes(targetRuntime, qualityPreset);

  const handleLaunch = async () => {
    if (!storyline.trim() || !seriesId) return;
    setLaunching(true);
    setError(null);
    try {
      const runId = await startAutopilotRun({
        seriesId,
        organizationId,
        storyline: storyline.trim(),
        formatType,
        targetRuntimeMinutes: targetRuntime,
        qualityPreset,
      });
      onRunStarted(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start autopilot run');
      setLaunching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-xl font-bold">Autopilot Production</h2>
          </div>
          <p className="text-blue-100 text-sm">
            Enter your storyline and walk away. We'll handle scripting, storyboarding,
            video generation, audio, lip sync, and final assembly.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Storyline */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Storyline</label>
            <textarea
              value={storyline}
              onChange={(e) => setStoryline(e.target.value)}
              placeholder="Describe your episode idea... e.g., 'A spelling bee where the contestants discover the words have magical powers that bring objects to life in the arena.'"
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent resize-none text-sm"
              disabled={launching}
            />
            <p className="text-xs text-gray-500 mt-1">{storyline.length} characters</p>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormatType(opt.value)}
                  disabled={launching}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formatType === opt.value
                      ? 'border-scripps-blue bg-blue-50 ring-2 ring-scripps-blue'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Preset */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quality Preset</label>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setQualityPreset(opt.value)}
                    disabled={launching}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      qualityPreset === opt.value
                        ? 'border-scripps-blue bg-blue-50 ring-2 ring-scripps-blue'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${qualityPreset === opt.value ? 'text-scripps-blue' : 'text-gray-400'}`} />
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Runtime */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Target Runtime: {targetRuntime} min
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={targetRuntime}
              onChange={(e) => setTargetRuntime(Number(e.target.value))}
              disabled={launching}
              className="w-full accent-scripps-blue"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 min</span>
              <span>30 min</span>
            </div>
          </div>

          {/* Estimate */}
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Estimated pipeline time: <strong>~{estimatedMinutes} minutes</strong>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Launch Button */}
          <button
            onClick={handleLaunch}
            disabled={launching || !storyline.trim() || !seriesId}
            className="w-full py-4 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {launching ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Start Production
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
