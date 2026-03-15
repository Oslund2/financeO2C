import { useState, useEffect } from 'react';
import { Sparkles, Plus, Clock, CheckCircle, XCircle, Loader, ChevronRight } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { fetchRunsForOrg, type AutopilotRun, STATE_LABELS, type PipelineState } from '../services/autopilotProgressTracker';
import { AutopilotLaunch } from './AutopilotLaunch';
import { AutopilotMonitor } from './AutopilotMonitor';

interface AutopilotDashboardProps {
  seriesId: string | null;
}

export function AutopilotDashboard({ seriesId }: AutopilotDashboardProps) {
  const { currentOrganization } = useOrganization();
  const [runs, setRuns] = useState<AutopilotRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'launch' | 'monitor'>('list');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const loadRuns = async () => {
    if (!currentOrganization) return;
    const data = await fetchRunsForOrg(currentOrganization.id);
    setRuns(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRuns();
    const interval = setInterval(loadRuns, 10000);
    return () => clearInterval(interval);
  }, [currentOrganization]);

  const handleRunStarted = (runId: string) => {
    setActiveRunId(runId);
    setView('monitor');
  };

  const handleViewRun = (runId: string) => {
    setActiveRunId(runId);
    setView('monitor');
  };

  const handleBack = () => {
    setView('list');
    setActiveRunId(null);
    loadRuns();
  };

  if (view === 'launch' && currentOrganization) {
    return (
      <div className="p-4 sm:p-8">
        <AutopilotLaunch
          seriesId={seriesId}
          organizationId={currentOrganization.id}
          onRunStarted={handleRunStarted}
        />
        <div className="max-w-2xl mx-auto mt-4">
          <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700">
            Back to runs
          </button>
        </div>
      </div>
    );
  }

  if (view === 'monitor' && activeRunId) {
    return (
      <div className="p-4 sm:p-8">
        <AutopilotMonitor runId={activeRunId} onBack={handleBack} />
      </div>
    );
  }

  // List view
  const activeRuns = runs.filter(r => !['complete', 'failed'].includes(r.current_state));
  const pastRuns = runs.filter(r => ['complete', 'failed'].includes(r.current_state));

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-scripps-blue" />
              Autopilot
            </h1>
            <p className="text-sm text-gray-500 mt-1">Autonomous video production — enter a storyline, walk away, get a video</p>
          </div>
          <button
            onClick={() => setView('launch')}
            className="px-5 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Run
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No autopilot runs yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Start your first autonomous production run. Just enter a storyline and
              we'll handle everything — scripting, storyboarding, video, audio, and assembly.
            </p>
            <button
              onClick={() => setView('launch')}
              className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Start First Run
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Runs */}
            {activeRuns.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Active Runs</h2>
                <div className="space-y-3">
                  {activeRuns.map((run) => (
                    <RunCard key={run.id} run={run} onView={() => handleViewRun(run.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Runs */}
            {pastRuns.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Completed</h2>
                <div className="space-y-3">
                  {pastRuns.map((run) => (
                    <RunCard key={run.id} run={run} onView={() => handleViewRun(run.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RunCard({ run, onView }: { run: AutopilotRun; onView: () => void }) {
  const isComplete = run.current_state === 'complete';
  const isFailed = run.current_state === 'failed';
  const isRunning = !isComplete && !isFailed;

  return (
    <button
      onClick={onView}
      className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all text-left flex items-center gap-4"
    >
      <div className="shrink-0">
        {isComplete && <CheckCircle className="w-8 h-8 text-green-500" />}
        {isFailed && <XCircle className="w-8 h-8 text-red-500" />}
        {isRunning && <Loader className="w-8 h-8 text-scripps-blue animate-spin" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{run.storyline}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500 capitalize">{run.format_type.replace('_', ' ')}</span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500">{run.target_runtime_minutes} min</span>
          <span className="text-xs text-gray-400">|</span>
          <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : isFailed ? 'text-red-600' : 'text-blue-600'}`}>
            {STATE_LABELS[run.current_state as PipelineState] || run.current_state}
          </span>
        </div>
        {isRunning && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-scripps-blue to-scripps-light-blue transition-all duration-500"
              style={{ width: `${Math.max(0, run.progress_percent)}%` }}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <span className="text-xs text-gray-400">
          {new Date(run.created_at).toLocaleDateString()}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </button>
  );
}

export default AutopilotDashboard;
