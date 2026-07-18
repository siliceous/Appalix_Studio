import {
  VideoProviderInterface,
  GenerateVideoRequest,
  JobStatus,
  ProviderConfig,
  AspectRatio,
  VideoType,
  QualityMode,
} from '../types.js';

interface KlingGenerateRequest {
  prompt: string;
  negative_prompt?: string;
  image_url?: string; // For image-to-video
  duration?: number;
  aspect_ratio?: string;
  cfq?: number; // Creative flexibility, 0-10
  model?: string;
}

interface KlingJobResponse {
  task_id: string;
  request_id: string;
  task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
  task_result?: {
    videos: Array<{
      path: string;
      duration: number;
    }>;
  };
}

export class KlingProvider implements VideoProviderInterface {
  private apiKey: string;
  private baseUrl: string = 'https://api.klingai.com';
  private timeout: number;

  constructor(config: ProviderConfig) {
    console.error('[KlingProvider Constructor] config.api_key:', config.api_key ? 'SET' : 'UNDEFINED', 'config:', config)
    if (!config.api_key) {
      throw new Error('Kling API key is required');
    }
    this.apiKey = config.api_key;
    this.timeout = config.timeout_ms || 30000;
  }

  async generateVideo(params: GenerateVideoRequest & { job_id: string }) {
    const klingParams: KlingGenerateRequest = {
      prompt: params.prompt,
      duration: params.duration_seconds || 15,
      aspect_ratio: this.normalizeAspectRatio(params.aspect_ratio || '9:16'),
      model: 'kling-v1',
    };

    console.log('[Kling generateVideo] Input duration_seconds:', params.duration_seconds, 'type:', typeof params.duration_seconds);
    console.log('[Kling generateVideo] Final klingParams.duration:', klingParams.duration, 'type:', typeof klingParams.duration);

    // For image-to-video requests
    if (params.video_type === 'image_to_video' && params.source_image_url) {
      klingParams.image_url = params.source_image_url;
    }

    // Quality mode maps to CFQ (Creative Flexibility Query)
    if (params.quality_mode) {
      klingParams.cfq = this.mapQualityToCFQ(params.quality_mode);
    }

    try {
      console.log('[Kling generateVideo] Sending params:', JSON.stringify(klingParams, null, 2));
      const response = await this.callKlingAPI('/v1/videos/text2video', {
        method: 'POST',
        body: JSON.stringify(klingParams),
      });

      if (response.task_status === 'failed') {
        throw new Error(`Kling API error: ${response.task_id}`);
      }

      return {
        provider_job_id: response.task_id,
        estimated_duration_seconds: params.duration_seconds || 15,
      };
    } catch (error) {
      console.error('[Kling generateVideo] Error:', error);
      console.error('[Kling generateVideo] Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to generate video with Kling: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatus(provider_job_id: string, workspace_id: string): Promise<JobStatus> {
    try {
      const response = await this.callKlingAPI(`/v1/videos/status?task_id=${provider_job_id}`, {
        method: 'GET',
      });

      const klingStatus = response.task_status;

      if (klingStatus === 'succeed' && response.task_result?.videos && response.task_result.videos.length > 0) {
        return {
          status: 'completed',
          progress_percent: 100,
          output_url: response.task_result.videos[0].path,
          duration_seconds: response.task_result.videos[0].duration,
        };
      }

      if (klingStatus === 'failed') {
        return {
          status: 'failed',
          error_message: 'Kling video generation failed',
        };
      }

      // Still processing
      return {
        status: 'processing',
        progress_percent: 50, // Kling doesn't provide granular progress
      };
    } catch (error) {
      console.error('Kling getStatus error:', error);
      return {
        status: 'failed',
        error_message: `Failed to check status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async downloadVideo(output_url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(output_url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async estimateCost(params: Partial<GenerateVideoRequest>): Promise<number> {
    // Credit-based pricing (Option C)
    // Credits per second based on quality mode, then convert to USD
    const duration = params.duration_seconds || 15;
    const qualityMode = params.quality_mode || 'fast';

    const creditsPerSecond: Record<QualityMode, number> = {
      fast: 6,           // 720p
      pro_cinematic: 12, // 1080p with audio
      ultra_realistic: 18, // Premium 1080p (future)
    };

    const creditsNeeded = (creditsPerSecond[qualityMode] || 6) * duration;
    const costInUsd = creditsNeeded * 0.08; // $0.08 per credit

    return Math.round(costInUsd * 10000) / 10000; // 4 decimal places
  }

  /**
   * Get credits needed for video generation
   */
  getCreditsNeeded(duration_seconds: number, quality_mode: QualityMode): number {
    const creditsPerSecond: Record<QualityMode, number> = {
      fast: 6,
      pro_cinematic: 12,
      ultra_realistic: 18,
    };

    return (creditsPerSecond[quality_mode] || 6) * duration_seconds;
  }

  async cancelJob(provider_job_id: string): Promise<boolean> {
    try {
      await this.callKlingAPI('/v1/videos/cancel', {
        method: 'POST',
        body: JSON.stringify({ task_id: provider_job_id }),
      });
      return true;
    } catch (error) {
      console.error('Kling cancelJob error:', error);
      return false;
    }
  }

  getCapabilities() {
    return {
      supports_video_types: ['text_to_video', 'image_to_video'] as VideoType[],
      supports_quality_modes: ['fast', 'pro_cinematic'] as QualityMode[],
      supports_aspect_ratios: ['9:16', '16:9', '1:1'] as AspectRatio[],
      max_duration_seconds: 60,
      min_duration_seconds: 5,
    };
  }

  private async callKlingAPI(endpoint: string, options: RequestInit) {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...((options.headers as Record<string, string>) || {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Kling API Error]', response.status, errorText);
        throw new Error(`Kling API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return response.json() as Promise<KlingJobResponse>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private normalizeAspectRatio(ratio: AspectRatio): string {
    // Kling uses string format like "9:16"
    return ratio;
  }

  private mapQualityToCFQ(mode: QualityMode): number {
    // CFQ (Creative Flexibility) 0-10, higher = more creative freedom
    // Map our quality modes to CFQ values
    switch (mode) {
      case 'fast':
        return 3; // Lower CFQ = faster, more constrained
      case 'pro_cinematic':
        return 6; // Medium CFQ = balanced
      case 'ultra_realistic':
        return 9; // Higher CFQ = more creative exploration
      default:
        return 3;
    }
  }
}
