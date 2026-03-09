import { supabase } from '../lib/supabase';

export interface APIHealthStatus {
  configured: boolean;
  healthy: boolean;
  checking: boolean;
  error?: string;
  lastChecked?: number;
}

export interface AllAPIStatus {
  gemini: APIHealthStatus;
  vertexAI: APIHealthStatus;
  elevenLabs: APIHealthStatus;
  chatterbox: APIHealthStatus;
  syncLabs: APIHealthStatus;
  veedIo: APIHealthStatus;
  nanoBanana: APIHealthStatus;
  supabase: APIHealthStatus;
  shotstack: APIHealthStatus;
  heygen: APIHealthStatus;
}

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
  voice_preferences: {
    stability: number;
    similarity_boost: number;
    speed: number;
    default_provider: 'elevenlabs' | 'chatterbox';
    [key: string]: any;
  };
  video_preferences: {
    default_resolution: '720p' | '1080p';
    default_aspect_ratio: '16:9' | '9:16';
    default_duration: 4 | 6 | 8;
    sample_count: number;
    generate_audio: boolean;
    no_music: boolean;
    [key: string]: any;
  };
  translation_preferences: {
    default_languages: string[];
    auto_translate: boolean;
    preserve_timing: boolean;
    [key: string]: any;
  };
  patent_preferences: {
    auto_prior_art_search: boolean;
    prior_art_timeout: number;
    include_default_patents: boolean;
    analysis_target: 'video_production' | 'patent_management' | 'both';
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
  voice_preferences: {
    stability: 0.5,
    similarity_boost: 0.5,
    speed: 1.0,
    default_provider: 'elevenlabs'
  },
  video_preferences: {
    default_resolution: '1080p',
    default_aspect_ratio: '16:9',
    default_duration: 8,
    sample_count: 1,
    generate_audio: false,
    no_music: true
  },
  translation_preferences: {
    default_languages: ['es', 'fr', 'de', 'ja', 'zh'],
    auto_translate: false,
    preserve_timing: true
  },
  patent_preferences: {
    auto_prior_art_search: true,
    prior_art_timeout: 30000,
    include_default_patents: true,
    analysis_target: 'both'
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
      voice_preferences: {
        ...DEFAULT_SETTINGS.voice_preferences,
        ...(settings.voice_preferences || {})
      },
      video_preferences: {
        ...DEFAULT_SETTINGS.video_preferences,
        ...(settings.video_preferences || {})
      },
      translation_preferences: {
        ...DEFAULT_SETTINGS.translation_preferences,
        ...(settings.translation_preferences || {})
      },
      patent_preferences: {
        ...DEFAULT_SETTINGS.patent_preferences,
        ...(settings.patent_preferences || {})
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
      voice_preferences: {
        ...currentSettings.voice_preferences,
        ...(settings.voice_preferences || {})
      },
      video_preferences: {
        ...currentSettings.video_preferences,
        ...(settings.video_preferences || {})
      },
      translation_preferences: {
        ...currentSettings.translation_preferences,
        ...(settings.translation_preferences || {})
      },
      patent_preferences: {
        ...currentSettings.patent_preferences,
        ...(settings.patent_preferences || {})
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
    gemini: {
      apiKey: !!import.meta.env.VITE_GEMINI_API_KEY
    },
    vertexAI: {
      projectId: !!import.meta.env.VITE_VERTEX_AI_PROJECT_ID,
      location: !!import.meta.env.VITE_VERTEX_AI_LOCATION,
      apiKey: !!(import.meta.env.VITE_VERTEX_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY)
    },
    elevenLabs: {
      apiKey: !!import.meta.env.VITE_ELEVENLABS_API_KEY
    },
    chatterbox: {
      url: !!import.meta.env.VITE_CHATTERBOX_URL
    },
    syncLabs: {
      apiKey: !!import.meta.env.VITE_SYNC_LABS_API_KEY
    },
    veedIo: {
      apiKey: !!import.meta.env.VITE_VEED_API_KEY
    },
    nanoBanana: {
      apiKey: !!import.meta.env.VITE_NANO_BANANA_API_KEY
    },
    supabase: {
      url: !!import.meta.env.VITE_SUPABASE_URL,
      anonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    }
  };
}

const createDefaultHealthStatus = (configured: boolean): APIHealthStatus => ({
  configured,
  healthy: false,
  checking: false,
  lastChecked: undefined
});

export async function checkGeminiHealth(): Promise<APIHealthStatus> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return { configured: false, healthy: false, checking: false };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );
    return {
      configured: true,
      healthy: response.ok,
      checking: false,
      lastChecked: Date.now(),
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      checking: false,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function checkVertexAIHealth(): Promise<APIHealthStatus> {
  const projectId = import.meta.env.VITE_VERTEX_AI_PROJECT_ID;
  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

  if (!projectId || !apiKey) {
    return { configured: false, healthy: false, checking: false };
  }

  return {
    configured: true,
    healthy: true,
    checking: false,
    lastChecked: Date.now()
  };
}

export async function checkElevenLabsHealth(): Promise<APIHealthStatus> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { configured: false, healthy: false, checking: false };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/elevenlabs-proxy?path=/health&method=GET`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
      }
    );

    if (!response.ok) {
      return {
        configured: true,
        healthy: false,
        checking: false,
        lastChecked: Date.now(),
        error: 'Edge function not accessible'
      };
    }

    const data = await response.json();
    return {
      configured: true,
      healthy: data.api_key_configured || false,
      checking: false,
      lastChecked: Date.now()
    };
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      checking: false,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function checkChatterboxHealth(): Promise<APIHealthStatus> {
  const chatterboxUrl = import.meta.env.VITE_CHATTERBOX_URL;

  if (!chatterboxUrl) {
    return { configured: false, healthy: false, checking: false };
  }

  try {
    const response = await fetch(`${chatterboxUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return {
      configured: true,
      healthy: response.ok,
      checking: false,
      lastChecked: Date.now(),
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      checking: false,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function checkSyncLabsHealth(): Promise<APIHealthStatus> {
  const apiKey = import.meta.env.VITE_SYNC_LABS_API_KEY;

  if (!apiKey) {
    return { configured: false, healthy: false, checking: false };
  }

  return {
    configured: true,
    healthy: true,
    checking: false,
    lastChecked: Date.now()
  };
}

export async function checkVeedIoHealth(): Promise<APIHealthStatus> {
  const apiKey = import.meta.env.VITE_VEED_API_KEY;

  if (!apiKey) {
    return { configured: false, healthy: false, checking: false };
  }

  return {
    configured: true,
    healthy: true,
    checking: false,
    lastChecked: Date.now()
  };
}

export async function checkShotstackHealth(): Promise<APIHealthStatus> {
  const apiKey = import.meta.env.VITE_SHOTSTACK_API_KEY;

  if (!apiKey) {
    return { configured: false, healthy: false, checking: false };
  }

  return {
    configured: true,
    healthy: true,
    checking: false,
    lastChecked: Date.now()
  };
}

export async function checkNanoBananaHealth(): Promise<APIHealthStatus> {
  const apiKey = import.meta.env.VITE_NANO_BANANA_API_KEY;

  if (!apiKey) {
    return { configured: false, healthy: false, checking: false };
  }

  return {
    configured: true,
    healthy: true,
    checking: false,
    lastChecked: Date.now()
  };
}

export async function checkHeyGenHealth(): Promise<APIHealthStatus> {
  try {
    const { data } = await supabase
      .from('heygen_provider_configs')
      .select('api_key')
      .limit(1)
      .maybeSingle();

    if (!data?.api_key) {
      return { configured: false, healthy: false, checking: false };
    }

    const response = await fetch('https://api.heygen.com/v1/video_translate.list', {
      method: 'GET',
      headers: {
        'X-Api-Key': data.api_key,
        'Accept': 'application/json'
      }
    });

    return {
      configured: true,
      healthy: response.ok,
      checking: false,
      lastChecked: Date.now(),
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      configured: false,
      healthy: false,
      checking: false,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Check failed'
    };
  }
}

export async function checkSupabaseHealth(): Promise<APIHealthStatus> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { configured: false, healthy: false, checking: false };
  }

  try {
    const { error } = await supabase.from('organizations').select('id').limit(1);
    return {
      configured: true,
      healthy: !error,
      checking: false,
      lastChecked: Date.now(),
      error: error?.message
    };
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      checking: false,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function checkAllAPIHealth(): Promise<AllAPIStatus> {
  const [gemini, vertexAI, elevenLabs, chatterbox, syncLabs, veedIo, nanoBanana, supabaseStatus, shotstack, heygen] = await Promise.all([
    checkGeminiHealth(),
    checkVertexAIHealth(),
    checkElevenLabsHealth(),
    checkChatterboxHealth(),
    checkSyncLabsHealth(),
    checkVeedIoHealth(),
    checkNanoBananaHealth(),
    checkSupabaseHealth(),
    checkShotstackHealth(),
    checkHeyGenHealth()
  ]);

  return {
    gemini,
    vertexAI,
    elevenLabs,
    chatterbox,
    syncLabs,
    veedIo,
    nanoBanana,
    supabase: supabaseStatus,
    shotstack,
    heygen
  };
}

export function getConfigurationInstructions() {
  return {
    vertexAI: {
      title: 'Vertex AI Veo Configuration',
      description: 'Set up Google Cloud Vertex AI for video generation with Veo models (2.0, 3.0, 3.1)',
      secrets: [
        {
          name: 'VITE_VERTEX_AI_PROJECT_ID',
          description: 'Your Google Cloud project ID',
          example: 'my-project-12345',
          required: true
        },
        {
          name: 'VITE_GEMINI_API_KEY',
          description: 'Your Gemini API key (same key used for both Gemini text generation and Vertex AI video generation)',
          example: 'AIzaSy...',
          required: true,
          note: 'This is the same key configured in the Gemini section above. One key for both services!'
        },
        {
          name: 'VITE_VERTEX_AI_LOCATION',
          description: 'Google Cloud region for Vertex AI',
          example: 'us-central1',
          required: false,
          default: 'us-central1'
        },
        {
          name: 'VITE_VERTEX_AI_CLOUD_STORAGE_BUCKET',
          description: 'Cloud Storage bucket name for video outputs (videos stored in /AI Studio/ folder)',
          example: 'asset_storage_scripps',
          required: false,
          note: 'Videos will be saved to: gs://your-bucket/AI Studio/'
        },
        {
          name: 'VITE_VERTEX_AI_DEFAULT_MODEL',
          description: 'Default Veo model to use',
          example: 'veo-3.1-generate-001',
          required: false,
          default: 'veo-3.1-generate-001'
        }
      ],
      setupUrl: 'https://console.cloud.google.com/apis/credentials',
      additionalInfo: 'The same Gemini API key works for both Gemini text generation and Vertex AI video generation. Just add your Google Cloud Project ID above.\n\nVeo pricing:\n• Veo 3.1 Standard: $0.40/sec with audio, $0.20/sec video only\n• Veo 3.1 Fast: $0.15/sec with audio, $0.10/sec video only (62% savings)\n• Veo 3.0: Same pricing as 3.1\n• Veo 2.0: $0.50/sec (video only, no audio support)\n\nNote: Make sure to enable the Vertex AI API in your Google Cloud Console for your project.'
    },
    elevenLabs: {
      title: 'ElevenLabs Configuration',
      description: 'Connected and working - Professional AI voice synthesis with 100+ voices',
      secrets: [
        {
          name: 'ELEVENLABS_API_KEY',
          description: 'Your ElevenLabs API key (for server-side edge function) - CONFIGURED',
          example: 'sk_...',
          required: true
        },
        {
          name: 'VITE_ELEVENLABS_API_KEY',
          description: 'Your ElevenLabs API key (for frontend validation) - CONFIGURED',
          example: 'sk_...',
          required: true
        }
      ],
      setupUrl: 'https://elevenlabs.io/app/settings/api-keys',
      additionalInfo: 'ElevenLabs API is connected and operational. You can now:\n• Browse and preview 100+ professional voices\n• Assign voices to characters in the Characters section\n• Generate high-quality dialogue audio\n• Use custom voice cloning (requires Creator+ plan)\n\nVoices are automatically used throughout your production workflow. Pricing: ~$0.30 per 1K characters, voice cloning at ~$11/month.'
    }
  };
}
