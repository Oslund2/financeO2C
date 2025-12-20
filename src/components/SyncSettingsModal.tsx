import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  EpisodeProfitSettingsService,
  EpisodeSettingsComparison,
  DistributionChannelSettings,
  EpisodeProfitSettings
} from '../services/episodeProfitSettingsService';
import { supabase } from '../lib/supabase';

interface SourceSettings {
  channels: DistributionChannelSettings[];
  runsPerYear: number;
  yearsInService: number;
  decayRatePercent: number;
  minimumRetentionPercent: number;
}

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string;
  sourceEpisodeId: string;
  sourceEpisodeTitle: string;
  sourceFormatLabel: string;
  sourceProgramLengthMinutes: number;
  sourceSettings: SourceSettings;
  onSyncComplete: () => void;
}

export function SyncSettingsModal({
  isOpen,
  onClose,
  seriesId,
  sourceEpisodeId,
  sourceEpisodeTitle,
  sourceFormatLabel,
  sourceProgramLengthMinutes,
  sourceSettings,
  onSyncComplete
}: SyncSettingsModalProps) {
  const [episodes, setEpisodes] = useState<EpisodeSettingsComparison[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncChannels, setSyncChannels] = useState(true);
  const [syncParameters, setSyncParameters] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [actualSourceSettings, setActualSourceSettings] = useState<SourceSettings | null>(null);
  const [loadingSourceSettings, setLoadingSourceSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEpisodes();
      loadActualSourceSettings();
    }
  }, [isOpen, seriesId, sourceEpisodeId]);

  const loadActualSourceSettings = async () => {
    setLoadingSourceSettings(true);
    try {
      const settings = await EpisodeProfitSettingsService.getSettings(sourceEpisodeId);
      const defaults = await EpisodeProfitSettingsService.getEpisodeDefaults(sourceEpisodeId);

      if (settings) {
        setActualSourceSettings({
          channels: settings.distributionChannels,
          runsPerYear: settings.annualRunsPerEpisode,
          yearsInService: settings.yearsInService,
          decayRatePercent: settings.decayRatePercent,
          minimumRetentionPercent: settings.minimumRetentionPercent
        });
        console.log('[SyncModal] Loaded saved source settings from DB:', {
          channelCount: settings.distributionChannels.length,
          enabledChannels: settings.distributionChannels.filter(c => c.enabled).length,
          totalMonthlyViews: settings.distributionChannels.filter(c => c.enabled).reduce((sum, c) => sum + (c.monthlyProjectedViews || 0), 0)
        });
      } else {
        const defaultChannels = defaults
          ? EpisodeProfitSettingsService.getDefaultChannelsForEpisode(defaults.contentMinutes)
          : sourceSettings.channels;
        setActualSourceSettings({
          channels: defaultChannels,
          runsPerYear: 4,
          yearsInService: 5,
          decayRatePercent: 10,
          minimumRetentionPercent: 20
        });
        console.log('[SyncModal] No saved settings found, using defaults:', {
          channelCount: defaultChannels.length,
          enabledChannels: defaultChannels.filter(c => c.enabled).length
        });
      }
    } catch (error) {
      console.error('[SyncModal] Error loading source settings:', error);
      setActualSourceSettings(sourceSettings);
    }
    setLoadingSourceSettings(false);
  };

  const loadEpisodes = async () => {
    setLoading(true);
    setSelectedEpisodes(new Set());
    setResult(null);

    const comparison = await EpisodeProfitSettingsService.getEpisodesSettingsComparison(seriesId);
    const filteredEpisodes = comparison.filter(ep =>
      ep.episodeId !== sourceEpisodeId &&
      ep.programLengthMinutes === sourceProgramLengthMinutes
    );
    setEpisodes(filteredEpisodes);
    setLoading(false);
  };

  const toggleEpisode = (episodeId: string) => {
    const newSelected = new Set(selectedEpisodes);
    if (newSelected.has(episodeId)) {
      newSelected.delete(episodeId);
    } else {
      newSelected.add(episodeId);
    }
    setSelectedEpisodes(newSelected);
  };

  const selectAll = () => {
    setSelectedEpisodes(new Set(episodes.map(ep => ep.episodeId)));
  };

  const clearSelection = () => {
    setSelectedEpisodes(new Set());
  };

  const handleSync = async () => {
    if (selectedEpisodes.size === 0) return;

    const settingsToSync = actualSourceSettings || sourceSettings;

    setSyncing(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.user_metadata?.organization_id || null;

      const enabledChannels = settingsToSync.channels.filter(c => c.enabled);
      const totalMonthlyViews = enabledChannels.reduce((sum, c) => sum + (c.monthlyProjectedViews || 0), 0);

      console.log('[Sync] Starting sync with source channels:', {
        usingActualSettings: !!actualSourceSettings,
        totalChannels: settingsToSync.channels.length,
        enabledChannels: enabledChannels.length,
        totalMonthlyViews,
        channelDetails: settingsToSync.channels.map(c => ({
          name: c.name,
          enabled: c.enabled,
          monthlyViews: c.monthlyProjectedViews,
          cpm: c.cpmRate
        }))
      });

      const savedSettings = await EpisodeProfitSettingsService.saveSettings(sourceEpisodeId, orgId, {
        distributionChannels: settingsToSync.channels,
        annualRunsPerEpisode: settingsToSync.runsPerYear,
        yearsInService: settingsToSync.yearsInService,
        decayRatePercent: settingsToSync.decayRatePercent,
        minimumRetentionPercent: settingsToSync.minimumRetentionPercent
      });

      if (!savedSettings) {
        console.error('[Sync] Failed to save source episode settings');
        setResult({
          success: false,
          message: 'Failed to save source episode settings before sync'
        });
        setSyncing(false);
        return;
      }

      console.log('[Sync] Source settings saved successfully:', {
        savedChannels: savedSettings.distributionChannels.length,
        savedEnabledChannels: savedSettings.distributionChannels.filter(c => c.enabled).length
      });

      const verifySettings = await EpisodeProfitSettingsService.getSettings(sourceEpisodeId);
      if (verifySettings) {
        const verifyEnabledChannels = verifySettings.distributionChannels.filter(c => c.enabled);
        const verifyMonthlyViews = verifyEnabledChannels.reduce((sum, c) => sum + (c.monthlyProjectedViews || 0), 0);
        console.log('[Sync] Verified source settings in DB:', {
          totalChannels: verifySettings.distributionChannels.length,
          enabledChannels: verifyEnabledChannels.length,
          totalMonthlyViews: verifyMonthlyViews
        });
      }

      const targetIds = Array.from(selectedEpisodes);
      console.log('[Sync] Syncing to targets:', targetIds);

      const syncResult = await EpisodeProfitSettingsService.syncSettingsToEpisodes(
        sourceEpisodeId,
        targetIds,
        syncChannels,
        syncParameters
      );

      console.log('[Sync] Sync result:', syncResult);

      if (syncResult.success) {
        for (const targetId of targetIds) {
          const targetSettings = await EpisodeProfitSettingsService.getSettings(targetId);
          if (targetSettings) {
            const targetEnabledChannels = targetSettings.distributionChannels.filter(c => c.enabled);
            const targetMonthlyViews = targetEnabledChannels.reduce((sum, c) => sum + (c.monthlyProjectedViews || 0), 0);
            console.log(`[Sync] Target ${targetId} after sync:`, {
              totalChannels: targetSettings.distributionChannels.length,
              enabledChannels: targetEnabledChannels.length,
              totalMonthlyViews: targetMonthlyViews
            });
          }
        }

        setResult({
          success: true,
          message: `Successfully synced settings to ${syncResult.updatedCount} episode${syncResult.updatedCount !== 1 ? 's' : ''}`
        });
        onSyncComplete();
      } else {
        setResult({
          success: false,
          message: syncResult.error || 'Failed to sync settings'
        });
      }
    } catch (error) {
      console.error('[Sync] Error during sync:', error);
      setResult({
        success: false,
        message: 'An unexpected error occurred during sync'
      });
    }

    setSyncing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sync Distribution Settings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Copy settings from "{sourceEpisodeTitle}" to other {sourceProgramLengthMinutes}-minute episodes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Copy className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Source Episode</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {sourceEpisodeTitle} <span className="text-blue-500">({sourceFormatLabel})</span>
                </p>
                {loadingSourceSettings ? (
                  <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading settings...
                  </div>
                ) : actualSourceSettings ? (
                  <div className="mt-2 text-xs text-blue-600 space-y-1">
                    <div className="flex items-center gap-4">
                      <span>{actualSourceSettings.channels.filter(c => c.enabled).length} active channels</span>
                      <span>{(actualSourceSettings.channels.filter(c => c.enabled).reduce((sum, c) => sum + (c.monthlyProjectedViews || 0), 0) / 1000).toFixed(0)}K views/mo</span>
                    </div>
                  </div>
                ) : null}
              </div>
              {!loadingSourceSettings && (
                <button
                  onClick={loadActualSourceSettings}
                  className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                  title="Refresh settings"
                >
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">What to sync:</h3>
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={syncChannels}
                onChange={(e) => setSyncChannels(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Distribution Channels</span>
                <p className="text-xs text-gray-500">CPM rates, projected views, enabled channels</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={syncParameters}
                onChange={(e) => setSyncParameters(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Parameters</span>
                <p className="text-xs text-gray-500">Years in service, decay rate, human costs</p>
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Select target episodes:</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : episodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No other {sourceProgramLengthMinutes}-minute episodes in this series
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {episodes.map((episode) => {
                  const isSelected = selectedEpisodes.has(episode.episodeId);
                  const formatLabel = `${episode.programLengthMinutes} min | ${episode.formatType.replace('_', ' ')}`;

                  return (
                    <button
                      key={episode.episodeId}
                      onClick={() => toggleEpisode(episode.episodeId)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{episode.episodeTitle}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{formatLabel}</span>
                            {episode.hasCustomSettings && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {episode.enabledChannelCount} channels
                        </div>
                        <div className="text-xs text-gray-400">
                          {(episode.totalMonthlyProjectedViews / 1000).toFixed(0)}K views/mo
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {result && (
            <div className={`p-4 rounded-lg ${
              result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className={result.success ? 'text-emerald-800' : 'text-red-800'}>
                  {result.message}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="text-sm text-gray-500">
            {selectedEpisodes.size} episode{selectedEpisodes.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              {result?.success ? 'Done' : 'Cancel'}
            </button>
            <button
              onClick={handleSync}
              disabled={selectedEpisodes.size === 0 || syncing || loadingSourceSettings || (!syncChannels && !syncParameters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Sync Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
