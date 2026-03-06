import { useState, useEffect } from 'react';
import { Target, ChevronDown, ChevronUp, Loader2, Shield, Eye, Users, Megaphone, Palette, CheckCircle, AlertCircle, CreditCard as Edit3, BookOpen, ToggleLeft, ToggleRight, Zap, Star } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  getWorkspaceMission,
  getFeatureRecommendations,
  getMissionGeneratedPrompts,
  calculateMissionHealth,
  updateFeatureRecommendation,
} from '../services/missionService';
import type {
  WorkspaceMission,
  FeatureRecommendation,
  MissionGeneratedPrompt,
  MissionHealthScore,
} from '../types/mission';
import { MissionWizard } from './MissionWizard';

interface MissionControlPanelProps {
  expanded: boolean;
  onToggle: () => void;
}

export function MissionControlPanel({ expanded, onToggle }: MissionControlPanelProps) {
  const { currentOrganization } = useOrganization();
  const [mission, setMission] = useState<WorkspaceMission | null>(null);
  const [features, setFeatures] = useState<FeatureRecommendation[]>([]);
  const [prompts, setPrompts] = useState<MissionGeneratedPrompt[]>([]);
  const [health, setHealth] = useState<MissionHealthScore>({ total: 6, filled: 0, percentage: 0, missing: [] });
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('overview');
  const [showWizard, setShowWizard] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

  useEffect(() => {
    if (expanded && currentOrganization) {
      loadMissionData();
    }
  }, [expanded, currentOrganization?.id]);

  const loadMissionData = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const m = await getWorkspaceMission(currentOrganization.id);
      setMission(m);
      setHealth(calculateMissionHealth(m));

      if (m) {
        const [feats, proms] = await Promise.all([
          getFeatureRecommendations(m.id),
          getMissionGeneratedPrompts(m.id),
        ]);
        setFeatures(feats);
        setPrompts(proms);
      }
    } catch (err) {
      console.error('Failed to load mission data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (feature: FeatureRecommendation) => {
    setTogglingFeature(feature.id);
    const success = await updateFeatureRecommendation(feature.id, !feature.is_enabled);
    if (success) {
      setFeatures(prev => prev.map(f => f.id === feature.id ? { ...f, is_enabled: !f.is_enabled } : f));
    }
    setTogglingFeature(null);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    loadMissionData();
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const getStatusColor = () => {
    if (!mission) return 'bg-gray-100 text-gray-600';
    if (mission.mission_status === 'active') return 'bg-emerald-100 text-emerald-700';
    if (mission.mission_status === 'draft') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getStatusLabel = () => {
    if (!mission) return 'Not configured';
    return mission.mission_status.charAt(0).toUpperCase() + mission.mission_status.slice(1);
  };

  const getHealthColor = () => {
    if (health.percentage >= 80) return 'text-emerald-600';
    if (health.percentage >= 50) return 'text-amber-600';
    return 'text-red-500';
  };

  const getHealthBarColor = () => {
    if (health.percentage >= 80) return 'bg-emerald-500';
    if (health.percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const enabledFeatureCount = features.filter(f => f.is_enabled).length;

  const groupedPrompts = prompts.reduce<Record<string, MissionGeneratedPrompt[]>>((acc, p) => {
    const cat = p.prompt_category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          aria-expanded={expanded}
          aria-controls="mission-control-content"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Mission Control</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                {mission ? 'Workspace mission, audience & content strategy' : 'Define your workspace mission and content strategy'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
            {expanded ? (
              <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            )}
          </div>
        </button>

        {expanded && (
          <div id="mission-control-content" className="border-t border-gray-200">
            {loading ? (
              <div className="p-8 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-gray-500">Loading mission data...</span>
              </div>
            ) : !mission ? (
              <EmptyMissionState onSetup={() => setShowWizard(true)} />
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                <MissionHealthBar
                  health={health}
                  healthColor={getHealthColor()}
                  barColor={getHealthBarColor()}
                  onEdit={() => setShowWizard(true)}
                />

                <CollapsibleSection
                  id="overview"
                  title="Mission Overview"
                  icon={<Eye className="w-4 h-4" />}
                  active={activeSection === 'overview'}
                  onToggle={() => toggleSection('overview')}
                >
                  <MissionOverview mission={mission} />
                </CollapsibleSection>

                <CollapsibleSection
                  id="audience"
                  title="Target Audience"
                  icon={<Users className="w-4 h-4" />}
                  active={activeSection === 'audience'}
                  onToggle={() => toggleSection('audience')}
                >
                  <AudienceSection mission={mission} />
                </CollapsibleSection>

                <CollapsibleSection
                  id="voice"
                  title="Voice & Guardrails"
                  icon={<Shield className="w-4 h-4" />}
                  active={activeSection === 'voice'}
                  onToggle={() => toggleSection('voice')}
                >
                  <VoiceGuardrailsSection mission={mission} />
                </CollapsibleSection>

                <CollapsibleSection
                  id="features"
                  title={`Features (${enabledFeatureCount}/${features.length} enabled)`}
                  icon={<Zap className="w-4 h-4" />}
                  active={activeSection === 'features'}
                  onToggle={() => toggleSection('features')}
                >
                  <FeaturesSection
                    features={features}
                    togglingFeature={togglingFeature}
                    onToggle={handleToggleFeature}
                  />
                </CollapsibleSection>

                {prompts.length > 0 && (
                  <CollapsibleSection
                    id="prompts"
                    title={`Generated Prompts (${prompts.length})`}
                    icon={<BookOpen className="w-4 h-4" />}
                    active={activeSection === 'prompts'}
                    onToggle={() => toggleSection('prompts')}
                  >
                    <PromptsSection groupedPrompts={groupedPrompts} />
                  </CollapsibleSection>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showWizard && (
        <MissionWizard
          mission={mission}
          onClose={handleWizardClose}
        />
      )}
    </>
  );
}

function EmptyMissionState({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="p-8 sm:p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-sky-50 rounded-2xl flex items-center justify-center">
        <Target className="w-8 h-8 text-sky-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mission Configured</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Define your workspace mission to guide content generation, set brand voice rules,
        and configure feature recommendations for your production pipeline.
      </p>
      <button
        onClick={onSetup}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium text-sm"
      >
        <Target className="w-4 h-4" />
        Set Up Mission
      </button>
    </div>
  );
}

function MissionHealthBar({
  health,
  healthColor,
  barColor,
  onEdit,
}: {
  health: MissionHealthScore;
  healthColor: string;
  barColor: string;
  onEdit: () => void;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-700">Mission Health</span>
          <span className={`text-sm font-bold ${healthColor}`}>{health.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${health.percentage}%` }}
          />
        </div>
        {health.missing.length > 0 && (
          <p className="text-xs text-gray-500 mt-1.5">
            Missing: {health.missing.join(', ')}
          </p>
        )}
      </div>
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap"
      >
        <Edit3 className="w-3.5 h-3.5" />
        Edit Mission
      </button>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  icon,
  active,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        aria-expanded={active}
        aria-controls={`mission-section-${id}`}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          {title}
        </div>
        {active ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {active && (
        <div id={`mission-section-${id}`} className="border-t border-gray-100 p-4">
          {children}
        </div>
      )}
    </div>
  );
}

function MissionOverview({ mission }: { mission: WorkspaceMission }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mission Statement</span>
        <p className="text-sm text-gray-800 mt-1 leading-relaxed whitespace-pre-wrap">
          {mission.mission_statement || <span className="italic text-gray-400">Not defined</span>}
        </p>
      </div>
      {(mission.content_goals || []).length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content Goals</span>
          <ul className="mt-1.5 space-y-1">
            {mission.content_goals.map((goal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                {goal}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Palette className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">Visual Style:</span>
        <span className="text-xs font-medium text-gray-700 capitalize">{mission.visual_rendering_style}</span>
      </div>
    </div>
  );
}

function AudienceSection({ mission }: { mission: WorkspaceMission }) {
  const audience = mission.target_audience || {};
  const entries = Object.entries(audience).filter(([, v]) => v !== undefined && v !== null && v !== '');

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 italic">No target audience defined</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="bg-gray-50 rounded-lg p-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {key.replace(/_/g, ' ')}
          </span>
          <p className="text-sm text-gray-800 mt-0.5">
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function VoiceGuardrailsSection({ mission }: { mission: WorkspaceMission }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Megaphone className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Brand Voice</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {mission.brand_voice || <span className="italic text-gray-400">Not defined</span>}
        </p>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Shield className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content Guardrails</span>
        </div>
        <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans bg-red-50/50 rounded-lg p-3 border border-red-100">
          {mission.content_guardrails || <span className="italic text-gray-400">No guardrails defined</span>}
        </pre>
      </div>
    </div>
  );
}

function FeaturesSection({
  features,
  togglingFeature,
  onToggle,
}: {
  features: FeatureRecommendation[];
  togglingFeature: string | null;
  onToggle: (f: FeatureRecommendation) => void;
}) {
  if (features.length === 0) {
    return <p className="text-sm text-gray-400 italic">No feature recommendations configured</p>;
  }

  const categories = [...new Set(features.map(f => f.category))];

  return (
    <div className="space-y-4">
      {categories.map(cat => (
        <div key={cat}>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide capitalize">{cat}</span>
          <div className="mt-2 space-y-2">
            {features.filter(f => f.category === cat).map(feature => (
              <div
                key={feature.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <button
                  onClick={() => onToggle(feature)}
                  disabled={togglingFeature === feature.id}
                  className="mt-0.5 flex-shrink-0"
                >
                  {togglingFeature === feature.id ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : feature.is_enabled ? (
                    <ToggleRight className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${feature.is_enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                      {feature.feature_name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-gray-400">{feature.priority_score}</span>
                    </div>
                  </div>
                  {feature.ai_reasoning && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{feature.ai_reasoning}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromptsSection({ groupedPrompts }: { groupedPrompts: Record<string, MissionGeneratedPrompt[]> }) {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
        <div key={category}>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide capitalize">{category}</span>
          <div className="mt-1.5 space-y-1.5">
            {categoryPrompts.map(prompt => (
              <div key={prompt.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${prompt.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-700">{prompt.prompt_name}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedPrompt === prompt.id ? 'rotate-180' : ''}`} />
                </button>
                {expandedPrompt === prompt.id && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans mt-2 bg-gray-50 rounded p-2 max-h-48 overflow-y-auto">
                      {prompt.generated_content}
                    </pre>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Source: {prompt.generation_source}</span>
                      <span>Key: {prompt.prompt_key}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
