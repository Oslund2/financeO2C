import { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  Layers,
  Package,
  Download,
  Eye,
  Settings as SettingsIcon,
  Wand2,
  RefreshCw,
  Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import {
  generateAssetImage,
  checkNanoBananaConfiguration,
  type CharacterReference,
  type ImageGenerationOptions
} from '../services/nanoBananaService';

type Asset = Database['public']['Tables']['assets']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ImageGenerationTabProps {
  seriesId: string | null;
}

type AssetType = 'character' | 'background' | 'prop';

interface ReferenceImage {
  id: string;
  name: string;
  imageUrl: string;
  type: AssetType;
  assetId?: string;
}

export function ImageGenerationTab({ seriesId }: ImageGenerationTabProps) {
  const [assetType, setAssetType] = useState<AssetType>('character');
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('1:1');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; cost: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [showReferenceBrowser, setShowReferenceBrowser] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetTags, setAssetTags] = useState('');

  useEffect(() => {
    const status = checkNanoBananaConfiguration();
    setConfigured(status.configured);
    loadAssets();
    loadCharacters();
  }, [seriesId]);

  const loadAssets = async () => {
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .eq('ai_generated', true)
        .order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data } = await query;
      setAvailableAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const loadCharacters = async () => {
    try {
      let query = supabase.from('characters').select('*');
      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }
      const { data } = await query.order('name');
      setCharacters(data || []);
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  const handleAddReferenceImage = (asset: Asset | Character, type: AssetType) => {
    const imageUrl = 'reference_image_url' in asset ? asset.reference_image_url : asset.file_url;

    if (!imageUrl) return;

    const ref: ReferenceImage = {
      id: crypto.randomUUID(),
      name: asset.name,
      imageUrl,
      type,
      assetId: asset.id
    };

    setReferenceImages([...referenceImages, ref]);
    setShowReferenceBrowser(false);
  };

  const handleRemoveReference = (id: string) => {
    setReferenceImages(referenceImages.filter(r => r.id !== id));
  };

  const enhancePrompt = () => {
    const styleGuide = "claymation style, vibrant colors, playful animation aesthetic, smooth rounded shapes, friendly character design";
    const typeSpecificGuide = {
      character: "full body character design, expressive face, distinct personality, child-friendly appearance",
      background: "detailed environment, appropriate depth, clear focal points, animation-ready background",
      prop: "clear object definition, appropriate scale, animation-friendly design, distinct from background"
    };

    let enhanced = prompt.trim();
    if (!enhanced.toLowerCase().includes('claymation')) {
      enhanced = `${enhanced}. ${styleGuide}, ${typeSpecificGuide[assetType]}`;
    }

    setPrompt(enhanced);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for the image you want to generate');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const characterRefs: CharacterReference[] = referenceImages.map(ref => ({
        name: ref.name,
        imageUrl: ref.imageUrl
      }));

      const options: ImageGenerationOptions = {
        prompt: prompt.trim(),
        aspectRatio,
        numberOfImages: 1,
        characterReferences: characterRefs.length > 0 ? characterRefs : undefined
      };

      const result = await generateAssetImage(options, assetType);

      setGeneratedImage({
        url: result.imageUrl,
        cost: result.estimatedCost
      });

      setAssetName(`${assetType} - ${new Date().toLocaleString()}`);
      setAssetDescription(prompt.substring(0, 200));
      setAssetTags(assetType);

    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAsset = async () => {
    if (!generatedImage || !assetName.trim()) {
      setError('Please provide a name for the asset');
      return;
    }

    setSaving(true);
    try {
      const tags = assetTags.split(',').map(t => t.trim()).filter(Boolean);

      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert([{
          series_id: seriesId,
          organization_id: null,
          asset_type: assetType,
          name: assetName,
          description: assetDescription || null,
          file_url: generatedImage.url,
          thumbnail_url: generatedImage.url,
          tags,
          ai_generated: true,
          generation_prompt: prompt,
          metadata: {
            aspectRatio,
            referenceImages: referenceImages.map(r => ({
              name: r.name,
              type: r.type,
              assetId: r.assetId
            })),
            generatedAt: new Date().toISOString(),
            cost: generatedImage.cost
          }
        }])
        .select()
        .single();

      if (assetError) throw assetError;

      await supabase
        .from('production_jobs')
        .insert([{
          series_id: seriesId,
          job_type: 'image_generation',
          entity_id: asset.id,
          entity_type: 'asset',
          status: 'completed',
          service: 'gemini_nano_banana',
          request_payload: {
            prompt,
            aspectRatio,
            referenceCount: referenceImages.length
          },
          response_data: {
            imageUrl: generatedImage.url,
            cost: generatedImage.cost
          },
          cost_estimate: generatedImage.cost,
          completed_at: new Date().toISOString()
        }]);

      await loadAssets();
      setSaveModalOpen(false);
      setGeneratedImage(null);
      setPrompt('');
      setReferenceImages([]);
      setAssetName('');
      setAssetDescription('');
      setAssetTags('');

    } catch (err) {
      console.error('Error saving asset:', err);
      setError('Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const assetTypes = [
    { id: 'character' as AssetType, label: 'Character', icon: Users, color: 'blue' },
    { id: 'background' as AssetType, label: 'Background', icon: Layers, color: 'green' },
    { id: 'prop' as AssetType, label: 'Prop', icon: Package, color: 'purple' }
  ];

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Gemini API Not Configured</h3>
              <p className="text-sm text-red-800">
                To use image generation, configure your Gemini API key in Settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {configured && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Gemini Imagen 3 Connected</h3>
              <p className="text-sm text-green-800">
                Ready to generate character references, backgrounds, and props with Nano Banana style consistency.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Style-Consistent Asset Generation</h3>
            <p className="text-sm text-blue-800">
              Generate characters, backgrounds, and props that match your show's visual style. Add reference images to ensure consistency across all generated assets.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Asset Type</label>
        <div className="grid grid-cols-3 gap-3">
          {assetTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = assetType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => setAssetType(type.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `border-${type.color}-500 bg-${type.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  isSelected ? `text-${type.color}-600` : 'text-gray-600'
                }`} />
                <div className={`text-sm font-medium ${
                  isSelected ? `text-${type.color}-900` : 'text-gray-900'
                }`}>
                  {type.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Reference Images ({referenceImages.length})
        </label>
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {referenceImages.map((ref) => (
              <div key={ref.id} className="relative group">
                <img
                  src={ref.imageUrl}
                  alt={ref.name}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={() => handleRemoveReference(ref.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-lg">
                  {ref.name}
                </div>
              </div>
            ))}
            <button
              onClick={() => setShowReferenceBrowser(true)}
              className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-scripps-blue hover:bg-blue-50 transition-all"
            >
              <Plus className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-600">Add Reference</span>
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Add reference images to maintain visual consistency. The AI will use these as style guides for the generated image.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700">
            Image Description
          </label>
          <button
            onClick={enhancePrompt}
            className="flex items-center gap-1 text-xs text-scripps-blue hover:underline"
          >
            <Wand2 className="w-3 h-3" />
            Enhance with Style Guide
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
          placeholder={`Describe the ${assetType} you want to generate... (e.g., "A friendly young bee character wearing a spelling bee champion sash, holding a trophy")`}
        />
        <p className="text-xs text-gray-600 mt-1">
          Be specific about colors, expressions, poses, and key visual elements
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Aspect Ratio</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: '16:9' as const, label: '16:9 Widescreen' },
            { value: '1:1' as const, label: '1:1 Square' },
            { value: '9:16' as const, label: '9:16 Portrait' }
          ].map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => setAspectRatio(ratio.value)}
              className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                aspectRatio === ratio.value
                  ? 'border-scripps-blue bg-blue-50 text-scripps-blue'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="pt-4">
        <button
          onClick={handleGenerate}
          disabled={!configured || generating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Generating Image...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              Generate {assetType.charAt(0).toUpperCase() + assetType.slice(1)}
            </>
          )}
        </button>
        {configured && (
          <p className="text-xs text-gray-600 text-center mt-2">
            Estimated cost: $0.02 per image
          </p>
        )}
      </div>

      {generatedImage && (
        <div className="bg-white border-2 border-green-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Generated Image</h3>
            <span className="text-sm text-green-600 font-medium">
              Cost: ${generatedImage.cost.toFixed(4)}
            </span>
          </div>

          <div className="relative">
            <img
              src={generatedImage.url}
              alt="Generated"
              className="w-full rounded-lg border border-gray-200"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSaveModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              Save to Asset Library
            </button>
            <a
              href={generatedImage.url}
              download
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        </div>
      )}

      {showReferenceBrowser && (
        <ReferenceBrowser
          assetType={assetType}
          assets={availableAssets}
          characters={characters}
          onSelect={handleAddReferenceImage}
          onClose={() => setShowReferenceBrowser(false)}
        />
      )}

      {saveModalOpen && generatedImage && (
        <SaveAssetModal
          assetName={assetName}
          assetDescription={assetDescription}
          assetTags={assetTags}
          onNameChange={setAssetName}
          onDescriptionChange={setAssetDescription}
          onTagsChange={setAssetTags}
          onSave={handleSaveAsset}
          onCancel={() => setSaveModalOpen(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

interface ReferenceBrowserProps {
  assetType: AssetType;
  assets: Asset[];
  characters: Character[];
  onSelect: (asset: Asset | Character, type: AssetType) => void;
  onClose: () => void;
}

function ReferenceBrowser({ assetType, assets, characters, onSelect, onClose }: ReferenceBrowserProps) {
  const [filter, setFilter] = useState<'all' | 'characters' | 'assets'>('all');

  const filteredAssets = assets.filter(a => {
    if (filter === 'characters') return false;
    if (assetType === 'character') return a.asset_type === 'character';
    if (assetType === 'background') return a.asset_type === 'background';
    if (assetType === 'prop') return a.asset_type === 'prop';
    return true;
  });

  const filteredCharacters = filter !== 'assets' ? characters : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Select Reference Image</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-scripps-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('characters')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'characters'
                  ? 'bg-scripps-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Characters
            </button>
            <button
              onClick={() => setFilter('assets')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'assets'
                  ? 'bg-scripps-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Generated Assets
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredCharacters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Characters</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredCharacters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => onSelect(char, 'character')}
                    className="group relative"
                  >
                    {char.reference_image_url ? (
                      <img
                        src={char.reference_image_url}
                        alt={char.name}
                        className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 group-hover:border-scripps-blue transition-colors"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-100 rounded-lg border-2 border-gray-200 group-hover:border-scripps-blue transition-colors flex items-center justify-center">
                        <Users className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="mt-2 text-sm font-medium text-gray-900">{char.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredAssets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Generated Assets</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => onSelect(asset, asset.asset_type as AssetType)}
                    className="group relative"
                  >
                    {asset.file_url ? (
                      <img
                        src={asset.file_url}
                        alt={asset.name}
                        className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 group-hover:border-scripps-blue transition-colors"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-100 rounded-lg border-2 border-gray-200 group-hover:border-scripps-blue transition-colors flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="mt-2 text-sm font-medium text-gray-900">{asset.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCharacters.length === 0 && filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No reference images available</p>
              <p className="text-sm text-gray-500 mt-1">
                Generate some assets first to use them as references
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SaveAssetModalProps {
  assetName: string;
  assetDescription: string;
  assetTags: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTagsChange: (tags: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function SaveAssetModal({
  assetName,
  assetDescription,
  assetTags,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
  onSave,
  onCancel,
  saving
}: SaveAssetModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Save Asset to Library</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Asset Name *
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
              placeholder="e.g., Bee Character - Happy Pose"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={assetDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
              placeholder="Optional: Add details about this asset"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={assetTags}
              onChange={(e) => onTagsChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
              placeholder="Comma-separated tags (e.g., character, bee, hero)"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !assetName.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Asset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
