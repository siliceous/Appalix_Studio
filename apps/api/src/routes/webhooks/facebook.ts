import type { FastifyInstance } from 'fastify'
import {
  verifyFacebookSignature,
  parseFacebookEvents,
  sendFacebookReply,
} from '../../adapters/facebook.js'
import { processMessage, resolveIntegration, resolveIntegrationByConfig } from '../../services/processor.js'

export async function facebookRoutes(fastify: FastifyInstance) {
  /**
   * GET /webhooks/facebook
   * Global verification challenge — used when Appalix registers ONE webhook URL
   * for the entire Meta app. Verified via FACEBOOK_WEBHOOK_VERIFY_TOKEN env var.
   */
  fastify.get<{
    Querystring: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string }
  }>('/facebook', async (request, reply) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query
    const globalToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
    if (mode === 'subscribe' && globalToken && token === globalToken) {
      return reply.send(challenge)
    }
    return reply.status(403).send('Forbidden')
  })

  /**
   * POST /webhooks/facebook
   * Global handler — routes incoming events by page_id to the right integration.
   * Meta calls this URL when Appalix has registered a single app-level webhook.
   */
  fastify.post(
    '/facebook',
    { config: { rawBody: true } },
    async (request, reply) => {
      const body    = request.body as Record<string, unknown>
      const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(body)
      const appSecret = process.env.META_APP_SECRET ?? ''

      // Acknowledge immediately
      reply.status(200).send()

      console.log('[facebook global webhook] received body type:', (body as Record<string,unknown>).object)
      const entries = (body as never as { entry?: { id: string; messaging?: unknown[] }[] }).entry ?? []
      const pageId  = entries[0]?.id
      console.log('[facebook global webhook] page_id from entry:', pageId, '— entry count:', entries.length)
      if (!pageId) return

      const integration = await resolveIntegrationByConfig('facebook_messenger', 'page_id', pageId)
      if (!integration) {
        console.warn('[facebook global webhook] no integration found for page_id:', pageId)
        return
      }
      console.log('[facebook global webhook] matched integration:', integration.id)

      const cfg = integration.config as Record<string, string>

      const sigHeader = request.headers['x-hub-signature-256'] as string
      const secretUsed = cfg.app_secret || appSecret
      console.log('[facebook global webhook] verifying signature — has cfg.app_secret:', !!cfg.app_secret, 'has env META_APP_SECRET:', !!appSecret, 'has sig header:', !!sigHeader)
      if (!verifyFacebookSignature(rawBody, sigHeader, secretUsed)) {
        console.error('[facebook global webhook] invalid signature for page_id:', pageId)
        return
      }
      console.log('[facebook global webhook] signature verified')

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'facebook_messenger' as const,
        config:        cfg,
      }

      for (const incoming of parseFacebookEvents(request.body as never, ctx)) {
        setImmediate(async () => {
          try {
            const { reply: aiReply } = await processMessage(incoming)
            await sendFacebookReply({ text: aiReply }, incoming.platformUserId!, cfg.page_access_token)
          } catch (err) {
            console.error('[facebook global webhook] processing error:', err)
          }
        })
      }
    },
  )

  /**
   * GET /webhooks/facebook/:integrationId
   * Webhook verification challenge from Meta Developer Console.
   */
  fastify.get<{
    Params: { integrationId: string }
    Querystring: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string }
  }>('/facebook/:integrationId', async (request, reply) => {
    const integration = await resolveIntegration(request.params.integrationId)
    if (!integration) return reply.status(404).send('Not found')

    const cfg          = integration.config as Record<string, string>
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query

    if (mode === 'subscribe' && token === cfg.verify_token) {
      return reply.send(challenge)
    }
    return reply.status(403).send('Forbidden')
  })

  /**
   * POST /webhooks/facebook/:integrationId
   * Incoming Messenger messages.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/facebook/:integrationId',
    { config: { rawBody: true } },
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg    = integration.config as Record<string, string>
      const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)

      if (!verifyFacebookSignature(rawBody, request.headers['x-hub-signature-256'] as string, cfg.app_secret)) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      // Acknowledge immediately
      reply.status(200).send()

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'facebook_messenger' as const,
        config:        cfg,
      }

      const messages = parseFacebookEvents(request.body as never, ctx)

      for (const incoming of messages) {
        setImmediate(async () => {
          try {
            const { reply: aiReply } = await processMessage(incoming)
            await sendFacebookReply({ text: aiReply }, incoming.platformUserId!, cfg.page_access_token)
          } catch (err) {
            console.error('[facebook webhook] processing error:', err)
          }
        })
      }
    },
  )
}
