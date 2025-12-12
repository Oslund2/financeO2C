import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { EpisodeProgressService, type EpisodeProgressBreakdown as ProgressBreakdownType } from '../services/episodeProgressService';

interface EpisodeProgressBreakdownProps {
  episodeId: string;
  inline?: boolean;
  showRefreshButton?: boolean;
  onProgressUpdate?: (progress: number) => void;
}

export function EpisodeProgressBreakdown({
  episodeId,
  inline = false,
  showRefreshButton = false,
  onProgressUpdate
}: EpisodeProgressBreakdownProps) {
  const [breakdown, setBreakdown] = useState<ProgressBreakdownType | null>(null);
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
      const data = await EpisodeProgressService.getProgressBreakdown(episodeId);
      setBreakdown(data);
      if (data && onProgressUpdate) {
        onProgressUpdate(data.total_progress);
      }
    } catch (err) {
      console.error('Error loading progress breakdown:', err);
      setError('Failed to load progress breakdown');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="w-5 h-5 animate-spin text-scripps-blue" />
      </div>
    );
  }

  if (error || !breakdown) {
    return (
      <div className="text-sm text-red-600 py-2">{error || 'No progress data available'}</div>
    );
  }

  const categories = EpisodeProgressService.getCategoryProgress(breakdown);

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
        <div className="flex items-center justify-between mb-3">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Overall Progress</span>
            <span className="font-bold text-gray-900">{Math.round(breakdown.total_progress)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 bg-gradient-to-r ${EpisodeProgressService.getProgressColor(breakdown.total_progress)}`}
              style={{ width: `${breakdown.total_progress}%` }}
            />
          </div>
        </div>
      </div>

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
