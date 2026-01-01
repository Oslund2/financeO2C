import { useState, useEffect } from 'react';
import { Info, FileText, BookOpen, Archive, CheckCircle, Mic, Save, Loader2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface DocumentaryConfig {
  citation_manager_enabled: boolean;
  citation_style: string;
  auto_cite_sources: boolean;
  period_accuracy_enabled: boolean;
  accuracy_strictness: string;
  historical_fact_checker: boolean;
  archival_integration: boolean;
  archival_source_preference: string;
  documentary_narration: boolean;
  narration_style: string;
  interview_format: boolean;
  interview_style: string;
  background_music: boolean;
  music_style: string;
  visual_evidence_requirement: boolean;
}

const DEFAULT_CONFIG: DocumentaryConfig = {
  citation_manager_enabled: true,
  citation_style: 'chicago',
  auto_cite_sources: true,
  period_accuracy_enabled: true,
  accuracy_strictness: 'high',
  historical_fact_checker: true,
  archival_integration: true,
  archival_source_preference: 'primary',
  documentary_narration: true,
  narration_style: 'authoritative',
  interview_format: false,
  interview_style: 'conversational',
  background_music: true,
  music_style: 'subtle',
  visual_evidence_requirement: true,
};

export function DocumentarySettings() {
  const { showSuccess, showError } = useNotification();
  const { currentOrganization } = useOrganization();
  const [config, setConfig] = useState<DocumentaryConfig>(DEFAULT_CONFIG);
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
        .eq('workspace_type', 'documentary')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const features = data.features as any || {};
        const settings = data.default_settings as any || {};

        setConfig({
          citation_manager_enabled: features.citation_manager?.enabled ?? DEFAULT_CONFIG.citation_manager_enabled,
          citation_style: features.citation_manager?.style ?? DEFAULT_CONFIG.citation_style,
          auto_cite_sources: features.citation_manager?.auto_cite ?? DEFAULT_CONFIG.auto_cite_sources,
          period_accuracy_enabled: features.period_accuracy_checker?.enabled ?? DEFAULT_CONFIG.period_accuracy_enabled,
          accuracy_strictness: features.period_accuracy_checker?.strictness ?? DEFAULT_CONFIG.accuracy_strictness,
          historical_fact_checker: features.historical_fact_checker?.enabled ?? DEFAULT_CONFIG.historical_fact_checker,
          archival_integration: features.archival_integration?.enabled ?? DEFAULT_CONFIG.archival_integration,
          archival_source_preference: features.archival_integration?.source_preference ?? DEFAULT_CONFIG.archival_source_preference,
          documentary_narration: features.documentary_narration?.enabled ?? DEFAULT_CONFIG.documentary_narration,
          narration_style: features.documentary_narration?.style ?? DEFAULT_CONFIG.narration_style,
          interview_format: features.interview_format?.enabled ?? DEFAULT_CONFIG.interview_format,
          interview_style: features.interview_format?.style ?? DEFAULT_CONFIG.interview_style,
          background_music: settings.background_music ?? DEFAULT_CONFIG.background_music,
          music_style: settings.music_style ?? DEFAULT_CONFIG.music_style,
          visual_evidence_requirement: features.period_accuracy?.visual_evidence ?? DEFAULT_CONFIG.visual_evidence_requirement,
        });
      }
    } catch (error) {
      console.error('Failed to load documentary config:', error);
      showError('Failed to load documentary settings');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!currentOrganization) return;

    setSaving(true);
    try {
      const features = {
        citation_manager: {
          enabled: config.citation_manager_enabled,
          style: config.citation_style,
          auto_cite: config.auto_cite_sources,
        },
        period_accuracy_checker: {
          enabled: config.period_accuracy_enabled,
          strictness: config.accuracy_strictness,
        },
        historical_fact_checker: {
          enabled: config.historical_fact_checker,
        },
        archival_integration: {
          enabled: config.archival_integration,
          source_preference: config.archival_source_preference,
        },
        documentary_narration: {
          enabled: config.documentary_narration,
          style: config.narration_style,
        },
        interview_format: {
          enabled: config.interview_format,
          style: config.interview_style,
        },
        period_accuracy: {
          enabled: config.period_accuracy_enabled,
          visual_evidence: config.visual_evidence_requirement,
        },
        documentary_format: {
          enabled: true,
        },
      };

      const defaultSettings = {
        background_music: config.background_music,
        music_style: config.music_style,
        animation_style: 'documentary',
        character_style: 'realistic',
        video_fps: 30,
        lighting_style: 'natural',
      };

      const { error } = await supabase
        .from('workspace_type_configs')
        .upsert({
          workspace_type: 'documentary',
          features,
          default_settings: defaultSettings,
        }, {
          onConflict: 'workspace_type',
        });

      if (error) throw error;

      showSuccess('Documentary settings saved successfully');
    } catch (error) {
      console.error('Failed to save documentary config:', error);
      showError('Failed to save documentary settings');
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
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-800">
            <p className="font-medium mb-1">Documentary Workspace Settings</p>
            <p>Configure settings specific to documentary production, including citation management, historical accuracy checking, and archival source integration.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Citation Management</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.citation_manager_enabled}
                onChange={(e) => setConfig({ ...config, citation_manager_enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Citation Manager</span>
                <p className="text-xs text-gray-500">Automatically track and format citations for all sources</p>
              </div>
            </label>

            {config.citation_manager_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Citation Style
                  </label>
                  <select
                    value={config.citation_style}
                    onChange={(e) => setConfig({ ...config, citation_style: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="chicago">Chicago (Documentary standard)</option>
                    <option value="apa">APA (Social sciences)</option>
                    <option value="mla">MLA (Humanities)</option>
                    <option value="harvard">Harvard (Academic)</option>
                    <option value="custom">Custom Format</option>
                  </select>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.auto_cite_sources}
                    onChange={(e) => setConfig({ ...config, auto_cite_sources: e.target.checked })}
                    className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Auto-Cite Sources</span>
                    <p className="text-xs text-gray-500">Automatically generate citations when sources are added</p>
                  </div>
                </label>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Historical Accuracy</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.period_accuracy_enabled}
                onChange={(e) => setConfig({ ...config, period_accuracy_enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Period Accuracy Checking</span>
                <p className="text-xs text-gray-500">Verify historical accuracy of content and details</p>
              </div>
            </label>

            {config.period_accuracy_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accuracy Strictness
                </label>
                <select
                  value={config.accuracy_strictness}
                  onChange={(e) => setConfig({ ...config, accuracy_strictness: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="low">Low (General period accuracy)</option>
                  <option value="medium">Medium (Moderate verification)</option>
                  <option value="high">High (Strict fact-checking)</option>
                  <option value="academic">Academic (Peer-review level)</option>
                </select>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.historical_fact_checker}
                onChange={(e) => setConfig({ ...config, historical_fact_checker: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Historical Fact Checker</span>
                <p className="text-xs text-gray-500">Verify dates, names, and events against historical records</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.visual_evidence_requirement}
                onChange={(e) => setConfig({ ...config, visual_evidence_requirement: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Require Visual Evidence</span>
                <p className="text-xs text-gray-500">Ensure claims are supported by archival imagery or documentation</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Archival Integration</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.archival_integration}
                onChange={(e) => setConfig({ ...config, archival_integration: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Archival Integration</span>
                <p className="text-xs text-gray-500">Connect with archival databases and collections</p>
              </div>
            </label>

            {config.archival_integration && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Preference
                </label>
                <select
                  value={config.archival_source_preference}
                  onChange={(e) => setConfig({ ...config, archival_source_preference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="primary">Primary Sources Only (Original documents, eyewitness accounts)</option>
                  <option value="secondary">Secondary Sources Allowed (Historical analysis, textbooks)</option>
                  <option value="mixed">Mixed (Both primary and secondary)</option>
                  <option value="peer_reviewed">Peer-Reviewed Academic Sources</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Narration & Format</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.documentary_narration}
                onChange={(e) => setConfig({ ...config, documentary_narration: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Documentary Narration</span>
                <p className="text-xs text-gray-500">Include professional narration in scripts</p>
              </div>
            </label>

            {config.documentary_narration && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Narration Style
                </label>
                <select
                  value={config.narration_style}
                  onChange={(e) => setConfig({ ...config, narration_style: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="authoritative">Authoritative (Traditional documentary voice)</option>
                  <option value="conversational">Conversational (Approachable, friendly)</option>
                  <option value="academic">Academic (Scholarly, formal)</option>
                  <option value="dramatic">Dramatic (Storytelling emphasis)</option>
                  <option value="neutral">Neutral (Objective observer)</option>
                </select>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.interview_format}
                onChange={(e) => setConfig({ ...config, interview_format: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Include Interview Format</span>
                <p className="text-xs text-gray-500">Add expert interviews and testimonials</p>
              </div>
            </label>

            {config.interview_format && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Style
                </label>
                <select
                  value={config.interview_style}
                  onChange={(e) => setConfig({ ...config, interview_style: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="conversational">Conversational (Natural dialogue)</option>
                  <option value="formal">Formal (Structured questions)</option>
                  <option value="casual">Casual (Informal, relaxed)</option>
                  <option value="investigative">Investigative (Probing, in-depth)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Production Style</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.background_music}
                onChange={(e) => setConfig({ ...config, background_music: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Background Music</span>
                <p className="text-xs text-gray-500">Include atmospheric music in production</p>
              </div>
            </label>

            {config.background_music && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Music Style
                </label>
                <select
                  value={config.music_style}
                  onChange={(e) => setConfig({ ...config, music_style: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="subtle">Subtle (Minimal, atmospheric)</option>
                  <option value="dramatic">Dramatic (Emotional emphasis)</option>
                  <option value="orchestral">Orchestral (Classical, epic)</option>
                  <option value="ambient">Ambient (Background texture)</option>
                  <option value="period">Period-Appropriate (Historical accuracy)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
