import { useState } from 'react';
import { Plus, Eye, EyeOff, LayoutGrid, List, ArrowLeft } from 'lucide-react';
import { WorkflowStep, Assumptions, O2CPhase, O2C_PHASES, PHASE_LABELS, PHASE_COLORS } from '../types';
import { calculateStepHoursPerMonth } from '../lib/calculations';
import { WorkflowStepCard } from './WorkflowStepCard';
import { WorkflowStepEditor } from './WorkflowStepEditor';
import { View } from './Layout';

interface WorkflowMapProps {
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  onEditStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
  onAddStep: (step: WorkflowStep) => void;
  onRemoveStep: (stepId: string) => void;
  enabledPhases: O2CPhase[];
  onTogglePhase: (phase: O2CPhase) => void;
  assumptions: Assumptions;
  onNavigate: (view: View) => void;
}

type ViewMode = 'comparison' | 'manual' | 'automated';

export function WorkflowMap({
  baselineSteps,
  automatedSteps,
  onEditStep,
  onAddStep,
  onRemoveStep,
  enabledPhases,
  onTogglePhase,
  assumptions,
  onNavigate,
}: WorkflowMapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison');
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [layout, setLayout] = useState<'phase' | 'list'>('phase');

  const handleEdit = (step: WorkflowStep) => {
    setEditingStep(step);
  };

  const handleSaveEdit = (updated: WorkflowStep) => {
    onEditStep(updated.id, updated);
    setEditingStep(null);
  };

  const handleSaveNew = (step: WorkflowStep) => {
    onAddStep(step);
    setAddingStep(false);
  };

  const handleApplyAIEstimate = (stepId: string, manualTime: number, autoTime: number) => {
    onEditStep(stepId, { manualTimeMinutes: manualTime, automatedTimeMinutes: autoTime });
  };

  const stepsForPhase = (phase: O2CPhase) =>
    baselineSteps.filter(s => s.phase === phase).sort((a, b) => a.stepOrder - b.stepOrder);

  const findAutoStep = (step: WorkflowStep) =>
    automatedSteps.find(a => a.id === `auto-${step.id}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-surface-900">Workflow Map</h1>
          <p className="text-surface-500 mt-1">
            {baselineSteps.length} steps across {O2C_PHASES.length} phases — click any step to edit
          </p>
          {viewMode === 'comparison' && (() => {
            const manualH = baselineSteps.reduce((s, st) => s + calculateStepHoursPerMonth(st, 'manual'), 0);
            const autoH = automatedSteps.reduce((s, st) => s + calculateStepHoursPerMonth(st, 'automated'), 0);
            const pct = manualH > 0 ? ((manualH - autoH) / manualH * 100) : 0;
            return (
              <p className="text-sm font-medium text-emerald-600 mt-1">
                Total: {Math.round(manualH)}h manual/mo → {Math.round(autoH)}h automated/mo ({Math.round(pct)}% reduction)
              </p>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
            {(['comparison', 'manual', 'automated'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === m ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                {m === 'comparison' ? 'Compare' : m === 'manual' ? 'Manual' : 'Automated'}
              </button>
            ))}
          </div>
          {/* Layout toggle */}
          <button
            onClick={() => setLayout(layout === 'phase' ? 'list' : 'phase')}
            className="p-2 rounded-lg border border-surface-200 hover:bg-surface-50 text-surface-500"
            title={layout === 'phase' ? 'List view' : 'Phase view'}
          >
            {layout === 'phase' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
          {/* Add step */}
          <button onClick={() => setAddingStep(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Step
          </button>
        </div>
      </div>

      {/* Phase toggles */}
      <div className="flex flex-wrap gap-2">
        {O2C_PHASES.map(phase => {
          const enabled = enabledPhases.includes(phase);
          const count = stepsForPhase(phase).length;
          return (
            <button
              key={phase}
              onClick={() => onTogglePhase(phase)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                enabled
                  ? 'text-white shadow-sm'
                  : 'bg-surface-100 text-surface-400'
              }`}
              style={enabled ? { backgroundColor: PHASE_COLORS[phase] } : undefined}
            >
              {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {PHASE_LABELS[phase]}
              <span className={`text-xs ${enabled ? 'opacity-75' : ''}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Steps grid by phase */}
      {layout === 'phase' ? (
        <div className="space-y-8">
          {O2C_PHASES.filter(p => enabledPhases.includes(p)).map(phase => {
            const steps = stepsForPhase(phase);
            if (steps.length === 0) return null;
            return (
              <div key={phase}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PHASE_COLORS[phase] }}
                  />
                  <h2 className="font-semibold text-surface-900">{PHASE_LABELS[phase]}</h2>
                  <span className="text-xs text-surface-400">{steps.length} steps</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {steps.map(step => (
                    <WorkflowStepCard
                      key={step.id}
                      step={step}
                      automatedStep={findAutoStep(step)}
                      onEdit={handleEdit}
                      onDelete={onRemoveStep}
                      mode={viewMode}
                      assumptions={assumptions}
                      onApplyAIEstimate={handleApplyAIEstimate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {baselineSteps
            .filter(s => enabledPhases.includes(s.phase))
            .sort((a, b) => {
              const phaseOrder = O2C_PHASES.indexOf(a.phase) - O2C_PHASES.indexOf(b.phase);
              return phaseOrder !== 0 ? phaseOrder : a.stepOrder - b.stepOrder;
            })
            .map(step => (
              <WorkflowStepCard
                key={step.id}
                step={step}
                automatedStep={findAutoStep(step)}
                onEdit={handleEdit}
                onDelete={onRemoveStep}
                mode={viewMode}
                assumptions={assumptions}
                onApplyAIEstimate={handleApplyAIEstimate}
              />
            ))}
        </div>
      )}

      {/* Editor modals */}
      {editingStep && (
        <WorkflowStepEditor
          step={editingStep}
          onSave={handleSaveEdit}
          onClose={() => setEditingStep(null)}
        />
      )}
      {addingStep && (
        <WorkflowStepEditor
          step={null}
          isNew
          onSave={handleSaveNew}
          onClose={() => setAddingStep(false)}
        />
      )}
    </div>
  );
}
