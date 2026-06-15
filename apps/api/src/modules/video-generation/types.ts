// Video generation types and interfaces

export type VideoProvider = 'kling' | 'runway' | 'veo' | 'sora';
export type QualityMode = 'fast' | 'pro_cinematic' | 'ultra_realistic';
export type VideoType = 'text_to_video' | 'image_to_video' | 'ugc';
export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:3';
export type SocialPlatform = 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'generic';

export interface GenerateVideoRequest {
  workspace_id: string;
  prompt: string;
  video_type: VideoType;
  aspect_ratio?: AspectRatio;
  duration_seconds?: number;
  quality_mode?: QualityMode;
  source_image_url?: string; // For image-to-video
  social_platform?: SocialPlatform;
}

export interface VideoGenerationResponse {
  video_id: string;
  job_id: string;
  status: 'queued' | 'generating' | 'ready' | 'failed';
  provider: VideoProvider;
  estimated_cost_usd: number;
}

export interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percent?: number;
  output_url?: string;
  duration_seconds?: number;
  error_message?: string;
}

export interface VideoProviderInterface {
  /**
   * Generate a video based on prompt or image
   */
  generateVideo(params: GenerateVideoRequest & { job_id: string }): Promise<{
    provider_job_id: string;
    estimated_duration_seconds: number;
  }>;

  /**
   * Check the status of a generation job
   */
  getStatus(provider_job_id: string, workspace_id: string): Promise<JobStatus>;

  /**
   * Download the generated video
   */
  downloadVideo(output_url: string): Promise<Buffer>;

  /**
   * Estimate cost before generation
   */
  estimateCost(params: Partial<GenerateVideoRequest>): Promise<number>;

  /**
   * Cancel an in-progress job
   */
  cancelJob(provider_job_id: string, workspace_id: string): Promise<boolean>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): {
    supports_video_types: VideoType[];
    supports_quality_modes: QualityMode[];
    supports_aspect_ratios: AspectRatio[];
    max_duration_seconds: number;
    min_duration_seconds: number;
  };
}

export interface ProviderConfig {
  api_key?: string;
  api_secret?: string;
  webhook_secret?: string;
  base_url?: string;
  timeout_ms?: number;
}
