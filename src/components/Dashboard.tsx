import {
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  Sparkles,
  Target,
  ShieldCheck,
  BarChart3,
  GitBranch,
  Presentation,
  Calculator,
  Database,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { WorkflowStep, Assumptions, O2CPhase, PHASE_LABELS, PHASE_COLORS, AIInsight } from '../types';
import { calculateSavings, calculatePhaseBreakdown, formatCurrency, formatNumber, formatPercent } from '../lib/calculations';
import { KPI_METRICS } from '../data/syntheticData';
import { Tooltip } from './Tooltip';
import { View } from './Layout';

interface DashboardProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
  onNavigate: (view: View) => void;
}

function generateInsights(
  savings: ReturnType<typeof calculateSavings>,
  breakdown: ReturnType<typeof calculatePhaseBreakdown>,
  assumptions: Assumptions,
): AIInsight[] {
  const sorted = [...breakdown].sort((a, b) => b.hoursSaved - a.hoursSaved);
  const topPhase = sorted[0];
  const insights: AIInsight[] = [];

  if (topPhase) {
    insights.push({
      id: 'top-phase',
      title: `${PHASE_LABELS[topPhase.phase]} drives the most savings`,
      description: `${formatNumber(topPhase.hoursSaved, 0)} hours/month saved in this phase alone — that's ${formatCurrency(topPhase.dollarsSaved)}/month. ${topPhase.stepCount} steps can be substantially automated.`,
      impact: 'high',
      phase: topPhase.phase,
      metric: `${formatNumber(topPhase.hoursSaved, 0)}h/mo`,
    });
  }

  insights.push({
    id: 'unbilled-risk',
    title: `${formatCurrency(KPI_METRICS.unbilledOrdersValue)} in unbilled revenue at risk`,
    description: `${KPI_METRICS.unbilledOrders} orders have aired but haven't been invoiced yet. Automated reconciliation between as-run logs and billing could catch these within hours instead of days.`,
    impact: 'high',
    phase: 'traffic_billing',
    metric: `${KPI_METRICS.unbilledOrders} orders`,
  });

  insights.push({
    id: 'disputes',
    title: `${KPI_METRICS.activeDisputes} active disputes totaling ${formatCurrency(KPI_METRICS.disputeTotal)}`,
    description: `At 45 min to research + 30 min to compile evidence per dispute, each resolution costs ~$56 in labor. Claude can reduce this to ~$4 by auto-assembling evidence from the Snowflake mirror.`,
    impact: 'high',
    phase: 'disputes',
    metric: `$56 → $4 per dispute`,
  });

  const orderEntryPhase = breakdown.find(b => b.phase === 'order_entry');
  if (orderEntryPhase && orderEntryPhase.hoursSaved > 0) {
    const monthlyErrors = Math.round(assumptions.monthlyOrderVolume * 0.042);
    insights.push({
      id: 'order-errors',
      title: `~${monthlyErrors} order entry errors cascade downstream each month`,
      description: `A 4.2% error rate on ${assumptions.monthlyOrderVolume.toLocaleString()} monthly orders compounds into billing disputes, delayed collections, and revenue leakage. AI validation catches errors at entry.`,
      impact: 'high',
      phase: 'order_entry',
      metric: `${monthlyErrors} errors/mo`,
    });
  }

  insights.push({
    id: 'unmatched-payments',
    title: `${formatCurrency(KPI_METRICS.unmatchedPaymentsValue)} in payments need matching`,
    description: `${KPI_METRICS.unmatchedPayments} payments received without clear remittance detail. AI probabilistic matching analyzes amount patterns, remittance notes, and payment history to suggest matches at 90%+ confidence.`,
    impact: 'medium',
    phase: 'cash_application',
    metric: `${KPI_METRICS.unmatchedPayments} unmatched`,
  });

  insights.push({
    id: 'dso-opportunity',
    title: `Current DSO of ${KPI_METRICS.avgDSO} days — automation can improve by 5-8 days`,
    description: `Faster invoicing, automated first-notice collections, and proactive aging prioritization reduce the average days outstanding. ${KPI_METRICS.agingDistribution.days90plus}% of AR is 90+ days — targeted automation here has the highest dollar impact.`,
    impact: 'medium',
    phase: 'aging',
    metric: `${KPI_METRICS.avgDSO} → ~${KPI_METRICS.avgDSO - 6} days`,
  });

  return insights;
}

