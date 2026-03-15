import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { WorkflowStep, O2CPhase, O2C_PHASES, PHASE_LABELS, Actor, RiskLevel } from '../types';

interface WorkflowStepEditorProps {
  step: WorkflowStep | null;
  isNew?: boolean;
  onSave: (step: WorkflowStep) => void;
  onClose: () => void;
}

export function WorkflowStepEditor({ step, isNew, onSave, onClose }: WorkflowStepEditorProps) {
  const [form, setForm] = useState<WorkflowStep>(
    step || {
      id: `step-custom-${Date.now()}`,
      phase: 'order_entry',
      stepOrder: 99,
      name: '',
      description: '',
      actor: 'human',
      manualTimeMinutes: 10,
      automatedTimeMinutes: 1,
      frequencyPerMonth: 100,
      errorRateManual: 0.02,
      errorRateAutomated: 0.002,
      aiCapability: '',
      dataSource: '',
      riskLevel: 'medium',
      notes: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <h3 className="font-semibold text-surface-900">
            {isNew ? 'Add Workflow Step' : 'Edit Workflow Step'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Step Name</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Validate order against rate card"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Phase</label>
            <select
              className="input"
              value={form.phase}
              onChange={e => setForm({ ...form, phase: e.target.value as O2CPhase })}
            >
              {O2C_PHASES.map(p => (
                <option key={p} value={p}>{PHASE_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What does this step involve?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Manual Time (min)</label>
              <input
                type="number"
                className="input"
                value={form.manualTimeMinutes}
                onChange={e => setForm({ ...form, manualTimeMinutes: Number(e.target.value) })}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Automated Time (min)</label>
              <input
                type="number"
                className="input"
                value={form.automatedTimeMinutes}
                onChange={e => setForm({ ...form, automatedTimeMinutes: Number(e.target.value) })}
                min={0}
                step={0.1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Frequency / Month</label>
              <input
                type="number"
                className="input"
                value={form.frequencyPerMonth}
                onChange={e => setForm({ ...form, frequencyPerMonth: Number(e.target.value) })}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Risk Level</label>
              <select
                className="input"
                value={form.riskLevel}
                onChange={e => setForm({ ...form, riskLevel: e.target.value as RiskLevel })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Error Rate (Manual)</label>
              <input
                type="number"
                className="input"
                value={(form.errorRateManual * 100).toFixed(1)}
                onChange={e => setForm({ ...form, errorRateManual: Number(e.target.value) / 100 })}
                min={0}
                max={100}
                step={0.1}
              />
              <span className="text-xs text-surface-400">as percentage</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Error Rate (Automated)</label>
              <input
                type="number"
                className="input"
                value={(form.errorRateAutomated * 100).toFixed(1)}
                onChange={e => setForm({ ...form, errorRateAutomated: Number(e.target.value) / 100 })}
                min={0}
                max={100}
                step={0.1}
              />
              <span className="text-xs text-surface-400">as percentage</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">AI Capability</label>
            <input
              className="input"
              value={form.aiCapability}
              onChange={e => setForm({ ...form, aiCapability: e.target.value })}
              placeholder="e.g., Probabilistic payment matching"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Data Source</label>
            <input
              className="input"
              value={form.dataSource}
              onChange={e => setForm({ ...form, dataSource: e.target.value })}
              placeholder="e.g., Snowflake: orders, rate_cards"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional context for the finance team"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isNew ? 'Add Step' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
