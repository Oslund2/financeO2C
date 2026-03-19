import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight,
  ArrowRight, Clock, Users, DollarSign, ShieldCheck,
  Sparkles, AlertTriangle, CheckCircle2, Zap,
  FileSearch, Mail, Banknote, ClipboardCheck, ScanSearch,
  Database, TrendingDown,
} from 'lucide-react';
import { WorkflowStep, Assumptions, O2CPhase, O2C_PHASES, PHASE_LABELS, PHASE_COLORS } from '../types';
import {
  calculateSavings, calculatePhaseBreakdown,
  formatCurrency, formatNumber, formatPercent,
} from '../lib/calculations';
import { KPI_METRICS } from '../data/syntheticData';

interface PresentationModeProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
  onExit: () => void;
}

const SLIDE_TITLES = [
  'Title',
  'The Current Reality',
  'The O2C Lifecycle',
  'Immediate Wins',
  'Medium-Term Automation',
  'Bigger Picture',
  'The Business Case',
  'Data Fidelity & Risk',
  'Recommended Rollout',
  'Next Steps',
];

export function PresentationMode({
  baselineSteps, automatedSteps, assumptions, enabledPhases, onExit,
}: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const savings = calculateSavings(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const breakdown = calculatePhaseBreakdown(baselineSteps, automatedSteps, assumptions, enabledPhases);

  // Keyboard navigation
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') setCurrentSlide(s => Math.min(s + 1, 9));
    if (e.key === 'ArrowLeft') setCurrentSlide(s => Math.max(s - 1, 0));
    if (e.key === 'Escape') onExit();
  }, [onExit]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const slides = [
    // Slide 0: Title
    () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center mb-8">
          <span className="text-white font-bold text-2xl">O2C</span>
        </div>
        <h1 className="text-5xl font-bold text-surface-900 mb-4">
          Orders-to-Cash Automation
        </h1>
        <p className="text-xl text-surface-500 mb-8 max-w-2xl">
          A roadmap to eliminate repetitive manual work in AR/AP using Claude AI and the
          WideOrbit data already in Snowflake
        </p>
        <div className="flex items-center gap-6 text-surface-400">
          <span>Orders-to-Cash Team</span>
          <span>·</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    ),

    // Slide 1: Current Reality — with live AR data
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-3">The Current Reality</h2>
        <p className="text-surface-500 mb-6">What our O2C process looks like today — manual effort and real AR exposure.</p>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ProblemCard icon={Clock} stat={formatNumber(savings.manualHoursPerMonth, 0)} unit="hours/month" description="Spent on manual O2C tasks across AR/AP" />
          <ProblemCard icon={Users} stat={String(assumptions.fteCount)} unit="FTEs" description="Dedicated to repetitive order-to-cash processing" />
          <ProblemCard icon={AlertTriangle} stat={`$${(KPI_METRICS.unbilledOrdersValue / 1000).toFixed(0)}K`} unit="unbilled revenue at risk" description={`${KPI_METRICS.unbilledOrders} orders aired but not yet invoiced`} />
          <ProblemCard icon={DollarSign} stat={`$${(KPI_METRICS.totalOpenAR / 1000000).toFixed(2)}M`} unit="total open AR" description={`${KPI_METRICS.avgDSO} day average DSO, ${KPI_METRICS.agingDistribution.days90plus}% over 90 days`} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Active Disputes" value={`${KPI_METRICS.activeDisputes} ($${(KPI_METRICS.disputeTotal / 1000).toFixed(0)}K)`} warn />
          <MiniStat label="Unmatched Payments" value={`$${(KPI_METRICS.unmatchedPaymentsValue / 1000).toFixed(0)}K`} warn />
          <MiniStat label="Collection Rate" value={`${KPI_METRICS.collectionRate}%`} />
        </div>
      </div>
    ),

    // Slide 2: O2C Lifecycle
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-2">The O2C Lifecycle</h2>
        <p className="text-surface-500 mb-6">Every order passes through 7 phases. Each has manual hours that AI can reclaim.</p>
        <div className="grid grid-cols-7 gap-3">
          {O2C_PHASES.map(phase => {
            const phaseData = breakdown.find(b => b.phase === phase);
            const manualH = phaseData?.manualHours ?? 0;
            const savedH = phaseData?.hoursSaved ?? 0;
            const pct = manualH > 0 ? (savedH / manualH) * 100 : 0;
            return (
              <div key={phase} className="text-center">
                <div
                  className="w-full aspect-square rounded-xl flex flex-col items-center justify-center p-2 mb-2"
                  style={{ backgroundColor: PHASE_COLORS[phase] + '15' }}
                >
                  <div className="text-2xl font-bold" style={{ color: PHASE_COLORS[phase] }}>
                    {formatNumber(pct, 0)}%
                  </div>
                  <div className="text-xs text-surface-500 mt-1">automatable</div>
                </div>
                <div className="text-xs font-medium text-surface-700 leading-tight">
                  {PHASE_LABELS[phase].split('&')[0].trim()}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">
                  {formatNumber(manualH, 0)}h/mo
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 p-4 bg-brand-50 rounded-lg text-center">
          <span className="text-brand-700 font-medium">
            Structural shift: AI handles retrieval, matching, drafting & routing. Your team shifts from <em>doing</em> the work to <em>approving</em> the work.
          </span>
        </div>
      </div>
    ),

    // Slide 3: Immediate Wins
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-2">Immediate Wins</h2>
        <p className="text-surface-500 mb-6">Deploy now — high impact, low effort. No Snowflake schema changes needed.</p>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <AutomationCard
            icon={FileSearch}
            title="Dispute Resolution"
            before="45 min research + 30 min compile"
            after="~60 seconds"
            description="Claude pulls the original order, as-run log, contract terms, and invoice from Snowflake and generates a complete dispute summary with supporting evidence."
            annualSavings={formatCurrency(150 * 1.15 * 45 * 12)} // 150 disputes x 1.15h x $45 x 12
          />
          <AutomationCard
            icon={Mail}
            title="Collections Outreach"
            before="8-10 min per notice"
            after="~15 seconds"
            description="AI drafts personalized collections emails that reference specific invoices, spot numbers, and flight dates from WideOrbit data."
            annualSavings={formatCurrency(1300 * 0.14 * 45 * 12)} // 1300 notices x 0.14h saved x $45 x 12
          />
        </div>
        <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-brand-600" />
            <span className="font-semibold text-surface-900 text-sm">Natural Language Data Access</span>
          </div>
          <p className="text-sm text-surface-500">
            AR/AP team members ask questions in plain English — <em>"Show me all invoices over 90 days for GroupM"</em> — and Claude queries the Snowflake mirror instantly. No SQL required.
          </p>
        </div>
      </div>
    ),

    // Slide 4: Medium-Term Automation
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-2">Medium-Term Automation</h2>
        <p className="text-surface-500 mb-6">Higher complexity, transformative value. Months 3-6 of rollout.</p>
        <div className="grid grid-cols-2 gap-5">
          <AutomationCard
            icon={Banknote}
            title="Cash Application"
            before="10-20 min per payment"
            after="~30 seconds"
            description="AI analyzes bulk payments, probabilistically matches against open AR, and flags short-pays with the specific invoices involved."
            annualSavings={formatCurrency(2800 * 0.15 * 45 * 12)}
          />
          <AutomationCard
            icon={ClipboardCheck}
            title="AP Verification"
            before="15-25 min per invoice"
            after="~20 seconds"
            description="Cross-reference vendor invoices against contracted rates, ordered spots, and payment terms — flagging discrepancies before payment."
            annualSavings={formatCurrency(3200 * 0.08 * 45 * 12)}
          />
          <AutomationCard
            icon={ScanSearch}
            title="Order-to-Invoice Reconciliation"
            before="2-4 hours per weekly audit"
            after="~45 seconds"
            description="Match traffic logs (what aired) against orders (what was sold) against invoices (what was billed) — surface gaps and anomalies automatically."
            annualSavings={formatCurrency(52 * 3 * 45)}
          />
          <AutomationCard
            icon={TrendingDown}
            title="Collections Prioritization"
            before="45 min manual review"
            after="~2 min AI-ranked queue"
            description="Claude analyzes payment history patterns to rank which accounts to pursue first, factoring in balance size, aging, and past payment behavior."
            annualSavings={formatCurrency(30 * 0.7 * 45 * 12)}
          />
        </div>
      </div>
    ),

    // Slide 5: Bigger Picture
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-2">Bigger Picture</h2>
        <p className="text-surface-500 mb-8">Where this goes as the team builds trust in the AI layer.</p>
        <div className="space-y-6">
          <BiggerPlayCard
            title="Workflow Triggers via Tool Use"
            items={[
              'Auto-escalate disputes past SLA thresholds',
              'Generate credit memo requests when Claude confirms billing errors',
              'Push reconciliation results into ERP systems',
              'Draft and queue collections notices at aging milestones',
            ]}
          />
          <BiggerPlayCard
            title="Cross-System Joins"
            items={[
              'Match bank deposits to WideOrbit invoices for auto-reconciliation',
              'Tie Salesforce opportunity data to WideOrbit order status',
              'Join ERP vendor records with WideOrbit contract terms for AP automation',
            ]}
          />
          <BiggerPlayCard
            title="Periodic Monitoring"
            items={[
              'Daily: scan for unbilled aired orders (revenue leakage)',
              'Weekly: full order-to-invoice reconciliation audit',
              'Monthly: DSO trend analysis with root-cause attribution',
            ]}
          />
        </div>
      </div>
    ),

    // Slide 6: Business Case
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-8">The Business Case</h2>
        <div className="grid grid-cols-3 gap-8 mb-8">
          <BigStat value={formatNumber(savings.hoursSavedPerMonth, 0)} unit="hours/month saved" detail={`${formatNumber(savings.manualHoursPerMonth, 0)}h → ${formatNumber(savings.automatedHoursPerMonth, 0)}h`} color="brand" />
          <BigStat value={formatCurrency(savings.netSavingsPerYear)} unit="net annual savings" detail={`After ${formatCurrency(savings.aiCostPerMonth * 12)}/yr AI processing cost`} color="emerald" />
          <BigStat value={`${savings.roiMonths} months`} unit="to breakeven" detail={`On ${formatCurrency(assumptions.implementationCostMonths * assumptions.implementationMonthlyCost)} implementation investment`} color="amber" />
        </div>
        <div className="grid grid-cols-2 gap-8">
          <BigStat value={formatNumber(savings.fteSaved)} unit="FTE equivalents freed" detail="Reallocation potential, not headcount reduction" color="purple" />
          <BigStat value={formatPercent(savings.errorReductionPercent)} unit="error reduction" detail="Protecting revenue fidelity for company and customers" color="teal" />
        </div>
      </div>
    ),

    // Slide 7: Data Fidelity
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-4">Data Fidelity & Risk Mitigation</h2>
        <p className="text-lg text-surface-500 mb-8">
          Every safeguard ensures the company doesn't short-change itself or its customers.
        </p>
        <div className="grid grid-cols-2 gap-6">
          {[
            { title: 'Read-Only Snowflake Access', desc: 'AI queries the mirror database, never touches live WideOrbit production systems' },
            { title: 'Human-in-the-Loop', desc: 'AI handles 80-95% of volume; humans approve exceptions, disputes, and high-value decisions' },
            { title: 'Full Audit Trail', desc: 'Every AI action logged with timestamp, source data, and decision rationale' },
            { title: 'Calculation Transparency', desc: 'Every savings number shows its formula — no hidden logic, no magic numbers' },
            { title: 'Gradual Rollout', desc: 'Phase-by-phase implementation lets you validate accuracy before expanding scope' },
            { title: 'Error Rate Monitoring', desc: 'Continuous comparison of AI vs. manual error rates with automatic alerting' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-surface-900">{item.title}</div>
                <div className="text-sm text-surface-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    // Slide 8: Rollout
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-8">Recommended Rollout</h2>
        <div className="space-y-5">
          {[
            { label: 'Phase 1: Immediate Wins (Months 1-2)', phases: ['disputes', 'collections'] as O2CPhase[], reason: 'Dispute resolution & collections outreach — highest per-task savings, lowest integration risk' },
            { label: 'Phase 2: Front-End Automation (Months 2-4)', phases: ['order_entry', 'traffic_billing', 'invoice'] as O2CPhase[], reason: 'Order entry through invoicing — completes the order-to-invoice pipeline' },
            { label: 'Phase 3: Back-End Optimization (Months 4-6)', phases: ['aging', 'cash_application'] as O2CPhase[], reason: 'Aging prioritization & cash application — unlocks DSO improvement' },
          ].map((phase, i) => {
            const phasesSavings = calculateSavings(baselineSteps, automatedSteps, assumptions, phase.phases);
            return (
              <div key={i} className="flex items-start gap-6 p-5 bg-surface-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-surface-900 text-lg">{phase.label}</div>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {phase.phases.map(p => (
                      <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: PHASE_COLORS[p] }}>
                        {PHASE_LABELS[p]}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-surface-500">{phase.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-emerald-600">{formatCurrency(phasesSavings.netSavingsPerYear)}/yr</div>
                  <div className="text-xs text-surface-400">{formatNumber(phasesSavings.hoursSavedPerMonth, 0)}h/mo saved</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),

    // Slide 9: Next Steps
    () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-16">
        <Zap className="w-16 h-16 text-brand-600 mb-6" />
        <h2 className="text-4xl font-bold text-surface-900 mb-4">Next Steps</h2>
        <div className="max-w-2xl space-y-4 text-left mb-8">
          {[
            'Validate baseline time estimates with AR/AP team leads',
            'Connect Claude to the Snowflake WideOrbit replica (read-only)',
            'Let the AR/AP team run ad-hoc queries for 2 weeks — build trust, surface top questions',
            'Formalize top recurring queries into saved workflows',
            'Deploy Phase 1: automated dispute resolution & collections outreach',
            'Run parallel processing (manual + AI) for 2 weeks to validate accuracy',
            'Layer in reconciliation automation — order vs. aired vs. billed matching',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {i + 1}
              </div>
              <span className="text-surface-700">{step}</span>
            </div>
          ))}
        </div>
        <p className="text-surface-400 text-sm">
          This tool is interactive — explore the data, run AI demos, and model scenarios live
        </p>
      </div>
    ),
  ];

  const totalSlides = slides.length;

  return (
    <div className="presentation-mode flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200 bg-surface-50">
        <div className="text-sm text-surface-500">
          <span className="font-medium text-surface-700">{SLIDE_TITLES[currentSlide]}</span>
          <span className="mx-2">·</span>
          Slide {currentSlide + 1} of {totalSlides}
        </div>
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? 'w-6 bg-brand-600' : 'bg-surface-300 hover:bg-surface-400'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-400 hidden sm:block">Arrow keys to navigate</span>
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700"
          >
            <X className="w-4 h-4" /> Exit
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="h-full max-w-6xl mx-auto">
          {slides[currentSlide]()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 bg-surface-50">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="btn-secondary flex items-center gap-2 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <button
          onClick={() => setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))}
          disabled={currentSlide === totalSlides - 1}
          className="btn-primary flex items-center gap-2"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Sub-components ---

function ProblemCard({ icon: Icon, stat, unit, description }: {
  icon: typeof Clock; stat: string; unit: string; description: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-red-50 border border-red-100">
      <Icon className="w-6 h-6 text-red-500 mb-2" />
      <div className="text-3xl font-bold text-surface-900">{stat}</div>
      <div className="text-sm font-medium text-red-600 mb-1">{unit}</div>
      <div className="text-sm text-surface-500">{description}</div>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`p-3 rounded-lg text-center ${warn ? 'bg-amber-50 border border-amber-200' : 'bg-surface-50 border border-surface-200'}`}>
      <div className="text-xs text-surface-500">{label}</div>
      <div className={`text-lg font-bold ${warn ? 'text-amber-700' : 'text-surface-900'}`}>{value}</div>
    </div>
  );
}

function BigStat({ value, unit, detail, color }: {
  value: string; unit: string; detail: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    brand: 'text-brand-600', emerald: 'text-emerald-600', amber: 'text-amber-600', purple: 'text-purple-600', teal: 'text-teal-600',
  };
  return (
    <div className="p-6 rounded-xl bg-surface-50 border border-surface-200 text-center">
      <div className={`text-3xl font-bold ${colorMap[color] || 'text-brand-600'}`}>{value}</div>
      <div className="text-sm font-medium text-surface-700 mt-1">{unit}</div>
      <div className="text-xs text-surface-400 mt-2">{detail}</div>
    </div>
  );
}

function AutomationCard({ icon: Icon, title, before, after, description, annualSavings }: {
  icon: typeof FileSearch; title: string; before: string; after: string; description: string; annualSavings: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-surface-50 border border-surface-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-600" />
        </div>
        <h3 className="font-semibold text-surface-900">{title}</h3>
      </div>
      <p className="text-sm text-surface-500 mb-3">{description}</p>
      <div className="flex items-center gap-3 text-xs mb-2">
        <span className="text-surface-500"><Clock className="w-3 h-3 inline mr-1" />{before}</span>
        <ArrowRight className="w-3 h-3 text-surface-300" />
        <span className="text-emerald-600 font-medium"><Sparkles className="w-3 h-3 inline mr-1" />{after}</span>
      </div>
      <div className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded px-2 py-1 inline-block">
        Est. {annualSavings}/yr
      </div>
    </div>
  );
}

function BiggerPlayCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-5 bg-surface-50 rounded-xl border border-surface-200">
      <h3 className="font-semibold text-surface-900 mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <ArrowRight className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <span className="text-surface-600">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
