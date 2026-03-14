import { useState, useEffect, useCallback } from 'react';
import {
  Film,
  Loader2,
  AlertCircle,
  Scissors,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import FFmpegEditor from './FFmpegEditor';
import type { EditorialShot, ShotType, CameraAngle, CameraMovement } from '../types/editorialEngine';
import type { FormatType } from '../types/formatConfig';

interface FFmpegEditorPageProps {
  seriesId: string | null;
}

interface EpisodeOption {
  id: string;
  title: string;
  episode_number: number | null;
  series_name: string;
  series_id: string;
  shot_count: number;
  has_assembly: boolean;
}

/**
 * Standalone FFmpeg Editor page — accessible from the sidebar.
 * Lets users pick any episode and open the editorial intelligence editor
 * without needing a completed Shotstack assembly first.
 */
export default function FFmpegEditorPage({ seriesId }: FFmpegEditorPageProps) {
  const { currentOrganization } = useOrganization();
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [shots, setShots] = useState<EditorialShot[]>([]);
  const [loadingShots, setLoadingShots] = useState(false);
  const [formatType, setFormatType] = useState<FormatType>('streaming');
  const [showEditor, setShowEditor] = useState(false);
  const [hasBackgroundMusic, setHasBackgroundMusic] = useState(false);

  // ── Load episodes with shot counts ──
  const loadEpisodes = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('episodes')
        .select(`
          id,
          title,
          episode_number,
          series_id,
          series:series_id ( name )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data: episodeData, error: epError } = await query;
      if (epError) throw epError;
      if (!episodeData?.length) {
        setEpisodes([]);
        setLoading(false);
        return;
      }

      // Get shot counts per episode
      const episodeIds = episodeData.map(e => e.id);
      const { data: shotCounts } = await supabase
        .from('production_shot_plans')
        .select('episode_id')
        .in('episode_id', episodeIds);

      const countMap: Record<string, number> = {};
      for (const row of shotCounts || []) {
        countMap[row.episode_id] = (countMap[row.episode_id] || 0) + 1;
      }

      // Check which have completed assemblies
      const { data: assemblies } = await supabase
        .from('video_assemblies')
        .select('episode_id')
        .in('episode_id', episodeIds)
        .eq('status', 'completed');

      const assemblySet = new Set((assemblies || []).map(a => a.episode_id));

      const options: EpisodeOption[] = episodeData
        .filter(e => (countMap[e.id] || 0) > 0) // Only show episodes with shots
        .map(e => ({
          id: e.id,
          title: e.title || `Episode ${e.episode_number || '?'}`,
          episode_number: e.episode_number,
          series_name: (e.series as any)?.name || 'Unknown Series',
          series_id: e.series_id,
          shot_count: countMap[e.id] || 0,
          has_assembly: assemblySet.has(e.id),
        }));

      setEpisodes(options);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, seriesId]);

  useEffect(() => {
    loadEpisodes();
  }, [loadEpisodes]);

  // ── Load shots for selected episode ──
  const loadShots = useCallback(async (episodeId: string) => {
    setLoadingShots(true);
    setError(null);

    try {
      // Fetch shot plans with all editorial metadata
      const { data: plans, error: planError } = await supabase
        .from('production_shot_plans')
        .select(`
          id,
          shot_number,
          shot_type,
          camera_angle,
          camera_movement,
          duration_seconds,
          has_dialogue,
          dialogue_content,
          characters,
          location,
          narrative_description,
          lip_sync_status,
          lip_sync_video_url,
          storyboard_shot_id,
          act_number,
          scene_number
        `)
        .eq('episode_id', episodeId)
        .order('rendering_order', { ascending: true });

      if (planError) throw planError;
      if (!plans?.length) {
        setShots([]);
        setLoadingShots(false);
        return;
      }

      const shotPlanIds = plans.map(p => p.id);

      // Fetch best rendering results
      const now = new Date().toISOString();
      const { data: results } = await supabase
        .from('shot_rendering_results')
        .select('shot_plan_id, signed_url, signed_url_expires_at, cloud_storage_uri')
        .in('shot_plan_id', shotPlanIds)
        .eq('approval_status', 'approved')
        .order('quality_score', { ascending: false });

      const bestVideoMap: Record<string, string> = {};
      for (const r of results || []) {
        if (bestVideoMap[r.shot_plan_id]) continue;
        const signedValid = r.signed_url && (!r.signed_url_expires_at || r.signed_url_expires_at > now);
        bestVideoMap[r.shot_plan_id] = signedValid ? r.signed_url : r.cloud_storage_uri;
      }

      // Storyboard images
      const storyboardShotIds = plans.map(p => p.storyboard_shot_id).filter(Boolean) as string[];
      const imageMap: Record<string, string> = {};
      if (storyboardShotIds.length > 0) {
        const { data: storyboardShots } = await supabase
          .from('storyboard_shots')
          .select('id, image_url')
          .in('id', storyboardShotIds);
        for (const s of storyboardShots || []) {
          if (s.image_url) imageMap[s.id] = s.image_url;
        }
      }

      // Dialogue audio
      const { data: audioClips } = await supabase
        .from('dialogue_audio_clips')
        .select('shot_id, audio_url, duration_seconds')
        .eq('episode_id', episodeId);

      const audioMap: Record<string, { url: string; duration: number }> = {};
      for (const a of audioClips || []) {
        if (a.audio_url && !audioMap[a.shot_id]) {
          audioMap[a.shot_id] = { url: a.audio_url, duration: a.duration_seconds };
        }
      }

      // Check background music
      const { data: assemblySettings } = await supabase
        .from('assembly_settings')
        .select('background_music_url')
        .eq('organization_id', currentOrganization!.id)
        .maybeSingle();

      setHasBackgroundMusic(!!assemblySettings?.background_music_url);

      // Map to EditorialShot[]
      const editorialShots: EditorialShot[] = plans.map(plan => {
        const hasLipsync = plan.lip_sync_status === 'completed' && plan.lip_sync_video_url;
        const hasVeo3 = !!bestVideoMap[plan.id];
        const hasImage = !!(plan.storyboard_shot_id && imageMap[plan.storyboard_shot_id]);

        let sourceType: EditorialShot['sourceType'] = 'missing';
        let videoUrl: string | undefined;
        let imageUrl: string | undefined;

        if (hasLipsync) {
          sourceType = 'lipsync';
          videoUrl = plan.lip_sync_video_url!;
        } else if (hasVeo3) {
          sourceType = 'veo3';
          videoUrl = bestVideoMap[plan.id];
        } else if (hasImage) {
          sourceType = 'still';
          imageUrl = imageMap[plan.storyboard_shot_id!];
        }

        const audio = audioMap[plan.id];

        // Parse dialogue content
        let dialogueContent: EditorialShot['dialogueContent'];
        if (plan.dialogue_content) {
          try {
            const parsed = typeof plan.dialogue_content === 'string'
              ? JSON.parse(plan.dialogue_content)
              : plan.dialogue_content;
            if (Array.isArray(parsed)) {
              dialogueContent = parsed.map((d: any) => ({
                character: d.character || d.name || 'Unknown',
                text: d.text || d.line || '',
                emotion: d.emotion,
              }));
            }
          } catch {
            // Invalid JSON — skip
          }
        }

        return {
          id: plan.id,
          shotNumber: plan.shot_number,
          actNumber: plan.act_number ?? 1,
          sceneNumber: plan.scene_number ?? 1,
          shotType: (plan.shot_type || 'medium_shot') as ShotType,
          cameraAngle: (plan.camera_angle || 'eye_level') as CameraAngle,
          cameraMovement: (plan.camera_movement || 'static') as CameraMovement,
          durationSeconds: plan.duration_seconds || 6,
          hasDialogue: plan.has_dialogue ?? false,
          dialogueContent,
          dialogueAudioUrl: audio?.url,
          dialogueDurationSeconds: audio?.duration,
          characters: plan.characters || [],
          location: plan.location || '',
          narrativeDescription: plan.narrative_description || '',
          videoUrl,
          imageUrl,
          sourceType,
        };
      });

      setShots(editorialShots);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingShots(false);
    }
  }, [currentOrganization?.id]);

  // Load shots when episode is selected
  useEffect(() => {
    if (selectedEpisodeId) {
      loadShots(selectedEpisodeId);
    } else {
      setShots([]);
    }
  }, [selectedEpisodeId, loadShots]);

  const selectedEpisode = episodes.find(e => e.id === selectedEpisodeId);

  // Shot source breakdown
  const sourceBreakdown = {
    lipsync: shots.filter(s => s.sourceType === 'lipsync').length,
    veo3: shots.filter(s => s.sourceType === 'veo3').length,
    still: shots.filter(s => s.sourceType === 'still').length,
    missing: shots.filter(s => s.sourceType === 'missing').length,
  };
  const usableShots = shots.filter(s => s.sourceType !== 'missing').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Scissors className="w-6 h-6 text-indigo-600" />
          </div>
          FFmpeg Editorial Editor
        </h1>
        <p className="text-gray-500 mt-1">
          Intelligent video editing powered by format-aware editorial rules. Select an episode to begin.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Episode Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Select Episode</h2>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading episodes...</span>
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No episodes with generated shots found.</p>
            <p className="text-xs mt-1">Go to Production to generate shot plans first.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {episodes.map(ep => (
              <button
                key={ep.id}
                onClick={() => setSelectedEpisodeId(ep.id === selectedEpisodeId ? null : ep.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedEpisodeId === ep.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{ep.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{ep.series_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{ep.shot_count} shots</span>
                    {ep.has_assembly && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Has assembly</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shot Analysis */}
      {selectedEpisodeId && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Shot Analysis — {selectedEpisode?.title}
            </h2>
            <button
              onClick={() => loadShots(selectedEpisodeId)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          {loadingShots ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading shot data...</span>
            </div>
          ) : shots.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No shots found for this episode.</p>
          ) : (
            <>
              {/* Source breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium">Lip-sync</p>
                  <p className="text-lg font-bold text-purple-900">{sourceBreakdown.lipsync}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">Veo3 Video</p>
                  <p className="text-lg font-bold text-blue-900">{sourceBreakdown.veo3}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-medium">Storyboard Stills</p>
                  <p className="text-lg font-bold text-gray-900">{sourceBreakdown.still}</p>
                </div>
                <div className={`rounded-lg p-3 ${sourceBreakdown.missing > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs font-medium ${sourceBreakdown.missing > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {sourceBreakdown.missing > 0 ? 'Missing' : 'All Covered'}
                  </p>
                  <p className={`text-lg font-bold ${sourceBreakdown.missing > 0 ? 'text-red-900' : 'text-green-900'}`}>
                    {sourceBreakdown.missing > 0 ? sourceBreakdown.missing : usableShots}
                  </p>
                </div>
              </div>

              {/* Source bar */}
              <div className="h-3 rounded-full overflow-hidden flex gap-px bg-gray-100">
                {sourceBreakdown.lipsync > 0 && (
                  <div className="bg-purple-500 transition-all" style={{ width: `${(sourceBreakdown.lipsync / shots.length) * 100}%` }} />
                )}
                {sourceBreakdown.veo3 > 0 && (
                  <div className="bg-blue-500 transition-all" style={{ width: `${(sourceBreakdown.veo3 / shots.length) * 100}%` }} />
                )}
                {sourceBreakdown.still > 0 && (
                  <div className="bg-gray-400 transition-all" style={{ width: `${(sourceBreakdown.still / shots.length) * 100}%` }} />
                )}
                {sourceBreakdown.missing > 0 && (
                  <div className="bg-red-300 transition-all" style={{ width: `${(sourceBreakdown.missing / shots.length) * 100}%` }} />
                )}
              </div>

              {/* Format selector */}
              <div className="flex items-center gap-3 pt-2">
                <label className="text-sm font-medium text-gray-700">Format:</label>
                <select
                  value={formatType}
                  onChange={e => setFormatType(e.target.value as FormatType)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="broadcast">Broadcast Drama/Comedy</option>
                  <option value="streaming">Streaming (No Breaks)</option>
                  <option value="short_form">Short Form (TikTok/Shorts)</option>
                  <option value="medium_form">Medium Form (YouTube/Web)</option>
                  <option value="spot">Commercial Spot</option>
                </select>
              </div>

              {/* Launch editor button */}
              <button
                onClick={() => setShowEditor(true)}
                disabled={usableShots === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Scissors className="w-4 h-4" />
                Open Editorial Editor ({usableShots} usable shots)
              </button>

              {usableShots === 0 && (
                <p className="text-xs text-red-500 text-center">
                  No usable shots — render videos or generate storyboard images first.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Shot list preview */}
      {shots.length > 0 && selectedEpisodeId && !showEditor && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Shot List Preview</h2>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {shots.map((shot) => (
              <div key={shot.id} className="flex items-center gap-3 py-2.5 px-1">
                <span className="text-xs text-gray-400 w-6 text-right">{shot.shotNumber}</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  shot.sourceType === 'lipsync' ? 'bg-purple-500' :
                  shot.sourceType === 'veo3' ? 'bg-blue-500' :
                  shot.sourceType === 'still' ? 'bg-gray-400' : 'bg-red-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                      {shot.shotType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      A{shot.actNumber}·S{shot.sceneNumber}
                    </span>
                    {shot.hasDialogue && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">dialogue</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{shot.narrativeDescription}</p>
                </div>
                <span className="text-xs text-gray-400">{shot.durationSeconds}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FFmpeg Editor Modal */}
      {showEditor && selectedEpisodeId && (
        <FFmpegEditor
          episodeId={selectedEpisodeId}
          shots={shots}
          formatType={formatType}
          assemblyType="rough_cut"
          hasBackgroundMusic={hasBackgroundMusic}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
