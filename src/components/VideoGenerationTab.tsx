import { useState, useEffect } from 'react';
import {
  Video,
  Users,
  Layers,
  Package,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Mic,
  Volume2,
  Play,
  Camera,
  Clock,
  DollarSign,
  Film,
  Settings,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Wand2,
  Save,
  Eye,
  Calculator,
  Info,
  Zap,
  TrendingDown,
  Upload,
  Shuffle,
  Hash,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import {
  isVertexAIConfigured,
  calculateVeo3Cost,
  calculateProductionCost,
  submitVeo3Request,
  getRecommendedModel,
  VEO_MODELS,
  type VeoModel,
  type VeoModelInfo,
  type Veo3Parameters,
  type Veo3Request
} from '../services/vertexAIService';
import { FORMAT_PRESETS } from '../types/formatConfig';
import { generateVeo3Prompt, type Veo3PromptConfig } from '../services/veo3PromptService';
import { useOrganization } from '../contexts/OrganizationContext';
import { useWorkspaceCapabilities } from '../hooks/useWorkspaceCapabilities';
import { getVideoStylePromptForWorkspace } from '../services/workspacePromptService';
import { CharacterImage } from './CharacterImage';

type Asset = Database['public']['Tables']['assets']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface VideoGenerationTabProps {
  seriesId: string | null;
  onNavigate?: (view: string) => void;
}

interface SceneCharacter {
  id: string;
  character: Character;
  position: 'left' | 'center' | 'right';
  action?: string;
}

interface DialogueLine {
  id: string;
  characterId: string;
  characterName: string;
  text: string;
  voiceProvider: string | null;
  voiceId: string | null;
}

interface SceneComposition {
  characters: SceneCharacter[];
  background: Asset | null;
  props: Asset[];
  dialogue: DialogueLine[];
  action: string;
  mood: string;
}

const SHOT_TYPES = [
  { value: 'establishing_shot', label: 'Establishing Shot', description: 'Wide view setting the scene' },
  { value: 'wide_shot', label: 'Wide Shot', description: 'Full scene context' },
  { value: 'medium_shot', label: 'Medium Shot', description: 'Character from waist up' },
  { value: 'close_up', label: 'Close Up', description: 'Face/emotion focus' },
  { value: 'two_shot', label: 'Two Shot', description: 'Two characters in frame' },
  { value: 'over_the_shoulder', label: 'Over the Shoulder', description: 'Conversation perspective' },
  { value: 'reaction_shot', label: 'Reaction Shot', description: 'Character reaction' },
];

const CAMERA_ANGLES = [
  { value: 'eye_level', label: 'Eye Level' },
  { value: 'high_angle', label: 'High Angle' },
  { value: 'low_angle', label: 'Low Angle' },
  { value: 'dutch_angle', label: 'Dutch Angle' },
];

const CAMERA_MOVEMENTS = [
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'track', label: 'Track' },
  { value: 'zoom', label: 'Zoom' },
];

const MOODS = [
  'Happy', 'Excited', 'Tense', 'Mysterious', 'Calm', 'Dramatic', 'Comedic', 'Inspirational'
];

type VideoTask =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video-subject'
  | 'video-extension'
  | 'reference-to-video-style'
  | 'video-inpaint-insert'
  | 'video-inpaint-remove';

interface VideoTaskOption {
  value: VideoTask;
  label: string;
  description: string;
  available: boolean;
  requiresImage?: boolean;
  requiresReferenceImages?: boolean;
  requiresVideo?: boolean;
}

const VIDEO_TASKS: VideoTaskOption[] = [
  {
    value: 'text-to-video',
    label: 'Text-to-video',
    description: 'Generate video from a text prompt',
    available: true,
  },
  {
    value: 'image-to-video',
    label: 'Image-to-video',
    description: 'Animate a static image into video',
    available: true,
    requiresImage: true,
  },
  {
    value: 'reference-to-video-subject',
    label: 'Reference-to-video (Subject)',
    description: 'Generate video with consistent subject from reference images',
    available: true,
    requiresReferenceImages: true,
  },
  {
    value: 'video-extension',
    label: 'Video extension',
    description: 'Extend an existing video clip',
    available: true,
    requiresVideo: true,
  },
  {
    value: 'reference-to-video-style',
    label: 'Reference-to-video (Style)',
    description: 'Generate video matching the style of a reference image',
    available: true,
    requiresReferenceImages: true,
  },
  {
    value: 'video-inpaint-insert',
    label: 'Video inpaint (Insert)',
    description: 'Insert new objects or elements into video',
    available: true,
    requiresVideo: true,
  },
  {
    value: 'video-inpaint-remove',
    label: 'Video inpaint (Remove)',
    description: 'Remove objects or elements from video',
    available: true,
    requiresVideo: true,
  },
];

