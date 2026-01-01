import { useState, useEffect } from 'react';
import { Info, Palette, Box, Grid3x3, Layers, BookOpen, Save, Loader2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface ClaymationConfig {
  vocabulary_randomizer_enabled: boolean;
  vocabulary_randomizer_count: number;
  clay_texture_style: string;
  clay_finish: string;
  miniature_scale: string;
  lighting_temperature: string;
  character_rig_complexity: string;
  spelling_word_integration: boolean;
  spelling_bee_context: boolean;
  children_friendly_content: boolean;
  educational_tone: boolean;
}

const DEFAULT_CONFIG: ClaymationConfig = {
  vocabulary_randomizer_enabled: true,
  vocabulary_randomizer_count: 5,
  clay_texture_style: 'smooth',
  clay_finish: 'matte',
  miniature_scale: '1:12',
  lighting_temperature: 'warm',
  character_rig_complexity: 'medium',
  spelling_word_integration: true,
  spelling_bee_context: true,
  children_friendly_content: true,
  educational_tone: true,
};

export function ClaymationSettings() {
  const { showSuccess, showError } = useNotification();
  const { currentOrganization } = useOrganization();
  const [config, setConfig] = useState<ClaymationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [currentOrganization]);

  const loadConfig = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_type_configs')
        .select('features, default_settings')
        .eq('workspace_type', 'claymation')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const features = data.features as any || {};
        const settings = data.default_settings as any || {};

        setConfig({
          vocabulary_randomizer_enabled: features.vocabulary_randomizer?.enabled ?? DEFAULT_CONFIG.vocabulary_randomizer_enabled,
          vocabulary_randomizer_count: features.vocabulary_randomizer?.word_count ?? DEFAULT_CONFIG.vocabulary_randomizer_count,
          clay_texture_style: settings.clay_texture_style ?? DEFAULT_CONFIG.clay_texture_style,
          clay_finish: settings.clay_finish ?? DEFAULT_CONFIG.clay_finish,
          miniature_scale: settings.miniature_scale ?? DEFAULT_CONFIG.miniature_scale,
          lighting_temperature: settings.lighting_temperature ?? DEFAULT_CONFIG.lighting_temperature,
          character_rig_complexity: settings.character_rig_complexity ?? DEFAULT_CONFIG.character_rig_complexity,
          spelling_word_integration: features.spelling_word_integration?.enabled ?? DEFAULT_CONFIG.spelling_word_integration,
          spelling_bee_context: features.spelling_word_integration?.use_context ?? DEFAULT_CONFIG.spelling_bee_context,
          children_friendly_content: features.children_format?.enabled ?? DEFAULT_CONFIG.children_friendly_content,
          educational_tone: features.children_format?.educational_tone ?? DEFAULT_CONFIG.educational_tone,
        });
      }
    } catch (error) {
      console.error('Failed to load claymation config:', error);
      showError('Failed to load claymation settings');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!currentOrganization) return;

    setSaving(true);
    try {
      const features = {
        vocabulary_randomizer: {
          enabled: config.vocabulary_randomizer_enabled,
          word_count: config.vocabulary_randomizer_count,
        },
        spelling_word_integration: {
          enabled: config.spelling_word_integration,
          use_context: config.spelling_bee_context,
        },
        children_format: {
          enabled: config.children_friendly_content,
          educational_tone: config.educational_tone,
        },
        clay_texture_settings: { enabled: true },
        miniature_set_designer: { enabled: true },
        character_rig_library: { enabled: true },
        clay_video_style: { enabled: true },
      };

      const defaultSettings = {
        clay_texture_style: config.clay_texture_style,
        clay_finish: config.clay_finish,
        miniature_scale: config.miniature_scale,
        lighting_temperature: config.lighting_temperature,
        character_rig_complexity: config.character_rig_complexity,
        animation_style: 'claymation',
        character_style: 'clay',
        video_fps: 24,
      };

      const { error } = await supabase
        .from('workspace_type_configs')
        .upsert({
          workspace_type: 'claymation',
          features,
          default_settings: defaultSettings,
        }, {
          onConflict: 'workspace_type',
        });

      if (error) throw error;

      showSuccess('Claymation settings saved successfully');
    } catch (error) {
      console.error('Failed to save claymation config:', error);
      showError('Failed to save claymation settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-pink-800">
            <p className="font-medium mb-1">Claymation Workspace Settings</p>
            <p>Configure settings specific to claymation animation production, including spelling bee integration, clay textures, and character design preferences.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-gray-900">Spelling Bee Integration</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.vocabulary_randomizer_enabled}
                onChange={(e) => setConfig({ ...config, vocabulary_randomizer_enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Vocabulary Randomizer</span>
                <p className="text-xs text-gray-500">Automatically select random spelling bee words for episode content</p>
              </div>
            </label>

            {config.vocabulary_randomizer_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Words Per Episode
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.vocabulary_randomizer_count}
                  onChange={(e) => setConfig({ ...config, vocabulary_randomizer_count: parseInt(e.target.value) || 5 })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.spelling_word_integration}
                onChange={(e) => setConfig({ ...config, spelling_word_integration: e.target.checked })}
                className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Spelling Word Integration</span>
                <p className="text-xs text-gray-500">Integrate selected words into character dialogue and scene descriptions</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.spelling_bee_context}
                onChange={(e) => setConfig({ ...config, spelling_bee_context: e.target.checked })}
                className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Use Spelling Bee Context</span>
                <p className="text-xs text-gray-500">Include word origins, definitions, and usage examples in prompts</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-gray-900">Clay Texture & Finish</h3>
          </div>
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texture Style
              </label>
              <select
                value={config.clay_texture_style}
                onChange={(e) => setConfig({ ...config, clay_texture_style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="smooth">Smooth (Wallace & Gromit style)</option>
                <option value="textured">Textured (Visible fingerprints)</option>
                <option value="rough">Rough (Sculptural look)</option>
                <option value="hybrid">Hybrid (Mix of smooth and textured)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Finish Type
              </label>
              <select
                value={config.clay_finish}
                onChange={(e) => setConfig({ ...config, clay_finish: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="matte">Matte (Traditional clay)</option>
                <option value="satin">Satin (Slight sheen)</option>
                <option value="glossy">Glossy (Polished look)</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Box className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-gray-900">Miniature Set Design</h3>
          </div>
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scale
              </label>
              <select
                value={config.miniature_scale}
                onChange={(e) => setConfig({ ...config, miniature_scale: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="1:6">1:6 (Large scale - detailed sets)</option>
                <option value="1:12">1:12 (Standard dollhouse scale)</option>
                <option value="1:24">1:24 (Compact - easier storage)</option>
                <option value="1:48">1:48 (Miniature - wide shots)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lighting Temperature
              </label>
              <select
                value={config.lighting_temperature}
                onChange={(e) => setConfig({ ...config, lighting_temperature: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="warm">Warm (Cozy, inviting)</option>
                <option value="neutral">Neutral (Natural light)</option>
                <option value="cool">Cool (Modern, dramatic)</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-gray-900">Character Design</h3>
          </div>
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rig Complexity
              </label>
              <select
                value={config.character_rig_complexity}
                onChange={(e) => setConfig({ ...config, character_rig_complexity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="simple">Simple (Basic armature, limited poses)</option>
                <option value="medium">Medium (Standard armature, good range)</option>
                <option value="complex">Complex (Advanced rig, maximum flexibility)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                More complex rigs enable more sophisticated movements but require more setup time
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.children_friendly_content}
                onChange={(e) => setConfig({ ...config, children_friendly_content: e.target.checked })}
                className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Children-Friendly Content</span>
                <p className="text-xs text-gray-500">Ensure all content is appropriate for young audiences</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.educational_tone}
                onChange={(e) => setConfig({ ...config, educational_tone: e.target.checked })}
                className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Educational Tone</span>
                <p className="text-xs text-gray-500">Maintain an educational and instructive tone throughout</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
