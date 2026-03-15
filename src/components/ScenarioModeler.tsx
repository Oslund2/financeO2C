import { useState } from 'react';
import { Layers, ToggleLeft, ToggleRight, BarChart3, Sparkles, ArrowRight } from 'lucide-react';
import { WorkflowStep, Assumptions, O2CPhase, O2C_PHASES, PHASE_LABELS, PHASE_COLORS } from '../types';
import { calculateSavings, calculatePhaseBreakdown, formatCurrency, formatNumber, formatPercent } from '../lib/calculations';

interface ScenarioModelerProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
  onTogglePhase: (phase: O2CPhase) => void;
}

interface PresetScenario {
  name: string;
  description: string;
  phases: O2CPhase[];
}

const PRESETS: PresetScenario[] = [
  {
    name: 'Full Automation',
    description: 'All 7 O2C phases automated',
    phases: [...O2C_PHASES],
  },
  {
    name: 'Phase 1: Front-End',
    description: 'Order entry + traffic/billing only',
    phases: ['order_entry', 'traffic_billing'],
  },
  {
    name: 'Phase 2: + Invoicing',
    description: 'Add invoice generation & delivery',
    phases: ['order_entry', 'traffic_billing', 'invoice'],
  },
  {
    name: 'Phase 3: + Collections',
    description: 'Add aging, collections, and disputes',
    phases: ['order_entry', 'traffic_billing', 'invoice', 'aging', 'collections', 'disputes'],
  },
  {
    name: 'Cash App Only',
    description: 'Highest-volume single bottleneck',
    phases: ['cash_application'],
  },
  {
    name: 'Back-End Only',
    description: 'Collections, disputes, cash application',
    phases: ['aging', 'collections', 'disputes', 'cash_application'],
  },
];

