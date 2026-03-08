import { useState, useEffect, useCallback } from 'react';
import { Key, Database, Sparkles, ExternalLink, CheckCircle, XCircle, Info, BookOpen, ChevronDown, ChevronUp, Copy, Code, Layers, FileCode, Palette, Rocket, DollarSign, FolderTree, Building2, Film, Shield, Clock, AlertTriangle, History, Download, RefreshCw, Archive, Activity, Video, Mic2, Image, Zap, Hammer, Briefcase, Sliders, Globe, Brain, Volume2, Monitor, Languages, FileSearch, FileText, Printer, Loader2 } from 'lucide-react';
import { getAPIKeyStatus, getConfigurationInstructions, getUserSettings, updateUserSettings, checkAllAPIHealth, type UserSettings, type AllAPIStatus, type APIHealthStatus } from '../services/settingsService';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotification } from '../contexts/NotificationContext';
import { LipSyncSettings } from './LipSyncSettings';
import { PromptLibrary } from './PromptLibrary';
import { PatentIntelligenceSettings } from './PatentIntelligenceSettings';
import { HowToGuide } from './HowToGuide';
import { WorkspaceSpecificSettings } from './WorkspaceSpecificSettings';
import { MissionControlPanel } from './MissionControlPanel';
import { HeyGenConfigPanel } from './HeyGenConfigPanel';
import { SettingsBackupPanel } from './SettingsBackupPanel';
import { SettingsCostConfig } from './SettingsCostConfig';
import { VEO_MODELS, type VeoModel } from '../services/vertexAIService';

