import { useState } from 'react';
import { User, Bot, Users, Clock, AlertTriangle, Pencil, Trash2, ChevronDown, ChevronUp, Sparkles, Database } from 'lucide-react';
import { WorkflowStep, Assumptions, Actor, PHASE_LABELS, PHASE_COLORS } from '../types';
import { formatNumber } from '../lib/calculations';
import { AIStepAnalyzer } from './AIStepAnalyzer';

interface WorkflowStepCardProps {
  step: WorkflowStep;
  automatedStep?: WorkflowStep;
  onEdit: (step: WorkflowStep) => void;
  onDelete: (stepId: string) => void;
  mode: 'manual' | 'automated' | 'comparison';
  assumptions?: Assumptions;
  onApplyAIEstimate?: (stepId: string, manualTime: number, autoTime: number) => void;
}

function ActorBadge({ actor }: { actor: Actor }) {
  if (actor === 'human') return <span className="badge-human"><User className="w-3 h-3" /> Human</span>;
  if (actor === 'ai') return <span className="badge-ai"><Bot className="w-3 h-3" /> AI</span>;
  return <span className="badge-hybrid"><Users className="w-3 h-3" /> Hybrid</span>;
}

export function WorkflowStepCard({ step, automatedStep, onEdit, onDelete, mode, assumptions, onApplyAIEstimate }: WorkflowStepCardProps) {
  const [expanded, setExpanded] = useState(false);

  const manualHoursMonth = (step.manualTimeMinutes * step.frequencyPerMonth) / 60;
  const autoHoursMonth = automatedStep
    ? (automatedStep.automatedTimeMinutes * automatedStep.frequencyPerMonth) / 60
    : 0;
  const hoursSaved = manualHoursMonth - autoHoursMonth;
  const pctSaved = manualHoursMonth > 0 ? (hoursSaved / manualHoursMonth) * 100 : 0;

  return (
    <div className="card-hover p-4 group">
      <div className="flex items-start gap-3">
        {/* Phase color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: PHASE_COLORS[step.phase] }}
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-surface-900 text-sm">{step.name}</h4>
              <p className="text-xs text-surface-400 mt-0.5">{PHASE_LABELS[step.phase]}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {mode === 'comparison' && automatedStep && (
                <ActorBadge actor={automatedStep.actor} />
              )}
              {mode === 'manual' && <ActorBadge actor="human" />}
              {mode === 'automated' && automatedStep && <ActorBadge actor={automatedStep.actor} />}
            </div>
          </div>

          {/* Time comparison bar */}
          {mode === 'comparison' && automatedStep && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-surface-500 w-16">Manual</span>
                <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: '100%' }} />
                </div>
                <span className="text-surface-600 font-medium w-14 text-right">
                  {formatNumber(manualHoursMonth, 1)}h/mo
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-surface-500 w-16">Auto</span>
                <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${manualHoursMonth > 0 ? (autoHoursMonth / manualHoursMonth) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-emerald-600 font-medium w-14 text-right">
                  {formatNumber(autoHoursMonth, 1)}h/mo
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-emerald-600 font-semibold">
                  {formatNumber(pctSaved, 0)}% time reduction
                </span>
                <span className="text-surface-500">
                  {formatNumber(hoursSaved, 1)}h saved/mo
                </span>
              </div>
            </div>
          )}

          {/* Single mode time */}
          {mode !== 'comparison' && (
            <div className="mt-2 flex items-center gap-3 text-xs text-surface-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {mode === 'manual' ? step.manualTimeMinutes : step.automatedTimeMinutes}min each
              </span>
              <span>{step.frequencyPerMonth.toLocaleString()}/mo</span>
              <span className="font-medium text-surface-700">
                {formatNumber(mode === 'manual' ? manualHoursMonth : autoHoursMonth, 1)}h/mo
              </span>
            </div>
          )}

          {/* Expandable details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-surface-100 space-y-2 text-xs">
              <p className="text-surface-600">{step.description}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-surface-400">Manual time:</span>{' '}
                  <span className="font-medium">{step.manualTimeMinutes} min</span>
                </div>
                <div>
                  <span className="text-surface-400">Automated time:</span>{' '}
                  <span className="font-medium">{step.automatedTimeMinutes} min</span>
                </div>
                <div>
                  <span className="text-surface-400">Frequency:</span>{' '}
                  <span className="font-medium">{step.frequencyPerMonth.toLocaleString()}/mo</span>
                </div>
                <div>
                  <span className="text-surface-400">Risk:</span>{' '}
                  <span className={`font-medium ${
                    step.riskLevel === 'high' ? 'text-red-600' :
                    step.riskLevel === 'medium' ? 'text-amber-600' : 'text-green-600'
                  }`}>{step.riskLevel}</span>
                </div>
                <div>
                  <span className="text-surface-400">Error (manual):</span>{' '}
                  <span className="font-medium">{(step.errorRateManual * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-surface-400">Error (auto):</span>{' '}
                  <span className="font-medium text-emerald-600">{(step.errorRateAutomated * 100).toFixed(1)}%</span>
                </div>
              </div>
              {step.aiCapability && (
                <div className="flex items-start gap-1.5 mt-1">
                  <Sparkles className="w-3 h-3 text-brand-500 mt-0.5 flex-shrink-0" />
                  <span className="text-brand-600">{step.aiCapability}</span>
                </div>
              )}
              {step.dataSource && (
                <div className="flex items-start gap-1.5">
                  <Database className="w-3 h-3 text-surface-400 mt-0.5 flex-shrink-0" />
                  <span className="text-surface-500">{step.dataSource}</span>
                </div>
              )}
              {step.notes && (
                <p className="text-surface-500 italic">{step.notes}</p>
              )}
              {assumptions && (
                <div className="mt-3 pt-3 border-t border-surface-100">
                  <AIStepAnalyzer
                    step={step}
                    assumptions={assumptions}
                    onApplyEstimate={onApplyAIEstimate
                      ? (manual, auto) => onApplyAIEstimate(step.id, manual, auto)
                      : undefined
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-surface-400 hover:text-surface-600 flex items-center gap-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Less' : 'Details'}
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(step)}
            className="p-1.5 rounded-md hover:bg-surface-100 text-surface-400 hover:text-brand-600 transition-colors"
            title="Edit step"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(step.id)}
            className="p-1.5 rounded-md hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
            title="Delete step"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
