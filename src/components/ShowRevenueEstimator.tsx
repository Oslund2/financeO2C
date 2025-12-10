import { useState, useMemo } from 'react';
import { DollarSign, Users, TrendingUp, BarChart3, Info } from 'lucide-react';

interface ShowRevenueEstimatorProps {
  initialProductionCost?: number;
}

export function ShowRevenueEstimator({ initialProductionCost = 0 }: ShowRevenueEstimatorProps) {
  const [numberOfEpisodes, setNumberOfEpisodes] = useState(1);
  const [programLength, setProgramLength] = useState(30);
  const [breaksPerEpisode, setBreaksPerEpisode] = useState(4);
  const [spotsPerBreak, setSpotsPerBreak] = useState(4);
  const [spotLength, setSpotLength] = useState(30);
  const [ratePerSpot, setRatePerSpot] = useState(500);
  const [targetCPM, setTargetCPM] = useState(15);
  const [totalProductionCost, setTotalProductionCost] = useState(initialProductionCost);

  const calculations = useMemo(() => {
    const revenuePerBreak = spotsPerBreak * ratePerSpot;
    const totalSpots = spotsPerBreak * breaksPerEpisode * numberOfEpisodes;
    const totalRevenue = revenuePerBreak * breaksPerEpisode * numberOfEpisodes;
    const grossProfit = totalRevenue - totalProductionCost;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const requiredAudience = targetCPM > 0 ? (ratePerSpot / targetCPM) * 1000 : 0;

    return {
      revenuePerBreak,
      totalSpots,
      totalRevenue,
      grossProfit,
      margin,
      requiredAudience,
    };
  }, [numberOfEpisodes, breaksPerEpisode, spotsPerBreak, ratePerSpot, totalProductionCost, targetCPM]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Revenue Estimator</h3>
          <p className="text-sm text-gray-600">Project advertising revenue and profitability</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          </div>
          <div className="text-3xl font-bold text-blue-700">{formatCurrency(calculations.totalRevenue)}</div>
        </div>

        <div className={`bg-gradient-to-br ${
          calculations.grossProfit >= 0 ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-pink-50 border-red-200'
        } border-2 rounded-xl p-6`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <div className="text-sm font-medium text-gray-600">Gross Profit</div>
          </div>
          <div className={`text-3xl font-bold ${calculations.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(calculations.grossProfit)}
          </div>
          <div className={`text-sm font-semibold mt-1 ${calculations.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {calculations.margin.toFixed(1)}% Margin
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-orange-600" />
            <div className="text-sm font-medium text-gray-600">Required Viewers</div>
          </div>
          <div className="text-3xl font-bold text-orange-700">{formatNumber(calculations.requiredAudience)}</div>
          <div className="text-xs text-gray-600 mt-1">per episode to justify rate</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Inventory Structure</h4>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Number of Episodes</label>
                <span className="text-sm font-bold text-gray-900">{numberOfEpisodes}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={numberOfEpisodes}
                onChange={(e) => setNumberOfEpisodes(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Program Length (minutes)</label>
                <span className="text-sm font-bold text-gray-900">{programLength}</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                value={programLength}
                onChange={(e) => setProgramLength(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Total Breaks per Episode</label>
                <span className="text-sm font-bold text-gray-900">{breaksPerEpisode}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={breaksPerEpisode}
                onChange={(e) => setBreaksPerEpisode(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">Typically 3 internal + 1 end break</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Spots per Break</label>
                <span className="text-sm font-bold text-gray-900">{spotsPerBreak}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={spotsPerBreak}
                onChange={(e) => setSpotsPerBreak(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Spot Length (seconds)</label>
                <span className="text-sm font-bold text-gray-900">{spotLength}</span>
              </div>
              <select
                value={spotLength}
                onChange={(e) => setSpotLength(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Financial Rates</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Rate per Spot (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={ratePerSpot}
                  onChange={(e) => setRatePerSpot(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Revenue per advertising unit</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Target CPM (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={targetCPM}
                  onChange={(e) => setTargetCPM(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Cost per thousand impressions</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-900">
                    <strong>Audience Calculation:</strong> At ${ratePerSpot} per spot with a ${targetCPM} CPM, you need{' '}
                    <strong>{formatNumber(calculations.requiredAudience)} viewers</strong> per episode to justify your advertising rates.
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Total Production Cost (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={totalProductionCost}
                    onChange={(e) => setTotalProductionCost(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Total cost for all episodes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Inventory Summary</h4>
            <p className="text-gray-700">
              <strong className="text-green-700">{formatNumber(calculations.totalSpots)}</strong> total advertising spots available across{' '}
              <strong className="text-green-700">{numberOfEpisodes}</strong> episode{numberOfEpisodes !== 1 ? 's' : ''}
            </p>
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Revenue per Break: <strong className="text-gray-900">{formatCurrency(calculations.revenuePerBreak)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Total Ad Time: <strong className="text-gray-900">{(calculations.totalSpots * spotLength / 60).toFixed(1)} minutes</strong></span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Revenue per Episode</div>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(calculations.totalRevenue / numberOfEpisodes)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
