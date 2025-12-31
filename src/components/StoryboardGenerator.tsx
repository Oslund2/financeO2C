import { useState, useEffect } from 'react';
import { Film, Play, CheckCircle, AlertCircle, Settings, Wand2, ArrowLeft, Image, Upload, Camera, X, Clock, Calendar, Tag, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { generateStoryboardForScript, isNanoBananaAvailable, calculateEstimatedCost } from '../services/storyboardService';
import { checkVertexAIConfiguration } from '../services/geminiService';

type Script = Database['public']['Tables']['scripts']['Row'];
type ScriptAct = Database['public']['Tables']['script_acts']['Row'];
type ScriptScene = Database['public']['Tables']['script_scenes']['Row'];

interface ScriptDetails extends Script {
  acts: (ScriptAct & { scenes: ScriptScene[] })[];
}

interface StoryboardGeneratorProps {
  onNavigate: (view: string, data?: any) => void;
}

export function StoryboardGenerator({ onNavigate }: StoryboardGeneratorProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scriptDetails, setScriptDetails] = useState<ScriptDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; missing: string[] } | null>(null);
  const [imageApiAvailable, setImageApiAvailable] = useState(false);
  const [activeAct, setActiveAct] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = useState({
    shotDensity: 'moderate' as 'sparse' | 'moderate' | 'dense',
    visualStyle: 'Bright, colorful, educational claymation',
    claymationEmphasis: true,
    includeVocabularyVisuals: true,
    imageGenerationMode: 'manual' as 'auto' | 'manual' | 'text-only',
    generateImagesPerAct: 5
  });

  useEffect(() => {
    loadScripts();
    checkConfiguration();
  }, []);

  const checkConfiguration = () => {
    const status = checkVertexAIConfiguration();
    setConfigStatus(status);

    const imageApiStatus = isNanoBananaAvailable();
    setImageApiAvailable(imageApiStatus);

    if (!imageApiStatus && options.imageGenerationMode === 'auto') {
      setOptions(prev => ({ ...prev, imageGenerationMode: 'manual' }));
    }
  };

  const loadScripts = async () => {
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const scriptsWithStoryboards = await Promise.all(
        (data || []).map(async (script) => {
          const { data: storyboard } = await supabase
            .from('storyboards')
            .select('id, status, total_shots, completed_shots')
            .eq('script_id', script.id)
            .maybeSingle();

          return {
            ...script,
            storyboard
          };
        })
      );

      setScripts(scriptsWithStoryboards as any);

      if (scriptsWithStoryboards.length > 0) {
        setSelectedScript(scriptsWithStoryboards[0] as Script);
      }
    } catch (error) {
      console.error('Error loading scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScriptDetails = async (scriptId: string) => {
    setLoadingDetails(true);
    setActiveAct(0);
    try {
      const { data: script, error: scriptError } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', scriptId)
        .single();

      if (scriptError) throw scriptError;

      const { data: acts, error: actsError } = await supabase
        .from('script_acts')
        .select('*')
        .eq('script_id', scriptId)
        .order('act_number', { ascending: true });

      if (actsError) throw actsError;

      const actsWithScenes = await Promise.all(
        (acts || []).map(async (act) => {
          const { data: scenes, error: scenesError } = await supabase
            .from('script_scenes')
            .select('*')
            .eq('act_id', act.id)
            .order('scene_number', { ascending: true });

          if (scenesError) throw scenesError;

          return {
            ...act,
            scenes: scenes || []
          };
        })
      );

      setScriptDetails({
        ...script,
        acts: actsWithScenes
      } as ScriptDetails);
    } catch (error) {
      console.error('Error loading script details:', error);
      setError('Failed to load script details');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedScript) {
      loadScriptDetails(selectedScript.id);
    } else {
      setScriptDetails(null);
    }
  }, [selectedScript]);

  const calculateShotsPerScene = () => {
    switch (options.shotDensity) {
      case 'sparse':
        return 4;
      case 'moderate':
        return 5;
      case 'dense':
        return 7;
      default:
        return 5;
    }
  };

  const calculateTotalEstimatedShots = () => {
    if (!scriptDetails) return 0;
    const shotsPerScene = calculateShotsPerScene();
    const totalScenes = scriptDetails.acts.reduce((sum, act) => {
      const scenes = (act.scenes && act.scenes.length > 0) ? act.scenes.length : 3;
      return sum + scenes;
    }, 0);
    return totalScenes * shotsPerScene;
  };

  const handleGenerate = async () => {
    if (!selectedScript) return;

    setGenerating(true);
    setError(null);
    setProgress(0);
    setProgressStatus('Starting generation...');

    try {
      const storyboardId = await generateStoryboardForScript(
        selectedScript.id,
        options,
        (progress, status) => {
          setProgress(progress);
          setProgressStatus(status);
        }
      );

      onNavigate('storyboard-viewer', { storyboardId });
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate storyboard');
      setGenerating(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const totalScenes = scriptDetails?.acts.reduce((sum, act) => sum + (act.scenes?.length || 0), 0) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scripts...</p>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Film className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Storyboard</h2>
              <p className="text-gray-600">{selectedScript?.title}</p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{progressStatus}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">AI Processing</p>
                  <p>Analyzing scenes, breaking down shots, and generating detailed visual descriptions using Vertex AI Gemini.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-scripps-blue" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Scripts Available</h3>
            <p className="text-gray-600 mb-6">Create a script first before generating storyboards</p>
            <button
              onClick={() => onNavigate('scripts')}
              className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Go to Scripts
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedScript) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a script to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white">
        <div className="px-6 py-4 border-b border-white border-opacity-20">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-blue-100">Select Script</label>
            <button
              onClick={() => onNavigate('scripts')}
              className="text-sm text-blue-100 hover:text-white transition-colors"
            >
              View All Scripts
            </button>
          </div>
          <div className="mt-2 relative">
            <select
              value={selectedScript.id}
              onChange={(e) => {
                const script = scripts.find((s: any) => s.id === e.target.value);
                if (script) setSelectedScript(script as Script);
              }}
              className="w-full px-4 py-3 bg-white bg-opacity-20 text-white rounded-lg appearance-none cursor-pointer hover:bg-opacity-30 transition-all font-medium border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            >
              {scripts.map((script: any) => (
                <option key={script.id} value={script.id} className="text-gray-900">
                  {script.storyboard?.id ? '✓ ' : ''}
                  {script.title}
                  {script.episode_number && ` - S${script.season_number}E${script.episode_number}`}
                  {script.storyboard?.id && ' (Has Storyboard)'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
          </div>
          {(selectedScript as any)?.storyboard?.id ? (
            <div className="mt-3 bg-green-500 bg-opacity-20 border border-green-300 border-opacity-30 rounded-lg px-4 py-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-200" />
              <span className="text-sm text-green-100">This script has a storyboard. Click "View Storyboard" below to manage images.</span>
            </div>
          ) : (
            <div className="mt-3 bg-blue-500 bg-opacity-20 border border-blue-300 border-opacity-30 rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-200" />
              <span className="text-sm text-blue-100">No storyboard yet. Scroll down and click "Generate Storyboard" to create one, then you can upload images.</span>
            </div>
          )}
        </div>

        <div className="px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Film className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">{selectedScript.title}</h1>
                  {selectedScript.episode_number && (
                    <p className="text-blue-100 text-sm">
                      Season {selectedScript.season_number} • Episode {selectedScript.episode_number}
                    </p>
                  )}
                </div>
              </div>
              {selectedScript.ai_generated && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                  <Wand2 className="w-4 h-4" />
                  <span>AI Generated</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-gray-600">Runtime</p>
              <p className="font-semibold text-gray-900">{selectedScript.runtime_minutes} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-gray-600">Acts</p>
              <p className="font-semibold text-gray-900">{scriptDetails?.acts.length || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-gray-600">Scenes</p>
              <p className="font-semibold text-gray-900">{totalScenes}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-gray-600">Created</p>
              <p className="font-semibold text-gray-900">
                {new Date(selectedScript.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedScript.synopsis && (
        <div className="flex-shrink-0 px-6 py-4 bg-blue-50 border-b border-blue-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Synopsis</h3>
          <p className="text-gray-700 text-sm">{selectedScript.synopsis}</p>
        </div>
      )}

      {selectedScript.theme && (
        <div className="flex-shrink-0 px-6 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-yellow-700" />
            <span className="text-sm font-semibold text-gray-700">Theme:</span>
            <span className="text-sm text-gray-700">{selectedScript.theme}</span>
          </div>
        </div>
      )}

      {selectedScript.vocabulary_words && selectedScript.vocabulary_words.length > 0 && (
        <div className="flex-shrink-0 px-6 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700 flex-shrink-0">Vocabulary:</span>
            <div className="flex flex-wrap gap-2">
              {selectedScript.vocabulary_words.map((word, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {loadingDetails ? (
        <div className="flex-1 flex items-center justify-center p-12 bg-white">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading script content...</p>
          </div>
        </div>
      ) : scriptDetails && scriptDetails.acts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-12 bg-white">
          <div className="text-center">
            <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">This script has no acts or scenes yet.</p>
          </div>
        </div>
      ) : scriptDetails ? (
        <>
          <div className="flex-shrink-0 flex border-b border-gray-200 overflow-x-auto bg-white">
            {scriptDetails.acts.map((act, index) => (
              <button
                key={act.id}
                onClick={() => setActiveAct(index)}
                className={`flex-1 min-w-[200px] px-6 py-3 font-medium transition-all whitespace-nowrap ${
                  activeAct === index
                    ? 'text-scripps-blue border-b-2 border-scripps-blue bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Act {act.act_number}
                {act.notes && ` • ${act.notes}`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {scriptDetails.acts[activeAct] && (
              <div className="max-w-6xl mx-auto space-y-6">
                {scriptDetails.acts[activeAct].content && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Act Overview</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{scriptDetails.acts[activeAct].content}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    Scenes ({scriptDetails.acts[activeAct].scenes?.length || 0})
                  </h3>
                  {scriptDetails.acts[activeAct].scenes?.map((scene) => {
                    const shotsPerScene = calculateShotsPerScene();
                    const scenePlaceholders = Array.from({ length: shotsPerScene }, (_, i) => ({
                      shotNumber: i + 1,
                      type: i === 0 ? 'establishing' : i === shotsPerScene - 1 ? 'closing' : 'action'
                    }));

                    return (
                      <div
                        key={scene.id}
                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            Scene {scene.scene_number}
                          </h4>
                          {scene.duration_estimate > 0 && (
                            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                              {formatDuration(scene.duration_estimate)}
                            </span>
                          )}
                        </div>

                        {scene.setting && (
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-gray-700">Setting:</span>
                            <span className="text-sm text-gray-600 ml-2">{scene.setting}</span>
                          </div>
                        )}

                        {scene.description && (
                          <div className="mb-4">
                            <p className="text-gray-700 italic">{scene.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-4">
                          {scenePlaceholders.map((placeholder) => (
                            <div
                              key={placeholder.shotNumber}
                              className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 transition-colors"
                            >
                              <Camera className="w-6 h-6 text-gray-400 mb-1" />
                              <span className="text-xs font-semibold text-gray-600">Shot {placeholder.shotNumber}</span>
                              <span className="text-xs text-gray-500 capitalize">{placeholder.type}</span>
                            </div>
                          ))}
                        </div>

                        {scene.dialogue && Array.isArray(scene.dialogue) && scene.dialogue.length > 0 && (
                          <div className="space-y-3 mb-4">
                            {scene.dialogue.map((line: any, lineIndex: number) => (
                              <div key={lineIndex} className="pl-4 border-l-2 border-blue-200">
                                <div className="font-semibold text-gray-900 mb-1">
                                  {line.character}
                                </div>
                                <div className="text-gray-700">{line.line}</div>
                                {line.stage_direction && (
                                  <div className="text-sm text-gray-500 italic mt-1">
                                    ({line.stage_direction})
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {scene.stage_directions && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Production Notes:</span>{' '}
                              {scene.stage_directions}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      {error && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Generation Error</h4>
              <p className="text-sm text-red-800 mb-3">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-700 hover:text-red-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-white flex justify-between items-center gap-3">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        <div className="flex gap-3">
          {(selectedScript as any)?.storyboard?.id && (
            <button
              onClick={async () => {
                const { data: storyboard } = await supabase
                  .from('storyboards')
                  .select('id')
                  .eq('script_id', selectedScript!.id)
                  .maybeSingle();

                if (storyboard) {
                  onNavigate('storyboard-viewer', { storyboardId: storyboard.id });
                }
              }}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
            >
              <Film className="w-4 h-4" />
              View Storyboard
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={!configStatus?.configured || !scriptDetails}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-4 h-4" />
            {(selectedScript as any)?.storyboard?.id ? 'Regenerate Storyboard' : 'Generate Storyboard'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">Generation Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!configStatus?.configured && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900 text-sm mb-1">Vertex AI Not Configured</h4>
                      <p className="text-xs text-red-800">Configure Vertex AI in Settings.</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900 text-sm mb-1">Generation Error</h4>
                      <p className="text-xs text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Shot Density</label>
                <div className="space-y-2">
                  {(['sparse', 'moderate', 'dense'] as const).map((density) => (
                    <button
                      key={density}
                      onClick={() => setOptions({ ...options, shotDensity: density })}
                      className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                        options.shotDensity === density
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 capitalize text-sm">{density}</div>
                      <div className="text-xs text-gray-600">
                        {density === 'sparse' && '4 shots/scene'}
                        {density === 'moderate' && '5 shots/scene'}
                        {density === 'dense' && '7 shots/scene'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Visual Style</label>
                <textarea
                  value={options.visualStyle}
                  onChange={(e) => setOptions({ ...options, visualStyle: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe visual style..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Image Generation</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setOptions({ ...options, imageGenerationMode: 'auto' })}
                    disabled={!imageApiAvailable}
                    className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                      options.imageGenerationMode === 'auto'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!imageApiAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      <div className="font-semibold text-gray-900 text-sm">Auto Generate</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setOptions({ ...options, imageGenerationMode: 'manual' })}
                    className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                      options.imageGenerationMode === 'manual'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <div className="font-semibold text-gray-900 text-sm">Manual Upload</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setOptions({ ...options, imageGenerationMode: 'text-only' })}
                    className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                      options.imageGenerationMode === 'text-only'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4" />
                      <div className="font-semibold text-gray-900 text-sm">Text Only</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.claymationEmphasis}
                    onChange={(e) => setOptions({ ...options, claymationEmphasis: e.target.checked })}
                    className="w-4 h-4 mt-0.5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">Claymation Style</div>
                    <div className="text-xs text-gray-600">Include claymation-specific notes</div>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeVocabularyVisuals}
                    onChange={(e) => setOptions({ ...options, includeVocabularyVisuals: e.target.checked })}
                    className="w-4 h-4 mt-0.5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">Vocabulary Visuals</div>
                    <div className="text-xs text-gray-600">Add effects for vocabulary words</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-opacity-90 transition-all font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
