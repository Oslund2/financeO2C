import { Target, TrendingUp, Clock, Eye, Tv, Play } from 'lucide-react';
import { BreakEvenAnalysis, EpisodeEconomicsService } from '../services/episodeEconomicsService';

interface BreakEvenAnalysisCardProps {
  breakEven: BreakEvenAnalysis;
  runsPerYear: number;
}

export function BreakEvenAnalysisCard({ breakEven, runsPerYear }: BreakEvenAnalysisCardProps) {
  const formatCurrency = EpisodeEconomicsService.formatCurrency;
  const formatNumber = EpisodeEconomicsService.formatNumber;

  const progressPercent = breakEven.breakEvenRuns > 0
    ? Math.min((1 / breakEven.breakEvenRuns) * 100, 100)
    : 0;

  const getTimelineLabel = () => {
    if (breakEven.breakEvenYears >= 1) {
      const years = Math.floor(breakEven.breakEvenYears);
      const months = Math.round((breakEven.breakEvenYears - years) * 12);
      if (months > 0) {
        return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
      }
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
    const months = Math.ceil(breakEven.breakEvenMonths);
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const isProfitable = breakEven.breakEvenRuns > 0 && breakEven.breakEvenRuns <= runsPerYear * 5;

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
              {breakEven.breakEvenRuns > 0 ? Math.ceil(breakEven.breakEvenRuns) : '--'}
            </div>
            <div className="text-white/80 text-sm">runs to break even</div>
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
              {breakEven.breakEvenRuns > 0 ? getTimelineLabel() : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              at {runsPerYear} runs/year
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
            <span className="text-sm text-gray-500">1 of {Math.ceil(breakEven.breakEvenRuns)} runs</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isProfitable ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            After first run, {formatCurrency(breakEven.totalInvestment - (breakEven.breakEvenRuns > 0 ? breakEven.totalInvestment / breakEven.breakEvenRuns : 0))} remaining to recover
          </p>
        </div>

        {breakEven.channelBreakEven.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Break-Even by Channel (if sole distribution)</h4>
            <div className="space-y-2">
              {breakEven.channelBreakEven.map((channel) => (
                <div key={channel.channelName} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    {channel.channelName.toLowerCase().includes('youtube') || channel.channelName.toLowerCase().includes('social') ? (
                      <Play className="w-4 h-4 text-red-500" />
                    ) : channel.channelName.toLowerCase().includes('tv') ? (
                      <Tv className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700">{channel.channelName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNumber(channel.impressionsNeeded)} views
                    </div>
                    <div className="text-xs text-gray-500">
                      or {Math.ceil(channel.runsNeeded)} runs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>How to read this:</strong> You need approximately{' '}
            <strong>{Math.ceil(breakEven.breakEvenRuns)} broadcast runs</strong> or{' '}
            <strong>{formatNumber(breakEven.breakEvenImpressions)} total impressions</strong>{' '}
            across all your enabled distribution channels to recover your initial{' '}
            <strong>{formatCurrency(breakEven.totalInvestment)}</strong> production investment.
            {breakEven.breakEvenYears <= 1 && (
              <> At your current run rate, this takes about <strong>{getTimelineLabel()}</strong>.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
