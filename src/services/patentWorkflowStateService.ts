import { supabase } from '../lib/supabase';

interface WorkflowStateRow {
  id: string;
  application_id: string;
  organization_id: string;
  user_id: string;
  current_step: string;
  completed_steps: WorkflowStep[];
  step_data: Record<string, any>;
  status: string;
  error_message?: string;
  progress_percentage: number;
  started_at: string;
  last_updated: string;
  completed_at?: string;
}

export interface WorkflowStep {
  name: string;
  completedAt: string;
  duration: number;
}

export interface WorkflowState {
  id: string;
  applicationId: string;
  organizationId: string;
  userId: string;
  currentStep: string;
  completedSteps: WorkflowStep[];
  stepData: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  errorMessage?: string;
  progressPercentage: number;
  startedAt: string;
  lastUpdated: string;
  completedAt?: string;
}

export const WORKFLOW_STEPS = [
  { id: 'initializing', label: 'Initializing', weight: 5 },
  { id: 'prior_art_search', label: 'Searching Prior Art', weight: 15 },
  { id: 'feature_extraction', label: 'Extracting Features', weight: 10 },
  { id: 'novelty_analysis', label: 'Analyzing Novelty', weight: 15 },
  { id: 'specification_generation', label: 'Generating Specification', weight: 20 },
  { id: 'claims_generation', label: 'Generating Claims', weight: 20 },
  { id: 'drawings_generation', label: 'Generating Drawings', weight: 10 },
  { id: 'finalizing', label: 'Finalizing Application', weight: 5 }
];

export function getStepProgress(currentStep: string): number {
  const stepIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
  if (stepIndex === -1) return 0;

  let progress = 0;
  for (let i = 0; i < stepIndex; i++) {
    progress += WORKFLOW_STEPS[i].weight;
  }
  progress += Math.floor(WORKFLOW_STEPS[stepIndex].weight / 2);

  return progress;
}

export function getStepLabel(stepId: string): string {
  const step = WORKFLOW_STEPS.find(s => s.id === stepId);
  return step?.label || stepId;
}

export async function createWorkflowState(
  applicationId: string,
  organizationId: string,
  userId: string
): Promise<WorkflowState | null> {
  const { data, error } = await (supabase
    .from('patent_workflow_state' as any)
    .insert({
      application_id: applicationId,
      organization_id: organizationId,
      user_id: userId,
      current_step: 'initializing',
      status: 'pending',
      progress_percentage: 0
    })
    .select()
    .single() as Promise<{ data: WorkflowStateRow | null; error: any }>);

  if (error) {
    console.error('Failed to create workflow state:', error);
    return null;
  }

  return data ? mapWorkflowState(data) : null;
}

