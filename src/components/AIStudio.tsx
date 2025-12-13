import { useState, useEffect } from 'react';
import { Sparkles, Wand2, FileText, Users, Image as ImageIcon, Video, Mic, AlertCircle, CheckCircle, Settings as SettingsIcon, ArrowRight, Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { generateScriptWithGemini, checkVertexAIConfiguration } from '../services/geminiService';
import { getUserSettings } from '../services/settingsService';
import { VoiceGenerationTab } from './VoiceGenerationTab';

type Character = Database['public']['Tables']['characters']['Row'];

interface AIStudioProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
}

export function AIStudio({ seriesId, onNavigate }: AIStudioProps) {
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard' | 'image' | 'video' | 'voice'>('script');

  const tabs = [
    { id: 'script', label: 'Script Generation', icon: FileText },
    { id: 'storyboard', label: 'Storyboard Generation', icon: Wand2 },
    { id: 'image', label: 'Image Generation', icon: ImageIcon },
    { id: 'video', label: 'Video Generation', icon: Video },
    { id: 'voice', label: 'Voice Generation', icon: Mic },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Studio</h1>
              <p className="text-gray-600">Generate content using AI</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-scripps-blue border-b-2 border-scripps-blue bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'script' && <ScriptGeneration seriesId={seriesId} onNavigate={onNavigate} />}
            {activeTab === 'storyboard' && <StoryboardGeneration onNavigate={onNavigate} />}
            {activeTab === 'image' && <ImageGeneration seriesId={seriesId} />}
            {activeTab === 'video' && <VideoGeneration />}
            {activeTab === 'voice' && <VoiceGeneration seriesId={seriesId} onNavigate={onNavigate} />}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScriptGenerationProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
}

