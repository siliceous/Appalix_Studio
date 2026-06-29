import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { VideoGenerationService } from '../../modules/video-generation/video-generation.service.js';
import { walletService } from '../../services/wallet-service.js';
import { supabase } from '../../lib/supabase.js';

interface KlingWebhookPayload {
  task_id: string;
  request_id: string;
  task_status: 'succeed' | 'failed';
  task_result?: {
    videos: Array<{
      path: string;
      duration: number;
    }>;
  };
  data?: {
    error?: string;
  };
}

export async function klingWebhookRoutes(app: FastifyInstance) {
  /**
   * POST /webhooks/kling
   * Receive Kling video generation completion webhook
   */
  app.post<{ Body: KlingWebhookPayload }>(
    '/kling',
    {
      schema: {},
    },
    async (request: FastifyRequest<{ Body: KlingWebhookPayload }>, reply: FastifyReply) => {
      try {
        const payload = request.body as KlingWebhookPayload;
        const { task_id, task_status, task_result } = payload;

        if (!task_id) {
          return reply.status(400).send({ error: 'Missing task_id' });
        }

        // Find the job by provider_job_id
        const { data: job, error: jobError } = await supabase
          .from('video_generation_jobs')
          .select('*')
          .eq('provider_job_id', task_id)
          .single() as any;

        if (jobError || !job) {
          console.error('Kling webhook: Job not found for task_id:', task_id);
          return reply.status(404).send({ error: 'Job not found' });
        }

        // Update job status based on webhook
        if (task_status === 'succeed' && task_result?.videos && task_result.videos.length > 0) {
          const videoUrl = task_result.videos[0].path;
          const duration = task_result.videos[0].duration;

          // Update job
          await supabase
            .from('video_generation_jobs')
            .update({
              status: 'completed',
              progress_percent: 100,
              webhook_received: true,
              webhook_received_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            } as any)
            .eq('id', (job as any).id);

          // Update video
          const { data: video, error: videoError } = await supabase
            .from('video_generations')
            .select('estimated_cost_usd')
            .eq('id', (job as any).video_id)
            .single() as any;

          if (!videoError && video) {
            await supabase
              .from('video_generations')
              .update({
                status: 'ready',
                output_url: videoUrl,
                actual_cost_usd: (video as any).estimated_cost_usd,
                video_duration_seconds: duration,
              } as any)
              .eq('id', (job as any).video_id);

            // Cost was already deducted when generation started
            console.log(`Kling webhook: Video ${job.video_id} ready. Cost: $${video.estimated_cost_usd}`);
          }

          console.log('Kling webhook processed successfully for task_id:', task_id);
        } else if (task_status === 'failed') {
          const errorMessage = payload.data?.error || 'Kling generation failed';

          // Get video to retrieve cost for refund
          const { data: video } = await supabase
            .from('video_generations')
            .select('estimated_cost_usd')
            .eq('id', job.video_id)
            .single();

          // Refund the cost since generation failed
          if (video) {
            await walletService.refundBalance(
              (job as any).workspace_id,
              (video as any).estimated_cost_usd,
              `Refund: Kling generation failed - ${errorMessage}`,
              { video_id: (job as any).video_id, task_id }
            );
          }

          // Update job
          await supabase
            .from('video_generation_jobs')
            .update({
              status: 'failed',
              error_message: errorMessage,
              webhook_received: true,
              webhook_received_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            } as any)
            .eq('id', (job as any).id);

          // Update video
          await supabase
            .from('video_generations')
            .update({ status: 'failed' } as any)
            .eq('id', (job as any).video_id);

          console.error('Kling webhook: Generation failed for task_id:', task_id, 'Error:', errorMessage);
          if (video) {
            console.log(`Kling webhook: Cost refunded: $${video.estimated_cost_usd}`);
          }
        }

        // Always return 200 to acknowledge receipt (Kling requirement)
        return reply.status(200).send({ success: true });
      } catch (error) {
        console.error('Kling webhook error:', error);
        // Still return 200 to prevent Kling from retrying
        return reply.status(200).send({ error: 'Webhook processed with errors' });
      }
    }
  );
}
