import { Play, Tv, Monitor, Film, TrendingUp, TrendingDown, Minus, Target, Cpu, Users, Settings, Loader2 } from 'lucide-react';
import { EpisodeSummaryMetrics, EpisodeEconomicsService } from '../services/episodeEconomicsService';

interface EpisodeEconomicsCardProps {
  metrics: EpisodeSummaryMetrics;
  isSelected: boolean;
  onClick: () => void;
  onSettingsClick?: () => void;
  hasCustomSettings?: boolean;
  loading?: boolean;
}

function getFormatIcon(formatLabel: string) {
  const label = formatLabel.toLowerCase();
  if (label.includes('social')) return Play;
  if (label.includes('digital')) return Monitor;
  if (label.includes('broadcast')) return Tv;
  return Film;
}

function getFormatColor(formatLabel: string) {
  const label = formatLabel.toLowerCase();
  if (label.includes('social')) return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
  if (label.includes('digital')) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
  if (label.includes('broadcast')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
  return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
}

function formatBreakEvenTime(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = Math.round(months % 12);
    if (remainingMonths > 0) {
      return `${years}y ${remainingMonths}mo`;
    }
    return `${years}y`;
  }
  return `${Math.ceil(months)}mo`;
}

export function EpisodeEconomicsCard({
  metrics,
  isSelected,
  onClick,
  onSettingsClick,
  hasCustomSettings = false,
  loading = false
}: EpisodeEconomicsCardProps) {
  const formatCurrency = EpisodeEconomicsService.formatCurrency;
  const FormatIcon = getFormatIcon(metrics.formatLabel);
  const formatColors = getFormatColor(metrics.formatLabel);

  const isProfitable = metrics.lifetimeProfit > 0;
  const roiDisplay = metrics.roiMultiple.toFixed(1);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border-2 transition-all hover:shadow-lg ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${formatColors.bg} ${formatColors.text}`}>
                <FormatIcon className="w-3 h-3" />
                {metrics.formatLabel}
              </span>
              {hasCustomSettings && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <Settings className="w-3 h-3" />
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 truncate">{metrics.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onSettingsClick && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingsClick();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onSettingsClick();
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-blue-100 transition-colors cursor-pointer group"
                title="Configure distribution settings"
              >
                <Settings className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            )}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isProfitable ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {isProfitable ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : metrics.lifetimeProfit === 0 ? (
                <Minus className="w-4 h-4 text-gray-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Monthly Net Rev</span>
            <span className="font-semibold text-gray-900">{formatCurrency(metrics.monthlyNetRevenue)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Lifetime Profit</span>
            <span className={`font-semibold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.lifetimeProfit)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">ROI</span>
            <span className={`font-semibold ${parseFloat(roiDisplay) >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {roiDisplay}x
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Target className="w-3 h-3" />
              Break-even
            </div>
            <span className="text-xs font-medium text-gray-700">
              {metrics.breakEvenMonths > 0 ? formatBreakEvenTime(metrics.breakEvenMonths) : 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600">{formatCurrency(metrics.tokenCost)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-500" />
              <span className="text-gray-600">{formatCurrency(metrics.humanCost)}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

interface EpisodeEconomicsGridProps {
  episodes: Array<{
    id: string;
    metrics: EpisodeSummaryMetrics | null;
    loading: boolean;
    hasCustomSettings: boolean;
  }>;
  selectedEpisodeId: string | null;
  onSelectEpisode: (episodeId: string) => void;
  onSettingsClick?: (episodeId: string) => void;
}

export function EpisodeEconomicsGrid({
  episodes,
  selectedEpisodeId,
  onSelectEpisode,
  onSettingsClick
}: EpisodeEconomicsGridProps) {
  if (episodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No episodes available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {episodes.map((episode) => {
        if (episode.loading || !episode.metrics) {
          return (
            <div key={episode.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            </div>
          );
        }

        return (
          <EpisodeEconomicsCard
            key={episode.id}
            metrics={episode.metrics}
            isSelected={selectedEpisodeId === episode.id}
            onClick={() => onSelectEpisode(episode.id)}
            onSettingsClick={onSettingsClick ? () => onSettingsClick(episode.id) : undefined}
            hasCustomSettings={episode.hasCustomSettings}
          />
        );
      })}
    </div>
  );
}
