import { useState, useEffect } from 'react';
import { Play, Plus, Clock, CheckCircle, AlertCircle, TrendingUp, Trash2, RefreshCw, FileText, DollarSign, Film, ArrowRight, Sparkles, X, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { syncEpisodeFromScript, createEpisodeFromScript } from '../services/episodeCreationService';
import { CostComparison } from './CostComparison';
import { ShowRevenueEstimator } from './ShowRevenueEstimator';
import type { CostComparison as CostComparisonType } from '../services/costCalculationService';
import { LTVCalculationService } from '../services/ltvCalculationService';

type Episode = Database['public']['Tables']['episodes']['Row'];
type Script = Database['public']['Tables']['scripts']['Row'];

interface EpisodesProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
  navigationData?: { highlightScriptId?: string } | null;
}

export function Episodes({ seriesId, onNavigate, navigationData }: EpisodesProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [scriptTitles, setScriptTitles] = useState<Map<string, string>>(new Map());
  const [shotListCounts, setShotListCounts] = useState<Map<string, { total: number; completed: number }>>(new Map());
  const [syncing, setSyncing] = useState<string | null>(null);
  const [costViewEpisode, setCostViewEpisode] = useState<Episode | null>(null);
  const [availableScripts, setAvailableScripts] = useState<Script[]>([]);
  const [creatingEpisode, setCreatingEpisode] = useState<string | null>(null);
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
      let query = supabase.from('episodes').select('*').order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEpisodes(data || []);

      const titles = new Map<string, string>();
      const shotLists = new Map<string, { total: number; completed: number }>();

      await Promise.all(
        (data || []).map(async (episode) => {
          if (episode.script_id) {
            const { data: script } = await supabase
              .from('scripts')
              .select('title')
              .eq('id', episode.script_id)
              .maybeSingle();

            if (script) {
              titles.set(episode.id, script.title);
            }
          }

          const { data: storyboards } = await supabase
            .from('storyboards')
            .select('id')
            .eq('episode_id', episode.id);

          if (storyboards && storyboards.length > 0) {
            let totalShots = 0;
            let completedShots = 0;

            await Promise.all(
              storyboards.map(async (storyboard) => {
                const { data: shots } = await supabase
                  .from('storyboard_shots')
                  .select('id, status')
                  .eq('storyboard_id', storyboard.id);

                if (shots) {
                  totalShots += shots.length;
                  completedShots += shots.filter(s => s.status === 'approved').length;
                }
              })
            );

            shotLists.set(episode.id, { total: totalShots, completed: completedShots });
          }
        })
      );

      setScriptTitles(titles);
      setShotListCounts(shotLists);

      let scriptsQuery = supabase
        .from('scripts')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (seriesId) {
        scriptsQuery = scriptsQuery.eq('series_id', seriesId);
      }

      const { data: scriptsData } = await scriptsQuery;

      const scriptsWithoutEpisodes = (scriptsData || []).filter(script => {
        const hasEpisode = (data || []).some(ep => ep.script_id === script.id);
        return !hasEpisode;
      });

      setAvailableScripts(scriptsWithoutEpisodes);
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
      alert('Episode synced successfully with latest script changes!');
    } catch (err) {
      console.error('Error syncing episode:', err);
      alert(err instanceof Error ? err.message : 'Failed to sync episode');
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
      alert('Episode created successfully!');
    } catch (err) {
      console.error('Error creating episode:', err);
      alert(err instanceof Error ? err.message : 'Failed to create episode');
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
    if (!deleteModal.episode) return;

    const { error } = await supabase
      .from('episodes')
      .delete()
      .eq('id', deleteModal.episode.id);

    if (error) {
      console.error('Error deleting episode:', error);
      throw error;
    }

    setEpisodes((prev) => prev.filter((e) => e.id !== deleteModal.episode!.id));
    setDeleteModal({ isOpen: false, episode: null, relatedItems: [] });
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
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Episodes</h1>
            <p className="text-gray-600">Track and manage episode production</p>
          </div>
          <button
            onClick={() => onNavigate('ai-studio')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            New Episode
          </button>
        </div>

        {availableScripts.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Available Scripts</h3>
                  <p className="text-sm text-gray-600">
                    {availableScripts.length} approved script{availableScripts.length !== 1 ? 's' : ''} ready to become episode{availableScripts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('scripts')}
                className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <span>View All Scripts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableScripts.map((script) => (
                <div
                  key={script.id}
                  className="bg-white rounded-lg p-4 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{script.title}</h4>
                    {script.ai_generated && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200 flex-shrink-0 ml-2">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-medium">AI</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    S{script.season_number}E{script.episode_number} • {script.runtime_minutes} min
                  </div>
                  {script.synopsis && (
                    <p className="text-xs text-gray-700 mb-3 line-clamp-2">{script.synopsis}</p>
                  )}
                  <button
                    onClick={() => handleQuickCreateEpisode(script.id, script.title)}
                    disabled={creatingEpisode === script.id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm disabled:opacity-50"
                  >
                    {creatingEpisode === script.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        Create Episode
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span>
                These scripts are approved and ready for production. Creating an episode will lock the script from further edits.
              </span>
            </div>
          </div>
        )}

        {episodes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-scripps-blue" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No episodes yet</h3>
            <p className="text-gray-600 mb-6">
              {availableScripts.length > 0
                ? 'Create your first episode from the approved scripts above'
                : 'Start by creating and approving a script to produce your first episode'}
            </p>
            {availableScripts.length === 0 && (
              <>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-200 rounded text-xs">
                      1. Create Script
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-200 rounded text-xs">
                      2. Approve Script
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-200 rounded text-xs">
                      3. Create Episode
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => onNavigate('scripts')}
                    className="px-6 py-3 bg-white text-scripps-blue border-2 border-scripps-blue rounded-lg hover:bg-blue-50 transition-all font-medium"
                  >
                    View Scripts
                  </button>
                  <button
                    onClick={() => onNavigate('ai-studio')}
                    className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
                  >
                    Generate New Script
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {episodes.map((episode) => {
              const ltvMetrics = calculateEpisodeLTV(episode);
              const isProfit = ltvMetrics.lifetimeProfit >= 0;
              const isHighlighted = navigationData?.highlightScriptId && episode.script_id === navigationData.highlightScriptId;
              const shotListInfo = shotListCounts.get(episode.id);

              return (
              <div
                key={episode.id}
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all border p-6 ${
                  isHighlighted
                    ? 'border-4 border-scripps-blue ring-4 ring-scripps-blue ring-opacity-20'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-6">
                  <div className={`w-40 h-24 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    episode.final_video_url
                      ? 'bg-gradient-to-br from-scripps-blue to-scripps-light-blue'
                      : isProfit
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-red-500 to-orange-600'
                  }`}>
                    {episode.final_video_url ? (
                      <Play className="w-12 h-12 text-white" />
                    ) : (
                      <div className="text-white text-center px-2">
                        <div className="text-lg font-bold">{LTVCalculationService.formatCurrency(ltvMetrics.lifetimeProfit)}</div>
                        <div className="text-xs">LTV</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{episode.title}</h3>
                          {episode.multi_part_episode && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200">
                              Part {episode.part_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {getStatusIcon(episode.status)}
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {episode.status.replace('_', ' ')}
                          </span>
                          {episode.status !== 'completed' && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                              Production: {episode.progress_percentage}%
                            </span>
                          )}
                          {shotListInfo && shotListInfo.total > 0 && (
                            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded border bg-blue-50 text-blue-800 border-blue-200">
                              <Camera className="w-3 h-3" />
                              <span className="font-medium">
                                {shotListInfo.completed}/{shotListInfo.total} Shots
                                {shotListInfo.completed === shotListInfo.total && ' ✓'}
                              </span>
                            </div>
                          )}
                          {scriptTitles.get(episode.id) && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <FileText className="w-3 h-3" />
                              <span>From: {scriptTitles.get(episode.id)}</span>
                            </div>
                          )}
                          {episode.sync_status && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getSyncStatusColor(episode.sync_status)}`}>
                              {episode.sync_status === 'in_sync' && <CheckCircle className="w-3 h-3" />}
                              {episode.sync_status === 'script_modified' && <AlertCircle className="w-3 h-3" />}
                              {episode.sync_status === 'needs_review' && <AlertCircle className="w-3 h-3" />}
                              <span className="font-medium capitalize">{episode.sync_status.replace('_', ' ')}</span>
                            </div>
                          )}
                          <span className="text-sm text-gray-500">
                            {new Date(episode.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        {episode.estimated_cost && (
                          <div>
                            <div className="text-xs text-gray-600">Estimated Cost (AI)</div>
                            <div className="text-lg font-bold text-green-700">
                              ${episode.estimated_cost.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {episode.actual_cost && (
                          <div>
                            <div className="text-xs text-gray-600">Actual Cost</div>
                            <div className="text-sm font-semibold text-gray-900">
                              ${episode.actual_cost.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {episode.source_script_snapshot && (
                          <button
                            onClick={() => setCostViewEpisode(episode)}
                            className="text-xs text-scripps-blue hover:underline flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            View Cost Breakdown
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={`mb-4 rounded-lg p-4 border-2 ${
                      isProfit
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                        : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className={`w-5 h-5 ${isProfit ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="text-sm font-semibold text-gray-700">
                            {ltvMetrics.isInService ? 'Lifetime Value' : 'Projected LTV'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>{ltvMetrics.yearsInService} years</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Annual Revenue</div>
                          <div className="text-lg font-bold text-gray-900">
                            {LTVCalculationService.formatCurrency(ltvMetrics.annualRevenue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Lifetime Profit</div>
                          <div className={`text-lg font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                            {LTVCalculationService.formatCurrency(ltvMetrics.lifetimeProfit)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Margin</div>
                          <div className={`text-lg font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                            {ltvMetrics.lifetimeMargin.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-300 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-gray-700">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Payback Period:</span>
                          <span className="text-base font-bold text-green-700">
                            {LTVCalculationService.formatYearsMonths(ltvMetrics.paybackPeriodYears)}
                          </span>
                        </div>
                        {ltvMetrics.isInService && (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded ${LTVCalculationService.getPhaseColor(ltvMetrics.currentRetentionPercent, ltvMetrics.minimumRetentionPercent)} bg-opacity-10 font-medium`}>
                              {LTVCalculationService.getRetentionPhaseLabel(ltvMetrics.currentRetentionPercent, ltvMetrics.minimumRetentionPercent)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {episode.production_notes && (
                      <p className="text-sm text-gray-700">{episode.production_notes}</p>
                    )}

                    {episode.completed_at && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Completed on {new Date(episode.completed_at).toLocaleDateString()}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <div className="flex gap-2">
                        {episode.sync_status === 'script_modified' && episode.status !== 'completed' && (
                          <button
                            onClick={() => handleSync(episode.id)}
                            disabled={syncing === episode.id}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncing === episode.id ? 'animate-spin' : ''}`} />
                            {syncing === episode.id ? 'Syncing...' : 'Sync from Script'}
                          </button>
                        )}
                        {episode.sync_status === 'needs_review' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
                            <AlertCircle className="w-4 h-4" />
                            Manual review required - episode in production stage
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteClick(episode)}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Episode
                      </button>
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Production Cost Analysis</h2>
            <p className="text-sm text-gray-600">{episode.title}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {costComparison ? (
            <div className="space-y-6">
              <CostComparison comparison={costComparison} showDetailed={true} />

              {episode.actual_cost && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actual vs Estimated</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Estimated Cost</div>
                      <div className="text-2xl font-bold text-green-700">
                        ${episode.estimated_cost?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Actual Cost</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${episode.actual_cost.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Variance</div>
                      <div className={`text-2xl font-bold ${
                        episode.actual_cost <= (episode.estimated_cost || 0)
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        {episode.actual_cost <= (episode.estimated_cost || 0) ? '-' : '+'}
                        ${Math.abs((episode.actual_cost || 0) - (episode.estimated_cost || 0)).toFixed(2)}
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
