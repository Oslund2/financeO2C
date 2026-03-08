import { useState, useEffect } from 'react';
import {
  Library,
  Search,
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
  Building2,
  Clapperboard
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import {
  getAllPromptsForOrganization,
  initializeOrganizationPrompts,
  checkIfModifiedFromDefault,
  resetPromptToDefault,
  type PromptTemplate,
  type PromptCategory
} from '../services/promptLibraryService';
import { PromptEditorModal } from './PromptEditorModal';

const CATEGORY_CONFIG: Record<PromptCategory | 'general', { label: string; icon: typeof FileText; color: string }> = {
  script: { label: 'Script Generation', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  video: { label: 'Video Generation', icon: Video, color: 'bg-green-100 text-green-700' },
  voice: { label: 'Voice & Audio', icon: Mic, color: 'bg-yellow-100 text-yellow-700' },
  storyboard: { label: 'Storyboard', icon: Layout, color: 'bg-cyan-100 text-cyan-700' },
  style: { label: 'Style & Visual', icon: Palette, color: 'bg-rose-100 text-rose-700' },
  general: { label: 'General', icon: Settings2, color: 'bg-gray-100 text-gray-700' }
};

const WORKSPACE_TYPE_CONFIG: Record<string, { label: string; icon: typeof Palette; bgColor: string; textColor: string }> = {
  claymation: { label: 'Claymation', icon: Palette, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  photoreal: { label: 'Photorealistic', icon: Film, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  documentary: { label: 'Documentary', icon: Video, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  general: { label: 'General', icon: Layers, bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
};

interface Series {
  id: string;
  name: string;
}

interface PromptLibraryProps {
  expanded?: boolean;
  onToggle?: () => void;
}

export function PromptLibrary({ expanded = false, onToggle }: PromptLibraryProps) {
  const { currentOrganization, organizations } = useOrganization();

  // Local workspace selection (independent from the global org switch)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'all'>('all');
  const [modifiedPrompts, setModifiedPrompts] = useState<Set<string>>(new Set());
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [openWithEnhance, setOpenWithEnhance] = useState(false);
  const [resettingPrompt, setResettingPrompt] = useState<string | null>(null);

  // Derive the active organization object
  const activeOrg =
    organizations.find((m) => m.organization.id === selectedOrgId)?.organization ??
    currentOrganization;

  // Seed selectedOrgId from currentOrganization on first mount
  useEffect(() => {
    if (currentOrganization && !selectedOrgId) {
      setSelectedOrgId(currentOrganization.id);
    }
  }, [currentOrganization]);

  // Fetch series whenever the selected workspace changes
  useEffect(() => {
    if (!selectedOrgId) return;
    setSelectedSeriesId(null);
    setSeries([]);
    supabase
      .from('series')
      .select('id, name')
      .eq('organization_id', selectedOrgId)
      .order('name')
      .then(({ data }) => setSeries(data ?? []));
  }, [selectedOrgId]);

  // Reload prompts when the panel is opened or the selected workspace changes
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
      const data = await getAllPromptsForOrganization(
        activeOrg.id,
        activeOrg.workspace_type
      );
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

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      prompt.prompt_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.prompt_key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedPrompts = filteredPrompts.reduce((acc, prompt) => {
    const category = prompt.category as PromptCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(prompt);
    return acc;
  }, {} as Record<PromptCategory, PromptTemplate[]>);

  const workspaceTypeConfig = activeOrg?.workspace_type
    ? WORKSPACE_TYPE_CONFIG[activeOrg.workspace_type]
    : null;
  const WorkspaceIcon = workspaceTypeConfig?.icon || Layers;

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Prompt Library</h2>
              {workspaceTypeConfig && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${workspaceTypeConfig.bgColor} ${workspaceTypeConfig.textColor}`}>
                  <WorkspaceIcon className="w-3 h-3" />
                  {workspaceTypeConfig.label}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {activeOrg?.name ?? 'Select a workspace'}{selectedSeries ? ` · ${selectedSeries.name}` : ''}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-6 h-6 text-gray-400" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-6">

          {/* ── Workspace selector ───────────────────────────── */}
          {organizations.length > 1 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Workspace</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {organizations.map(({ organization }) => {
                  const wConfig = WORKSPACE_TYPE_CONFIG[organization.workspace_type] ?? WORKSPACE_TYPE_CONFIG['general'];
                  const isActive = organization.id === selectedOrgId;
                  return (
                    <button
                      key={organization.id}
                      onClick={() => setSelectedOrgId(organization.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? `${wConfig.bgColor} ${wConfig.textColor} ring-2 ring-offset-1 ring-current`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <wConfig.icon className="w-3.5 h-3.5" />
                      {organization.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Series selector ──────────────────────────────── */}
          {series.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Series / Show</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSeriesId(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSeriesId === null
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Series
                </button>
                {series.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeriesId(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedSeriesId === s.id
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              {selectedSeries && (
                <p className="mt-2 text-xs text-gray-500">
                  Showing workspace prompts in the context of <span className="font-medium">{selectedSeries.name}</span>. Use "Enhance with AI" to tailor a prompt for this series.
                </p>
              )}
            </div>
          )}

          {/* ── Category filter + search ─────────────────────── */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as PromptCategory)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    selectedCategory === key
                      ? (CATEGORY_CONFIG[key as PromptCategory] || CATEGORY_CONFIG['general']).color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading prompts...</p>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Library className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No prompts found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-teal-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => {
                const config = CATEGORY_CONFIG[category as PromptCategory] || CATEGORY_CONFIG['general'];
                const Icon = config.icon;

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{config.label}</h3>
                      <span className="text-xs text-gray-500">({categoryPrompts.length})</span>
                    </div>

                    <div className="grid gap-3">
                      {categoryPrompts.map((prompt) => {
                        const isModified = modifiedPrompts.has(prompt.id);
                        const isResetting = resettingPrompt === prompt.id;

                        return (
                          <div
                            key={prompt.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {prompt.prompt_name}
                                  </h4>
                                  {isModified && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                      <Sparkles className="w-3 h-3" />
                                      Modified
                                    </span>
                                  )}
                                  {prompt.is_system_default && !prompt.organization_id && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                      System Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {prompt.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {prompt.version_count || 1} version
                                    {(prompt.version_count || 1) !== 1 ? 's' : ''}
                                  </span>
                                  {prompt.deployed_version && (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-green-600" />v
                                      {prompt.deployed_version.version_number} deployed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isModified && (
                                  <button
                                    onClick={() => handleResetToDefault(prompt)}
                                    disabled={isResetting}
                                    className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Reset to default"
                                  >
                                    {isResetting ? (
                                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-4 h-4" />
                                    )}
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
            </div>
          )}

          <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-teal-800">
                <p className="font-medium mb-1">AI-Powered Prompt Enhancement</p>
                <p>
                  Click <strong>Enhance with AI</strong> on any prompt to instantly open the AI
                  enhancement panel, or use <strong>Edit</strong> to make manual changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPrompt && (
        <PromptEditorModal
          prompt={selectedPrompt}
          initialSidePanel={openWithEnhance ? 'enhance' : 'none'}
          onClose={() => { setSelectedPrompt(null); setOpenWithEnhance(false); }}
          onSave={() => {
            setSelectedPrompt(null);
            setOpenWithEnhance(false);
            loadPrompts();
          }}
        />
      )}
    </div>
  );
}
