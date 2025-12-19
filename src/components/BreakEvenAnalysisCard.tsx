import { Target, TrendingUp, Clock, Eye, Tv, Play, Radio } from 'lucide-react';
import { BreakEvenAnalysis, EpisodeEconomicsService } from '../services/episodeEconomicsService';

interface BreakEvenAnalysisCardProps {
  breakEven: BreakEvenAnalysis;
}

export function BreakEvenAnalysisCard({ breakEven }: BreakEvenAnalysisCardProps) {
  const formatCurrency = EpisodeEconomicsService.formatCurrency;
  const formatNumber = EpisodeEconomicsService.formatNumber;

  const getTimelineLabel = () => {
    if (breakEven.breakEvenYears >= 1) {
      const years = Math.floor(breakEven.breakEvenYears);
      const months = Math.round((breakEven.breakEvenYears - years) * 12);
      if (months > 0) {
        return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
      }
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
    const months = Math.max(1, Math.ceil(breakEven.breakEvenMonths));
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const getShortTimelineLabel = () => {
    if (breakEven.breakEvenYears >= 1) {
      const years = Math.floor(breakEven.breakEvenYears);
      const months = Math.round((breakEven.breakEvenYears - years) * 12);
      if (months > 0) {
        return `${years}y ${months}mo`;
      }
      return `${years}y`;
    }
    const months = Math.max(1, Math.ceil(breakEven.breakEvenMonths));
    return `${months}mo`;
  };

  const progressPercent = breakEven.breakEvenMonths > 0
    ? Math.min((1 / breakEven.breakEvenMonths) * 100, 100)
    : 0;

  const isProfitable = breakEven.breakEvenMonths > 0 && breakEven.breakEvenMonths <= 60;

  const hasLinearChannels = breakEven.linearChannelBreakEven.length > 0;
  const hasOnDemandChannels = breakEven.onDemandChannelBreakEven.length > 0;

  const formatMonthsNeeded = (months: number) => {
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remainingMonths = Math.round(months % 12);
      if (remainingMonths > 0) {
        return `~${years}y ${remainingMonths}mo`;
      }
      return `~${years}y`;
    }
    return `~${Math.ceil(months)}mo`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className={`px-6 py-4 ${isProfitable ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Break-Even Analysis</h3>
              <p className="text-white/80 text-sm">When will this episode pay for itself?</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {breakEven.breakEvenMonths > 0 ? getShortTimelineLabel() : '--'}
            </div>
            <div className="text-white/80 text-sm">to break even</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Timeline</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {breakEven.breakEvenMonths > 0 ? getTimelineLabel() : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              based on current distribution mix
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Total Impressions</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatNumber(breakEven.breakEvenImpressions)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              across all channels combined
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Avg Net CPM</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              ${breakEven.avgNetCpmAcrossChannels.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              after platform fees
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress to Break-Even</span>
            <span className="text-sm text-gray-500">
              Month 1 of {Math.ceil(breakEven.breakEvenMonths)}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isProfitable ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            After first month, {formatCurrency(breakEven.totalInvestment - breakEven.totalMonthlyNetRevenue)} remaining to recover
          </p>
        </div>

        {(hasLinearChannels || hasOnDemandChannels) && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Break-Even by Channel (if sole distribution)</h4>

            {hasLinearChannels && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Linear Distribution</span>
                </div>
                <div className="space-y-2">
                  {breakEven.linearChannelBreakEven.map((channel) => (
                    <div key={channel.channelName} className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Tv className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">{channel.channelName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {Math.ceil(channel.airingsNeeded)} airings
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatMonthsNeeded(channel.monthsNeeded)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasOnDemandChannels && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">On-Demand / Social</span>
                </div>
                <div className="space-y-2">
                  {breakEven.onDemandChannelBreakEven.map((channel) => (
                    <div key={channel.channelName} className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        {channel.channelName.toLowerCase().includes('youtube') ? (
                          <Play className="w-4 h-4 text-red-500" />
                        ) : channel.channelName.toLowerCase().includes('tiktok') ? (
                          <Play className="w-4 h-4 text-gray-800" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-sm font-medium text-gray-700">{channel.channelName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatNumber(channel.viewsNeeded)} views
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatMonthsNeeded(channel.monthsNeeded)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>How to read this:</strong> Based on your current distribution mix, it will take approximately{' '}
            <strong>{getTimelineLabel()}</strong> to recover your initial{' '}
            <strong>{formatCurrency(breakEven.totalInvestment)}</strong> production investment
            {hasLinearChannels && hasOnDemandChannels && (
              <> through a combination of broadcast airings and on-demand views</>
            )}
            {hasLinearChannels && !hasOnDemandChannels && (
              <> through scheduled broadcast airings</>
            )}
            {!hasLinearChannels && hasOnDemandChannels && (
              <> through accumulated on-demand views</>
            )}.
          </p>
        </div>
      </div>
    </div>
  );
}
