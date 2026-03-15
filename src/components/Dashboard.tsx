import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Zap,
  ArrowRight,
  Sparkles,
  Target,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { WorkflowStep, Assumptions, O2CPhase, PHASE_LABELS, PHASE_COLORS, AIInsight } from '../types';
import { calculateSavings, calculatePhaseBreakdown, formatCurrency, formatNumber, formatPercent } from '../lib/calculations';
import { View } from './Layout';

interface DashboardProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
  onNavigate: (view: View) => void;
}

const AI_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    title: 'Cash Application is your highest-volume bottleneck',
    description: 'With 2,800 payment matches and 500 short-pay investigations per month, cash application consumes the most manual hours. AI probabilistic matching could auto-apply 92% of clean matches.',
    impact: 'high',
    phase: 'cash_application',
    metric: '2,800 matches/mo',
  },
  {
    id: '2',
    title: 'Dispute resolution has the highest per-incident cost',
    description: 'At 45 minutes to research plus 30 minutes to compile evidence per dispute, each resolution costs ~$56 in labor. Claude can reduce this to ~$4 by auto-assembling evidence from Snowflake.',
    impact: 'high',
    phase: 'disputes',
    metric: '$56 → $4 per dispute',
  },
  {
    id: '3',
    title: 'Order entry errors cascade through the entire O2C cycle',
    description: 'A 4.2% error rate on 4,200 monthly orders means ~176 orders with issues that compound into billing disputes, delayed collections, and revenue leakage downstream.',
    impact: 'high',
    phase: 'order_entry',
    metric: '176 error orders/mo',
  },
  {
    id: '4',
    title: 'Collections outreach could be 85% automated',
    description: 'First and second notices are highly templatable. Referencing specific invoice numbers, spot IDs, and flight dates from WideOrbit data makes AI-drafted outreach more specific than generic templates.',
    impact: 'medium',
    phase: 'collections',
    metric: '1,200 notices/mo',
  },
  {
    id: '5',
    title: 'Snowflake mirror enables risk-free automation',
    description: 'Because Claude queries the read-only Snowflake mirror (not live WideOrbit), automation risk is minimal. The mirror provides a safety buffer while the AI layer matures.',
    impact: 'medium',
  },
];

export function Dashboard({ baselineSteps, automatedSteps, assumptions, enabledPhases, onNavigate }: DashboardProps) {
  const savings = calculateSavings(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const phaseBreakdown = calculatePhaseBreakdown(baselineSteps, automatedSteps, assumptions, enabledPhases);

  const topPhases = [...phaseBreakdown].sort((a, b) => b.hoursSaved - a.hoursSaved).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Orders-to-Cash Automation</h1>
        <p className="text-surface-500 mt-1">Wide Orbit data via Snowflake — real-time automation opportunity analysis</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Clock}
          label="Hours Saved / Month"
          value={formatNumber(savings.hoursSavedPerMonth, 0)}
          subtext={`${formatNumber(savings.manualHoursPerMonth, 0)}h manual → ${formatNumber(savings.automatedHoursPerMonth, 0)}h automated`}
          trend="up"
          color="blue"
        />
        <MetricCard
          icon={Users}
          label="FTE Equivalents Freed"
          value={formatNumber(savings.fteSaved)}
          subtext={`From ${assumptions.fteCount} current FTEs in AR/AP`}
          trend="up"
          color="purple"
        />
        <MetricCard
          icon={DollarSign}
          label="Net Savings / Year"
          value={formatCurrency(savings.netSavingsPerYear)}
          subtext={`${formatCurrency(savings.dollarSavingsPerYear)} gross − ${formatCurrency(savings.aiCostPerMonth * 12)} AI cost`}
          trend="up"
          color="green"
        />
        <MetricCard
          icon={Target}
          label="ROI Breakeven"
          value={`${savings.roiMonths} months`}
          subtext={`On ${formatCurrency(assumptions.implementationCostMonths * assumptions.implementationMonthlyCost)} implementation`}
          trend="down"
          color="amber"
        />
      </div>

      {/* Error reduction + quick actions */}
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

      {/* AI Insights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-surface-900">AI-Generated Insights</h2>
          <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
            Powered by Claude
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_INSIGHTS.map(insight => (
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

      {/* Quick navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, trend, color }: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  subtext: string;
  trend: 'up' | 'down';
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
        <span className="text-sm text-surface-500 font-medium">{label}</span>
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

// Re-export icons used in quick actions
import { GitBranch, Presentation } from 'lucide-react';
