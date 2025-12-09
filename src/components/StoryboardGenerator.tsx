import { useState, useEffect } from 'react';
import { Film, Play, CheckCircle, AlertCircle, Settings, Wand2, ArrowLeft, Image, Upload, Camera } from 'lucide-react';
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
    } catch (error) {
      console.error('Error loading scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScriptDetails = async (scriptId: string) => {
    setLoadingDetails(true);
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
    const totalScenes = scriptDetails.acts.reduce((sum, act) => sum + act.scenes.length, 0);
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

  if (selectedScript) {
    const totalShots = calculateTotalEstimatedShots();

    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setSelectedScript(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Scripts
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Film className="w-8 h-8" />
                      <h2 className="text-2xl font-bold">{selectedScript.title}</h2>
                    </div>
                    <p className="text-blue-100">Estimated {totalShots} shots</p>
                  </div>
                </div>
              </div>

              <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading script...</p>
                    </div>
                  </div>
                ) : scriptDetails && scriptDetails.acts.length > 0 ? (
                  <div className="space-y-8">
                    {scriptDetails.acts.map((act, actIndex) => {
                      const shotsPerScene = calculateShotsPerScene();
                      let shotCounter = scriptDetails.acts
                        .slice(0, actIndex)
                        .reduce((sum, a) => sum + a.scenes.length * shotsPerScene, 0);

                      return (
                        <div key={act.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                            <h3 className="text-xl font-bold text-blue-900">Act {act.act_number}</h3>
                            {act.notes && <p className="text-sm text-blue-700 mt-1">{act.notes}</p>}
                          </div>

                          <div className="space-y-8">
                            {act.scenes.map((scene) => {
                              const scenePlaceholders = Array.from({ length: shotsPerScene }, (_, i) => ({
                                shotNumber: shotCounter + i + 1,
                                type: i === 0 ? 'establishing' : i === shotsPerScene - 1 ? 'closing' : 'action'
                              }));
                              shotCounter += shotsPerScene;

                              return (
                                <div key={scene.id} className="bg-gray-50 rounded-lg p-6">
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold">
                                        Scene {scene.scene_number}
                                      </div>
                                      {scene.setting && (
                                        <div className="text-gray-700 font-medium">{scene.setting}</div>
                                      )}
                                    </div>
                                    {scene.description && (
                                      <p className="text-gray-700 mb-3">{scene.description}</p>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                    {scenePlaceholders.map((placeholder) => (
                                      <div
                                        key={placeholder.shotNumber}
                                        className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 transition-colors"
                                      >
                                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-sm font-semibold text-gray-600">Shot {placeholder.shotNumber}</span>
                                        <span className="text-xs text-gray-500 capitalize">{placeholder.type}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {scene.dialogue && Array.isArray(scene.dialogue) && (scene.dialogue as any[]).length > 0 && (
                                    <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                                      {(scene.dialogue as any[]).map((line: any, lineIndex: number) => (
                                        <div key={lineIndex} className="space-y-1">
                                          <div className="font-bold text-gray-900 uppercase text-sm tracking-wide">
                                            {line.character}
                                          </div>
                                          <div className="text-gray-700 pl-8">{line.text}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {scene.stage_directions && (
                                    <div className="mt-3 text-gray-600 italic text-sm bg-yellow-50 p-3 rounded border-l-2 border-yellow-400">
                                      {scene.stage_directions}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No script content available</p>
                    <p className="text-sm text-gray-500 mt-2">This script may not have acts and scenes defined yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 sticky top-8">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 text-white">
                  <h3 className="text-lg font-bold">Generation Settings</h3>
                </div>

                <div className="p-4 space-y-4">
                  {!configStatus?.configured && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-red-900 text-sm mb-1">Vertex AI Not Configured</h4>
                          <p className="text-xs text-red-800">
                            Configure Vertex AI in Settings.
                          </p>
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
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Shot Density
                    </label>
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
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Visual Style
                    </label>
                    <textarea
                      value={options.visualStyle}
                      onChange={(e) => setOptions({ ...options, visualStyle: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe visual style..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Image Generation
                    </label>
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
                        <div className="text-xs text-gray-600">
                          Include claymation-specific notes
                        </div>
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
                        <div className="text-xs text-gray-600">
                          Add effects for vocabulary words
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleGenerate}
                      disabled={!configStatus?.configured || !scriptDetails}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="w-5 h-5" />
                      Generate Storyboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Storyboard Generator</h1>
          <p className="text-gray-600">
            Transform your scripts into detailed visual storyboards using AI
          </p>
        </div>

        {scripts.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {scripts.map((script: any) => (
              <div
                key={script.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{script.title}</h3>
                      {script.storyboard && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${
                          script.storyboard.status === 'completed'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : script.storyboard.status === 'generating'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {script.storyboard.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          <span className="font-medium capitalize">{script.storyboard.status}</span>
                        </div>
                      )}
                    </div>

                    {script.synopsis && (
                      <p className="text-gray-700 mb-3">{script.synopsis}</p>
                    )}

                    {script.storyboard && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{script.storyboard.completed_shots} / {script.storyboard.total_shots} shots</span>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {script.storyboard?.status === 'completed' ? (
                      <button
                        onClick={() => onNavigate('storyboard-viewer', { storyboardId: script.storyboard.id })}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                      >
                        View Storyboard
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedScript(script)}
                        disabled={script.storyboard?.status === 'generating'}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {script.storyboard?.status === 'generating' ? 'Generating...' : 'Generate Storyboard'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