function ScriptGeneration({ seriesId, onNavigate }: ScriptGenerationProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    episodeNumber: '',
    theme: '',
    mainCharacters: [] as string[],
    vocabularyWords: '',
    plotSummary: '',
    tone: 'comedic',
  });
  const [generating, setGenerating] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; missing: string[] } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [progress, setProgress] = useState({
    elapsedSeconds: 0,
    statusMessage: '',
    percentage: 0
  });
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    loadCharacters();
    checkConfiguration();
  }, [seriesId]);

  const checkConfiguration = () => {
    const status = checkVertexAIConfiguration();
    setConfigStatus(status);
  };

  const loadCharacters = async () => {
    try {
      let query = supabase.from('characters').select('*');
      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }
      const { data } = await query;

      const roleOrder = { 'Primary': 1, 'Ensemble': 2, 'Recurring': 3, 'Cameo': 4 };
      const sortedData = (data || []).sort((a, b) => {
        const roleA = roleOrder[a.role as keyof typeof roleOrder] || 999;
        const roleB = roleOrder[b.role as keyof typeof roleOrder] || 999;
        if (roleA !== roleB) return roleA - roleB;
        return (a.name || '').localeCompare(b.name || '');
      });

      setCharacters(sortedData);
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  const getErrorMessage = (error: Error): string => {
    const errorMsg = error.message;

    if (errorMsg === 'TIMEOUT') {
      return 'The AI script generation took longer than expected (over 4 minutes). This sometimes happens with complex requests. Please try again, and the AI should respond more quickly.';
    }

    if (errorMsg === 'QUOTA_EXCEEDED') {
      return 'Your Gemini API quota has been exceeded. Please check your Google Cloud console or try again later.';
    }

    if (errorMsg === 'INVALID_API_KEY') {
      return 'Your Gemini API key appears to be invalid. Please verify it in Settings.';
    }

    if (errorMsg === 'SERVER_ERROR') {
      return 'The Gemini API is currently experiencing issues. Please try again in a few moments.';
    }

    if (errorMsg === 'EMPTY_RESPONSE') {
      return 'The AI generated an incomplete script. This is rare, but please try generating again.';
    }

    if (errorMsg === 'INVALID_JSON') {
      return 'The AI generated an incomplete script. This is rare, but please try generating again.';
    }

    if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      return 'Unable to connect to the Gemini API. Please check your internet connection and try again.';
    }

    if (errorMsg.includes('Script is too short') || errorMsg.includes('Script is too long')) {
      return 'The AI generated a script with incorrect length. Please try again.';
    }

    return `An unexpected error occurred: ${errorMsg}. Please try again.`;
  };

  const handleGenerate = async () => {
    if (!formData.title.trim()) {
      setGenerationError('Please enter an episode title before generating.');
      return;
    }

    if (!formData.theme.trim()) {
      setGenerationError('Please enter a theme or focus for the episode.');
      return;
    }

    if (!configStatus?.configured) {
      setGenerationError('Gemini API is not configured. Please set up your API key in Settings.');
      return;
    }

    if (formData.mainCharacters.length === 0) {
      setGenerationError('Please select at least one character before generating.');
      return;
    }

    if (formData.plotSummary.length > 2000) {
      setGenerationError('Your plot summary is too long (over 2000 characters). Please shorten it and try again. Very long summaries can slow down generation.');
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);

    const timeout = setTimeout(() => {
      controller.abort();
    }, 240000);

    setGenerating(true);
    setGenerationError(null);
    setProgress({ elapsedSeconds: 0, statusMessage: 'Initializing AI...', percentage: 0 });

    const progressMessages = [
      'Analyzing characters...',
      'Processing episode structure...',
      'Creating dialogue...',
      'Generating scenes...',
      'Building script structure...',
      'Refining dialogue...',
      'Adding stage directions...',
      'Optimizing scene transitions...',
      'Polishing script structure...',
      'Validating timecodes...',
      'Finalizing details...',
      'Almost complete...'
    ];

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newElapsed = prev.elapsedSeconds + 1;
        const percentage = Math.min((newElapsed / 240) * 100, 95);

        const messageIndex = Math.min(
          Math.floor(newElapsed / 20),
          progressMessages.length - 1
        );

        return {
          elapsedSeconds: newElapsed,
          statusMessage: progressMessages[messageIndex],
          percentage
        };
      });
    }, 1000);

    try {
      const vocabularyArray = formData.vocabularyWords
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);

      const selectedCharacters = characters.filter(c =>
        formData.mainCharacters.includes(c.id)
      );

      const settings = await getUserSettings();

      const episodeData = {
        id: crypto.randomUUID(),
        title: formData.title,
        synopsis: formData.plotSummary,
        theme: formData.theme,
        target_age_group: '6-10 years',
        vocabulary_words: vocabularyArray.map(word => ({
          word,
          definition: '',
          example_sentence: ''
        }))
      };

      const generatedScript = await generateScriptWithGemini(
        episodeData,
        selectedCharacters.map(c => ({
          id: c.id,
          name: c.name,
          personality_traits: c.personality_traits || [],
          role: c.role || 'supporting',
          voice_id: c.voice_id,
          image_url: c.image_url
        })),
        settings.generation_preferences,
        controller.signal
      );

      clearTimeout(timeout);
      clearInterval(progressInterval);

      setProgress({ elapsedSeconds: 240, statusMessage: 'Complete!', percentage: 100 });

      setGeneratedData({
        script: generatedScript,
        episodeData,
        selectedCharacters
      });
      setShowPreview(true);

    } catch (error) {
      clearTimeout(timeout);
      clearInterval(progressInterval);
      console.error('Error generating script:', error);

      const errorMessage = error instanceof Error
        ? getErrorMessage(error)
        : 'An unexpected error occurred. Please try again.';

      setGenerationError(errorMessage);
    } finally {
      setGenerating(false);
      setAbortController(null);
    }
  };

  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      setGenerating(false);
      setAbortController(null);
      setGenerationError('Generation cancelled by user.');
    }
  };

  const handleSaveScript = async () => {
    if (!generatedData) return;

    setGenerating(true);
    try {
      const vocabularyArray = formData.vocabularyWords
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);

      const scriptData = {
        series_id: seriesId,
        title: generatedData.script.title,
        episode_number: formData.episodeNumber ? parseInt(formData.episodeNumber) : null,
        theme: formData.theme,
        synopsis: generatedData.script.synopsis,
        vocabulary_words: vocabularyArray,
        ai_generated: true,
        generation_prompt: JSON.stringify(formData),
        status: 'draft',
      };

      const { data: script, error: scriptError } = await supabase
        .from('scripts')
        .insert([scriptData])
        .select()
        .single();

      if (scriptError) throw scriptError;

      for (const act of generatedData.script.acts) {
        const { data: actData, error: actError } = await supabase
          .from('script_acts')
          .insert([{
            script_id: script.id,
            act_number: act.act_number,
            content: `${act.title}\n\n${act.description}`,
            duration_estimate: act.scenes.reduce((sum: number, s: any) => sum + (s.duration_estimate || 0), 0),
            notes: act.title
          }])
          .select()
          .single();

        if (actError) throw actError;

        for (let sceneIndex = 0; sceneIndex < act.scenes.length; sceneIndex++) {
          const scene = act.scenes[sceneIndex];
          const { error: sceneError } = await supabase
            .from('script_scenes')
            .insert([{
              act_id: actData.id,
              scene_number: sceneIndex + 1,
              setting: scene.title,
              description: scene.description,
              dialogue: scene.dialogue,
              stage_directions: scene.claymation_notes || '',
              duration_estimate: scene.duration_estimate
            }]);

          if (sceneError) throw sceneError;
        }
      }

      const { error: jobError } = await supabase
        .from('production_jobs')
        .insert([{
          script_id: script.id,
          series_id: seriesId,
          job_type: 'ai_script_generation',
          entity_id: script.id,
          entity_type: 'script',
          status: 'completed',
          service: 'gemini_2.0_flash',
          request_payload: formData,
          response_data: { script: generatedData.script },
          completed_at: new Date().toISOString()
        }]);

      if (jobError) console.error('Error logging production job:', jobError);

      setSavedScriptId(script.id);
      setShowPreview(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving script:', error);
      alert('Failed to save script. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {!configStatus?.configured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Gemini API Not Configured</h3>
              <p className="text-sm text-red-800 mb-2">
                To use AI script generation, you need to configure your Gemini API key.
              </p>
              <p className="text-sm text-red-800 mb-2">
                Missing: {configStatus?.missing.join(', ')}
              </p>
              <button
                onClick={() => onNavigate('settings')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <SettingsIcon className="w-4 h-4" />
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {configStatus?.configured && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Gemini 2.5 Flash Connected</h3>
              <p className="text-sm text-green-800">
                Your Gemini API key is configured and ready to generate scripts.
              </p>
            </div>
          </div>
        </div>
      )}

      {generationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Generation Error</h3>
              <p className="text-sm text-red-800">{generationError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Wand2 className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">AI-Powered Script Generation</h3>
            <p className="text-sm text-blue-800">
              Generate complete episode scripts using Gemini 2.5 Flash. Provide details about your episode, select characters, and let AI create a full script structure with acts, scenes, and dialogue.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Episode Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
            placeholder="e.g., Spell-Mageddon"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Episode Number
          </label>
          <input
            type="number"
            value={formData.episodeNumber}
            onChange={(e) => setFormData({ ...formData, episodeNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
            placeholder="e.g., 1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Theme/Focus *
        </label>
        <input
          type="text"
          value={formData.theme}
          onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
          placeholder="e.g., Overcoming anxiety in competition"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Characters
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {characters.map((character) => {
            const isSelected = formData.mainCharacters.includes(character.id);
            return (
              <button
                key={character.id}
                onClick={() => {
                  if (isSelected) {
                    setFormData({
                      ...formData,
                      mainCharacters: formData.mainCharacters.filter((id) => id !== character.id),
                    });
                  } else {
                    setFormData({
                      ...formData,
                      mainCharacters: [...formData.mainCharacters, character.id],
                    });
                  }
                }}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-scripps-blue bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-gray-900">{character.name}</div>
                  {character.role && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      character.role === 'Primary' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                      character.role === 'Ensemble' ? 'bg-green-100 text-green-700 border border-green-300' :
                      character.role === 'Recurring' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                      'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}>
                      {character.role}
                    </span>
                  )}
                </div>
                {character.age && <div className="text-xs text-gray-600">Age {character.age}</div>}
              </button>
            );
          })}
        </div>
        {characters.length === 0 && (
          <p className="text-sm text-gray-600 mt-2">
            No characters available.{' '}
            <button
              onClick={() => onNavigate('characters')}
              className="text-scripps-blue hover:underline"
            >
              Create characters first
            </button>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Vocabulary Words (Spelling Bee)
        </label>
        <input
          type="text"
          value={formData.vocabularyWords}
          onChange={(e) => setFormData({ ...formData, vocabularyWords: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
          placeholder="Comma-separated words (e.g., sesquipedalian, onomatopoeia, cryptography)"
        />
        <p className="text-xs text-gray-600 mt-1">
          These words will be naturally integrated into the script
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Plot Summary/Direction
        </label>
        <textarea
          value={formData.plotSummary}
          onChange={(e) => setFormData({ ...formData, plotSummary: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
          placeholder="Describe the main plot points, conflicts, and resolution you want in the episode..."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Tone
        </label>
        <select
          value={formData.tone}
          onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
        >
          <option value="comedic">Comedic</option>
          <option value="dramatic">Dramatic</option>
          <option value="inspirational">Inspirational</option>
          <option value="suspenseful">Suspenseful</option>
        </select>
      </div>

      {configStatus?.configured && !generating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Generation Time</p>
              <p>
                Script generation typically takes 1-3 minutes. The AI will create a complete 4-segment episode with detailed scenes and dialogue.
                If generation exceeds 4 minutes, it will automatically timeout and you can try again.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4">
        {generating ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Generating Script with AI</h3>
                  <p className="text-sm text-gray-600 mt-1">{progress.statusMessage}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{progress.elapsedSeconds}s</div>
                  <div className="text-xs text-gray-600">of 240s max</div>
                </div>
              </div>

              <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                >
                  <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{Math.round(progress.percentage)}% Complete</span>
                <span>{240 - progress.elapsedSeconds}s remaining</span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>AI is working...</span>
              </div>
            </div>

            <button
              onClick={handleCancelGeneration}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium"
            >
              <X className="w-5 h-5" />
              Cancel Generation
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleGenerate}
              disabled={!configStatus?.configured}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 text-lg"
            >
              <Sparkles className="w-6 h-6" />
              Generate Complete Episode Script
            </button>
            {configStatus?.configured && (
              <p className="text-xs text-gray-600 text-center mt-2">
                Using Gemini 2.5 Flash to generate a complete 4-segment script with dialogue
              </p>
            )}
          </>
        )}
      </div>

      {showPreview && generatedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Generated Script Preview</h2>
              <p className="text-gray-600 mt-1">{generatedData.script.title}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Synopsis</h3>
                <p className="text-gray-700">{generatedData.script.synopsis}</p>
              </div>

              {generatedData.script.acts.map((act: any, actIndex: number) => (
                <div key={actIndex} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{act.title}</h3>
                  <p className="text-sm text-gray-700 mb-4">{act.description}</p>

                  <div className="space-y-4">
                    {act.scenes.map((scene: any, sceneIndex: number) => (
                      <div key={sceneIndex} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{scene.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{scene.description}</p>

                        <div className="space-y-2">
                          {scene.dialogue.map((line: any, lineIndex: number) => (
                            <div key={lineIndex} className="text-sm">
                              <span className="font-semibold text-gray-900">{line.character}:</span>{' '}
                              <span className="text-gray-700">{line.line}</span>
                              {line.stage_direction && (
                                <span className="text-gray-500 italic ml-2">({line.stage_direction})</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {scene.claymation_notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold">Production Notes:</span> {scene.claymation_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-4">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScript}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
              >
                {generating ? 'Saving...' : 'Save Script'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Script Saved Successfully!</h2>
                  <p className="text-green-50 mt-1">Your AI-generated script is ready</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Script Details</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><span className="font-medium">Title:</span> {formData.title}</p>
                  <p><span className="font-medium">Theme:</span> {formData.theme}</p>
                  <p><span className="font-medium">Status:</span> Draft (ready for review)</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Review and edit the script in the Scripts page</li>
                      <li>Approve the script when ready</li>
                      <li>Create an episode to start production</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setFormData({
                      title: '',
                      episodeNumber: '',
                      theme: '',
                      mainCharacters: [],
                      vocabularyWords: '',
                      plotSummary: '',
                      tone: 'comedic',
                    });
                    setGeneratedData(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Create Another Script
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    onNavigate('scripts');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  <Eye className="w-5 h-5" />
                  View Script
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageGeneration({ seriesId }: { seriesId: string | null }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <ImageIcon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Image Generation</h3>
      <p className="text-gray-600 mb-4">
        Generate character references, backgrounds, and scene images using Gemini 3
      </p>
      <p className="text-sm text-scripps-blue">Coming soon...</p>
    </div>
  );
}

function VideoGeneration() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Video className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Video Generation</h3>
      <p className="text-gray-600 mb-4">
        Create animated claymation clips using Veo 3 from static images
      </p>
      <p className="text-sm text-scripps-blue">Coming soon...</p>
    </div>
  );
}

function StoryboardGeneration({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Wand2 className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Storyboard Generation</h3>
      <p className="text-gray-600 mb-4 max-w-2xl mx-auto">
        Transform your scripts into detailed visual storyboards. AI analyzes your scenes, breaks them down into optimal shot sequences, and generates professional production-ready shot descriptions with camera angles, compositions, and lighting notes.
      </p>
      <button
        onClick={() => onNavigate('storyboard-generator')}
        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
      >
        Go to Storyboard Generator
      </button>
    </div>
  );
}

function VoiceGeneration({ seriesId, onNavigate }: { seriesId: string | null; onNavigate: (view: string) => void }) {
  return <VoiceGenerationTab seriesId={seriesId} onNavigate={onNavigate} />;
}
