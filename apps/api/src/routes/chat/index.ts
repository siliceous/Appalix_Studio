import type { FastifyInstance } from 'fastify'
import { parseWebWidgetRequest, formatWebWidgetReply, isOriginAllowed } from '../../adapters/web-widget.js'
import { verifyCustomApiKey, parseCustomApiRequest, formatCustomApiReply } from '../../adapters/custom-api.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'
import { ingestSource } from '../../services/rag/ingestion.js'

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * GET /chat/config/:integrationId
   * Returns public widget configuration (welcome_message, bot name).
   * Safe to call unauthenticated — integration ID is the public token.
   */
  fastify.get<{ Params: { integrationId: string } }>(
    '/config/:integrationId',
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg            = integration.config as Record<string, unknown>
      const welcomeMessage = (cfg.welcome_message as string | undefined) ?? 'Hi there! How can I help you today?'

      return reply.send({ welcome_message: welcomeMessage })
    },
  )

  /**
   * POST /chat/:integrationId
   * Web widget direct chat endpoint.
   * Used by the embeddable JS widget (CORS-enabled per allowed_origins).
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/:integrationId',
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      if (integration.platform !== 'web_widget') {
        return reply.status(400).send({ error: 'This endpoint is for web_widget integrations only' })
      }

      const cfg            = integration.config as Record<string, unknown>
      const allowedOrigins = (cfg.allowed_origins as string[]) ?? []
      const origin         = request.headers.origin

      if (!isOriginAllowed(origin, allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'web_widget' as const,
        config:        cfg as Record<string, string>,
      }

      const incoming = parseWebWidgetRequest(request.body as never, ctx)
      if (!incoming) return reply.status(400).send({ error: 'Missing message' })

      try {
        const { reply: aiReply, conversationId } = await processMessage(incoming)
        return reply.send(formatWebWidgetReply({ text: aiReply }, conversationId))
      } catch (err) {
        console.error('[web-widget chat] processing error:', err)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  /**
   * POST /custom/:integrationId
   * Custom API endpoint for any bespoke integration.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/custom/:integrationId',
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg    = integration.config as Record<string, string>
      const apiKey = request.headers['x-api-key'] as string | undefined

      if (!verifyCustomApiKey(apiKey, cfg.api_key)) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'custom_api' as const,
        config:        cfg,
      }

      const remoteIp = request.ip
      const incoming = parseCustomApiRequest(request.body as never, ctx, remoteIp)
      if (!incoming) return reply.status(400).send({ error: 'Missing message or IP not allowed' })

      try {
        const { reply: aiReply, conversationId } = await processMessage(incoming)
        return reply.send(formatCustomApiReply({ text: aiReply }, conversationId))
      } catch (err) {
        console.error('[custom-api chat] processing error:', err)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  /**
   * POST /ingest/:sourceId
   * Trigger document ingestion for a source (called by the dashboard or a cron job).
   * Protected by the service-role API key header.
   */
  fastify.post<{ Params: { sourceId: string } }>(
    '/ingest/:sourceId',
    async (request, reply) => {
      const apiKey = request.headers['x-service-key'] as string | undefined
      if (apiKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      reply.status(202).send({ message: 'Ingestion started' })

      setImmediate(async () => {
        try {
          await ingestSource(request.params.sourceId)
        } catch (err) {
          console.error('[ingest] error:', err)
        }
      })
    },
  )
}
