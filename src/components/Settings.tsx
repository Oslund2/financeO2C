import { useState, useEffect } from 'react';
import { Key, Database, Sparkles, ExternalLink, CheckCircle, XCircle, Info, BookOpen, ChevronDown, ChevronUp, Copy, Code, Layers, FileCode, Palette, Rocket, DollarSign, FolderTree } from 'lucide-react';
import { getAPIKeyStatus, getConfigurationInstructions } from '../services/settingsService';

export function Settings() {
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [techDocsExpanded, setTechDocsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    checkAPIStatus();
  }, []);

  const checkAPIStatus = () => {
    const status = getAPIKeyStatus();
    setApiStatus(status);
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

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Configure your AI services and application settings</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
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

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{instructions.vertexAI.title}</h2>
                <p className="text-sm text-gray-600">{instructions.vertexAI.description}</p>
              </div>
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
                      ) : apiStatus && secret.name === 'VITE_VERTEX_AI_API_KEY' && apiStatus.vertexAI.apiKey ? (
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
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-scripps-yellow to-yellow-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{instructions.elevenLabs.title}</h2>
                <p className="text-sm text-gray-600">{instructions.elevenLabs.description}</p>
              </div>
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

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Database Status</h2>
                <p className="text-sm text-gray-600">Supabase connection information</p>
              </div>
            </div>

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

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Creator Cost Configuration</h2>
                <p className="text-sm text-gray-600">Labor-based production cost settings and presets</p>
              </div>
            </div>

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
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
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
                                <li>Google Vertex AI (Gemini 2.0 Flash & Veo 3)</li>
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
                            'Character Management',
                            'Script Generation & Editing',
                            'Episode Production Tracking',
                            'AI-Powered Storyboard Generation',
                            'Asset Library & Management',
                            'Cost Tracking & Analytics',
                            'Voice Generation Studio',
                            'Custom Voice Cloning',
                            'Multi-Provider Voice Synthesis',
                            'Script Translation System',
                            'Approval Workflow System',
                            'Backup & Recovery System',
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
                                <span className="font-semibold">Scene Breakdown:</span> Parse script into acts, scenes, and individual shots
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">3.</span>
                              <div>
                                <span className="font-semibold">Storyboard Creation:</span> Generate visual storyboards for each scene with AI prompts
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">4.</span>
                              <div>
                                <span className="font-semibold">Character Images:</span> Generate consistent character images for each shot
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">5.</span>
                              <div>
                                <span className="font-semibold">Voice Recordings:</span> Generate dialogue audio using ElevenLabs or Chatterbox with character-specific voices, including custom cloned voices
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">6.</span>
                              <div>
                                <span className="font-semibold">Video Generation:</span> Create animated clips from static images using Veo 3
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="font-bold text-scripps-blue">7.</span>
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
                            { name: 'Dashboard', path: 'src/components/Dashboard.tsx', desc: 'Main overview and analytics' },
                            { name: 'Characters', path: 'src/components/Characters.tsx', desc: 'Character creation and management' },
                            { name: 'Scripts', path: 'src/components/Scripts.tsx', desc: 'Script browsing and viewing' },
                            { name: 'Episodes', path: 'src/components/Episodes.tsx', desc: 'Episode production tracking' },
                            { name: 'AIStudio', path: 'src/components/AIStudio.tsx', desc: 'AI generation interface' },
                            { name: 'VoiceGenerationTab', path: 'src/components/VoiceGenerationTab.tsx', desc: 'Voice studio and cloning' },
                            { name: 'StoryboardGenerator', path: 'src/components/StoryboardGenerator.tsx', desc: 'Storyboard creation' },
                            { name: 'Assets', path: 'src/components/Assets.tsx', desc: 'Asset library management' },
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
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Database Schema</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Complete Supabase PostgreSQL schema with Row Level Security (RLS) enabled on all tables
                        </p>
                        <div className="space-y-3">
                          {[
                            {
                              table: 'series',
                              desc: 'Series metadata, art style, and production guidelines',
                              cols: 'id, title, description, art_style, target_audience, created_at',
                            },
                            {
                              table: 'characters',
                              desc: 'Character profiles with physical traits, personality, voice settings, and provider info',
                              cols: 'id, name, description, personality_traits, clay_features, voice_id, voice_provider, role',
                            },
                            {
                              table: 'scripts',
                              desc: 'Episode scripts with metadata, vocabulary words, and lock status',
                              cols: 'id, series_id, title, synopsis, vocabulary_words, status, locked_at, locked_by',
                            },
                            {
                              table: 'script_acts',
                              desc: 'Three-act structure breakdown for each script',
                              cols: 'id, script_id, act_number, title, content, duration_minutes',
                            },
                            {
                              table: 'script_scenes',
                              desc: 'Individual scenes with dialogue and stage directions',
                              cols: 'id, act_id, scene_number, location, characters, dialogue',
                            },
                            {
                              table: 'episodes',
                              desc: 'Production tracking for each episode',
                              cols: 'id, series_id, season, episode_number, title, status, production_notes',
                            },
                            {
                              table: 'assets',
                              desc: 'All media assets (images, videos, audio)',
                              cols: 'id, type, file_path, metadata, tags, usage_count',
                            },
                            {
                              table: 'storyboards',
                              desc: 'Visual storyboards for episodes with approval workflow and editing history',
                              cols: 'id, episode_id, scenes, shots, approval_status, version, edited_at',
                            },
                            {
                              table: 'translated_scripts',
                              desc: 'Multilingual script translations with metadata',
                              cols: 'id, script_id, language_code, title, translated_content, status',
                            },
                            {
                              table: 'episode_revenue_metrics',
                              desc: 'Revenue tracking and LTV calculations per episode',
                              cols: 'id, episode_id, revenue_per_view, total_views, ltv_estimate',
                            },
                            {
                              table: 'creator_cost_presets',
                              desc: 'Preconfigured cost calculation templates for different production scales',
                              cols: 'id, name, scenes_per_episode, artists_per_scene, production_days',
                            },
                            {
                              table: 'production_jobs',
                              desc: 'AI generation job queue and tracking',
                              cols: 'id, job_type, status, input_params, output_data, cost, error_message',
                            },
                            {
                              table: 'user_settings',
                              desc: 'User preferences and API configurations',
                              cols: 'id, user_id, api_keys, preferences, created_at',
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
                            { name: 'production-assets', desc: 'Generated videos, audio, and final assets' },
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
│   │   └── settingsService.ts          # Settings management
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   └── database.types.ts           # TypeScript types
│   └── utils/
│       └── sampleData.ts               # Sample data
├── supabase/
│   ├── migrations/                     # Database migrations (19 files)
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
