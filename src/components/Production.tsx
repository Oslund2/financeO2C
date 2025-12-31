import { useState, useEffect } from 'react';
import {
  PlayCircle, Film, FileText, Eye, Image, Sparkles, CheckCircle, AlertCircle,
  ChevronRight, ChevronDown, Settings, RefreshCw, Clock, Zap, BookOpen,
  Grid, TrendingUp, Loader2, ArrowLeft, Camera, List as ListIcon, Video
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { generatePromptsForShots } from '../services/veo3PromptService';
import { StoryboardViewer } from './StoryboardViewer';
import { LipSyncManager } from './LipSyncManager';

interface ProductionProps {
  seriesId: string | null;
  episodeId?: string | null;
}

interface Script {
  id: string;
  title: string;
  version: number;
  status: string;
  content: string;
  created_at: string;
  series_id: string;
}

interface Storyboard {
  id: string;
  script_id: string;
  title: string;
  status: string;
  total_shots: number;
  completed_shots: number;
  created_at: string;
}

interface Shot {
  id: string;
  shot_number: number;
  act_number: number;
  scene_number: number;
  shot_type: string;
  camera_angle: string;
  camera_movement: string;
  duration_seconds: number;
  narrative_description: string | null;
  technical_description: string | null;
  characters: string[];
  location: string | null;
  status: string;
  storyboard_shot_id: string | null;
}

interface ShotPrompt {
  shot_plan_id: string;
  veo3_prompt_text: string;
  negative_prompt: string | null;
  style_directives: string | null;
  validated: boolean;
}

type ViewMode = 'scripts' | 'shots' | 'storyboard_viewer';
type TabType = 'overview' | 'shots' | 'batches' | 'lipsync';

export function Production({ seriesId, episodeId: initialEpisodeId }: ProductionProps) {
  const { currentOrganization } = useOrganization();
  const [viewMode, setViewMode] = useState<ViewMode>('scripts');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [storyboards, setStoryboards] = useState<Map<string, Storyboard>>(new Map());
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [selectedStoryboard, setSelectedStoryboard] = useState<Storyboard | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotPrompts, setShotPrompts] = useState<Map<string, ShotPrompt>>(new Map());
  const [expandedActs, setExpandedActs] = useState<Set<number>>(new Set([1]));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization && seriesId) {
      loadScripts();
    }
  }, [currentOrganization, seriesId]);

  useEffect(() => {
    if (selectedScript) {
      loadShotsForScript();
    }
  }, [selectedScript]);

  const loadScripts = async () => {
    if (!currentOrganization || !seriesId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: scriptsData, error: scriptsError } = await supabase
        .from('scripts')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('series_id', seriesId)
        .order('created_at', { ascending: false });

      if (scriptsError) throw scriptsError;
      setScripts(scriptsData || []);

      if (scriptsData && scriptsData.length > 0) {
        const scriptIds = scriptsData.map(s => s.id);
        const { data: storyboardsData } = await supabase
          .from('storyboards')
          .select('*')
          .in('script_id', scriptIds);

        if (storyboardsData) {
          const storyboardMap = new Map<string, Storyboard>();
          storyboardsData.forEach(sb => {
            storyboardMap.set(sb.script_id, sb as Storyboard);
          });
          setStoryboards(storyboardMap);
        }
      }
    } catch (err) {
      console.error('Error loading scripts:', err);
      setError('Failed to load scripts');
    } finally {
      setLoading(false);
    }
  };

  const loadShotsForScript = async () => {
    if (!selectedScript || !currentOrganization) return;

    try {
      setLoading(true);

      const { data: shotsData, error: shotsError } = await supabase
        .from('production_shot_plans')
        .select('*')
        .eq('series_id', seriesId)
        .eq('organization_id', currentOrganization.id)
        .is('episode_id', null)
        .order('shot_number');

      if (shotsError) throw shotsError;

      const filteredShots = (shotsData || []).filter(shot => {
        if (shot.storyboard_shot_id) {
          const storyboard = storyboards.get(selectedScript.id);
          if (storyboard) {
            return true;
          }
        }
        return true;
      });

      setShots(filteredShots as Shot[]);

      if (filteredShots.length > 0) {
        const shotIds = filteredShots.map(s => s.id);
        const { data: promptsData } = await supabase
          .from('production_shot_prompts')
          .select('*')
          .in('shot_plan_id', shotIds);

        if (promptsData) {
          const promptsMap = new Map<string, ShotPrompt>();
          promptsData.forEach(prompt => {
            promptsMap.set(prompt.shot_plan_id, prompt as ShotPrompt);
          });
          setShotPrompts(promptsMap);
        }
      }
    } catch (err) {
      console.error('Error loading shots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScriptSelect = (script: Script) => {
    setSelectedScript(script);
    const storyboard = storyboards.get(script.id);
    setSelectedStoryboard(storyboard || null);
    setViewMode('shots');
    setActiveTab('overview');
  };

  const handleViewStoryboard = (storyboard: Storyboard) => {
    setSelectedStoryboard(storyboard);
    setViewMode('storyboard_viewer');
  };

  const handleBackToScripts = () => {
    setViewMode('scripts');
    setSelectedScript(null);
    setSelectedStoryboard(null);
    setShots([]);
    setShotPrompts(new Map());
    setExpandedActs(new Set([1]));
  };

  const handleGenerateShotList = async () => {
    if (!selectedScript || !currentOrganization || !seriesId) return;

    try {
      setGenerating(true);
      setError(null);
      setGenerationStep('Analyzing script and generating shots...');

      const storyboard = storyboards.get(selectedScript.id);

      if (storyboard) {
        setGenerationStep('Creating shot plans from storyboard...');

        const { data: result, error: syncError } = await supabase.rpc(
          'sync_storyboard_to_shot_plans',
          {
            p_episode_id: null,
            p_storyboard_id: storyboard.id
          }
        );

        if (syncError) throw syncError;

        setGenerationStep('Loading generated shots...');
        await loadShotsForScript();

        const { data: shotsData } = await supabase
          .from('production_shot_plans')
          .select('id')
          .eq('series_id', seriesId)
          .eq('organization_id', currentOrganization.id)
          .is('episode_id', null)
          .order('created_at', { ascending: false })
          .limit(result || 50);

        if (shotsData && shotsData.length > 0) {
          setGenerationStep('Generating AI prompts for Veo 3...');
          const shotIds = shotsData.map(s => s.id);
          await generatePromptsForShots(shotIds, currentOrganization.id);
          await loadShotsForScript();
        }

        setGenerationStep('');
        setActiveTab('shots');
      } else {
        setError('No storyboard found for this script. Please generate a storyboard first from the Storyboards tab.');
      }
    } catch (err) {
      console.error('Error generating shot list:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate shot list');
    } finally {
      setGenerating(false);
      setGenerationStep('');
    }
  };

  const handleRegeneratePrompts = async () => {
    if (!currentOrganization || shots.length === 0) return;

    try {
      setGenerating(true);
      setGenerationStep('Regenerating AI prompts...');

      const shotIds = shots.map(s => s.id);
      await generatePromptsForShots(shotIds, currentOrganization.id);
      await loadShotsForScript();

      setGenerationStep('');
    } catch (err) {
      console.error('Error regenerating prompts:', err);
      setError('Failed to regenerate prompts');
    } finally {
      setGenerating(false);
      setGenerationStep('');
    }
  };

  const toggleAct = (actNumber: number) => {
    const newExpanded = new Set(expandedActs);
    if (newExpanded.has(actNumber)) {
      newExpanded.delete(actNumber);
    } else {
      newExpanded.add(actNumber);
    }
    setExpandedActs(newExpanded);
  };

  const groupShotsByAct = () => {
    const grouped = new Map<number, Shot[]>();
    shots.forEach(shot => {
      if (!grouped.has(shot.act_number)) {
        grouped.set(shot.act_number, []);
      }
      grouped.get(shot.act_number)!.push(shot);
    });
    return grouped;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rendering':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const stats = {
    totalShots: shots.length,
    readyShots: shots.filter(s => s.status === 'ready').length,
    draftShots: shots.filter(s => s.status === 'draft').length,
    totalDuration: shots.reduce((sum, s) => sum + s.duration_seconds, 0),
    estimatedCost: shots.reduce((sum, s) => sum + (s.duration_seconds * 0.75), 0),
    withPrompts: Array.from(shotPrompts.values()).length,
    validatedPrompts: Array.from(shotPrompts.values()).filter(p => p.validated).length
  };

  if (loading && scripts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading production data...</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'storyboard_viewer' && selectedStoryboard) {
    return (
      <div className="h-full">
        <StoryboardViewer
          storyboardId={selectedStoryboard.id}
          onNavigate={(view) => {
            if (view === 'back') {
              setViewMode('shots');
            }
          }}
        />
      </div>
    );
  }

  if (viewMode === 'scripts') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Production Pipeline</h1>
            <p className="text-sm sm:text-base text-gray-600">Select a script to begin shot list generation and video production</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800 font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {scripts.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Scripts Available</h3>
              <p className="text-gray-600 mb-6">Create or upload scripts from the Scripts tab to begin production</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scripts.map(script => {
                const storyboard = storyboards.get(script.id);
                const hasStoryboard = !!storyboard;
                const isStoryboardComplete = storyboard?.status === 'completed';

                return (
                  <div
                    key={script.id}
                    className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg overflow-hidden group"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                            {script.title}
                          </h3>
                          <p className="text-sm text-gray-600">Version {script.version}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(script.status)}`}>
                          {script.status}
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Created {new Date(script.created_at).toLocaleDateString()}</span>
                        </div>

                        {hasStoryboard && (
                          <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              Storyboard: {storyboard.completed_shots}/{storyboard.total_shots} shots
                            </span>
                          </div>
                        )}
                      </div>

                      {hasStoryboard && isStoryboardComplete && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-900">Ready for Production</span>
                          </div>
                          <p className="text-xs text-green-700">
                            Storyboard complete with {storyboard.total_shots} shots ready to convert to production
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleScriptSelect(script)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Start Production
                        </button>
                        {hasStoryboard && (
                          <button
                            onClick={() => handleViewStoryboard(storyboard)}
                            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                            title="View Storyboard"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBackToScripts}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">{selectedScript?.title}</h1>
              <p className="text-xs sm:text-sm text-gray-600">AI-powered shot list generation and Veo 3 rendering</p>
            </div>
          </div>
          {selectedStoryboard && (
            <button
              onClick={() => handleViewStoryboard(selectedStoryboard)}
              className="px-3 sm:px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View</span> Storyboard
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {generating && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <p className="text-blue-800 font-medium">{generationStep || 'Processing...'}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Shots</span>
              <Film className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalShots}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.totalDuration}s total duration</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">AI Prompts</span>
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats.withPrompts}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.validatedPrompts} validated</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Ready</span>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.readyShots}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.draftShots} still drafts</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Est. Cost</span>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-blue-600">${stats.estimatedCost.toFixed(0)}</div>
            <p className="text-xs text-gray-600 mt-1">for 2 variations/shot</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PlayCircle className="w-4 h-4 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('shots')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'shots'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListIcon className="w-4 h-4 inline mr-2" />
                Shot List ({shots.length})
              </button>
              <button
                onClick={() => setActiveTab('batches')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'batches'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4 inline mr-2" />
                Batches
              </button>
              <button
                onClick={() => setActiveTab('lipsync')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'lipsync'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Video className="w-4 h-4 inline mr-2" />
                Lip Sync
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                {shots.length === 0 ? (
                  <div className="text-center py-16">
                    <Camera className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Generate Shot List
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {selectedStoryboard
                        ? `This script has a storyboard with ${selectedStoryboard.total_shots} shots ready to convert into production shot plans with AI-optimized Veo 3 prompts.`
                        : 'Generate a storyboard first from the Storyboards tab, then return here to create production shots.'}
                    </p>
                    <button
                      onClick={handleGenerateShotList}
                      disabled={generating || !selectedStoryboard}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors inline-flex items-center gap-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Shot List
                        </>
                      )}
                    </button>
                    {!selectedStoryboard && (
                      <p className="text-sm text-amber-600 mt-4">
                        ⚠️ No storyboard found. Create one first to enable shot generation.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-blue-600 rounded-lg">
                            <Film className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-blue-900">Shot Breakdown</h3>
                            <p className="text-sm text-blue-700">By Act & Scene</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {Array.from(groupShotsByAct().entries()).map(([actNum, actShots]) => (
                            <div key={actNum} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-blue-900">Act {actNum}</span>
                              <span className="text-blue-700">{actShots.length} shots</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-purple-600 rounded-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-purple-900">Veo 3 Ready</h3>
                            <p className="text-sm text-purple-700">AI-Optimized Prompts</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-900">Generated Prompts</span>
                            <span className="text-2xl font-bold text-purple-900">{stats.withPrompts}</span>
                          </div>
                          <div className="w-full bg-purple-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${(stats.withPrompts / stats.totalShots) * 100}%` }}
                            />
                          </div>
                          {stats.withPrompts < stats.totalShots && (
                            <button
                              onClick={handleRegeneratePrompts}
                              disabled={generating}
                              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Generate Missing Prompts
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Next Steps</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            1
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">Review Shots</h4>
                            <p className="text-sm text-gray-600">Check shot descriptions and sequences</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            2
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">Validate Prompts</h4>
                            <p className="text-sm text-gray-600">Ensure AI prompts are optimized</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            3
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">Create Batch</h4>
                            <p className="text-sm text-gray-600">Submit shots for Veo 3 rendering</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shots' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Shot List - {stats.totalShots} shots ({stats.totalDuration}s total)
                  </h3>
                  <button
                    onClick={handleRegeneratePrompts}
                    disabled={generating || shots.length === 0}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Prompts
                  </button>
                </div>

                {shots.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ListIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No shots generated yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from(groupShotsByAct().entries()).map(([actNumber, actShots]) => (
                      <div key={actNumber} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleAct(actNumber)}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedActs.has(actNumber) ? (
                              <ChevronDown className="w-5 h-5 text-gray-700" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-700" />
                            )}
                            <Film className="w-5 h-5 text-blue-600" />
                            <span className="font-bold text-gray-900 text-lg">Act {actNumber}</span>
                            <span className="text-sm text-gray-600">({actShots.length} shots)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                                {actShots.filter(s => s.status === 'ready').length} ready
                              </span>
                              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                                {actShots.filter(s => s.status === 'draft').length} draft
                              </span>
                            </div>
                          </div>
                        </button>

                        {expandedActs.has(actNumber) && (
                          <div className="divide-y divide-gray-200 bg-white">
                            {actShots.map(shot => {
                              const prompt = shotPrompts.get(shot.id);
                              return (
                                <div
                                  key={shot.id}
                                  className="p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-16 text-center">
                                      <div className="text-2xl font-bold text-gray-900">
                                        {shot.shot_number}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Scene {shot.scene_number}
                                      </div>
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shot.status)}`}>
                                          {shot.status}
                                        </span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                          {shot.shot_type}
                                        </span>
                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                          {shot.camera_angle}
                                        </span>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                          {shot.duration_seconds}s
                                        </span>
                                        {prompt && (
                                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            AI Prompt
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-gray-900 mb-2 font-medium">
                                        {shot.narrative_description || shot.technical_description}
                                      </p>

                                      {prompt && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                                          <div className="text-xs font-semibold text-purple-900 mb-1">Veo 3 Prompt:</div>
                                          <p className="text-xs text-purple-800 line-clamp-2">
                                            {prompt.veo3_prompt_text}
                                          </p>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-4 text-xs text-gray-600">
                                        {shot.characters.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">Characters:</span>
                                            {shot.characters.join(', ')}
                                          </span>
                                        )}
                                        {shot.location && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">Location:</span>
                                            {shot.location}
                                          </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                          <span className="font-medium">Movement:</span>
                                          {shot.camera_movement}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'batches' && (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Batch Rendering</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Batch rendering interface coming soon. You'll be able to submit shots to Vertex AI for Veo 3 rendering.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Speed Mode</span>
                    </div>
                    <p className="text-sm text-gray-600">2 variations • $0.75/shot</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">Narrative Mode</span>
                    </div>
                    <p className="text-sm text-gray-600">4 variations • $1.50/shot</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'lipsync' && selectedScript && (
              <LipSyncManager
                episodeId={selectedScript.id}
                episodeName={selectedScript.title}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
