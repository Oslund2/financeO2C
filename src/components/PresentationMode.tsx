import { useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Maximize2,
  ArrowRight, Clock, Users, DollarSign, ShieldCheck,
  Sparkles, AlertTriangle, CheckCircle2, Zap,
} from 'lucide-react';
import { WorkflowStep, Assumptions, O2CPhase, O2C_PHASES, PHASE_LABELS, PHASE_COLORS } from '../types';
import {
  calculateSavings, calculatePhaseBreakdown,
  formatCurrency, formatNumber, formatPercent,
} from '../lib/calculations';

interface PresentationModeProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
  onExit: () => void;
}

export function PresentationMode({
  baselineSteps, automatedSteps, assumptions, enabledPhases, onExit,
}: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const savings = calculateSavings(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const breakdown = calculatePhaseBreakdown(baselineSteps, automatedSteps, assumptions, enabledPhases);

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
          A roadmap to eliminate repetitive manual work in AR/AP using AI and the
          Wide Orbit data you already have in Snowflake
        </p>
        <div className="flex items-center gap-6 text-surface-400">
          <span>Finance Planning Session</span>
          <span>·</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    ),

    // Slide 1: The Problem
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-8">The Current Reality</h2>
        <div className="grid grid-cols-2 gap-8 mb-8">
          <ProblemCard
            icon={Clock}
            stat={formatNumber(savings.manualHoursPerMonth, 0)}
            unit="hours/month"
            description="Spent on manual O2C tasks across AR/AP"
          />
          <ProblemCard
            icon={Users}
            stat={String(assumptions.fteCount)}
            unit="FTEs"
            description="Dedicated to repetitive order-to-cash processing"
          />
          <ProblemCard
            icon={AlertTriangle}
            stat={formatPercent(
              baselineSteps.reduce((sum, s) => sum + s.errorRateManual * s.frequencyPerMonth, 0) /
              baselineSteps.reduce((sum, s) => sum + s.frequencyPerMonth, 0) * 100
            )}
            unit="avg error rate"
            description="Manual processing errors that cascade into billing disputes"
          />
          <ProblemCard
            icon={DollarSign}
            stat={formatCurrency(savings.dollarSavingsPerYear)}
            unit="annual labor cost"
            description="On tasks that AI can handle with higher accuracy"
          />
        </div>
        <p className="text-lg text-surface-600 text-center">
          Every order touches <strong>{baselineSteps.length} manual steps</strong> across{' '}
          <strong>{O2C_PHASES.length} process phases</strong> before cash is collected.
        </p>
      </div>
    ),

    // Slide 2: The Structural Shift
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-4">The Structural Shift</h2>
        <p className="text-lg text-surface-500 mb-8 max-w-3xl">
          Claude AI handles the retrieval, matching, drafting, and routing — the high-volume, low-judgment parts.
          Your team shifts from <strong>doing the work</strong> to <strong>approving the work</strong>.
        </p>
        <div className="grid grid-cols-7 gap-3">
          {O2C_PHASES.map(phase => {
            const phaseData = breakdown.find(b => b.phase === phase);
            const pct = phaseData && phaseData.manualHours > 0
              ? (phaseData.hoursSaved / phaseData.manualHours) * 100 : 0;
            return (
              <div key={phase} className="text-center">
                <div
                  className="w-full aspect-square rounded-xl flex flex-col items-center justify-center p-3 mb-2"
                  style={{ backgroundColor: PHASE_COLORS[phase] + '15' }}
                >
                  <div className="text-2xl font-bold" style={{ color: PHASE_COLORS[phase] }}>
                    {formatNumber(pct, 0)}%
                  </div>
                  <div className="text-xs text-surface-500 mt-1">automated</div>
                </div>
                <div className="text-xs font-medium text-surface-700 leading-tight">
                  {PHASE_LABELS[phase].split('&')[0].trim()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),

    // Slide 3: The Numbers
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-8">The Business Case</h2>
        <div className="grid grid-cols-3 gap-8 mb-8">
          <BigStat
            value={formatNumber(savings.hoursSavedPerMonth, 0)}
            unit="hours/month saved"
            detail={`${formatNumber(savings.manualHoursPerMonth, 0)}h → ${formatNumber(savings.automatedHoursPerMonth, 0)}h`}
            color="brand"
          />
          <BigStat
            value={formatCurrency(savings.netSavingsPerYear)}
            unit="net annual savings"
            detail={`After ${formatCurrency(savings.aiCostPerMonth * 12)}/yr AI processing cost`}
            color="emerald"
          />
          <BigStat
            value={`${savings.roiMonths} months`}
            unit="to breakeven"
            detail={`On ${formatCurrency(assumptions.implementationCostMonths * assumptions.implementationMonthlyCost)} implementation investment`}
            color="amber"
          />
        </div>
        <div className="grid grid-cols-2 gap-8">
          <BigStat
            value={formatNumber(savings.fteSaved)}
            unit="FTE equivalents freed"
            detail="Reallocation potential, not headcount reduction"
            color="purple"
          />
          <BigStat
            value={formatPercent(savings.errorReductionPercent)}
            unit="error reduction"
            detail="Protecting revenue fidelity for company and customers"
            color="teal"
          />
        </div>
      </div>
    ),

    // Slide 4: Data Fidelity
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-4">Data Fidelity & Risk Mitigation</h2>
        <p className="text-lg text-surface-500 mb-8">
          Every safeguard is designed to ensure the company doesn't short-change itself or its billable customers.
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

    // Slide 5: Recommended Phasing
    () => (
      <div className="flex flex-col justify-center h-full px-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-8">Recommended Rollout</h2>
        <div className="space-y-6">
          {[
            { label: 'Phase 1 (Months 1-2)', phases: ['order_entry', 'cash_application'] as O2CPhase[], reason: 'Highest volume, most repetitive, immediate impact' },
            { label: 'Phase 2 (Months 3-4)', phases: ['traffic_billing', 'invoice'] as O2CPhase[], reason: 'Natural extension — completes the order-to-invoice pipeline' },
            { label: 'Phase 3 (Months 5-6)', phases: ['aging', 'collections', 'disputes'] as O2CPhase[], reason: 'Collections automation with dispute resolution support' },
          ].map((phase, i) => {
            const phasesSavings = calculateSavings(
              baselineSteps, automatedSteps, assumptions, phase.phases
            );
            return (
              <div key={i} className="flex items-start gap-6 p-6 bg-surface-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-surface-900 text-lg">{phase.label}</div>
                  <div className="flex gap-2 mt-2 mb-2">
                    {phase.phases.map(p => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: PHASE_COLORS[p] }}
                      >
                        {PHASE_LABELS[p]}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-surface-500">{phase.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-emerald-600">
                    {formatCurrency(phasesSavings.netSavingsPerYear)}/yr
                  </div>
                  <div className="text-xs text-surface-400">{formatNumber(phasesSavings.hoursSavedPerMonth, 0)}h/mo saved</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),

    // Slide 6: Next Steps
    () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-16">
        <Zap className="w-16 h-16 text-brand-600 mb-6" />
        <h2 className="text-4xl font-bold text-surface-900 mb-4">Next Steps</h2>
        <div className="max-w-2xl space-y-4 text-left mb-8">
          {[
            'Validate baseline time estimates with AR/AP team leads',
            'Confirm Snowflake mirror table availability and refresh frequency',
            'Select Phase 1 pilot scope and success criteria',
            'Set up Claude API access and Supabase environment',
            'Build Phase 1 automation workflows with human-in-the-loop gates',
            'Run parallel processing (manual + AI) for 2 weeks to validate accuracy',
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
          This tool is interactive — explore the workflow map, adjust assumptions, and model scenarios
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
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700"
        >
          <X className="w-4 h-4" /> Exit
        </button>
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

function ProblemCard({ icon: Icon, stat, unit, description }: {
  icon: typeof Clock;
  stat: string;
  unit: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-red-50 border border-red-100">
      <Icon className="w-6 h-6 text-red-500 mb-3" />
      <div className="text-3xl font-bold text-surface-900">{stat}</div>
      <div className="text-sm font-medium text-red-600 mb-1">{unit}</div>
      <div className="text-sm text-surface-500">{description}</div>
    </div>
  );
}

function BigStat({ value, unit, detail, color }: {
  value: string;
  unit: string;
  detail: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    brand: 'text-brand-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    teal: 'text-teal-600',
  };
  return (
    <div className="p-6 rounded-xl bg-surface-50 border border-surface-200 text-center">
      <div className={`text-3xl font-bold ${colorMap[color] || 'text-brand-600'}`}>{value}</div>
      <div className="text-sm font-medium text-surface-700 mt-1">{unit}</div>
      <div className="text-xs text-surface-400 mt-2">{detail}</div>
    </div>
  );
}
