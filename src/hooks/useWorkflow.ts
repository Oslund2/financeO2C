import { useState, useCallback, useEffect, useRef } from 'react';
import { WorkflowStep, Assumptions, DEFAULT_ASSUMPTIONS, O2CPhase, O2C_PHASES } from '../types';
import { MANUAL_BASELINE, createAutomatedSteps } from '../data/baselineWorkflow';
import {
  loadSteps, loadAssumptions,
  saveStep, saveAllSteps, deleteStep as deleteStepDb,
  saveAssumptions,
} from '../lib/persistence';

export function useWorkflow() {
  const [baselineSteps, setBaselineSteps] = useState<WorkflowStep[]>(MANUAL_BASELINE);
  const [automatedSteps, setAutomatedSteps] = useState<WorkflowStep[]>(
    createAutomatedSteps(MANUAL_BASELINE)
  );
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [enabledPhases, setEnabledPhases] = useState<O2CPhase[]>([...O2C_PHASES]);
  const [loaded, setLoaded] = useState(false);
  const initialLoad = useRef(false);

  // Load from Supabase on mount
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;

    (async () => {
      try {
        const [dbSteps, dbAssumptions] = await Promise.all([
          loadSteps(),
          loadAssumptions(),
        ]);

        if (dbSteps && dbSteps.length > 0) {
          setBaselineSteps(dbSteps);
          setAutomatedSteps(createAutomatedSteps(dbSteps));
        }

        if (dbAssumptions) {
          setAssumptions(dbAssumptions);
        }
      } catch {
        // Supabase unavailable — keep defaults
      }
      setLoaded(true);
    })();
  }, []);

  // Seed Supabase with defaults on first load if DB is empty
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const dbSteps = await loadSteps();
      if (!dbSteps || dbSteps.length === 0) {
        await saveAllSteps(MANUAL_BASELINE);
      }
    })();
  }, [loaded]);

  const updateBaselineStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setBaselineSteps(prev => {
      const next = prev.map(s => s.id === stepId ? { ...s, ...updates } : s);
      const updated = next.find(s => s.id === stepId);
      if (updated) saveStep(updated);
      return next;
    });
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
    saveStep(step);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setBaselineSteps(prev => prev.filter(s => s.id !== stepId));
    setAutomatedSteps(prev => prev.filter(s => s.id !== `auto-${stepId}` && s.id !== stepId));
    deleteStepDb(stepId);
  }, []);

  const togglePhase = useCallback((phase: O2CPhase) => {
    setEnabledPhases(prev =>
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    );
  }, []);

  const updateAssumptions = useCallback((updates: Partial<Assumptions>) => {
    setAssumptions(prev => {
      const next = { ...prev, ...updates };
      saveAssumptions(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setBaselineSteps(MANUAL_BASELINE);
    setAutomatedSteps(createAutomatedSteps(MANUAL_BASELINE));
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setEnabledPhases([...O2C_PHASES]);
    saveAllSteps(MANUAL_BASELINE);
    saveAssumptions(DEFAULT_ASSUMPTIONS);
  }, []);

  return {
    baselineSteps,
    automatedSteps,
    assumptions,
    enabledPhases,
    loaded,
    updateBaselineStep,
    updateAutomatedStep,
    addStep,
    removeStep,
    togglePhase,
    updateAssumptions,
    resetToDefaults,
  };
}
