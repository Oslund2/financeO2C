export interface ChatterboxVoice {
  voice_id: string;
  name: string;
  description?: string;
  language?: string;
  gender?: string;
  age_range?: string;
  preview_url?: string;
  is_cloned?: boolean;
  created_at?: string;
}

export interface VoiceCloneJob {
  job_id: string;
  voice_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  voice_id?: string;
  error_message?: string;
  created_at: string;
}

export interface TextToSpeechOptions {
  speed?: number;
  pitch?: number;
  emotion?: string;
}

export class ChatterboxService {
  private cachedVoices: ChatterboxVoice[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  private readonly serverUrl: string;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || this.getDefaultServerUrl();
  }

  private getDefaultServerUrl(): string {
    if (import.meta.env.VITE_CHATTERBOX_SERVER_URL) {
      return import.meta.env.VITE_CHATTERBOX_SERVER_URL;
    }

    if (import.meta.env.DEV) {
      return 'http://localhost:8001';
    }

    return '/api/chatterbox';
  }

  async healthCheck(): Promise<{ status: string; api_key_configured: boolean }> {
    try {
      const response = await fetch(`${this.serverUrl}/health`);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Chatterbox server unavailable: ${error.message}`
          : 'Failed to connect to Chatterbox server'
      );
    }
  }

  async getVoices(forceRefresh = false): Promise<ChatterboxVoice[]> {
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
      const response = await fetch(`${this.serverUrl}/voices`);

      if (!response.ok) {
        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Chatterbox API key not configured');
        }
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      this.cachedVoices = data.voices || [];
      this.cacheTimestamp = now;

      return this.cachedVoices;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to Chatterbox server');
    }
  }

  async getVoiceById(voiceId: string): Promise<ChatterboxVoice | null> {
    try {
      const response = await fetch(`${this.serverUrl}/voices/${voiceId}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch voice: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch voice details');
    }
  }

  async generateSpeech(
    text: string,
    voiceId: string,
    options: TextToSpeechOptions = {}
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.serverUrl}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          speed: options.speed || 1.0,
          pitch: options.pitch || 1.0,
          emotion: options.emotion || 'neutral',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to generate speech: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate speech');
    }
  }

  async cloneVoice(
    voiceName: string,
    audioFiles: File[],
    description?: string
  ): Promise<VoiceCloneJob> {
    if (!audioFiles || audioFiles.length === 0) {
      throw new Error('At least one audio file is required');
    }

    if (audioFiles.length > 10) {
      throw new Error('Maximum 10 audio files allowed');
    }

    try {
      const formData = new FormData();
      formData.append('voice_name', voiceName);

      if (description) {
        formData.append('description', description);
      }

      audioFiles.forEach((file) => {
        formData.append('audio_files', file);
      });

      const response = await fetch(`${this.serverUrl}/voices/clone`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to clone voice: ${response.statusText}`);
      }

      const result = await response.json();
      this.clearCache();

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to clone voice');
    }
  }

  async getCloneJobStatus(jobId: string): Promise<VoiceCloneJob> {
    try {
      const response = await fetch(`${this.serverUrl}/voices/clone/${jobId}/status`);

      if (response.status === 404) {
        throw new Error('Clone job not found');
      }

      if (!response.ok) {
        throw new Error(`Failed to get clone status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get clone job status');
    }
  }

  async deleteVoice(voiceId: string): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/voices/${voiceId}`, {
        method: 'DELETE',
      });

      if (response.status === 404) {
        throw new Error('Voice not found');
      }

      if (!response.ok) {
        throw new Error(`Failed to delete voice: ${response.statusText}`);
      }

      this.clearCache();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete voice');
    }
  }

  clearCache(): void {
    this.cachedVoices = null;
    this.cacheTimestamp = null;
  }
}

let serviceInstance: ChatterboxService | null = null;

export function getChatterboxService(): ChatterboxService {
  if (!serviceInstance) {
    serviceInstance = new ChatterboxService();
  }

  return serviceInstance;
}
