import { TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';
import { LTVCalculationService, type YearlyRevenue } from '../services/ltvCalculationService';

interface YearByYearBreakdownProps {
  yearlyBreakdown: YearlyRevenue[];
  minimumRetentionPercent: number;
  productionCost: number;
}

export function YearByYearBreakdown({ yearlyBreakdown, minimumRetentionPercent, productionCost }: YearByYearBreakdownProps) {
  const breakEvenYear = LTVCalculationService.calculateBreakEvenYear(yearlyBreakdown);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="w-5 h-5 text-gray-700" />
        <h4 className="text-lg font-bold text-gray-900">Year-by-Year Revenue Projection</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Year</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Retention</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Revenue</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Profit</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Cumulative</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Phase</th>
            </tr>
          </thead>
          <tbody>
            {yearlyBreakdown.map((yearData) => {
              const isBreakEven = yearData.year === breakEvenYear;
              const isStable = yearData.retentionPercent <= minimumRetentionPercent;
              const phaseColor = LTVCalculationService.getPhaseColor(yearData.retentionPercent, minimumRetentionPercent);
              const phaseLabel = LTVCalculationService.getRetentionPhaseLabel(yearData.retentionPercent, minimumRetentionPercent);

              return (
                <tr
                  key={yearData.year}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isBreakEven ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Year {yearData.year}</span>
                      {isBreakEven && (
                        <CheckCircle className="w-4 h-4 text-green-600" title="Break-even year" />
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`font-medium ${phaseColor}`}>
                        {LTVCalculationService.formatPercent(yearData.retentionPercent, 0)}
                      </span>
                      {isStable && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Stable</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className="font-medium text-gray-900">
                      {LTVCalculationService.formatCurrency(yearData.revenue)}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className={`font-medium ${yearData.profit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {LTVCalculationService.formatCurrency(yearData.profit)}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className={`font-bold ${yearData.cumulativeProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {LTVCalculationService.formatCurrency(yearData.cumulativeProfit)}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${phaseColor} bg-opacity-10`}>
                      {phaseLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-300">
            <tr className="bg-gray-50">
              <td colSpan={2} className="py-3 px-3 font-bold text-gray-900">Totals</td>
              <td className="text-right py-3 px-3 font-bold text-gray-900">
                {LTVCalculationService.formatCurrency(
                  yearlyBreakdown.reduce((sum, y) => sum + y.revenue, 0)
                )}
              </td>
              <td className="text-right py-3 px-3 font-bold text-gray-900">
                {LTVCalculationService.formatCurrency(
                  yearlyBreakdown.reduce((sum, y) => sum + y.profit, 0)
                )}
              </td>
              <td className="text-right py-3 px-3 font-bold text-green-700">
                {LTVCalculationService.formatCurrency(
                  yearlyBreakdown[yearlyBreakdown.length - 1]?.cumulativeProfit || 0
                )}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="font-semibold text-gray-900">Peak Performance</span>
          </div>
          <p className="text-gray-700">80-100% retention</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="font-semibold text-gray-900">Active Decay</span>
          </div>
          <p className="text-gray-700">50-79% retention</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
            <span className="font-semibold text-gray-900">Stable Long-Tail</span>
          </div>
          <p className="text-gray-700">At minimum floor</p>
        </div>
      </div>

      {breakEvenYear && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm text-green-900">
              <strong>Break-even reached in Year {breakEvenYear}</strong> - All subsequent years represent pure profit.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
