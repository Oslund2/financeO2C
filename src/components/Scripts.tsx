import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Edit2, CheckCircle, Clock, Sparkles, Lock, Film, AlertCircle, DollarSign, ArrowRight, Zap, X, Eye, Filter, PlayCircle, Copyright } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ScriptViewerModal } from './ScriptViewerModal';
import { getScriptLockInfo, type ScriptLockInfo } from '../services/scriptLockingService';
import { createEpisodeFromScript, getScriptWithDetails, validateScriptForEpisode } from '../services/episodeCreationService';
import { calculateProductionCosts, type CostComparison as CostComparisonType, type ScriptData } from '../services/costCalculationService';
import { CostComparison } from './CostComparison';
import { useNotification } from '../contexts/NotificationContext';
import { FormatBadge } from './FormatSelector';

type Script = Database['public']['Tables']['scripts']['Row'];

interface ScriptsProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
}

export function Scripts({ seriesId, onNavigate }: ScriptsProps) {
  const { showSuccess, showError } = useNotification();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<Script[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ai' | 'manual'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [viewingScript, setViewingScript] = useState<Script | null>(null);
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
    let filtered = scripts;

    if (filterType === 'ai') {
      filtered = filtered.filter(s => s.ai_generated);
    } else if (filterType === 'manual') {
      filtered = filtered.filter(s => !s.ai_generated);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (script) =>
          script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          script.synopsis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          script.theme?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredScripts(filtered);
  }, [searchQuery, scripts, filterType]);

  const loadScripts = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_scripts_with_lock_info', {
          p_series_id: seriesId || null,
          p_organization_id: null
        });

      if (error) throw error;

      const scriptList = (data || []).map((s: any) => ({
        id: s.id,
        series_id: s.series_id,
        organization_id: s.organization_id,
        title: s.title,
        episode_number: s.episode_number,
        season_number: s.season_number,
        runtime_minutes: s.runtime_minutes,
        synopsis: s.synopsis,
        theme: s.theme,
        vocabulary_words: s.vocabulary_words || [],
        status: s.status,
        ai_generated: s.ai_generated,
        generation_prompt: s.generation_prompt,
        content: s.content,
        format: s.format,
        format_type: s.format_type,
        program_length_minutes: s.program_length_minutes,
        version: s.version,
        locked: s.locked,
        locked_by: s.locked_by,
        locked_at: s.locked_at,
        created_by: s.created_by,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      setScripts(scriptList);

      const locks = new Map<string, ScriptLockInfo>();
      const episodes = new Map<string, number>();

      (data || []).forEach((script: any) => {
        const associatedEpisodes = script.associated_episodes || [];
        locks.set(script.id, {
          locked: script.locked || false,
          locked_by: script.locked_by,
          locked_at: script.locked_at,
          associated_episodes: associatedEpisodes,
        });
        episodes.set(script.id, script.episode_count || 0);
      });

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
        .from('script_acts')
        .select('*', { count: 'exact', head: true })
        .eq('script_id', script.id);

      if (actsCount) {
        relatedItems.push({ label: 'Acts', count: actsCount });
      }

      const { data: actsData } = await supabase
        .from('script_acts')
        .select('id')
        .eq('script_id', script.id);

      const actIds = (actsData || []).map(a => a.id);

      if (actIds.length > 0) {
        const { count: scenesCount } = await supabase
          .from('script_scenes')
          .select('*', { count: 'exact', head: true })
          .in('act_id', actIds);

        if (scenesCount) {
          relatedItems.push({ label: 'Scenes', count: scenesCount });
        }
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
      showSuccess('Script Approved', 'Script is now ready for episode creation');
    } catch (error) {
      console.error('Error approving script:', error);
      showError('Approval Failed', 'Could not approve script. Please try again.');
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

  const isRecentScript = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  const aiGeneratedCount = scripts.filter(s => s.ai_generated).length;
  const manualScriptsCount = scripts.filter(s => !s.ai_generated).length;

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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Scripts</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage episode scripts and storylines</p>
          </div>
          <button
            onClick={() => onNavigate('ai-studio')}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm sm:text-base w-full sm:w-auto active:scale-95"
          >
            <Sparkles className="w-5 h-5" />
            Generate with AI
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
          <div className="relative mb-3 sm:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-sm sm:text-base"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-1">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">Filter:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                  filterType === 'all'
                    ? 'bg-scripps-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({scripts.length})
              </button>
              <button
                onClick={() => setFilterType('ai')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                  filterType === 'ai'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">AI</span> ({aiGeneratedCount})
              </button>
              <button
                onClick={() => setFilterType('manual')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                  filterType === 'manual'
                    ? 'bg-scripps-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manual ({manualScriptsCount})
              </button>
            </div>
          </div>
        </div>

        {(() => {
          const approvedScripts = scripts.filter(s => s.status === 'approved' && !scriptLocks.get(s.id)?.locked);
          const draftScripts = scripts.filter(s => s.status === 'draft');

          if (approvedScripts.length > 0 || draftScripts.length > 0) {
            return (
              <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
                {approvedScripts.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Film className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900">Ready to Produce</h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {approvedScripts.length} approved script{approvedScripts.length !== 1 ? 's' : ''} ready
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:block text-right">
                        <div className="text-xs text-gray-600 mb-1">Next Step</div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                          <span>Create Episode</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      {approvedScripts.slice(0, 6).map((script) => (
                        <div
                          key={script.id}
                          className="bg-white rounded-lg p-3 sm:p-4 border border-green-200 hover:border-green-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{script.title}</h4>
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                          </div>
                          <div className="text-xs text-gray-600 mb-2 sm:mb-3">
                            S{script.season_number}E{script.episode_number} • {script.runtime_minutes} min
                          </div>
                          <button
                            onClick={() => setCreateEpisodeModal({ isOpen: true, script })}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm active:scale-95"
                          >
                            <Film className="w-4 h-4" />
                            Create
                          </button>
                        </div>
                      ))}
                    </div>
                    {approvedScripts.length > 6 && (
                      <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-600">
                        +{approvedScripts.length - 6} more below
                      </div>
                    )}
                  </div>
                )}

                {draftScripts.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Workflow Tip</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 mb-2">
                      <span className="font-semibold text-blue-700">{draftScripts.length} draft{draftScripts.length !== 1 ? 's' : ''}</span> need approval before creating episodes.
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-600">
                      <span className="px-2 py-0.5 bg-gray-200 rounded">Draft</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="px-2 py-0.5 bg-blue-200 rounded">Approved</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="px-2 py-0.5 bg-green-200 rounded">Episode</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}

        {filteredScripts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-12 text-center border border-gray-200">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-scripps-blue" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No scripts yet</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">Generate your first episode script with AI</p>
            <button
              onClick={() => onNavigate('ai-studio')}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm sm:text-base active:scale-95"
            >
              Generate Script
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredScripts.map((script) => (
              <div
                key={script.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 p-4 sm:p-6"
              >
                <div className="flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate">{script.title}</h3>
                        {isRecentScript(script.created_at) && (
                          <div className="px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold animate-pulse flex-shrink-0">
                            NEW
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:hidden flex-shrink-0">
                        <button
                          onClick={() => setViewingScript(script)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setSelectedScript(script)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <div className={`flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs border ${getStatusColor(script.status)}`}>
                        {getStatusIcon(script.status)}
                        <span className="font-medium">{script.status}</span>
                      </div>
                      {script.ai_generated && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
                          <Sparkles className="w-3 h-3" />
                          <span className="font-medium hidden sm:inline">AI Generated</span>
                          <span className="font-medium sm:hidden">AI</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                      {script.season_number && script.episode_number && (
                        <span>S{script.season_number}E{script.episode_number}</span>
                      )}
                      <span>{script.runtime_minutes} min</span>
                      {(script as any).format_type && (
                        <FormatBadge
                          formatType={(script as any).format_type}
                          programMinutes={(script as any).program_length_minutes || script.runtime_minutes}
                        />
                      )}
                      {script.theme && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs hidden sm:inline">{script.theme}</span>
                      )}
                    </div>

                    {script.synopsis && (
                      <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3 line-clamp-2">{script.synopsis}</p>
                    )}

                    {script.vocabulary_words.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3 hidden sm:flex">
                        <span className="text-xs font-semibold text-gray-600">Vocab:</span>
                        {script.vocabulary_words.slice(0, 3).map((word, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 font-medium"
                          >
                            {word}
                          </span>
                        ))}
                        {script.vocabulary_words.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                            +{script.vocabulary_words.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 mb-3 sm:mb-0">
                      <span>{new Date(script.created_at).toLocaleDateString()}</span>
                      {scriptLocks.get(script.id)?.locked && (
                        <div className="flex items-center gap-1 text-red-600">
                          <Lock className="w-3 h-3" />
                          <span className="font-medium">Locked</span>
                        </div>
                      )}
                      {episodeCounts.get(script.id)! > 0 && (
                        <button
                          onClick={() => onNavigate('episodes', { highlightScriptId: script.id })}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Film className="w-3 h-3" />
                          <span className="font-medium">{episodeCounts.get(script.id)} Ep{episodeCounts.get(script.id)! > 1 ? 's' : ''}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t border-gray-200 mt-2 sm:mt-4">
                    {script.status === 'draft' && !scriptLocks.get(script.id)?.locked && (
                      <>
                        <button
                          onClick={() => handleApproveScript(script.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex-1 sm:flex-initial active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleApproveAndCreateEpisode(script)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm flex-1 sm:flex-initial active:scale-95"
                        >
                          <Zap className="w-4 h-4" />
                          <span className="hidden sm:inline">Quick Create</span>
                          <span className="sm:hidden">Quick</span>
                        </button>
                      </>
                    )}
                    {script.status === 'approved' && !scriptLocks.get(script.id)?.locked && (
                      <>
                        <button
                          onClick={() => onNavigate('production', { scriptId: script.id })}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex-1 sm:flex-initial active:scale-95"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Shot List</span>
                          <span className="sm:hidden">Shots</span>
                        </button>
                        <button
                          onClick={() => setCreateEpisodeModal({ isOpen: true, script })}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex-1 sm:flex-initial active:scale-95"
                        >
                          <Film className="w-4 h-4" />
                          <span className="hidden sm:inline">Create Episode</span>
                          <span className="sm:hidden">Episode</span>
                        </button>
                      </>
                    )}
                    {episodeCounts.get(script.id)! > 0 && (
                      <button
                        onClick={() => onNavigate('episodes', { highlightScriptId: script.id })}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm flex-1 sm:flex-initial active:scale-95"
                      >
                        <Film className="w-4 h-4" />
                        <span className="hidden sm:inline">View Episodes</span>
                        <span className="sm:hidden">Episodes</span>
                      </button>
                    )}
                    <button
                      onClick={() => setViewingScript(script)}
                      className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => setSelectedScript(script)}
                      className="hidden sm:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        showSuccess(`"${script.title}" ready for copyright registration. Navigate to IP Protection to complete.`);
                      }}
                      className="hidden sm:flex p-2 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Register Copyright"
                    >
                      <Copyright className="w-5 h-5 text-teal-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(script)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
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

      {viewingScript && (
        <ScriptViewerModal
          script={viewingScript}
          onClose={() => setViewingScript(null)}
          onEdit={() => {
            setSelectedScript(viewingScript);
            setViewingScript(null);
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
  const { showSuccess, showError } = useNotification();
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
      const { data, error } = await supabase
        .rpc('get_script_acts_with_scenes', { p_script_id: script.id });

      if (error) throw error;

      const actsWithScenes = (data || []).map((act: any) => ({
        id: act.id,
        script_id: act.script_id,
        act_number: act.act_number,
        content: act.content,
        duration_estimate: act.duration_estimate,
        notes: act.notes,
        created_at: act.created_at,
        updated_at: act.updated_at,
        scenes: (act.scenes || []).map((scene: any) => ({
          id: scene.id,
          act_id: scene.act_id,
          scene_number: scene.scene_number,
          setting: scene.setting,
          description: scene.description,
          dialogue: scene.dialogue || [],
          stage_directions: scene.stage_directions,
          characters: scene.characters || [],
          duration_estimate: scene.duration_estimate,
          created_at: scene.created_at,
          updated_at: scene.updated_at,
        }))
      }));

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
          .from('script_acts')
          .update({
            content: act.content,
            duration_estimate: act.duration_estimate,
            notes: act.notes
          })
          .eq('id', act.id);

        if (actError) throw actError;

        for (const scene of act.scenes) {
          const { error: sceneError } = await supabase
            .from('script_scenes')
            .update({
              setting: scene.setting,
              description: scene.description,
              dialogue: scene.dialogue,
              stage_directions: scene.stage_directions,
              duration_estimate: scene.duration_estimate
            })
            .eq('id', scene.id);

          if (sceneError) throw sceneError;
        }
      }

      showSuccess('Script Saved', 'All changes have been saved');
      onSave();
    } catch (error) {
      console.error('Error saving script:', error);
      showError('Save Failed', 'Could not save script. Please try again.');
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

  const handleCreateAct = async () => {
    try {
      const newActNumber = acts.length > 0 ? Math.max(...acts.map(a => a.act_number)) + 1 : 1;

      const { data: newAct, error } = await supabase
        .from('script_acts')
        .insert([{
          script_id: script.id,
          act_number: newActNumber,
          content: '',
          notes: `Act ${newActNumber}`,
          duration_estimate: 0
        }])
        .select()
        .single();

      if (error) throw error;

      setActs([...acts, { ...newAct, scenes: [] }]);
      setExpandedActs(new Set([...expandedActs, newAct.id]));
      showSuccess('Act Created', `Act ${newActNumber} has been added`);
    } catch (error) {
      console.error('Error creating act:', error);
      showError('Creation Failed', 'Could not create act. Please try again.');
    }
  };

  const handleDeleteAct = async (actId: string) => {
    const act = acts.find(a => a.id === actId);
    if (!act) return;

    if (act.scenes.length > 0) {
      const confirmed = confirm(
        `This act has ${act.scenes.length} scene${act.scenes.length > 1 ? 's' : ''}. Deleting it will also delete all scenes. Continue?`
      );
      if (!confirmed) return;
    }

    try {
      const { error } = await supabase
        .from('script_acts')
        .delete()
        .eq('id', actId);

      if (error) throw error;

      setActs(acts.filter(a => a.id !== actId));
      showSuccess('Act Deleted', 'The act has been removed');
    } catch (error) {
      console.error('Error deleting act:', error);
      showError('Deletion Failed', 'Could not delete act. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Script</h2>
            <p className="text-sm text-gray-600">Edit script content and metadata</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Acts & Scenes</h3>
                  <button
                    onClick={handleCreateAct}
                    className="flex items-center gap-2 px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Act
                  </button>
                </div>
                {acts.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                    <p className="text-gray-600 mb-3">No acts or scenes found for this script.</p>
                    <button
                      onClick={handleCreateAct}
                      className="px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
                    >
                      Create First Act
                    </button>
                  </div>
                ) : (
                  acts.map((act) => (
                    <div key={act.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => toggleAct(act.id)}
                          >
                            <h4 className="font-semibold text-gray-900">Act {act.act_number} {act.notes ? `- ${act.notes}` : ''}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-600">{act.scenes?.length || 0} scenes</span>
                              {act.duration_estimate > 0 && (
                                <span className="text-sm text-gray-600">~{Math.floor(act.duration_estimate / 60)}m {act.duration_estimate % 60}s</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleAct(act.id)}
                              className="p-2 hover:bg-gray-200 rounded transition-colors"
                            >
                              <span className="text-gray-600">{expandedActs.has(act.id) ? '−' : '+'}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAct(act.id);
                              }}
                              className="p-2 hover:bg-red-100 rounded transition-colors"
                              title="Delete act"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedActs.has(act.id) && (
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Act Title</label>
                            <input
                              type="text"
                              value={act.notes || ''}
                              onChange={(e) => updateAct(act.id, 'notes', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                              placeholder="e.g., Setup, Confrontation, Resolution"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                            <textarea
                              value={act.content || ''}
                              onChange={(e) => updateAct(act.id, 'content', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                              placeholder="Act description and key plot points..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (seconds)</label>
                            <input
                              type="number"
                              value={act.duration_estimate || 0}
                              onChange={(e) => updateAct(act.id, 'duration_estimate', parseInt(e.target.value) || 0)}
                              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                            />
                          </div>

                          <div className="space-y-3">
                            <h5 className="font-semibold text-gray-900">Scenes</h5>
                            {act.scenes.map((scene: any) => (
                              <div key={scene.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Scene {scene.scene_number} Setting
                                    </label>
                                    <input
                                      type="text"
                                      value={scene.setting || ''}
                                      onChange={(e) => updateScene(act.id, scene.id, 'setting', e.target.value)}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                                      placeholder="Location/setting"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                                    <textarea
                                      value={scene.description || ''}
                                      onChange={(e) => updateScene(act.id, scene.id, 'description', e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                                      placeholder="What happens in this scene..."
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
                                      Stage Directions
                                    </label>
                                    <textarea
                                      value={scene.stage_directions || ''}
                                      onChange={(e) => updateScene(act.id, scene.id, 'stage_directions', e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                                      placeholder="Production notes and stage directions..."
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Duration (seconds)
                                    </label>
                                    <input
                                      type="number"
                                      value={scene.duration_estimate || 0}
                                      onChange={(e) => updateScene(act.id, scene.id, 'duration_estimate', parseInt(e.target.value) || 0)}
                                      className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Episode from Script</h2>
            <p className="text-sm text-gray-600">Review costs and create production episode</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
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
