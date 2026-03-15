import { useState, useCallback } from 'react';
import { WorkflowStep, Assumptions, DEFAULT_ASSUMPTIONS, O2CPhase, O2C_PHASES } from '../types';
import { MANUAL_BASELINE, createAutomatedSteps } from '../data/baselineWorkflow';

export function useWorkflow() {
  const [baselineSteps, setBaselineSteps] = useState<WorkflowStep[]>(MANUAL_BASELINE);
  const [automatedSteps, setAutomatedSteps] = useState<WorkflowStep[]>(
    createAutomatedSteps(MANUAL_BASELINE)
  );
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [enabledPhases, setEnabledPhases] = useState<O2CPhase[]>([...O2C_PHASES]);

  const updateBaselineStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setBaselineSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
  }, []);

  const updateAutomatedStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setAutomatedSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
  }, []);

  const addStep = useCallback((step: WorkflowStep) => {
    setBaselineSteps(prev => [...prev, step]);
    setAutomatedSteps(prev => [...prev, {
      ...step,
      id: `auto-${step.id}`,
      actor: step.riskLevel === 'high' ? 'hybrid' : 'ai',
    }]);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setBaselineSteps(prev => prev.filter(s => s.id !== stepId));
    setAutomatedSteps(prev => prev.filter(s => s.id !== `auto-${stepId}` && s.id !== stepId));
  }, []);

  const togglePhase = useCallback((phase: O2CPhase) => {
    setEnabledPhases(prev =>
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    );
  }, []);

  const updateAssumptions = useCallback((updates: Partial<Assumptions>) => {
    setAssumptions(prev => ({ ...prev, ...updates }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setBaselineSteps(MANUAL_BASELINE);
    setAutomatedSteps(createAutomatedSteps(MANUAL_BASELINE));
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setEnabledPhases([...O2C_PHASES]);
  }, []);

  return {
    baselineSteps,
    automatedSteps,
    assumptions,
    enabledPhases,
    updateBaselineStep,
    updateAutomatedStep,
    addStep,
    removeStep,
    togglePhase,
    updateAssumptions,
    resetToDefaults,
  };
}
