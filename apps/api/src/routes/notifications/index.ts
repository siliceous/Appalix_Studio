/**
 * POST /notifications/push-token
 * Registers or refreshes an Expo push token for a user.
 * Called by the mobile app after the user grants notification permission.
 */
import type { FastifyInstance } from 'fastify'
import { supabase } from '../../lib/supabase.js'

interface PushTokenBody {
  userId:      string
  token:       string
  workspaceId: string
  platform?:   string
}

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: PushTokenBody }>('/push-token', async (request, reply) => {
    const { userId, token, workspaceId, platform = 'expo' } = request.body

    if (!userId || !token || !workspaceId) {
      return reply.status(400).send({ error: 'userId, token, and workspaceId are required' })
    }

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        { user_id: userId, workspace_id: workspaceId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' },
      )

    if (error) {
      fastify.log.error({ err: error, userId }, 'Failed to upsert push token')
      return reply.status(500).send({ error: 'Failed to register token' })
    }

    return reply.send({ ok: true })
  })
}
