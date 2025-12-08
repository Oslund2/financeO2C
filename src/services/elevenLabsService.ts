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
      const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      };

      if (elevenLabsKey) {
        headers['X-Elevenlabs-Api-Key'] = elevenLabsKey;
      }

      const response = await fetch(
        `${this.edgeFunctionUrl}?path=/voices&method=GET`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Eleven Labs configuration.');
        }
        const errorData = await response.json().catch(() => ({}));
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
      const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      };

      if (elevenLabsKey) {
        headers['X-Elevenlabs-Api-Key'] = elevenLabsKey;
      }

      const response = await fetch(
        `${this.edgeFunctionUrl}?path=/text-to-speech/${voiceId}&method=POST`,
        {
          method: 'POST',
          headers,
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
