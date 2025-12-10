import { useState, useEffect } from 'react';
import { X, Save, Wand2, RotateCcw, Copy, History, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface PromptEditorProps {
  shot: StoryboardShot;
  onClose: () => void;
  onSave: () => void;
  onRegenerateWithPrompt?: (newPrompt: string) => void;
}

const PROMPT_TEMPLATES = [
  {
    name: 'Claymation Style',
    template: 'Claymation animation style, handcrafted clay characters with visible textures, colorful and whimsical design, miniature props, soft studio lighting, 16:9 aspect ratio'
  },
  {
    name: 'Dramatic Close-Up',
    template: 'Close-up shot with dramatic lighting, emphasizing character emotion and expression, shallow depth of field, cinematic composition'
  },
  {
    name: 'Wide Establishing',
    template: 'Wide establishing shot showing the full environment, clear spatial relationships, atmospheric lighting, detailed background'
  },
  {
    name: 'Action Sequence',
    template: 'Dynamic action shot with motion blur effects, energetic composition, dramatic camera angle'
  }
];

export function PromptEditor({ shot, onClose, onSave, onRegenerateWithPrompt }: PromptEditorProps) {
  const [prompt, setPrompt] = useState(shot.image_prompt || '');
  const [originalPrompt] = useState(shot.image_prompt || '');
  const [saving, setSaving] = useState(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadPromptHistory();
  }, [shot.id]);

  const loadPromptHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('storyboard_shot_edits')
        .select('new_value, created_at')
        .eq('shot_id', shot.id)
        .eq('field_name', 'image_prompt')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const history = data?.map(edit => edit.new_value as string).filter(Boolean) || [];
      setPromptHistory(history);
    } catch (error) {
      console.error('Error loading prompt history:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('storyboard_shots')
        .update({
          image_prompt: prompt,
          last_edited_by: 'user',
          last_edited_at: new Date().toISOString()
        })
        .eq('id', shot.id);

      if (error) throw error;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert(error instanceof Error ? error.message : 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndRegenerate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('storyboard_shots')
        .update({
          image_prompt: prompt,
          last_edited_by: 'user',
          last_edited_at: new Date().toISOString()
        })
        .eq('id', shot.id);

      if (error) throw error;

      if (onRegenerateWithPrompt) {
        onRegenerateWithPrompt(prompt);
      }

      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert(error instanceof Error ? error.message : 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt(originalPrompt);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    alert('Prompt copied to clipboard!');
  };

  const handleApplyTemplate = (template: string) => {
    setPrompt(template);
    setShowTemplates(false);
  };

  const handleApplyHistoryPrompt = (historicalPrompt: string) => {
    setPrompt(historicalPrompt);
    setShowHistory(false);
  };

  const characterCount = prompt.length;
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const hasChanges = prompt !== originalPrompt;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Edit AI Generation Prompt</h2>
              <p className="text-purple-100 text-sm">Shot #{shot.shot_number} - {shot.shot_type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Image Generation Prompt
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Templates
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>

          {showTemplates && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Prompt Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PROMPT_TEMPLATES.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleApplyTemplate(template.template)}
                    className="text-left p-3 bg-white rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <div className="font-medium text-sm text-blue-900 mb-1">{template.name}</div>
                    <div className="text-xs text-gray-600 line-clamp-2">{template.template}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showHistory && promptHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Previous Prompts</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {promptHistory.map((historicalPrompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleApplyHistoryPrompt(historicalPrompt)}
                    className="w-full text-left p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="text-sm text-gray-700 line-clamp-2">{historicalPrompt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            placeholder="Enter a detailed description for AI image generation..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
          />

          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <div className="flex gap-4">
              <span>{characterCount} characters</span>
              <span>{wordCount} words</span>
            </div>
            {hasChanges && (
              <span className="text-orange-600 font-medium">Unsaved changes</span>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">Tips for Better Prompts</h4>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• Be specific about characters, setting, and mood</li>
              <li>• Include camera angle and composition details</li>
              <li>• Mention lighting style and color palette</li>
              <li>• Describe the animation style (e.g., claymation)</li>
              <li>• Keep it detailed but focused (150-300 words is ideal)</li>
            </ul>
          </div>

          {shot.shot_description && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-2">Current Shot Description</h4>
              <p className="text-sm text-green-800">{shot.shot_description}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Only'}
            </button>
            {onRegenerateWithPrompt && (
              <button
                onClick={handleSaveAndRegenerate}
                disabled={!hasChanges || saving}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wand2 className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save & Regenerate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
