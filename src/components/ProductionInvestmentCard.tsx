import { useState } from 'react';
import { DollarSign, Cpu, Users, Clock, Film, Globe, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { CostBreakdown, EpisodeEconomicsService } from '../services/episodeEconomicsService';

interface ProductionInvestmentCardProps {
  costs: CostBreakdown;
  yearsInService: number;
  runsPerYear: number;
  runtimeMinutes: number;
  showDetails?: boolean;
}

export function ProductionInvestmentCard({
  costs,
  yearsInService,
  runsPerYear,
  runtimeMinutes,
  showDetails = true
}: ProductionInvestmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const formatCurrency = EpisodeEconomicsService.formatCurrency;

  const costItems = [
    {
      label: 'AI/Token Costs',
      sublabel: 'Model inference, voice synthesis, video generation',
      value: costs.tokenCosts,
      icon: Cpu,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Human Labor Costs',
      sublabel: `~${costs.humanHoursEstimate.toFixed(1)} hours - editing, QC, supervision`,
      value: costs.humanLaborCosts,
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      badge: 'First Run Only'
    },
    {
      label: 'Dubbing/Localization',
      sublabel: 'Multi-language voice production',
      value: costs.dubbingCosts,
      icon: Globe,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      hidden: costs.dubbingCosts === 0
    },
    {
      label: 'Licensing Costs',
      sublabel: 'Music rights, stock assets',
      value: costs.licensingCosts,
      icon: Film,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
      hidden: costs.licensingCosts === 0
    }
  ].filter(item => !item.hidden);

  const tokenPercent = costs.totalInitialInvestment > 0
    ? (costs.tokenCosts / costs.totalInitialInvestment) * 100
    : 0;
  const humanPercent = costs.totalInitialInvestment > 0
    ? (costs.humanLaborCosts / costs.totalInitialInvestment) * 100
    : 0;
  const otherPercent = costs.totalInitialInvestment > 0
    ? ((costs.dubbingCosts + costs.licensingCosts) / costs.totalInitialInvestment) * 100
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Production Investment</h3>
              <p className="text-white/80 text-sm">One-time costs, amortized over {yearsInService} years</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(costs.totalInitialInvestment)}
            </div>
            <div className="text-white/80 text-sm">total investment</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
          {tokenPercent > 0 && (
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${tokenPercent}%` }}
              title={`Token Costs: ${tokenPercent.toFixed(1)}%`}
            />
          )}
          {humanPercent > 0 && (
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${humanPercent}%` }}
              title={`Human Costs: ${humanPercent.toFixed(1)}%`}
            />
          )}
          {otherPercent > 0 && (
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${otherPercent}%` }}
              title={`Other Costs: ${otherPercent.toFixed(1)}%`}
            />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600">AI/Token ({tokenPercent.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-gray-600">Human Labor ({humanPercent.toFixed(0)}%)</span>
          </div>
          {otherPercent > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-gray-600">Other ({otherPercent.toFixed(0)}%)</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Cost per Year</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(costs.amortizedCostPerYear)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              amortized over {yearsInService} years
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Film className="w-4 h-4" />
              <span className="text-sm font-medium">Cost per Run</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(costs.costPerRun)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {runsPerYear * yearsInService} total runs
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Film className="w-4 h-4" />
              <span className="text-sm font-medium">Cost per Minute</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(costs.costPerFinishedMinute)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {runtimeMinutes} min runtime
            </div>
          </div>
        </div>

        {showDetails && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Hide cost breakdown' : 'Show cost breakdown'}
            </button>

            {expanded && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                {costItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{item.sublabel}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="bg-slate-50 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <strong>Production costs are one-time investments.</strong> Human labor costs (editing, QC, voice direction) are incurred only during initial production.
            These costs are then amortized across the episode's useful service life of {yearsInService} years
            and {runsPerYear * yearsInService} total broadcast runs.
          </div>
        </div>
      </div>
    </div>
  );
}
