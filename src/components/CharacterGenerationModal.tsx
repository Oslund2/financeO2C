import { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, Loader2, RefreshCw, ChevronDown, Check, AlertCircle,
  User, Image as ImageIcon, Plus, Film
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { generateCharactersFromStory, type GeneratedCharacterDraft, type GeneratedEpisodeMeta } from '../services/characterGenerationService';
import { generateCharacterReferenceImage } from '../services/nanoBananaService';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotification } from '../contexts/NotificationContext';
import { useWorkspaceCapabilities } from '../hooks/useWorkspaceCapabilities';

type Character = Database['public']['Tables']['characters']['Row'];

interface CharacterGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string | null;
  existingCharacters: Character[];
  showEpisodeMeta?: boolean;
  onCharactersSaved?: (characterIds: string[]) => void;
  onEpisodeCreated?: (episodeId: string) => void;
}

interface DraftState extends GeneratedCharacterDraft {
  tempId: string;
  included: boolean;
  imageUrl?: string;
  imageLoading: boolean;
  imageError?: string;
  // editable field mirrors
  editName: string;
  editAge: string;
  editRole: 'Primary' | 'Ensemble' | 'Recurring' | 'Cameo';
  editDescription: string;
  editPersonality: string;
  editVisualFeatures: string;
  editVoiceCharacteristics: string;
  editTags: string;
  editAliases: string;
}

const ROLE_COLORS: Record<string, string> = {
  Primary: 'bg-purple-100 text-purple-800 border-purple-200',
  Ensemble: 'bg-blue-100 text-blue-800 border-blue-200',
  Recurring: 'bg-green-100 text-green-800 border-green-200',
  Cameo: 'bg-gray-100 text-gray-700 border-gray-200',
};

function makeTempId() {
  return Math.random().toString(36).slice(2);
}

function toDraft(c: GeneratedCharacterDraft): DraftState {
  return {
    ...c,
    tempId: makeTempId(),
    included: !c.isExisting,
    imageUrl: c.existingImageUrl,
    imageLoading: false,
    editName: c.name,
    editAge: c.age !== null ? String(c.age) : '',
    editRole: c.role,
    editDescription: c.description,
    editPersonality: c.personality,
    editVisualFeatures: c.required_visual_features.join(', '),
    editVoiceCharacteristics: c.voice_characteristics,
    editTags: c.tags.join(', '),
    editAliases: c.aliases.join(', '),
  };
}

