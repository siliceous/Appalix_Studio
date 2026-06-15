import { createClient } from '@supabase/supabase-js';
import { ProviderFactory } from './provider-factory.js';
import { GenerateVideoRequest, VideoGenerationResponse, VideoProvider } from './types.js';
import { walletService } from '../../services/wallet-service.js';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }
  return supabase;
}

export class VideoGenerationService {
  /**
   * Submit a new video generation request
   */
  async generateVideo(params: GenerateVideoRequest & { user_id: string }): Promise<VideoGenerationResponse> {
    const { workspace_id, prompt, video_type, user_id, quality_mode, duration_seconds, ...rest } = params;

    // Validate workspace access
    const { data: workspace, error: workspaceError } = await getSupabase()
      .from('workspaces')
      .select('id, plan')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      throw new Error('Workspace not found');
    }

    // Check if video generation is available for this plan (Pro+ only)
    if (!this.isPlanAllowed(workspace.plan)) {
      throw new Error('Video generation is only available for Pro+ plans');
    }

    // Get provider config (default to Kling for MVP)
    const provider: VideoProvider = 'kling';
    const config = {
      api_key: process.env.KLING_API_KEY,
      webhook_secret: process.env.KLING_WEBHOOK_SECRET,
    };

    // Estimate cost
    const videoProvider = ProviderFactory.getProvider(provider, config);
    const estimatedCost = await videoProvider.estimateCost(params);

    // Check user credits/wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallet_accounts')
      .select('balance')
      .eq('workspace_id', workspace_id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance < estimatedCost) {
      throw new Error(`Insufficient credits. Need $${estimatedCost.toFixed(4)}, have $${wallet.balance.toFixed(4)}`);
    }

    // Calculate credits needed
    const creditsPerSecond = this.getCreditsPerSecond(quality_mode || 'fast');
    const estimatedCredits = creditsPerSecond * (duration_seconds || 15);

    // Create video generation record
    const { data: video, error: videoError } = await supabase
      .from('video_generations')
      .insert({
        workspace_id,
        title: prompt.substring(0, 100), // Use first 100 chars of prompt as title
        prompt,
        video_type,
        quality_mode: quality_mode || 'fast',
        aspect_ratio: rest.aspect_ratio || '9:16',
        duration_seconds: duration_seconds || 15,
        status: 'queued',
        provider,
        estimated_cost_usd: estimatedCost,
        created_by: user_id,
      })
      .select('id')
      .single();

    if (videoError || !video) {
      throw new Error('Failed to create video record');
    }

    const videoId = video.id;

    // Create generation job
    const { data: job, error: jobError } = await supabase
      .from('video_generation_jobs')
      .insert({
        video_id: videoId,
        workspace_id,
        provider,
        status: 'pending',
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create generation job');
    }

    const jobId = job.id;

    // Submit to provider
    try {
      const result = await videoProvider.generateVideo({
        ...params,
        job_id: jobId,
      });

      // Update job with provider job ID
      await supabase
        .from('video_generation_jobs')
        .update({
          provider_job_id: result.provider_job_id,
          status: 'submitted',
        })
        .eq('id', jobId);

      // Update video with generating status
      await supabase
        .from('video_generations')
        .update({ status: 'generating' })
        .eq('id', videoId);

      // Deduct estimated cost from wallet immediately (optimistic billing)
      // If generation fails, cost will be refunded
      const deducted = await walletService.deductBalance(
        workspace_id,
        estimatedCost,
        'usage_deduction',
        `Video generation (${quality_mode || 'fast'} mode, ${duration_seconds}s)`,
        { video_id: videoId, provider, quality_mode }
      );

      if (!deducted) {
        // Shouldn't happen since we checked balance earlier, but handle it
        console.warn(`Failed to deduct wallet balance for video ${videoId}`);
      }

      return {
        video_id: videoId,
        job_id: jobId,
        status: 'generating',
        provider,
        estimated_cost_usd: estimatedCost,
      };
    } catch (error) {
      // Mark job as failed
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', jobId);

      await supabase
        .from('video_generations')
        .update({ status: 'failed' })
        .eq('id', videoId);

      throw error;
    }
  }

  /**
   * Get video details
   */
  async getVideo(videoId: string, workspaceId: string) {
    const { data, error } = await supabase
      .from('video_generations')
      .select('*')
      .eq('id', videoId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      throw new Error('Video not found');
    }

    return data;
  }

  /**
   * List videos for workspace
   */
  async listVideos(workspaceId: string, options?: { status?: string; limit?: number; offset?: number }) {
    let query = supabase
      .from('video_generations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete video (soft delete)
   */
  async deleteVideo(videoId: string, workspaceId: string) {
    const { error } = await supabase
      .from('video_generations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', videoId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error('Failed to delete video');
    }
  }

  /**
   * Check and update job status
   */
  async checkJobStatus(jobId: string) {
    // Get job
    const { data: job, error: jobError } = await supabase
      .from('video_generation_jobs')
      .select('*, video_generations(*)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // If already completed/failed, return early
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return job;
    }

    // Get provider and config
    const provider = ProviderFactory.getProvider(job.provider, {
      api_key: process.env.KLING_API_KEY,
    });

    // Check status with provider
    const status = await provider.getStatus(job.provider_job_id, job.workspace_id);

    // Update job based on provider status
    if (status.status === 'completed' && status.output_url) {
      // Download and store video
      const videoBuffer = await provider.downloadVideo(status.output_url);

      // TODO: Store in Supabase Storage (implement in next phase)
      // const { data: storageData, error: storageError } = await supabase
      //   .storage
      //   .from('video-generations')
      //   .upload(`${job.workspace_id}/${job.video_id}.mp4`, videoBuffer);

      // Update job and video with completion data
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'completed',
          progress_percent: 100,
          completed_at: new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      await supabase
        .from('video_generations')
        .update({
          status: 'ready',
          output_url: status.output_url,
          actual_cost_usd: job.video_generations.estimated_cost_usd,
          video_duration_seconds: status.duration_seconds || job.video_generations.duration_seconds,
        })
        .eq('id', job.video_id);

      // Cost was already deducted when job was created
      console.log(`Video ${job.video_id} completed. Cost deducted: $${job.video_generations.estimated_cost_usd}`);
    } else if (status.status === 'failed') {
      // Refund the deducted cost
      await walletService.refundBalance(
        job.workspace_id,
        job.video_generations.estimated_cost_usd,
        `Refund: Video generation failed (${job.video_generations.quality_mode} mode)`,
        { video_id: job.video_id, error: status.error_message }
      );

      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: status.error_message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      await supabase
        .from('video_generations')
        .update({ status: 'failed' })
        .eq('id', job.video_id);

      console.log(`Video ${job.video_id} failed. Cost refunded: $${job.video_generations.estimated_cost_usd}`);
    } else {
      // Still processing, update progress and next poll time
      await supabase
        .from('video_generation_jobs')
        .update({
          progress_percent: status.progress_percent || 50,
          last_polled_at: new Date().toISOString(),
          next_poll_at: new Date(Date.now() + 30000).toISOString(), // Poll again in 30s
        })
        .eq('id', jobId);
    }

    return job;
  }

  private isPlanAllowed(plan: string): boolean {
    // Video generation only for Pro+ plans
    return ['pro', 'team', 'enterprise'].includes(plan.toLowerCase());
  }

  private getCreditsPerSecond(qualityMode: string): number {
    switch (qualityMode) {
      case 'fast':
        return 6; // 720p
      case 'pro_cinematic':
        return 12; // 1080p with audio
      case 'ultra_realistic':
        return 18; // Premium
      default:
        return 6;
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
