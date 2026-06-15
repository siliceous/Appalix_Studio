import {
  VideoProviderInterface,
  GenerateVideoRequest,
  JobStatus,
  ProviderConfig,
  AspectRatio,
  VideoType,
  QualityMode,
} from '../types.js';

// Veo provider stub for Phase 2
// Full implementation will be added when Veo support is needed

export class VeoProvider implements VideoProviderInterface {
  private apiKey: string;
  private baseUrl: string = 'https://api.veoai.com';

  constructor(config: ProviderConfig) {
    if (!config.api_key) {
      throw new Error('Veo API key is required');
    }
    this.apiKey = config.api_key;
  }

  async generateVideo(params: GenerateVideoRequest & { job_id: string }) {
    throw new Error('Veo provider not yet implemented. Available in Phase 2.');
    // Unreachable return for type safety
    return { provider_job_id: '', estimated_duration_seconds: 0 };
  }

  async getStatus(provider_job_id: string, workspace_id: string): Promise<JobStatus> {
    throw new Error('Veo provider not yet implemented. Available in Phase 2.');
  }

  async downloadVideo(output_url: string): Promise<Buffer> {
    throw new Error('Veo provider not yet implemented. Available in Phase 2.');
  }

  async estimateCost(params: Partial<GenerateVideoRequest>): Promise<number> {
    // Veo credit-based pricing (ultra premium)
    // Veo is the most advanced model, costs ~3x Kling (18-36 credits/second)
    const duration = params.duration_seconds || 15;

    // Veo is ultra realistic, high cost
    const creditsPerSecond = 36; // Premium pricing
    const creditsNeeded = creditsPerSecond * duration;
    const costInUsd = creditsNeeded * 0.08; // Same $0.08/credit rate

    return Math.round(costInUsd * 10000) / 10000;
  }

  async cancelJob(provider_job_id: string): Promise<boolean> {
    throw new Error('Veo provider not yet implemented. Available in Phase 2.');
  }

  getCapabilities() {
    return {
      supports_video_types: ['text_to_video', 'image_to_video'] as VideoType[],
      supports_quality_modes: ['ultra_realistic'] as QualityMode[],
      supports_aspect_ratios: ['16:9'] as AspectRatio[],
      max_duration_seconds: 120,
      min_duration_seconds: 5,
    };
  }
}
