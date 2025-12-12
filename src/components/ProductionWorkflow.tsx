import React, { useState, useEffect, useRef } from 'react';
import { Film, FileText, Loader2, CheckCircle, AlertCircle, PlayCircle, Settings, Upload, Lock, Check, X, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  generateStandaloneShotList,
  getScriptAnalysis,
  GenerationOptions
} from '../services/shotListGeneratorService';
import { generatePromptsForShots } from '../services/veo3PromptService';
import { generateBatchRecommendations } from '../services/batchRecommendationService';
import { getUserSettings, updateUserSettings } from '../services/settingsService';
import ShotListManager from './ShotListManager';
import BatchRecommendations from './BatchRecommendations';

type ProductionMode = 'episode' | 'script';
type WorkflowStep = 'select' | 'upload' | 'configure' | 'generating' | 'review' | 'batches';
type ScriptStatusFilter = 'all' | 'draft' | 'approved';

interface Script {
  id: string;
  title: string;
  version: number;
  status: string;
  series_id: string;
  created_at?: string;
  content?: string;
  shot_count?: number;
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
  name: string;
  description: string;
}

interface ProductionWorkflowProps {
  seriesId: string | null;
  navigationData?: any;
}

export default function ProductionWorkflow({ seriesId, navigationData }: ProductionWorkflowProps) {
  const { currentOrganization } = useOrganization();
  const [currentSeries, setCurrentSeries] = useState<Series | null>(null);
  const [mode, setMode] = useState<ProductionMode>('script');
  const [step, setStep] = useState<WorkflowStep>('select');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [allScripts, setAllScripts] = useState<Script[]>([]);
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
  const [scriptSearch, setScriptSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScriptStatusFilter>('all');
  const [draftSession, setDraftSession] = useState<any>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ step: '', percent: 0 });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [navigationProcessed, setNavigationProcessed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentOrganization && seriesId) {
      loadSeriesData();
      loadUserPreferences();
    }
  }, [currentOrganization, seriesId]);

  useEffect(() => {
    if (currentOrganization && currentSeries) {
      loadData();
    }
  }, [currentOrganization, currentSeries, mode]);

  useEffect(() => {
    if (currentOrganization && currentSeries && !navigationData?.episodeId) {
      determineInitialMode();
    }
  }, [currentOrganization, currentSeries]);

  useEffect(() => {
    if (scriptSearch || statusFilter !== 'all') {
      filterScripts();
    } else {
      setScripts(allScripts);
    }
  }, [scriptSearch, statusFilter, allScripts]);

  useEffect(() => {
    if (navigationData && currentOrganization && currentSeries && dataLoaded && !navigationProcessed) {
      handleNavigationData();
    }
  }, [navigationData, currentOrganization, currentSeries, dataLoaded]);

  const handleNavigationData = async () => {
    if (navigationData?.episodeId) {
      setLoading(true);
      setMode('episode');
      setError(null);
      setNavigationProcessed(true);

      try {
        const { data: episode, error: episodeError } = await supabase
          .from('episodes')
          .select('*')
          .eq('id', navigationData.episodeId)
          .maybeSingle();

        if (episodeError) throw episodeError;

        if (!episode) {
          setError('Episode not found. It may have been deleted.');
          setMode('script');
          setStep('select');
          return;
        }

        setSelectedEpisode(episode);

        if (!episode.script_id) {
          setError('This episode has no associated script. The data may be corrupted. Please delete this episode and create a new one.');
          setMode('script');
          setStep('select');
          return;
        }

        let script = allScripts.find(s => s.id === episode.script_id);

        if (!script) {
          const { data: fetchedScript, error: scriptError } = await supabase
            .from('scripts')
            .select('*')
            .eq('id', episode.script_id)
            .maybeSingle();

          if (scriptError) {
            console.error('Script fetch error:', scriptError);
            throw new Error('Failed to fetch script data from database.');
          }

          if (!fetchedScript) {
            setError('Script not found for this episode. The script may have been deleted. Please delete this episode and create a new one with a valid script.');
            setMode('script');
            setStep('select');
            return;
          }

          script = fetchedScript;
        }

        setSelectedScript(script);

        const existingSession = await checkForDraftSession(script.id);

        if (existingSession && existingSession.workflow_step !== 'select') {
          setDraftSession(existingSession);
          setShowResumeDialog(true);
          return;
        }

        try {
          const analysis = await getScriptAnalysis(script.id, null);
          setScriptAnalysis(analysis);
          await saveDraftSession(script.id, 'configure');
          setStep('configure');
        } catch (err) {
          console.error('Error analyzing script:', err);
          setError('Failed to analyze script');
          setStep('select');
        }
      } catch (err) {
        console.error('Error loading episode:', err);
        setError(err instanceof Error ? err.message : 'Failed to load episode data');
        setMode('script');
        setStep('select');
      } finally {
        setLoading(false);
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
      setNavigationProcessed(true);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const settings = await getUserSettings();
      if (settings.generation_preferences) {
        const prefs = settings.generation_preferences;
        setGenerationOptions({
          pacing: prefs.pacing || 'medium',
          includeEstablishing: prefs.include_establishing !== undefined ? prefs.include_establishing : true
        });
      }
    } catch (err) {
      console.error('Error loading user preferences:', err);
    }
  };

  const saveUserPreferences = async (options: GenerationOptions) => {
    try {
      await updateUserSettings({
        generation_preferences: {
          pacing: options.pacing || 'medium',
          include_establishing: options.includeEstablishing,
          temperature: 0.7,
          max_tokens: 4000,
          tone: 'educational and entertaining'
        }
      });
    } catch (err) {
      console.error('Error saving user preferences:', err);
    }
  };

  const filterScripts = () => {
    let filtered = [...allScripts];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (scriptSearch) {
      const searchLower = scriptSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchLower)
      );
    }

    setScripts(filtered);
  };

  const loadSeriesData = async () => {
    if (!seriesId || !currentOrganization) return;

    try {
      const { data: seriesData, error } = await supabase
        .from('series')
        .select('id, name, description')
        .eq('id', seriesId)
        .maybeSingle();

      if (error) throw error;
      setCurrentSeries(seriesData);
    } catch (err) {
      console.error('Error loading series:', err);
      setError('Failed to load series data');
    }
  };

  const determineInitialMode = async () => {
    if (!currentOrganization || !currentSeries) return;

    try {
      const [{ count: episodeCount }, { count: scriptCount }] = await Promise.all([
        supabase
          .from('episodes')
          .select('*', { count: 'exact', head: true })
          .eq('series_id', currentSeries.id),
        supabase
          .from('scripts')
          .select('*', { count: 'exact', head: true })
          .eq('series_id', currentSeries.id)
          .in('status', ['draft', 'approved'])
      ]);

      if ((episodeCount || 0) === 0 && (scriptCount || 0) > 0) {
        setMode('script');
      } else if ((episodeCount || 0) > 0) {
        setMode('episode');
      } else {
        setMode('script');
      }
    } catch (err) {
      console.error('Error determining initial mode:', err);
      setMode('script');
    }
  };

  const loadData = async () => {
    if (!currentOrganization || !currentSeries) return;

    setLoading(true);
    try {
      const { data: scriptsData } = await supabase
        .from('scripts')
        .select('*')
        .eq('series_id', currentSeries.id)
        .in('status', ['draft', 'approved'])
        .order('created_at', { ascending: false });

      if (scriptsData) {
        const scriptsWithCounts = await Promise.all(
          scriptsData.map(async (script) => {
            const { count } = await supabase
              .from('production_shot_plans')
              .select('*', { count: 'exact', head: true })
              .eq('series_id', currentSeries.id);

            return { ...script, shot_count: count || 0 };
          })
        );

        setAllScripts(scriptsWithCounts);
        setScripts(scriptsWithCounts);
      }

      const { data: episodesData } = await supabase
        .from('episodes')
        .select('*')
        .eq('series_id', currentSeries.id)
        .order('episode_number', { ascending: false });

      setEpisodes(episodesData || []);

      if (mode === 'episode' && episodesData && episodesData.length === 0 && scriptsData && scriptsData.length > 0) {
        setMode('script');
      }

      setDataLoaded(true);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const checkForDraftSession = async (scriptId: string) => {
    if (!currentOrganization) return null;

    try {
      const { data } = await supabase
        .from('production_draft_sessions')
        .select('*')
        .eq('script_id', scriptId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data;
    } catch (err) {
      console.error('Error checking for draft session:', err);
      return null;
    }
  };

  const saveDraftSession = async (scriptId: string, sessionStep: string, options?: any, shotIds?: string[]) => {
    if (!currentOrganization || !currentSeries) return;

    try {
      const sessionData = {
        script_id: scriptId,
        series_id: currentSeries.id,
        organization_id: currentOrganization.id,
        workflow_step: sessionStep,
        generation_options: options || generationOptions,
        generated_shot_ids: shotIds || generatedShotIds
      };

      if (draftSession?.id) {
        await supabase
          .from('production_draft_sessions')
          .update(sessionData)
          .eq('id', draftSession.id);
      } else {
        const { data } = await supabase
          .from('production_draft_sessions')
          .insert([sessionData])
          .select()
          .single();

        setDraftSession(data);
      }
    } catch (err) {
      console.error('Error saving draft session:', err);
    }
  };

  const handleQuickApprove = async (script: Script) => {
    if (!currentOrganization) return;

    try {
      const { error } = await supabase
        .from('scripts')
        .update({ status: 'approved' })
        .eq('id', script.id);

      if (error) throw error;

      await loadData();
      await handleScriptSelect({ ...script, status: 'approved' });
    } catch (err) {
      console.error('Error approving script:', err);
      setError('Failed to approve script');
    }
  };

  const handleScriptSelect = async (script: Script) => {
    setSelectedScript(script);
    setError(null);

    const existingSession = await checkForDraftSession(script.id);

    if (existingSession && existingSession.workflow_step !== 'select') {
      setDraftSession(existingSession);
      setShowResumeDialog(true);
      return;
    }

    try {
      const analysis = await getScriptAnalysis(script.id, null);
      setScriptAnalysis(analysis);
      await saveDraftSession(script.id, 'configure');
      setStep('configure');
    } catch (err) {
      console.error('Error analyzing script:', err);
      setError('Failed to analyze script');
    }
  };

  const handleResumeSession = () => {
    if (!draftSession) return;

    if (draftSession.generation_options) {
      setGenerationOptions(draftSession.generation_options);
    }

    if (draftSession.generated_shot_ids && draftSession.generated_shot_ids.length > 0) {
      setGeneratedShotIds(draftSession.generated_shot_ids);
    }

    setStep(draftSession.workflow_step as WorkflowStep);
    setShowResumeDialog(false);
  };

  const handleStartFresh = async () => {
    if (draftSession?.id) {
      await supabase
        .from('production_draft_sessions')
        .delete()
        .eq('id', draftSession.id);
    }

    setDraftSession(null);
    setShowResumeDialog(false);
    setGeneratedShotIds([]);

    if (selectedScript) {
      try {
        const analysis = await getScriptAnalysis(selectedScript.id, null);
        setScriptAnalysis(analysis);
        setStep('configure');
      } catch (err) {
        console.error('Error analyzing script:', err);
        setError('Failed to analyze script');
      }
    }
  };

  const handleEpisodeSelect = async (episode: Episode) => {
    setSelectedEpisode(episode);
    setMode('episode');
    setError(null);
    setLoading(true);

    try {
      if (!episode.script_id) {
        setError('This episode has no associated script. The data may be corrupted. Please delete this episode and create a new one.');
        setLoading(false);
        return;
      }

      let script = allScripts.find(s => s.id === episode.script_id);

      if (!script) {
        const { data: fetchedScript, error: scriptError } = await supabase
          .from('scripts')
          .select('*')
          .eq('id', episode.script_id)
          .maybeSingle();

        if (scriptError) {
          console.error('Script fetch error:', scriptError);
          throw new Error('Failed to fetch script data from database.');
        }

        if (!fetchedScript) {
          setError('Script not found for this episode. The script may have been deleted. Please delete this episode and create a new one with a valid script.');
          setLoading(false);
          return;
        }

        script = fetchedScript;
      }

      setSelectedScript(script);

      try {
        const analysis = await getScriptAnalysis(script.id, null);
        setScriptAnalysis(analysis);
        setStep('configure');
      } catch (err) {
        console.error('Error analyzing script:', err);
        setError('Failed to analyze script');
      }
    } catch (err) {
      console.error('Error loading script for episode:', err);
      setError(err instanceof Error ? err.message : 'Failed to load script');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateShotList = async () => {
    if (!selectedScript || !currentOrganization || !currentSeries) return;

    setLoading(true);
    setStep('generating');
    setError(null);

    try {
      setGenerationProgress({ step: 'Analyzing script structure...', percent: 10 });
      await saveDraftSession(selectedScript.id, 'generating');

      setGenerationProgress({ step: 'Creating shot breakdown...', percent: 40 });
      const shots = await generateStandaloneShotList(
        selectedScript.id,
        currentSeries.id,
        currentOrganization.id,
        generationOptions
      );

      setGenerationProgress({ step: 'Finalizing shot list...', percent: 70 });
      const { data: generatedShots } = await supabase
        .from('production_shot_plans')
        .select('id')
        .eq('series_id', currentSeries.id)
        .is('episode_id', null)
        .order('created_at', { ascending: false })
        .limit(shots.length);

      const shotIds = generatedShots?.map(s => s.id) || [];
      setGeneratedShotIds(shotIds);

      setGenerationProgress({ step: 'Generating AI prompts for Veo 3...', percent: 85 });
      await generatePromptsForShots(shotIds, currentOrganization.id);

      setGenerationProgress({ step: 'Complete!', percent: 100 });
      await saveDraftSession(selectedScript.id, 'review', generationOptions, shotIds);

      setStep('review');
    } catch (err) {
      console.error('Error generating shot list:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate shot list');
      await saveDraftSession(selectedScript.id, 'configure');
      setStep('configure');
    } finally {
      setLoading(false);
      setGenerationProgress({ step: '', percent: 0 });
    }
  };

  const handleGenerationOptionsChange = (newOptions: GenerationOptions) => {
    setGenerationOptions(newOptions);
    saveUserPreferences(newOptions);
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
        const analysis = await getScriptAnalysis(newScript.id, null);
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
          series_title: currentSeries.name,
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
            Episode Mode ({episodes.length})
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
            Direct Script Mode ({allScripts.length})
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

      {showResumeDialog && draftSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Resume Previous Session?</h3>
            <p className="text-gray-600 mb-6">
              You have a saved workflow for this script from{' '}
              {new Date(draftSession.updated_at).toLocaleString()}.
              Would you like to continue where you left off?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleStartFresh}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Start Fresh
              </button>
              <button
                onClick={handleResumeSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Resume Session
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-4">
          {allScripts.length === 0 && episodes.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Getting Started with Production Workflow
              </h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>Direct Script Mode:</strong> Upload a script and immediately generate shot lists without creating episodes. Best for quick prototyping or one-off productions.
                </p>
                <p>
                  <strong>Episode Mode:</strong> Work with episodes that link scripts to structured metadata. Best for series production with multiple episodes.
                </p>
              </div>
            </div>
          )}

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
                <div className="text-center py-12">
                  <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Episodes Yet</h4>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Episodes link scripts to structured production workflows.
                    {allScripts.length > 0
                      ? ' You have scripts available - switch to Direct Script Mode to start generating shot lists.'
                      : ' Create an episode in the Episodes tab, or upload a script to get started.'}
                  </p>
                  {allScripts.length > 0 && (
                    <button
                      onClick={() => setMode('script')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Switch to Direct Script Mode
                    </button>
                  )}
                </div>
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

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search scripts..."
                    value={scriptSearch}
                    onChange={(e) => setScriptSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ScriptStatusFilter)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Scripts</option>
                  <option value="draft">Draft Only</option>
                  <option value="approved">Approved Only</option>
                </select>
              </div>

              <div className="space-y-2">
                {scripts.map(script => (
                  <div
                    key={script.id}
                    className="border border-gray-200 rounded-lg hover:border-blue-500 transition-colors overflow-hidden"
                  >
                    <button
                      onClick={() => handleScriptSelect(script)}
                      className="w-full text-left p-4 hover:bg-blue-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{script.title}</span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                script.status === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {script.status === 'approved' ? (
                                <><Check className="w-3 h-3 inline mr-1" />Approved</>
                              ) : (
                                'Draft'
                              )}
                            </span>
                            {script.shot_count && script.shot_count > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                {script.shot_count} shots
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            Version {script.version} • Created{' '}
                            {script.created_at && new Date(script.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                    {script.status === 'draft' && (
                      <div className="px-4 pb-3 bg-gray-50">
                        <button
                          onClick={() => handleQuickApprove(script)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Quick Approve & Use
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {scripts.length === 0 && (
                  <div className="text-center py-12">
                    {scriptSearch || statusFilter !== 'all' ? (
                      <>
                        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No Matching Scripts</h4>
                        <p className="text-gray-600 mb-4">
                          No scripts match your current filters. Try adjusting your search or filters.
                        </p>
                        <button
                          onClick={() => {
                            setScriptSearch('');
                            setStatusFilter('all');
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear Filters
                        </button>
                      </>
                    ) : (
                      <>
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No Scripts Yet</h4>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Upload your first script to start generating shot lists and production workflows.
                          Scripts should be in plain text format (.txt).
                        </p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 text-base font-medium"
                        >
                          <Upload className="w-5 h-5" />
                          Upload Your First Script
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
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
                  onChange={(e) => handleGenerationOptionsChange({ ...generationOptions, pacing: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="fast">Fast (More cuts, dynamic)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="slow">Slow (Fewer cuts, contemplative)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  This preference will be saved for future sessions
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="establishing"
                  checked={generationOptions.includeEstablishing}
                  onChange={(e) => handleGenerationOptionsChange({ ...generationOptions, includeEstablishing: e.target.checked })}
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
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="max-w-md mx-auto">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-center">Generating Shot List</h3>

            {generationProgress.step && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{generationProgress.step}</span>
                  <span className="font-medium text-blue-600">{generationProgress.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${generationProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
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
