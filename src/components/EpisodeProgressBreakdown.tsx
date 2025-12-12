import { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, RefreshCw,
  Film, Users, FileText, Camera, List, Sparkles, Video, Mic, PlayCircle,
  ArrowRight, ChevronRight
} from 'lucide-react';
import {
  EpisodeProgressService,
  type EpisodeProgressBreakdown as ProgressBreakdownType,
  type WorkflowProgress
} from '../services/episodeProgressService';

interface EpisodeProgressBreakdownProps {
  episodeId: string;
  inline?: boolean;
  showRefreshButton?: boolean;
  onProgressUpdate?: (progress: number) => void;
  onNavigate?: (view: string, data?: any) => void;
}

export function EpisodeProgressBreakdown({
  episodeId,
  inline = false,
  showRefreshButton = false,
  onProgressUpdate,
  onNavigate
}: EpisodeProgressBreakdownProps) {
  const [viewMode, setViewMode] = useState<'phases' | 'workflow'>(() => {
    const saved = localStorage.getItem('progress-view-mode');
    return (saved === 'phases' || saved === 'workflow') ? saved : 'workflow';
  });
  const [breakdown, setBreakdown] = useState<ProgressBreakdownType | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBreakdown();
  }, [episodeId]);

  const loadBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);

      const [phasesData, workflowData] = await Promise.all([
        EpisodeProgressService.getProgressBreakdown(episodeId),
        EpisodeProgressService.getWorkflowProgress(episodeId)
      ]);

      setBreakdown(phasesData);
      setWorkflowProgress(workflowData);

      if (phasesData && onProgressUpdate) {
        onProgressUpdate(phasesData.total_progress);
      }
    } catch (err) {
      console.error('Error loading progress breakdown:', err);
      setError('Failed to load progress breakdown');
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (mode: 'phases' | 'workflow') => {
    setViewMode(mode);
    localStorage.setItem('progress-view-mode', mode);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await EpisodeProgressService.calculateEpisodeProgress(episodeId);
      await loadBreakdown();
    } catch (err) {
      console.error('Error refreshing progress:', err);
      setError('Failed to refresh progress');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getWorkflowIcon = (iconName: string) => {
    const iconProps = { className: "w-5 h-5" };
    switch (iconName) {
      case 'Film': return <Film {...iconProps} />;
      case 'Users': return <Users {...iconProps} />;
      case 'FileText': return <FileText {...iconProps} />;
      case 'Camera': return <Camera {...iconProps} />;
      case 'List': return <List {...iconProps} />;
      case 'Sparkles': return <Sparkles {...iconProps} />;
      case 'Video': return <Video {...iconProps} />;
      case 'Mic': return <Mic {...iconProps} />;
      case 'PlayCircle': return <PlayCircle {...iconProps} />;
      default: return <Film {...iconProps} />;
    }
  };

  const handleMilestoneClick = (navigationTarget: string) => {
    if (onNavigate) {
      onNavigate(navigationTarget, { episodeId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="w-5 h-5 animate-spin text-scripps-blue" />
      </div>
    );
  }

  if (error || (!breakdown && !workflowProgress)) {
    return (
      <div className="text-sm text-red-600 py-2">{error || 'No progress data available'}</div>
    );
  }

  const categories = breakdown ? EpisodeProgressService.getCategoryProgress(breakdown) : [];

  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${EpisodeProgressService.getProgressColor(breakdown.total_progress)}`}
            style={{ width: `${breakdown.total_progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
          {Math.round(breakdown.total_progress)}%
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Production Progress</h3>
          {showRefreshButton && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-scripps-blue hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleViewModeChange('workflow')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'workflow'
                ? 'bg-scripps-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Workflow Steps
          </button>
          <button
            onClick={() => handleViewModeChange('phases')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'phases'
                ? 'bg-scripps-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Production Phases
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Overall Progress</span>
            <span className="font-bold text-gray-900">
              {viewMode === 'workflow' && workflowProgress
                ? Math.round(workflowProgress.overall_progress)
                : breakdown
                ? Math.round(breakdown.total_progress)
                : 0}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 bg-gradient-to-r ${
                viewMode === 'workflow' && workflowProgress
                  ? EpisodeProgressService.getProgressColor(workflowProgress.overall_progress)
                  : breakdown
                  ? EpisodeProgressService.getProgressColor(breakdown.total_progress)
                  : 'bg-gray-200'
              }`}
              style={{
                width: `${
                  viewMode === 'workflow' && workflowProgress
                    ? workflowProgress.overall_progress
                    : breakdown
                    ? breakdown.total_progress
                    : 0
                }%`
              }}
            />
          </div>
        </div>
      </div>

      {viewMode === 'workflow' && workflowProgress ? (
        <div className="divide-y divide-gray-200">
          {workflowProgress.next_step && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-scripps-blue rounded-lg text-white">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Next Step</div>
                  <div className="text-sm text-gray-700 mb-2">
                    {EpisodeProgressService.getNextStepRecommendation(workflowProgress)}
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => handleMilestoneClick(workflowProgress.next_step!.navigation_target)}
                      className="text-sm font-medium text-scripps-blue hover:text-scripps-light-blue flex items-center gap-1"
                    >
                      {workflowProgress.next_step.action_label}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {workflowProgress.milestones.map((milestone, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate && handleMilestoneClick(milestone.navigation_target)}
              disabled={!onNavigate}
              className={`w-full px-4 py-4 flex items-center gap-4 transition-colors ${
                onNavigate ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                milestone.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : milestone.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {getWorkflowIcon(milestone.icon)}
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{milestone.name}</span>
                  {milestone.count > 0 && milestone.total && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {milestone.count}/{milestone.total}
                    </span>
                  )}
                  {milestone.count > 0 && !milestone.total && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {milestone.count}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">{milestone.description}</div>
              </div>

              <div className="flex items-center gap-3">
                {milestone.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {milestone.status === 'in_progress' && (
                  <Clock className="w-5 h-5 text-blue-600" />
                )}
                {milestone.status === 'not_started' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                {onNavigate && (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.category);
            const categoryColor = EpisodeProgressService.getCategoryColor(category.category);

            return (
              <div key={category.category}>
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${categoryColor}`} />
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900">{category.displayName}</div>
                      <div className="text-xs text-gray-500">
                        {category.weight}% of total • {Math.round(category.progress)}% complete
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 bg-gradient-to-r ${categoryColor}`}
                        style={{ width: `${category.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-right">
                      {Math.round(category.progress)}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 py-3 bg-gray-50 space-y-2">
                    {category.milestones.map((milestone, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="mt-0.5">{getStatusIcon(milestone.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">{milestone.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EpisodeProgressService.getStatusColor(milestone.status)}`}>
                              {milestone.status.replace('_', ' ')}
                            </span>
                          </div>
                          {milestone.total_count > 0 && (
                            <div className="text-xs text-gray-600 mb-2">
                              {milestone.current_count} of {milestone.total_count} completed
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  milestone.status === 'completed'
                                    ? 'bg-green-500'
                                    : milestone.status === 'in_progress'
                                    ? 'bg-blue-500'
                                    : 'bg-gray-300'
                                }`}
                                style={{ width: `${milestone.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 min-w-[2.5rem] text-right">
                              {Math.round(milestone.progress)}%
                            </span>
                          </div>
                          {milestone.started_at && (
                            <div className="mt-2 text-xs text-gray-500">
                              Started: {new Date(milestone.started_at).toLocaleDateString()}
                              {milestone.completed_at && (
                                <> • Completed: {new Date(milestone.completed_at).toLocaleDateString()}</>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{milestone.weight}%</div>
                          <div className="text-xs text-gray-400">weight</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span>Not Started</span>
          </div>
        </div>
      </div>
    </div>
  );
}
