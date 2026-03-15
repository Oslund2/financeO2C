import { supabase } from './supabase';
import { WorkflowStep, Assumptions, DEFAULT_ASSUMPTIONS, O2CPhase, Actor, RiskLevel } from '../types';

// ---- Workflow Steps ----

interface StepRow {
  id: string;
  phase: string;
  step_order: number;
  name: string;
  description: string;
  actor: string;
  manual_time_minutes: number;
  automated_time_minutes: number;
  frequency_per_month: number;
  error_rate_manual: number;
  error_rate_automated: number;
  ai_capability: string;
  data_source: string;
  risk_level: string;
  notes: string;
}

function rowToStep(row: StepRow): WorkflowStep {
  return {
    id: row.id,
    phase: row.phase as O2CPhase,
    stepOrder: row.step_order,
    name: row.name,
    description: row.description || '',
    actor: (row.actor || 'human') as Actor,
    manualTimeMinutes: Number(row.manual_time_minutes),
    automatedTimeMinutes: Number(row.automated_time_minutes),
    frequencyPerMonth: Number(row.frequency_per_month),
    errorRateManual: Number(row.error_rate_manual),
    errorRateAutomated: Number(row.error_rate_automated),
    aiCapability: row.ai_capability || '',
    dataSource: row.data_source || '',
    riskLevel: (row.risk_level || 'medium') as RiskLevel,
    notes: row.notes || '',
  };
}

function stepToRow(step: WorkflowStep): Omit<StepRow, 'created_at' | 'updated_at'> {
  return {
    id: step.id,
    phase: step.phase,
    step_order: step.stepOrder,
    name: step.name,
    description: step.description,
    actor: step.actor,
    manual_time_minutes: step.manualTimeMinutes,
    automated_time_minutes: step.automatedTimeMinutes,
    frequency_per_month: step.frequencyPerMonth,
    error_rate_manual: step.errorRateManual,
    error_rate_automated: step.errorRateAutomated,
    ai_capability: step.aiCapability || '',
    data_source: step.dataSource || '',
    risk_level: step.riskLevel,
    notes: step.notes || '',
  };
}

export async function loadSteps(): Promise<WorkflowStep[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('workflow_steps')
    .select('*')
    .order('step_order', { ascending: true });
  if (error || !data || data.length === 0) return null;
  return data.map(rowToStep);
}

export async function saveStep(step: WorkflowStep): Promise<boolean> {
  if (!supabase) return false;
  const row = stepToRow(step);
  const { error } = await supabase
    .from('workflow_steps')
    .upsert({ ...row, updated_at: new Date().toISOString() });
  return !error;
}

export async function deleteStep(stepId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('workflow_steps')
    .delete()
    .eq('id', stepId);
  return !error;
}

export async function saveAllSteps(steps: WorkflowStep[]): Promise<boolean> {
  if (!supabase) return false;
  const rows = steps.map(s => ({ ...stepToRow(s), updated_at: new Date().toISOString() }));
  const { error } = await supabase
    .from('workflow_steps')
    .upsert(rows);
  return !error;
}

// ---- Assumptions ----

interface AssumptionsRow {
  hourly_fte_cost: number;
  fte_count: number;
  monthly_order_volume: number;
  ai_cost_per_transaction: number;
  implementation_cost_months: number;
  implementation_monthly_cost: number;
}

function rowToAssumptions(row: AssumptionsRow): Assumptions {
  return {
    hourlyFteCost: Number(row.hourly_fte_cost),
    fteCount: Number(row.fte_count),
    monthlyOrderVolume: Number(row.monthly_order_volume),
    aiCostPerTransaction: Number(row.ai_cost_per_transaction),
    implementationCostMonths: Number(row.implementation_cost_months),
    implementationMonthlyCost: Number(row.implementation_monthly_cost),
  };
}

export async function loadAssumptions(): Promise<Assumptions | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_assumptions')
    .select('*')
    .eq('id', 1)
    .single();
  if (error || !data) return null;
  return rowToAssumptions(data);
}

export async function saveAssumptions(assumptions: Assumptions): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('user_assumptions')
    .upsert({
      id: 1,
      hourly_fte_cost: assumptions.hourlyFteCost,
      fte_count: assumptions.fteCount,
      monthly_order_volume: assumptions.monthlyOrderVolume,
      ai_cost_per_transaction: assumptions.aiCostPerTransaction,
      implementation_cost_months: assumptions.implementationCostMonths,
      implementation_monthly_cost: assumptions.implementationMonthlyCost,
      updated_at: new Date().toISOString(),
    });
  return !error;
}
