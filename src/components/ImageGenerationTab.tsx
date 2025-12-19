import { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  Layers,
  Package,
  Download,
  Wand2,
  Save,
  Check,
  Info,
  Eraser
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
type ReferenceFilter = 'all' | 'characters' | 'backgrounds' | 'props';

const mapAssetTypeToDatabase = (type: AssetType): string => {
  const mapping: Record<AssetType, string> = {
    'character': 'character_ref',
    'background': 'background',
    'prop': 'prop'
  };
  return mapping[type];
};

interface ReferenceImage {
  id: string;
  name: string;
  imageUrl: string;
  type: AssetType;
  assetId?: string;
}

const ASSET_TYPE_CONFIG = {
  character: {
    label: 'Character',
    icon: Users,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
    description: 'Generate expressive characters with distinct personalities',
    promptGuide: 'full body character design, expressive face, distinct personality, child-friendly appearance, dynamic pose'
  },
  background: {
    label: 'Background',
    icon: Layers,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    textColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
    description: 'Create detailed environments and scenic backdrops',
    promptGuide: 'detailed environment, appropriate depth, clear focal points, animation-ready background, atmospheric lighting'
  },
  prop: {
    label: 'Prop',
    icon: Package,
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
    description: 'Design objects and items for your scenes',
    promptGuide: 'clear object definition, appropriate scale, animation-friendly design, distinct from background, detailed textures'
  }
};

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
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [processingTransparency, setProcessingTransparency] = useState(false);

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

    const existingRef = referenceImages.find(r => r.assetId === asset.id && r.type === type);
    if (existingRef) return;

    const ref: ReferenceImage = {
      id: crypto.randomUUID(),
      name: asset.name,
      imageUrl,
      type,
      assetId: asset.id
    };

    setReferenceImages([...referenceImages, ref]);
  };

  const handleRemoveReference = (id: string) => {
    setReferenceImages(referenceImages.filter(r => r.id !== id));
  };

  const removeBackground = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const isGreen = g > 100 && g > r * 1.2 && g > b * 1.2;
          const isLimeGreen = r > 100 && g > 180 && b < 100;
          const isBrightGreen = g > 200 && r < 150 && b < 150;

          if (isGreen || isLimeGreen || isBrightGreen) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  const buildSmartPrompt = () => {
    const styleGuide = "claymation style, vibrant colors, playful animation aesthetic, smooth rounded shapes, friendly character design";
    const typeConfig = ASSET_TYPE_CONFIG[assetType];

    let enhanced = prompt.trim();

    if (!enhanced.toLowerCase().includes('claymation')) {
      enhanced = `${enhanced}. ${styleGuide}, ${typeConfig.promptGuide}`;
    }

    if (transparentBackground && assetType !== 'background') {
      enhanced += `. Place subject on solid bright green (#00FF00) screen background for easy extraction, no shadows on background`;
    }

    const refsByType = {
      character: referenceImages.filter(r => r.type === 'character'),
      background: referenceImages.filter(r => r.type === 'background'),
      prop: referenceImages.filter(r => r.type === 'prop')
    };

    if (refsByType.character.length > 0 && assetType !== 'character') {
      enhanced += `. Include character${refsByType.character.length > 1 ? 's' : ''} in the style of: ${refsByType.character.map(r => r.name).join(', ')}`;
    }

    if (refsByType.background.length > 0 && assetType !== 'background') {
      enhanced += `. Environment inspired by: ${refsByType.background.map(r => r.name).join(', ')}`;
    }

    if (refsByType.prop.length > 0 && assetType !== 'prop') {
      enhanced += `. Props and objects styled like: ${refsByType.prop.map(r => r.name).join(', ')}`;
    }

    return enhanced;
  };

  const enhancePrompt = () => {
    setPrompt(buildSmartPrompt());
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

      const smartPrompt = buildSmartPrompt();

      const options: ImageGenerationOptions = {
        prompt: smartPrompt,
        aspectRatio,
        numberOfImages: 1,
        characterReferences: characterRefs.length > 0 ? characterRefs : undefined
      };

      const result = await generateAssetImage(options, assetType);

      let finalImageUrl = result.imageUrl;

      if (transparentBackground && assetType !== 'background') {
        setProcessingTransparency(true);
        try {
          finalImageUrl = await removeBackground(result.imageUrl);
        } catch (bgError) {
          console.error('Background removal failed:', bgError);
        } finally {
          setProcessingTransparency(false);
        }
      }

      setGeneratedImage({
        url: finalImageUrl,
        cost: result.estimatedCost
      });

      setAssetName(`${assetType} - ${new Date().toLocaleString()}`);
      setAssetDescription(prompt.substring(0, 200));
      setAssetTags(transparentBackground ? `${assetType}, transparent` : assetType);

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
      const dbAssetType = mapAssetTypeToDatabase(assetType);

      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert([{
          series_id: seriesId,
          asset_type: dbAssetType,
          name: assetName,
          description: assetDescription || null,
          file_url: generatedImage.url,
          thumbnail_url: generatedImage.url,
          tags,
          ai_generated: true,
          generation_prompt: prompt,
          metadata: {
            aspectRatio,
            hasTransparency: transparentBackground && assetType !== 'background',
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
      setTransparentBackground(false);

    } catch (err) {
      console.error('Error saving asset:', err);
      setError('Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const getReferenceSummary = () => {
    const counts = {
      character: referenceImages.filter(r => r.type === 'character').length,
      background: referenceImages.filter(r => r.type === 'background').length,
      prop: referenceImages.filter(r => r.type === 'prop').length
    };

    const parts = [];
    if (counts.character > 0) parts.push(`${counts.character} character${counts.character > 1 ? 's' : ''}`);
    if (counts.background > 0) parts.push(`${counts.background} background${counts.background > 1 ? 's' : ''}`);
    if (counts.prop > 0) parts.push(`${counts.prop} prop${counts.prop > 1 ? 's' : ''}`);

    return parts.join(', ');
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.entries(ASSET_TYPE_CONFIG) as [AssetType, typeof ASSET_TYPE_CONFIG[AssetType]][]).map(([typeId, config]) => {
            const Icon = config.icon;
            const isSelected = assetType === typeId;

            return (
              <button
                key={typeId}
                onClick={() => setAssetType(typeId)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? `${config.borderColor} ${config.bgColor}`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? config.bgColor : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? config.textColor : 'text-gray-600'}`} />
                  </div>
                  <div className={`font-semibold ${isSelected ? config.textColor : 'text-gray-900'}`}>
                    {config.label}
                  </div>
                  {isSelected && (
                    <Check className={`w-4 h-4 ml-auto ${config.textColor}`} />
                  )}
                </div>
                <p className={`text-xs ${isSelected ? config.textColor : 'text-gray-500'}`}>
                  {config.description}
                </p>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-3 h-3" />
          <span>Asset type guides the AI even without reference images</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700">
            Reference Images ({referenceImages.length})
          </label>
          {referenceImages.length > 0 && (
            <span className="text-xs text-gray-500">{getReferenceSummary()}</span>
          )}
        </div>

        {referenceImages.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Selected References</span>
              <button
                onClick={() => setReferenceImages([])}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {referenceImages.map((ref) => {
                const typeConfig = ASSET_TYPE_CONFIG[ref.type];
                return (
                  <div
                    key={ref.id}
                    className="flex items-center gap-2 bg-white rounded-full pl-1 pr-2 py-1 border border-gray-200"
                  >
                    <img
                      src={ref.imageUrl}
                      alt={ref.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">
                      {ref.name}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${typeConfig.badgeColor}`}>
                      {typeConfig.label}
                    </span>
                    <button
                      onClick={() => handleRemoveReference(ref.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {referenceImages.slice(0, 3).map((ref) => {
              const typeConfig = ASSET_TYPE_CONFIG[ref.type];
              return (
                <div key={ref.id} className="relative group">
                  <img
                    src={ref.imageUrl}
                    alt={ref.name}
                    className={`w-full h-32 object-cover rounded-lg border-2 ${typeConfig.borderColor}`}
                  />
                  <button
                    onClick={() => handleRemoveReference(ref.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full ${typeConfig.badgeColor}`}>
                    {typeConfig.label}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-lg truncate">
                    {ref.name}
                  </div>
                </div>
              );
            })}
            {referenceImages.length > 3 && (
              <div className="h-32 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                <span className="text-sm text-gray-600">+{referenceImages.length - 3} more</span>
              </div>
            )}
            <button
              onClick={() => setShowReferenceBrowser(true)}
              className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <Plus className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-600">Add Reference</span>
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Add characters, backgrounds, or props from your Asset Library. The AI uses these as style guides regardless of what you're generating.
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
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Wand2 className="w-3 h-3" />
            Enhance with Style Guide
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {assetType !== 'background' && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${transparentBackground ? 'bg-teal-100' : 'bg-gray-200'}`}>
              <Eraser className={`w-5 h-5 ${transparentBackground ? 'text-teal-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Transparent Background</label>
              <p className="text-xs text-gray-500">Creates PNG with alpha channel for layering</p>
            </div>
          </div>
          <button
            onClick={() => setTransparentBackground(!transparentBackground)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              transparentBackground ? 'bg-teal-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                transparentBackground ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

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
          disabled={!configured || generating || processingTransparency || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Generating Image...
            </>
          ) : processingTransparency ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Removing Background...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              Generate {ASSET_TYPE_CONFIG[assetType].label}
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
            <div className={`rounded-lg overflow-hidden ${
              transparentBackground && assetType !== 'background'
                ? 'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'%3E%3Crect fill=\'%23f0f0f0\' x=\'0\' y=\'0\' width=\'10\' height=\'10\'/%3E%3Crect fill=\'%23ffffff\' x=\'10\' y=\'0\' width=\'10\' height=\'10\'/%3E%3Crect fill=\'%23ffffff\' x=\'0\' y=\'10\' width=\'10\' height=\'10\'/%3E%3Crect fill=\'%23f0f0f0\' x=\'10\' y=\'10\' width=\'10\' height=\'10\'/%3E%3C/svg%3E")]'
                : 'bg-gray-100'
            }`}>
              <img
                src={generatedImage.url}
                alt="Generated"
                className="w-full border border-gray-200 rounded-lg"
              />
            </div>
            {transparentBackground && assetType !== 'background' && (
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-teal-500 text-white rounded text-xs font-medium">
                <Eraser className="w-3 h-3" />
                Transparent
              </div>
            )}
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
          assets={availableAssets}
          characters={characters}
          selectedRefs={referenceImages}
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
  assets: Asset[];
  characters: Character[];
  selectedRefs: ReferenceImage[];
  onSelect: (asset: Asset | Character, type: AssetType) => void;
  onClose: () => void;
}

function ReferenceBrowser({ assets, characters, selectedRefs, onSelect, onClose }: ReferenceBrowserProps) {
  const [filter, setFilter] = useState<ReferenceFilter>('all');

  const isSelected = (id: string, type: AssetType) => {
    return selectedRefs.some(r => r.assetId === id && r.type === type);
  };

  const backgroundAssets = assets.filter(a => a.asset_type === 'background');
  const propAssets = assets.filter(a => a.asset_type === 'prop');
  const characterAssets = assets.filter(a => a.asset_type === 'character');

  const getCounts = () => ({
    all: characters.length + assets.length,
    characters: characters.length + characterAssets.length,
    backgrounds: backgroundAssets.length,
    props: propAssets.length
  });

  const counts = getCounts();

  const filterTabs: { id: ReferenceFilter; label: string; count: number; icon: typeof Users }[] = [
    { id: 'all', label: 'All', count: counts.all, icon: ImageIcon },
    { id: 'characters', label: 'Characters', count: counts.characters, icon: Users },
    { id: 'backgrounds', label: 'Backgrounds', count: counts.backgrounds, icon: Layers },
    { id: 'props', label: 'Props', count: counts.props, icon: Package }
  ];

  const showCharacters = filter === 'all' || filter === 'characters';
  const showBackgrounds = filter === 'all' || filter === 'backgrounds';
  const showProps = filter === 'all' || filter === 'props';

  const allCharacterItems = [
    ...characters.map(c => ({ ...c, source: 'character' as const })),
    ...characterAssets.map(a => ({ ...a, source: 'asset' as const }))
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Select Reference Images</h2>
              <p className="text-sm text-gray-500 mt-1">
                Browse your Asset Library to add style references for generation
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === tab.id ? 'bg-blue-500' : 'bg-gray-200'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {showCharacters && allCharacterItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Characters</h3>
                <span className="text-xs text-gray-500">({allCharacterItems.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allCharacterItems.map((item) => {
                  const imageUrl = item.source === 'character'
                    ? (item as Character).reference_image_url
                    : (item as Asset).file_url;
                  const itemSelected = isSelected(item.id, 'character');

                  return (
                    <button
                      key={`${item.source}-${item.id}`}
                      onClick={() => {
                        if (item.source === 'character') {
                          onSelect(item as Character, 'character');
                        } else {
                          onSelect(item as Asset, 'character');
                        }
                      }}
                      className={`group relative rounded-lg overflow-hidden transition-all ${
                        itemSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                          <Users className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {itemSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-sm font-medium text-white truncate">{item.name}</div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Character
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showBackgrounds && backgroundAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-700">Backgrounds</h3>
                <span className="text-xs text-gray-500">({backgroundAssets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {backgroundAssets.map((asset) => {
                  const itemSelected = isSelected(asset.id, 'background');

                  return (
                    <button
                      key={asset.id}
                      onClick={() => onSelect(asset, 'background')}
                      className={`group relative rounded-lg overflow-hidden transition-all ${
                        itemSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''
                      }`}
                    >
                      {asset.file_url ? (
                        <img
                          src={asset.file_url}
                          alt={asset.name}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                          <Layers className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {itemSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-sm font-medium text-white truncate">{asset.name}</div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Background
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showProps && propAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-gray-700">Props</h3>
                <span className="text-xs text-gray-500">({propAssets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {propAssets.map((asset) => {
                  const itemSelected = isSelected(asset.id, 'prop');

                  return (
                    <button
                      key={asset.id}
                      onClick={() => onSelect(asset, 'prop')}
                      className={`group relative rounded-lg overflow-hidden transition-all ${
                        itemSelected ? 'ring-2 ring-amber-500 ring-offset-2' : ''
                      }`}
                    >
                      {asset.file_url ? (
                        <img
                          src={asset.file_url}
                          alt={asset.name}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {itemSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-sm font-medium text-white truncate">{asset.name}</div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Prop
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {((filter === 'all' && characters.length === 0 && assets.length === 0) ||
            (filter === 'characters' && allCharacterItems.length === 0) ||
            (filter === 'backgrounds' && backgroundAssets.length === 0) ||
            (filter === 'props' && propAssets.length === 0)) && (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No {filter === 'all' ? 'assets' : filter} available</p>
              <p className="text-sm text-gray-500 mt-1">
                {filter === 'all'
                  ? 'Create characters or generate assets to use as references'
                  : `Add ${filter} to your Asset Library to use them as references`}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedRefs.length > 0
              ? `${selectedRefs.length} reference${selectedRefs.length > 1 ? 's' : ''} selected`
              : 'Click images to select references'}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Done
          </button>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
