import { useState, useEffect } from 'react';
import {
  Target, ChevronDown, ChevronUp, Loader2, Save, Plus,
  Trash2, CheckCircle, ToggleLeft, ToggleRight, X, Link2,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  getSeriesMission,
  createSeriesMission,
  updateSeriesMission,
  getWorkspaceMission,
} from '../services/missionService';
import type { SeriesMission, WorkspaceMission, TargetSubAudience } from '../types/mission';

interface SeriesMissionPanelProps {
  seriesId: string;
}

export function SeriesMissionPanel({ seriesId }: SeriesMissionPanelProps) {
  const { currentOrganization } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const [mission, setMission] = useState<SeriesMission | null>(null);
  const [workspaceMission, setWorkspaceMission] = useState<WorkspaceMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [form, setForm] = useState({
    sub_mission: '',
    tone_overrides: '',
    content_focus: [] as string[],
    series_rules: '',
    inherits_workspace_mission: true,
    target_sub_audience: {} as TargetSubAudience,
  });

  const [newFocus, setNewFocus] = useState('');

  useEffect(() => {
    loadData();
  }, [seriesId, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const [sm, wm] = await Promise.all([
        getSeriesMission(seriesId),
        getWorkspaceMission(currentOrganization.id),
      ]);
      setMission(sm);
      setWorkspaceMission(wm);

      if (sm) {
        setForm({
          sub_mission: sm.sub_mission || '',
          tone_overrides: sm.tone_overrides || '',
          content_focus: [...(sm.content_focus || [])],
          series_rules: sm.series_rules || '',
          inherits_workspace_mission: sm.inherits_workspace_mission,
          target_sub_audience: { ...(sm.target_sub_audience || {}) },
        });
      }
    } catch (err) {
      console.error('Error loading series mission:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addFocus = () => {
    const trimmed = newFocus.trim();
    if (trimmed && !form.content_focus.includes(trimmed)) {
      updateForm('content_focus', [...form.content_focus, trimmed]);
      setNewFocus('');
    }
  };

  const removeFocus = (index: number) => {
    updateForm('content_focus', form.content_focus.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!currentOrganization) return;
    setSaving(true);

    try {
      const payload = {
        sub_mission: form.sub_mission,
        tone_overrides: form.tone_overrides,
        content_focus: form.content_focus,
        series_rules: form.series_rules,
        inherits_workspace_mission: form.inherits_workspace_mission,
        target_sub_audience: form.target_sub_audience,
        workspace_mission_id: form.inherits_workspace_mission ? workspaceMission?.id || null : null,
      };

      let result;
      if (mission) {
        result = await updateSeriesMission(mission.id, payload);
      } else {
        result = await createSeriesMission({
          series_id: seriesId,
          ...payload,
        });
      }

      if (result) {
        setMission(result);
        setHasChanges(false);
        showSuccess('Series mission saved', 'The series mission has been updated.');
      } else {
        showError('Save failed', 'Could not save the series mission.');
      }
    } catch (err) {
      console.error('Error saving series mission:', err);
      showError('Save failed', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 flex items-center justify-center gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading series mission...</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-sky-500" />
          <span className="text-sm font-medium text-gray-700">Series Mission</span>
          {mission && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
              Configured
            </span>
          )}
          {hasChanges && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              Unsaved
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {workspaceMission && (
            <div className="flex items-center justify-between bg-sky-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-500" />
                <span className="text-xs text-sky-700">Inherit workspace mission</span>
              </div>
              <button
                onClick={() => updateForm('inherits_workspace_mission', !form.inherits_workspace_mission)}
                className="flex-shrink-0"
              >
                {form.inherits_workspace_mission ? (
                  <ToggleRight className="w-5 h-5 text-sky-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-gray-300" />
                )}
              </button>
            </div>
          )}

          {form.inherits_workspace_mission && workspaceMission && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inherited Mission</span>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {workspaceMission.mission_statement}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Series Sub-Mission</label>
            <textarea
              value={form.sub_mission}
              onChange={e => updateForm('sub_mission', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
              placeholder="What is this series specifically about?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tone Overrides</label>
            <input
              type="text"
              value={form.tone_overrides}
              onChange={e => updateForm('tone_overrides', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="e.g., Comedic with heart, competition-driven excitement"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Setting</label>
              <input
                type="text"
                value={form.target_sub_audience.setting || ''}
                onChange={e => updateForm('target_sub_audience', { ...form.target_sub_audience, setting: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="e.g., school, competition venues"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Narrative Style</label>
              <input
                type="text"
                value={form.target_sub_audience.narrative_style || ''}
                onChange={e => updateForm('target_sub_audience', { ...form.target_sub_audience, narrative_style: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="e.g., competition-driven comedy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content Focus Areas</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.content_focus.map((focus, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full text-xs font-medium"
                >
                  {focus}
                  <button onClick={() => removeFocus(i)} className="hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFocus}
                onChange={e => setNewFocus(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFocus())}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Add a focus area..."
              />
              <button
                onClick={addFocus}
                disabled={!newFocus.trim()}
                className="flex items-center px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Series Rules</label>
            <textarea
              value={form.series_rules}
              onChange={e => updateForm('series_rules', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none font-mono text-xs"
              placeholder="Character-specific rules, animation notes, etc."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Series Mission'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
