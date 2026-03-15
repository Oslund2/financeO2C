import {
  WorkflowStep,
  Assumptions,
  SavingsResult,
  PhaseBreakdown,
  O2CPhase,
  O2C_PHASES,
  PHASE_LABELS,
} from '../types';

export function calculateStepHoursPerMonth(step: WorkflowStep, mode: 'manual' | 'automated'): number {
  const minutes = mode === 'manual' ? step.manualTimeMinutes : step.automatedTimeMinutes;
  return (minutes * step.frequencyPerMonth) / 60;
}

export function calculateSavings(
  baselineSteps: WorkflowStep[],
  automatedSteps: WorkflowStep[],
  assumptions: Assumptions,
  enabledPhases: O2CPhase[]
): SavingsResult {
  const activeBaseline = baselineSteps.filter(s => enabledPhases.includes(s.phase));
  const activeAutomated = automatedSteps.filter(s => enabledPhases.includes(s.phase));

  const manualHoursPerMonth = activeBaseline.reduce(
    (sum, s) => sum + calculateStepHoursPerMonth(s, 'manual'), 0
  );
  const automatedHoursPerMonth = activeAutomated.reduce(
    (sum, s) => sum + calculateStepHoursPerMonth(s, 'automated'), 0
  );

  const hoursSavedPerMonth = manualHoursPerMonth - automatedHoursPerMonth;
  const fteSaved = hoursSavedPerMonth / 160; // ~160 work hours/month
  const dollarSavingsPerMonth = hoursSavedPerMonth * assumptions.hourlyFteCost;
  const dollarSavingsPerYear = dollarSavingsPerMonth * 12;

  // Error reduction
  const totalManualErrors = activeBaseline.reduce(
    (sum, s) => sum + s.errorRateManual * s.frequencyPerMonth, 0
  );
  const totalAutoErrors = activeAutomated.reduce(
    (sum, s) => sum + s.errorRateAutomated * s.frequencyPerMonth, 0
  );
  const errorReductionPercent = totalManualErrors > 0
    ? ((totalManualErrors - totalAutoErrors) / totalManualErrors) * 100
    : 0;

  // AI processing cost
  const totalAutoTransactions = activeAutomated.reduce(
    (sum, s) => sum + s.frequencyPerMonth, 0
  );
  const aiCostPerMonth = totalAutoTransactions * assumptions.aiCostPerTransaction;

  const netSavingsPerMonth = dollarSavingsPerMonth - aiCostPerMonth;
  const netSavingsPerYear = netSavingsPerMonth * 12;

  // ROI = implementation cost / net monthly savings
  const implementationCost = assumptions.implementationCostMonths * assumptions.implementationMonthlyCost;
  const roiMonths = netSavingsPerMonth > 0
    ? Math.ceil(implementationCost / netSavingsPerMonth)
    : Infinity;

  return {
    manualHoursPerMonth,
    automatedHoursPerMonth,
    hoursSavedPerMonth,
    fteSaved,
    dollarSavingsPerMonth,
    dollarSavingsPerYear,
    errorReductionPercent,
    roiMonths,
    aiCostPerMonth,
    netSavingsPerMonth,
    netSavingsPerYear,
  };
}

export function calculatePhaseBreakdown(
  baselineSteps: WorkflowStep[],
  automatedSteps: WorkflowStep[],
  assumptions: Assumptions,
  enabledPhases: O2CPhase[]
): PhaseBreakdown[] {
  return O2C_PHASES.filter(p => enabledPhases.includes(p)).map(phase => {
    const baseSteps = baselineSteps.filter(s => s.phase === phase);
    const autoSteps = automatedSteps.filter(s => s.phase === phase);

    const manualHours = baseSteps.reduce((s, st) => s + calculateStepHoursPerMonth(st, 'manual'), 0);
    const automatedHours = autoSteps.reduce((s, st) => s + calculateStepHoursPerMonth(st, 'automated'), 0);

    return {
      phase,
      manualHours,
      automatedHours,
      hoursSaved: manualHours - automatedHours,
      dollarsSaved: (manualHours - automatedHours) * assumptions.hourlyFteCost,
      stepCount: baseSteps.length,
    };
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
