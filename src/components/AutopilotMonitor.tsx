import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, Clock, ChevronDown, ChevronUp, Play, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AutopilotRun, PipelineState } from '../services/autopilotProgressTracker';
import { STATE_LABELS } from '../services/autopilotProgressTracker';

interface AutopilotMonitorProps {
  runId: string;
  onBack: () => void;
}

const PIPELINE_STAGES: PipelineState[] = [
  'initiated', 'scripting', 'shot_planning', 'storyboarding',
  'video_rendering', 'dialogue_audio', 'lip_sync', 'assembling', 'complete',
];

function stageIndex(state: PipelineState): number {
  return PIPELINE_STAGES.indexOf(state);
}

export function AutopilotMonitor({ runId, onBack }: AutopilotMonitorProps) {
  const [run, setRun] = useState<AutopilotRun | null>(null);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    // Initial fetch
    supabase
      .from('autopilot_runs')
      .select('*')
      .eq('id', runId)
      .single()
      .then(({ data }) => { if (data) setRun(data as AutopilotRun); });

    // Real-time subscription
    const channel = supabase
      .channel(`autopilot-run-${runId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'autopilot_runs', filter: `id=eq.${runId}` },
        (payload) => setRun(payload.new as AutopilotRun)
      )
      .subscribe();

    // Also poll every 5s as backup
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('autopilot_runs')
        .select('*')
        .eq('id', runId)
        .single();
      if (data) setRun(data as AutopilotRun);
    }, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [runId]);

  if (!run) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFailed = run.current_state === 'failed';
  const isComplete = run.current_state === 'complete';
  const currentIdx = stageIndex(run.current_state as PipelineState);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">Autopilot Run</h2>
          <p className="text-sm text-gray-500 truncate">{run.storyline}</p>
        </div>
        {isComplete && (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">Complete</span>
        )}
        {isFailed && (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">Failed</span>
        )}
        {!isComplete && !isFailed && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full animate-pulse">Running</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {run.current_stage_detail || STATE_LABELS[run.current_state as PipelineState] || run.current_state}
          </span>
          <span className="text-sm font-bold text-scripps-blue">{Math.max(0, run.progress_percent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isFailed ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-scripps-blue to-scripps-light-blue'
            }`}
            style={{ width: `${Math.max(0, run.progress_percent)}%` }}
          />
        </div>

        {/* Stage timeline */}
        <div className="mt-6 space-y-2">
          {PIPELINE_STAGES.filter(s => s !== 'initiated').map((stage) => {
            const idx = stageIndex(stage);
            const completed = run.stages_completed?.includes(stage) || (isComplete && stage !== 'complete');
            const isCurrent = run.current_state === stage;
            const isPending = idx > currentIdx && !isComplete;

            return (
              <div key={stage} className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {completed || (isComplete && stage === 'complete') ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : isFailed && isCurrent ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : isCurrent ? (
                    <Loader className="w-5 h-5 text-scripps-blue animate-spin" />
                  ) : (
                    <div className={`w-3 h-3 rounded-full ${isPending ? 'bg-gray-300' : 'bg-gray-200'}`} />
                  )}
                </div>
                <span className={`text-sm ${
                  isCurrent ? 'font-semibold text-gray-900' :
                  completed ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {STATE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Run Info */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">Format</div>
            <div className="text-sm font-medium text-gray-900 capitalize">{run.format_type.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Runtime</div>
            <div className="text-sm font-medium text-gray-900">{run.target_runtime_minutes} min</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Quality</div>
            <div className="text-sm font-medium text-gray-900 capitalize">{run.quality_preset.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Started</div>
            <div className="text-sm font-medium text-gray-900">
              {run.started_at ? new Date(run.started_at).toLocaleTimeString() : run.created_at ? new Date(run.created_at).toLocaleTimeString() : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {isFailed && run.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 mb-1">Pipeline Failed</h4>
              <p className="text-sm text-red-700">{run.error_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Output Video */}
      {isComplete && run.output_video_url && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Play className="w-4 h-4" /> Final Video
            </h3>
          </div>
          <div className="bg-black flex items-center justify-center">
            <video
              src={run.output_video_url}
              controls
              className="max-w-full max-h-[500px]"
              preload="metadata"
            />
          </div>
        </div>
      )}

      {/* Decision Log */}
      {run.decision_log && run.decision_log.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowLog(!showLog)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Decision Log ({run.decision_log.length})</h3>
            {showLog ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          {showLog && (
            <div className="border-t border-gray-200 max-h-64 overflow-y-auto">
              {run.decision_log.map((entry, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900">{entry.decision}</p>
                      {entry.rationale && (
                        <p className="text-xs text-gray-500 mt-0.5">{entry.rationale}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skipped shots info */}
      {run.skipped_shots && run.skipped_shots.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>{run.skipped_shots.length} shot(s) were skipped</strong> during rendering due to errors.
            The final video was assembled with available shots.
          </p>
        </div>
      )}
    </div>
  );
}
