import {
  LipSyncProvider,
  LipSyncJobParams,
  LipSyncJobResult,
  LipSyncJobStatus,
} from '../lipSyncService';

interface VeedIoConfig {
  apiKey: string;
  apiEndpoint?: string;
}

export class VeedIoProvider implements LipSyncProvider {
  name = 'veed_io';
  private apiKey: string;
  private apiEndpoint: string;

  constructor(config: VeedIoConfig) {
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint || 'https://api.veed.io/v1';
  }

  async submitJob(params: LipSyncJobParams): Promise<LipSyncJobResult> {
    const response = await fetch(`${this.apiEndpoint}/lipsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        audio_url: params.audioUrl,
        image_url: params.imageUrl,
        webhook_url: params.settings?.webhookUrl,
        quality: params.settings?.quality || 'high',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `VEED.IO API error: ${response.status} - ${errorData.error || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      providerJobId: data.job_id || data.id,
      estimatedCompletionTime: data.estimated_time,
    };
  }

  async getJobStatus(jobId: string): Promise<LipSyncJobStatus> {
    const response = await fetch(`${this.apiEndpoint}/lipsync/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `VEED.IO API error: ${response.status} - ${errorData.error || response.statusText}`
      );
    }

    const data = await response.json();

    let status: LipSyncJobStatus['status'] = 'queued';
    if (data.status === 'processing' || data.status === 'in_progress') {
      status = 'processing';
    } else if (data.status === 'completed' || data.status === 'done') {
      status = 'completed';
    } else if (data.status === 'failed' || data.status === 'error') {
      status = 'failed';
    }

    return {
      status,
      videoUrl: data.output_url || data.video_url,
      errorMessage: data.error_message || data.error,
      progress: data.progress_percent,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.apiEndpoint}/lipsync/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `VEED.IO API error: ${response.status} - ${errorData.error || response.statusText}`
      );
    }
  }

  estimateCost(durationSeconds: number): number {
    const pricePerMinute = 1.0;
    const minutes = Math.ceil(durationSeconds / 60);
    return minutes * pricePerMinute;
  }

  static async testConnection(apiKey: string, apiEndpoint?: string): Promise<boolean> {
    try {
      const endpoint = apiEndpoint || 'https://api.veed.io/v1';
      const response = await fetch(`${endpoint}/account`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