export function CharacterGenerationModal({
  isOpen,
  onClose,
  seriesId,
  existingCharacters,
  showEpisodeMeta = false,
  onCharactersSaved,
  onEpisodeCreated,
}: CharacterGenerationModalProps) {
  const { currentOrganization } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const { workspaceType } = useWorkspaceCapabilities();

  const [step, setStep] = useState<'input' | 'review'>('input');
  const [storyText, setStoryText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftState[]>([]);
  const [episodeMeta, setEpisodeMeta] = useState<GeneratedEpisodeMeta>({ title: '', description: '', theme: '' });
  const [saving, setSaving] = useState(false);
  const [seriesName, setSeriesName] = useState('');
  const [seriesDescription, setSeriesDescription] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const imageGenTriggered = useRef<Set<string>>(new Set());

  // Fetch series info
  useEffect(() => {
    if (!seriesId || !isOpen) return;
    supabase
      .from('series')
      .select('name, description')
      .eq('id', seriesId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSeriesName(data.name || '');
          setSeriesDescription(data.description || '');
        }
      });
  }, [seriesId, isOpen]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setStoryText('');
      setGenerating(false);
      setGenerateError(null);
      setDrafts([]);
      setEpisodeMeta({ title: '', description: '', theme: '' });
      imageGenTriggered.current = new Set();
      setExpandedCards(new Set());
    }
  }, [isOpen]);

  // Auto-trigger image generation for new included characters after review step loads
  useEffect(() => {
    if (step !== 'review') return;
    drafts.forEach(draft => {
      if (!draft.isExisting && draft.included && !imageGenTriggered.current.has(draft.tempId)) {
        imageGenTriggered.current.add(draft.tempId);
        triggerImageGen(draft.tempId, draft.editName, draft.editDescription);
      }
    });
  }, [step, drafts]);

  const triggerImageGen = async (tempId: string, name: string, description: string) => {
    setDrafts(prev => prev.map(d => d.tempId === tempId ? { ...d, imageLoading: true, imageError: undefined } : d));
    try {
      const { imageUrl } = await generateCharacterReferenceImage(name, description, workspaceType || 'photoreal');
      setDrafts(prev => prev.map(d => d.tempId === tempId ? { ...d, imageUrl, imageLoading: false } : d));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image generation failed';
      setDrafts(prev => prev.map(d => d.tempId === tempId ? { ...d, imageLoading: false, imageError: msg } : d));
    }
  };

  const handleRegenImage = (draft: DraftState) => {
    imageGenTriggered.current.add(draft.tempId);
    triggerImageGen(draft.tempId, draft.editName, draft.editDescription);
  };

  const handleGenerate = async () => {
    if (!storyText.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    imageGenTriggered.current = new Set();
    try {
      const result = await generateCharactersFromStory(
        storyText,
        { name: seriesName, description: seriesDescription, visualStyle: workspaceType || undefined },
        existingCharacters
      );
      setDrafts(result.characters.map(toDraft));
      setEpisodeMeta(result.episodeMeta);
      setStep('review');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = (tempId: string, patch: Partial<DraftState>) => {
    setDrafts(prev => prev.map(d => d.tempId === tempId ? { ...d, ...patch } : d));
  };

  const toggleCard = (tempId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(tempId) ? next.delete(tempId) : next.add(tempId);
      return next;
    });
  };

  const newDraftsToSave = drafts.filter(d => !d.isExisting && d.included);

  const handleSave = async (createEpisode: boolean) => {
    if (!seriesId || !currentOrganization) return;
    setSaving(true);
    try {
      const savedIds: string[] = [];

      for (const draft of newDraftsToSave) {
        const { data, error } = await supabase
          .from('characters')
          .insert({
            series_id: seriesId,
            organization_id: currentOrganization.id,
            name: draft.editName.trim(),
            age: draft.editAge ? parseInt(draft.editAge) : null,
            role: draft.editRole,
            description: draft.editDescription.trim() || null,
            personality: draft.editPersonality.trim() || null,
            voice_characteristics: draft.editVoiceCharacteristics.trim() || null,
            reference_image_url: draft.imageUrl || null,
            tags: draft.editTags.split(',').map(t => t.trim()).filter(Boolean),
            aliases: draft.editAliases.split(',').map(a => a.trim()).filter(Boolean),
            required_visual_features: draft.editVisualFeatures.split(',').map(f => f.trim()).filter(Boolean),
          })
          .select('id')
          .single();

        if (error) throw new Error(`Failed to save ${draft.editName}: ${error.message}`);
        savedIds.push(data.id);
      }

      let createdEpisodeId: string | undefined;

      if (createEpisode && showEpisodeMeta && episodeMeta.title.trim()) {
        const notesLines = [episodeMeta.description, episodeMeta.theme ? `Theme: ${episodeMeta.theme}` : ''].filter(Boolean);
        const { data: ep, error: epError } = await supabase
          .from('episodes')
          .insert({
            series_id: seriesId,
            organization_id: currentOrganization.id,
            title: episodeMeta.title.trim(),
            production_notes: notesLines.join('\n\n') || null,
            status: 'planning',
          })
          .select('id')
          .single();

        if (epError) throw new Error(`Failed to create episode: ${epError.message}`);
        createdEpisodeId = ep.id;
      }

      showSuccess(
        createEpisode && createdEpisodeId ? 'Characters & Episode Created' : 'Characters Saved',
        `${savedIds.length} character${savedIds.length !== 1 ? 's' : ''} added to ${seriesName}.${createdEpisodeId ? ' Episode created.' : ''}`
      );

      onCharactersSaved?.(savedIds);
      if (createdEpisodeId) onEpisodeCreated?.(createdEpisodeId);
      onClose();
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Failed to save characters.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generate Characters from Story</h2>
              {seriesName && <p className="text-xs text-gray-500">{seriesName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* ── STEP 1: INPUT ── */}
          {step === 'input' && (
            <div className="max-w-2xl mx-auto">
              <p className="text-sm text-gray-600 mb-4">
                Paste your episode story, plot summary, or premise. AI will extract every character and generate detailed profiles, physical descriptions, personality traits, and visual consistency elements — plus a reference image for each.
              </p>
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                placeholder="In the summer of 1889 on the open range of Wyoming, homesteaders Ella Watson and Jim Averell ran a small ranch along the Sweetwater River..."
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {generateError && (
                <div className="mt-3 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {generateError}
                </div>
              )}
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!storyText.trim() || generating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing story...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Characters
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: REVIEW ── */}
          {step === 'review' && (
            <div>
              {/* Episode Meta */}
              {showEpisodeMeta && (
                <div className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Film className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-indigo-900">Episode Details</h3>
                    <span className="text-xs text-indigo-500 ml-1">— review and edit before saving</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={episodeMeta.title}
                        onChange={e => setEpisodeMeta(m => ({ ...m, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={episodeMeta.description}
                        onChange={e => setEpisodeMeta(m => ({ ...m, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Theme</label>
                      <input
                        type="text"
                        value={episodeMeta.theme}
                        onChange={e => setEpisodeMeta(m => ({ ...m, theme: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Summary bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {drafts.length} character{drafts.length !== 1 ? 's' : ''} found
                  </span>
                  <span className="text-xs text-gray-500">
                    {newDraftsToSave.length} new · {drafts.filter(d => d.isExisting).length} already in series
                  </span>
                </div>
                <button
                  onClick={() => { setStep('input'); imageGenTriggered.current = new Set(); }}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Edit story
                </button>
              </div>

              {/* Character Cards */}
              <div className="space-y-3">
                {drafts.map(draft => (
                  <CharacterCard
                    key={draft.tempId}
                    draft={draft}
                    expanded={expandedCards.has(draft.tempId)}
                    onToggleExpand={() => toggleCard(draft.tempId)}
                    onUpdate={patch => updateDraft(draft.tempId, patch)}
                    onRegenImage={() => handleRegenImage(draft)}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  {newDraftsToSave.length === 0
                    ? 'No new characters selected to save.'
                    : `${newDraftsToSave.length} character${newDraftsToSave.length !== 1 ? 's' : ''} will be added to ${seriesName}.`}
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    Cancel
                  </button>
                  {showEpisodeMeta && (
                    <button
                      onClick={() => handleSave(true)}
                      disabled={saving || newDraftsToSave.length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save & Create Episode
                    </button>
                  )}
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving || newDraftsToSave.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Characters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Character Card ──────────────────────────────────────────────────────────

interface CharacterCardProps {
  draft: DraftState;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<DraftState>) => void;
  onRegenImage: () => void;
}

function CharacterCard({ draft, expanded, onToggleExpand, onUpdate, onRegenImage }: CharacterCardProps) {
  const roleColor = ROLE_COLORS[draft.editRole] || ROLE_COLORS.Ensemble;

  return (
    <div className={`border rounded-xl transition-all ${draft.included ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
      {/* Card Header — always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Include toggle */}
        {!draft.isExisting && (
          <button
            onClick={() => onUpdate({ included: !draft.included })}
            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
              draft.included ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
            }`}
          >
            {draft.included && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
          {draft.imageLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : draft.imageUrl ? (
            <img src={draft.imageUrl} alt={draft.editName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm truncate">{draft.editName}</span>
            {draft.editAge && <span className="text-xs text-gray-400">age {draft.editAge}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColor}`}>{draft.editRole}</span>
            {draft.isExisting && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                Already in series
              </span>
            )}
          </div>
          {!expanded && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{draft.editPersonality || draft.editDescription}</p>
          )}
        </div>

        {/* Expand toggle */}
        {!draft.isExisting && (
          <button
            onClick={onToggleExpand}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Expanded edit panel */}
      {expanded && !draft.isExisting && (
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: fields */}
            <div className="lg:col-span-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={draft.editName}
                    onChange={e => onUpdate({ editName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Age</label>
                  <input
                    type="number"
                    value={draft.editAge}
                    onChange={e => onUpdate({ editAge: e.target.value })}
                    placeholder="—"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={draft.editRole}
                  onChange={e => onUpdate({ editRole: e.target.value as DraftState['editRole'] })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {['Primary', 'Ensemble', 'Recurring', 'Cameo'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Physical Description</label>
                <textarea
                  value={draft.editDescription}
                  onChange={e => onUpdate({ editDescription: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Personality Traits</label>
                <textarea
                  value={draft.editPersonality}
                  onChange={e => onUpdate({ editPersonality: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Visual Consistency Elements
                  <span className="font-normal text-gray-400 ml-1">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={draft.editVisualFeatures}
                  onChange={e => onUpdate({ editVisualFeatures: e.target.value })}
                  placeholder="red neckerchief, silver pocket watch, wide-brim hat"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Voice Characteristics</label>
                <input
                  type="text"
                  value={draft.editVoiceCharacteristics}
                  onChange={e => onUpdate({ editVoiceCharacteristics: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Aliases <span className="font-normal text-gray-400">(comma-separated)</span></label>
                  <input
                    type="text"
                    value={draft.editAliases}
                    onChange={e => onUpdate({ editAliases: e.target.value })}
                    placeholder="Cattle Kate"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tags <span className="font-normal text-gray-400">(comma-separated)</span></label>
                  <input
                    type="text"
                    value={draft.editTags}
                    onChange={e => onUpdate({ editTags: e.target.value })}
                    placeholder="homesteader, 1889, wyoming"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* Right: image */}
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-medium text-gray-600">Reference Image</label>
              <div className="aspect-square w-full bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
                {draft.imageLoading ? (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs">Generating...</span>
                  </div>
                ) : draft.imageUrl ? (
                  <img src={draft.imageUrl} alt={draft.editName} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs">{draft.imageError ? 'Generation failed' : 'No image yet'}</span>
                  </div>
                )}
              </div>
              {draft.imageError && (
                <p className="text-xs text-red-500 text-center">{draft.imageError}</p>
              )}
              <button
                onClick={onRegenImage}
                disabled={draft.imageLoading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${draft.imageLoading ? 'animate-spin' : ''}`} />
                {draft.imageLoading ? 'Generating...' : 'Regenerate Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
