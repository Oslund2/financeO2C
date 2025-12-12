import { supabase } from '../lib/supabase';

export interface UserSettings {
  id?: string;
  user_id?: string;
  default_series_id?: string;
  ui_preferences: {
    theme?: string;
    layout?: string;
    [key: string]: any;
  };
  generation_preferences: {
    temperature: number;
    max_tokens: number;
    tone: string;
    pacing: string;
    include_establishing?: boolean;
    [key: string]: any;
  };
  vertex_ai_config?: {
    project_id?: string;
    location?: string;
    cloud_storage_bucket?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  ui_preferences: {
    theme: 'light',
    layout: 'default'
  },
  generation_preferences: {
    temperature: 0.7,
    max_tokens: 4000,
    tone: 'educational and entertaining',
    pacing: 'medium',
    include_establishing: true
  },
  vertex_ai_config: {
    project_id: '',
    location: 'us-central1',
    cloud_storage_bucket: ''
  }
};

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching user settings:', error);
      return DEFAULT_SETTINGS;
    }

    if (!data) {
      const newSettings = await createUserSettings(DEFAULT_SETTINGS);
      return newSettings || DEFAULT_SETTINGS;
    }

    return data as UserSettings;
  } catch (error) {
    console.error('Failed to get user settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function createUserSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
  try {
    const newSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      ui_preferences: {
        ...DEFAULT_SETTINGS.ui_preferences,
        ...(settings.ui_preferences || {})
      },
      generation_preferences: {
        ...DEFAULT_SETTINGS.generation_preferences,
        ...(settings.generation_preferences || {})
      },
      vertex_ai_config: {
        ...DEFAULT_SETTINGS.vertex_ai_config,
        ...(settings.vertex_ai_config || {})
      }
    };

    const { data, error } = await supabase
      .from('user_settings')
      .insert([newSettings])
      .select()
      .single();

    if (error) {
      console.error('Error creating user settings:', error);
      return null;
    }

    return data as UserSettings;
  } catch (error) {
    console.error('Failed to create user settings:', error);
    return null;
  }
}

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
  try {
    const currentSettings = await getUserSettings();

    if (!currentSettings.id) {
      return await createUserSettings(settings);
    }

    const updatedSettings = {
      ...currentSettings,
      ...settings,
      ui_preferences: {
        ...currentSettings.ui_preferences,
        ...(settings.ui_preferences || {})
      },
      generation_preferences: {
        ...currentSettings.generation_preferences,
        ...(settings.generation_preferences || {})
      },
      vertex_ai_config: {
        ...currentSettings.vertex_ai_config,
        ...(settings.vertex_ai_config || {})
      }
    };

    const { data, error } = await supabase
      .from('user_settings')
      .update(updatedSettings)
      .eq('id', currentSettings.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return null;
    }

    return data as UserSettings;
  } catch (error) {
    console.error('Failed to update user settings:', error);
    return null;
  }
}

export function getAPIKeyStatus() {
  return {
    vertexAI: {
      projectId: !!import.meta.env.VITE_VERTEX_AI_PROJECT_ID,
      location: !!import.meta.env.VITE_VERTEX_AI_LOCATION,
      apiKey: !!import.meta.env.VITE_VERTEX_AI_API_KEY
    },
    elevenLabs: {
      apiKey: !!import.meta.env.ELEVENLABS_API_KEY
    }
  };
}

export function getConfigurationInstructions() {
  return {
    vertexAI: {
      title: 'Vertex AI Veo 3.1 Configuration',
      description: 'Set up Google Cloud Vertex AI for video generation with Veo 3.1',
      secrets: [
        {
          name: 'VITE_VERTEX_AI_PROJECT_ID',
          description: 'Your Google Cloud project ID',
          example: 'my-project-12345',
          required: true
        },
        {
          name: 'VITE_VERTEX_AI_LOCATION',
          description: 'Google Cloud region for Vertex AI (must support Veo 3.1)',
          example: 'us-central1',
          required: false,
          default: 'us-central1'
        },
        {
          name: 'VITE_VERTEX_AI_API_KEY',
          description: 'Google Cloud API key with Vertex AI and Cloud Storage access',
          example: 'AIzaSy...',
          required: true
        },
        {
          name: 'VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET',
          description: 'Cloud Storage bucket for video outputs (gs://bucket-name)',
          example: 'gs://my-veo3-renders',
          required: true
        }
      ],
      setupUrl: 'https://console.cloud.google.com/apis/credentials',
      additionalInfo: 'Veo 3.1 pricing: $0.75/second for video with audio generation. Ensure your Cloud Storage bucket has proper IAM permissions for Vertex AI service account.'
    },
    elevenLabs: {
      title: 'ElevenLabs Configuration',
      description: 'Set up ElevenLabs for voice generation',
      secrets: [
        {
          name: 'ELEVENLABS_API_KEY',
          description: 'Your ElevenLabs API key',
          example: 'sk_...',
          required: true
        }
      ],
      setupUrl: 'https://elevenlabs.io/app/settings/api-keys'
    }
  };
}
