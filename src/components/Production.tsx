import { useState, useEffect } from 'react';
import {
  PlayCircle, Clock, CheckCircle, AlertTriangle, TrendingUp,
  Film, Zap, BookOpen, Settings, Eye, Image, Sparkles,
  ChevronRight, ChevronDown, Grid, List, Download, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductionProps {
  seriesId: string | null;
}

type TabType = 'overview' | 'shots' | 'batches' | 'review';
type RenderMode = 'speed' | 'narrative';

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  series_id: string;
}

interface Shot {
  id: string;
  shot_number: number;
  act_number: number;
  scene_number: number;
  shot_type: string;
  camera_angle: string;
  description: string;
  dialogue: string | null;
  characters: string[];
  locations: string[];
  duration_seconds: number;
  status: string;
}

interface Batch {
  id: string;
  batch_number: number;
  render_mode: string;
  total_shots: number;
  completed_shots: number;
  status: string;
  submitted_at: string;
  estimated_cost: number;
}

interface RenderingJob {
  id: string;
  shot_id: string;
  variation_number: number;
  status: string;
  vertex_job_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  actual_cost: number | null;
  shot?: Shot;
}

export function Production({ seriesId }: ProductionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [renderingJobs, setRenderingJobs] = useState<RenderingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedActs, setExpandedActs] = useState<Set<number>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>('speed');
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (seriesId) {
      loadEpisodes();
    }
  }, [seriesId]);

  useEffect(() => {
    if (selectedEpisodeId) {
      loadProductionData();
    }
  }, [selectedEpisodeId]);

  const loadEpisodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('episodes')
        .select('id, episode_number, title, series_id')
        .eq('series_id', seriesId)
        .order('episode_number');

      if (error) throw error;
      setEpisodes(data || []);
      if (data && data.length > 0) {
        setSelectedEpisodeId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductionData = async () => {
    if (!selectedEpisodeId) return;

    try {
      const [shotsResult, batchesResult, jobsResult] = await Promise.all([
        supabase
          .from('shot_plans')
          .select('*')
          .eq('episode_id', selectedEpisodeId)
          .order('shot_number'),
        supabase
          .from('rendering_batches')
          .select('*')
          .eq('episode_id', selectedEpisodeId)
          .order('batch_number', { ascending: false }),
        supabase
          .from('rendering_jobs')
          .select(`
            *,
            shot:shot_plans(*)
          `)
          .eq('shot_plans.episode_id', selectedEpisodeId)
          .order('created_at', { ascending: false })
      ]);

      if (shotsResult.error) throw shotsResult.error;
      if (batchesResult.error) throw batchesResult.error;
      if (jobsResult.error) throw jobsResult.error;

      setShots(shotsResult.data || []);
      setBatches(batchesResult.data || []);
      setRenderingJobs(jobsResult.data || []);
    } catch (error) {
      console.error('Error loading production data:', error);
    }
  };

  const handleGenerateShotList = async () => {
    if (!selectedEpisodeId) return;

    try {
      setGenerating(true);

      const sampleShots = [
        { shot_number: 1, act_number: 1, scene_number: 1, shot_type: 'establishing_shot', camera_angle: 'aerial', description: 'Opening shot establishing the setting', dialogue: null, characters: [], locations: ['Main Location'], duration_seconds: 8, status: 'pending' },
        { shot_number: 2, act_number: 1, scene_number: 1, shot_type: 'wide_shot', camera_angle: 'eye_level', description: 'Introduction of main characters', dialogue: 'Welcome to the scene', characters: ['Character 1', 'Character 2'], locations: ['Main Location'], duration_seconds: 6, status: 'pending' },
        { shot_number: 3, act_number: 1, scene_number: 1, shot_type: 'medium_shot', camera_angle: 'eye_level', description: 'Character interaction', dialogue: 'Let me show you around', characters: ['Character 1'], locations: ['Main Location'], duration_seconds: 6, status: 'pending' },
        { shot_number: 4, act_number: 1, scene_number: 2, shot_type: 'close_up', camera_angle: 'eye_level', description: 'Emotional reaction shot', dialogue: null, characters: ['Character 2'], locations: ['Interior'], duration_seconds: 4, status: 'pending' },
        { shot_number: 5, act_number: 2, scene_number: 3, shot_type: 'two_shot', camera_angle: 'eye_level', description: 'Conversation between two characters', dialogue: 'What happens next?', characters: ['Character 1', 'Character 2'], locations: ['Interior'], duration_seconds: 6, status: 'pending' },
      ];

      const { error } = await supabase
        .from('shot_plans')
        .insert(
          sampleShots.map(shot => ({
            episode_id: selectedEpisodeId,
            ...shot
          }))
        );

      if (error) throw error;

      await loadProductionData();
      alert('Shot list generated successfully! This is a demo with 5 sample shots.');
    } catch (error) {
      console.error('Error generating shot list:', error);
      alert('Failed to generate shot list. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (!selectedEpisodeId || selectedShots.size === 0) return;

    try {
      setGenerating(true);
      const shotIds = Array.from(selectedShots);

      const variationsPerShot = renderMode === 'speed' ? 8 : 20;
      const costPerShot = renderMode === 'speed' ? 0.75 : 1.88;
      const estimatedCost = shotIds.length * costPerShot;

      const { data: batch, error: batchError } = await supabase
        .from('rendering_batches')
        .insert({
          episode_id: selectedEpisodeId,
          batch_number: batches.length + 1,
          render_mode: renderMode,
          total_shots: shotIds.length,
          completed_shots: 0,
          status: 'submitted',
          estimated_cost: estimatedCost,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (batchError) throw batchError;

      for (const shotId of shotIds) {
        await supabase
          .from('shot_plans')
          .update({ status: 'rendering' })
          .eq('id', shotId);

        for (let i = 1; i <= variationsPerShot; i++) {
          await supabase
            .from('rendering_jobs')
            .insert({
              shot_id: shotId,
              batch_id: batch.id,
              variation_number: i,
              status: 'queued',
              estimated_cost: costPerShot / variationsPerShot
            });
        }
      }

      await loadProductionData();
      setShowBatchModal(false);
      setSelectedShots(new Set());
      alert(`Batch submitted successfully! ${shotIds.length} shots with ${variationsPerShot} variations each.`);
    } catch (error) {
      console.error('Error submitting batch:', error);
      alert('Failed to submit batch. Please try again.');
    } finally {
      setGenerating(false);
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

  const toggleShotSelection = (shotId: string) => {
    const newSelected = new Set(selectedShots);
    if (newSelected.has(shotId)) {
      newSelected.delete(shotId);
    } else {
      newSelected.add(shotId);
    }
    setSelectedShots(newSelected);
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
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
      case 'rendering':
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const stats = {
    totalShots: shots.length,
    pendingShots: shots.filter(s => s.status === 'pending').length,
    renderingShots: shots.filter(s => s.status === 'rendering').length,
    completedShots: shots.filter(s => s.status === 'completed').length,
    activeBatches: batches.filter(b => b.status === 'processing').length,
    totalCost: batches.reduce((sum, b) => sum + (b.estimated_cost || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading production data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Production</h1>
          <p className="text-gray-600">AI-powered video generation with Vertex AI Veo 3.1</p>
        </div>

        {episodes.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Episode
            </label>
            <select
              value={selectedEpisodeId || ''}
              onChange={(e) => setSelectedEpisodeId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {episodes.map(ep => (
                <option key={ep.id} value={ep.id}>
                  Episode {ep.episode_number}: {ep.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Shots</div>
              <Film className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalShots}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Rendering</div>
              <TrendingUp className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.renderingShots}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Completed</div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.completedShots}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Est. Cost</div>
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-purple-600">${stats.totalCost.toFixed(0)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
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
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Film className="w-4 h-4 inline mr-2" />
                Shot List ({shots.length})
              </button>
              <button
                onClick={() => setActiveTab('batches')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'batches'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Grid className="w-4 h-4 inline mr-2" />
                Batches ({batches.length})
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'review'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Review
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                {shots.length === 0 ? (
                  <div className="text-center py-12">
                    <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Shot List Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Generate a shot list from your script to start video production
                    </p>
                    <button
                      onClick={handleGenerateShotList}
                      disabled={generating || !selectedEpisodeId}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors inline-flex items-center gap-2"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Generating Shot List...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Shot List
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Production Overview
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-900">Speed Mode</span>
                          </div>
                          <p className="text-sm text-blue-700">
                            8 variations per shot • $0.75/shot • 2-4 min/shot
                          </p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                            <span className="font-medium text-purple-900">Narrative Mode</span>
                          </div>
                          <p className="text-sm text-purple-700">
                            20 variations per shot • $1.88/shot • 5-10 min/shot
                          </p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-900">Progress</span>
                          </div>
                          <p className="text-sm text-green-700">
                            {stats.completedShots} of {stats.totalShots} shots completed
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                      <button
                        onClick={() => setActiveTab('shots')}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View All Shots →
                      </button>
                    </div>

                    {renderingJobs.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No rendering jobs yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Create a batch to start rendering
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {renderingJobs.slice(0, 5).map(job => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                {job.status}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  Shot {job.shot?.shot_number} - Variation {job.variation_number}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {job.shot?.description?.substring(0, 60)}...
                                </div>
                              </div>
                            </div>
                            {job.actual_cost && (
                              <div className="text-sm font-medium text-gray-900">
                                ${job.actual_cost.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shots' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Shot List</h3>
                  <div className="flex items-center gap-3">
                    {shots.length > 0 && (
                      <button
                        onClick={() => setShowBatchModal(true)}
                        disabled={selectedShots.size === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors inline-flex items-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Render Selected ({selectedShots.size})
                      </button>
                    )}
                    <button
                      onClick={handleGenerateShotList}
                      disabled={generating}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors inline-flex items-center gap-2"
                    >
                      {generating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Regenerate
                    </button>
                  </div>
                </div>

                {shots.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Film className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No shots generated yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from(groupShotsByAct().entries()).map(([actNumber, actShots]) => (
                      <div key={actNumber} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleAct(actNumber)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedActs.has(actNumber) ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                            <span className="font-semibold text-gray-900">
                              Act {actNumber}
                            </span>
                            <span className="text-sm text-gray-600">
                              ({actShots.length} shots)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                              {actShots.filter(s => s.status === 'completed').length} completed
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                              {actShots.filter(s => s.status === 'rendering').length} rendering
                            </span>
                          </div>
                        </button>

                        {expandedActs.has(actNumber) && (
                          <div className="divide-y divide-gray-200">
                            {actShots.map(shot => (
                              <div
                                key={shot.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${
                                  selectedShots.has(shot.id) ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedShots.has(shot.id)}
                                    onChange={() => toggleShotSelection(shot.id)}
                                    disabled={shot.status !== 'pending'}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="font-medium text-gray-900">
                                        Shot {shot.shot_number}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shot.status)}`}>
                                        {shot.status}
                                      </span>
                                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                        {shot.shot_type}
                                      </span>
                                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                        {shot.camera_angle}
                                      </span>
                                      <span className="text-xs text-gray-600">
                                        {shot.duration_seconds}s
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2">{shot.description}</p>
                                    {shot.dialogue && (
                                      <p className="text-sm text-gray-600 italic mb-2">
                                        "{shot.dialogue}"
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                      {shot.characters.length > 0 && (
                                        <span>Characters: {shot.characters.join(', ')}</span>
                                      )}
                                      {shot.locations.length > 0 && (
                                        <span>Location: {shot.locations.join(', ')}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'batches' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Rendering Batches</h3>
                </div>

                {batches.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Grid className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No batches created yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Select shots and create a batch to start rendering
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batches.map(batch => (
                      <div key={batch.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                Batch #{batch.batch_number}
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                                {batch.status}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {batch.render_mode}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Submitted {new Date(batch.submitted_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Estimated Cost</div>
                            <div className="text-2xl font-bold text-gray-900">
                              ${batch.estimated_cost.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-600 mb-1">Total Shots</div>
                            <div className="text-xl font-bold text-gray-900">{batch.total_shots}</div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-sm text-blue-600 mb-1">Completed</div>
                            <div className="text-xl font-bold text-blue-900">{batch.completed_shots}</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-sm text-green-600 mb-1">Progress</div>
                            <div className="text-xl font-bold text-green-900">
                              {Math.round((batch.completed_shots / batch.total_shots) * 100)}%
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(batch.completed_shots / batch.total_shots) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'review' && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Review interface coming soon</p>
                <p className="text-sm text-gray-500 mt-1">
                  Review and select the best variations for each shot
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Rendering Batch</h2>
              <p className="text-gray-600 mt-1">Configure and submit shots for rendering</p>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Render Mode
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setRenderMode('speed')}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      renderMode === 'speed'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className={`w-5 h-5 ${renderMode === 'speed' ? 'text-blue-600' : 'text-gray-600'}`} />
                      <span className={`font-semibold ${renderMode === 'speed' ? 'text-blue-900' : 'text-gray-900'}`}>
                        Speed Mode
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 text-left mb-2">
                      Fast iteration with good quality
                    </p>
                    <div className="text-xs text-gray-500 text-left space-y-1">
                      <div>• 8 variations per shot</div>
                      <div>• $0.75 per shot</div>
                      <div>• 2-4 minutes per shot</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setRenderMode('narrative')}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      renderMode === 'narrative'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className={`w-5 h-5 ${renderMode === 'narrative' ? 'text-purple-600' : 'text-gray-600'}`} />
                      <span className={`font-semibold ${renderMode === 'narrative' ? 'text-purple-900' : 'text-gray-900'}`}>
                        Narrative Mode
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 text-left mb-2">
                      Maximum quality and variety
                    </p>
                    <div className="text-xs text-gray-500 text-left space-y-1">
                      <div>• 20 variations per shot</div>
                      <div>• $1.88 per shot</div>
                      <div>• 5-10 minutes per shot</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">Batch Summary</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>• {selectedShots.size} shots selected</div>
                  <div>• {renderMode === 'speed' ? 8 : 20} variations per shot</div>
                  <div>• Estimated cost: ${(selectedShots.size * (renderMode === 'speed' ? 0.75 : 1.88)).toFixed(2)}</div>
                  <div>• Estimated time: {selectedShots.size * (renderMode === 'speed' ? 3 : 7.5)} minutes</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBatch}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors inline-flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    Submit Batch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
