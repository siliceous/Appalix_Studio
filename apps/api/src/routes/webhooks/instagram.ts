import type { FastifyInstance } from 'fastify'
import {
  verifyInstagramSignature,
  parseInstagramEvents,
  sendInstagramReply,
} from '../../adapters/instagram.js'
import { processMessage, resolveIntegration, resolveIntegrationByConfig } from '../../services/processor.js'

export async function instagramRoutes(fastify: FastifyInstance) {
  /**
   * GET /webhooks/instagram
   * Global verification challenge — used when Appalix registers ONE webhook URL
   * for the entire Meta app. Verified via INSTAGRAM_WEBHOOK_VERIFY_TOKEN env var.
   */
  fastify.get<{
    Querystring: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string }
  }>('/instagram', async (request, reply) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query
    const globalToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
    if (mode === 'subscribe' && globalToken && token === globalToken) {
      return reply.send(challenge)
    }
    return reply.status(403).send('Forbidden')
  })

  /**
   * POST /webhooks/instagram
   * Global handler — routes by instagram_account_id to the right integration.
   */
  fastify.post(
    '/instagram',
    { config: { rawBody: true } },
    async (request, reply) => {
      reply.status(200).send()

      const body      = request.body as Record<string, unknown>
      const rawBody   = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(body)
      const appSecret = process.env.INSTAGRAM_APP_SECRET ?? process.env.META_APP_SECRET ?? ''

      console.log('[instagram global webhook] body:', JSON.stringify(body))

      const entries = (body as never as { entry?: { id: string; messaging?: unknown[] }[] }).entry ?? []
      const igAccountId = entries[0]?.id
      if (!igAccountId) {
        console.warn('[instagram global webhook] no igAccountId in payload')
        return
      }

      console.log('[instagram global webhook] igAccountId:', igAccountId)

      const integration = await resolveIntegrationByConfig('instagram', 'instagram_account_id', igAccountId)
      if (!integration) {
        console.warn('[instagram global webhook] no integration for ig_account_id:', igAccountId)
        return
      }

      const cfg = integration.config as Record<string, string>
      const sigHeader = request.headers['x-hub-signature-256'] as string
      const secretUsed = cfg.app_secret || appSecret
      if (!verifyInstagramSignature(rawBody, sigHeader, secretUsed)) {
        console.error('[instagram global webhook] invalid signature')
        return
      }

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'instagram' as const,
        config:        cfg,
      }

      for (const incoming of parseInstagramEvents(request.body as never, ctx)) {
        setImmediate(async () => {
          try {
            const { reply: aiReply } = await processMessage(incoming)
            await sendInstagramReply({ text: aiReply }, incoming.platformUserId!, cfg.access_token || cfg.page_access_token)
          } catch (err) {
            console.error('[instagram global webhook] processing error:', err)
          }
        })
      }
    },
  )

  /**
   * GET /webhooks/instagram/:integrationId
   * Per-integration webhook verification.
   */
  fastify.get<{
    Params: { integrationId: string }
    Querystring: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string }
  }>('/instagram/:integrationId', async (request, reply) => {
    const integration = await resolveIntegration(request.params.integrationId)
    if (!integration) return reply.status(404).send('Not found')

    const cfg = integration.config as Record<string, string>
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query

    if (mode === 'subscribe' && token === cfg.verify_token) {
      return reply.send(challenge)
    }
    return reply.status(403).send('Forbidden')
  })

  /**
   * POST /webhooks/instagram/:integrationId
   * Per-integration incoming DM handler.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/instagram/:integrationId',
    { config: { rawBody: true } },
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg     = integration.config as Record<string, string>
      const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)

      if (!verifyInstagramSignature(rawBody, request.headers['x-hub-signature-256'] as string, cfg.app_secret)) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      reply.status(200).send()

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'instagram' as const,
        config:        cfg,
      }

      for (const incoming of parseInstagramEvents(request.body as never, ctx)) {
        setImmediate(async () => {
          try {
            const { reply: aiReply } = await processMessage(incoming)
            await sendInstagramReply({ text: aiReply }, incoming.platformUserId!, cfg.access_token || cfg.page_access_token)
          } catch (err) {
            console.error('[instagram webhook] processing error:', err)
          }
        })
      }
    },
  )
}
