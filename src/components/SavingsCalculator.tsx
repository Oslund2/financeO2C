import { useState } from 'react';
import {
  DollarSign, Clock, Users, TrendingUp, ShieldCheck,
  ChevronDown, ChevronUp, Info, Sparkles, ArrowLeft,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { WorkflowStep, Assumptions, O2CPhase, O2C_PHASES, PHASE_LABELS, PHASE_COLORS } from '../types';
import {
  calculateSavings, calculatePhaseBreakdown,
  formatCurrency, formatNumber, formatPercent,
} from '../lib/calculations';
import { AISavingsNarrative } from './AISavingsNarrative';
import { KPI_METRICS } from '../data/syntheticData';
import { View } from './Layout';

interface SavingsCalculatorProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
  onUpdateAssumptions: (updates: Partial<Assumptions>) => void;
  onNavigate: (view: View) => void;
}

export function SavingsCalculator({
  baselineSteps, automatedSteps, assumptions, enabledPhases, onUpdateAssumptions, onNavigate,
}: SavingsCalculatorProps) {
  const [showFormulas, setShowFormulas] = useState(false);
  const savings = calculateSavings(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const breakdown = calculatePhaseBreakdown(baselineSteps, automatedSteps, assumptions, enabledPhases);

  const totalManualTransactions = baselineSteps
    .filter(s => enabledPhases.includes(s.phase))
    .reduce((sum, s) => sum + s.frequencyPerMonth, 0);

  // DSO improvement estimate: back-end phases (aging, collections, disputes, cash_application)
  // drive DSO. Conservative: automate X% of back-end hours → reduce DSO by X% * 0.3
  const backEndPhases: O2CPhase[] = ['aging', 'collections', 'disputes', 'cash_application'];
  const backEndBreakdown = breakdown.filter(b => backEndPhases.includes(b.phase));
  const backEndManualH = backEndBreakdown.reduce((s, b) => s + b.manualHours, 0);
  const backEndSavedH = backEndBreakdown.reduce((s, b) => s + b.hoursSaved, 0);
  const backEndPct = backEndManualH > 0 ? backEndSavedH / backEndManualH : 0;
  const dsoImprovement = Math.round(KPI_METRICS.avgDSO * backEndPct * 0.3);

  // Revenue protected: manual errors avoided × avg invoice value
  const avgInvoiceValue = KPI_METRICS.totalOpenAR / KPI_METRICS.totalInvoiceCount;
  const monthlyManualErrors = baselineSteps
    .filter(s => enabledPhases.includes(s.phase))
    .reduce((sum, s) => sum + s.errorRateManual * s.frequencyPerMonth, 0);
  const monthlyAutoErrors = automatedSteps
    .filter(s => enabledPhases.includes(s.phase))
    .reduce((sum, s) => sum + s.errorRateAutomated * s.frequencyPerMonth, 0);
  const errorsAvoided = monthlyManualErrors - monthlyAutoErrors;
  const revenueProtected = errorsAvoided * avgInvoiceValue * 12;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
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
                tooltip="The total cost per hour for an AR/AP team member, including salary, benefits, overhead, and workspace. Typically 1.3-1.5x the base hourly wage."
                value={assumptions.hourlyFteCost}
                onChange={v => onUpdateAssumptions({ hourlyFteCost: v })}
                prefix="$"
                min={15}
                max={150}
                step={5}
              />
              <AssumptionInput
                label="Current AR/AP FTEs"
                tooltip="Full-time equivalent headcount currently dedicated to Orders-to-Cash tasks. Can be fractional — e.g., 3.2 means 3 full-time staff plus one person spending ~20% of their time on O2C."
                value={assumptions.fteCount}
                onChange={v => onUpdateAssumptions({ fteCount: v })}
                min={0.5}
                max={50}
                step={0.1}
              />
              <AssumptionInput
                label="Monthly Order Volume"
                tooltip="Total number of advertising orders processed per month across all stations and channels. Each order may contain multiple spots. This drives the frequency multipliers for every workflow step."
                value={assumptions.monthlyOrderVolume}
                onChange={v => onUpdateAssumptions({ monthlyOrderVolume: v })}
                min={100}
                max={50000}
                step={100}
              />
              <AssumptionInput
                label="AI Cost per Transaction"
                tooltip="The estimated cost each time Claude AI processes a task (e.g., parsing an order, matching a payment, drafting an email). Based on API token usage. At $0.03/transaction and 4,200 orders/month, AI costs ~$126/month."
                value={assumptions.aiCostPerTransaction}
                onChange={v => onUpdateAssumptions({ aiCostPerTransaction: v })}
                prefix="$"
                min={0.001}
                max={1}
                step={0.005}
                decimals={3}
              />
              <AssumptionInput
                label="Implementation Duration"
                tooltip="How many months to deploy the automation across all phases. This is the period during which you're paying implementation costs (integration, testing, training, parallel runs) before the full savings kick in. Longer timelines = higher total investment before ROI."
                value={assumptions.implementationCostMonths}
                onChange={v => onUpdateAssumptions({ implementationCostMonths: v })}
                min={1}
                max={24}
                step={1}
              />
              <AssumptionInput
                label="Implementation Cost / Month"
                tooltip="Monthly spend during the implementation period. Includes developer/integrator time, Snowflake connector setup, Claude API integration, testing, training, and change management. Total investment = duration × monthly cost."
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SavingsMetric
              icon={Clock}
              label="Hours Saved / Month"
              tooltip="Total manual hours eliminated per month. Calculated as: sum of (manual time × frequency) minus sum of (automated time × frequency) across all enabled phases."
              value={formatNumber(savings.hoursSavedPerMonth, 0)}
              unit="hours"
              color="blue"
            />
            <SavingsMetric
              icon={Users}
              label="FTE Freed"
              tooltip="Hours saved divided by 160 work hours/month. This represents reallocation capacity — not necessarily headcount reduction. These FTEs can shift to higher-value work like relationship management and strategic planning."
              value={formatNumber(savings.fteSaved)}
              unit="people"
              color="purple"
            />
            <SavingsMetric
              icon={DollarSign}
              label="Gross Savings / Year"
              tooltip="Hours saved per month × hourly FTE cost × 12 months. This is the total labor value recovered before subtracting AI processing costs."
              value={formatCurrency(savings.dollarSavingsPerYear)}
              unit=""
              color="green"
            />
            <SavingsMetric
              icon={TrendingUp}
              label="Net Savings / Year"
              tooltip="Gross savings minus the annual cost of AI processing (API calls). This is the actual bottom-line impact. AI costs are typically 1-3% of gross savings."
              value={formatCurrency(savings.netSavingsPerYear)}
              unit={`after ${formatCurrency(savings.aiCostPerMonth * 12)} AI cost`}
              color="emerald"
            />
            <SavingsMetric
              icon={ShieldCheck}
              label="Error Reduction"
              tooltip="Percentage reduction in processing errors (wrong rates, missed spots, mismatched payments). Calculated by comparing total manual error events vs. automated error events across all workflow steps."
              value={formatPercent(savings.errorReductionPercent)}
              unit=""
              color="teal"
            />
            <SavingsMetric
              icon={DollarSign}
              label="ROI Breakeven"
              tooltip="Months until net savings recoup the total implementation investment. Calculated as: (implementation months × monthly cost) ÷ net monthly savings. Lower is better — under 6 months is excellent."
              value={`${savings.roiMonths}`}
              unit="months"
              color="amber"
            />
            <SavingsMetric
              icon={Clock}
              label="Est. DSO Improvement"
              tooltip="Days Sales Outstanding (DSO) measures how quickly you collect payment. Automating aging, collections, disputes, and cash application accelerates the back end of the O2C cycle. This is a conservative estimate (30% of proportional improvement)."
              value={`${dsoImprovement} days`}
              unit={`${KPI_METRICS.avgDSO} → ~${KPI_METRICS.avgDSO - dsoImprovement} days`}
              color="blue"
            />
            <SavingsMetric
              icon={ShieldCheck}
              label="Revenue Protected / Year"
              tooltip="Dollar value of billing errors avoided annually. Calculated as: (manual errors per month - automated errors per month) × average invoice value × 12. These are errors that would otherwise cause disputes, credit memos, or revenue leakage."
              value={formatCurrency(revenueProtected)}
              unit="billing errors avoided"
              color="teal"
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

function AssumptionInput({ label, tooltip, value, onChange, prefix, min, max, step, decimals = 1 }: {
  label: string;
  tooltip?: string;
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
      <label className="flex items-center gap-1.5 text-xs font-medium text-surface-600 mb-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
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

function SavingsMetric({ icon: Icon, label, tooltip, value, unit, color }: {
  icon: typeof DollarSign;
  label: string;
  tooltip?: string;
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
      <div className="text-xs text-surface-500 mt-0.5 flex items-center gap-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      {unit && <div className="text-xs text-surface-400">{unit}</div>}
    </div>
  );
}
