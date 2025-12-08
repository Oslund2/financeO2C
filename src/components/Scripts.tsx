import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Edit2, CheckCircle, Clock, Sparkles, Lock, Film, AlertCircle, DollarSign, ArrowRight, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { getScriptLockInfo, type ScriptLockInfo } from '../services/scriptLockingService';
import { createEpisodeFromScript, getScriptWithDetails, validateScriptForEpisode } from '../services/episodeCreationService';
import { calculateProductionCosts, type CostComparison as CostComparisonType, type ScriptData } from '../services/costCalculationService';
import { CostComparison } from './CostComparison';

type Script = Database['public']['Tables']['scripts']['Row'];

interface ScriptsProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
}

export function Scripts({ seriesId, onNavigate }: ScriptsProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<Script[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scriptLocks, setScriptLocks] = useState<Map<string, ScriptLockInfo>>(new Map());
  const [episodeCounts, setEpisodeCounts] = useState<Map<string, number>>(new Map());
  const [createEpisodeModal, setCreateEpisodeModal] = useState<{
    isOpen: boolean;
    script: Script | null;
  }>({
    isOpen: false,
    script: null,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    script: Script | null;
    relatedItems: { label: string; count: number }[];
  }>({
    isOpen: false,
    script: null,
    relatedItems: [],
  });

  useEffect(() => {
    loadScripts();
  }, [seriesId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = scripts.filter(
        (script) =>
          script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          script.synopsis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          script.theme?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredScripts(filtered);
    } else {
      setFilteredScripts(scripts);
    }
  }, [searchQuery, scripts]);

  const loadScripts = async () => {
    try {
      let query = supabase.from('scripts').select('*').order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setScripts(data || []);

      const locks = new Map<string, ScriptLockInfo>();
      const episodes = new Map<string, number>();

      await Promise.all(
        (data || []).map(async (script) => {
          const lockInfo = await getScriptLockInfo(script.id);
          locks.set(script.id, lockInfo);
          episodes.set(script.id, lockInfo.associated_episodes.length);
        })
      );

      setScriptLocks(locks);
      setEpisodeCounts(episodes);
    } catch (error) {
      console.error('Error loading scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (script: Script) => {
    const relatedItems: { label: string; count: number }[] = [];

    try {
      const { count: actsCount } = await supabase
        .from('acts')
        .select('*', { count: 'exact', head: true })
        .eq('script_id', script.id);

      if (actsCount) {
        relatedItems.push({ label: 'Acts', count: actsCount });
      }

      const { count: scenesCount } = await supabase
        .from('scenes')
        .select('*', { count: 'exact', head: true })
        .eq('script_id', script.id);

      if (scenesCount) {
        relatedItems.push({ label: 'Scenes', count: scenesCount });
      }

      const { count: episodesCount } = await supabase
        .from('episodes')
        .select('*', { count: 'exact', head: true })
        .eq('script_id', script.id);

      if (episodesCount) {
        relatedItems.push({ label: 'Episodes', count: episodesCount });
      }
    } catch (error) {
      console.error('Error checking related items:', error);
    }

    setDeleteModal({
      isOpen: true,
      script,
      relatedItems,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.script) return;

    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('id', deleteModal.script.id);

    if (error) {
      console.error('Error deleting script:', error);
      throw error;
    }

    setScripts((prev) => prev.filter((s) => s.id !== deleteModal.script!.id));
    setDeleteModal({ isOpen: false, script: null, relatedItems: [] });
  };

  const handleApproveScript = async (scriptId: string) => {
    try {
      const { error } = await supabase
        .from('scripts')
        .update({ status: 'approved' })
        .eq('id', scriptId);

      if (error) throw error;

      setScripts((prev) =>
        prev.map((s) =>
          s.id === scriptId ? { ...s, status: 'approved' } : s
        )
      );
    } catch (error) {
      console.error('Error approving script:', error);
      alert('Failed to approve script. Please try again.');
    }
  };

  const handleApproveAndCreateEpisode = async (script: Script) => {
    await handleApproveScript(script.id);
    setTimeout(() => {
      setCreateEpisodeModal({ isOpen: true, script: { ...script, status: 'approved' } });
    }, 300);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_production':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_production':
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
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

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Scripts</h1>
            <p className="text-gray-600">Manage episode scripts and storylines</p>
          </div>
          <button
            onClick={() => onNavigate('ai-studio')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Sparkles className="w-5 h-5" />
            Generate with AI
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search scripts by title, theme, or synopsis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
            />
          </div>
        </div>

        {(() => {
          const approvedScripts = scripts.filter(s => s.status === 'approved' && !scriptLocks.get(s.id)?.locked);
          const draftScripts = scripts.filter(s => s.status === 'draft');

          if (approvedScripts.length > 0 || draftScripts.length > 0) {
            return (
              <div className="mb-6 space-y-4">
                {approvedScripts.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <Film className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Ready to Produce</h3>
                          <p className="text-sm text-gray-600">
                            {approvedScripts.length} approved script{approvedScripts.length !== 1 ? 's' : ''} ready to become episode{approvedScripts.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600 mb-1">Next Step</div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                          <span>Create Episode</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {approvedScripts.slice(0, 6).map((script) => (
                        <div
                          key={script.id}
                          className="bg-white rounded-lg p-4 border border-green-200 hover:border-green-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm">{script.title}</h4>
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                          </div>
                          <div className="text-xs text-gray-600 mb-3">
                            S{script.season_number}E{script.episode_number} • {script.runtime_minutes} min
                          </div>
                          <button
                            onClick={() => setCreateEpisodeModal({ isOpen: true, script })}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                          >
                            <Film className="w-4 h-4" />
                            Create Episode
                          </button>
                        </div>
                      ))}
                    </div>
                    {approvedScripts.length > 6 && (
                      <div className="mt-4 text-center text-sm text-gray-600">
                        +{approvedScripts.length - 6} more approved scripts below
                      </div>
                    )}
                  </div>
                )}

                {draftScripts.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Workflow Tip</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      You have <span className="font-semibold text-blue-700">{draftScripts.length} draft script{draftScripts.length !== 1 ? 's' : ''}</span>.
                      Scripts must be approved before creating episodes.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                      <span className="px-2 py-1 bg-gray-200 rounded">Draft</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="px-2 py-1 bg-blue-200 rounded">Approved</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="px-2 py-1 bg-green-200 rounded">Create Episode</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="px-2 py-1 bg-red-200 rounded">Locked</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}

        {filteredScripts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-scripps-blue" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No scripts yet</h3>
            <p className="text-gray-600 mb-6">Generate your first episode script with AI</p>
            <button
              onClick={() => onNavigate('ai-studio')}
              className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Generate Script with AI
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredScripts.map((script) => (
              <div
                key={script.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{script.title}</h3>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${getStatusColor(script.status)}`}>
                        {getStatusIcon(script.status)}
                        <span className="font-medium">{script.status}</span>
                      </div>
                      {script.ai_generated && (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
                          <Sparkles className="w-3 h-3" />
                          <span className="font-medium">AI Generated</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      {script.season_number && script.episode_number && (
                        <span>S{script.season_number}E{script.episode_number}</span>
                      )}
                      <span>{script.runtime_minutes} minutes</span>
                      {script.theme && (
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">{script.theme}</span>
                      )}
                    </div>

                    {script.synopsis && (
                      <p className="text-gray-700 mb-3">{script.synopsis}</p>
                    )}

                    {script.vocabulary_words.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs font-semibold text-gray-600">Vocabulary:</span>
                        {script.vocabulary_words.slice(0, 5).map((word, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 font-medium"
                          >
                            {word}
                          </span>
                        ))}
                        {script.vocabulary_words.length > 5 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200">
                            +{script.vocabulary_words.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created {new Date(script.created_at).toLocaleDateString()}</span>
                      {scriptLocks.get(script.id)?.locked && (
                        <div className="flex items-center gap-1 text-red-600">
                          <Lock className="w-3 h-3" />
                          <span className="font-medium">Locked by {scriptLocks.get(script.id)?.locked_by}</span>
                        </div>
                      )}
                      {episodeCounts.get(script.id)! > 0 && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Film className="w-3 h-3" />
                          <span className="font-medium">{episodeCounts.get(script.id)} Episode{episodeCounts.get(script.id)! > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {script.status === 'draft' && !scriptLocks.get(script.id)?.locked && (
                      <>
                        <button
                          onClick={() => handleApproveScript(script.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                          title="Approve this script for production"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveAndCreateEpisode(script)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                          title="Approve script and immediately create episode"
                        >
                          <Zap className="w-4 h-4" />
                          Quick Create
                        </button>
                      </>
                    )}
                    {script.status === 'approved' && !scriptLocks.get(script.id)?.locked && (
                      <button
                        onClick={() => setCreateEpisodeModal({ isOpen: true, script })}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                        title="Create Episode from this script"
                      >
                        <Film className="w-4 h-4" />
                        Create Episode
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedScript(script)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit script"
                    >
                      <Edit2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(script)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete script"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedScript && (
        <ScriptEditor
          script={selectedScript}
          onClose={() => setSelectedScript(null)}
          onSave={() => {
            loadScripts();
            setSelectedScript(null);
          }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, script: null, relatedItems: [] })}
        onConfirm={handleDeleteConfirm}
        entityType="Script"
        entityName={deleteModal.script?.title || ''}
        relatedItems={deleteModal.relatedItems}
        warningMessage={
          deleteModal.relatedItems.length > 0
            ? 'This script has associated acts, scenes, or episodes. All related content will be permanently deleted.'
            : 'This script will be permanently deleted from your series.'
        }
        requireTyping={deleteModal.relatedItems.length > 0}
      />

      {createEpisodeModal.isOpen && createEpisodeModal.script && (
        <CreateEpisodeModal
          script={createEpisodeModal.script}
          onClose={() => setCreateEpisodeModal({ isOpen: false, script: null })}
          onSuccess={() => {
            setCreateEpisodeModal({ isOpen: false, script: null });
            loadScripts();
            onNavigate('episodes');
          }}
        />
      )}
    </div>
  );
}

interface ScriptEditorProps {
  script: Script;
  onClose: () => void;
  onSave: () => void;
}

function ScriptEditor({ script, onClose, onSave }: ScriptEditorProps) {
  const [editedScript, setEditedScript] = useState(script);
  const [acts, setActs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [lockInfo, setLockInfo] = useState<ScriptLockInfo | null>(null);

  useEffect(() => {
    loadScriptContent();
    loadLockInfo();
  }, [script.id]);

  const loadLockInfo = async () => {
    try {
      const info = await getScriptLockInfo(script.id);
      setLockInfo(info);
    } catch (error) {
      console.error('Error loading lock info:', error);
    }
  };

  const loadScriptContent = async () => {
    try {
      const { data: actsData, error: actsError } = await supabase
        .from('acts')
        .select('*')
        .eq('script_id', script.id)
        .order('act_number', { ascending: true });

      if (actsError) throw actsError;

      const actsWithScenes = await Promise.all(
        (actsData || []).map(async (act) => {
          const { data: scenesData, error: scenesError } = await supabase
            .from('scenes')
            .select('*')
            .eq('act_id', act.id)
            .order('scene_number', { ascending: true});

          if (scenesError) throw scenesError;

          return {
            ...act,
            scenes: scenesData || []
          };
        })
      );

      setActs(actsWithScenes);
    } catch (error) {
      console.error('Error loading script content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: scriptError } = await supabase
        .from('scripts')
        .update({
          title: editedScript.title,
          episode_number: editedScript.episode_number,
          season_number: editedScript.season_number,
          theme: editedScript.theme,
          synopsis: editedScript.synopsis,
          vocabulary_words: editedScript.vocabulary_words,
          runtime_minutes: editedScript.runtime_minutes,
          status: editedScript.status
        })
        .eq('id', script.id);

      if (scriptError) throw scriptError;

      for (const act of acts) {
        const { error: actError } = await supabase
          .from('acts')
          .update({
            title: act.title,
            description: act.description,
            duration: act.duration
          })
          .eq('id', act.id);

        if (actError) throw actError;

        for (const scene of act.scenes) {
          const { error: sceneError } = await supabase
            .from('scenes')
            .update({
              title: scene.title,
              description: scene.description,
              dialogue: scene.dialogue,
              duration: scene.duration,
              claymation_notes: scene.claymation_notes
            })
            .eq('id', scene.id);

          if (sceneError) throw sceneError;
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving script:', error);
      alert('Failed to save script. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAct = (actId: string) => {
    const newExpanded = new Set(expandedActs);
    if (newExpanded.has(actId)) {
      newExpanded.delete(actId);
    } else {
      newExpanded.add(actId);
    }
    setExpandedActs(newExpanded);
  };

  const updateAct = (actId: string, field: string, value: any) => {
    setActs(acts.map(act =>
      act.id === actId ? { ...act, [field]: value } : act
    ));
  };

  const updateScene = (actId: string, sceneId: string, field: string, value: any) => {
    setActs(acts.map(act =>
      act.id === actId
        ? {
            ...act,
            scenes: act.scenes.map((scene: any) =>
              scene.id === sceneId ? { ...scene, [field]: value } : scene
            )
          }
        : act
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Script</h2>
            <p className="text-sm text-gray-600">Edit script content and metadata</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {lockInfo?.locked && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lock className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Script Locked for Production</h3>
                  <p className="text-sm text-red-800 mb-2">
                    This script is locked by {lockInfo.locked_by} on {new Date(lockInfo.locked_at!).toLocaleDateString()}.
                  </p>
                  {lockInfo.associated_episodes.length > 0 && (
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">Associated Episodes:</p>
                      <ul className="list-disc list-inside">
                        {lockInfo.associated_episodes.map(ep => (
                          <li key={ep.id}>{ep.title} ({ep.status})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-red-700 mt-2">
                    Only Directors can edit locked scripts. Changes will update episode sync status.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading script...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Script Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={editedScript.title}
                      onChange={(e) => setEditedScript({ ...editedScript, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Season</label>
                    <input
                      type="number"
                      value={editedScript.season_number || ''}
                      onChange={(e) => setEditedScript({ ...editedScript, season_number: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Episode</label>
                    <input
                      type="number"
                      value={editedScript.episode_number || ''}
                      onChange={(e) => setEditedScript({ ...editedScript, episode_number: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Runtime (minutes)</label>
                    <input
                      type="number"
                      value={editedScript.runtime_minutes || 22}
                      onChange={(e) => setEditedScript({ ...editedScript, runtime_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={editedScript.status}
                      onChange={(e) => setEditedScript({ ...editedScript, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="approved">Approved</option>
                      <option value="in_production">In Production</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Theme</label>
                    <input
                      type="text"
                      value={editedScript.theme || ''}
                      onChange={(e) => setEditedScript({ ...editedScript, theme: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Synopsis</label>
                    <textarea
                      value={editedScript.synopsis || ''}
                      onChange={(e) => setEditedScript({ ...editedScript, synopsis: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vocabulary Words</label>
                    <input
                      type="text"
                      value={editedScript.vocabulary_words.join(', ')}
                      onChange={(e) => setEditedScript({
                        ...editedScript,
                        vocabulary_words: e.target.value.split(',').map(w => w.trim()).filter(Boolean)
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                      placeholder="Comma-separated words"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Acts & Scenes</h3>
                {acts.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                    <p className="text-gray-600">No acts or scenes found for this script.</p>
                  </div>
                ) : (
                  acts.map((act) => (
                    <div key={act.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div
                        className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleAct(act.id)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">Act {act.act_number}: {act.title}</h4>
                          <span className="text-gray-600">{expandedActs.has(act.id) ? '−' : '+'}</span>
                        </div>
                      </div>

                      {expandedActs.has(act.id) && (
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Act Title</label>
                            <input
                              type="text"
                              value={act.title}
                              onChange={(e) => updateAct(act.id, 'title', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea
                              value={act.description || ''}
                              onChange={(e) => updateAct(act.id, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                            />
                          </div>

                          <div className="space-y-3">
                            <h5 className="font-semibold text-gray-900">Scenes</h5>
                            {act.scenes.map((scene: any) => (
                              <div key={scene.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Scene {scene.scene_number} Title
                                    </label>
                                    <input
                                      type="text"
                                      value={scene.title}
                                      onChange={(e) => updateScene(act.id, scene.id, 'title', e.target.value)}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                                    <textarea
                                      value={scene.description || ''}
                                      onChange={(e) => updateScene(act.id, scene.id, 'description', e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Dialogue (JSON format)
                                    </label>
                                    <textarea
                                      value={JSON.stringify(scene.dialogue, null, 2)}
                                      onChange={(e) => {
                                        try {
                                          const parsed = JSON.parse(e.target.value);
                                          updateScene(act.id, scene.id, 'dialogue', parsed);
                                        } catch (err) {
                                          // Invalid JSON, don't update
                                        }
                                      }}
                                      rows={6}
                                      className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Claymation Notes
                                    </label>
                                    <textarea
                                      value={scene.claymation_notes || ''}
                                      onChange={(e) => updateScene(act.id, scene.id, 'claymation_notes', e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateEpisodeModalProps {
  script: Script;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEpisodeModal({ script, onClose, onSuccess }: CreateEpisodeModalProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [costComparison, setCostComparison] = useState<CostComparisonType | null>(null);
  const [scriptData, setScriptData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [episodeTitle, setEpisodeTitle] = useState(script.title);
  const [isMultiPart, setIsMultiPart] = useState(false);
  const [partNumber, setPartNumber] = useState(1);

  useEffect(() => {
    loadScriptAndCalculateCosts();
  }, [script.id]);

  const loadScriptAndCalculateCosts = async () => {
    try {
      setError(null);
      const validation = await validateScriptForEpisode(script.id);

      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setLoading(false);
        return;
      }

      const { script: scriptDetails, acts } = await getScriptWithDetails(script.id);

      const uniqueCharacters = new Set<string>();
      acts.forEach(act => {
        act.scenes.forEach(scene => {
          scene.dialogue.forEach(line => {
            if (line.character) {
              uniqueCharacters.add(line.character);
            }
          });
        });
      });

      const data: ScriptData = {
        runtime_minutes: scriptDetails.runtime_minutes || 22,
        acts: acts.map(act => ({
          scenes: act.scenes.map(scene => ({
            dialogue: scene.dialogue || [],
            description: scene.description || undefined,
          })),
        })),
        unique_characters: Array.from(uniqueCharacters),
      };

      setScriptData({ script: scriptDetails, acts });
      const costs = await calculateProductionCosts(data, scriptDetails.series_id);
      setCostComparison(costs);
    } catch (err) {
      console.error('Error loading script:', err);
      setError(err instanceof Error ? err.message : 'Failed to load script data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      await createEpisodeFromScript(script.id, {
        title: episodeTitle,
        isMultiPart,
        partNumber,
        createdBy: 'User',
      });

      onSuccess();
    } catch (err) {
      console.error('Error creating episode:', err);
      setError(err instanceof Error ? err.message : 'Failed to create episode');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Episode from Script</h2>
            <p className="text-sm text-gray-600">Review costs and create production episode</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Calculating costs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Cannot Create Episode</h3>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Script Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Runtime</p>
                    <p className="font-semibold text-gray-900">{scriptData?.script.runtime_minutes || 22} minutes</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Acts</p>
                    <p className="font-semibold text-gray-900">{scriptData?.acts.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Scenes</p>
                    <p className="font-semibold text-gray-900">
                      {scriptData?.acts.reduce((sum: number, act: any) => sum + act.scenes.length, 0) || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Characters</p>
                    <p className="font-semibold text-gray-900">
                      {new Set(
                        scriptData?.acts.flatMap((act: any) =>
                          act.scenes.flatMap((scene: any) =>
                            scene.dialogue.map((d: any) => d.character)
                          )
                        ) || []
                      ).size}
                    </p>
                  </div>
                </div>
              </div>

              {costComparison && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Production Cost Analysis</h3>
                  <CostComparison comparison={costComparison} showDetailed={true} />
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Episode Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Episode Title
                    </label>
                    <input
                      type="text"
                      value={episodeTitle}
                      onChange={(e) => setEpisodeTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                      placeholder="Episode title"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="multiPart"
                      checked={isMultiPart}
                      onChange={(e) => setIsMultiPart(e.target.checked)}
                      className="w-4 h-4 text-scripps-blue focus:ring-scripps-blue border-gray-300 rounded"
                    />
                    <label htmlFor="multiPart" className="text-sm font-medium text-gray-700">
                      Multi-part episode (cliff hanger or continuation)
                    </label>
                  </div>

                  {isMultiPart && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Part Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={partNumber}
                        onChange={(e) => setPartNumber(parseInt(e.target.value) || 1)}
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Important Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Creating an episode will lock the script for editing</li>
                      <li>Only Directors can modify locked scripts</li>
                      <li>The script content will be snapshotted for this episode</li>
                      <li>Cost estimates are based on current AI service pricing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || loading || !!error || !episodeTitle}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
          >
            <Film className="w-5 h-5" />
            {creating ? 'Creating Episode...' : 'Create Episode'}
          </button>
        </div>
      </div>
    </div>
  );
}
