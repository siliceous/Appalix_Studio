/**
 * POST /notifications/push-token
 * Registers or refreshes an Expo push token for a user.
 * Called by the mobile app after the user grants notification permission.
 * SECURITY: Validates user can register tokens for this workspace
 */
import type { FastifyInstance } from 'fastify'
import { supabase } from '../../lib/supabase.js'
import { getCurrentWorkspaceContext } from '../../lib/workspace-context.js'

interface PushTokenBody {
  userId:      string
  token:       string
  workspaceId: string
  platform?:   string
}

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: PushTokenBody }>('/push-token', async (request, reply) => {
    const context = await getCurrentWorkspaceContext(request)
    const { token, platform = 'expo' } = request.body

    if (!token) {
      return reply.status(400).send({ error: 'token is required' })
    }

    // SECURITY: Can only register tokens for authenticated user's workspace
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        { user_id: context.userId, workspace_id: context.workspaceId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' },
      )

    if (error) {
      fastify.log.error({ err: error, userId: context.userId }, 'Failed to upsert push token')
      return reply.status(500).send({ error: 'Failed to register token' })
    }

    return reply.send({ ok: true })
  })
}
