export type Actor = 'human' | 'ai' | 'hybrid';
export type RiskLevel = 'low' | 'medium' | 'high';
export type WorkflowType = 'manual' | 'automated' | 'hybrid';

export const O2C_PHASES = [
  'order_entry',
  'traffic_billing',
  'invoice',
  'aging',
  'collections',
  'disputes',
  'cash_application',
] as const;

export type O2CPhase = typeof O2C_PHASES[number];

export const PHASE_LABELS: Record<O2CPhase, string> = {
  order_entry: 'Order Entry & Validation',
  traffic_billing: 'Traffic & Billing Handoff',
  invoice: 'Invoice Generation & Delivery',
  aging: 'Aging & Collections Prioritization',
  collections: 'Collections Outreach',
  disputes: 'Dispute Resolution',
  cash_application: 'Cash Application',
};

export const PHASE_COLORS: Record<O2CPhase, string> = {
  order_entry: '#3b82f6',
  traffic_billing: '#8b5cf6',
  invoice: '#06b6d4',
  aging: '#f59e0b',
  collections: '#ef4444',
  disputes: '#ec4899',
  cash_application: '#10b981',
};

export const PHASE_ICONS: Record<O2CPhase, string> = {
  order_entry: 'ClipboardList',
  traffic_billing: 'ArrowRightLeft',
  invoice: 'FileText',
  aging: 'Clock',
  collections: 'Phone',
  disputes: 'Scale',
  cash_application: 'Banknote',
};

export interface WorkflowStep {
  id: string;
  phase: O2CPhase;
  stepOrder: number;
  name: string;
  description: string;
  actor: Actor;
  manualTimeMinutes: number;
  automatedTimeMinutes: number;
  frequencyPerMonth: number;
  errorRateManual: number;
  errorRateAutomated: number;
  aiCapability: string;
  dataSource: string;
  riskLevel: RiskLevel;
  notes: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  workflowType: WorkflowType;
  steps: WorkflowStep[];
}

export interface Assumptions {
  hourlyFteCost: number;
  fteCount: number;
  monthlyOrderVolume: number;
  aiCostPerTransaction: number;
  implementationCostMonths: number;
  implementationMonthlyCost: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  hourlyFteCost: 45,
  fteCount: 3.2,
  monthlyOrderVolume: 4200,
  aiCostPerTransaction: 0.03,
  implementationCostMonths: 4,
  implementationMonthlyCost: 25000,
};

export interface Scenario {
  id: string;
  name: string;
  description: string;
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
}

export interface SavingsResult {
  manualHoursPerMonth: number;
  automatedHoursPerMonth: number;
  hoursSavedPerMonth: number;
  fteSaved: number;
  dollarSavingsPerMonth: number;
  dollarSavingsPerYear: number;
  errorReductionPercent: number;
  roiMonths: number;
  aiCostPerMonth: number;
  netSavingsPerMonth: number;
  netSavingsPerYear: number;
}

export interface PhaseBreakdown {
  phase: O2CPhase;
  manualHours: number;
  automatedHours: number;
  hoursSaved: number;
  dollarsSaved: number;
  stepCount: number;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  phase?: O2CPhase;
  metric?: string;
}