export function Dashboard({ baselineSteps, automatedSteps, assumptions, enabledPhases, onNavigate }: DashboardProps) {
  const savings = calculateSavings(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const phaseBreakdown = calculatePhaseBreakdown(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const insights = generateInsights(savings, phaseBreakdown, assumptions);

  const topPhases = [...phaseBreakdown].sort((a, b) => b.hoursSaved - a.hoursSaved).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Orders-to-Cash Automation</h1>
        <p className="text-surface-500 mt-1">WideOrbit data via Snowflake — real-time automation opportunity analysis</p>
      </div>

      {/* Live Data KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <LiveKPI label="Total Open AR" tooltip="Total dollar amount of all outstanding invoices across all agencies — current plus overdue. This is the total receivables balance from the WideOrbit Snowflake mirror." value={`$${(KPI_METRICS.totalOpenAR / 1000000).toFixed(2)}M`} />
        <LiveKPI label="Avg DSO" tooltip="Days Sales Outstanding — the average number of days it takes to collect payment after an invoice is issued. Lower is better. Industry benchmark for broadcast media is 35-45 days." value={`${KPI_METRICS.avgDSO} days`} />
        <LiveKPI label="Active Disputes" tooltip="Open billing disputes from agencies — wrong rates, missed makegoods, preempted spots, etc. Each dispute requires research and evidence assembly before resolution." value={`${KPI_METRICS.activeDisputes} ($${(KPI_METRICS.disputeTotal / 1000).toFixed(0)}K)`} warn />
        <LiveKPI label="Unmatched Payments" tooltip="Payments received that haven't been matched to specific invoices yet. Common when agencies pay in bulk or omit remittance detail. These need manual research or AI-assisted matching." value={`$${(KPI_METRICS.unmatchedPaymentsValue / 1000).toFixed(0)}K`} warn />
        <LiveKPI label="Unbilled Revenue" tooltip="Orders that have aired (confirmed in as-run logs) but haven't been invoiced yet. This is revenue leakage risk — every day unbilled is a day the cash clock isn't ticking." value={`$${(KPI_METRICS.unbilledOrdersValue / 1000).toFixed(0)}K at risk`} danger />
      </div>

      {/* Automation Savings Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Clock}
          label="Hours Saved / Month"
          tooltip="Total manual hours eliminated by automation each month across all enabled O2C phases."
          value={formatNumber(savings.hoursSavedPerMonth, 0)}
          subtext={`${formatNumber(savings.manualHoursPerMonth, 0)}h manual → ${formatNumber(savings.automatedHoursPerMonth, 0)}h automated`}
          color="blue"
        />
        <MetricCard
          icon={Users}
          label="FTE Equivalents Freed"
          tooltip="Hours saved ÷ 160 work hours/month. Represents capacity that can be redeployed to higher-value work — not necessarily headcount reduction."
          value={formatNumber(savings.fteSaved)}
          subtext={`From ${assumptions.fteCount} current FTEs in AR/AP`}
          color="purple"
        />
        <MetricCard
          icon={DollarSign}
          label="Net Savings / Year"
          tooltip="Annual labor savings minus the cost of AI processing (Claude API calls). This is the true bottom-line impact of automation."
          value={formatCurrency(savings.netSavingsPerYear)}
          subtext={`${formatCurrency(savings.dollarSavingsPerYear)} gross − ${formatCurrency(savings.aiCostPerMonth * 12)} AI cost`}
          color="green"
        />
        <MetricCard
          icon={Target}
          label="ROI Breakeven"
          tooltip="Months until cumulative net savings equal the total implementation investment. After breakeven, every month is pure savings."
          value={`${savings.roiMonths} months`}
          subtext={`On ${formatCurrency(assumptions.implementationCostMonths * assumptions.implementationMonthlyCost)} implementation`}
          color="amber"
        />
      </div>

      {/* Error reduction + top phases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-surface-900">Error Reduction</h3>
          </div>
          <div className="text-4xl font-bold text-emerald-600 mb-2 savings-value">
            {formatPercent(savings.errorReductionPercent)}
          </div>
          <p className="text-sm text-surface-500">
            Fewer billing errors, mismatched payments, and rate-card discrepancies — protecting revenue fidelity for both the company and its customers.
          </p>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-surface-900">Top Impact Phases</h3>
          </div>
          <div className="space-y-3">
            {topPhases.map(phase => {
              const pct = phase.manualHours > 0 ? (phase.hoursSaved / phase.manualHours) * 100 : 0;
              return (
                <div key={phase.phase} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-surface-700 truncate">
                    {PHASE_LABELS[phase.phase]}
                  </div>
                  <div className="flex-1 bg-surface-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: PHASE_COLORS[phase.phase] }}
                    />
                  </div>
                  <div className="text-sm font-semibold text-surface-900 w-24 text-right">
                    {formatNumber(phase.hoursSaved, 0)}h saved
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Insights — now dynamic */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-surface-900">AI-Generated Insights</h2>
          <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
            Powered by Claude
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map(insight => (
            <div key={insight.id} className="card-hover p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  insight.impact === 'high'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {insight.impact} impact
                </span>
                {insight.metric && (
                  <span className="text-xs font-mono text-surface-500">{insight.metric}</span>
                )}
              </div>
              <h4 className="font-semibold text-surface-900 text-sm mb-2">{insight.title}</h4>
              <p className="text-xs text-surface-500 flex-1">{insight.description}</p>
              {insight.phase && (
                <div className="mt-3 pt-3 border-t border-surface-100">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: PHASE_COLORS[insight.phase] + '15',
                      color: PHASE_COLORS[insight.phase],
                    }}
                  >
                    {PHASE_LABELS[insight.phase]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick navigation — 6 actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAction
          icon={GitBranch}
          title="Explore Workflow"
          description="View and edit the full O2C process map"
          onClick={() => onNavigate('workflow')}
        />
        <QuickAction
          icon={Calculator}
          title="Calculate Savings"
          description="Adjust assumptions and see detailed ROI"
          onClick={() => onNavigate('savings')}
        />
        <QuickAction
          icon={Presentation}
          title="Present to Finance"
          description="Full-screen presentation mode"
          onClick={() => onNavigate('presentation')}
        />
        <QuickAction
          icon={Database}
          title="Explore Data"
          description="Query WideOrbit mirror with NL or presets"
          onClick={() => onNavigate('data')}
        />
        <QuickAction
          icon={Zap}
          title="AI Demos"
          description="Live dispute, collections & cash match demos"
          onClick={() => onNavigate('ai-demo')}
        />
        <QuickAction
          icon={AlertTriangle}
          title="Model Scenarios"
          description="What-if analysis with phase toggles"
          onClick={() => onNavigate('scenarios')}
        />
      </div>
    </div>
  );
}

function LiveKPI({ label, tooltip, value, warn, danger }: { label: string; tooltip?: string; value: string; warn?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${
      danger ? 'bg-red-50 border-red-200' :
      warn ? 'bg-amber-50 border-amber-200' :
      'bg-surface-50 border-surface-200'
    }`}>
      <div className="text-xs text-surface-500 flex items-center gap-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className={`text-lg font-bold ${
        danger ? 'text-red-700' : warn ? 'text-amber-700' : 'text-surface-900'
      }`}>{value}</div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, tooltip, value, subtext, color }: {
  icon: typeof TrendingUp;
  label: string;
  tooltip?: string;
  value: string;
  subtext: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-surface-500 font-medium flex items-center gap-1">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </span>
      </div>
      <div className="text-2xl font-bold text-surface-900 savings-value">{value}</div>
      <p className="text-xs text-surface-400 mt-1">{subtext}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, onClick }: {
  icon: typeof TrendingUp;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-hover p-5 text-left group flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-surface-900 text-sm">{title}</div>
        <div className="text-xs text-surface-500">{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors" />
    </button>
  );
}
