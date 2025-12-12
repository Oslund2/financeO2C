import React, { useState, useEffect, useRef } from 'react';
import { Film, FileText, Loader2, CheckCircle, AlertCircle, PlayCircle, Settings, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  generateStandaloneShotList,
  getScriptAnalysis,
  GenerationOptions
} from '../services/shotListGeneratorService';
import { generatePromptsForShots } from '../services/veo3PromptService';
import { generateBatchRecommendations } from '../services/batchRecommendationService';
import ShotListManager from './ShotListManager';
import BatchRecommendations from './BatchRecommendations';

type ProductionMode = 'episode' | 'script';
type WorkflowStep = 'select' | 'upload' | 'configure' | 'generating' | 'review' | 'batches';

interface Script {
  id: string;
  title: string;
  version: number;
  status: string;
  series_id: string;
}

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  script_id: string;
  series_id: string;
}

interface Series {
  id: string;
  title: string;
  description: string;
}

interface ProductionWorkflowProps {
  seriesId: string | null;
  navigationData?: any;
}

export default function ProductionWorkflow({ seriesId, navigationData }: ProductionWorkflowProps) {
  const { currentOrganization } = useOrganization();
  const [currentSeries, setCurrentSeries] = useState<Series | null>(null);
  const [mode, setMode] = useState<ProductionMode>('episode');
  const [step, setStep] = useState<WorkflowStep>('select');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [scriptAnalysis, setScriptAnalysis] = useState<any>(null);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    pacing: 'medium',
    includeEstablishing: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedShotIds, setGeneratedShotIds] = useState<string[]>([]);
  const [batchRecommendations, setBatchRecommendations] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [scriptTitle, setScriptTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentOrganization && seriesId) {
      loadSeriesData();
    }
  }, [currentOrganization, seriesId]);

  useEffect(() => {
    if (currentOrganization && currentSeries) {
      loadData();
    }
  }, [currentOrganization, currentSeries, mode]);

  useEffect(() => {
    if (navigationData && currentOrganization && currentSeries) {
      handleNavigationData();
    }
  }, [navigationData, currentOrganization, currentSeries]);

  const handleNavigationData = async () => {
    if (navigationData?.episodeId) {
      const { data: episode } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', navigationData.episodeId)
        .maybeSingle();

      if (episode) {
        await handleEpisodeSelect(episode);
      }
    } else if (navigationData?.scriptId) {
      const { data: script } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', navigationData.scriptId)
        .maybeSingle();

      if (script) {
        setMode('script');
        await handleScriptSelect(script);
      }
    }
  };

  const loadSeriesData = async () => {
    if (!seriesId || !currentOrganization) return;

    try {
      const { data: seriesData, error } = await supabase
        .from('series')
        .select('id, title, description')
        .eq('id', seriesId)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (error) throw error;
      setCurrentSeries(seriesData);
    } catch (err) {
      console.error('Error loading series:', err);
      setError('Failed to load series data');
    }
  };

  const loadData = async () => {
    if (!currentOrganization || !currentSeries) return;

    setLoading(true);
    try {
      const { data: scriptsData } = await supabase
        .from('scripts')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('series_id', currentSeries.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      setScripts(scriptsData || []);

      if (mode === 'episode') {
        const { data: episodesData } = await supabase
          .from('episodes')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('series_id', currentSeries.id)
          .order('episode_number', { ascending: false });

        setEpisodes(episodesData || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleScriptSelect = async (script: Script) => {
    setSelectedScript(script);
    setError(null);

    try {
      const analysis = await getScriptAnalysis(script.id, currentOrganization!.id);
      setScriptAnalysis(analysis);
      setStep('configure');
    } catch (err) {
      console.error('Error analyzing script:', err);
      setError('Failed to analyze script');
    }
  };

  const handleEpisodeSelect = async (episode: Episode) => {
    setSelectedEpisode(episode);
    setError(null);

    const script = scripts.find(s => s.id === episode.script_id);
    if (script) {
      setSelectedScript(script);
      try {
        const analysis = await getScriptAnalysis(script.id, currentOrganization!.id);
        setScriptAnalysis(analysis);
        setStep('configure');
      } catch (err) {
        console.error('Error analyzing script:', err);
        setError('Failed to analyze script');
      }
    }
  };

  const handleGenerateShotList = async () => {
    if (!selectedScript || !currentOrganization || !currentSeries) return;

    setLoading(true);
    setStep('generating');
    setError(null);

    try {
      const shots = await generateStandaloneShotList(
        selectedScript.id,
        currentSeries.id,
        currentOrganization.id,
        generationOptions
      );

      const { data: generatedShots } = await supabase
        .from('production_shot_plans')
        .select('id')
        .eq('series_id', currentSeries.id)
        .eq('organization_id', currentOrganization.id)
        .is('episode_id', null)
        .order('created_at', { ascending: false })
        .limit(shots.length);

      const shotIds = generatedShots?.map(s => s.id) || [];
      setGeneratedShotIds(shotIds);

      await generatePromptsForShots(shotIds, currentOrganization.id);

      setStep('review');
    } catch (err) {
      console.error('Error generating shot list:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate shot list');
      setStep('configure');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBatchRecommendations = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const recommendations = await generateBatchRecommendations(
        selectedEpisode?.id,
        currentOrganization.id
      );
      setBatchRecommendations(recommendations);
      setStep('batches');
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError('Failed to generate batch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.txt')) {
        setError('Please upload a plain text file (.txt). PDF and DOCX support coming soon.');
        return;
      }
      setUploadedFile(file);
      setScriptTitle(file.name.replace(/\.txt$/, ''));
      setStep('upload');
      setError(null);
    }
  };

  const handleUploadScript = async () => {
    console.log('handleUploadScript called', {
      hasFile: !!uploadedFile,
      hasTitle: !!scriptTitle,
      hasOrg: !!currentOrganization,
      hasSeries: !!currentSeries,
      title: scriptTitle
    });

    if (!uploadedFile || !scriptTitle || !currentOrganization || !currentSeries) {
      console.error('Missing required data for upload');
      setError('Missing required information. Please ensure you have a file and title.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let content: string;

      try {
        content = await uploadedFile.text();
      } catch (readError) {
        throw new Error('Failed to read file. Please ensure it is a valid text file.');
      }

      if (!content || content.trim().length === 0) {
        throw new Error('The file appears to be empty. Please upload a file with content.');
      }

      console.log('Inserting script into database...');
      const { data: newScript, error: scriptError } = await supabase
        .from('scripts')
        .insert({
          title: scriptTitle,
          content,
          series_id: currentSeries.id,
          organization_id: currentOrganization.id,
          version: 1,
          status: 'approved',
          format: 'plain_text'
        })
        .select()
        .single();

      if (scriptError) {
        console.error('Script insert error:', scriptError);
        throw scriptError;
      }

      console.log('Script inserted successfully:', newScript.id);
      setSelectedScript(newScript);

      try {
        const analysis = await getScriptAnalysis(newScript.id, currentOrganization.id);
        console.log('Script analysis result:', analysis);
        setScriptAnalysis(analysis);
      } catch (analysisError) {
        console.error('Script analysis failed:', analysisError);
        console.warn('Continuing without analysis - using defaults');
        setScriptAnalysis({
          script_id: newScript.id,
          title: newScript.title,
          version: newScript.version,
          series_id: newScript.series_id,
          series_title: currentSeries.title,
          status: newScript.status,
          has_episode: false,
          estimated_acts: 3,
          estimated_scenes: 12,
          estimated_shots: 48,
          estimated_runtime_minutes: 22
        });
      }

      setStep('configure');
      setUploadedFile(null);

      await loadData();
    } catch (err) {
      console.error('Error uploading script:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload script');
    } finally {
      setLoading(false);
    }
  };

  if (!currentOrganization || !seriesId) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Series Selected</h3>
          <p className="text-gray-600">Please select or create a series to use the Production Workflow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Workflow</h2>
          <p className="text-sm text-gray-600 mt-1">Generate shot lists and batch configurations</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => {
              setMode('episode');
              setStep('select');
              setSelectedScript(null);
              setSelectedEpisode(null);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'episode'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Film className="w-4 h-4 inline mr-2" />
            Episode Mode
          </button>
          <button
            onClick={() => {
              setMode('script');
              setStep('select');
              setSelectedScript(null);
              setSelectedEpisode(null);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'script'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Direct Script Mode
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === 'select' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">
            {mode === 'episode' ? 'Select Episode' : 'Select Script'}
          </h3>

          {mode === 'episode' ? (
            <div className="space-y-2">
              {episodes.map(episode => (
                <button
                  key={episode.id}
                  onClick={() => handleEpisodeSelect(episode)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium">Episode {episode.episode_number}: {episode.title}</div>
                </button>
              ))}
              {episodes.length === 0 && (
                <p className="text-gray-500 text-center py-8">No episodes found. Create an episode first.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">Select an existing script or upload a new one</p>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Script (.txt)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {scripts.map(script => (
                  <button
                    key={script.id}
                    onClick={() => handleScriptSelect(script)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium">{script.title}</div>
                    <div className="text-sm text-gray-600">Version {script.version}</div>
                  </button>
                ))}
                {scripts.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No approved scripts found. Upload one to get started.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'upload' && uploadedFile && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Script</h3>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Script Title
              </label>
              <input
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                placeholder="Enter script title"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used to identify your script in the system
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Script will be saved to your series library</li>
                <li>• AI will analyze the content for acts, scenes, and characters</li>
                <li>• Shot list generation settings will be presented</li>
                <li>• Status will be set to "Approved" for immediate use</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setStep('select');
                setUploadedFile(null);
                setScriptTitle('');
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadScript}
              disabled={loading || !scriptTitle.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Continue
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'configure' && scriptAnalysis && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Script Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{scriptAnalysis.estimated_acts}</div>
                <div className="text-sm text-gray-600">Acts</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{scriptAnalysis.estimated_scenes}</div>
                <div className="text-sm text-gray-600">Scenes</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{scriptAnalysis.estimated_shots}</div>
                <div className="text-sm text-gray-600">Estimated Shots</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{scriptAnalysis.estimated_runtime_minutes}</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pacing</label>
                <select
                  value={generationOptions.pacing}
                  onChange={(e) => setGenerationOptions({ ...generationOptions, pacing: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="fast">Fast (More cuts, dynamic)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="slow">Slow (Fewer cuts, contemplative)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="establishing"
                  checked={generationOptions.includeEstablishing}
                  onChange={(e) => setGenerationOptions({ ...generationOptions, includeEstablishing: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="establishing" className="text-sm text-gray-700">
                  Include establishing shots for each act
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('select')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleGenerateShotList}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Generate Shot List
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generating Shot List</h3>
          <p className="text-gray-600">Analyzing script, creating shots, and generating AI prompts...</p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900">Shot List Generated</h3>
              <p className="text-sm text-green-700 mt-1">
                Successfully created {generatedShotIds.length} shots with AI-optimized prompts
              </p>
            </div>
          </div>

          <ShotListManager
            shotIds={generatedShotIds}
            organizationId={currentOrganization!.id}
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('select')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Start New
            </button>
            <button
              onClick={handleGenerateBatchRecommendations}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  Generate Batch Recommendations
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'batches' && (
        <div className="space-y-6">
          <BatchRecommendations
            recommendations={batchRecommendations}
            episodeId={selectedEpisode?.id}
            seriesId={currentSeries!.id}
            organizationId={currentOrganization!.id}
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('review')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Shot List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
