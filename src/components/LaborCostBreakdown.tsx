import { DollarSign, Users, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency, formatHours, type CreatorCostBreakdown } from '../services/creatorCostCalculationService';

interface LaborCostBreakdownProps {
  breakdown: CreatorCostBreakdown;
}

export function LaborCostBreakdown({ breakdown }: LaborCostBreakdownProps) {
  const { metrics, phaseBreakdown, perArtistCosts } = breakdown;

  const totalPhaseHours =
    phaseBreakdown.preproduction.hours +
    phaseBreakdown.production.hours +
    phaseBreakdown.postproduction.hours +
    phaseBreakdown.revision.hours +
    phaseBreakdown.projectManagement.hours;

  const getPhasePercentage = (hours: number) => {
    return (hours / totalPhaseHours) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
        <h5 className="text-md font-bold text-gray-900 mb-4">Labor Cost Summary</h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Base Labor</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(metrics.baseLaborCost)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Phase Multipliers</div>
            <div className="text-xl font-bold text-blue-700">
              {formatCurrency(
                metrics.preproductionCost +
                metrics.postproductionCost +
                metrics.revisionCost +
                metrics.projectManagementCost
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Labor</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(metrics.totalLaborCost)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Overhead ({breakdown.config.overhead_percentage}%)</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(metrics.overheadCost)}</div>
          </div>
        </div>

        <div className="pt-4 border-t border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Labor with Overhead:</span>
            <span className="text-2xl font-bold text-blue-900">{formatCurrency(metrics.laborWithOverhead)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h5 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Production Phase Breakdown
        </h5>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Preproduction</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(phaseBreakdown.preproduction.cost)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${getPhasePercentage(phaseBreakdown.preproduction.hours)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">{formatHours(phaseBreakdown.preproduction.hours)}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Production</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(phaseBreakdown.production.cost)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${getPhasePercentage(phaseBreakdown.production.hours)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">{formatHours(phaseBreakdown.production.hours)}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Postproduction</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(phaseBreakdown.postproduction.cost)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${getPhasePercentage(phaseBreakdown.postproduction.hours)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">{formatHours(phaseBreakdown.postproduction.hours)}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Revisions</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(phaseBreakdown.revision.cost)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${getPhasePercentage(phaseBreakdown.revision.hours)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">{formatHours(phaseBreakdown.revision.hours)}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Project Management</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(phaseBreakdown.projectManagement.cost)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${getPhasePercentage(phaseBreakdown.projectManagement.hours)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">{formatHours(phaseBreakdown.projectManagement.hours)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h5 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Facility & Equipment Costs
        </h5>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Software Licenses:</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(metrics.softwareCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Equipment:</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(metrics.equipmentCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Studio Space:</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(metrics.studioSpaceCost)}</span>
          </div>
          <div className="pt-3 border-t border-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Facility Costs:</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(metrics.totalFacilityCost)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h5 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Per Artist Costs
        </h5>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Monthly Salary</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(perArtistCosts.monthlySalary)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Hourly Rate</div>
            <div className="text-lg font-bold text-gray-900">${perArtistCosts.hourlySalary.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Monthly Facility Cost</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(perArtistCosts.monthlyFacilityCost)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Monthly Total</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(perArtistCosts.monthlyTotalCost)}</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Total Creator Cost per Episode</div>
            <div className="text-xs text-gray-600">
              {metrics.artistsNeeded} artists × {formatHours(totalPhaseHours)} + facilities
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-700">
            {formatCurrency(metrics.totalCreatorCost)}
          </div>
        </div>
      </div>
    </div>
  );
}
