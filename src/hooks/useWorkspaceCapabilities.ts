import { useEffect, useState } from 'react';
import { useOrganization, WorkspaceType } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

export interface WorkspaceFeatureConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface WorkspaceFeatures {
  vocabulary_randomizer: boolean | WorkspaceFeatureConfig;
  historical_fact_checker: boolean | WorkspaceFeatureConfig;
  clay_texture_settings: boolean | WorkspaceFeatureConfig;
  miniature_set_designer: boolean | WorkspaceFeatureConfig;
  character_rig_library: boolean | WorkspaceFeatureConfig;
  spelling_word_integration: boolean | WorkspaceFeatureConfig;
  documentary_narration: boolean | WorkspaceFeatureConfig;
  realistic_environments: boolean | WorkspaceFeatureConfig;
  citation_manager: boolean | WorkspaceFeatureConfig;
  period_accuracy_checker: boolean | WorkspaceFeatureConfig;
  interview_format: boolean | WorkspaceFeatureConfig;
  archival_integration: boolean | WorkspaceFeatureConfig;
  script_regeneration: boolean | WorkspaceFeatureConfig;
  documentary_format: boolean | WorkspaceFeatureConfig;
  realistic_video_style: boolean | WorkspaceFeatureConfig;
  period_accuracy: boolean | WorkspaceFeatureConfig;
  children_format: boolean | WorkspaceFeatureConfig;
  clay_video_style: boolean | WorkspaceFeatureConfig;
  synthetic_audience_testing: boolean | WorkspaceFeatureConfig;
  // Commercial & Promo features
  concept_generator: boolean | WorkspaceFeatureConfig;
  campaign_brief_intake: boolean | WorkspaceFeatureConfig;
  variant_manager: boolean | WorkspaceFeatureConfig;
  legal_compliance_checklist: boolean | WorkspaceFeatureConfig;
  talent_profiles: boolean | WorkspaceFeatureConfig;
  music_generation: boolean | WorkspaceFeatureConfig;
  ai_advantage_calculator: boolean | WorkspaceFeatureConfig;
}

export interface WorkspaceSettings {
  video_fps: number;
  animation_style: string;
  character_style: string;
  background_style: string;
  color_palette: string;
  lighting_style: string;
}

export interface WorkspaceCapabilities {
  workspaceType: WorkspaceType | null;
  displayName: string;
  description: string;
  iconName: string;
  primaryColor: string;
  features: WorkspaceFeatures;
  defaultSettings: WorkspaceSettings;
  loading: boolean;
  error: string | null;
  isFeatureEnabled: (featureName: keyof WorkspaceFeatures) => boolean;
  getFeatureConfig: (featureName: keyof WorkspaceFeatures) => WorkspaceFeatureConfig | null;
  isPhotoreal: boolean;
  isClaymation: boolean;
  isCommercial: boolean;
}

const DEFAULT_FEATURES: WorkspaceFeatures = {
  vocabulary_randomizer: false,
  historical_fact_checker: false,
  clay_texture_settings: false,
  miniature_set_designer: false,
  character_rig_library: false,
  spelling_word_integration: false,
  documentary_narration: false,
  realistic_environments: false,
  citation_manager: false,
  period_accuracy_checker: false,
  interview_format: false,
  archival_integration: false,
  script_regeneration: false,
  documentary_format: false,
  realistic_video_style: false,
  period_accuracy: false,
  children_format: false,
  clay_video_style: false,
  synthetic_audience_testing: false,
  concept_generator: false,
  campaign_brief_intake: false,
  variant_manager: false,
  legal_compliance_checklist: false,
  talent_profiles: false,
  music_generation: false,
  ai_advantage_calculator: false,
};

function isFeatureEnabledValue(feature: boolean | WorkspaceFeatureConfig | undefined): boolean {
  if (typeof feature === 'boolean') return feature;
  if (typeof feature === 'object' && feature !== null) {
    return feature.enabled === true;
  }
  return false;
}

const DEFAULT_SETTINGS: WorkspaceSettings = {
  video_fps: 24,
  animation_style: 'flexible',
  character_style: 'flexible',
  background_style: 'flexible',
  color_palette: 'flexible',
  lighting_style: 'flexible',
};

export function useWorkspaceCapabilities(): WorkspaceCapabilities {
  const { currentOrganization } = useOrganization();
  const [config, setConfig] = useState<{
    displayName: string;
    description: string;
    iconName: string;
    primaryColor: string;
    features: WorkspaceFeatures;
    defaultSettings: WorkspaceSettings;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!currentOrganization?.workspace_type) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('workspace_type_configs')
          .select('*')
          .eq('workspace_type', currentOrganization.workspace_type)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          setConfig({
            displayName: data.display_name,
            description: data.description || '',
            iconName: data.icon_name || 'Layers',
            primaryColor: data.primary_color || '#3B82F6',
            features: data.features as WorkspaceFeatures || DEFAULT_FEATURES,
            defaultSettings: data.default_settings as WorkspaceSettings || DEFAULT_SETTINGS,
          });
        } else {
          setConfig({
            displayName: 'Unknown Workspace',
            description: '',
            iconName: 'Layers',
            primaryColor: '#3B82F6',
            features: DEFAULT_FEATURES,
            defaultSettings: DEFAULT_SETTINGS,
          });
        }
      } catch (err) {
        console.error('Error fetching workspace config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workspace configuration');
        setConfig({
          displayName: 'Workspace',
          description: '',
          iconName: 'Layers',
          primaryColor: '#3B82F6',
          features: DEFAULT_FEATURES,
          defaultSettings: DEFAULT_SETTINGS,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [currentOrganization?.workspace_type]);

  const isFeatureEnabled = (featureName: keyof WorkspaceFeatures): boolean => {
    if (!config) return false;
    const feature = config.features[featureName];
    return isFeatureEnabledValue(feature);
  };

  const getFeatureConfig = (featureName: keyof WorkspaceFeatures): WorkspaceFeatureConfig | null => {
    if (!config) return null;
    const feature = config.features[featureName];
    if (typeof feature === 'object' && feature !== null && 'enabled' in feature) {
      return feature as WorkspaceFeatureConfig;
    }
    if (typeof feature === 'boolean') {
      return { enabled: feature };
    }
    return null;
  };

  const workspaceType = currentOrganization?.workspace_type || null;

  return {
    workspaceType,
    displayName: config?.displayName || 'Workspace',
    description: config?.description || '',
    iconName: config?.iconName || 'Layers',
    primaryColor: config?.primaryColor || '#3B82F6',
    features: config?.features || DEFAULT_FEATURES,
    defaultSettings: config?.defaultSettings || DEFAULT_SETTINGS,
    loading,
    error,
    isFeatureEnabled,
    getFeatureConfig,
    isPhotoreal: workspaceType === 'photoreal',
    isClaymation: workspaceType === 'claymation',
    isCommercial: workspaceType === 'commercial',
  };
}
