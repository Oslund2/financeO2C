import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Film,
  Play,
  Download,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Scissors,
  Music,
  Eye,
  Zap,
  AlertTriangle,
  CheckCircle,
  Settings,
  RotateCcw,
} from 'lucide-react';
import type {
  EditDecisionList,
  EditDecision,
  EditorState,
  TransitionType,
  EditorialShot,
} from '../types/editorialEngine';
import type { FormatType } from '../types/formatConfig';
import type { EditorialEngineInput } from '../services/editorial/editorialDecisionEngine';
import { generateEDL } from '../services/editorial/editorialDecisionEngine';
import { getAllFormatProfiles } from '../services/editorial/formatProfileManager';
import { renderEDL } from '../services/ffmpegService';
import type { ProgressCallback } from '../services/ffmpegService';

// ── Props ─────────────────────────────────────────────────────

interface FFmpegEditorProps {
  episodeId: string;
  shots: EditorialShot[];
  formatType: FormatType;
  assemblyType: 'rough_cut' | 'final_cut' | 'trailer' | 'preview';
  hasBackgroundMusic: boolean;
  onClose: () => void;
  onSave?: (blob: Blob, edl: EditDecisionList) => void;
}

// ── Transition display names ──────────────────────────────────

const TRANSITION_LABELS: Record<TransitionType, string> = {
  cut: 'Hard Cut',
  dissolve: 'Dissolve',
  fade_black: 'Fade to Black',
  fade_white: 'Fade to White',
  wipe: 'Wipe',
  j_cut: 'J-Cut',
  l_cut: 'L-Cut',
  dip_to_black: 'Dip to Black',
};

// ── Component ─────────────────────────────────────────────────

