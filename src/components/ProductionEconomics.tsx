import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Settings,
  Loader2,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Play,
  Tv,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Globe,
  Calculator,
  RotateCcw,
  Copy,
  Sparkles,
  AlertTriangle,
  Target,
  Radio,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import {
  EpisodeEconomicsService,
  EpisodeEconomics,
  EpisodeSummaryMetrics,
  DEFAULT_PLATFORM_FEES
} from '../services/episodeEconomicsService';
import {
  EpisodeProfitSettingsService,
  DistributionChannelSettings,
  isLinearChannel,
  isOnDemandChannel
} from '../services/episodeProfitSettingsService';
import { BreakEvenAnalysisCard } from './BreakEvenAnalysisCard';
import { ProductionInvestmentCard } from './ProductionInvestmentCard';
import { EpisodeFormatPresets, FORMAT_PRESETS, FormatPreset } from './EpisodeFormatPresets';
import { EpisodeEconomicsCard, EpisodeEconomicsGrid } from './EpisodeEconomicsCard';
import { SocialRevenueEducation } from './SocialRevenueEducation';
import { YouTubeRevenueCalculator } from './YouTubeRevenueCalculator';
import { SyncSettingsModal } from './SyncSettingsModal';
import { analyzeEpisodeEconomics, analyzeSeriesPerformance, type PLInsight, type SeriesInsight } from '../services/economicsAIService';
import { GreenlightScore } from './GreenlightScore';
import { DistributionPackageGenerator } from './DistributionPackageGenerator';
import { EpisodeFeedbackLoop } from './EpisodeFeedbackLoop';
import jsPDF from 'jspdf';

type Episode = Database['public']['Tables']['episodes']['Row'];

interface ProductionEconomicsProps {
  seriesId: string | null;
}

type ViewMode = 'episode' | 'series';

