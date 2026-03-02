/**
 * POST /sage/emails/sync    — IMAP sync for workspace
 * POST /sage/emails/send    — SMTP send via connected account
 * POST /sage/emails/:id/rewrite — AI email rewrite
 *
 * All routes are server-to-server only (authenticated via X-Service-Key).
 */
import type { FastifyInstance } from 'fastify'
import { config }              from '../../config.js'
import { syncEmailsForWorkspace } from '../../services/sage-email-sync.js'
import { sendEmailSMTP }          from '../../services/sage-email-smtp.js'
import { callClaude }             from '../../services/ai/claude.js'

interface SyncBody   { workspace_id: string }
interface SendBody   { workspace_id: string; to: string; subject: string; body: string; reply_to_email_id?: string }
interface RewriteBody { workspace_id: string; body: string; instruction?: string }

function authCheck(req: { headers: { 'x-service-key'?: string } }): boolean {
  return req.headers['x-service-key'] === config.SUPABASE_SERVICE_ROLE_KEY
}

export async function sageEmailRoutes(fastify: FastifyInstance) {
  /**
   * POST /sage/emails/sync
   * Triggers IMAP sync for the workspace and runs AI analysis on new emails.
   */
  fastify.post<{ Body: SyncBody }>('/sync', async (request, reply) => {
    if (!authCheck(request)) return reply.status(401).send({ error: 'Unauthorised' })

    const { workspace_id } = request.body
    if (!workspace_id) return reply.status(400).send({ error: 'workspace_id is required' })

    try {
      const synced = await syncEmailsForWorkspace(workspace_id)
      return reply.send({ ok: true, synced })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      fastify.log.error({ err, workspace_id }, 'Email sync failed')
      return reply.status(500).send({ error: message })
    }
  })

  /**
   * POST /sage/emails/send
   * Sends an email using the workspace's connected Gmail/Outlook SMTP credentials.
   */
  fastify.post<{ Body: SendBody }>('/send', async (request, reply) => {
    if (!authCheck(request)) return reply.status(401).send({ error: 'Unauthorised' })

    const { workspace_id, to, subject, body, reply_to_email_id } = request.body
    if (!workspace_id || !to || !subject || !body) {
      return reply.status(400).send({ error: 'workspace_id, to, subject, body are required' })
    }

    try {
      await sendEmailSMTP({ workspaceId: workspace_id, to, subject, body, replyToEmailId: reply_to_email_id })
      return reply.send({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send failed'
      fastify.log.error({ err, workspace_id }, 'Email send failed')
      return reply.status(500).send({ error: message })
    }
  })

  /**
   * POST /sage/emails/:id/rewrite
   * Uses Claude to rewrite the provided email body according to an instruction.
   * Returns { body: string } — the rewritten email.
   */
  fastify.post<{ Params: { id: string }; Body: RewriteBody }>(
    '/:id/rewrite',
    async (request, reply) => {
      if (!authCheck(request)) return reply.status(401).send({ error: 'Unauthorised' })

      const { body, instruction = 'Rewrite this email to be clear, professional, and concise.' } = request.body
      if (!body) return reply.status(400).send({ error: 'body is required' })

      try {
        const result = await callClaude({
          model:       'claude-haiku-4-5-20251001',
          systemPrompt: 'You are an expert email editor. Rewrite the email body as instructed. Return ONLY the rewritten email body — no explanation, no subject line, no salutation changes unless instructed.',
          messages: [
            {
              role:    'user',
              content: `Instruction: ${instruction}\n\nEmail body to rewrite:\n\n${body}`,
            },
          ],
          maxTokens:   1024,
          temperature: 0.5,
        })

        return reply.send({ body: result.content.trim() })
      } catch (err) {
        fastify.log.error({ err }, 'Email rewrite failed')
        return reply.status(500).send({ error: 'AI rewrite failed' })
      }
    },
  )
}