export async function getWorkflowState(applicationId: string): Promise<WorkflowState | null> {
  const { data, error } = await (supabase
    .from('patent_workflow_state' as any)
    .select('*')
    .eq('application_id', applicationId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle() as Promise<{ data: WorkflowStateRow | null; error: any }>);

  if (error) {
    console.error('Failed to get workflow state:', error);
    return null;
  }

  return data ? mapWorkflowState(data) : null;
}

export async function getIncompleteWorkflow(applicationId: string): Promise<WorkflowState | null> {
  const { data, error } = await (supabase
    .from('patent_workflow_state' as any)
    .select('*')
    .eq('application_id', applicationId)
    .in('status', ['pending', 'in_progress', 'paused', 'failed'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle() as Promise<{ data: WorkflowStateRow | null; error: any }>);

  if (error) {
    console.error('Failed to get incomplete workflow:', error);
    return null;
  }

  return data ? mapWorkflowState(data) : null;
}

export async function updateWorkflowStep(
  workflowId: string,
  step: string,
  stepData?: Record<string, any>
): Promise<boolean> {
  const { data: existing, error: fetchError } = await (supabase
    .from('patent_workflow_state' as any)
    .select('completed_steps, step_data')
    .eq('id', workflowId)
    .single() as Promise<{ data: { completed_steps: WorkflowStep[]; step_data: Record<string, any> } | null; error: any }>);

  if (fetchError || !existing) {
    console.error('Failed to fetch workflow state:', fetchError);
    return false;
  }

  const existingStepData = existing.step_data || {};

  const { error } = await (supabase
    .from('patent_workflow_state' as any)
    .update({
      current_step: step,
      status: 'in_progress',
      progress_percentage: getStepProgress(step),
      step_data: stepData ? { ...existingStepData, [step]: stepData } : existingStepData
    })
    .eq('id', workflowId) as Promise<{ error: any }>);

  if (error) {
    console.error('Failed to update workflow step:', error);
    return false;
  }

  return true;
}

export async function completeWorkflowStep(
  workflowId: string,
  step: string,
  stepData?: Record<string, any>,
  duration?: number
): Promise<boolean> {
  const { data: existing, error: fetchError } = await (supabase
    .from('patent_workflow_state' as any)
    .select('completed_steps, step_data')
    .eq('id', workflowId)
    .single() as Promise<{ data: { completed_steps: WorkflowStep[]; step_data: Record<string, any> } | null; error: any }>);

  if (fetchError || !existing) {
    console.error('Failed to fetch workflow state:', fetchError);
    return false;
  }

  const completedSteps: WorkflowStep[] = existing.completed_steps || [];
  const existingStepData = existing.step_data || {};

  completedSteps.push({
    name: step,
    completedAt: new Date().toISOString(),
    duration: duration || 0
  });

  const stepIndex = WORKFLOW_STEPS.findIndex(s => s.id === step);
  const nextStep = stepIndex < WORKFLOW_STEPS.length - 1
    ? WORKFLOW_STEPS[stepIndex + 1].id
    : 'completed';

  let progress = 0;
  for (let i = 0; i <= stepIndex; i++) {
    progress += WORKFLOW_STEPS[i].weight;
  }

  const { error } = await (supabase
    .from('patent_workflow_state' as any)
    .update({
      current_step: nextStep,
      completed_steps: completedSteps,
      progress_percentage: Math.min(progress, 100),
      step_data: stepData ? { ...existingStepData, [step]: stepData } : existingStepData
    })
    .eq('id', workflowId) as Promise<{ error: any }>);

  if (error) {
    console.error('Failed to complete workflow step:', error);
    return false;
  }

  return true;
}

export async function markWorkflowComplete(workflowId: string): Promise<boolean> {
  const { error } = await (supabase
    .from('patent_workflow_state' as any)
    .update({
      status: 'completed',
      progress_percentage: 100,
      completed_at: new Date().toISOString()
    })
    .eq('id', workflowId) as Promise<{ error: any }>);

  if (error) {
    console.error('Failed to mark workflow complete:', error);
    return false;
  }

  return true;
}

export async function markWorkflowFailed(
  workflowId: string,
  errorMessage: string
): Promise<boolean> {
  const { error } = await (supabase
    .from('patent_workflow_state' as any)
    .update({
      status: 'failed',
      error_message: errorMessage
    })
    .eq('id', workflowId) as Promise<{ error: any }>);

  if (error) {
    console.error('Failed to mark workflow failed:', error);
    return false;
  }

  return true;
}

export async function pauseWorkflow(workflowId: string): Promise<boolean> {
  const { error } = await (supabase
    .from('patent_workflow_state' as any)
    .update({
      status: 'paused'
    })
    .eq('id', workflowId) as Promise<{ error: any }>);

  if (error) {
    console.error('Failed to pause workflow:', error);
    return false;
  }

  return true;
}

export async function resumeWorkflow(workflowId: string): Promise<boolean> {
  const { error } = await (supabase
    .from('patent_workflow_state' as any)
    .update({
      status: 'in_progress'
    })
    .eq('id', workflowId) as Promise<{ error: any }>);

  if (error) {
    console.error('Failed to resume workflow:', error);
    return false;
  }

  return true;
}

export async function getStepData<T>(
  workflowId: string,
  step: string
): Promise<T | null> {
  const { data, error } = await (supabase
    .from('patent_workflow_state' as any)
    .select('step_data')
    .eq('id', workflowId)
    .single() as Promise<{ data: { step_data: Record<string, any> } | null; error: any }>);

  if (error || !data?.step_data) {
    return null;
  }

  return data.step_data[step] as T || null;
}

function mapWorkflowState(data: any): WorkflowState {
  return {
    id: data.id,
    applicationId: data.application_id,
    organizationId: data.organization_id,
    userId: data.user_id,
    currentStep: data.current_step,
    completedSteps: data.completed_steps || [],
    stepData: data.step_data || {},
    status: data.status,
    errorMessage: data.error_message,
    progressPercentage: data.progress_percentage,
    startedAt: data.started_at,
    lastUpdated: data.last_updated,
    completedAt: data.completed_at
  };
}

export function canResumeFromStep(state: WorkflowState, targetStep: string): boolean {
  if (state.status === 'completed') return false;

  const completedStepNames = state.completedSteps.map(s => s.name);
  const targetIndex = WORKFLOW_STEPS.findIndex(s => s.id === targetStep);

  for (let i = 0; i < targetIndex; i++) {
    if (!completedStepNames.includes(WORKFLOW_STEPS[i].id)) {
      return false;
    }
  }

  return true;
}

export function getResumePoint(state: WorkflowState): string {
  if (state.status === 'completed') return 'completed';

  const completedStepNames = state.completedSteps.map(s => s.name);

  for (const step of WORKFLOW_STEPS) {
    if (!completedStepNames.includes(step.id)) {
      return step.id;
    }
  }

  return 'completed';
}