export function Settings() {
  const { currentOrganization } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const [apiStatus, setApiStatus] = useState<ReturnType<typeof getAPIKeyStatus> | null>(null);
  const [apiHealth, setApiHealth] = useState<AllAPIStatus | null>(null);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);
  const [techDocsExpanded, setTechDocsExpanded] = useState(true);
  const [backupExpanded, setBackupExpanded] = useState(false);
  const [promptLibraryExpanded, setPromptLibraryExpanded] = useState(false);
  const [nextStepsExpanded, setNextStepsExpanded] = useState(false);
  const [missionControlExpanded, setMissionControlExpanded] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [vertexAIExpanded, setVertexAIExpanded] = useState(false);
  const [elevenLabsExpanded, setElevenLabsExpanded] = useState(false);
  const [databaseExpanded, setDatabaseExpanded] = useState(false);
  const [creatorCostExpanded, setCreatorCostExpanded] = useState(false);
  const [lipSyncExpanded, setLipSyncExpanded] = useState(false);
  const [productionCostExpanded, setProductionCostExpanded] = useState(false);
  const [geminiExpanded, setGeminiExpanded] = useState(false);
  const [voiceSettingsExpanded, setVoiceSettingsExpanded] = useState(false);
  const [videoSettingsExpanded, setVideoSettingsExpanded] = useState(false);
  const [translationExpanded, setTranslationExpanded] = useState(false);
  const [heygenExpanded, setHeygenExpanded] = useState(false);
  const [patentSettingsExpanded, setPatentSettingsExpanded] = useState(false);
  const [releasesExpanded, setReleasesExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('how-to');
  const [copiedText, setCopiedText] = useState('');

  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userSettingsLoading, setUserSettingsLoading] = useState(false);
  const [userSettingsSaving, setUserSettingsSaving] = useState(false);


  useEffect(() => {
    checkAPIStatus();
    loadUserSettings();
    runHealthChecks();
  }, []);

  const runHealthChecks = useCallback(async () => {
    setHealthCheckLoading(true);
    try {
      const health = await checkAllAPIHealth();
      setApiHealth(health);
    } catch (err) {
      console.error('Failed to run health checks:', err);
    } finally {
      setHealthCheckLoading(false);
    }
  }, []);


  const loadUserSettings = async () => {
    setUserSettingsLoading(true);
    try {
      const settings = await getUserSettings();
      setUserSettings(settings);
    } catch (err) {
      console.error('Failed to load user settings:', err);
    } finally {
      setUserSettingsLoading(false);
    }
  };

  const handleUpdateUserSettings = async (updates: Partial<UserSettings>) => {
    setUserSettingsSaving(true);
    try {
      const updated = await updateUserSettings(updates);
      if (updated) {
        setUserSettings(updated);
        showSuccess('Settings saved', 'Your preferences have been updated');
      } else {
        showError('Save failed', 'Could not save your settings. Please try again.');
      }
    } catch (err) {
      console.error('Failed to update user settings:', err);
      showError('Save failed', 'An error occurred while saving your settings');
    } finally {
      setUserSettingsSaving(false);
    }
  };


  const renderHealthIndicator = (health: APIHealthStatus | undefined, label: string) => {
    if (!health) {
      return <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" title="Checking..." />;
    }
    if (!health.configured) {
      return <XCircle className="w-5 h-5 text-gray-400" title={`${label} not configured`} />;
    }
    if (health.checking) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" title="Checking..." />;
    }
    if (health.healthy) {
      return <CheckCircle className="w-5 h-5 text-green-600" title={`${label} connected`} />;
    }
    return (
      <div className="relative group">
        <XCircle className="w-5 h-5 text-red-500" />
        {health.error && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {health.error}
          </div>
        )}
      </div>
    );
  };

  const getHealthStatusText = (health: APIHealthStatus | undefined): string => {
    if (!health) return 'Checking...';
    if (!health.configured) return 'Not configured';
    if (health.checking) return 'Checking...';
    if (health.healthy) return 'Connected';
    return health.error || 'Connection failed';
  };

  const getHealthStatusColor = (health: APIHealthStatus | undefined): string => {
    if (!health || health.checking) return 'text-gray-500';
    if (!health.configured) return 'text-gray-400';
    if (health.healthy) return 'text-green-600';
    return 'text-red-500';
  };

  const countConfiguredAPIs = (): { configured: number; total: number } => {
    if (!apiHealth) return { configured: 0, total: 8 };
    const apis = [
      apiHealth.gemini,
      apiHealth.vertexAI,
      apiHealth.elevenLabs,
      apiHealth.chatterbox,
      apiHealth.syncLabs,
      apiHealth.veedIo,
      apiHealth.nanoBanana,
      apiHealth.supabase
    ];
    return {
      configured: apis.filter(a => a.configured && a.healthy).length,
      total: apis.length
    };
  };

  const checkAPIStatus = () => {
    const status = getAPIKeyStatus();
    setApiStatus(status);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
      case 'valid':
      case 'active':
        return 'text-green-600';
      case 'failed':
      case 'invalid':
        return 'text-red-600';
      case 'warning':
      case 'expired':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
      case 'invalid':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const instructions = getConfigurationInstructions();

  const apiCounts = countConfiguredAPIs();
  const requiredNotConfigured = apiHealth ? [
    !apiHealth.vertexAI.configured && 'Vertex AI',
    !apiHealth.syncLabs.configured && !apiHealth.veedIo.configured && 'Lip Sync Provider'
  ].filter(Boolean).length : 2;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Configure your AI services and application settings</p>
          </div>
          <button
            onClick={runHealthChecks}
            disabled={healthCheckLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 self-start sm:self-auto"
            aria-label="Refresh API health status"
          >
            <RefreshCw className={`w-4 h-4 ${healthCheckLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh Status</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="font-semibold text-gray-900">API Connection Status</h3>
            <div className="flex items-center gap-2">
              {healthCheckLoading ? (
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking connections...
                </span>
              ) : (
                <span className={`text-sm font-medium ${apiCounts.configured === apiCounts.total ? 'text-green-600' : 'text-amber-600'}`}>
                  {apiCounts.configured} of {apiCounts.total} services connected
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { key: 'gemini', label: 'Gemini AI', health: apiHealth?.gemini },
              { key: 'vertexAI', label: 'Vertex AI', health: apiHealth?.vertexAI },
              { key: 'elevenLabs', label: 'ElevenLabs', health: apiHealth?.elevenLabs },
              { key: 'supabase', label: 'Database', health: apiHealth?.supabase },
              { key: 'syncLabs', label: 'Sync Labs', health: apiHealth?.syncLabs },
              { key: 'veedIo', label: 'Veed.io', health: apiHealth?.veedIo },
              { key: 'chatterbox', label: 'Chatterbox', health: apiHealth?.chatterbox },
              { key: 'nanoBanana', label: 'Image Gen', health: apiHealth?.nanoBanana },
            ].map(({ key, label, health }) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg"
              >
                {renderHealthIndicator(health, label)}
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{label}</div>
                  <div className={`text-xs truncate ${getHealthStatusColor(health)}`}>
                    {getHealthStatusText(health)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Using Bolt Secrets</h3>
              <p className="text-sm text-blue-800 mb-2">
                API keys are securely managed through Bolt Secrets. To configure your API credentials:
              </p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click the Secrets icon in the Bolt toolbar</li>
                <li>Add the required environment variables listed below</li>
                <li>Refresh this page to see updated status</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setNextStepsExpanded(!nextStepsExpanded)}
              className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              aria-expanded={nextStepsExpanded}
              aria-controls="next-steps-content"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Next Steps</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Required API integrations for full production capability</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {requiredNotConfigured > 0 ? (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                    {requiredNotConfigured} needed
                  </span>
                ) : (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                    All configured
                  </span>
                )}
                {nextStepsExpanded ? (
                  <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                )}
              </div>
            </button>

            {nextStepsExpanded && (
              <div id="next-steps-content" className="border-t border-gray-200 p-4 sm:p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Production Pipeline Status</p>
                      <p>The following external services need to be integrated to enable full video production capabilities. Each service handles a specific phase of the animation pipeline.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900">Video Generation API (Veo)</h3>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">High Priority</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Google's Veo models (2.0, 3.0, 3.1) generate animated video clips from text. Core engine for storyboard-to-video conversion. Supports all Veo variants including fast generation modes.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <div className="flex items-start gap-2">
                            <div className="text-blue-600 mt-0.5">ℹ️</div>
                            <div className="text-xs text-blue-900">
                              <strong>Good News:</strong> You can use your existing Gemini API key for Vertex AI! Just add your Google Cloud Project ID below. The same API key works for both services.
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">Required Environment Variables:</div>
                          <div className="space-y-2">
                            <div>
                              <code className="text-xs bg-gray-200 px-2 py-1 rounded block">VITE_VERTEX_AI_PROJECT_ID</code>
                              <span className="text-xs text-gray-500 ml-2">Your Google Cloud project ID</span>
                            </div>
                            <div>
                              <code className="text-xs bg-gray-200 px-2 py-1 rounded block">VITE_GEMINI_API_KEY</code>
                              <span className="text-xs text-gray-500 ml-2">Already configured above (reused)</span>
                            </div>
                          </div>
                          <div className="text-xs font-medium text-gray-700 mb-2 mt-3">Optional:</div>
                          <div className="space-y-2">
                            <div>
                              <code className="text-xs bg-gray-200 px-2 py-1 rounded block">VITE_VERTEX_AI_LOCATION</code>
                              <span className="text-xs text-gray-500 ml-2">Default: us-central1</span>
                            </div>
                            <div>
                              <code className="text-xs bg-gray-200 px-2 py-1 rounded block">VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET</code>
                              <span className="text-xs text-gray-500 ml-2">For storing video outputs</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className="text-gray-500">Cost: $0.35-$0.75/sec depending on model</span>
                          <a
                            href="https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Documentation <ExternalLink className="w-3 h-3" />
                          </a>
                          <a
                            href="https://console.cloud.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Google Cloud Console <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {apiStatus?.vertexAI?.apiKey && apiStatus?.vertexAI?.projectId ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mic2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900">Lip Sync Provider</h3>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Medium Priority</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Synchronizes character lip movements with dialogue audio. Choose between Sync Labs (high quality) or Veed.io (budget-friendly).
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="font-medium text-sm text-gray-900 mb-1">Sync Labs</div>
                            <div className="text-xs text-gray-600 mb-2">Premium quality, best for production</div>
                            <code className="text-xs bg-gray-200 px-2 py-1 rounded block">VITE_SYNC_LABS_API_KEY</code>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="font-medium text-sm text-gray-900 mb-1">Veed.io</div>
                            <div className="text-xs text-gray-600 mb-2">Budget option, good for drafts</div>
                            <code className="text-xs bg-gray-200 px-2 py-1 rounded block">VITE_VEED_API_KEY</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">Est. Cost: $0.10-0.50 per minute of audio</span>
                          <a
                            href="https://synclabs.so/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Sync Labs <ExternalLink className="w-3 h-3" />
                          </a>
                          <a
                            href="https://www.veed.io/tools/lip-sync"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Veed.io <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                    </div>
                  </div>

                  <div className="border border-green-300 bg-green-50/50 rounded-lg p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Image className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900">Image Generation API (Vertex AI Imagen)</h3>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Active</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Part of Veo 3.1 Config</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Generates storyboard frames, character poses, and background images using Vertex AI Imagen. Fully integrated with your Vertex AI Veo 3.1 configuration.
                        </p>
                        <div className="bg-green-100 rounded-lg p-3 mb-3">
                          <div className="text-xs font-medium text-green-800 mb-1 flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Configured via Vertex AI Veo 3.1 Settings
                          </div>
                          <div className="text-xs text-green-700">Uses shared Vertex AI credentials - no additional setup required</div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-700 font-medium">Est. Cost: ~$0.04 per image</span>
                          <a
                            href="https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Imagen Docs <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                  <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Film className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900">Video Assembly (Shotstack)</h3>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required for Assembly</span>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Final Step</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Assembles rendered shots into a complete episode rough cut with transitions, audio mixing, and optional slate/end-card. Configured per-organisation in the Assembly panel.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">API key is stored in the Assembly settings drawer — open any production, go to the <strong>Assembly</strong> step, and click the settings icon.</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Env var (optional override)</div>
                              <code className="text-xs bg-gray-200 px-2 py-1 rounded block">VITE_SHOTSTACK_API_KEY</code>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Pricing</div>
                              <span className="text-xs text-gray-700">~$0.05–$0.20 per render minute</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <a
                            href="https://shotstack.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            shotstack.io <ExternalLink className="w-3 h-3" />
                          </a>
                          <a
                            href="https://shotstack.io/docs/guide/getting-started/core-concepts/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Docs <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                    </div>
                  </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Production Pipeline Overview</h4>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200">
                      <FileCode className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Script</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200">
                      <Image className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Storyboard</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span className="text-gray-700">Voice</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200">
                      <Video className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Video</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200">
                      <Mic2 className="w-4 h-4 text-pink-600" />
                      <span className="text-gray-700">Lip Sync</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-violet-300 bg-violet-50">
                      <Film className="w-4 h-4 text-violet-600" />
                      <span className="text-violet-700 font-medium">Assembly</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-green-300 bg-green-50">
                      <Film className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 font-medium">Final</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
              className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              aria-expanded={workspaceExpanded}
              aria-controls="workspace-content"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Workspace & Series Management</h2>
                  <p className="text-sm text-gray-600">Manage your workspaces and series settings</p>
                </div>
              </div>
              {workspaceExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {workspaceExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Current Workspace</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {currentOrganization?.name || 'Loading...'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Access workspace settings from the organization switcher in the sidebar. You can
                      manage team members, billing, and archive your workspace.
                    </p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <Film className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Series Management</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Edit, duplicate, or archive series</p>
                    <p className="text-xs text-gray-500">
                      Click the settings icon next to any series in the series switcher to edit details,
                      duplicate, or archive. Archived series can be restored within 30 days.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <strong>Quick Access:</strong> Use the switchers in the left sidebar to quickly
                      access workspace and series management options.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setVertexAIExpanded(!vertexAIExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">{instructions.vertexAI.title}</h2>
                  <p className="text-sm text-gray-600">{instructions.vertexAI.description}</p>
                </div>
              </div>
              {vertexAIExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {vertexAIExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="flex justify-end mb-4">
                  <a
                    href={instructions.vertexAI.setupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-scripps-blue hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Setup Guide
                  </a>
                </div>

                <div className="space-y-4">
                  {instructions.vertexAI.secrets.map((secret: any) => (
                    <div key={secret.name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {secret.name}
                            </code>
                            {secret.required && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{secret.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Example: {secret.example}</p>
                          {secret.default && (
                            <p className="text-xs text-gray-500">Default: {secret.default}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          {apiStatus && secret.name === 'VITE_VERTEX_AI_PROJECT_ID' && apiStatus.vertexAI.projectId ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : apiStatus && secret.name === 'VITE_VERTEX_AI_LOCATION' && apiStatus.vertexAI.location ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : apiStatus && secret.name === 'VITE_GEMINI_API_KEY' && apiStatus.vertexAI.apiKey ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : apiStatus && secret.name === 'VITE_GEMINI_API_KEY' && apiStatus.gemini.apiKey ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : secret.required ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">Google Cloud Storage Configuration</h3>
                      <div className="space-y-2 text-sm text-blue-800">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Bucket:</span>
                          {import.meta.env.VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET ? (
                            <>
                              <code className="bg-white px-2 py-1 rounded text-xs">
                                gs://{import.meta.env.VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET}
                              </code>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </>
                          ) : (
                            <>
                              <span className="text-gray-500 italic">Not configured</span>
                              <XCircle className="w-4 h-4 text-gray-400" />
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Storage Path:</span>
                          <code className="bg-white px-2 py-1 rounded text-xs">
                            AI Studio/
                          </code>
                        </div>
                        <p className="text-xs mt-3 text-blue-700">
                          Videos will be stored at: <code className="bg-white px-2 py-0.5 rounded">
                            gs://{import.meta.env.VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET || 'your-bucket'}/AI Studio/
                          </code>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setElevenLabsExpanded(!elevenLabsExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-scripps-yellow to-yellow-400 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {instructions.elevenLabs.title}
                    {apiStatus?.elevenLabs.apiKey && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </h2>
                  <p className="text-sm text-gray-600">{instructions.elevenLabs.description}</p>
                </div>
              </div>
              {elevenLabsExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {elevenLabsExpanded && (
              <div className="border-t border-gray-200 p-6">
                {apiStatus?.elevenLabs.apiKey ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-green-800 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-lg">Connected & Operational</span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-green-700">
                        ElevenLabs API is connected and working. You can now:
                      </p>
                      <ul className="text-sm text-green-700 space-y-2 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Browse and preview 100+ professional voices</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Assign voices to characters in the Characters section</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Generate high-quality dialogue audio</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Use custom voice cloning (requires Creator+ plan)</span>
                        </li>
                      </ul>
                      <div className="border-t border-green-200 pt-3 mt-3">
                        <p className="text-xs text-green-600 font-medium">
                          Pricing: ~$0.30 per 1K characters, voice cloning at ~$11/month
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end mb-4">
                    <a
                      href={instructions.elevenLabs.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-scripps-blue hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Get API Key
                    </a>
                  </div>
                )}

                <div className="space-y-4">
                  {instructions.elevenLabs.secrets.map((secret: any) => (
                    <div key={secret.name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {secret.name}
                            </code>
                            {secret.required && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{secret.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Example: {secret.example}</p>
                        </div>
                        <div className="ml-4">
                          {apiStatus?.elevenLabs.apiKey ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setDatabaseExpanded(!databaseExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Database Status</h2>
                  <p className="text-sm text-gray-600">Supabase connection information</p>
                </div>
              </div>
              {databaseExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {databaseExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Connected</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Database is configured and ready to use
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setGeminiExpanded(!geminiExpanded)}
              className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              aria-expanded={geminiExpanded}
              aria-controls="gemini-settings-content"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Gemini AI Settings</h2>
                  <p className="text-sm text-gray-600">Configure script generation parameters</p>
                </div>
              </div>
              {geminiExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {geminiExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Script Generation Settings</p>
                      <p>These settings control how Gemini AI generates scripts, dialogue, and shot descriptions. Adjust temperature for creativity and max tokens for response length.</p>
                    </div>
                  </div>
                </div>

                {userSettingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temperature (Creativity): {userSettings?.generation_preferences?.temperature ?? 0.7}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={userSettings?.generation_preferences?.temperature ?? 0.7}
                        onChange={(e) => handleUpdateUserSettings({
                          generation_preferences: {
                            ...userSettings?.generation_preferences!,
                            temperature: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        disabled={userSettingsSaving}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Conservative (0.0)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Tokens: {userSettings?.generation_preferences?.max_tokens ?? 4000}
                      </label>
                      <input
                        type="range"
                        min="1000"
                        max="32000"
                        step="1000"
                        value={userSettings?.generation_preferences?.max_tokens ?? 4000}
                        onChange={(e) => handleUpdateUserSettings({
                          generation_preferences: {
                            ...userSettings?.generation_preferences!,
                            max_tokens: parseInt(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        disabled={userSettingsSaving}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1,000</span>
                        <span>32,000</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                      <select
                        value={userSettings?.generation_preferences?.tone ?? 'educational and entertaining'}
                        onChange={(e) => handleUpdateUserSettings({
                          generation_preferences: {
                            ...userSettings?.generation_preferences!,
                            tone: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={userSettingsSaving}
                      >
                        <option value="educational and entertaining">Educational & Entertaining</option>
                        <option value="professional and informative">Professional & Informative</option>
                        <option value="casual and fun">Casual & Fun</option>
                        <option value="dramatic and engaging">Dramatic & Engaging</option>
                        <option value="whimsical and playful">Whimsical & Playful</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pacing</label>
                      <select
                        value={userSettings?.generation_preferences?.pacing ?? 'medium'}
                        onChange={(e) => handleUpdateUserSettings({
                          generation_preferences: {
                            ...userSettings?.generation_preferences!,
                            pacing: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={userSettingsSaving}
                      >
                        <option value="slow">Slow (More Detail)</option>
                        <option value="medium">Medium (Balanced)</option>
                        <option value="fast">Fast (Action-Packed)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="include_establishing"
                        checked={userSettings?.generation_preferences?.include_establishing ?? true}
                        onChange={(e) => handleUpdateUserSettings({
                          generation_preferences: {
                            ...userSettings?.generation_preferences!,
                            include_establishing: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={userSettingsSaving}
                      />
                      <label htmlFor="include_establishing" className="text-sm text-gray-700">
                        Include establishing shots in generated scripts
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setVoiceSettingsExpanded(!voiceSettingsExpanded)}
              className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              aria-expanded={voiceSettingsExpanded}
              aria-controls="voice-settings-content"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Voice Generation Settings</h2>
                  <p className="text-sm text-gray-600">Configure voice synthesis parameters</p>
                </div>
              </div>
              {voiceSettingsExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {voiceSettingsExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-rose-800">
                      <p className="font-medium mb-1">Voice Quality Settings</p>
                      <p>Adjust stability for consistent voice output and similarity boost to match the original voice more closely. Higher values may reduce naturalness.</p>
                    </div>
                  </div>
                </div>

                {userSettingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Voice Provider</label>
                      <select
                        value={userSettings?.voice_preferences?.default_provider ?? 'elevenlabs'}
                        onChange={(e) => handleUpdateUserSettings({
                          voice_preferences: {
                            ...userSettings?.voice_preferences!,
                            default_provider: e.target.value as 'elevenlabs' | 'chatterbox'
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={userSettingsSaving}
                      >
                        <option value="elevenlabs">ElevenLabs (Cloud)</option>
                        <option value="chatterbox">Chatterbox (Self-Hosted)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice Stability: {((userSettings?.voice_preferences?.stability ?? 0.5) * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={userSettings?.voice_preferences?.stability ?? 0.5}
                        onChange={(e) => handleUpdateUserSettings({
                          voice_preferences: {
                            ...userSettings?.voice_preferences!,
                            stability: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        disabled={userSettingsSaving}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Variable (0%)</span>
                        <span>Stable (100%)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Similarity Boost: {((userSettings?.voice_preferences?.similarity_boost ?? 0.5) * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={userSettings?.voice_preferences?.similarity_boost ?? 0.5}
                        onChange={(e) => handleUpdateUserSettings({
                          voice_preferences: {
                            ...userSettings?.voice_preferences!,
                            similarity_boost: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        disabled={userSettingsSaving}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Natural (0%)</span>
                        <span>Precise (100%)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Speech Speed: {(userSettings?.voice_preferences?.speed ?? 1.0).toFixed(1)}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={userSettings?.voice_preferences?.speed ?? 1.0}
                        onChange={(e) => handleUpdateUserSettings({
                          voice_preferences: {
                            ...userSettings?.voice_preferences!,
                            speed: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        disabled={userSettingsSaving}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Slow (0.5x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Fast (2.0x)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setVideoSettingsExpanded(!videoSettingsExpanded)}
              className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              aria-expanded={videoSettingsExpanded}
              aria-controls="video-settings-content"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Vertex AI Generation Settings</h2>
                  <p className="text-sm text-gray-600">Configure Veo 3.1 video & Imagen image generation</p>
                </div>
              </div>
              {videoSettingsExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {videoSettingsExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-emerald-800">
                      <p className="font-medium mb-1">Vertex AI Configuration</p>
                      <p>Configure settings for Veo video generation and Imagen storyboard image generation. Video pricing varies by model: Fast models ($0.10-0.15/sec), Standard models ($0.20-0.40/sec). Images: ~$0.04/image.</p>
                    </div>
                  </div>
                </div>

                {userSettingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Resolution</label>
                        <select
                          value={userSettings?.video_preferences?.default_resolution ?? '1080p'}
                          onChange={(e) => handleUpdateUserSettings({
                            video_preferences: {
                              ...userSettings?.video_preferences!,
                              default_resolution: e.target.value as '720p' | '1080p'
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={userSettingsSaving}
                        >
                          <option value="720p">720p (Faster)</option>
                          <option value="1080p">1080p (Higher Quality)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                        <select
                          value={userSettings?.video_preferences?.default_aspect_ratio ?? '16:9'}
                          onChange={(e) => handleUpdateUserSettings({
                            video_preferences: {
                              ...userSettings?.video_preferences!,
                              default_aspect_ratio: e.target.value as '16:9' | '9:16'
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={userSettingsSaving}
                        >
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="9:16">9:16 (Portrait)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Duration</label>
                        <select
                          value={userSettings?.video_preferences?.default_duration ?? 8}
                          onChange={(e) => handleUpdateUserSettings({
                            video_preferences: {
                              ...userSettings?.video_preferences!,
                              default_duration: parseInt(e.target.value) as 4 | 6 | 8
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={userSettingsSaving}
                        >
                          <option value="4">4 seconds</option>
                          <option value="6">6 seconds</option>
                          <option value="8">8 seconds</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sample Count</label>
                        <select
                          value={userSettings?.video_preferences?.sample_count ?? 1}
                          onChange={(e) => handleUpdateUserSettings({
                            video_preferences: {
                              ...userSettings?.video_preferences!,
                              sample_count: parseInt(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={userSettingsSaving}
                        >
                          <option value="1">1 (Fastest)</option>
                          <option value="2">2 (More Options)</option>
                          <option value="3">3 (Recommended)</option>
                          <option value="4">4 (Maximum)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="generate_audio"
                          checked={userSettings?.video_preferences?.generate_audio ?? false}
                          onChange={(e) => handleUpdateUserSettings({
                            video_preferences: {
                              ...userSettings?.video_preferences!,
                              generate_audio: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={userSettingsSaving}
                        />
                        <label htmlFor="generate_audio" className="text-sm text-gray-700">
                          Generate audio with video (sound effects, ambient sounds)
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="no_music"
                          checked={userSettings?.video_preferences?.no_music ?? true}
                          onChange={(e) => handleUpdateUserSettings({
                            video_preferences: {
                              ...userSettings?.video_preferences!,
                              no_music: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={userSettingsSaving}
                        />
                        <label htmlFor="no_music" className="text-sm text-gray-700">
                          No music in generated videos (adds "no music" to prompt instructions)
                        </label>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Estimated Cost Per Shot</h4>
                      {(() => {
                        const duration = userSettings?.video_preferences?.default_duration ?? 8;
                        const sampleCount = userSettings?.video_preferences?.sample_count ?? 1;
                        const withAudio = userSettings?.video_preferences?.generate_audio ?? false;
                        const defaultModel = VEO_MODELS.find(m => m.id === 'veo-3.1-generate-001') || VEO_MODELS[0];
                        const costPerSec = withAudio ? defaultModel.costWithAudio : defaultModel.costNoAudio;
                        const totalCost = duration * costPerSec * sampleCount;
                        return (
                          <>
                            <div className="text-2xl font-bold text-gray-900">
                              ${totalCost.toFixed(2)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {duration}s x {sampleCount} sample{sampleCount > 1 ? 's' : ''} x ${costPerSec.toFixed(2)}/sec ({defaultModel.name})
                            </p>
                            <p className="text-xs text-emerald-600 mt-2">
                              Fast model alternative: ${(duration * (withAudio ? 0.15 : 0.10) * sampleCount).toFixed(2)} (Veo 3.1 Fast)
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <MissionControlPanel
            expanded={missionControlExpanded}
            onToggle={() => setMissionControlExpanded(!missionControlExpanded)}
          />

          <WorkspaceSpecificSettings
            expanded={workspaceExpanded}
            onToggle={() => setWorkspaceExpanded(!workspaceExpanded)}
          />

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTranslationExpanded(!translationExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <Languages className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Translation Settings</h2>
                  <p className="text-sm text-gray-600">Configure multi-language translation options</p>
                </div>
              </div>
              {translationExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {translationExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-800">
                      <p className="font-medium mb-1">Script Translation Settings</p>
                      <p>Configure default languages and behavior for AI-powered script translation. Translations preserve timing cues and character names.</p>
                    </div>
                  </div>
                </div>

                {userSettingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Default Target Languages</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { code: 'es', name: 'Spanish' },
                          { code: 'fr', name: 'French' },
                          { code: 'de', name: 'German' },
                          { code: 'ja', name: 'Japanese' },
                          { code: 'zh', name: 'Chinese' },
                          { code: 'ko', name: 'Korean' },
                          { code: 'pt', name: 'Portuguese' },
                          { code: 'it', name: 'Italian' },
                          { code: 'ru', name: 'Russian' }
                        ].map((lang) => (
                          <label key={lang.code} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(userSettings?.translation_preferences?.default_languages ?? []).includes(lang.code)}
                              onChange={(e) => {
                                const current = userSettings?.translation_preferences?.default_languages ?? [];
                                const updated = e.target.checked
                                  ? [...current, lang.code]
                                  : current.filter(c => c !== lang.code);
                                handleUpdateUserSettings({
                                  translation_preferences: {
                                    ...userSettings?.translation_preferences!,
                                    default_languages: updated
                                  }
                                });
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              disabled={userSettingsSaving}
                            />
                            <span className="text-sm text-gray-700">{lang.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="auto_translate"
                        checked={userSettings?.translation_preferences?.auto_translate ?? false}
                        onChange={(e) => handleUpdateUserSettings({
                          translation_preferences: {
                            ...userSettings?.translation_preferences!,
                            auto_translate: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={userSettingsSaving}
                      />
                      <label htmlFor="auto_translate" className="text-sm text-gray-700">
                        Automatically translate scripts after generation
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="preserve_timing"
                        checked={userSettings?.translation_preferences?.preserve_timing ?? true}
                        onChange={(e) => handleUpdateUserSettings({
                          translation_preferences: {
                            ...userSettings?.translation_preferences!,
                            preserve_timing: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={userSettingsSaving}
                      />
                      <label htmlFor="preserve_timing" className="text-sm text-gray-700">
                        Preserve timing cues and shot markers in translations
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setHeygenExpanded(!heygenExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">HeyGen Video Translation</h2>
                  <p className="text-sm text-gray-600">Configure video-to-video translation with AI lip sync and voice cloning</p>
                </div>
              </div>
              {heygenExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {heygenExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-800">
                      <p className="font-medium mb-1">AI-Powered Video Localization</p>
                      <p>
                        HeyGen provides automatic video translation with natural lip sync and voice cloning
                        in 175+ languages. Translate your videos while maintaining the original speaker's
                        voice characteristics and natural lip movements.
                      </p>
                    </div>
                  </div>
                </div>

                {currentOrganization?.id && (
                  <HeyGenConfigPanel organizationId={currentOrganization.id} />
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setPatentSettingsExpanded(!patentSettingsExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileSearch className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Prior Art Search Settings</h2>
                  <p className="text-sm text-gray-600">Configure patent prior art search behavior</p>
                </div>
              </div>
              {patentSettingsExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {patentSettingsExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-sky-800">
                      <p className="font-medium mb-1">Prior Art Search Configuration</p>
                      <p>Configure how the AI searches for relevant prior art patents. These settings affect search thoroughness, timeout duration, and fallback behavior.</p>
                    </div>
                  </div>
                </div>

                {userSettingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Focus</label>
                      <select
                        value={userSettings?.patent_preferences?.analysis_target ?? 'both'}
                        onChange={(e) => handleUpdateUserSettings({
                          patent_preferences: {
                            ...userSettings?.patent_preferences!,
                            analysis_target: e.target.value as 'video_production' | 'patent_management' | 'both'
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={userSettingsSaving}
                      >
                        <option value="video_production">Video Production Technology</option>
                        <option value="patent_management">Patent Management Systems</option>
                        <option value="both">Both (Comprehensive)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Determines which technology areas to prioritize in prior art searches</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Timeout: {(userSettings?.patent_preferences?.prior_art_timeout ?? 30000) / 1000} seconds
                      </label>
                      <input
                        type="range"
                        min="15000"
                        max="60000"
                        step="5000"
                        value={userSettings?.patent_preferences?.prior_art_timeout ?? 30000}
                        onChange={(e) => handleUpdateUserSettings({
                          patent_preferences: {
                            ...userSettings?.patent_preferences!,
                            prior_art_timeout: parseInt(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        disabled={userSettingsSaving}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>15s (Fast)</span>
                        <span>60s (Thorough)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="auto_prior_art_search"
                        checked={userSettings?.patent_preferences?.auto_prior_art_search ?? true}
                        onChange={(e) => handleUpdateUserSettings({
                          patent_preferences: {
                            ...userSettings?.patent_preferences!,
                            auto_prior_art_search: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={userSettingsSaving}
                      />
                      <label htmlFor="auto_prior_art_search" className="text-sm text-gray-700">
                        Automatically search prior art when creating new patent applications
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="include_default_patents"
                        checked={userSettings?.patent_preferences?.include_default_patents ?? true}
                        onChange={(e) => handleUpdateUserSettings({
                          patent_preferences: {
                            ...userSettings?.patent_preferences!,
                            include_default_patents: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={userSettingsSaving}
                      />
                      <label htmlFor="include_default_patents" className="text-sm text-gray-700">
                        Include curated default patents if AI search fails or times out
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setProductionCostExpanded(!productionCostExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                  <Hammer className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Traditional Production Costs</h2>
                  <p className="text-sm text-gray-600">Animation style, production tiers, and industry cost settings</p>
                </div>
              </div>
              {productionCostExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {productionCostExpanded && <SettingsCostConfig />}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setCreatorCostExpanded(!creatorCostExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Creator Cost Configuration</h2>
                  <p className="text-sm text-gray-600">Labor-based production cost settings and presets</p>
                </div>
              </div>
              {creatorCostExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {creatorCostExpanded && (
              <div className="border-t border-gray-200 p-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Available Cost Presets</p>
                        <p>Three preconfigured creator cost models are available globally:</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          <li><strong>Global Default:</strong> 165 scenes, 4 artists/scene, 10 production days</li>
                          <li><strong>Small Studio:</strong> 2 artists/scene, 15 production days, optimized for smaller teams</li>
                          <li><strong>Large Studio:</strong> 5 artists/scene, 7 production days, faster production timelines</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      Use the <strong>Episode Profit Analytics</strong> page to configure creator costs with real-time calculations
                      and detailed breakdowns. The Creator Cost Calculator allows you to:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside ml-4">
                      <li>Adjust scenes per episode, artists per scene, and time per scene</li>
                      <li>Configure production schedules and working hours</li>
                      <li>Set artist salaries and overhead percentages</li>
                      <li>Define preproduction, postproduction, and revision time allocations</li>
                      <li>Specify facility costs including software, equipment, and studio space</li>
                      <li>View detailed phase-by-phase cost breakdowns</li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Revenue Projections:</strong> Set a default episode count (0-100) per series in Series Management.
                        This value automatically populates the Show Revenue Estimator for more accurate profit forecasting.
                      </p>
                      <p className="text-xs text-gray-600 italic">
                        Default: 6 episodes. Adjust in Settings → Workspace & Series Management → Edit Series.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Creator Cost Presets Configured</div>
                      <div className="text-sm text-gray-600">3 global presets available</div>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setLipSyncExpanded(!lipSyncExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Lip Sync Configuration</h2>
                  <p className="text-sm text-gray-600">Configure video lip sync providers and settings</p>
                </div>
              </div>
              {lipSyncExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {lipSyncExpanded && (
              <div className="border-t border-gray-200 p-6">
                <LipSyncSettings />
              </div>
            )}
          </div>

          <PromptLibrary
            expanded={promptLibraryExpanded}
            onToggle={() => setPromptLibraryExpanded(!promptLibraryExpanded)}
          />

          <PatentIntelligenceSettings />

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setReleasesExpanded(!releasesExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Releases</h2>
                  <p className="text-sm text-gray-600">Companion letters and release documents for talent</p>
                </div>
              </div>
              {releasesExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {releasesExpanded && (
              <div className="border-t border-gray-200">
                <div className="p-6">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-teal-800">
                        <p className="font-medium mb-1">Companion Letters & Release Documents</p>
                        <p>Select and print release forms and companion letters for talent agreements, NIL releases, and other production documents.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Available Documents</h3>

                    <div className="grid gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-teal-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">NIL Release Agreement</h4>
                              <p className="text-sm text-gray-600 mt-1">Standard Name, Image, and Likeness release form for Spelling Bee champions and talent appearances.</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">DOCX Format</span>
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">Template</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href="/releases/sch-awesome!_nil_release.docx"
                              download="NIL_Release_Agreement.docx"
                              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </a>
                            <button
                              onClick={() => {
                                const printWindow = window.open('/releases/sch-awesome!_nil_release.docx', '_blank');
                                if (printWindow) {
                                  printWindow.focus();
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                            >
                              <Printer className="w-4 h-4" />
                              Print
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Additional release templates coming soon</p>
                        <p className="text-xs text-gray-400 mt-1">Talent agreements, production contracts, and more</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setBackupExpanded(!backupExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Backup & Recovery</h2>
                  <p className="text-sm text-gray-600">Technical administrative tools for data backup and system integrity</p>
                </div>
              </div>
              {backupExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {backupExpanded && <SettingsBackupPanel />}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTechDocsExpanded(!techDocsExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">Technical Requirements & Replication Guide</h2>
                  <p className="text-sm text-gray-600">Complete documentation for replicating and reskinning this platform</p>
                </div>
              </div>
              {techDocsExpanded ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>

            {techDocsExpanded && (
              <div className="border-t border-gray-200">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                  {[
                    { id: 'how-to', label: 'How To Guide', icon: BookOpen },
                    { id: 'overview', label: 'Overview', icon: Layers },
                    { id: 'architecture', label: 'Architecture', icon: Code },
                    { id: 'database', label: 'Database', icon: Database },
                    { id: 'reskin', label: 'Reskinning', icon: Palette },
                    { id: 'deployment', label: 'Deployment', icon: Rocket },
                    { id: 'costs', label: 'Costs', icon: DollarSign },
                    { id: 'files', label: 'File Map', icon: FolderTree },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'text-scripps-blue border-b-2 border-scripps-blue bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {activeTab === 'how-to' && <HowToGuide />}

                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-5">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Database & Code Repository</h3>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <Database className="w-4 h-4" />
                              Database Location
                            </h4>
                            <div className="bg-white rounded-lg p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Provider:</span>
                                <span className="text-sm text-gray-900">Supabase (supabase.com)</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Project Name:</span>
                                <span className="text-sm text-gray-900">Check your .env file for VITE_SUPABASE_URL</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Access:</span>
                                <span className="text-sm text-gray-900">Login to your Supabase dashboard to view/manage the database</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Migrations:</span>
                                <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">supabase/migrations/*.sql</code>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <Code className="w-4 h-4" />
                              Source Code
                            </h4>
                            <div className="bg-white rounded-lg p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Repository:</span>
                                <span className="text-sm text-gray-900">This codebase is available in your current project directory</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">GitHub:</span>
                                <span className="text-sm text-gray-900">Push to your own GitHub repository to enable version control and collaboration</span>
                              </div>
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <code className="text-xs text-gray-700 block">git init</code>
                                <code className="text-xs text-gray-700 block">git add .</code>
                                <code className="text-xs text-gray-700 block">git commit -m "Initial commit"</code>
                                <code className="text-xs text-gray-700 block">git remote add origin YOUR_REPO_URL</code>
                                <code className="text-xs text-gray-700 block">git push -u origin main</code>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Technology Stack</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2">Frontend</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                <li>React 18.3.1</li>
                                <li>TypeScript 5.5.3</li>
                                <li>Vite 5.4.2</li>
                                <li>Tailwind CSS 3.4.1</li>
                                <li>Lucide React 0.344.0</li>
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2">Backend & Services</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                <li>Supabase (Database & Storage)</li>
                                <li>Google Vertex AI (Gemini 2.5 Flash & Veo 3)</li>
                                <li>ElevenLabs (Voice Synthesis)</li>
                                <li>Chatterbox (Voice Cloning & TTS)</li>
                                <li>Supabase Edge Functions</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Core Features</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            'Multi-Tenant Organization Management',
                            'Workspace & Team Collaboration',
                            'Series Management & Archiving',
                            'Featured Video Trailers for Series',
                            'Character Management with Role Classification',
                            'Character Roles: Primary, Ensemble, Recurring, Cameo',
                            'AI-Powered Script Generation (Gemini 2.5 Flash)',
                            'Script Locking & Version Control',
                            'Episode Production Tracking',
                            'Episode Progress Tracking with Visual Indicators',
                            'AI Storyboard Generation',
                            'Storyboard Editing & Approval Workflow',
                            'Asset Library & Management',
                            'Smart Asset Tagging & Search',
                            'Multi-Provider Voice Synthesis',
                            'Custom Voice Cloning (ElevenLabs & Chatterbox)',
                            'Voice Studio with Preview',
                            'Lip Sync Management System',
                            'Script Translation System',
                            'Translation Analytics & Export Tracking',
                            'Episode Revenue & LTV Analytics',
                            'Per-Series Episode Count Defaults for Profit Projections',
                            'Traditional Animation Cost Breakdown',
                            'Creator Cost Calculator with Asset Decay',
                            'AI Cost Tracking & Monitoring',
                            'Gemini API Usage Tracking',
                            'Dashboard IP Sections (Customizable)',
                            'Prompt Library System with Version Control',
                            'Patent Application Management',
                            'Backup & Recovery System',
                            'System Health Monitoring',
                            'Approval Workflow System',
                            'Production Job Queue',
                          ].map((feature) => (
                            <div key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">System Requirements</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <ul className="text-sm text-gray-600 space-y-2">
                            <li><span className="font-semibold">Node.js:</span> v18.0.0 or higher</li>
                            <li><span className="font-semibold">npm:</span> v9.0.0 or higher</li>
                            <li><span className="font-semibold">Browser:</span> Modern browsers with ES6 support</li>
                            <li><span className="font-semibold">Memory:</span> 4GB RAM minimum (8GB recommended)</li>
                            <li><span className="font-semibold">Storage:</span> 500MB for application + storage for assets</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Start Commands</h3>
                        <div className="space-y-3">
                          {[
                            { cmd: 'npm install', desc: 'Install dependencies' },
                            { cmd: 'npm run dev', desc: 'Start development server' },
                            { cmd: 'npm run build', desc: 'Build for production' },
                            { cmd: 'npm run typecheck', desc: 'Run TypeScript type checking' },
                          ].map((item) => (
                            <div key={item.cmd} className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <code className="text-green-400 font-mono text-sm">{item.cmd}</code>
                                <p className="text-gray-400 text-xs mt-1">{item.desc}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(item.cmd, item.cmd)}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                {copiedText === item.cmd ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'architecture' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Application Layers</h3>
                        <div className="space-y-3">
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Presentation Layer</h4>
                            <p className="text-sm text-gray-600 mb-2">React components with Tailwind CSS styling</p>
                            <code className="text-xs text-gray-500">src/components/*.tsx</code>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Service Layer</h4>
                            <p className="text-sm text-gray-600 mb-2">Business logic and AI service integrations</p>
                            <code className="text-xs text-gray-500">src/services/*.ts</code>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Data Layer</h4>
                            <p className="text-sm text-gray-600 mb-2">Supabase client and database types</p>
                            <code className="text-xs text-gray-500">src/lib/supabase.ts, src/lib/database.types.ts</code>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Edge Functions</h4>
                            <p className="text-sm text-gray-600 mb-2">Serverless functions for secure API calls</p>
                            <code className="text-xs text-gray-500">supabase/functions/*</code>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Production Pipeline Workflow</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <ol className="space-y-3 text-sm text-gray-700">
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">1.</span>
                              <div>
                                <span className="font-semibold">Script Generation:</span> Use Gemini 3 to generate episode scripts with character dialogue and vocabulary words
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">2.</span>
                              <div>
                                <span className="font-semibold">Script Translation:</span> Enable multi-language support and translate scripts into multiple languages (Spanish, Mandarin, Hindi, etc.) using Gemini 2.5 Flash
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">3.</span>
                              <div>
                                <span className="font-semibold">Scene Breakdown:</span> Parse script into acts, scenes, and individual shots
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">4.</span>
                              <div>
                                <span className="font-semibold">Storyboard Creation:</span> Generate visual storyboards for each scene with AI prompts
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">5.</span>
                              <div>
                                <span className="font-semibold">Character Images:</span> Generate consistent character images for each shot
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">6.</span>
                              <div>
                                <span className="font-semibold">Voice Recordings:</span> Generate dialogue audio using ElevenLabs or Chatterbox with character-specific voices, including custom cloned voices
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">7.</span>
                              <div>
                                <span className="font-semibold">Video Generation:</span> Create animated clips from static images using Veo 3
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">8.</span>
                              <div>
                                <span className="font-semibold">Assembly & Export:</span> Combine all assets into final episode
                              </div>
                            </li>
                          </ol>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Key Components</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { name: 'Dashboard', path: 'src/components/Dashboard.tsx', desc: 'Main overview with IP sections' },
                            { name: 'DashboardIPSectionEditor', path: 'src/components/DashboardIPSectionEditor.tsx', desc: 'Customizable IP showcase' },
                            { name: 'OrganizationSwitcher', path: 'src/components/OrganizationSwitcher.tsx', desc: 'Workspace management' },
                            { name: 'SeriesSwitcher', path: 'src/components/SeriesSwitcher.tsx', desc: 'Series navigation' },
                            { name: 'Characters', path: 'src/components/Characters.tsx', desc: 'Character management with roles' },
                            { name: 'Scripts', path: 'src/components/Scripts.tsx', desc: 'Script browsing and viewing' },
                            { name: 'Episodes', path: 'src/components/Episodes.tsx', desc: 'Production tracking' },
                            { name: 'EpisodeProfitAnalytics', path: 'src/components/EpisodeProfitAnalytics.tsx', desc: 'Revenue, LTV tracking, and profit projections' },
                            { name: 'ShowRevenueEstimator', path: 'src/components/ShowRevenueEstimator.tsx', desc: 'Multi-channel revenue calculator' },
                            { name: 'SeriesManagementModal', path: 'src/components/SeriesManagementModal.tsx', desc: 'Series editing and profit defaults' },
                            { name: 'AIStudio', path: 'src/components/AIStudio.tsx', desc: 'AI generation interface' },
                            { name: 'VoiceGenerationTab', path: 'src/components/VoiceGenerationTab.tsx', desc: 'Voice studio and cloning' },
                            { name: 'VoiceCloningModal', path: 'src/components/VoiceCloningModal.tsx', desc: 'Custom voice cloning' },
                            { name: 'StoryboardGenerator', path: 'src/components/StoryboardGenerator.tsx', desc: 'Storyboard creation' },
                            { name: 'ScriptTranslationManager', path: 'src/components/ScriptTranslationManager.tsx', desc: 'Translation system' },
                            { name: 'ApprovalWorkflow', path: 'src/components/ApprovalWorkflow.tsx', desc: 'Approval workflow' },
                            { name: 'Assets', path: 'src/components/Assets.tsx', desc: 'Asset library with smart tags' },
                            { name: 'CreatorCostCalculator', path: 'src/components/CreatorCostCalculator.tsx', desc: 'Labor cost calculator' },
                            { name: 'LipSyncManager', path: 'src/components/LipSyncManager.tsx', desc: 'Lip sync job tracking' },
                            { name: 'PromptLibrary', path: 'src/components/PromptLibrary.tsx', desc: 'Prompt template management' },
                            { name: 'PatentApplication', path: 'src/components/PatentApplication.tsx', desc: 'Patent application drafting' },
                            { name: 'VideoTrailerShowcase', path: 'src/components/VideoTrailerShowcase.tsx', desc: 'Featured trailer display' },
                          ].map((comp) => (
                            <div key={comp.name} className="border border-gray-200 rounded-lg p-3">
                              <h4 className="font-semibold text-sm text-gray-900">{comp.name}</h4>
                              <p className="text-xs text-gray-600 mt-1">{comp.desc}</p>
                              <code className="text-xs text-gray-500 mt-1 block">{comp.path}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'database' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                          <Database className="w-5 h-5" />
                          How to Access Your Database
                        </h4>
                        <div className="space-y-3 text-sm text-green-900">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[80px]">Step 1:</span>
                            <span>Visit <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-700">supabase.com/dashboard</a> and log in to your account</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[80px]">Step 2:</span>
                            <span>Find your project by checking the VITE_SUPABASE_URL in your .env file (the project ID is in the URL)</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[80px]">Step 3:</span>
                            <span>Navigate to Table Editor, SQL Editor, or Database sections to view and manage your data</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[80px]">Step 4:</span>
                            <span>All migrations are stored locally in <code className="bg-white px-2 py-0.5 rounded">supabase/migrations/</code> for version control</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Database Schema</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Complete Supabase PostgreSQL schema with Row Level Security (RLS) enabled on all tables
                        </p>
                        <div className="space-y-3">
                          {[
                            {
                              table: 'organizations',
                              desc: 'Multi-tenant workspaces with team management and billing',
                              cols: 'id, name, slug, owner_id, plan, status, created_at, archived_at',
                            },
                            {
                              table: 'organization_members',
                              desc: 'Team members and their roles within organizations',
                              cols: 'id, organization_id, user_id, role, invited_by, joined_at',
                            },
                            {
                              table: 'organization_invitations',
                              desc: 'Pending team member invitations with expiry tracking',
                              cols: 'id, organization_id, email, role, invited_by, expires_at, accepted_at',
                            },
                            {
                              table: 'series',
                              desc: 'Series metadata, art style, production guidelines, featured trailers, and organization association',
                              cols: 'id, organization_id, title, description, art_style, featured_trailer_id, default_episode_count, archived_at',
                            },
                            {
                              table: 'dashboard_ip_sections',
                              desc: 'Customizable dashboard sections for showcasing IP content',
                              cols: 'id, series_id, title, description, background_color, display_order, is_visible',
                            },
                            {
                              table: 'characters',
                              desc: 'Character profiles with role classification (Primary, Ensemble, Recurring, Cameo)',
                              cols: 'id, series_id, name, description, role, voice_id, voice_provider, voice_settings',
                            },
                            {
                              table: 'scripts',
                              desc: 'Episode scripts with lock status and version control',
                              cols: 'id, series_id, title, synopsis, vocabulary_words, status, locked_at, locked_by',
                            },
                            {
                              table: 'script_acts',
                              desc: 'Three-act structure breakdown for scripts',
                              cols: 'id, script_id, act_number, title, content, duration_estimate',
                            },
                            {
                              table: 'script_scenes',
                              desc: 'Individual scenes with dialogue and stage directions',
                              cols: 'id, act_id, scene_number, setting, description, dialogue, stage_directions',
                            },
                            {
                              table: 'episodes',
                              desc: 'Production tracking with revenue and cost metrics',
                              cols: 'id, series_id, season, episode_number, title, status, production_notes',
                            },
                            {
                              table: 'episode_revenue_metrics',
                              desc: 'Revenue tracking, LTV calculations, and profitability analysis',
                              cols: 'id, episode_id, revenue_per_view, total_views, ltv_estimate, profit_margin',
                            },
                            {
                              table: 'assets',
                              desc: 'Media assets with smart tagging and usage tracking',
                              cols: 'id, series_id, asset_type, file_path, metadata, tags, usage_count',
                            },
                            {
                              table: 'asset_versions',
                              desc: 'Version history for asset changes and edits',
                              cols: 'id, asset_id, version_number, file_path, changes_description, created_by',
                            },
                            {
                              table: 'storyboards',
                              desc: 'Visual storyboards with approval workflow and editing',
                              cols: 'id, episode_id, scenes, shots, approval_status, version, edited_at, approved_by',
                            },
                            {
                              table: 'translated_scripts',
                              desc: 'Multilingual script translations',
                              cols: 'id, script_id, language_code, title, translated_content, status',
                            },
                            {
                              table: 'creator_cost_presets',
                              desc: 'Labor-based cost calculation templates',
                              cols: 'id, name, scenes_per_episode, artists_per_episode, production_days',
                            },
                            {
                              table: 'production_jobs',
                              desc: 'AI generation job queue with cost tracking',
                              cols: 'id, job_type, status, service, request_payload, response_data, cost',
                            },
                            {
                              table: 'user_settings',
                              desc: 'User preferences and API configurations',
                              cols: 'id, user_id, api_keys, generation_preferences, created_at',
                            },
                            {
                              table: 'workflow_configs',
                              desc: 'Customizable production workflow configurations',
                              cols: 'id, organization_id, workflow_type, steps, automation_rules',
                            },
                            {
                              table: 'brand_templates',
                              desc: 'Reusable templates for series and production settings',
                              cols: 'id, name, template_type, configuration, is_public, created_by',
                            },
                            {
                              table: 'prompt_templates',
                              desc: 'Customizable AI prompt templates with versioning',
                              cols: 'id, organization_id, prompt_key, prompt_name, category, is_system_default, is_active',
                            },
                            {
                              table: 'prompt_template_versions',
                              desc: 'Version history for prompt templates',
                              cols: 'id, prompt_template_id, version_number, prompt_content, is_deployed, change_notes',
                            },
                            {
                              table: 'lip_sync_jobs',
                              desc: 'Lip sync generation job tracking',
                              cols: 'id, episode_id, dialogue_id, provider, status, video_url, created_at',
                            },
                            {
                              table: 'episode_progress',
                              desc: 'Real-time episode production progress tracking',
                              cols: 'id, episode_id, script_progress, storyboard_progress, audio_progress, total_progress',
                            },
                            {
                              table: 'gemini_api_usage',
                              desc: 'Gemini API usage tracking and cost monitoring',
                              cols: 'id, organization_id, request_type, model, tokens_used, cost_estimate, created_at',
                            },
                            {
                              table: 'translation_export_history',
                              desc: 'Export tracking for translated scripts',
                              cols: 'id, translated_script_id, export_format, exported_by, created_at',
                            },
                            {
                              table: 'patent_applications',
                              desc: 'Patent application drafting and management',
                              cols: 'id, organization_id, title, filing_type, status, inventor_name, specification, abstract',
                            },
                            {
                              table: 'patent_claims',
                              desc: 'Patent claims with independent/dependent hierarchy',
                              cols: 'id, application_id, claim_number, claim_type, parent_claim_id, claim_text, category',
                            },
                            {
                              table: 'patent_drawings',
                              desc: 'Patent figures and technical drawings',
                              cols: 'id, application_id, figure_number, title, description, svg_content, drawing_type',
                            },
                          ].map((table) => (
                            <div key={table.table} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-mono font-semibold text-scripps-blue">{table.table}</h4>
                                <Database className="w-4 h-4 text-gray-400" />
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{table.desc}</p>
                              <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded block">
                                {table.cols}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Storage Buckets</h3>
                        <div className="space-y-2">
                          {[
                            { name: 'character-images', desc: 'Character reference images and generated variations' },
                            { name: 'storyboard-images', desc: 'Scene storyboards and visual references' },
                            { name: 'production-assets', desc: 'Generated videos, audio, and final assets (250MB max per file)' },
                          ].map((bucket) => (
                            <div key={bucket.name} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                              <div>
                                <code className="font-mono text-sm text-gray-900">{bucket.name}</code>
                                <p className="text-xs text-gray-600 mt-1">{bucket.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Migrations Location</h3>
                        <div className="bg-gray-900 rounded-lg p-4">
                          <code className="text-green-400 font-mono text-sm">supabase/migrations/*.sql</code>
                          <p className="text-gray-400 text-xs mt-2">
                            All database schema migrations with detailed comments explaining structure and RLS policies
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reskin' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Visual Style Customization</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-blue-900">
                            This platform can be adapted for any animation style: anime, hyper-realistic, cartoon, stop-motion, or any custom artistic direction.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">1. Update Color Palette</h4>
                            <p className="text-sm text-gray-600 mb-2">Modify Tailwind configuration for your brand colors:</p>
                            <div className="bg-gray-900 rounded-lg p-4">
                              <code className="text-green-400 font-mono text-xs block">
                                {`// tailwind.config.js
colors: {
  'brand-primary': '#YOUR_COLOR',
  'brand-secondary': '#YOUR_COLOR',
  'brand-accent': '#YOUR_COLOR',
}`}
                              </code>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">2. Modify AI Generation Prompts</h4>
                            <p className="text-sm text-gray-600 mb-2">Update prompt templates in service files:</p>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <ul className="text-sm text-gray-700 space-y-2">
                                <li><code className="text-xs bg-gray-200 px-2 py-1 rounded">src/services/geminiService.ts</code> - Script generation prompts</li>
                                <li><code className="text-xs bg-gray-200 px-2 py-1 rounded">src/services/storyboardService.ts</code> - Storyboard and image prompts</li>
                                <li><code className="text-xs bg-gray-200 px-2 py-1 rounded">src/services/nanoBananaService.ts</code> - Image generation prompts</li>
                                <li><code className="text-xs bg-gray-200 px-2 py-1 rounded">src/components/AIStudio.tsx</code> - User-facing prompt templates</li>
                              </ul>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">3. Style-Specific Prompt Examples</h4>
                            <div className="space-y-3">
                              {[
                                {
                                  style: 'Anime Style',
                                  prompt: 'anime art style, vibrant colors, expressive eyes, dynamic poses, clean line art, cel shading',
                                },
                                {
                                  style: 'Hyper-Realistic',
                                  prompt: 'photorealistic, high detail, natural lighting, realistic textures, 8k quality, cinematic',
                                },
                                {
                                  style: 'Cartoon Style',
                                  prompt: 'cartoon illustration, bold outlines, simplified shapes, bright colors, exaggerated expressions',
                                },
                                {
                                  style: 'Claymation (Default)',
                                  prompt: 'claymation style, clay texture, stop-motion aesthetic, fingerprint details, warm lighting',
                                },
                                {
                                  style: '3D Animation',
                                  prompt: '3D rendered, smooth animation, detailed textures, professional lighting, Pixar style quality',
                                },
                              ].map((ex) => (
                                <div key={ex.style} className="border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-sm text-gray-900">{ex.style}</h5>
                                    <button
                                      onClick={() => copyToClipboard(ex.prompt, ex.style)}
                                      className="text-scripps-blue hover:text-scripps-navy"
                                    >
                                      {copiedText === ex.style ? (
                                        <CheckCircle className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                  <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded block">
                                    {ex.prompt}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">4. Replace Brand Assets</h4>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <ul className="text-sm text-gray-700 space-y-2">
                                <li>Logo: <code className="text-xs bg-gray-200 px-2 py-1 rounded">src/components/Logo.tsx</code></li>
                                <li>Favicon: <code className="text-xs bg-gray-200 px-2 py-1 rounded">public/favicon.ico</code></li>
                                <li>Character References: <code className="text-xs bg-gray-200 px-2 py-1 rounded">public/characters/*</code></li>
                                <li>Sample Assets: Update or remove files in public directory</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">IP Adaptation Framework</h3>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Replacing Scripps Spelling Bee IP</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              To adapt this platform for different content (cooking show, science education, sports, etc.):
                            </p>
                            <div className="space-y-2">
                              {[
                                { step: 'Update Series Metadata', loc: 'Database: series table', action: 'Change title, description, theme' },
                                { step: 'Modify Character Archetypes', loc: 'src/utils/sampleData.ts', action: 'Replace with new character types' },
                                { step: 'Adapt Educational Content', loc: 'scripts table', action: 'Replace vocabulary_words with your content focus' },
                                { step: 'Update UI Text & Labels', loc: 'All components', action: 'Find and replace references to spelling/vocabulary' },
                                { step: 'Customize Episode Structure', loc: 'script_acts table', action: 'Adjust runtime and act structure' },
                              ].map((item, idx) => (
                                <div key={idx} className="border-l-4 border-scripps-blue bg-blue-50 p-3">
                                  <div className="font-semibold text-sm text-gray-900">{item.step}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">Location:</span> {item.loc}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Action:</span> {item.action}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'deployment' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Deployment Options</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              platform: 'Vercel',
                              url: 'https://vercel.com',
                              desc: 'Zero-config deployment with automatic preview URLs',
                              cmd: 'vercel deploy',
                            },
                            {
                              platform: 'Netlify',
                              url: 'https://netlify.com',
                              desc: 'Continuous deployment with edge functions support',
                              cmd: 'netlify deploy --prod',
                            },
                            {
                              platform: 'Cloudflare Pages',
                              url: 'https://pages.cloudflare.com',
                              desc: 'Global CDN with built-in analytics',
                              cmd: 'npm run build && wrangler pages publish dist',
                            },
                          ].map((platform) => (
                            <div key={platform.platform} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{platform.platform}</h4>
                                <a
                                  href={platform.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-scripps-blue hover:text-scripps-navy"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{platform.desc}</p>
                              <div className="bg-gray-900 rounded p-2">
                                <code className="text-green-400 font-mono text-xs">{platform.cmd}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Environment Variables Setup</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-3">
                            Add these environment variables to your deployment platform:
                          </p>
                          <div className="space-y-2 text-sm font-mono">
                            {[
                              'VITE_SUPABASE_URL',
                              'VITE_SUPABASE_ANON_KEY',
                              'VITE_VERTEX_AI_PROJECT_ID',
                              'VITE_VERTEX_AI_LOCATION',
                              'VITE_VERTEX_AI_API_KEY',
                              'ELEVENLABS_API_KEY',
                              'VITE_ELEVENLABS_API_KEY',
                              'VITE_CHATTERBOX_SERVER_URL',
                            ].map((envVar) => (
                              <div key={envVar} className="bg-white border border-gray-200 rounded p-2 flex items-center justify-between">
                                <code className="text-gray-700">{envVar}</code>
                                <button
                                  onClick={() => copyToClipboard(envVar, envVar)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {copiedText === envVar ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Build Configuration</h3>
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-sm text-gray-900 mb-2">Build Command</h4>
                            <code className="text-sm bg-gray-900 text-green-400 px-3 py-2 rounded block">npm run build</code>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-sm text-gray-900 mb-2">Output Directory</h4>
                            <code className="text-sm bg-gray-900 text-green-400 px-3 py-2 rounded block">dist</code>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-sm text-gray-900 mb-2">Node Version</h4>
                            <code className="text-sm bg-gray-900 text-green-400 px-3 py-2 rounded block">18.x or higher</code>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Post-Deployment Checklist</h3>
                        <div className="space-y-2">
                          {[
                            'Verify all environment variables are set correctly',
                            'Test database connectivity from production',
                            'Confirm AI service API keys are working',
                            'Check that file uploads work with Supabase Storage',
                            'Test production build locally before deploying',
                            'Set up custom domain (optional)',
                            'Enable HTTPS and security headers',
                            'Configure CDN for asset delivery',
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-3 text-sm text-gray-700">
                              <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'costs' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">AI Service Pricing Estimates</h3>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-amber-900">
                            These are approximate costs. Actual pricing varies by usage, region, and service tier. Always check current pricing on provider websites.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Google Vertex AI (Gemini 3 & Veo 3)</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Script Generation (per 1K tokens):</span>
                                <span className="font-mono">~$0.01</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Image Generation (per image):</span>
                                <span className="font-mono">~$0.04</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Video Generation (per second):</span>
                                <span className="font-mono">~$0.10</span>
                              </div>
                            </div>
                          </div>

                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3">ElevenLabs</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Voice Synthesis (per 1K characters):</span>
                                <span className="font-mono">~$0.30</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Voice Cloning:</span>
                                <span className="font-mono">~$11/month</span>
                              </div>
                            </div>
                          </div>

                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Chatterbox</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Voice Synthesis (per 1K characters):</span>
                                <span className="font-mono">Varies by provider</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Voice Cloning:</span>
                                <span className="font-mono">Provider-dependent</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Python TTS Server:</span>
                                <span className="font-mono">Self-hosted (free)</span>
                              </div>
                            </div>
                          </div>

                          <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Supabase</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Free Tier:</span>
                                <span className="font-mono">500MB database, 1GB storage</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Pro Tier:</span>
                                <span className="font-mono">$25/month</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Per-Episode Cost Estimate</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-4">Typical 22-minute episode with 50 shots:</p>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">Script Generation (5K tokens)</span>
                              <span className="font-mono">$0.05</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">Storyboard Images (50 images)</span>
                              <span className="font-mono">$2.00</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">Character Images (100 images)</span>
                              <span className="font-mono">$4.00</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">Voice Recordings (10K chars)</span>
                              <span className="font-mono">$3.00</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">Video Generation (50 clips × 5 sec)</span>
                              <span className="font-mono">$25.00</span>
                            </div>
                            <div className="border-t border-gray-300 pt-2 mt-2">
                              <div className="flex justify-between items-center font-bold">
                                <span>Total per Episode</span>
                                <span className="text-lg text-scripps-blue">~$34.05</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Cost Optimization Tips</h3>
                        <div className="space-y-2">
                          {[
                            'Reuse character and background images across episodes',
                            'Generate longer video clips instead of many short ones',
                            'Use batch processing for multiple jobs',
                            'Cache AI responses when possible',
                            'Start with lower quality for drafts, high quality for finals',
                            'Monitor usage with built-in cost tracking',
                            'Set up budget alerts in your cloud provider',
                          ].map((tip) => (
                            <div key={tip} className="flex items-start gap-3 text-sm text-gray-700">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'files' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Project File Structure</h3>
                        <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300 overflow-x-auto">
                          <pre>{`project-root/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx               # Main dashboard with analytics
│   │   ├── Characters.tsx              # Character management
│   │   ├── Scripts.tsx                 # Script browser
│   │   ├── Episodes.tsx                # Episode production tracking
│   │   ├── AIStudio.tsx                # AI generation interface
│   │   ├── VoiceGenerationTab.tsx      # Voice studio and cloning
│   │   ├── VoiceSelector.tsx           # Voice selection UI
│   │   ├── VoiceCloningModal.tsx       # Voice cloning interface
│   │   ├── Assets.tsx                  # Asset library
│   │   ├── Production.tsx              # Production queue
│   │   ├── Settings.tsx                # This settings page
│   │   ├── StoryboardGenerator.tsx     # Storyboard creation
│   │   ├── StoryboardViewer.tsx        # Storyboard display
│   │   ├── ScriptTranslationManager.tsx # Translation system
│   │   ├── ApprovalWorkflow.tsx        # Approval system
│   │   ├── EpisodeProfitAnalytics.tsx  # Revenue tracking
│   │   ├── CreatorCostCalculator.tsx   # Labor cost calculator
│   │   ├── LipSyncManager.tsx          # Lip sync tracking
│   │   ├── PromptLibrary.tsx           # Prompt management
│   │   ├── PatentApplication.tsx       # Patent drafting
│   │   ├── VideoTrailerShowcase.tsx    # Featured trailers
│   │   └── Layout.tsx                  # Main app layout
│   ├── services/
│   │   ├── geminiService.ts            # Vertex AI integration
│   │   ├── elevenLabsService.ts        # ElevenLabs voice synthesis
│   │   ├── chatterboxService.ts        # Chatterbox voice cloning
│   │   ├── voiceService.ts             # Unified voice service
│   │   ├── nanoBananaService.ts        # Image generation
│   │   ├── storyboardService.ts        # Storyboard logic
│   │   ├── scriptTranslationService.ts # Translation logic
│   │   ├── episodeCreationService.ts   # Episode workflow
│   │   ├── costCalculationService.ts   # AI cost tracking
│   │   ├── creatorCostCalculationService.ts # Labor cost tracking
│   │   ├── ltvCalculationService.ts    # LTV estimation
│   │   ├── backupService.ts            # Backup system
│   │   ├── monitoringService.ts        # Health monitoring
│   │   ├── settingsService.ts          # Settings management
│   │   ├── lipSyncService.ts           # Lip sync processing
│   │   ├── promptLibraryService.ts     # Prompt management
│   │   ├── episodeProgressService.ts   # Progress tracking
│   │   ├── geminiUsageTrackingService.ts # API usage tracking
│   │   └── patentApplicationService.ts # Patent generation
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   └── database.types.ts           # TypeScript types
│   └── utils/
│       └── sampleData.ts               # Sample data
├── supabase/
│   ├── migrations/                     # Database migrations (70+ files)
│   └── functions/                      # Edge functions
│       └── elevenlabs-proxy/           # ElevenLabs API proxy
├── python-tts-server/                  # Chatterbox TTS server
│   ├── main.py                         # FastAPI server
│   ├── requirements.txt                # Python dependencies
│   └── README.md                       # Setup guide
├── public/                             # Static assets
│   ├── characters/                     # Character images
│   └── storyboards/                    # Storyboard images
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── .env                                # Environment variables`}</pre>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Key Configuration Files</h3>
                        <div className="space-y-3">
                          {[
                            {
                              file: 'package.json',
                              desc: 'Dependencies and build scripts',
                              importance: 'Critical',
                            },
                            {
                              file: 'vite.config.ts',
                              desc: 'Vite build configuration',
                              importance: 'Critical',
                            },
                            {
                              file: 'tailwind.config.js',
                              desc: 'Theme and styling configuration',
                              importance: 'High',
                            },
                            {
                              file: 'tsconfig.json',
                              desc: 'TypeScript compiler options',
                              importance: 'High',
                            },
                            {
                              file: '.env',
                              desc: 'Environment variables (local only)',
                              importance: 'Critical',
                            },
                          ].map((file) => (
                            <div key={file.file} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <code className="font-mono text-sm text-gray-900">{file.file}</code>
                                <p className="text-xs text-gray-600 mt-1">{file.desc}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                file.importance === 'Critical'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {file.importance}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Where to Find Things</h3>
                        <div className="space-y-2 text-sm">
                          {[
                            { what: 'Add new character types', where: 'src/utils/sampleData.ts' },
                            { what: 'Modify AI prompts', where: 'src/services/geminiService.ts & storyboardService.ts' },
                            { what: 'Change color scheme', where: 'tailwind.config.js' },
                            { what: 'Update database schema', where: 'supabase/migrations/*.sql' },
                            { what: 'Add new page/route', where: 'src/components/ + src/App.tsx' },
                            { what: 'Configure API integrations', where: 'src/services/*.ts' },
                            { what: 'Modify production workflow', where: 'src/services/episodeCreationService.ts' },
                            { what: 'Setup voice providers', where: 'src/services/voiceService.ts & chatterboxService.ts' },
                            { what: 'Configure cost tracking', where: 'src/services/costCalculationService.ts' },
                            { what: 'Change app logo', where: 'src/components/Logo.tsx' },
                            { what: 'Manage prompts', where: 'src/services/promptLibraryService.ts & PromptLibrary.tsx' },
                            { what: 'Track lip sync jobs', where: 'src/services/lipSyncService.ts & LipSyncManager.tsx' },
                            { what: 'Draft patent applications', where: 'src/components/PatentApplication.tsx' },
                            { what: 'Configure featured trailers', where: 'src/components/VideoTrailerShowcase.tsx' },
                          ].map((item) => (
                            <div key={item.what} className="flex items-start gap-3 bg-gray-50 rounded p-3">
                              <FileCode className="w-4 h-4 text-scripps-blue mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{item.what}</span>
                                <br />
                                <code className="text-xs text-gray-600">{item.where}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
