import { useState, useEffect } from 'react';
import {
  Library,
  ChevronDown,
  ChevronUp,
  FileText,
  Video,
  Mic,
  Layout,
  Palette,
  Settings2,
  RotateCcw,
  Edit3,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Film,
  Layers,
  Wand2,
  ChevronDown as SelectChevron,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import {
  getAllPromptsForOrganization,
  initializeOrganizationPrompts,
  checkIfModifiedFromDefault,
  resetPromptToDefault,
  type PromptTemplate,
  type PromptCategory,
} from '../services/promptLibraryService';
import {
  getWorkspaceMission,
  getSeriesMission,
} from '../services/missionService';
import {
  generatePromptsForWorkspace,
  type GenerationProgressCallback,
} from '../services/aiPromptGenerationService';
import { PromptEditorModal } from './PromptEditorModal';

const CATEGORY_CONFIG: Record<PromptCategory | 'general', { label: string; icon: typeof FileText; color: string }> = {
  script:     { label: 'Script Generation', icon: FileText,  color: 'bg-blue-100 text-blue-700' },
  video:      { label: 'Video Generation',  icon: Video,     color: 'bg-green-100 text-green-700' },
  voice:      { label: 'Voice & Audio',     icon: Mic,       color: 'bg-yellow-100 text-yellow-700' },
  storyboard: { label: 'Storyboard',        icon: Layout,    color: 'bg-cyan-100 text-cyan-700' },
  style:      { label: 'Style & Visual',    icon: Palette,   color: 'bg-rose-100 text-rose-700' },
  general:    { label: 'General',           icon: Settings2, color: 'bg-gray-100 text-gray-700' },
};

const WORKSPACE_TYPE_CONFIG: Record<string, { label: string; icon: typeof Layers }> = {
  claymation:  { label: 'Claymation',       icon: Palette },
  photoreal:   { label: 'Photorealistic',   icon: Film },
  documentary: { label: 'Documentary',      icon: Video },
  general:     { label: 'General',          icon: Layers },
};

interface Series {
  id: string;
  name: string;
}

interface PromptLibraryProps {
  expanded?: boolean;
  onToggle?: () => void;
}

// ── Generation progress UI state ─────────────────────────────────────────────
interface GenState {
  active: boolean;
  phase: 'thinking' | 'saving' | 'done' | 'error';
  message: string;
  progress: number;     // 0–100
}

const GEN_IDLE: GenState = { active: false, phase: 'thinking', message: '', progress: 0 };

export function PromptLibrary({ expanded = false, onToggle }: PromptLibraryProps) {
  const { currentOrganization, organizations } = useOrganization();

  const [selectedOrgId, setSelectedOrgId]       = useState<string>('');
  const [series, setSeries]                      = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId]  = useState<string>('');

  const [prompts, setPrompts]                    = useState<PromptTemplate[]>([]);
  const [loading, setLoading]                    = useState(false);
  const [error, setError]                        = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory]  = useState<PromptCategory | 'all'>('all');
  const [modifiedPrompts, setModifiedPrompts]    = useState<Set<string>>(new Set());
  const [selectedPrompt, setSelectedPrompt]      = useState<PromptTemplate | null>(null);
  const [openWithEnhance, setOpenWithEnhance]    = useState(false);
  const [resettingPrompt, setResettingPrompt]    = useState<string | null>(null);
  const [genState, setGenState]                  = useState<GenState>(GEN_IDLE);

  // Active org object derived from selection
  const activeOrg =
    organizations.find((m) => m.organization.id === selectedOrgId)?.organization ??
    currentOrganization;

  // Seed selection from currentOrganization on mount
  useEffect(() => {
    if (currentOrganization && !selectedOrgId) {
      setSelectedOrgId(currentOrganization.id);
    }
  }, [currentOrganization]);

  // Fetch series when workspace changes
  useEffect(() => {
    if (!selectedOrgId) return;
    setSelectedSeriesId('');
    setSeries([]);
    supabase
      .from('series')
      .select('id, name')
      .eq('organization_id', selectedOrgId)
      .order('name')
      .then(({ data }) => setSeries(data ?? []));
  }, [selectedOrgId]);

  // Load prompts when panel opens or workspace changes
  useEffect(() => {
    if (expanded && activeOrg) {
      loadPrompts();
    }
  }, [expanded, selectedOrgId, activeOrg?.id]);

  const loadPrompts = async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      await initializeOrganizationPrompts(activeOrg.id);
      const data = await getAllPromptsForOrganization(activeOrg.id, activeOrg.workspace_type);
      setPrompts(data);

      const modified = new Set<string>();
      for (const prompt of data) {
        if (prompt.organization_id) {
          const isModified = await checkIfModifiedFromDefault(activeOrg.id, prompt.prompt_key);
          if (isModified) modified.add(prompt.id);
        }
      }
      setModifiedPrompts(modified);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  // ── AI generation ───────────────────────────────────────────────────────────
  const handleGenerateWithAI = async () => {
    if (!activeOrg) return;
    setGenState({ active: true, phase: 'thinking', message: 'Starting AI generation…', progress: 5 });
    setError(null);

    try {
      const onProgress: GenerationProgressCallback = (phase, message, progress = 0) => {
        setGenState({ active: true, phase, message, progress });
      };

      const mission      = await getWorkspaceMission(activeOrg.id);
      const seriesMission = selectedSeriesId ? await getSeriesMission(selectedSeriesId) : null;

      const result = await generatePromptsForWorkspace(
        activeOrg.id,
        activeOrg.workspace_type,
        mission,
        seriesMission,
        onProgress
      );

      if (result.errors.length > 0) {
        setError(`Generated ${result.generated} prompts. Some failed: ${result.errors.join('; ')}`);
      }

      setGenState({ active: false, phase: 'done', message: '', progress: 100 });
      await loadPrompts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      setGenState({ active: false, phase: 'error', message: msg, progress: 0 });
      setError(msg);
    }
  };

  const handleResetToDefault = async (prompt: PromptTemplate) => {
    if (!activeOrg) return;
    setResettingPrompt(prompt.id);
    try {
      await resetPromptToDefault(activeOrg.id, prompt.prompt_key);
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset prompt');
    } finally {
      setResettingPrompt(null);
    }
  };

  const openEditor = (prompt: PromptTemplate, withEnhance = false) => {
    setOpenWithEnhance(withEnhance);
    setSelectedPrompt(prompt);
  };

  const filteredPrompts = prompts.filter((p) =>
    selectedCategory === 'all' || p.category === selectedCategory
  );

  const groupedPrompts = filteredPrompts.reduce((acc, prompt) => {
    const cat = prompt.category as PromptCategory;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(prompt);
    return acc;
  }, {} as Record<PromptCategory, PromptTemplate[]>);

  const wsConfig = activeOrg?.workspace_type
    ? WORKSPACE_TYPE_CONFIG[activeOrg.workspace_type]
    : null;
  const WsIcon = wsConfig?.icon ?? Layers;

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);
  const subtitle = [activeOrg?.name, selectedSeries?.name].filter(Boolean).join(' · ');

  // ── Whether to show the AI generate CTA ────────────────────────────────────
  const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const isEmpty = !loading && prompts.length === 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">

      {/* ── Collapsible header ──────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">Prompt Library</h2>
            <p className="text-sm text-gray-600">
              {subtitle || 'Select a workspace to manage prompts'}
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-6 h-6 text-gray-400" />
          : <ChevronDown className="w-6 h-6 text-gray-400" />}
      </button>

      {/* ── Expanded body ───────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-200 p-6 space-y-5">

          {/* ── Selectors row ─────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-4">

            {/* Workspace dropdown */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Workspace
              </label>
              <div className="relative">
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer"
                >
                  {organizations.map(({ organization }) => {
                    const wc = WORKSPACE_TYPE_CONFIG[organization.workspace_type] ?? WORKSPACE_TYPE_CONFIG['general'];
                    return (
                      <option key={organization.id} value={organization.id}>
                        {organization.name} ({wc.label})
                      </option>
                    );
                  })}
                </select>
                <SelectChevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Series dropdown */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Series / Show
              </label>
              <div className="relative">
                <select
                  value={selectedSeriesId}
                  onChange={(e) => setSelectedSeriesId(e.target.value)}
                  disabled={series.length === 0}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">— All series —</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <SelectChevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Series context hint */}
          {selectedSeries && (
            <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
              Viewing workspace prompts in the context of <strong>{selectedSeries.name}</strong>.
              Use <strong>Enhance with AI</strong> on any prompt to tailor it for this series, or use
              <strong> Generate from Mission</strong> below to create a full series-specific prompt set.
            </p>
          )}

          {/* ── Workspace type badge + category pills ─────────── */}
          <div className="flex flex-wrap items-center gap-2">
            {wsConfig && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                <WsIcon className="w-3.5 h-3.5" />
                {wsConfig.label} workspace
              </span>
            )}
            <div className="h-5 w-px bg-gray-200 mx-1" />
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All categories
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as PromptCategory)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  selectedCategory === key
                    ? (CATEGORY_CONFIG[key as PromptCategory] ?? CATEGORY_CONFIG['general']).color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Error banner ──────────────────────────────────── */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* ── Generation progress bar ───────────────────────── */}
          {genState.active && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-600 animate-pulse" />
                <span className="text-sm font-medium text-purple-800">{genState.message}</span>
              </div>
              <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${genState.progress}%` }}
                />
              </div>
              <p className="text-xs text-purple-600">
                {genState.phase === 'thinking'
                  ? 'Claude is reading your Mission Control guidelines and crafting tailored prompts…'
                  : 'Saving to your prompt library…'}
              </p>
            </div>
          )}

          {/* ── Prompt list ───────────────────────────────────── */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading prompts…</p>
            </div>
          ) : isEmpty && !genState.active ? (
            /* ── Empty state with AI generation CTA ─────────── */
            <div className="text-center py-10 space-y-5">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto">
                <Wand2 className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No prompts yet</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Generate a full set of production prompts tailored to your{' '}
                  <strong>{wsConfig?.label ?? activeOrg?.workspace_type}</strong> workspace
                  {selectedSeries ? ` and the "${selectedSeries.name}" series` : ''} using your
                  Mission Control guidelines.
                </p>
              </div>

              {hasApiKey ? (
                <button
                  onClick={handleGenerateWithAI}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <Wand2 className="w-5 h-5" />
                  Generate from Mission
                </button>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 max-w-sm mx-auto text-left">
                  <strong>VITE_GEMINI_API_KEY</strong> is not set.
                  Add your Gemini API key to <code>.env</code> to enable AI prompt generation.
                </div>
              )}

              <p className="text-xs text-gray-400">
                Or{' '}
                <button
                  onClick={loadPrompts}
                  className="underline hover:text-gray-600"
                >
                  reload
                </button>{' '}
                if prompts were recently added elsewhere.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => {
                const config = CATEGORY_CONFIG[category as PromptCategory] ?? CATEGORY_CONFIG['general'];
                const Icon = config.icon;
                return (
                  <div key={category}>
                    {/* Category header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-md ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{config.label}</h3>
                      <span className="text-xs text-gray-400">({categoryPrompts.length})</span>
                    </div>

                    {/* Prompt cards */}
                    <div className="grid gap-3">
                      {categoryPrompts.map((prompt) => {
                        const isModified  = modifiedPrompts.has(prompt.id);
                        const isResetting = resettingPrompt === prompt.id;

                        return (
                          <div
                            key={prompt.id}
                            className="border border-gray-200 rounded-xl p-4 hover:border-teal-200 hover:shadow-sm transition-all bg-white"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {prompt.prompt_name}
                                  </h4>
                                  {isModified && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full shrink-0">
                                      <Sparkles className="w-3 h-3" />
                                      Modified
                                    </span>
                                  )}
                                  {prompt.is_system_default && !prompt.organization_id && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full shrink-0">
                                      System Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2">
                                  {prompt.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {prompt.version_count || 1} version{(prompt.version_count || 1) !== 1 ? 's' : ''}
                                  </span>
                                  {prompt.deployed_version && (
                                    <span className="flex items-center gap-1 text-green-600">
                                      <CheckCircle className="w-3 h-3" />
                                      v{prompt.deployed_version.version_number} deployed
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isModified && (
                                  <button
                                    onClick={() => handleResetToDefault(prompt)}
                                    disabled={isResetting}
                                    title="Reset to default"
                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {isResetting
                                      ? <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                      : <RotateCcw className="w-4 h-4" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => openEditor(prompt, false)}
                                  className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => openEditor(prompt, true)}
                                  className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Enhance with AI
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Re-generate CTA at bottom when prompts exist */}
              {hasApiKey && (
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={handleGenerateWithAI}
                    disabled={genState.active}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Wand2 className="w-4 h-4" />
                    Re-generate from Mission
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Editor modal ─────────────────────────────────────────── */}
      {selectedPrompt && (
        <PromptEditorModal
          prompt={selectedPrompt}
          initialSidePanel={openWithEnhance ? 'enhance' : 'none'}
          onClose={() => { setSelectedPrompt(null); setOpenWithEnhance(false); }}
          onSave={() => { setSelectedPrompt(null); setOpenWithEnhance(false); loadPrompts(); }}
        />
      )}
    </div>
  );
}
