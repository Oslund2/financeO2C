import { useState, useEffect } from 'react';
import {
  X,
  Users,
  CheckCircle,
  AlertCircle,
  Link2,
  Unlink,
  RefreshCw,
  Wand2,
  ChevronRight,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { ReferenceBrowser, type ReferenceImage, type AssetType } from './shared/ReferenceBrowser';
import { CharacterImage } from './CharacterImage';
import {
  getStoryboardReferenceSummary,
  linkCharacterToReference,
  linkAssetToReference,
  clearCharacterReference,
  refreshStoryboardReferences,
  type CharacterReferenceWithDetails,
  type StoryboardCharacterSummary
} from '../services/storyboardReferenceService';

type Asset = Database['public']['Tables']['assets']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface StoryboardReferenceSetupProps {
  storyboardId: string;
  seriesId: string | null;
  onClose: () => void;
  onProceed: () => void;
}

export function StoryboardReferenceSetup({
  storyboardId,
  seriesId,
  onClose,
  onProceed
}: StoryboardReferenceSetupProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<StoryboardCharacterSummary | null>(null);
  const [showReferenceBrowser, setShowReferenceBrowser] = useState(false);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<ReferenceImage[]>([]);

  useEffect(() => {
    loadData();
  }, [storyboardId, seriesId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryResult] = await Promise.all([
        getStoryboardReferenceSummary(storyboardId),
        loadAssetsAndCharacters()
      ]);
      setSummary(summaryResult);
    } catch (error) {
      console.error('Error loading reference data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssetsAndCharacters = async () => {
    if (!seriesId) return;

    const [assetsResult, charactersResult] = await Promise.all([
      supabase
        .from('assets')
        .select('*')
        .eq('series_id', seriesId)
        .not('file_url', 'is', null),
      supabase
        .from('characters')
        .select('*')
        .eq('series_id', seriesId)
    ]);

    setAssets(assetsResult.data || []);
    setCharacters(charactersResult.data || []);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const refreshedRefs = await refreshStoryboardReferences(storyboardId);
      setSummary(prev => prev ? {
        ...prev,
        characters: refreshedRefs,
        linkedCharacters: refreshedRefs.filter(c => c.has_reference).length,
        unlinkedCharacters: refreshedRefs.filter(c => !c.has_reference).length
      } : null);
    } catch (error) {
      console.error('Error refreshing references:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReferenceBrowser = (referenceId: string) => {
    setSelectedReferenceId(referenceId);
    setSelectedRefs([]);
    setShowReferenceBrowser(true);
  };

  const handleSelectReference = async (
    item: Asset | Character,
    _type: AssetType,
    source: 'character_library' | 'asset_library'
  ) => {
    if (!selectedReferenceId) return;

    setSaving(true);
    try {
      if (source === 'character_library' && 'reference_image_url' in item) {
        await linkCharacterToReference(selectedReferenceId, item.id);
      } else {
        await linkAssetToReference(selectedReferenceId, item.id);
      }

      const refreshedRefs = await refreshStoryboardReferences(storyboardId);
      setSummary(prev => prev ? {
        ...prev,
        characters: refreshedRefs,
        linkedCharacters: refreshedRefs.filter(c => c.has_reference).length,
        unlinkedCharacters: refreshedRefs.filter(c => !c.has_reference).length
      } : null);

      setShowReferenceBrowser(false);
      setSelectedReferenceId(null);
    } catch (error) {
      console.error('Error linking reference:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearReference = async (referenceId: string) => {
    setSaving(true);
    try {
      await clearCharacterReference(referenceId);
      const refreshedRefs = await refreshStoryboardReferences(storyboardId);
      setSummary(prev => prev ? {
        ...prev,
        characters: refreshedRefs,
        linkedCharacters: refreshedRefs.filter(c => c.has_reference).length,
        unlinkedCharacters: refreshedRefs.filter(c => !c.has_reference).length
      } : null);
    } catch (error) {
      console.error('Error clearing reference:', error);
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return { label: 'Exact Match', color: 'bg-green-100 text-green-700' };
    if (confidence >= 0.7) return { label: 'Partial Match', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'No Match', color: 'bg-gray-100 text-gray-600' };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-gray-700">Loading character references...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Character Reference Setup</h2>
                  <p className="text-sm text-gray-600">
                    Link reference images to ensure character consistency
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {summary && (
              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{summary.linkedCharacters}</div>
                    <div className="text-xs text-gray-500">Linked</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{summary.unlinkedCharacters}</div>
                    <div className="text-xs text-gray-500">Need Reference</div>
                  </div>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {summary?.characters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No characters found in this storyboard</p>
                <p className="text-sm text-gray-500 mt-1">
                  Characters will be detected from shot data
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary?.characters.map((ref) => {
                  const confidenceBadge = getConfidenceBadge(ref.match_confidence);

                  return (
                    <div
                      key={ref.id}
                      className={`p-4 rounded-xl border transition-all ${
                        ref.has_reference
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <CharacterImage
                            url={ref.reference_image_url}
                            alt={ref.character_name}
                            className="w-16 h-16 rounded-lg object-cover"
                            fallback={
                              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            }
                          />
                          {ref.has_reference && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{ref.character_name}</h3>
                            {ref.linked_character && ref.character_name !== ref.display_name && (
                              <span className="text-sm text-gray-500">
                                matched to "{ref.display_name}"
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm text-gray-600">
                              {ref.shot_count} shot{ref.shot_count !== 1 ? 's' : ''}
                            </span>
                            {ref.match_confidence > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceBadge.color}`}>
                                {confidenceBadge.label}
                              </span>
                            )}
                            {ref.is_verified && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {ref.has_reference ? (
                            <>
                              <button
                                onClick={() => openReferenceBrowser(ref.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Link2 className="w-4 h-4" />
                                Change
                              </button>
                              <button
                                onClick={() => handleClearReference(ref.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <Unlink className="w-4 h-4" />
                                Clear
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openReferenceBrowser(ref.id)}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Link2 className="w-4 h-4" />
                              Link Reference
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

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {summary && summary.unlinkedCharacters > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      Warning: {summary.unlinkedCharacters} character{summary.unlinkedCharacters !== 1 ? 's' : ''} without reference images
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Characters without reference images may appear inconsistent or be generated incorrectly by the AI.
                      It's highly recommended to link reference images for all characters before generating.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {summary && summary.unlinkedCharacters > 0 ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    {summary.unlinkedCharacters} need{summary.unlinkedCharacters === 1 ? 's' : ''} reference
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    All references linked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onProceed}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all font-medium ${
                    summary && summary.unlinkedCharacters === 0
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg'
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  {summary && summary.unlinkedCharacters === 0 ? 'Continue to Generate' : 'Generate Anyway'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReferenceBrowser && (
        <ReferenceBrowser
          assets={assets}
          characters={characters}
          selectedRefs={selectedRefs}
          onSelect={handleSelectReference}
          onClose={() => {
            setShowReferenceBrowser(false);
            setSelectedReferenceId(null);
          }}
          title="Select Character Reference"
          subtitle="Choose a reference image from your Character Library or Asset Library"
          showCharactersOnly={true}
          singleSelect={true}
        />
      )}
    </>
  );
}