export function VideoGenerationTab({ seriesId, onNavigate }: VideoGenerationTabProps) {
  const { currentOrganization } = useOrganization();
  const { workspaceType, isPhotoreal, isClaymation } = useWorkspaceCapabilities();
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceVideoStyle, setWorkspaceVideoStyle] = useState<string>('');

  const [selectedTask, setSelectedTask] = useState<VideoTask>('text-to-video');
  const [inputImage, setInputImage] = useState<{ file: File; dataUrl: string } | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<{ file: File; dataUrl: string } | null>(null);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [assetBrowserType, setAssetBrowserType] = useState<'character' | 'background' | 'prop'>('character');

  const [scene, setScene] = useState<SceneComposition>({
    characters: [],
    background: null,
    props: [],
    dialogue: [],
    action: '',
    mood: 'Happy'
  });

  const [shotType, setShotType] = useState('medium_shot');
  const [cameraAngle, setCameraAngle] = useState('eye_level');
  const [cameraMovement, setCameraMovement] = useState('static');
  const [duration, setDuration] = useState<4 | 6 | 8>(6);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [selectedModel, setSelectedModel] = useState<VeoModel>('veo-3.1-generate-001');
  const [showPricingInfo, setShowPricingInfo] = useState(false);

  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showCostEstimator, setShowCostEstimator] = useState(false);
  const [seed, setSeed] = useState<number>(0);
  const [showSeedExplainer, setShowSeedExplainer] = useState(false);

  useEffect(() => {
    setConfigured(isVertexAIConfigured());
    loadData();
    loadWorkspaceVideoStyle();
  }, [seriesId, currentOrganization, workspaceType]);

  const loadWorkspaceVideoStyle = async () => {
    if (!currentOrganization?.id || !workspaceType) return;

    try {
      const videoStyle = await getVideoStylePromptForWorkspace(currentOrganization.id, workspaceType);
      setWorkspaceVideoStyle(videoStyle);
    } catch (error) {
      console.error('Error loading workspace video style:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCharacters(), loadAssets()]);
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    try {
      let query = supabase.from('characters').select('*');

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      } else if (currentOrganization?.id) {
        query = query.or(`series_id.in.(select id from series where organization_id = '${currentOrganization.id}'),organization_id.eq.${currentOrganization.id}`);
      }

      const { data } = await query.order('name');
      setCharacters(data || []);
    } catch (err) {
      console.error('Error loading characters:', err);
    }
  };

  const loadAssets = async () => {
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      } else if (currentOrganization?.id) {
        query = query.or(`series_id.in.(select id from series where organization_id = '${currentOrganization.id}'),organization_id.eq.${currentOrganization.id}`);
      }

      const { data } = await query;
      setAssets(data || []);
    } catch (err) {
      console.error('Error loading assets:', err);
    }
  };

  const addCharacterToScene = (character: Character, position: 'left' | 'center' | 'right' = 'center') => {
    if (scene.characters.find(sc => sc.character.id === character.id)) return;
    setScene(prev => ({
      ...prev,
      characters: [...prev.characters, {
        id: crypto.randomUUID(),
        character,
        position,
        action: ''
      }]
    }));
  };

  const removeCharacterFromScene = (id: string) => {
    setScene(prev => ({
      ...prev,
      characters: prev.characters.filter(sc => sc.id !== id),
      dialogue: prev.dialogue.filter(d => d.characterId !== id)
    }));
  };

  const updateCharacterAction = (id: string, action: string) => {
    setScene(prev => ({
      ...prev,
      characters: prev.characters.map(sc =>
        sc.id === id ? { ...sc, action } : sc
      )
    }));
  };

  const setBackground = (asset: Asset) => {
    setScene(prev => ({ ...prev, background: asset }));
    setShowAssetBrowser(false);
  };

  const addProp = (asset: Asset) => {
    if (scene.props.find(p => p.id === asset.id)) return;
    setScene(prev => ({ ...prev, props: [...prev.props, asset] }));
  };

  const removeProp = (id: string) => {
    setScene(prev => ({
      ...prev,
      props: prev.props.filter(p => p.id !== id)
    }));
  };

  const addDialogueLine = () => {
    if (scene.characters.length === 0) {
      setError('Add at least one character to the scene before adding dialogue');
      return;
    }
    const firstChar = scene.characters[0];
    setScene(prev => ({
      ...prev,
      dialogue: [...prev.dialogue, {
        id: crypto.randomUUID(),
        characterId: firstChar.id,
        characterName: firstChar.character.name,
        text: '',
        voiceProvider: firstChar.character.voice_provider,
        voiceId: firstChar.character.eleven_labs_voice_id || firstChar.character.chatterbox_voice_id
      }]
    }));
  };

  const updateDialogueLine = (id: string, updates: Partial<DialogueLine>) => {
    setScene(prev => ({
      ...prev,
      dialogue: prev.dialogue.map(d => d.id === id ? { ...d, ...updates } : d)
    }));
  };

  const changeDialogueCharacter = (dialogueId: string, sceneCharacterId: string) => {
    const sceneChar = scene.characters.find(sc => sc.id === sceneCharacterId);
    if (!sceneChar) return;
    updateDialogueLine(dialogueId, {
      characterId: sceneCharacterId,
      characterName: sceneChar.character.name,
      voiceProvider: sceneChar.character.voice_provider,
      voiceId: sceneChar.character.eleven_labs_voice_id || sceneChar.character.chatterbox_voice_id
    });
  };

  const removeDialogueLine = (id: string) => {
    setScene(prev => ({
      ...prev,
      dialogue: prev.dialogue.filter(d => d.id !== id)
    }));
  };

  const buildPrompt = (): string => {
    const config: Veo3PromptConfig = {
      shot_type: shotType,
      camera_angle: cameraAngle,
      camera_movement: cameraMovement,
      duration_seconds: duration,
      narrative_description: scene.action || `${scene.mood} scene with characters interacting`,
      technical_description: `${shotType} at ${cameraAngle} with ${cameraMovement} movement`,
      characters: scene.characters.map(sc => sc.character.name),
      location: scene.background?.name || 'Studio setting',
      props: scene.props.map(p => p.name),
      dialogue_content: scene.dialogue.map(d => ({
        character_name: d.characterName,
        text: d.text,
        voice_id: d.voiceId || 'default',
        voice_provider: d.voiceProvider || 'elevenlabs',
        emotion: 'neutral'
      })),
      workspaceType: workspaceType as 'claymation' | 'photoreal' | null
    };

    const generated = generateVeo3Prompt(config);
    return generated.veo3_prompt_text;
  };

  const handlePreviewPrompt = () => {
    if (scene.characters.length === 0 && !scene.background) {
      setError('Add at least one character or background to preview the prompt');
      return;
    }
    setError(null);
    const prompt = buildPrompt();
    setGeneratedPrompt(prompt);
    setShowPromptPreview(true);
  };

  const fetchImageAsBase64 = async (url: string): Promise<{ base64: string; mimeType: 'image/jpeg' | 'image/png' } | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const mimeType = blob.type.includes('png') ? 'image/png' : 'image/jpeg';

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ base64, mimeType });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!configured) {
      setError('Vertex AI is not configured. Please add credentials in Settings.');
      return;
    }

    if (!currentOrganization) {
      setError('No organization selected. Please select an organization first.');
      return;
    }

    const taskConfig = VIDEO_TASKS.find(t => t.value === selectedTask);
    if (!taskConfig?.available) {
      setError('This task type is not yet available.');
      return;
    }

    if (selectedTask === 'image-to-video' && !inputImage) {
      setError('Please upload an input image for image-to-video generation.');
      return;
    }

    if (selectedTask === 'reference-to-video-style' && !styleReferenceImage) {
      setError('Please upload a style reference image.');
      return;
    }

    if (selectedTask !== 'image-to-video' && scene.characters.length === 0 && !scene.background) {
      setError('Add at least one character or background to generate video');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const prompt = buildPrompt();
      setGeneratedPrompt(prompt);

      const referenceImages: Veo3Request['referenceImages'] = [];
      let inputImageData: Veo3Request['image'] | undefined;
      let modelToUse = selectedModel;
      let actualDuration = duration;

      if (selectedTask === 'image-to-video' && inputImage) {
        const base64 = inputImage.dataUrl.split(',')[1];
        const mimeType = inputImage.file.type.includes('png') ? 'image/png' : 'image/jpeg';
        inputImageData = {
          bytesBase64Encoded: base64,
          mimeType: mimeType as 'image/jpeg' | 'image/png'
        };
        actualDuration = 8;
      }

      if (selectedTask === 'reference-to-video-style' && styleReferenceImage) {
        const base64 = styleReferenceImage.dataUrl.split(',')[1];
        const mimeType = styleReferenceImage.file.type.includes('png') ? 'image/png' : 'image/jpeg';
        referenceImages.push({
          bytesBase64Encoded: base64,
          mimeType: mimeType as 'image/jpeg' | 'image/png',
          referenceType: 'style'
        });
        modelToUse = 'veo-2.0-generate-exp';
      }

      if (selectedTask === 'reference-to-video-subject' || selectedTask === 'text-to-video') {
        for (const sc of scene.characters) {
          if (sc.character.reference_image_url) {
            const imageData = await fetchImageAsBase64(sc.character.reference_image_url);
            if (imageData) {
              referenceImages.push({
                bytesBase64Encoded: imageData.base64,
                mimeType: imageData.mimeType,
                referenceType: 'asset'
              });
            }
          }
        }
      }

      const { data: job, error: jobError } = await supabase
        .from('production_jobs')
        .insert([{
          series_id: seriesId,
          organization_id: currentOrganization.id,
          job_type: 'video_generation',
          entity_type: 'video_clip',
          status: 'processing',
          service: 'veo3',
          request_payload: {
            task: selectedTask,
            prompt,
            scene: {
              characters: scene.characters.map(sc => ({
                name: sc.character.name,
                id: sc.character.id,
                position: sc.position,
                action: sc.action,
                referenceUrl: sc.character.reference_image_url
              })),
              background: scene.background ? {
                name: scene.background.name,
                id: scene.background.id,
                url: scene.background.file_url
              } : null,
              props: scene.props.map(p => ({
                name: p.name,
                id: p.id,
                url: p.file_url
              })),
              dialogue: scene.dialogue
            },
            parameters: {
              shotType,
              cameraAngle,
              cameraMovement,
              duration: actualDuration,
              aspectRatio,
              resolution,
              generateAudio,
              mood: scene.mood,
              seed: seed > 0 ? seed : undefined
            }
          },
          cost_estimate: calculateVeo3Cost(actualDuration, 1, generateAudio, modelToUse)
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      const veo3Request: Veo3Request = {
        prompt,
        image: inputImageData,
        referenceImages: referenceImages.length > 0 ? referenceImages.slice(0, 3) : undefined,
        parameters: {
          aspectRatio,
          resolution,
          durationSeconds: actualDuration as 4 | 5 | 6 | 7 | 8,
          sampleCount: 1,
          generateAudio,
          personGeneration: 'allow_adult',
          ...(seed > 0 && { seed })
        },
        model: modelToUse
      };

      const veoJobId = await submitVeo3Request(
        job.id,
        currentOrganization.id,
        veo3Request
      );

      await supabase
        .from('production_jobs')
        .update({
          status: 'processing',
          response_payload: { veoJobId }
        })
        .eq('id', job.id);

      setShowPromptPreview(true);

    } catch (err) {
      console.error('Error generating video:', err);
      setError(err instanceof Error ? err.message : 'Failed to start video generation');
    } finally {
      setGenerating(false);
    }
  };

  const estimatedCost = calculateVeo3Cost(duration, 1, generateAudio, selectedModel);
  const selectedModelInfo = VEO_MODELS.find(m => m.id === selectedModel);
  const hasDialogue = scene.dialogue.length > 0 && scene.dialogue.some(d => d.text.trim().length > 0);
  const sceneType = shotType === 'establishing_shot' ? 'establishing' :
                   shotType === 'wide_shot' ? 'wide' :
                   shotType === 'close_up' ? 'closeup' :
                   hasDialogue ? 'dialogue' : 'action';
  const recommendation = getRecommendedModel({
    hasDialogue,
    resolution,
    isPreview: false,
    sceneType: sceneType as any,
    characterCount: scene.characters.length
  });

  const backgroundAssets = assets.filter(a => a.asset_type === 'background');
  const propAssets = assets.filter(a => a.asset_type === 'prop');
  const characterAssets = assets.filter(a => a.asset_type === 'character_ref');

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Vertex AI Not Configured</h3>
              <p className="text-sm text-amber-800 mb-2">
                To use Veo 3 video generation, configure your Google Cloud credentials in Settings.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('settings')}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  Go to Settings
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {configured && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-green-900">Veo 3 Ready</h3>
                {workspaceType && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isPhotoreal
                      ? 'bg-slate-100 text-slate-700 border border-slate-300'
                      : 'bg-teal-100 text-teal-700 border border-teal-300'
                  }`}>
                    {isPhotoreal ? 'Photoreal Mode' : 'Claymation Mode'}
                  </span>
                )}
              </div>
              <p className="text-sm text-green-800">
                Create {isPhotoreal ? 'photorealistic documentary' : 'animated claymation'} clips with voice audio from your scene composition.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Film className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Scene-Based Video Generation</h3>
            <p className="text-sm text-blue-800">
              Compose scenes using characters, backgrounds, and props from your Asset Library.
              Add dialogue and the AI will generate video with consistent character appearance and voice.
            </p>
          </div>
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

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value as VideoTask)}
              className="w-full md:w-80 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {VIDEO_TASKS.map((task) => (
                <option
                  key={task.value}
                  value={task.value}
                  disabled={!task.available}
                >
                  {task.label}{!task.available ? ' (Coming Soon)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              {VIDEO_TASKS.find(t => t.value === selectedTask)?.description}
            </p>
          </div>

          {selectedTask === 'image-to-video' && (
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Input Image</label>
              {inputImage ? (
                <div className="relative inline-block">
                  <img
                    src={inputImage.dataUrl}
                    alt="Input"
                    className="w-48 h-32 object-cover rounded-lg border-2 border-blue-500"
                  />
                  <button
                    onClick={() => setInputImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-600">Upload Image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setInputImage({ file, dataUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Upload an image to animate. Video duration will be set to 8 seconds for image-to-video.
              </p>
            </div>
          )}

          {selectedTask === 'reference-to-video-style' && (
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Style Reference Image</label>
              {styleReferenceImage ? (
                <div className="relative inline-block">
                  <img
                    src={styleReferenceImage.dataUrl}
                    alt="Style Reference"
                    className="w-48 h-32 object-cover rounded-lg border-2 border-purple-500"
                  />
                  <button
                    onClick={() => setStyleReferenceImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-purple-600 text-white text-xs py-1 px-2 rounded-b-lg text-center">
                    Style Reference
                  </div>
                </div>
              ) : (
                <label className="w-48 h-32 border-2 border-dashed border-purple-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
                  <Wand2 className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-purple-600">Upload Style Image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setStyleReferenceImage({ file, dataUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Upload an image whose visual style you want the video to match. Uses veo-2.0-generate-exp model.
              </p>
            </div>
          )}

          {selectedTask === 'reference-to-video-subject' && (
            <div className="border-t border-gray-100 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Subject reference mode:</strong> Character images from your scene will be used as reference images to maintain subject consistency in the generated video.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Characters in Scene</h3>
            </div>
            <span className="text-sm text-gray-500">{scene.characters.length} selected</span>
          </div>

          {scene.characters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {scene.characters.map((sc) => (
                <div key={sc.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <CharacterImage
                      url={sc.character.reference_image_url}
                      alt={sc.character.name}
                      className="w-12 h-12 rounded-lg object-cover"
                      fallback={
                        <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">{sc.character.name}</h4>
                        <button
                          onClick={() => removeCharacterFromScene(sc.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={sc.position}
                          onChange={(e) => setScene(prev => ({
                            ...prev,
                            characters: prev.characters.map(c =>
                              c.id === sc.id ? { ...c, position: e.target.value as any } : c
                            )
                          }))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                        {sc.character.voice_provider && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                            <Mic className="w-3 h-3" />
                            Voice
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Action (e.g., waving, smiling)"
                        value={sc.action || ''}
                        onChange={(e) => updateCharacterAction(sc.id, e.target.value)}
                        className="mt-2 w-full text-xs px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {characters.slice(0, 8).map((character) => {
              const isInScene = scene.characters.some(sc => sc.character.id === character.id);
              return (
                <button
                  key={character.id}
                  onClick={() => !isInScene && addCharacterToScene(character)}
                  disabled={isInScene}
                  className={`p-2 rounded-lg border transition-all text-left ${
                    isInScene
                      ? 'border-blue-500 bg-blue-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CharacterImage
                      url={character.reference_image_url}
                      alt={character.name}
                      className="w-8 h-8 rounded object-cover"
                      fallback={
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-500" />
                        </div>
                      }
                    />
                    <span className="text-sm font-medium text-gray-900 truncate">{character.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {loading && (
            <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading characters…
            </div>
          )}
          {!loading && characters.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No characters available. Create characters first in the Characters page.
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Background</h3>
            </div>
          </div>

          {scene.background ? (
            <div className="relative inline-block">
              <img
                src={scene.background.file_url || ''}
                alt={scene.background.name}
                className="w-48 h-32 object-cover rounded-lg border-2 border-green-500"
              />
              <button
                onClick={() => setScene(prev => ({ ...prev, background: null }))}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-lg truncate">
                {scene.background.name}
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAssetBrowserType('background'); setShowAssetBrowser(true); }}
              className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-green-400 hover:bg-green-50 transition-all"
            >
              <Plus className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-600">Add Background</span>
            </button>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">Props</h3>
            </div>
            <span className="text-sm text-gray-500">{scene.props.length} selected</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {scene.props.map((prop) => (
              <div key={prop.id} className="relative">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  {prop.file_url ? (
                    <img src={prop.file_url} alt={prop.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{prop.name}</span>
                  <button
                    onClick={() => removeProp(prop.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => { setAssetBrowserType('prop'); setShowAssetBrowser(true); }}
              className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-all"
            >
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">Add Prop</span>
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Dialogue</h3>
            </div>
            <button
              onClick={addDialogueLine}
              disabled={scene.characters.length === 0}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          {scene.dialogue.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
              {scene.characters.length === 0
                ? 'Add characters to the scene first, then add dialogue'
                : 'No dialogue added. Video will be generated without voice audio.'}
            </p>
          ) : (
            <div className="space-y-3">
              {scene.dialogue.map((line, index) => (
                <div key={line.id} className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <span className="text-xs font-bold text-purple-600 mt-2">{index + 1}</span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={line.characterId}
                        onChange={(e) => changeDialogueCharacter(line.id, e.target.value)}
                        className="text-sm px-2 py-1 border border-gray-300 rounded font-medium"
                      >
                        {scene.characters.map((sc) => (
                          <option key={sc.id} value={sc.id}>{sc.character.name}</option>
                        ))}
                      </select>
                      {line.voiceId && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          {line.voiceProvider || 'Voice'}
                        </span>
                      )}
                      {!line.voiceId && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          No voice assigned
                        </span>
                      )}
                    </div>
                    <textarea
                      value={line.text}
                      onChange={(e) => updateDialogueLine(line.id, { text: e.target.value })}
                      placeholder="Enter dialogue..."
                      rows={2}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => removeDialogueLine(line.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Scene Action & Mood</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Description</label>
              <textarea
                value={scene.action}
                onChange={(e) => setScene(prev => ({ ...prev, action: e.target.value }))}
                placeholder="Describe what happens in this scene..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setScene(prev => ({ ...prev, mood }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      scene.mood === mood
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <button
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Camera & Video Settings</h3>
          </div>
          {showAdvancedSettings ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showAdvancedSettings && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shot Type</label>
                <select
                  value={shotType}
                  onChange={(e) => setShotType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {SHOT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camera Angle</label>
                <select
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {CAMERA_ANGLES.map((angle) => (
                    <option key={angle.value} value={angle.value}>{angle.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camera Movement</label>
                <select
                  value={cameraMovement}
                  onChange={(e) => setCameraMovement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {CAMERA_MOVEMENTS.map((movement) => (
                    <option key={movement.value} value={movement.value}>{movement.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <button
                    onClick={() => setShowPricingInfo(!showPricingInfo)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Pricing Info
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {VEO_MODELS.filter(m => m.id.startsWith('veo-3')).map((model) => {
                    const isRecommended = recommendation.model === model.id;
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`relative px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                          isSelected
                            ? model.tier === 'fast'
                              ? 'bg-green-500 text-white ring-2 ring-green-300'
                              : 'bg-blue-500 text-white ring-2 ring-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {model.tier === 'fast' && <Zap className="w-3.5 h-3.5" />}
                          {model.name}
                        </div>
                        {isRecommended && !isSelected && (
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-full">
                            REC
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedModelInfo && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-500">{selectedModelInfo.description}</span>
                    <span className={`font-medium ${selectedModelInfo.tier === 'fast' ? 'text-green-600' : 'text-blue-600'}`}>
                      ${generateAudio ? selectedModelInfo.costWithAudio.toFixed(2) : selectedModelInfo.costNoAudio.toFixed(2)}/sec
                    </span>
                  </div>
                )}
                {recommendation.model !== selectedModel && recommendation.savings && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-800">
                      <strong>{VEO_MODELS.find(m => m.id === recommendation.model)?.name}</strong> recommended: {recommendation.reason} (save {recommendation.savings}%)
                    </span>
                  </div>
                )}
              </div>

              {showPricingInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    Veo Model Pricing
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 mb-1.5">Standard Quality</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between bg-white rounded px-2 py-1.5">
                          <span className="text-gray-600">With Audio</span>
                          <span className="font-medium text-gray-900">$0.40/sec</span>
                        </div>
                        <div className="flex justify-between bg-white rounded px-2 py-1.5">
                          <span className="text-gray-600">Video Only</span>
                          <span className="font-medium text-gray-900">$0.20/sec</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-green-700 mb-1.5 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        Fast Generation (62% savings)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between bg-green-50 rounded px-2 py-1.5">
                          <span className="text-green-700">With Audio</span>
                          <span className="font-medium text-green-800">$0.15/sec</span>
                        </div>
                        <div className="flex justify-between bg-green-50 rounded px-2 py-1.5">
                          <span className="text-green-700">Video Only</span>
                          <span className="font-medium text-green-800">$0.10/sec</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Fast models are ideal for drafts, previews, and non-dialogue scenes.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <div className="flex gap-2">
                  {[4, 6, 8].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d as 4 | 6 | 8)}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        duration === d
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                <div className="flex gap-2">
                  {[{ value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }].map((ar) => (
                    <button
                      key={ar.value}
                      onClick={() => setAspectRatio(ar.value as '16:9' | '9:16')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        aspectRatio === ar.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
                <div className="flex gap-2">
                  {[{ value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }].map((res) => (
                    <button
                      key={res.value}
                      onClick={() => setResolution(res.value as '720p' | '1080p')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        resolution === res.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audio</label>
                <button
                  onClick={() => setGenerateAudio(!generateAudio)}
                  className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    generateAudio
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  {generateAudio ? 'With Audio' : 'No Audio'}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">Seed</label>
                  <button
                    onClick={() => setShowSeedExplainer(!showSeedExplainer)}
                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                    title="What is a seed?"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  {seed === 0 ? 'Random (AI picks)' : `Fixed: ${seed}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0 = Random"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setSeed(0)}
                  className={`p-2 rounded-lg transition-all ${
                    seed === 0
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Reset to random"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
              </div>

              {showSeedExplainer && (
                <div className="mt-4 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowSeedExplainer(false)}
                    className="w-full flex items-center justify-between p-3 bg-cyan-100/50 hover:bg-cyan-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-cyan-700" />
                      <span className="font-medium text-cyan-900">Understanding Seeds</span>
                    </div>
                    <ChevronUp className="w-4 h-4 text-cyan-600" />
                  </button>

                  <div className="p-4 space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 bg-cyan-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        How to "Generate" a New Seed
                      </h4>
                      <p className="text-gray-700 ml-8">
                        <strong>You don't.</strong> You let the AI do it.
                      </p>
                      <ul className="mt-2 ml-8 space-y-1 text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-1">-</span>
                          <span>Leave it at <strong>0</strong> (or empty)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-1">-</span>
                          <span>When the box says 0, the AI secretly picks a random number (like 8430221, then 100493, etc.) and builds your video on top of it</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 bg-cyan-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        When to Change that Number
                      </h4>
                      <p className="text-gray-700 ml-8">
                        You only type a number in that box if you want to <strong>go back in time</strong> to a specific result you already created.
                      </p>
                      <div className="mt-3 ml-8 bg-white/60 rounded-lg p-3 border border-cyan-100">
                        <p className="font-medium text-gray-800 mb-2">The Workflow:</p>
                        <ol className="space-y-2 text-gray-600">
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-cyan-600">1.</span>
                            <span><strong>Leave Seed at 0:</strong> Generate 5 or 6 videos until you find one where the character/lighting is perfect</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-cyan-600">2.</span>
                            <span><strong>Find the "Hidden" Seed:</strong> Go to the details/info of that perfect video (usually an info icon or "View Details")</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-cyan-600">3.</span>
                            <span><strong>Copy that number:</strong> It will be a long string of digits (e.g., 4829104)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-cyan-600">4.</span>
                            <span><strong>Paste it in the box:</strong> Now paste that number into the Seed field above</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-cyan-600">5.</span>
                            <span><strong>Tweak:</strong> Change your prompt slightly (e.g., add "smiling") and hit Generate</span>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="bg-white/60 rounded-lg p-3 border border-cyan-100">
                      <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li className="flex items-center gap-2">
                          <Shuffle className="w-4 h-4 text-cyan-500" />
                          <span><strong>To get new ideas:</strong> Leave it as 0</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-cyan-500" />
                          <span><strong>To fix a specific video:</strong> Paste the number from the video you want to fix</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        <strong className="text-amber-700">Quick Tip:</strong> If you just want to experiment with "controlled randomness," you can literally type any number you want (e.g., 7, 42, 1999). It doesn't matter what the number is, only that it stays the same when you want the result to stay the same.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">{duration} seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <span className={`text-sm font-medium ${selectedModelInfo?.tier === 'fast' ? 'text-green-600' : 'text-gray-600'}`}>
                Est. ${estimatedCost.toFixed(2)} ({selectedModelInfo?.name || 'Veo 3.1'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">{scene.characters.length} characters</span>
            </div>
            {scene.dialogue.length > 0 && (
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">{scene.dialogue.length} lines</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePreviewPrompt}
              disabled={scene.characters.length === 0 && !scene.background}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-5 h-5" />
              Preview Prompt
            </button>
            <button
              onClick={handleGenerate}
              disabled={!configured || generating || (scene.characters.length === 0 && !scene.background)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ProductionCostEstimator
        expanded={showCostEstimator}
        onToggle={() => setShowCostEstimator(!showCostEstimator)}
      />

      {showAssetBrowser && (
        <AssetBrowser
          type={assetBrowserType}
          assets={assetBrowserType === 'background' ? backgroundAssets : propAssets}
          characters={assetBrowserType === 'character' ? characters : []}
          onSelect={(asset) => {
            if (assetBrowserType === 'background') {
              setBackground(asset as Asset);
            } else if (assetBrowserType === 'prop') {
              addProp(asset as Asset);
            }
            setShowAssetBrowser(false);
          }}
          onClose={() => setShowAssetBrowser(false)}
        />
      )}

      {showPromptPreview && generatedPrompt && (
        <PromptPreviewModal
          prompt={generatedPrompt}
          scene={scene}
          onClose={() => setShowPromptPreview(false)}
        />
      )}
    </div>
  );
}

interface AssetBrowserProps {
  type: 'character' | 'background' | 'prop';
  assets: Asset[];
  characters: Character[];
  onSelect: (item: Asset | Character) => void;
  onClose: () => void;
}

function AssetBrowser({ type, assets, characters, onSelect, onClose }: AssetBrowserProps) {
  const items = type === 'character' ? characters : assets;
  const Icon = type === 'background' ? Layers : type === 'prop' ? Package : Users;
  const title = type === 'background' ? 'Select Background' : type === 'prop' ? 'Select Prop' : 'Select Character';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No {type}s available</p>
              <p className="text-sm text-gray-500 mt-1">
                Upload {type}s in the Asset Library first
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((item) => {
                const imageUrl = 'file_url' in item ? item.file_url : item.reference_image_url;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <CharacterImage
                      url={imageUrl}
                      alt={item.name}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                      fallback={
                        <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                          <Icon className="w-10 h-10 text-gray-400" />
                        </div>
                      }
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <div className="text-sm font-medium text-white truncate">{item.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PromptPreviewModalProps {
  prompt: string;
  scene: SceneComposition;
  onClose: () => void;
}

function PromptPreviewModal({ prompt, scene, onClose }: PromptPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Generated Veo 3 Prompt</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Scene Composition</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Characters</span>
                </div>
                <p className="text-blue-700">
                  {scene.characters.length > 0
                    ? scene.characters.map(sc => sc.character.name).join(', ')
                    : 'None'}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-900">Background</span>
                </div>
                <p className="text-green-700">{scene.background?.name || 'None'}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-900">Props</span>
                </div>
                <p className="text-amber-700">
                  {scene.props.length > 0 ? scene.props.map(p => p.name).join(', ') : 'None'}
                </p>
              </div>
            </div>
          </div>

          {scene.dialogue.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Dialogue</h3>
              <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                {scene.dialogue.map((line, idx) => (
                  <div key={line.id} className="text-sm">
                    <span className="font-semibold text-purple-900">{line.characterName}:</span>{' '}
                    <span className="text-purple-700">"{line.text}"</span>
                    {line.voiceId && (
                      <span className="ml-2 text-xs text-purple-500">
                        [{line.voiceProvider}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Full Prompt</h3>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 whitespace-pre-wrap">
              {prompt}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProductionCostEstimatorProps {
  expanded: boolean;
  onToggle: () => void;
}

function ProductionCostEstimator({ expanded, onToggle }: ProductionCostEstimatorProps) {
  const [voicePercentage, setVoicePercentage] = useState(50);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'fast'>('standard');

  const formatPresets = [
    { key: 'short_5min', label: '5 min', minutes: 5 },
    { key: 'youtube_standard', label: '10 min', minutes: 10 },
    { key: 'streaming', label: '22 min', minutes: 22 },
    { key: 'broadcast_45min', label: '42 min', minutes: 42 },
  ];

  const voicePresets = [
    { label: '25%', value: 25 },
    { label: '50%', value: 50 },
    { label: '75%', value: 75 },
    { label: '100%', value: 100 },
  ];

  const tierModel: VeoModel = selectedTier === 'fast'
    ? 'veo-3.1-fast-generate-001'
    : 'veo-3.1-generate-001';

  const tierInfo = VEO_MODELS.find(m => m.id === tierModel);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Production Cost Estimator</h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="p-6 pt-2 border-t border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Model Tier:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTier('standard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selectedTier === 'standard'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setSelectedTier('fast')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selectedTier === 'fast'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                Fast (62% savings)
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Voice/Dialogue Percentage
              </label>
              <span className="text-sm font-bold text-blue-600">{voicePercentage}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={voicePercentage}
              onChange={(e) => setVoicePercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex gap-2 mt-3">
              {voicePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setVoicePercentage(preset.value)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    voicePercentage === preset.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-lg p-4 ${selectedTier === 'fast' ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-gray-50 to-blue-50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Estimated Production Costs</h4>
              </div>
              {selectedTier === 'fast' && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Fast Mode
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-2 font-medium text-gray-600">Format</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">TRT</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Voice</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Silent</th>
                    <th className="pb-2 font-medium text-gray-900 text-right">Total</th>
                    {selectedTier === 'fast' && (
                      <th className="pb-2 font-medium text-green-600 text-right">Savings</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formatPresets.map((format) => {
                    const totalSeconds = format.minutes * 60;
                    const costs = calculateProductionCost(totalSeconds, voicePercentage, tierModel);
                    const standardCosts = calculateProductionCost(totalSeconds, voicePercentage, 'veo-3.1-generate-001');
                    const savings = standardCosts.total - costs.total;
                    return (
                      <tr key={format.key} className="hover:bg-white/50">
                        <td className="py-2.5 font-medium text-gray-900">{format.label}</td>
                        <td className="py-2.5 text-right text-gray-600">{format.minutes} min</td>
                        <td className="py-2.5 text-right text-gray-600">
                          ${costs.withVoice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2.5 text-right text-gray-600">
                          ${costs.noVoice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${selectedTier === 'fast' ? 'text-green-700' : 'text-gray-900'}`}>
                          ${costs.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        {selectedTier === 'fast' && (
                          <td className="py-2.5 text-right font-medium text-green-600">
                            -${savings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs">
                {selectedTier === 'fast' ? (
                  <>
                    <span className="text-green-600 font-medium">Video with audio: $0.15/sec</span>
                    <span className="text-green-600 font-medium">Video only: $0.10/sec</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">Video with audio: $0.40/sec</span>
                    <span className="text-gray-500">Video only: $0.20/sec</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