export function ProductionEconomics({ seriesId }: ProductionEconomicsProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [episodeEconomics, setEpisodeEconomics] = useState<Map<string, EpisodeEconomics>>(new Map());
  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('episode');
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [showChannelConfig, setShowChannelConfig] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [aiInsight, setAiInsight] = useState<PLInsight | SeriesInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);

  const geminiAvailable = !!(import.meta.env.VITE_GEMINI_API_KEY);

  type ProductionTool = 'greenlight' | 'distribution' | 'feedback' | null;
  const [activeTool, setActiveTool] = useState<ProductionTool>(null);

  const [channels, setChannels] = useState<DistributionChannelSettings[]>([]);
  const [runsPerYear, setRunsPerYear] = useState(4);
  const [yearsInService, setYearsInService] = useState(5);
  const [decayRatePercent, setDecayRatePercent] = useState(10);
  const [minimumRetentionPercent, setMinimumRetentionPercent] = useState(20);

  const channelConfigRef = useRef<HTMLDivElement>(null);

  const selectedEpisode = useMemo(() => {
    return episodes.find(e => e.id === selectedEpisodeId) || null;
  }, [episodes, selectedEpisodeId]);

  const selectedEconomics = useMemo(() => {
    if (!selectedEpisodeId) return null;
    return episodeEconomics.get(selectedEpisodeId) || null;
  }, [selectedEpisodeId, episodeEconomics]);

  const episodeCards = useMemo(() => {
    return episodes.map(ep => {
      const economics = episodeEconomics.get(ep.id);
      return {
        id: ep.id,
        metrics: economics ? EpisodeEconomicsService.getSummaryMetrics(economics) : null,
        loading: loadingEpisodes.has(ep.id),
        hasCustomSettings: economics?.hasCustomSettings || false
      };
    });
  }, [episodes, episodeEconomics, loadingEpisodes]);

  const seriesTotals = useMemo(() => {
    const allEconomics = Array.from(episodeEconomics.values());
    if (allEconomics.length === 0) {
      return {
        totalInvestment: 0,
        totalAnnualNetRevenue: 0,
        totalMonthlyNetRevenue: 0,
        totalLifetimeProfit: 0,
        averageRoiMultiple: 0,
        seriesBreakEvenMonths: 0,
        episodeCount: 0
      };
    }

    const totalInvestment = allEconomics.reduce((sum, e) => sum + e.costs.totalInitialInvestment, 0);
    const totalAnnualNetRevenue = allEconomics.reduce((sum, e) => sum + e.totalAnnualNetRevenue, 0);
    const totalMonthlyNetRevenue = allEconomics.reduce((sum, e) => sum + e.totalMonthlyNetRevenue, 0);
    const totalLifetimeProfit = allEconomics.reduce((sum, e) => sum + e.lifetime.lifetimeProfit, 0);
    const averageRoiMultiple = allEconomics.reduce((sum, e) => sum + e.lifetime.roiMultiple, 0) / allEconomics.length;
    const seriesBreakEvenMonths = totalMonthlyNetRevenue > 0 ? totalInvestment / totalMonthlyNetRevenue : 0;

    return {
      totalInvestment,
      totalAnnualNetRevenue,
      totalMonthlyNetRevenue,
      totalLifetimeProfit,
      averageRoiMultiple,
      seriesBreakEvenMonths,
      episodeCount: allEconomics.length
    };
  }, [episodeEconomics]);

  useEffect(() => {
    loadEpisodes();
  }, [seriesId]);

  useEffect(() => {
    if (selectedEpisodeId) {
      loadEpisodeSettings(selectedEpisodeId);
    }
  }, [selectedEpisodeId]);

  const loadEpisodes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('episodes')
        .select('*')
        .order('episode_number', { ascending: true });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setEpisodes(data || []);

      if (data && data.length > 0) {
        setSelectedEpisodeId(data[0].id);
        for (const episode of data) {
          loadEpisodeEconomics(episode.id, episode.estimated_cost || 0);
        }
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodeEconomics = async (episodeId: string, tokenCost: number) => {
    setLoadingEpisodes(prev => new Set(prev).add(episodeId));
    try {
      const economics = await EpisodeEconomicsService.calculateEpisodeEconomics(episodeId, tokenCost);
      if (economics) {
        setEpisodeEconomics(prev => new Map(prev).set(episodeId, economics));
      }
    } catch (error) {
      console.error('Error loading episode economics:', error);
    } finally {
      setLoadingEpisodes(prev => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
    }
  };

  const loadEpisodeSettings = async (episodeId: string) => {
    const settings = await EpisodeProfitSettingsService.getSettings(episodeId);
    const defaults = await EpisodeProfitSettingsService.getEpisodeDefaults(episodeId);

    if (settings) {
      setChannels(settings.distributionChannels);
      setRunsPerYear(settings.annualRunsPerEpisode);
      setYearsInService(settings.yearsInService);
      setDecayRatePercent(settings.decayRatePercent);
      setMinimumRetentionPercent(settings.minimumRetentionPercent);
    } else if (defaults) {
      setChannels(EpisodeProfitSettingsService.getDefaultChannelsForEpisode(defaults.contentMinutes));
      setRunsPerYear(4);
      setYearsInService(5);
      setDecayRatePercent(10);
      setMinimumRetentionPercent(20);
    }
  };

  const handlePresetSelect = async (preset: FormatPreset) => {
    setSelectedPresetId(preset.id);
    setChannels(preset.channels);
    setRunsPerYear(preset.runsPerYear);

    if (selectedEpisodeId) {
      await saveSettings(preset.channels, preset.runsPerYear);
    }
  };

  const handleResetToDefaults = async () => {
    if (!selectedEpisodeId || !selectedEconomics) return;

    const contentMinutes = selectedEconomics.format.contentMinutes;
    const defaultChannels = EpisodeProfitSettingsService.getDefaultChannelsForEpisode(contentMinutes);

    setChannels(defaultChannels);
    setSelectedPresetId(undefined);

    await saveSettings(defaultChannels);
  };

  const saveSettings = async (
    newChannels?: DistributionChannelSettings[],
    newRunsPerYear?: number
  ) => {
    if (!selectedEpisodeId) return;

    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.user_metadata?.organization_id || null;

      await EpisodeProfitSettingsService.saveSettings(selectedEpisodeId, orgId, {
        distributionChannels: newChannels || channels,
        annualRunsPerEpisode: newRunsPerYear || runsPerYear,
        yearsInService,
        decayRatePercent,
        minimumRetentionPercent
      });

      const episode = episodes.find(e => e.id === selectedEpisodeId);
      if (episode) {
        await loadEpisodeEconomics(selectedEpisodeId, episode.estimated_cost || 0);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    const newChannels = channels.map(c =>
      c.id === channelId ? { ...c, enabled: !c.enabled } : c
    );
    setChannels(newChannels);
  };

  const updateChannelCpm = (channelId: string, cpmRate: number) => {
    const newChannels = channels.map(c =>
      c.id === channelId ? { ...c, cpmRate } : c
    );
    setChannels(newChannels);
  };

  const updateChannelImpressions = (channelId: string, value: number) => {
    const newChannels = channels.map(c => {
      if (c.id !== channelId) return c;
      if (isLinearChannel(c)) {
        return { ...c, impressionsPerAiring: value };
      }
      return { ...c, monthlyProjectedViews: value };
    });
    setChannels(newChannels);
  };

  const updateChannelAirings = (channelId: string, airings: number) => {
    const newChannels = channels.map(c =>
      c.id === channelId ? { ...c, airingsPerYear: airings } : c
    );
    setChannels(newChannels);
  };

  const handleSettingsClick = useCallback((episodeId: string) => {
    setSelectedEpisodeId(episodeId);
    setShowChannelConfig(true);
    setTimeout(() => {
      channelConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const formatBreakEvenTime = (months: number): string => {
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remainingMonths = Math.round(months % 12);
      if (remainingMonths > 0) {
        return `${years}y ${remainingMonths}mo`;
      }
      return `${years}y`;
    }
    return `${Math.ceil(months)}mo`;
  };

  const formatCurrency = EpisodeEconomicsService.formatCurrency;
  const formatNumber = EpisodeEconomicsService.formatNumber;

  const exportToCSV = () => {
    if (!selectedEconomics) return;
    setExporting('csv');

    try {
      const headers = [
        'Episode Title',
        'Format',
        'Token Costs',
        'Human Labor Costs',
        'Total Investment',
        'Net Revenue per Run',
        'Annual Net Revenue',
        'Break-Even Runs',
        'Lifetime Profit',
        'ROI Multiple',
        'Years in Service'
      ];

      const row = [
        selectedEconomics.episodeTitle,
        selectedEconomics.format.formatLabel,
        selectedEconomics.costs.tokenCosts,
        selectedEconomics.costs.humanLaborCosts,
        selectedEconomics.costs.totalInitialInvestment,
        selectedEconomics.netRevenuePerRun,
        selectedEconomics.totalAnnualNetRevenue,
        Math.ceil(selectedEconomics.breakEven.breakEvenRuns),
        selectedEconomics.lifetime.lifetimeProfit,
        selectedEconomics.lifetime.roiMultiple.toFixed(2),
        selectedEconomics.lifetime.yearsInService
      ];

      selectedEconomics.channels.filter(c => c.enabled).forEach(channel => {
        headers.push(`${channel.channelName} Net Rev/Run`);
        row.push(channel.netRevenuePerRun.toFixed(2));
      });

      const csvContent = [
        headers.join(','),
        row.map(field => `"${field}"`).join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `economics-${selectedEconomics.episodeTitle.replace(/\s+/g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = () => {
    if (!selectedEconomics) return;
    setExporting('pdf');

    try {
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Production Economics Report', 105, y, { align: 'center' });
      y += 10;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedEconomics.episodeTitle, 105, y, { align: 'center' });
      y += 7;

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, y, { align: 'center' });
      y += 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Production Investment', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Token/AI Costs: ${formatCurrency(selectedEconomics.costs.tokenCosts)}`, 15, y);
      y += 6;
      doc.text(`Human Labor Costs: ${formatCurrency(selectedEconomics.costs.humanLaborCosts)}`, 15, y);
      y += 6;
      doc.text(`Total Investment: ${formatCurrency(selectedEconomics.costs.totalInitialInvestment)}`, 15, y);
      y += 12;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Projections', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Net Revenue per Run: ${formatCurrency(selectedEconomics.netRevenuePerRun)}`, 15, y);
      y += 6;
      doc.text(`Annual Net Revenue: ${formatCurrency(selectedEconomics.totalAnnualNetRevenue)}`, 15, y);
      y += 6;
      doc.text(`Lifetime Net Revenue: ${formatCurrency(selectedEconomics.lifetime.netLifetimeRevenue)}`, 15, y);
      y += 12;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Break-Even Analysis', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Break-Even Runs: ${Math.ceil(selectedEconomics.breakEven.breakEvenRuns)}`, 15, y);
      y += 6;
      doc.text(`Break-Even Impressions: ${formatNumber(selectedEconomics.breakEven.breakEvenImpressions)}`, 15, y);
      y += 6;
      doc.text(`Break-Even Timeline: ${(selectedEconomics.breakEven.breakEvenMonths / 12).toFixed(1)} years`, 15, y);
      y += 12;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Lifetime Projections', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Lifetime Profit: ${formatCurrency(selectedEconomics.lifetime.lifetimeProfit)}`, 15, y);
      y += 6;
      doc.text(`Lifetime Margin: ${selectedEconomics.lifetime.lifetimeMargin.toFixed(1)}%`, 15, y);
      y += 6;
      doc.text(`ROI Multiple: ${selectedEconomics.lifetime.roiMultiple.toFixed(2)}x`, 15, y);

      doc.save(`economics-${selectedEconomics.episodeTitle.replace(/\s+/g, '-')}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const handleAnalyzeWithAI = async () => {
    setAiInsight(null);
    setAiLoading(true);
    setAiError(null);
    setShowAI(true);
    try {
      if (viewMode === 'episode' && selectedEconomics) {
        const insight = await analyzeEpisodeEconomics(selectedEconomics);
        setAiInsight(insight);
      } else {
        const insight = await analyzeSeriesPerformance(seriesTotals);
        setAiInsight(insight);
      }
    } catch (e: any) {
      setAiError(e.message ?? 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading production economics...</p>
        </div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Episodes Available</h3>
            <p className="text-gray-600">Create episodes to view production economics and profitability analysis.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Economics</h1>
            <p className="text-gray-600 mt-1">Analyze costs, revenue projections, and break-even points</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('episode')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'episode'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Episode Analysis
              </button>
              <button
                onClick={() => setViewMode('series')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'series'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Series Overview
              </button>
            </div>

            {geminiAvailable && (
              <button
                onClick={handleAnalyzeWithAI}
                disabled={aiLoading || (viewMode === 'episode' ? !selectedEconomics : seriesTotals.episodeCount === 0)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Analysis
              </button>
            )}
            <button
              onClick={exportToCSV}
              disabled={!selectedEconomics || exporting === 'csv'}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={!selectedEconomics || exporting === 'pdf'}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* Production Tools Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Production Tools</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTool(activeTool === 'greenlight' ? null : 'greenlight')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeTool === 'greenlight'
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
              }`}
            >
              <Target className="w-4 h-4" />
              Greenlight Score
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'distribution' ? null : 'distribution')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeTool === 'distribution'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Radio className="w-4 h-4" />
              Distribution Package
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'feedback' ? null : 'feedback')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeTool === 'feedback'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Performance Feedback Loop
            </button>
            <span className="ml-auto text-xs text-gray-400 self-center">Click a tool to expand · Click again to close</span>
          </div>
        </div>

        {/* Active Tool Panel */}
        {activeTool === 'greenlight' && (
          <GreenlightScore seriesId={seriesId} />
        )}
        {activeTool === 'distribution' && (
          <DistributionPackageGenerator
            seriesId={seriesId}
            episodeTitle={selectedEconomics?.episodeTitle}
            productionCost={selectedEconomics?.costs.totalInitialInvestment}
            roiMultiple={selectedEconomics?.lifetime.roiMultiple}
            breakEvenMonths={selectedEconomics?.breakEven.breakEvenMonths}
            distributionChannels={selectedEconomics?.channels.filter(c => c.enabled).map(c => c.channelName)}
          />
        )}
        {activeTool === 'feedback' && (
          <EpisodeFeedbackLoop
            seriesId={seriesId}
            episodeTitle={selectedEconomics?.episodeTitle}
            projectedMonthlyViews={
              selectedEconomics
                ? Math.round(selectedEconomics.totalMonthlyNetRevenue / 0.004) // rough views estimate from $4 RPM
                : undefined
            }
            projectedMonthlyRevenue={selectedEconomics?.totalMonthlyNetRevenue}
            productionCost={selectedEconomics?.costs.totalInitialInvestment}
            currentDecayRate={decayRatePercent}
          />
        )}

        {viewMode === 'series' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Total Series Investment</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(seriesTotals.totalInvestment)}</div>
                <div className="text-xs text-gray-500 mt-1">{seriesTotals.episodeCount} episodes</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Annual Net Revenue</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(seriesTotals.totalAnnualNetRevenue)}</div>
                <div className="text-xs text-gray-500 mt-1">across all episodes</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Lifetime Profit</span>
                </div>
                <div className={`text-2xl font-bold ${seriesTotals.totalLifetimeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(seriesTotals.totalLifetimeProfit)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{seriesTotals.averageRoiMultiple.toFixed(1)}x avg ROI</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Series Break-Even</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {seriesTotals.seriesBreakEvenMonths > 0 ? formatBreakEvenTime(seriesTotals.seriesBreakEvenMonths) : '--'}
                </div>
                <div className="text-xs text-gray-500 mt-1">to recover total investment</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Episode Comparison</h3>
                <p className="text-sm text-gray-500">Click any episode to view detailed economics</p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                        <th className="pb-3 pr-4">Episode</th>
                        <th className="pb-3 pr-4">Format</th>
                        <th className="pb-3 pr-4 text-right">Investment</th>
                        <th className="pb-3 pr-4 text-right">Monthly Net Rev</th>
                        <th className="pb-3 pr-4 text-right">Break-Even</th>
                        <th className="pb-3 pr-4 text-right">Lifetime Profit</th>
                        <th className="pb-3 text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {episodeCards.map(({ id, metrics, loading }) => {
                        if (loading || !metrics) {
                          return (
                            <tr key={id} className="border-b border-gray-100">
                              <td colSpan={7} className="py-4">
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Loading...
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr
                            key={id}
                            onClick={() => {
                              setSelectedEpisodeId(id);
                              setViewMode('episode');
                            }}
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="py-4 pr-4 font-medium text-gray-900">{metrics.title}</td>
                            <td className="py-4 pr-4 text-sm text-gray-600">{metrics.formatLabel}</td>
                            <td className="py-4 pr-4 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(metrics.totalInvestment)}
                            </td>
                            <td className="py-4 pr-4 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(metrics.monthlyNetRevenue)}
                            </td>
                            <td className="py-4 pr-4 text-right text-sm text-gray-600">
                              {formatBreakEvenTime(metrics.breakEvenMonths)}
                            </td>
                            <td className={`py-4 pr-4 text-right text-sm font-medium ${
                              metrics.lifetimeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(metrics.lifetimeProfit)}
                            </td>
                            <td className={`py-4 text-right text-sm font-medium ${
                              metrics.roiMultiple >= 1 ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {metrics.roiMultiple.toFixed(1)}x
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Select Episode ({episodes.length} available)</h3>
              </div>
              <EpisodeEconomicsGrid
                episodes={episodeCards}
                selectedEpisodeId={selectedEpisodeId}
                onSelectEpisode={setSelectedEpisodeId}
                onSettingsClick={handleSettingsClick}
              />
            </div>

            {selectedEconomics && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ProductionInvestmentCard
                    costs={selectedEconomics.costs}
                    yearsInService={selectedEconomics.lifetime.yearsInService}
                    runsPerYear={yearsInService}
                    runtimeMinutes={selectedEconomics.format.runtimeMinutes}
                  />
                  <BreakEvenAnalysisCard
                    breakEven={selectedEconomics.breakEven}
                    costs={selectedEconomics.costs}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SocialRevenueEducation />
                  <YouTubeRevenueCalculator defaultMonthlyViews={100000} />
                </div>

                <div ref={channelConfigRef} className="bg-white rounded-xl shadow-md border border-gray-200">
                  <button
                    onClick={() => setShowChannelConfig(!showChannelConfig)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Settings className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900">Distribution Channels & Revenue</h3>
                        <p className="text-sm text-gray-500">Configure where this episode is distributed and projected impressions</p>
                      </div>
                    </div>
                    {showChannelConfig ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {showChannelConfig && (
                    <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-6">
                      <EpisodeFormatPresets
                        selectedPresetId={selectedPresetId}
                        onSelectPreset={handlePresetSelect}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Years in Service</label>
                          <input
                            type="number"
                            value={yearsInService}
                            onChange={(e) => setYearsInService(parseInt(e.target.value) || 5)}
                            onBlur={() => saveSettings()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min={1}
                            max={20}
                          />
                          <p className="text-xs text-gray-500 mt-1">How long this content will generate revenue</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Annual View Decay %</label>
                          <input
                            type="number"
                            value={decayRatePercent}
                            onChange={(e) => setDecayRatePercent(parseInt(e.target.value) || 10)}
                            onBlur={() => saveSettings()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min={0}
                            max={50}
                          />
                          <p className="text-xs text-gray-500 mt-1">Rate at which viewership decreases each year</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Channel Configuration</h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowSyncModal(true)}
                              disabled={savingSettings || !selectedEpisodeId}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Sync to Other Episodes
                            </button>
                            <button
                              onClick={handleResetToDefaults}
                              disabled={savingSettings}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset to Format Defaults
                            </button>
                          </div>
                        </div>

                        {channels.some(c => isLinearChannel(c)) && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Tv className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Linear Distribution</span>
                            </div>
                            <div className="space-y-3">
                              {channels.filter(c => isLinearChannel(c)).map((channel) => {
                                const platformFee = Object.entries(DEFAULT_PLATFORM_FEES).find(([key]) =>
                                  channel.name.toLowerCase().includes(key.replace(/([A-Z])/g, ' $1').toLowerCase())
                                )?.[1] || 0;

                                const annualImpressions = channel.impressionsPerAiring * channel.airingsPerYear;
                                const annualGrossRev = channel.buyingModel === 'cpm'
                                  ? (channel.cpmRate * annualImpressions) / 1000
                                  : channel.rate * channel.airingsPerYear;
                                const monthlyNetRev = (annualGrossRev * (1 - platformFee)) / 12;

                                return (
                                  <div
                                    key={channel.id}
                                    className={`p-4 rounded-lg border transition-all ${
                                      channel.enabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => {
                                            toggleChannel(channel.id);
                                            setTimeout(() => saveSettings(), 100);
                                          }}
                                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                            channel.enabled
                                              ? 'bg-blue-500 border-blue-500'
                                              : 'bg-white border-gray-300'
                                          }`}
                                        >
                                          {channel.enabled && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>
                                        <span className={`font-medium ${channel.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                          {channel.name}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                          Linear
                                        </span>
                                      </div>
                                      {channel.enabled && (
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-emerald-600">
                                            {formatCurrency(monthlyNetRev)}/mo net
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {channel.airingsPerYear} airings/year
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {channel.enabled && (
                                      <div className="grid grid-cols-3 gap-4 mt-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">
                                            CPM Rate ($)
                                          </label>
                                          <input
                                            type="number"
                                            value={channel.cpmRate}
                                            onChange={(e) => updateChannelCpm(channel.id, parseFloat(e.target.value) || 0)}
                                            onBlur={() => saveSettings()}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            step="0.01"
                                            min="0"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Impressions/Airing
                                          </label>
                                          <input
                                            type="number"
                                            value={channel.impressionsPerAiring}
                                            onChange={(e) => updateChannelImpressions(channel.id, parseInt(e.target.value) || 0)}
                                            onBlur={() => saveSettings()}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            step="1000"
                                            min="0"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Airings/Year
                                          </label>
                                          <input
                                            type="number"
                                            value={channel.airingsPerYear}
                                            onChange={(e) => updateChannelAirings(channel.id, parseInt(e.target.value) || 0)}
                                            onBlur={() => saveSettings()}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            step="1"
                                            min="0"
                                            max="52"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {channels.some(c => isOnDemandChannel(c)) && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Play className="w-4 h-4 text-red-500" />
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">On-Demand / Social</span>
                            </div>
                            <div className="space-y-3">
                              {channels.filter(c => isOnDemandChannel(c)).map((channel) => {
                                const platformFee = Object.entries(DEFAULT_PLATFORM_FEES).find(([key]) =>
                                  channel.name.toLowerCase().includes(key.replace(/([A-Z])/g, ' $1').toLowerCase())
                                )?.[1] || 0.30;

                                const monthlyGrossRev = (channel.cpmRate * channel.monthlyProjectedViews) / 1000;
                                const monthlyNetRev = monthlyGrossRev * (1 - platformFee);

                                return (
                                  <div
                                    key={channel.id}
                                    className={`p-4 rounded-lg border transition-all ${
                                      channel.enabled ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => {
                                            toggleChannel(channel.id);
                                            setTimeout(() => saveSettings(), 100);
                                          }}
                                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                            channel.enabled
                                              ? 'bg-red-500 border-red-500'
                                              : 'bg-white border-gray-300'
                                          }`}
                                        >
                                          {channel.enabled && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>
                                        <span className={`font-medium ${channel.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                          {channel.name}
                                        </span>
                                        {platformFee > 0 && (
                                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                            {(platformFee * 100).toFixed(0)}% platform fee
                                          </span>
                                        )}
                                      </div>
                                      {channel.enabled && (
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-emerald-600">
                                            {formatCurrency(monthlyNetRev)}/mo net
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {formatNumber(channel.monthlyProjectedViews)} views/mo
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {channel.enabled && (
                                      <div className="grid grid-cols-2 gap-4 mt-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">
                                            CPM Rate ($)
                                          </label>
                                          <input
                                            type="number"
                                            value={channel.cpmRate}
                                            onChange={(e) => updateChannelCpm(channel.id, parseFloat(e.target.value) || 0)}
                                            onBlur={() => saveSettings()}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            step="0.01"
                                            min="0"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Monthly Projected Views
                                          </label>
                                          <input
                                            type="number"
                                            value={channel.monthlyProjectedViews}
                                            onChange={(e) => updateChannelImpressions(channel.id, parseInt(e.target.value) || 0)}
                                            onBlur={() => saveSettings()}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            step="1000"
                                            min="0"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {channel.enabled && (
                                      <div className="mt-2 text-xs text-gray-500 bg-white/50 rounded px-2 py-1">
                                        Revenue = ({formatCurrency(channel.cpmRate)} CPM x {formatNumber(channel.monthlyProjectedViews)} views / 1000) x {((1 - platformFee) * 100).toFixed(0)}% creator share = <strong className="text-emerald-600">{formatCurrency(monthlyNetRev)}/mo</strong>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {savingSettings && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving settings...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lifetime Revenue Projection</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                          <th className="pb-3 pr-4">Year</th>
                          <th className="pb-3 pr-4 text-right">Retention</th>
                          <th className="pb-3 pr-4 text-right">Gross Revenue</th>
                          <th className="pb-3 pr-4 text-right">Net Revenue</th>
                          <th className="pb-3 pr-4 text-right">Cumulative Net</th>
                          <th className="pb-3 text-right">Cumulative Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEconomics.lifetime.yearlyBreakdown.map((year) => (
                          <tr key={year.year} className="border-b border-gray-100">
                            <td className="py-3 pr-4 font-medium text-gray-900">Year {year.year}</td>
                            <td className="py-3 pr-4 text-right text-sm text-gray-600">{year.retentionPercent.toFixed(0)}%</td>
                            <td className="py-3 pr-4 text-right text-sm text-gray-600">{formatCurrency(year.grossRevenue)}</td>
                            <td className="py-3 pr-4 text-right text-sm font-medium text-gray-900">{formatCurrency(year.netRevenue)}</td>
                            <td className="py-3 pr-4 text-right text-sm text-gray-600">{formatCurrency(year.cumulativeNetRevenue)}</td>
                            <td className={`py-3 text-right text-sm font-medium ${
                              year.cumulativeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(year.cumulativeProfit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td className="py-3 pr-4 font-semibold text-gray-900">Total</td>
                          <td className="py-3 pr-4"></td>
                          <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                            {formatCurrency(selectedEconomics.lifetime.grossLifetimeRevenue)}
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                            {formatCurrency(selectedEconomics.lifetime.netLifetimeRevenue)}
                          </td>
                          <td className="py-3 pr-4"></td>
                          <td className={`py-3 text-right font-semibold ${
                            selectedEconomics.lifetime.lifetimeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(selectedEconomics.lifetime.lifetimeProfit)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis Panel */}
      {showAI && (
        <div className="max-w-7xl mx-auto mt-6">
          <div className="border border-purple-200 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    AI {viewMode === 'episode' ? 'Episode' : 'Series'} Economics Analysis
                  </h3>
                  <p className="text-sm text-white/80">Powered by Gemini</p>
                </div>
              </div>
              <button onClick={() => setShowAI(false)} className="text-white/70 hover:text-white text-sm">✕</button>
            </div>
            <div className="p-6 bg-purple-50 space-y-5">
              {aiLoading && (
                <div className="flex items-center gap-2 text-purple-700">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing economics data...</span>
                </div>
              )}
              {aiError && (
                <div className="flex items-start gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
              {aiInsight && !aiLoading && viewMode === 'episode' && (aiInsight as PLInsight).summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-purple-900 mb-2">Executive Summary</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{(aiInsight as PLInsight).summary}</p>
                    {(aiInsight as PLInsight).channelStrategy && (
                      <div className="mt-4 bg-white border border-purple-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-purple-700 mb-1">Channel Strategy</p>
                        <p className="text-sm text-gray-700">{(aiInsight as PLInsight).channelStrategy}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(aiInsight as PLInsight).strengths?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-700 mb-1">Strengths</h4>
                        <ul className="space-y-1">
                          {(aiInsight as PLInsight).strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-emerald-500 font-bold mt-0.5">✓</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(aiInsight as PLInsight).risks?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-amber-700 mb-1">Risks</h4>
                        <ul className="space-y-1">
                          {(aiInsight as PLInsight).risks.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-amber-500 mt-0.5">⚠</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(aiInsight as PLInsight).recommendations?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-indigo-700 mb-1">Recommendations</h4>
                        <ul className="space-y-1">
                          {(aiInsight as PLInsight).recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-indigo-500 font-bold mt-0.5">→</span>{rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {aiInsight && !aiLoading && viewMode === 'series' && (aiInsight as SeriesInsight).portfolioSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-purple-900 mb-2">Portfolio Summary</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{(aiInsight as SeriesInsight).portfolioSummary}</p>
                    {(aiInsight as SeriesInsight).bestPerformers && (
                      <div className="mt-4 bg-white border border-purple-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-purple-700 mb-1">Best Performers</p>
                        <p className="text-sm text-gray-700">{(aiInsight as SeriesInsight).bestPerformers}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(aiInsight as SeriesInsight).improvements?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-indigo-700 mb-1">Improvement Areas</h4>
                        <ul className="space-y-1">
                          {(aiInsight as SeriesInsight).improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-indigo-500 font-bold mt-0.5">→</span>{imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(aiInsight as SeriesInsight).scaleStrategy && (
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-purple-700 mb-1">Scale Strategy</p>
                        <p className="text-sm text-gray-700">{(aiInsight as SeriesInsight).scaleStrategy}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSyncModal && selectedEpisodeId && selectedEconomics && seriesId && (
        <SyncSettingsModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          seriesId={seriesId}
          sourceEpisodeId={selectedEpisodeId}
          sourceEpisodeTitle={selectedEconomics.episodeTitle}
          sourceFormatLabel={selectedEconomics.format.formatLabel}
          sourceProgramLengthMinutes={selectedEconomics.format.runtimeMinutes}
          sourceSettings={{
            channels,
            runsPerYear,
            yearsInService,
            decayRatePercent,
            minimumRetentionPercent
          }}
          onSyncComplete={() => {
            for (const episode of episodes) {
              loadEpisodeEconomics(episode.id, episode.estimated_cost || 0);
            }
          }}
        />
      )}
    </div>
  );
}
