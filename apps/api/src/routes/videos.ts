import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { VideoGenerationService } from '../modules/video-generation/video-generation.service.js';
import { getCurrentWorkspaceContext } from '../lib/workspace-context.js';

interface GenerateVideoBody {
  prompt: string;
  video_type: 'text_to_video' | 'image_to_video';
  aspect_ratio?: string;
  duration_seconds?: number;
  quality_mode?: 'fast' | 'pro_cinematic' | 'ultra_realistic';
  source_image_url?: string;
  social_platform?: string;
  workspace_id: string;
}

export async function videoRoutes(app: FastifyInstance) {
  /**
   * POST /videos/generate
   * Generate a new video
   */
  app.post<{ Body: GenerateVideoBody }>(
    '/generate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['prompt', 'video_type', 'workspace_id'],
          properties: {
            prompt: { type: 'string' },
            video_type: { type: 'string', enum: ['text_to_video', 'image_to_video'] },
            aspect_ratio: { type: 'string', enum: ['9:16', '16:9', '1:1', '4:3'] },
            duration_seconds: { type: 'number' },
            quality_mode: { type: 'string', enum: ['fast', 'pro_cinematic', 'ultra_realistic'] },
            source_image_url: { type: 'string' },
            social_platform: { type: 'string' },
            workspace_id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: GenerateVideoBody }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(request);
        const body = request.body as GenerateVideoBody;
        const { prompt, video_type, workspace_id, quality_mode, duration_seconds, aspect_ratio, source_image_url } = body;

        // SECURITY: Verify user can generate videos in this workspace
        if (context.workspaceId !== workspace_id) {
          return reply.status(403).send({ error: 'Access denied to this workspace' });
        }

        const service = new VideoGenerationService();
        const result = await service.generateVideo({
          prompt,
          video_type,
          workspace_id: context.workspaceId,
          user_id: context.userId,
          quality_mode,
          duration_seconds,
          aspect_ratio: (aspect_ratio || '9:16') as any,
          source_image_url,
        });

        return reply.status(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (message.includes('Insufficient credits')) {
          return reply.status(402).send({ error: message });
        }

        if (message.includes('Pro+')) {
          return reply.status(403).send({ error: message });
        }

        console.error('Video generation error:', error);
        return reply.status(500).send({ error: message });
      }
    }
  );

  /**
   * GET /videos
   * List videos for workspace
   */
  app.get<{ Querystring: { workspace_id: string; status?: string; limit?: string; offset?: string } }>(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['workspace_id'],
          properties: {
            workspace_id: { type: 'string' },
            status: { type: 'string' },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { workspace_id: string; status?: string; limit?: string; offset?: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(request);
        const query = request.query as { workspace_id: string; status?: string; limit?: string; offset?: string };
        const workspace_id = query.workspace_id;
        const status = query.status;
        const limit = parseInt(query.limit || '20', 10);
        const offset = parseInt(query.offset || '0', 10);

        // SECURITY: Verify user can list videos from this workspace
        if (context.workspaceId !== workspace_id) {
          return reply.status(403).send({ error: 'Access denied to this workspace' });
        }

        const service = new VideoGenerationService();
        const videos = await service.listVideos(context.workspaceId, {
          status,
          limit,
          offset,
        });

        return reply.status(200).send({ videos, count: videos.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('List videos error:', error);
        return reply.status(500).send({ error: message });
      }
    }
  );

  /**
   * GET /videos/:video_id
   * Get video details
   */
  app.get<{ Params: { video_id: string }; Querystring: { workspace_id: string } }>(
    '/:video_id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            video_id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { video_id: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(request);
        const { video_id } = request.params as { video_id: string };
        const query = request.query as { workspace_id: string };
        const workspace_id = query.workspace_id;

        // SECURITY: Verify user can access videos from this workspace
        if (context.workspaceId !== workspace_id) {
          return reply.status(403).send({ error: 'Access denied to this workspace' });
        }

        const service = new VideoGenerationService();
        const video = await service.getVideo(video_id, context.workspaceId);
        return reply.status(200).send(video);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(404).send({ error: message });
      }
    }
  );

  /**
   * DELETE /videos/:video_id
   * Delete video
   */
  app.delete<{ Params: { video_id: string }; Querystring: { workspace_id: string } }>(
    '/:video_id',
    {
      schema: {}
    },
    async (request: FastifyRequest<{ Params: { video_id: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(request);
        const { video_id } = request.params as { video_id: string };
        const query = request.query as { workspace_id: string };
        const workspace_id = query.workspace_id;

        // SECURITY: Verify user can delete videos from this workspace
        if (context.workspaceId !== workspace_id) {
          return reply.status(403).send({ error: 'Access denied to this workspace' });
        }

        const service = new VideoGenerationService();
        await service.deleteVideo(video_id, context.workspaceId);
        return reply.status(200).send({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({ error: message });
      }
    }
  );

  /**
   * GET /videos/:video_id/status
   * Check job status (for polling)
   */
  app.get<{ Params: { video_id: string } }>(
    '/:video_id/status',
    async (request: FastifyRequest<{ Params: { video_id: string } }>, reply: FastifyReply) => {
      try {
        const { video_id } = request.params as { video_id: string };

        const userId = (request.headers['x-user-id'] as string) || '';
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // TODO: Implement job status lookup
        // For now, return not implemented
        return reply.status(501).send({ error: 'Not implemented' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({ error: message });
      }
    }
  );
}
