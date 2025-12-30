import { useEffect, useState } from 'react';
import { useOrganization, WorkspaceType } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

export interface WorkspaceFeatures {
  vocabulary_randomizer: boolean;
  historical_fact_checker: boolean;
  clay_texture_settings: boolean;
  miniature_set_designer: boolean;
  character_rig_library: boolean;
  spelling_word_integration: boolean;
  documentary_narration: boolean;
  realistic_environments: boolean;
  citation_manager: boolean;
  period_accuracy_checker: boolean;
  interview_format: boolean;
  archival_integration: boolean;
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
};

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
    return config.features[featureName] ?? false;
  };

  return {
    workspaceType: currentOrganization?.workspace_type || null,
    displayName: config?.displayName || 'Workspace',
    description: config?.description || '',
    iconName: config?.iconName || 'Layers',
    primaryColor: config?.primaryColor || '#3B82F6',
    features: config?.features || DEFAULT_FEATURES,
    defaultSettings: config?.defaultSettings || DEFAULT_SETTINGS,
    loading,
    error,
    isFeatureEnabled,
  };
}