export default function FFmpegEditor({
  episodeId,
  shots,
  formatType,
  assemblyType,
  hasBackgroundMusic,
  onClose,
  onSave,
}: FFmpegEditorProps) {
  const [state, setState] = useState<EditorState>({
    edl: null,
    renderPlan: null,
    isGeneratingEDL: false,
    isRendering: false,
    renderProgress: 0,
    currentStage: '',
    previewUrl: null,
    outputUrl: null,
    selectedDecisionId: null,
    overrides: new Map(),
  });

  const [selectedFormat, setSelectedFormat] = useState<FormatType>(formatType);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showEDLInspector, setShowEDLInspector] = useState(false);
  const [edlFilter, setEdlFilter] = useState<EditDecision['type'] | 'all'>('all');
  const videoRef = useRef<HTMLVideoElement>(null);
  const outputBlobRef = useRef<Blob | null>(null);

  const profiles = getAllFormatProfiles();

  // ── Generate EDL on mount or format change ──
  useEffect(() => {
    generateEditDecisionList();
  }, [selectedFormat]);

  const generateEditDecisionList = useCallback(() => {
    setState(s => ({ ...s, isGeneratingEDL: true, edl: null }));

    // Run async in a microtask to avoid blocking UI
    setTimeout(() => {
      try {
        const input: EditorialEngineInput = {
          episodeId,
          shots,
          formatType: selectedFormat,
          assemblyType,
          hasBackgroundMusic,
        };

        const result = generateEDL(input);
        setState(s => ({
          ...s,
          edl: result.edl,
          isGeneratingEDL: false,
          outputUrl: null,
          previewUrl: null,
        }));
        setWarnings(result.warnings);
      } catch (err) {
        console.error('EDL generation failed:', err);
        setState(s => ({ ...s, isGeneratingEDL: false }));
        setWarnings(['EDL generation failed: ' + (err instanceof Error ? err.message : 'Unknown error')]);
      }
    }, 0);
  }, [episodeId, shots, selectedFormat, assemblyType, hasBackgroundMusic]);

  // ── Render EDL with FFmpeg ──
  const handleRender = useCallback(async () => {
    if (!state.edl) return;

    setState(s => ({ ...s, isRendering: true, renderProgress: 0, currentStage: 'Initializing...' }));

    try {
      const onProgress: ProgressCallback = (progress) => {
        setState(s => ({
          ...s,
          renderProgress: progress.percent,
          currentStage: progress.message,
        }));
      };

      const blob = await renderEDL(state.edl, onProgress);
      const url = URL.createObjectURL(blob);
      outputBlobRef.current = blob;

      setState(s => ({
        ...s,
        isRendering: false,
        outputUrl: url,
        renderProgress: 100,
        currentStage: 'Complete',
      }));
    } catch (err) {
      console.error('Render failed:', err);
      setState(s => ({ ...s, isRendering: false, currentStage: 'Failed' }));
      setWarnings(prev => [...prev, 'Render failed: ' + (err instanceof Error ? err.message : 'Unknown error')]);
    }
  }, [state.edl]);

  // ── Download output ──
  const handleDownload = useCallback(() => {
    if (!state.outputUrl) return;
    const a = document.createElement('a');
    a.href = state.outputUrl;
    a.download = `${assemblyType}_${episodeId}_ffmpeg.mp4`;
    a.click();
  }, [state.outputUrl, assemblyType, episodeId]);

  // ── Save to parent ──
  const handleSave = useCallback(() => {
    if (outputBlobRef.current && state.edl && onSave) {
      onSave(outputBlobRef.current, state.edl);
    }
  }, [state.edl, onSave]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    };
  }, []);

  // ── Filtered EDL decisions ──
  const filteredDecisions = state.edl?.decisions.filter(
    d => edlFilter === 'all' || d.type === edlFilter
  ) ?? [];

  // ── Render ──
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Film className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">FFmpeg Editorial Editor</h2>
              <p className="text-sm text-gray-500">
                {state.edl
                  ? `${state.edl.decisions.filter(d => d.type === 'clip').length} shots · ${state.edl.totalDurationSeconds.toFixed(1)}s · ${state.edl.averageCutRateCPM.toFixed(1)} cuts/min`
                  : 'Generating edit decisions...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Format Profile Selector ── */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Format Profile:</label>
            <div className="flex gap-2 flex-wrap">
              {profiles.map(profile => (
                <button
                  key={profile.formatType}
                  onClick={() => setSelectedFormat(profile.formatType)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedFormat === profile.formatType
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {profile.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Warnings ── */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Loading State ── */}
          {state.isGeneratingEDL && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Analyzing shots and generating edit decisions...</p>
              </div>
            </div>
          )}

          {/* ── EDL Stats ── */}
          {state.edl && !state.isGeneratingEDL && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Scissors className="w-4 h-4 text-indigo-500" />}
                  label="Total Cuts"
                  value={state.edl.totalCuts.toString()}
                />
                <StatCard
                  icon={<Zap className="w-4 h-4 text-amber-500" />}
                  label="Cut Rate"
                  value={`${state.edl.averageCutRateCPM.toFixed(1)} cpm`}
                />
                <StatCard
                  icon={<Music className="w-4 h-4 text-green-500" />}
                  label="Audio Decisions"
                  value={state.edl.decisions.filter(d => d.type === 'audio_keyframe').length.toString()}
                />
                <StatCard
                  icon={<Eye className="w-4 h-4 text-purple-500" />}
                  label="Visual FX"
                  value={(
                    state.edl.decisions.filter(d => d.type === 'video_keyframe').length +
                    state.edl.decisions.filter(d => d.type === 'filter').length
                  ).toString()}
                />
              </div>

              {/* ── Transition Breakdown ── */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Transition Mix</h3>
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(state.edl.transitionsUsed)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <span key={type} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs">
                        <span className="font-medium text-gray-900">{count}</span>
                        <span className="text-gray-500">{TRANSITION_LABELS[type as TransitionType] ?? type}</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* ── Preview / Output ── */}
              {state.outputUrl && (
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={state.outputUrl}
                    controls
                    className="w-full max-h-[400px]"
                  />
                </div>
              )}

              {/* ── Render Progress ── */}
              {state.isRendering && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{state.currentStage}</span>
                    <span className="font-medium text-indigo-600">{state.renderProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${state.renderProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ── EDL Inspector ── */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowEDLInspector(!showEDLInspector)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Edit Decision List ({state.edl.decisions.length} decisions)
                  </span>
                  {showEDLInspector ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {showEDLInspector && (
                  <div className="border-t border-gray-200">
                    {/* Filter tabs */}
                    <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-200">
                      {(['all', 'clip', 'transition', 'audio_keyframe', 'video_keyframe', 'filter'] as const).map(filter => (
                        <button
                          key={filter}
                          onClick={() => setEdlFilter(filter)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            edlFilter === filter
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {filter === 'all' ? 'All' :
                           filter === 'clip' ? 'Clips' :
                           filter === 'transition' ? 'Transitions' :
                           filter === 'audio_keyframe' ? 'Audio' :
                           filter === 'video_keyframe' ? 'Keyframes' : 'Filters'}
                        </button>
                      ))}
                    </div>

                    {/* Decision list */}
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                      {filteredDecisions.map(decision => (
                        <EDLDecisionRow key={decision.id} decision={decision} />
                      ))}
                      {filteredDecisions.length === 0 && (
                        <div className="p-4 text-sm text-gray-400 text-center">No decisions of this type</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={generateEditDecisionList}
              disabled={state.isGeneratingEDL || state.isRendering}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerate EDL
            </button>
          </div>

          <div className="flex items-center gap-3">
            {state.outputUrl && (
              <>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {onSave && (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleRender}
              disabled={!state.edl || state.isRendering || state.isGeneratingEDL}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Render with FFmpeg
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function EDLDecisionRow({ decision }: { decision: EditDecision }) {
  const typeIcons: Record<EditDecision['type'], React.ReactNode> = {
    clip: <Film className="w-3.5 h-3.5 text-blue-500" />,
    transition: <Scissors className="w-3.5 h-3.5 text-amber-500" />,
    audio_keyframe: <Music className="w-3.5 h-3.5 text-green-500" />,
    video_keyframe: <Eye className="w-3.5 h-3.5 text-purple-500" />,
    filter: <Settings className="w-3.5 h-3.5 text-gray-500" />,
  };

  const typeLabels: Record<EditDecision['type'], string> = {
    clip: 'Clip',
    transition: 'Transition',
    audio_keyframe: 'Audio',
    video_keyframe: 'Keyframe',
    filter: 'Filter',
  };

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <div className="mt-0.5">{typeIcons[decision.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">{formatTimecode(decision.timelinePosition)}</span>
          <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
            {typeLabels[decision.type]}
          </span>
          {decision.transitionType && (
            <span className="text-xs px-1.5 py-0.5 bg-indigo-50 rounded text-indigo-600">
              {TRANSITION_LABELS[decision.transitionType] ?? decision.transitionType}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{decision.rationale}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{decision.duration.toFixed(1)}s</span>
    </div>
  );
}

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}
