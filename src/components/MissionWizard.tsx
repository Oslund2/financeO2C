import { useState } from 'react';
import {
  X, ChevronRight, ChevronLeft, Target, Users, Megaphone,
  Shield, Palette, CheckCircle, Loader2, AlertCircle, Plus,
  Trash2, Save,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  createWorkspaceMission,
  updateWorkspaceMission,
} from '../services/missionService';
import type { WorkspaceMission, TargetAudience } from '../types/mission';

interface MissionWizardProps {
  mission: WorkspaceMission | null;
  onClose: () => void;
}

type WizardStep = 'style' | 'mission' | 'audience' | 'voice' | 'guardrails' | 'review';

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'style', label: 'Visual Style', icon: <Palette className="w-4 h-4" /> },
  { key: 'mission', label: 'Mission', icon: <Target className="w-4 h-4" /> },
  { key: 'audience', label: 'Audience', icon: <Users className="w-4 h-4" /> },
  { key: 'voice', label: 'Brand Voice', icon: <Megaphone className="w-4 h-4" /> },
  { key: 'guardrails', label: 'Guardrails', icon: <Shield className="w-4 h-4" /> },
  { key: 'review', label: 'Review', icon: <CheckCircle className="w-4 h-4" /> },
];

const VISUAL_STYLES = [
  { value: 'claymation', label: 'Claymation', desc: 'Clay/stop-motion animation aesthetic' },
  { value: 'photoreal', label: 'Photoreal', desc: 'Photorealistic rendering style' },
  { value: 'documentary', label: 'Documentary', desc: 'Documentary-style visual approach' },
  { value: '2d_animation', label: '2D Animation', desc: 'Traditional 2D animated style' },
  { value: '3d_animation', label: '3D Animation', desc: 'Modern 3D rendered animation' },
  { value: 'general', label: 'General', desc: 'No specific visual style preference' },
];

