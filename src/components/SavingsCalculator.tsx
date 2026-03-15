import { useState } from 'react';
import {
  DollarSign, Clock, Users, TrendingUp, ShieldCheck,
  ChevronDown, ChevronUp, Info, Sparkles,
} from 'lucide-react';
import { WorkflowStep, Assumptions, O2CPhase, O2C_PHASES, PHASE_LABELS, PHASE_COLORS } from '../types';
import {
  calculateSavings, calculatePhaseBreakdown,
  formatCurrency, formatNumber, formatPercent,
} from '../lib/calculations';
import { AISavingsNarrative } from './AISavingsNarrative';

interface SavingsCalculatorProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
  onUpdateAssumptions: (updates: Partial<Assumptions>) => void;
}

export function SavingsCalculator({
  baselineSteps, automatedSteps, assumptions, enabledPhases, onUpdateAssumptions,
}: SavingsCalculatorProps) {
  const [showFormulas, setShowFormulas] = useState(false);
  const savings = calculateSavings(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const breakdown = calculatePhaseBreakdown(baselineSteps, automatedSteps, assumptions, enabledPhases);

  const totalManualTransactions = baselineSteps
    .filter(s => enabledPhases.includes(s.phase))
    .reduce((sum, s) => sum + s.frequencyPerMonth, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Savings Calculator</h1>
        <p className="text-surface-500 mt-1">
          Adjust assumptions below — all savings recalculate in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assumptions Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">Assumptions</h3>
            <div className="space-y-4">
              <AssumptionInput
                label="Hourly FTE Cost (fully loaded)"
                value={assumptions.hourlyFteCost}
                onChange={v => onUpdateAssumptions({ hourlyFteCost: v })}
                prefix="$"
                min={15}
                max={150}
                step={5}
              />
              <AssumptionInput
                label="Current AR/AP FTEs"
                value={assumptions.fteCount}
                onChange={v => onUpdateAssumptions({ fteCount: v })}
                min={0.5}
                max={50}
                step={0.1}
              />
              <AssumptionInput
                label="Monthly Order Volume"
                value={assumptions.monthlyOrderVolume}
                onChange={v => onUpdateAssumptions({ monthlyOrderVolume: v })}
                min={100}
                max={50000}
                step={100}
              />
              <AssumptionInput
                label="AI Cost per Transaction"
                value={assumptions.aiCostPerTransaction}
                onChange={v => onUpdateAssumptions({ aiCostPerTransaction: v })}
                prefix="$"
                min={0.001}
                max={1}
                step={0.005}
                decimals={3}
              />
              <AssumptionInput
                label="Implementation Duration (months)"
                value={assumptions.implementationCostMonths}
                onChange={v => onUpdateAssumptions({ implementationCostMonths: v })}
                min={1}
                max={24}
                step={1}
              />
              <AssumptionInput
                label="Implementation Cost / Month"
                value={assumptions.implementationMonthlyCost}
                onChange={v => onUpdateAssumptions({ implementationMonthlyCost: v })}
                prefix="$"
                min={5000}
                max={200000}
                step={5000}
              />
            </div>
          </div>

          <div className="card p-5 bg-brand-50 border-brand-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h4 className="font-semibold text-brand-900 text-sm">AI Summary</h4>
            </div>
            <p className="text-sm text-brand-800">
              Based on {totalManualTransactions.toLocaleString()} monthly transactions across{' '}
              {enabledPhases.length} active phases, automating this O2C workflow would free{' '}
              <strong>{formatNumber(savings.fteSaved)} FTE equivalents</strong> — saving{' '}
              <strong>{formatCurrency(savings.netSavingsPerYear)}/year</strong> net of AI processing costs.
              The investment breaks even in <strong>{savings.roiMonths} months</strong>.
            </p>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <SavingsMetric
              icon={Clock}
              label="Hours Saved / Month"
              value={formatNumber(savings.hoursSavedPerMonth, 0)}
              unit="hours"
              color="blue"
            />
            <SavingsMetric
              icon={Users}
              label="FTE Freed"
              value={formatNumber(savings.fteSaved)}
              unit="people"
              color="purple"
            />
            <SavingsMetric
              icon={DollarSign}
              label="Gross Savings / Year"
              value={formatCurrency(savings.dollarSavingsPerYear)}
              unit=""
              color="green"
            />
            <SavingsMetric
              icon={TrendingUp}
              label="Net Savings / Year"
              value={formatCurrency(savings.netSavingsPerYear)}
              unit={`after ${formatCurrency(savings.aiCostPerMonth * 12)} AI cost`}
              color="emerald"
            />
            <SavingsMetric
              icon={ShieldCheck}
              label="Error Reduction"
              value={formatPercent(savings.errorReductionPercent)}
              unit=""
              color="teal"
            />
            <SavingsMetric
              icon={DollarSign}
              label="ROI Breakeven"
              value={`${savings.roiMonths}`}
              unit="months"
              color="amber"
            />
          </div>

          {/* Phase breakdown */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">Savings by Phase</h3>
            <div className="space-y-4">
              {breakdown
                .sort((a, b) => b.hoursSaved - a.hoursSaved)
                .map(phase => {
                  const pct = phase.manualHours > 0 ? (phase.hoursSaved / phase.manualHours) * 100 : 0;
                  return (
                    <div key={phase.phase} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: PHASE_COLORS[phase.phase] }}
                          />
                          <span className="font-medium text-surface-700">{PHASE_LABELS[phase.phase]}</span>
                          <span className="text-surface-400 text-xs">({phase.stepCount} steps)</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-surface-500">
                            {formatNumber(phase.manualHours, 0)}h → {formatNumber(phase.automatedHours, 0)}h
                          </span>
                          <span className="font-semibold text-emerald-600 w-20 text-right">
                            {formatCurrency(phase.dollarsSaved)}/mo
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: PHASE_COLORS[phase.phase] }}
                          />
                        </div>
                        <span className="text-xs font-medium text-surface-500 w-10 text-right">
                          {formatNumber(pct, 0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* AI Executive Summary */}
          <AISavingsNarrative savings={savings} assumptions={assumptions} breakdown={breakdown} />

          {/* Formula transparency */}
          <div className="card p-5">
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className="flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors"
            >
              <Info className="w-4 h-4" />
              Calculation Transparency
              {showFormulas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showFormulas && (
              <div className="mt-4 space-y-3 text-xs font-mono text-surface-600 bg-surface-50 rounded-lg p-4">
                <div>
                  <span className="text-surface-400">Hours Saved/Month =</span>{' '}
                  SUM(manual_time × frequency) − SUM(auto_time × frequency)
                </div>
                <div>
                  <span className="text-surface-400">= </span>
                  {formatNumber(savings.manualHoursPerMonth, 1)}h − {formatNumber(savings.automatedHoursPerMonth, 1)}h
                  = <strong>{formatNumber(savings.hoursSavedPerMonth, 1)}h</strong>
                </div>
                <div className="border-t border-surface-200 pt-2">
                  <span className="text-surface-400">FTE Saved =</span>{' '}
                  hours_saved / 160 work_hours_per_month
                </div>
                <div>
                  <span className="text-surface-400">= </span>
                  {formatNumber(savings.hoursSavedPerMonth, 1)} / 160 = <strong>{formatNumber(savings.fteSaved)}</strong>
                </div>
                <div className="border-t border-surface-200 pt-2">
                  <span className="text-surface-400">Dollar Savings/Month =</span>{' '}
                  hours_saved × hourly_fte_cost
                </div>
                <div>
                  <span className="text-surface-400">= </span>
                  {formatNumber(savings.hoursSavedPerMonth, 1)} × ${assumptions.hourlyFteCost}
                  = <strong>{formatCurrency(savings.dollarSavingsPerMonth)}</strong>
                </div>
                <div className="border-t border-surface-200 pt-2">
                  <span className="text-surface-400">AI Cost/Month =</span>{' '}
                  total_auto_transactions × ai_cost_per_transaction
                </div>
                <div>
                  <span className="text-surface-400">= </span>
                  {totalManualTransactions.toLocaleString()} × ${assumptions.aiCostPerTransaction}
                  = <strong>{formatCurrency(savings.aiCostPerMonth)}</strong>
                </div>
                <div className="border-t border-surface-200 pt-2">
                  <span className="text-surface-400">Net Savings/Month =</span>{' '}
                  dollar_savings − ai_cost = <strong>{formatCurrency(savings.netSavingsPerMonth)}</strong>
                </div>
                <div className="border-t border-surface-200 pt-2">
                  <span className="text-surface-400">ROI Breakeven =</span>{' '}
                  implementation_cost / net_monthly_savings
                </div>
                <div>
                  <span className="text-surface-400">= </span>
                  {formatCurrency(assumptions.implementationCostMonths * assumptions.implementationMonthlyCost)} / {formatCurrency(savings.netSavingsPerMonth)}
                  = <strong>{savings.roiMonths} months</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssumptionInput({ label, value, onChange, prefix, min, max, step, decimals = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-surface-400 font-medium">{prefix}</span>}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
        />
        <input
          type="number"
          value={Number(value.toFixed(decimals))}
          onChange={e => onChange(Number(e.target.value))}
          className="w-20 text-right text-sm font-medium text-surface-900 bg-surface-50 border border-surface-200 rounded px-2 py-1"
          min={min}
          max={max}
          step={step}
        />
      </div>
    </div>
  );
}

function SavingsMetric({ icon: Icon, label, value, unit, color }: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600',
  };
  return (
    <div className="card p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color] || colorClasses.blue}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold text-surface-900 savings-value">{value}</div>
      <div className="text-xs text-surface-500 mt-0.5">{label}</div>
      {unit && <div className="text-xs text-surface-400">{unit}</div>}
    </div>
  );
}
