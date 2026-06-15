import {
  VideoProviderInterface,
  GenerateVideoRequest,
  JobStatus,
  ProviderConfig,
  AspectRatio,
  VideoType,
  QualityMode,
} from '../types.js';

// Runway provider stub for Phase 2
// Full implementation will be added when Runway support is needed

export class RunwayProvider implements VideoProviderInterface {
  private apiKey: string;
  private baseUrl: string = 'https://api.runwayml.com';

  constructor(config: ProviderConfig) {
    if (!config.api_key) {
      throw new Error('Runway API key is required');
    }
    this.apiKey = config.api_key;
  }

  async generateVideo(params: GenerateVideoRequest & { job_id: string }) {
    throw new Error('Runway provider not yet implemented. Available in Phase 2.');
    // Unreachable return for type safety
    return { provider_job_id: '', estimated_duration_seconds: 0 };
  }

  async getStatus(provider_job_id: string, workspace_id: string): Promise<JobStatus> {
    throw new Error('Runway provider not yet implemented. Available in Phase 2.');
  }

  async downloadVideo(output_url: string): Promise<Buffer> {
    throw new Error('Runway provider not yet implemented. Available in Phase 2.');
  }

  async estimateCost(params: Partial<GenerateVideoRequest>): Promise<number> {
    // Runway credit-based pricing (premium alternative)
    // Runway typically costs ~2x Kling, so 12-24 credits/second
    const duration = params.duration_seconds || 15;
    const qualityMode = params.quality_mode || 'fast';

    // Runway doesn't support 'fast' mode - starts at pro cinematic quality
    const creditsPerSecond = qualityMode === 'fast' ? 12 : 24;
    const creditsNeeded = creditsPerSecond * duration;
    const costInUsd = creditsNeeded * 0.08; // Same $0.08/credit rate for consistency

    return Math.round(costInUsd * 10000) / 10000;
  }

  async cancelJob(provider_job_id: string): Promise<boolean> {
    throw new Error('Runway provider not yet implemented. Available in Phase 2.');
  }

  getCapabilities() {
    return {
      supports_video_types: ['text_to_video', 'image_to_video'] as VideoType[],
      supports_quality_modes: ['pro_cinematic', 'ultra_realistic'] as QualityMode[],
      supports_aspect_ratios: ['9:16', '16:9', '1:1', '4:3'] as AspectRatio[],
      max_duration_seconds: 120,
      min_duration_seconds: 5,
    };
  }
}
