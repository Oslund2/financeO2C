import { getElevenLabsService, type ElevenLabsVoice } from './elevenLabsService';
import { getChatterboxService, type ChatterboxVoice } from './chatterboxService';

export type VoiceProvider = 'elevenlabs' | 'chatterbox';

export interface UnifiedVoice {
  voice_id: string;
  name: string;
  provider: VoiceProvider;
  description?: string;
  preview_url?: string;
  metadata: {
    language?: string;
    gender?: string;
    age?: string;
    accent?: string;
    category?: string;
    is_cloned?: boolean;
  };
}

export interface VoiceGenerationOptions {
  speed?: number;
  pitch?: number;
  emotion?: string;
  stability?: number;
  similarity_boost?: number;
}

export class VoiceService {
  private elevenLabsService = getElevenLabsService();
  private chatterboxService = getChatterboxService();

  async getAllVoices(forceRefresh = false): Promise<UnifiedVoice[]> {
    const results = await Promise.allSettled([
      this.getElevenLabsVoices(forceRefresh),
      this.getChatterboxVoices(forceRefresh),
    ]);

    const allVoices: UnifiedVoice[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allVoices.push(...result.value);
      } else {
        console.warn('Failed to load voices from provider:', result.reason);
      }
    });

    return allVoices;
  }

  async getElevenLabsVoices(forceRefresh = false): Promise<UnifiedVoice[]> {
    try {
      const voices = await this.elevenLabsService.getVoices(forceRefresh);
      return voices.map((voice) => this.mapElevenLabsVoice(voice));
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      return [];
    }
  }

  async getChatterboxVoices(forceRefresh = false): Promise<UnifiedVoice[]> {
    try {
      const voices = await this.chatterboxService.getVoices(forceRefresh);
      return voices.map((voice) => this.mapChatterboxVoice(voice));
    } catch (error) {
      console.error('Error fetching Chatterbox voices:', error);
      return [];
    }
  }

  async getVoicesByProvider(
    provider: VoiceProvider,
    forceRefresh = false
  ): Promise<UnifiedVoice[]> {
    if (provider === 'elevenlabs') {
      return this.getElevenLabsVoices(forceRefresh);
    } else {
      return this.getChatterboxVoices(forceRefresh);
    }
  }

  async getVoiceById(voiceId: string, provider: VoiceProvider): Promise<UnifiedVoice | null> {
    try {
      if (provider === 'elevenlabs') {
        const voice = await this.elevenLabsService.getVoiceById(voiceId);
        return voice ? this.mapElevenLabsVoice(voice) : null;
      } else {
        const voice = await this.chatterboxService.getVoiceById(voiceId);
        return voice ? this.mapChatterboxVoice(voice) : null;
      }
    } catch (error) {
      console.error(`Error fetching voice ${voiceId} from ${provider}:`, error);
      return null;
    }
  }

  async generateSpeech(
    text: string,
    voiceId: string,
    provider: VoiceProvider,
    options: VoiceGenerationOptions = {}
  ): Promise<Blob> {
    if (provider === 'elevenlabs') {
      return this.elevenLabsService.generatePreview(voiceId, text);
    } else {
      return this.chatterboxService.generateSpeech(text, voiceId, {
        speed: options.speed,
        pitch: options.pitch,
        emotion: options.emotion,
      });
    }
  }

  async checkProviderHealth(): Promise<{
    elevenlabs: { available: boolean; error?: string };
    chatterbox: { available: boolean; error?: string };
  }> {
    const results = {
      elevenlabs: { available: false, error: undefined as string | undefined },
      chatterbox: { available: false, error: undefined as string | undefined },
    };

    try {
      await this.elevenLabsService.getVoices();
      results.elevenlabs.available = true;
    } catch (error) {
      results.elevenlabs.error =
        error instanceof Error ? error.message : 'ElevenLabs service unavailable';
    }

    try {
      const health = await this.chatterboxService.healthCheck();
      results.chatterbox.available = health.api_key_configured;
      if (!health.api_key_configured) {
        results.chatterbox.error = 'Chatterbox API key not configured';
      }
    } catch (error) {
      results.chatterbox.error =
        error instanceof Error ? error.message : 'Chatterbox service unavailable';
    }

    return results;
  }

  private mapElevenLabsVoice(voice: ElevenLabsVoice): UnifiedVoice {
    return {
      voice_id: voice.voice_id,
      name: voice.name,
      provider: 'elevenlabs',
      description: voice.description || voice.labels.description,
      preview_url: voice.preview_url,
      metadata: {
        gender: voice.labels.gender,
        age: voice.labels.age,
        accent: voice.labels.accent,
        category: voice.category,
        is_cloned: false,
      },
    };
  }

  private mapChatterboxVoice(voice: ChatterboxVoice): UnifiedVoice {
    return {
      voice_id: voice.voice_id,
      name: voice.name,
      provider: 'chatterbox',
      description: voice.description,
      preview_url: voice.preview_url,
      metadata: {
        language: voice.language,
        gender: voice.gender,
        age: voice.age_range,
        is_cloned: voice.is_cloned,
      },
    };
  }

  clearCache(): void {
    this.elevenLabsService.clearCache();
    this.chatterboxService.clearCache();
  }
}

let serviceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!serviceInstance) {
    serviceInstance = new VoiceService();
  }

  return serviceInstance;
}