export function ScenarioModeler({
  baselineSteps, automatedSteps, assumptions, enabledPhases, onTogglePhase,
}: ScenarioModelerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const savings = calculateSavings(baselineSteps, automatedSteps, assumptions, enabledPhases);
  const breakdown = calculatePhaseBreakdown(baselineSteps, automatedSteps, assumptions, enabledPhases);

  const applyPreset = (preset: PresetScenario) => {
    setSelectedPreset(preset.name);
    // Turn off all, then turn on preset phases
    O2C_PHASES.forEach(p => {
      const shouldEnable = preset.phases.includes(p);
      const isEnabled = enabledPhases.includes(p);
      if (shouldEnable !== isEnabled) onTogglePhase(p);
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Scenario Modeler</h1>
        <p className="text-surface-500 mt-1">
          Toggle phases on/off to model different rollout strategies — savings update instantly
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Presets + Phase Toggles */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600" />
              Quick Scenarios
            </h3>
            <div className="space-y-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedPreset === preset.name
                      ? 'border-brand-300 bg-brand-50'
                      : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                  }`}
                >
                  <div className="font-medium text-sm text-surface-900">{preset.name}</div>
                  <div className="text-xs text-surface-500 mt-0.5">{preset.description}</div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {preset.phases.map(p => (
                      <span
                        key={p}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: PHASE_COLORS[p] }}
                        title={PHASE_LABELS[p]}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Phase toggles */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-3">Phase Toggles</h3>
            <div className="space-y-2">
              {O2C_PHASES.map(phase => {
                const enabled = enabledPhases.includes(phase);
                const phaseSteps = baselineSteps.filter(s => s.phase === phase);
                const phaseHours = phaseSteps.reduce(
                  (sum, s) => sum + (s.manualTimeMinutes * s.frequencyPerMonth) / 60, 0
                );
                return (
                  <button
                    key={phase}
                    onClick={() => { onTogglePhase(phase); setSelectedPreset(null); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      enabled
                        ? 'border-surface-200 bg-white'
                        : 'border-surface-100 bg-surface-50 opacity-60'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: enabled ? PHASE_COLORS[phase] : '#cbd5e1' }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium text-surface-900 truncate">
                        {PHASE_LABELS[phase]}
                      </div>
                      <div className="text-xs text-surface-400">
                        {phaseSteps.length} steps · {formatNumber(phaseHours, 0)}h/mo
                      </div>
                    </div>
                    {enabled
                      ? <ToggleRight className="w-6 h-6 text-brand-600 flex-shrink-0" />
                      : <ToggleLeft className="w-6 h-6 text-surface-300 flex-shrink-0" />
                    }
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary bar */}
          <div className="card p-6 bg-gradient-to-r from-brand-600 to-brand-700 text-white border-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="text-sm opacity-80">Hours Saved/Mo</div>
                <div className="text-2xl font-bold savings-value">{formatNumber(savings.hoursSavedPerMonth, 0)}</div>
              </div>
              <div>
                <div className="text-sm opacity-80">FTE Freed</div>
                <div className="text-2xl font-bold savings-value">{formatNumber(savings.fteSaved)}</div>
              </div>
              <div>
                <div className="text-sm opacity-80">Net Savings/Year</div>
                <div className="text-2xl font-bold savings-value">{formatCurrency(savings.netSavingsPerYear)}</div>
              </div>
              <div>
                <div className="text-sm opacity-80">ROI</div>
                <div className="text-2xl font-bold savings-value">{savings.roiMonths}mo</div>
              </div>
            </div>
          </div>

          {/* Phase comparison table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-200">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-600" />
                Phase-by-Phase Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Phase</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-500">Manual h/mo</th>
                    <th className="text-center px-3 py-3 font-medium text-surface-400">→</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-500">Auto h/mo</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-500">Saved</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-500">$/mo</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-500">Reduction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {breakdown.map(phase => {
                    const pct = phase.manualHours > 0 ? (phase.hoursSaved / phase.manualHours) * 100 : 0;
                    return (
                      <tr key={phase.phase} className="hover:bg-surface-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PHASE_COLORS[phase.phase] }} />
                            <span className="font-medium text-surface-900">{PHASE_LABELS[phase.phase]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-surface-600">{formatNumber(phase.manualHours, 0)}</td>
                        <td className="px-3 py-3 text-center"><ArrowRight className="w-3 h-3 text-surface-300 mx-auto" /></td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatNumber(phase.automatedHours, 0)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-surface-900">{formatNumber(phase.hoursSaved, 0)}h</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(phase.dollarsSaved)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            pct >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            pct >= 50 ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {formatNumber(pct, 0)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface-50 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-surface-900">Total</td>
                    <td className="px-4 py-3 text-right text-surface-600">{formatNumber(savings.manualHoursPerMonth, 0)}</td>
                    <td className="px-3 py-3"></td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatNumber(savings.automatedHoursPerMonth, 0)}</td>
                    <td className="px-4 py-3 text-right text-surface-900">{formatNumber(savings.hoursSavedPerMonth, 0)}h</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(savings.dollarSavingsPerMonth)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                        {formatPercent(savings.manualHoursPerMonth > 0
                          ? (savings.hoursSavedPerMonth / savings.manualHoursPerMonth) * 100
                          : 0)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="card p-5 bg-brand-50 border-brand-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-brand-900 text-sm mb-1">AI Phasing Recommendation</h4>
                <p className="text-sm text-brand-800">
                  {enabledPhases.length === O2C_PHASES.length ? (
                    <>
                      Full automation delivers the maximum {formatCurrency(savings.netSavingsPerYear)}/year savings.
                      For a phased rollout, start with <strong>Order Entry + Cash Application</strong> —
                      these two phases alone account for over 60% of total manual hours and have the
                      highest volume of repetitive transactions. Add Collections and Disputes in Phase 2
                      for the next biggest impact.
                    </>
                  ) : enabledPhases.length === 0 ? (
                    <>Toggle on at least one phase to see projected savings.</>
                  ) : (
                    <>
                      With {enabledPhases.length} of {O2C_PHASES.length} phases enabled, you're capturing{' '}
                      {formatCurrency(savings.netSavingsPerYear)}/year in net savings.
                      {!enabledPhases.includes('cash_application') && (
                        <> Adding <strong>Cash Application</strong> would significantly increase impact — it's the highest-volume phase.</>
                      )}
                      {!enabledPhases.includes('order_entry') && (
                        <> Adding <strong>Order Entry</strong> would reduce downstream errors that cascade through billing and collections.</>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
