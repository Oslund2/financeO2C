import {
  LipSyncProvider,
  LipSyncJobParams,
  LipSyncJobResult,
  LipSyncJobStatus,
} from '../lipSyncService';

interface SyncLabsConfig {
  apiKey: string;
  apiEndpoint?: string;
}

export class SyncLabsProvider implements LipSyncProvider {
  name = 'sync_labs';
  private apiKey: string;
  private apiEndpoint: string;

  constructor(config: SyncLabsConfig) {
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint || 'https://api.synclabs.so/v1';
  }

  async submitJob(params: LipSyncJobParams): Promise<LipSyncJobResult> {
    const response = await fetch(`${this.apiEndpoint}/lipsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        audioUrl: params.audioUrl,
        imageUrl: params.imageUrl,
        synergize: params.settings?.synergize ?? true,
        maxIdleTime: params.settings?.maxIdleTime ?? 2.0,
        webhookUrl: params.settings?.webhookUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Sync Labs API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      providerJobId: data.id,
      estimatedCompletionTime: data.estimatedTime,
    };
  }

  async getJobStatus(jobId: string): Promise<LipSyncJobStatus> {
    const response = await fetch(`${this.apiEndpoint}/lipsync/${jobId}`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Sync Labs API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    const data = await response.json();

    let status: LipSyncJobStatus['status'] = 'queued';
    if (data.status === 'PROCESSING' || data.status === 'IN_PROGRESS') {
      status = 'processing';
    } else if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
      status = 'completed';
    } else if (data.status === 'FAILED' || data.status === 'ERROR') {
      status = 'failed';
    }

    return {
      status,
      videoUrl: data.videoUrl || data.outputUrl,
      errorMessage: data.error || data.errorMessage,
      progress: data.progress,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.apiEndpoint}/lipsync/${jobId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Sync Labs API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }
  }

  estimateCost(durationSeconds: number): number {
    const pricePerSecond = 0.02;
    return durationSeconds * pricePerSecond;
  }

  static async testConnection(apiKey: string, apiEndpoint?: string): Promise<boolean> {
    try {
      const endpoint = apiEndpoint || 'https://api.synclabs.so/v1';
      const response = await fetch(`${endpoint}/lipsync`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
        },
      });

      return response.ok || response.status === 401;
    } catch {
      return false;
    }
  }
}
