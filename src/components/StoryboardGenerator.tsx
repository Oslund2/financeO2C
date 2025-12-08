import { useState, useEffect } from 'react';
import { Film, Play, CheckCircle, AlertCircle, Settings, Wand2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { generateStoryboardForScript } from '../services/storyboardService';
import { checkVertexAIConfiguration } from '../services/geminiService';

type Script = Database['public']['Tables']['scripts']['Row'];

interface StoryboardGeneratorProps {
  onNavigate: (view: string, data?: any) => void;
}

export function StoryboardGenerator({ onNavigate }: StoryboardGeneratorProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; missing: string[] } | null>(null);
  const [options, setOptions] = useState({
    shotDensity: 'moderate' as 'sparse' | 'moderate' | 'dense',
    visualStyle: 'Bright, colorful, educational claymation',
    claymationEmphasis: true,
    includeVocabularyVisuals: true
  });

  useEffect(() => {
    loadScripts();
    checkConfiguration();
  }, []);

  const checkConfiguration = () => {
    const status = checkVertexAIConfiguration();
    setConfigStatus(status);
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
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedScript(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Scripts
          </button>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Film className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Configure Storyboard Generation</h2>
              </div>
              <p className="text-blue-100">{selectedScript.title}</p>
            </div>

            <div className="p-6 space-y-6">
              {!configStatus?.configured && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Vertex AI Not Configured</h3>
                      <p className="text-sm text-red-800">
                        Configure your Vertex AI credentials in Settings to use storyboard generation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Generation Error</h3>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Shot Density
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['sparse', 'moderate', 'dense'] as const).map((density) => (
                    <button
                      key={density}
                      onClick={() => setOptions({ ...options, shotDensity: density })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        options.shotDensity === density
                          ? 'border-scripps-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 capitalize mb-1">{density}</div>
                      <div className="text-xs text-gray-600">
                        {density === 'sparse' && '3-4 shots per scene'}
                        {density === 'moderate' && '4-6 shots per scene'}
                        {density === 'dense' && '6-8 shots per scene'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Visual Style Description
                </label>
                <textarea
                  value={options.visualStyle}
                  onChange={(e) => setOptions({ ...options, visualStyle: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                  placeholder="Describe the visual style for this storyboard..."
                />
                <p className="text-xs text-gray-600 mt-1">
                  This description guides the AI in generating shot descriptions
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.claymationEmphasis}
                    onChange={(e) => setOptions({ ...options, claymationEmphasis: e.target.checked })}
                    className="w-5 h-5 text-scripps-blue rounded focus:ring-2 focus:ring-scripps-blue"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Emphasize Claymation Style</div>
                    <div className="text-sm text-gray-600">
                      Include detailed claymation-specific production notes and techniques
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeVocabularyVisuals}
                    onChange={(e) => setOptions({ ...options, includeVocabularyVisuals: e.target.checked })}
                    className="w-5 h-5 text-scripps-blue rounded focus:ring-2 focus:ring-scripps-blue"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Include Vocabulary Visualizations</div>
                    <div className="text-sm text-gray-600">
                      Add special visual effects for spelling bee vocabulary words
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-cyan-600 mt-0.5" />
                  <div className="text-sm text-cyan-900">
                    <p className="font-semibold mb-1">What happens next?</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>AI analyzes all scenes and dialogue in your script</li>
                      <li>Intelligently breaks down scenes into optimal shot sequences</li>
                      <li>Generates detailed visual descriptions for each shot</li>
                      <li>Creates production-ready shot compositions and camera notes</li>
                      <li>Produces complete storyboard ready for animation team</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setSelectedScript(null)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!configStatus?.configured}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                Generate Storyboard
              </button>
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
