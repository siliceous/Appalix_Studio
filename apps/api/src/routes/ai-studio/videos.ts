import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { VideoGenerationService } from '../../modules/video-generation/video-generation.service.js'

interface GenerateVideoRequest {
  prompt: string
  duration_seconds?: number
  quality_mode?: 'fast' | 'pro_cinematic' | 'ultra_realistic'
  aspect_ratio?: string
  source_image_url?: string
}

export async function videoRoutes(app: FastifyInstance) {
  /**
   * POST /api/ai-studio/generate/video
   * Generate a new video (text-to-video or image-to-video)
   */
  app.post<{ Body: GenerateVideoRequest }>(
    '/generate/video',
    {
      schema: {
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string' },
            duration_seconds: { type: 'number' },
            quality_mode: { type: 'string', enum: ['fast', 'pro_cinematic', 'ultra_realistic'] },
            aspect_ratio: { type: 'string', enum: ['9:16', '16:9', '1:1', '4:3'] },
            source_image_url: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: GenerateVideoRequest }>, reply: FastifyReply) => {
      try {
        const workspaceId = request.headers['x-workspace-id'] as string
        const userId = request.headers['x-user-id'] as string

        if (!workspaceId) {
          return reply.status(400).send({ error: 'Missing workspace ID' })
        }

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }

        const { prompt, duration_seconds, quality_mode, aspect_ratio, source_image_url } = request.body

        if (!prompt?.trim()) {
          return reply.status(400).send({ error: 'Prompt is required' })
        }

        const service = new VideoGenerationService()
        const videoType = source_image_url ? 'image_to_video' : 'text_to_video'

        const result = await service.generateVideo({
          prompt,
          video_type: videoType,
          workspace_id: workspaceId,
          user_id: userId,
          quality_mode: quality_mode || 'fast',
          duration_seconds: duration_seconds || 15,
          aspect_ratio: (aspect_ratio || '9:16') as any,
          source_image_url,
        })

        return reply.status(200).send(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Video Generation] Error:', message)

        if (message.includes('Insufficient credits')) {
          return reply.status(402).send({ error: message })
        }

        if (message.includes('Pro+')) {
          return reply.status(403).send({ error: message })
        }

        return reply.status(500).send({ error: message })
      }
    }
  )

  /**
   * GET /api/ai-studio/videos
   * List all videos for workspace
   */
  app.get<{ Querystring: { limit?: string; offset?: string; status?: string } }>(
    '/videos',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
            offset: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string; status?: string } }>, reply: FastifyReply) => {
      try {
        const workspaceId = request.headers['x-workspace-id'] as string

        if (!workspaceId) {
          return reply.status(400).send({ error: 'Missing workspace ID' })
        }

        const service = new VideoGenerationService()
        const limit = parseInt(request.query.limit || '50')
        const offset = parseInt(request.query.offset || '0')

        const result = await service.listVideos({
          workspace_id: workspaceId,
          status: request.query.status as any,
          limit,
          offset,
        })

        return reply.send(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Video List] Error:', message)
        return reply.status(500).send({ error: message })
      }
    }
  )

  /**
   * GET /api/ai-studio/videos/:id
   * Get a specific video
   */
  app.get<{ Params: { id: string } }>(
    '/videos/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const workspaceId = request.headers['x-workspace-id'] as string
        const { id } = request.params

        if (!workspaceId) {
          return reply.status(400).send({ error: 'Missing workspace ID' })
        }

        const service = new VideoGenerationService()
        const result = await service.getVideo(id, workspaceId)

        if (!result) {
          return reply.status(404).send({ error: 'Video not found' })
        }

        return reply.send(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Video Get] Error:', message)
        return reply.status(500).send({ error: message })
      }
    }
  )

  /**
   * DELETE /api/ai-studio/videos/:id
   * Delete a video (soft delete)
   */
  app.delete<{ Params: { id: string } }>(
    '/videos/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const workspaceId = request.headers['x-workspace-id'] as string
        const userId = request.headers['x-user-id'] as string
        const { id } = request.params

        if (!workspaceId) {
          return reply.status(400).send({ error: 'Missing workspace ID' })
        }

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }

        const service = new VideoGenerationService()
        const result = await service.deleteVideo(id, workspaceId)

        if (!result) {
          return reply.status(404).send({ error: 'Video not found' })
        }

        return reply.send({ success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Video Delete] Error:', message)
        return reply.status(500).send({ error: message })
      }
    }
  )
}