export function MissionWizard({ mission, onClose }: MissionWizardProps) {
  const { currentOrganization } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const [currentStep, setCurrentStep] = useState<WizardStep>('style');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    visual_rendering_style: mission?.visual_rendering_style || 'general',
    mission_statement: mission?.mission_statement || '',
    target_audience: { ...(mission?.target_audience || {}) } as TargetAudience,
    content_goals: [...(mission?.content_goals || [])],
    brand_voice: mission?.brand_voice || '',
    content_guardrails: mission?.content_guardrails || '',
    mission_status: (mission?.mission_status || 'draft') as 'draft' | 'active' | 'archived',
  });

  const [newGoal, setNewGoal] = useState('');

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].key);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].key);
    }
  };

  const addGoal = () => {
    const trimmed = newGoal.trim();
    if (trimmed && !form.content_goals.includes(trimmed)) {
      setForm(prev => ({ ...prev, content_goals: [...prev.content_goals, trimmed] }));
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setForm(prev => ({ ...prev, content_goals: prev.content_goals.filter((_, i) => i !== index) }));
  };

  const updateAudience = (key: string, value: string | string[]) => {
    setForm(prev => ({
      ...prev,
      target_audience: { ...prev.target_audience, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!currentOrganization) return;
    setSaving(true);

    try {
      const payload = {
        mission_statement: form.mission_statement,
        target_audience: form.target_audience,
        content_goals: form.content_goals,
        brand_voice: form.brand_voice,
        content_guardrails: form.content_guardrails,
        visual_rendering_style: form.visual_rendering_style,
        mission_status: form.mission_status,
      };

      let result;
      if (mission) {
        result = await updateWorkspaceMission(mission.id, payload);
      } else {
        result = await createWorkspaceMission({
          organization_id: currentOrganization.id,
          ...payload,
        });
      }

      if (result) {
        showSuccess('Mission saved', mission ? 'Your workspace mission has been updated.' : 'Your workspace mission has been created.');
        onClose();
      } else {
        showError('Save failed', 'Could not save the mission. Please try again.');
      }
    } catch (err) {
      console.error('Error saving mission:', err);
      showError('Save failed', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-sky-50 to-blue-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {mission ? 'Edit Mission' : 'Create Mission'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].label}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'style' && (
            <StyleStep
              value={form.visual_rendering_style}
              onChange={val => setForm(prev => ({ ...prev, visual_rendering_style: val }))}
            />
          )}
          {currentStep === 'mission' && (
            <MissionStep
              missionStatement={form.mission_statement}
              contentGoals={form.content_goals}
              newGoal={newGoal}
              onMissionChange={val => setForm(prev => ({ ...prev, mission_statement: val }))}
              onNewGoalChange={setNewGoal}
              onAddGoal={addGoal}
              onRemoveGoal={removeGoal}
            />
          )}
          {currentStep === 'audience' && (
            <AudienceStep
              audience={form.target_audience}
              onUpdate={updateAudience}
            />
          )}
          {currentStep === 'voice' && (
            <VoiceStep
              value={form.brand_voice}
              onChange={val => setForm(prev => ({ ...prev, brand_voice: val }))}
            />
          )}
          {currentStep === 'guardrails' && (
            <GuardrailsStep
              value={form.content_guardrails}
              onChange={val => setForm(prev => ({ ...prev, content_guardrails: val }))}
            />
          )}
          {currentStep === 'review' && (
            <ReviewStep
              form={form}
              onStatusChange={val => setForm(prev => ({ ...prev, mission_status: val }))}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 'review' ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Mission'}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: typeof STEPS;
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="px-6 py-3 border-b border-gray-100 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {steps.map((step, i) => {
          const isActive = step.key === currentStep;
          const isCompleted = i < currentIndex;
          return (
            <button
              key={step.key}
              onClick={() => onStepClick(step.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${isActive ? 'bg-sky-100 text-sky-700' : ''}
                ${isCompleted ? 'text-emerald-600 hover:bg-emerald-50' : ''}
                ${!isActive && !isCompleted ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : ''}
              `}
            >
              {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StyleStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Visual Rendering Style</h3>
        <p className="text-sm text-gray-500 mt-1">
          Choose the primary visual style for your content. This influences prompt generation and production settings.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {VISUAL_STYLES.map(style => (
          <button
            key={style.value}
            onClick={() => onChange(style.value)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              value === style.value
                ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Palette className={`w-4 h-4 ${value === style.value ? 'text-sky-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${value === style.value ? 'text-sky-900' : 'text-gray-700'}`}>
                {style.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{style.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MissionStep({
  missionStatement,
  contentGoals,
  newGoal,
  onMissionChange,
  onNewGoalChange,
  onAddGoal,
  onRemoveGoal,
}: {
  missionStatement: string;
  contentGoals: string[];
  newGoal: string;
  onMissionChange: (v: string) => void;
  onNewGoalChange: (v: string) => void;
  onAddGoal: () => void;
  onRemoveGoal: (i: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Mission Statement</h3>
        <p className="text-sm text-gray-500 mt-1">
          Describe what your workspace produces and why. This guides all AI content generation.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Mission Statement</label>
        <textarea
          value={missionStatement}
          onChange={e => onMissionChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
          placeholder="e.g., Educational children's entertainment centered around spelling bees..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Content Goals</label>
        <div className="space-y-2">
          {contentGoals.map((goal, i) => (
            <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700">{goal}</span>
              <button onClick={() => onRemoveGoal(i)} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newGoal}
            onChange={e => onNewGoalChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAddGoal())}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            placeholder="Add a content goal..."
          />
          <button
            onClick={onAddGoal}
            disabled={!newGoal.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AudienceStep({
  audience,
  onUpdate,
}: {
  audience: TargetAudience;
  onUpdate: (key: string, value: string | string[]) => void;
}) {
  const [newInterest, setNewInterest] = useState('');

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed) {
      const current = audience.interests || [];
      if (!current.includes(trimmed)) {
        onUpdate('interests', [...current, trimmed]);
      }
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    onUpdate('interests', (audience.interests || []).filter(i => i !== interest));
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Target Audience</h3>
        <p className="text-sm text-gray-500 mt-1">
          Define who your content is for. This shapes tone, vocabulary, and content complexity.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Age Range</label>
          <input
            type="text"
            value={audience.age_range || ''}
            onChange={e => onUpdate('age_range', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            placeholder="e.g., 6-10 years"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Demographics</label>
          <input
            type="text"
            value={audience.demographics || ''}
            onChange={e => onUpdate('demographics', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            placeholder="e.g., children and families"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Viewing Context</label>
          <input
            type="text"
            value={audience.viewing_context || ''}
            onChange={e => onUpdate('viewing_context', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            placeholder="e.g., streaming platform, TV network, YouTube"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Interests & Themes</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(audience.interests || []).map(interest => (
            <span
              key={interest}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium"
            >
              {interest}
              <button onClick={() => removeInterest(interest)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newInterest}
            onChange={e => setNewInterest(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            placeholder="Add an interest..."
          />
          <button
            onClick={addInterest}
            disabled={!newInterest.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function VoiceStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Brand Voice</h3>
        <p className="text-sm text-gray-500 mt-1">
          Describe the tone, personality, and style of your content's voice. AI will follow these guidelines.
        </p>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={8}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
        placeholder="e.g., Educational and entertaining, clever and witty, age-appropriate humor..."
      />
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Be specific about what your voice IS and IS NOT. For example: "Smart without being preachy,
            funny without being mean-spirited" gives the AI clear boundaries.
          </p>
        </div>
      </div>
    </div>
  );
}

function GuardrailsStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Content Guardrails</h3>
        <p className="text-sm text-gray-500 mt-1">
          Define strict rules that must be followed in all generated content. Include character naming rules,
          content restrictions, and production requirements.
        </p>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={10}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none font-mono"
        placeholder={"CRITICAL CHARACTER NAMING:\n- Character names...\n\nCONTENT RULES:\n- Rule 1...\n- Rule 2..."}
      />
      <div className="bg-red-50 rounded-lg p-3 border border-red-100">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">
            Guardrails are enforced strictly. Use clear headers and bullet points. Include both what TO DO
            and what NOT TO DO. These rules override other instructions when generating content.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  form,
  onStatusChange,
}: {
  form: {
    visual_rendering_style: string;
    mission_statement: string;
    target_audience: TargetAudience;
    content_goals: string[];
    brand_voice: string;
    content_guardrails: string;
    mission_status: 'draft' | 'active' | 'archived';
  };
  onStatusChange: (v: 'draft' | 'active' | 'archived') => void;
}) {
  const filledFields = [
    form.mission_statement.trim(),
    Object.keys(form.target_audience).length > 0,
    form.content_goals.length > 0,
    form.brand_voice.trim(),
    form.content_guardrails.trim(),
    form.visual_rendering_style !== 'general',
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Review & Save</h3>
        <p className="text-sm text-gray-500 mt-1">
          Review your mission configuration before saving. {filledFields}/6 fields configured.
        </p>
      </div>

      <div className="space-y-3">
        <ReviewField
          label="Visual Style"
          filled={form.visual_rendering_style !== 'general'}
          value={form.visual_rendering_style}
        />
        <ReviewField
          label="Mission Statement"
          filled={!!form.mission_statement.trim()}
          value={form.mission_statement ? `${form.mission_statement.substring(0, 120)}...` : ''}
        />
        <ReviewField
          label="Target Audience"
          filled={Object.keys(form.target_audience).length > 0}
          value={form.target_audience.age_range ? `${form.target_audience.age_range} - ${form.target_audience.demographics || ''}` : ''}
        />
        <ReviewField
          label="Content Goals"
          filled={form.content_goals.length > 0}
          value={`${form.content_goals.length} goal${form.content_goals.length !== 1 ? 's' : ''} defined`}
        />
        <ReviewField
          label="Brand Voice"
          filled={!!form.brand_voice.trim()}
          value={form.brand_voice ? `${form.brand_voice.substring(0, 120)}...` : ''}
        />
        <ReviewField
          label="Content Guardrails"
          filled={!!form.content_guardrails.trim()}
          value={form.content_guardrails ? `${form.content_guardrails.substring(0, 120)}...` : ''}
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Mission Status</label>
        <div className="flex gap-3">
          {(['draft', 'active'] as const).map(status => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                form.mission_status === status
                  ? status === 'active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {status === 'draft' ? 'Save as Draft' : 'Activate Mission'}
            </button>
          ))}
        </div>
        {form.mission_status === 'active' && (
          <p className="text-xs text-emerald-600 mt-2">
            Active missions influence all AI content generation in this workspace.
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewField({ label, filled, value }: { label: string; filled: boolean; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      {filled ? (
        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {filled && value && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{value}</p>
        )}
        {!filled && (
          <p className="text-xs text-gray-400 mt-0.5 italic">Not configured</p>
        )}
      </div>
    </div>
  );
}
