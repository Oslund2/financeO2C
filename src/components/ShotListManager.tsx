import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit3, RotateCcw, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { regeneratePromptForShot, updatePrompt, validatePrompt } from '../services/veo3PromptService';

interface Shot {
  id: string;
  act_number: number;
  scene_number: number;
  shot_number: number;
  shot_type: string;
  camera_angle: string;
  camera_movement: string;
  duration_seconds: number;
  narrative_description: string;
  technical_description: string;
  characters: string[];
  location: string;
  props: string[];
  status: string;
}

interface ShotPrompt {
  id: string;
  shot_plan_id: string;
  veo3_prompt_text: string;
  negative_prompt: string;
  style_directives: string;
  audio_cues: string;
  character_references: string[];
  location_reference: string;
  prompt_version: number;
  validated: boolean;
}

interface ShotWithPrompt {
  shot: Shot;
  prompt: ShotPrompt | null;
}

interface ShotListManagerProps {
  shotIds: string[];
  organizationId: string;
}

export default function ShotListManager({ shotIds, organizationId }: ShotListManagerProps) {
  const [shots, setShots] = useState<ShotWithPrompt[]>([]);
  const [expandedShots, setExpandedShots] = useState<Set<string>>(new Set());
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadShots();
  }, [shotIds]);

  const loadShots = async () => {
    const { data: shotsData, error: shotsError } = await supabase
      .from('production_shot_plans')
      .select('*')
      .in('id', shotIds)
      .order('shot_number');

    if (shotsError || !shotsData) return;

    const { data: promptsData } = await supabase
      .from('production_shot_prompts')
      .select('*')
      .in('shot_plan_id', shotIds);

    const promptsMap = new Map(promptsData?.map(p => [p.shot_plan_id, p]) || []);

    const combined = shotsData.map(shot => ({
      shot,
      prompt: promptsMap.get(shot.id) || null
    }));

    setShots(combined);
  };

  const toggleExpanded = (shotId: string) => {
    const newExpanded = new Set(expandedShots);
    if (newExpanded.has(shotId)) {
      newExpanded.delete(shotId);
    } else {
      newExpanded.add(shotId);
    }
    setExpandedShots(newExpanded);
  };

  const handleEditPrompt = (shotId: string, currentText: string) => {
    setEditingPrompt(shotId);
    setEditedText(currentText);
  };

  const handleSavePrompt = async (shotId: string) => {
    setLoading(true);
    try {
      await updatePrompt(shotId, { veo3_prompt_text: editedText });
      await loadShots();
      setEditingPrompt(null);
    } catch (err) {
      console.error('Error saving prompt:', err);
      alert('Failed to save prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneratePrompt = async (shotId: string) => {
    if (!confirm('Regenerate AI prompt? This will replace the current prompt.')) return;

    setLoading(true);
    try {
      await regeneratePromptForShot(shotId, organizationId);
      await loadShots();
    } catch (err) {
      console.error('Error regenerating prompt:', err);
      alert('Failed to regenerate prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePrompt = async (shotId: string, isValid: boolean) => {
    setLoading(true);
    try {
      await validatePrompt(shotId, isValid, []);
      await loadShots();
    } catch (err) {
      console.error('Error validating prompt:', err);
      alert('Failed to validate prompt');
    } finally {
      setLoading(false);
    }
  };

  const groupByAct = () => {
    const grouped = new Map<number, ShotWithPrompt[]>();
    shots.forEach(sw => {
      const act = sw.shot.act_number;
      if (!grouped.has(act)) {
        grouped.set(act, []);
      }
      grouped.get(act)!.push(sw);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  };

  const actGroups = groupByAct();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shot List with AI Prompts</h3>
        <div className="text-sm text-gray-600">
          {shots.length} shots | {shots.filter(s => s.prompt?.validated).length} validated
        </div>
      </div>

      {actGroups.map(([actNumber, actShots]) => (
        <div key={actNumber} className="bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">Act {actNumber}</h4>
            <p className="text-sm text-gray-600">{actShots.length} shots</p>
          </div>

          <div className="divide-y divide-gray-200">
            {actShots.map(({ shot, prompt }) => {
              const isExpanded = expandedShots.has(shot.id);
              const isEditing = editingPrompt === shot.id;

              return (
                <div key={shot.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          Shot {shot.shot_number}
                        </span>
                        <span className="text-sm text-gray-600">
                          Scene {shot.scene_number}
                        </span>
                        <span className="text-sm text-gray-600">
                          {shot.duration_seconds}s
                        </span>
                        {prompt?.validated && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Validated
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-900 mb-1">
                        <strong>{shot.shot_type.replace(/_/g, ' ')}</strong> • {shot.camera_angle.replace(/_/g, ' ')} • {shot.camera_movement}
                      </div>
                      <div className="text-sm text-gray-600">
                        {shot.location} {shot.characters.length > 0 && `• ${shot.characters.join(', ')}`}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpanded(shot.id)}
                      className="text-gray-400 hover:text-gray-600 p-2"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Veo 3 Prompt</label>
                          <div className="flex gap-2">
                            {!isEditing && (
                              <>
                                <button
                                  onClick={() => handleEditPrompt(shot.id, prompt?.veo3_prompt_text || '')}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  disabled={loading}
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleRegeneratePrompt(shot.id)}
                                  className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
                                  disabled={loading}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Regenerate
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editedText}
                              onChange={(e) => setEditedText(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono"
                              rows={6}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {editedText.length} characters
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingPrompt(null)}
                                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                  disabled={loading}
                                >
                                  <X className="w-3 h-3 inline mr-1" />
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSavePrompt(shot.id)}
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  disabled={loading}
                                >
                                  <Check className="w-3 h-3 inline mr-1" />
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-900 whitespace-pre-wrap">
                            {prompt?.veo3_prompt_text || 'No prompt generated'}
                          </div>
                        )}
                      </div>

                      {prompt && !isEditing && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Negative Prompt</label>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                              {prompt.negative_prompt}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Style Directives</label>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                              {prompt.style_directives}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Audio Cues</label>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                              {prompt.audio_cues}
                            </div>
                          </div>

                          {!prompt.validated && (
                            <div className="flex items-center gap-2 pt-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm text-gray-700">Review and validate this prompt before production</span>
                              <button
                                onClick={() => handleValidatePrompt(shot.id, true)}
                                className="ml-auto px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                                disabled={loading}
                              >
                                Validate Prompt
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
