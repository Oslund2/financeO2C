export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  preview_url?: string;
  description?: string;
}

export interface VoicesResponse {
  voices: ElevenLabsVoice[];
}

export interface ElevenLabsHealthStatus {
  edge_function_deployed: boolean;
  api_key_configured: boolean;
  api_connectivity: boolean;
  error?: string;
  error_code?: string;
  instructions?: string;
  timestamp?: string;
}

export class ElevenLabsService {
  private cachedVoices: ElevenLabsVoice[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  private readonly edgeFunctionUrl: string;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured');
    }
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/elevenlabs-proxy`;
  }

  async checkHealth(): Promise<ElevenLabsHealthStatus> {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(
        `${this.edgeFunctionUrl}?path=/health&method=GET`,
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
          edge_function_deployed: false,
          api_key_configured: false,
          api_connectivity: false,
          error: 'Edge function not accessible',
          error_code: 'EDGE_FUNCTION_ERROR',
        };
      }

      const healthData = await response.json();

      return {
        edge_function_deployed: true,
        api_key_configured: healthData.api_key_configured || false,
        api_connectivity: healthData.api_key_configured || false,
        timestamp: healthData.timestamp,
      };
    } catch (error) {
      return {
        edge_function_deployed: false,
        api_key_configured: false,
        api_connectivity: false,
        error: error instanceof Error ? error.message : 'Failed to connect to edge function',
        error_code: 'EDGE_FUNCTION_UNREACHABLE',
        instructions: 'The ElevenLabs edge function needs to be deployed. Please deploy it from the Supabase Dashboard.',
      };
    }
  }

  async getVoices(forceRefresh = false): Promise<ElevenLabsVoice[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cachedVoices &&
      this.cacheTimestamp &&
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.cachedVoices;
    }

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(
        `${this.edgeFunctionUrl}?path=/voices&method=GET`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.error_code === 'MISSING_API_KEY') {
          throw new Error(errorData.instructions || 'ElevenLabs API key not configured in Supabase');
        }

        if (errorData.error_code === 'INVALID_API_KEY') {
          throw new Error('Invalid API key. ' + (errorData.instructions || 'Please check your Eleven Labs configuration.'));
        }

        if (errorData.instructions) {
          throw new Error(errorData.error + '. ' + errorData.instructions);
        }

        throw new Error(errorData.error || `Failed to fetch voices: ${response.statusText}`);
      }

      const data: VoicesResponse = await response.json();
      this.cachedVoices = data.voices || [];
      this.cacheTimestamp = now;

      return this.cachedVoices;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to Eleven Labs API');
    }
  }

  async getVoiceById(voiceId: string): Promise<ElevenLabsVoice | null> {
    const voices = await this.getVoices();
    return voices.find((v) => v.voice_id === voiceId) || null;
  }

  async generatePreview(voiceId: string, text: string): Promise<Blob> {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(
        `${this.edgeFunctionUrl}?path=/text-to-speech/${voiceId}&method=POST`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate preview: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate voice preview');
    }
  }

  async cloneVoice(
    name: string,
    files: File[],
    description?: string
  ): Promise<{ voice_id: string; name: string }> {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const formData = new FormData();
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }

      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(
        `${this.edgeFunctionUrl}?path=/voices/add&method=POST`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to clone voice: ${response.statusText}`);
      }

      const data = await response.json();

      this.clearCache();

      return {
        voice_id: data.voice_id,
        name: data.name || name,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to clone voice with ElevenLabs');
    }
  }

  clearCache(): void {
    this.cachedVoices = null;
    this.cacheTimestamp = null;
  }
}

let serviceInstance: ElevenLabsService | null = null;

export function getElevenLabsService(): ElevenLabsService {
  if (!serviceInstance) {
    serviceInstance = new ElevenLabsService();
  }

  return serviceInstance;
}
