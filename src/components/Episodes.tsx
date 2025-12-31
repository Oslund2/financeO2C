import { useState, useEffect } from 'react';
import { Play, Plus, Clock, CheckCircle, AlertCircle, TrendingUp, Trash2, RefreshCw, FileText, DollarSign, Film, ArrowRight, Sparkles, X, Calendar, PlayCircle, Camera, AlertTriangle, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { syncEpisodeFromScript, createEpisodeFromScript } from '../services/episodeCreationService';
import { CostComparison } from './CostComparison';
import { ShowRevenueEstimator } from './ShowRevenueEstimator';
import type { CostComparison as CostComparisonType } from '../services/costCalculationService';
import { LTVCalculationService } from '../services/ltvCalculationService';
import { useOrganization } from '../contexts/OrganizationContext';
import { EpisodeProgressBreakdown } from './EpisodeProgressBreakdown';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

type Episode = Database['public']['Tables']['episodes']['Row'];
type Script = Database['public']['Tables']['scripts']['Row'];

interface EpisodesProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
  navigationData?: { highlightScriptId?: string } | null;
}

export function Episodes({ seriesId, onNavigate, navigationData }: EpisodesProps) {
  const { currentOrganization } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [scriptTitles, setScriptTitles] = useState<Map<string, string>>(new Map());
  const [shotListCounts, setShotListCounts] = useState<Map<string, { total: number; completed: number }>>(new Map());
  const [syncing, setSyncing] = useState<string | null>(null);
  const [costViewEpisode, setCostViewEpisode] = useState<Episode | null>(null);
  const [availableScripts, setAvailableScripts] = useState<Script[]>([]);
  const [creatingEpisode, setCreatingEpisode] = useState<string | null>(null);
  const [orphanedEpisodes, setOrphanedEpisodes] = useState<Set<string>>(new Set());
  const [expandedProgressId, setExpandedProgressId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    episode: Episode | null;
    relatedItems: { label: string; count: number }[];
  }>({
    isOpen: false,
    episode: null,
    relatedItems: [],
  });

  useEffect(() => {
    loadEpisodes();
  }, [seriesId]);

  const loadEpisodes = async () => {
    try {
      const { data: episodesData, error: episodesError } = await supabase
        .rpc('get_episodes_with_details', {
          p_series_id: seriesId || null,
          p_organization_id: currentOrganization?.id || null
        });

      if (episodesError) throw episodesError;

      const episodeList = (episodesData || []).map((ep: any) => ({
        id: ep.id,
        script_id: ep.script_id,
        series_id: ep.series_id,
        organization_id: ep.organization_id,
        title: ep.title,
        episode_number: ep.episode_number,
        status: ep.status,
        progress_percentage: ep.progress_percentage,
        final_video_url: ep.final_video_url,
        production_notes: ep.production_notes,
        estimated_cost: ep.estimated_cost,
        actual_cost: ep.actual_cost,
        source_script_snapshot: ep.source_script_snapshot,
        script_version: ep.script_version,
        sync_status: ep.sync_status,
        multi_part_episode: ep.multi_part_episode,
        part_number: ep.part_number,
        previous_episode_id: ep.previous_episode_id,
        next_episode_id: ep.next_episode_id,
        trt_metadata: ep.trt_metadata,
        target_runtime_seconds: ep.target_runtime_seconds,
        actual_runtime_seconds: ep.actual_runtime_seconds,
        date_put_in_service: ep.date_put_in_service,
        projected_service_years: ep.projected_service_years,
        decay_rate_percent: ep.decay_rate_percent,
        minimum_retention_percent: ep.minimum_retention_percent,
        created_at: ep.created_at,
        updated_at: ep.updated_at,
        completed_at: ep.completed_at,
      }));

      setEpisodes(episodeList);

      const titles = new Map<string, string>();
      const shotLists = new Map<string, { total: number; completed: number }>();
      const orphaned = new Set<string>();

      (episodesData || []).forEach((ep: any) => {
        if (ep.script_title) {
          titles.set(ep.id, ep.script_title);
        }
        if (ep.has_orphaned_script || (!ep.script_id && !ep.script_title)) {
          orphaned.add(ep.id);
        }
        if (ep.total_shots > 0) {
          shotLists.set(ep.id, {
            total: ep.total_shots,
            completed: ep.completed_shots
          });
        }
      });

      setScriptTitles(titles);
      setShotListCounts(shotLists);
      setOrphanedEpisodes(orphaned);

      const { data: scriptsData, error: scriptsError } = await supabase
        .rpc('get_available_scripts_for_episodes', {
          p_series_id: seriesId || null,
          p_organization_id: currentOrganization?.id || null
        });

      if (scriptsError) throw scriptsError;

      setAvailableScripts(scriptsData || []);
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (episodeId: string) => {
    setSyncing(episodeId);
    try {
      await syncEpisodeFromScript(episodeId);
      await loadEpisodes();
      showSuccess('Episode Synced', 'Successfully synced with latest script changes');
    } catch (err) {
      console.error('Error syncing episode:', err);
      showError('Sync Failed', err instanceof Error ? err.message : 'Failed to sync episode');
    } finally {
      setSyncing(null);
    }
  };

  const handleQuickCreateEpisode = async (scriptId: string, scriptTitle: string) => {
    setCreatingEpisode(scriptId);
    try {
      await createEpisodeFromScript(scriptId, {
        title: scriptTitle,
        isMultiPart: false,
        partNumber: 1,
        createdBy: 'User',
      });
      await loadEpisodes();
      showSuccess('Episode Created', `"${scriptTitle}" is now ready for production`);
    } catch (err) {
      console.error('Error creating episode:', err);
      showError('Creation Failed', err instanceof Error ? err.message : 'Failed to create episode');
    } finally {
      setCreatingEpisode(null);
    }
  };

  const getSyncStatusColor = (syncStatus: string | null) => {
    switch (syncStatus) {
      case 'in_sync':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'script_modified':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'needs_review':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'review':
        return 'bg-scripps-blue';
      case 'assembly':
      case 'video':
      case 'voice':
      case 'assets':
        return 'bg-scripps-yellow';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'planning':
      case 'script':
        return <Clock className="w-5 h-5 text-gray-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-scripps-blue" />;
    }
  };

  const calculateEpisodeLTV = (episode: Episode) => {
    const productionCost = episode.actual_cost || episode.estimated_cost || 0;
    const annualRevenue = productionCost * 13.4;
    const yearsInService = episode.projected_service_years || 5;
    const decayRate = episode.decay_rate_percent || 0;
    const minRetention = episode.minimum_retention_percent || 100;

    const ltvData = LTVCalculationService.calculateLifetimeValue(
      annualRevenue,
      productionCost,
      yearsInService,
      decayRate,
      minRetention
    );

    const episodeLTVData = LTVCalculationService.calculateEpisodeLTVData(
      episode.date_put_in_service,
      yearsInService,
      decayRate,
      minRetention
    );

    return {
      ...ltvData,
      ...episodeLTVData,
      isInService: !!episode.date_put_in_service,
    };
  };

  const handleDeleteClick = async (episode: Episode) => {
    const relatedItems: { label: string; count: number }[] = [];

    try {
      const { count: assetCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('episode_id', episode.id);

      if (assetCount) {
        relatedItems.push({ label: 'Related Assets', count: assetCount });
      }

      const { count: shotPlansCount } = await supabase
        .from('production_shot_plans')
        .select('*', { count: 'exact', head: true })
        .eq('episode_id', episode.id);

      if (shotPlansCount) {
        relatedItems.push({ label: 'Production Shot Plans', count: shotPlansCount });
      }

      const { count: audioClipsCount } = await supabase
        .from('dialogue_audio_clips')
        .select('*', { count: 'exact', head: true })
        .eq('episode_id', episode.id);

      if (audioClipsCount) {
        relatedItems.push({ label: 'Dialogue Audio Clips', count: audioClipsCount });
      }

      const { count: lipSyncCount } = await supabase
        .from('lip_sync_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('episode_id', episode.id);

      if (lipSyncCount) {
        relatedItems.push({ label: 'Lip Sync Jobs', count: lipSyncCount });
      }

      const { count: productionJobsCount } = await supabase
        .from('production_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('episode_id', episode.id);

      if (productionJobsCount) {
        relatedItems.push({ label: 'Production Jobs', count: productionJobsCount });
      }
    } catch (error) {
      console.error('Error checking related items:', error);
    }

    setDeleteModal({
      isOpen: true,
      episode,
      relatedItems,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.episode || !user) return;

    try {
      const { data, error } = await supabase.rpc('delete_episode_cascade', {
        episode_uuid: deleteModal.episode.id,
        user_uuid: user.id,
      });

      if (error) {
        console.error('Error deleting episode:', error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete episode');
      }

      showSuccess('Episode Deleted', `"${deleteModal.episode.title}" and all related content have been permanently deleted.`);
      setEpisodes((prev) => prev.filter((e) => e.id !== deleteModal.episode!.id));
      setDeleteModal({ isOpen: false, episode: null, relatedItems: [] });
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading episodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Episodes</h1>
            <p className="text-sm sm:text-base text-gray-600">Track and manage episode production</p>
          </div>
          <button
            onClick={() => onNavigate('ai-studio')}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            New Episode
          </button>
        </div>

        {orphanedEpisodes.size > 0 && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-red-900 mb-1 sm:mb-2">Data Integrity Issue</h3>
                <p className="text-xs sm:text-sm text-red-800 mb-2 sm:mb-3">
                  {orphanedEpisodes.size} episode{orphanedEpisodes.size !== 1 ? 's' : ''} found with missing scripts.
                </p>
                <div className="bg-white rounded-lg p-2 sm:p-3 border border-red-200">
                  <p className="text-xs text-gray-700">
                    Episodes with missing scripts are marked below. Delete them or contact support to recover.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {availableScripts.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Available Scripts</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {availableScripts.length} approved script{availableScripts.length !== 1 ? 's' : ''} ready
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('scripts')}
                className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {availableScripts.map((script) => (
                <div
                  key={script.id}
                  className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{script.title}</h4>
                    {script.ai_generated && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200 flex-shrink-0 ml-2">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-medium hidden sm:inline">AI</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    S{script.season_number}E{script.episode_number} • {script.runtime_minutes} min
                  </div>
                  {script.synopsis && (
                    <p className="text-xs text-gray-700 mb-3 line-clamp-2 hidden sm:block">{script.synopsis}</p>
                  )}
                  <button
                    onClick={() => handleQuickCreateEpisode(script.id, script.title)}
                    disabled={creatingEpisode === script.id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm disabled:opacity-50 active:scale-95"
                  >
                    {creatingEpisode === script.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Creating...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        Create
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 sm:mt-4 flex items-start gap-2 text-xs text-gray-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="hidden sm:inline">
                These scripts are approved and ready for production. Creating an episode will lock the script.
              </span>
              <span className="sm:hidden">
                Creating an episode will lock the script.
              </span>
            </div>
          </div>
        )}

        {episodes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-12 text-center border border-gray-200">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-scripps-blue" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No episodes yet</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {availableScripts.length > 0
                ? 'Create your first episode from the approved scripts above'
                : 'Start by creating and approving a script'}
            </p>
            {availableScripts.length === 0 && (
              <>
                <div className="mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                  <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-gray-700">
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-200 rounded text-xs">
                      1. Create Script
                    </span>
                    <ArrowRight className="w-3 h-3 rotate-90 sm:rotate-0" />
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-200 rounded text-xs">
                      2. Approve
                    </span>
                    <ArrowRight className="w-3 h-3 rotate-90 sm:rotate-0" />
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-200 rounded text-xs">
                      3. Create Episode
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => onNavigate('scripts')}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-scripps-blue border-2 border-scripps-blue rounded-lg hover:bg-blue-50 transition-all font-medium text-sm sm:text-base"
                  >
                    View Scripts
                  </button>
                  <button
                    onClick={() => onNavigate('ai-studio')}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm sm:text-base"
                  >
                    Generate Script
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {episodes.map((episode) => {
              const ltvMetrics = calculateEpisodeLTV(episode);
              const isProfit = ltvMetrics.lifetimeProfit >= 0;
              const isHighlighted = navigationData?.highlightScriptId && episode.script_id === navigationData.highlightScriptId;
              const shotListInfo = shotListCounts.get(episode.id);
              const isOrphaned = orphanedEpisodes.has(episode.id);

              return (
              <div
                key={episode.id}
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all border p-4 sm:p-6 overflow-hidden ${
                  isOrphaned
                    ? 'border-4 border-red-400 ring-4 ring-red-400 ring-opacity-20'
                    : isHighlighted
                      ? 'border-4 border-scripps-blue ring-4 ring-scripps-blue ring-opacity-20'
                      : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                  <div className={`hidden sm:flex w-32 lg:w-40 h-20 lg:h-24 rounded-lg items-center justify-center flex-shrink-0 ${
                    episode.final_video_url
                      ? 'bg-gradient-to-br from-scripps-blue to-scripps-light-blue'
                      : isProfit
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-red-500 to-orange-600'
                  }`}>
                    {episode.final_video_url ? (
                      <Play className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
                    ) : (
                      <div className="text-white text-center px-2">
                        <div className="text-base lg:text-lg font-bold">{LTVCalculationService.formatCurrency(ltvMetrics.lifetimeProfit)}</div>
                        <div className="text-xs">LTV</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 overflow-hidden">
                          <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate flex-shrink min-w-0">{episode.title}</h3>
                          {isOrphaned && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded border-2 border-red-400 flex items-center gap-1 flex-shrink-0">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="hidden sm:inline">MISSING SCRIPT</span>
                              <span className="sm:hidden">ERROR</span>
                            </span>
                          )}
                          {episode.multi_part_episode && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200 flex-shrink-0">
                              Part {episode.part_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-sm">
                          {getStatusIcon(episode.status)}
                          <span className="font-medium text-gray-700 capitalize">
                            {episode.status.replace('_', ' ')}
                          </span>
                          {episode.status !== 'completed' && (
                            <span className="text-gray-600 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded border border-gray-200 text-[10px] sm:text-sm">
                              Production: {episode.progress_percentage}%
                            </span>
                          )}
                          {shotListInfo && shotListInfo.total > 0 && (
                            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200">
                              <Camera className="w-3 h-3" />
                              <span className="font-medium">
                                {shotListInfo.completed}/{shotListInfo.total}
                              </span>
                            </div>
                          )}
                          <span className="text-gray-500 text-[10px] sm:text-sm">
                            {new Date(episode.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {scriptTitles.get(episode.id) && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">From: {scriptTitles.get(episode.id)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-2 text-right flex-shrink-0">
                        {episode.estimated_cost && (
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">Est. Cost</div>
                            <div className="text-sm sm:text-lg font-bold text-green-700 whitespace-nowrap">
                              ${episode.estimated_cost.toFixed(0)}
                            </div>
                          </div>
                        )}
                        {episode.source_script_snapshot && (
                          <button
                            onClick={() => setCostViewEpisode(episode)}
                            className="text-[10px] sm:text-xs text-scripps-blue hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span className="hidden sm:inline">View Costs</span>
                            <span className="sm:hidden">Costs</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={`mb-3 sm:mb-4 rounded-lg p-3 sm:p-4 border-2 overflow-hidden ${
                      isProfit
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                        : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <DollarSign className={`w-4 h-4 flex-shrink-0 ${isProfit ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="text-[10px] sm:text-sm font-semibold text-gray-700 truncate">
                            {ltvMetrics.isInService ? 'Lifetime Value' : 'Projected LTV'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-600 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          <span>{ltvMetrics.yearsInService}y</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="min-w-0">
                          <div className="text-[11px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">Annual Rev</div>
                          <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                            {LTVCalculationService.formatCurrency(ltvMetrics.annualRevenue)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">LTV Profit</div>
                          <div className={`text-sm sm:text-lg font-bold truncate ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                            {LTVCalculationService.formatCurrency(ltvMetrics.lifetimeProfit)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">Margin</div>
                          <div className={`text-sm sm:text-lg font-bold truncate ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                            {ltvMetrics.lifetimeMargin.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-300 flex flex-wrap items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs overflow-hidden">
                        <div className="flex items-center gap-1 sm:gap-2 text-gray-700 min-w-0">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                          <span className="font-medium">Payback:</span>
                          <span className="text-xs sm:text-base font-bold text-green-700 truncate">
                            {LTVCalculationService.formatYearsMonths(ltvMetrics.paybackPeriodYears)}
                          </span>
                        </div>
                        {ltvMetrics.isInService && (
                          <div className="flex items-center">
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded ${LTVCalculationService.getPhaseColor(ltvMetrics.currentRetentionPercent, ltvMetrics.minimumRetentionPercent)} bg-opacity-10 font-medium text-[10px] sm:text-xs truncate max-w-[100px] sm:max-w-none`}>
                              {LTVCalculationService.getRetentionPhaseLabel(ltvMetrics.currentRetentionPercent, ltvMetrics.minimumRetentionPercent)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {episode.production_notes && (
                      <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{episode.production_notes}</p>
                    )}

                    {episode.completed_at && (
                      <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Completed {new Date(episode.completed_at).toLocaleDateString()}
                      </div>
                    )}

                    <div className="mt-3 sm:mt-4">
                      <button
                        onClick={() => setExpandedProgressId(expandedProgressId === episode.id ? null : episode.id)}
                        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-scripps-blue" />
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            {expandedProgressId === episode.id ? 'Hide' : 'Show'} Progress
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 hidden sm:inline">
                          {expandedProgressId === episode.id ? 'Collapse' : 'Expand'}
                        </span>
                      </button>
                      {expandedProgressId === episode.id && (
                        <div className="mt-3">
                          <EpisodeProgressBreakdown
                            episodeId={episode.id}
                            showRefreshButton
                            onNavigate={onNavigate}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                      {isOrphaned ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex-1 flex items-start gap-2 px-3 py-2 bg-red-50 text-red-800 rounded-lg text-xs sm:text-sm border-2 border-red-300">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="font-medium">Script missing. Delete to resolve.</span>
                          </div>
                          <button
                            onClick={() => handleDeleteClick(episode)}
                            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm w-full sm:w-auto active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <div className="flex flex-wrap gap-2 flex-1">
                            {episode.sync_status === 'script_modified' && episode.status !== 'completed' && (
                              <button
                                onClick={() => handleSync(episode.id)}
                                disabled={syncing === episode.id}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 text-sm flex-1 sm:flex-initial active:scale-95"
                              >
                                <RefreshCw className={`w-4 h-4 ${syncing === episode.id ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{syncing === episode.id ? 'Syncing...' : 'Sync'}</span>
                              </button>
                            )}
                            {episode.sync_status === 'needs_review' && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-800 rounded-lg text-xs border border-yellow-200 flex-1 sm:flex-initial">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Manual review required</span>
                                <span className="sm:hidden">Needs review</span>
                              </div>
                            )}
                            <button
                              onClick={() => onNavigate('production', { episodeId: episode.id })}
                              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm flex-1 sm:flex-initial active:scale-95"
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span className="hidden sm:inline">View Production</span>
                              <span className="sm:hidden">Production</span>
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteClick(episode)}
                            className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm sm:w-auto active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {costViewEpisode && costViewEpisode.source_script_snapshot && (
        <CostViewModal
          episode={costViewEpisode}
          onClose={() => setCostViewEpisode(null)}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, episode: null, relatedItems: [] })}
        onConfirm={handleDeleteConfirm}
        entityType="Episode"
        entityName={deleteModal.episode?.title || ''}
        relatedItems={deleteModal.relatedItems}
        warningMessage={
          deleteModal.episode?.status === 'completed'
            ? 'This is a completed episode. All production data and final video will be permanently deleted.'
            : `This episode is currently in ${deleteModal.episode?.status} status. All progress will be lost.`
        }
      />
    </div>
  );
}

interface CostViewModalProps {
  episode: Episode;
  onClose: () => void;
}

function CostViewModal({ episode, onClose }: CostViewModalProps) {
  const snapshot = episode.source_script_snapshot as any;
  const costComparison: CostComparisonType | null = snapshot?.cost_comparison || null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:rounded-xl shadow-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Production Cost Analysis</h2>
            <p className="text-xs sm:text-sm text-gray-600 truncate">{episode.title}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {costComparison ? (
            <div className="space-y-6">
              <CostComparison comparison={costComparison} showDetailed={true} />

              {episode.actual_cost && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Actual vs Estimated</h3>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600 mb-1">Estimated</div>
                      <div className="text-sm sm:text-2xl font-bold text-green-700">
                        ${episode.estimated_cost?.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600 mb-1">Actual</div>
                      <div className="text-sm sm:text-2xl font-bold text-gray-900">
                        ${episode.actual_cost.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600 mb-1">Variance</div>
                      <div className={`text-sm sm:text-2xl font-bold ${
                        episode.actual_cost <= (episode.estimated_cost || 0)
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        {episode.actual_cost <= (episode.estimated_cost || 0) ? '-' : '+'}
                        ${Math.abs((episode.actual_cost || 0) - (episode.estimated_cost || 0)).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Cost estimates are based on the script snapshot taken when this episode was created.
                  Actual costs may vary based on production complexity and service usage.
                </p>
              </div>

              <div className="border-t-4 border-gray-300 my-8"></div>

              <ShowRevenueEstimator
                initialProductionCost={episode.actual_cost || episode.estimated_cost || 0}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No cost data available for this episode.</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-scripps-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
