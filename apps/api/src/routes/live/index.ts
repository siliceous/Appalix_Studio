/**
 * POST /live/session
 *
 * Called by the Next.js dashboard (server-side) to mint a one-time voice
 * session token. Returns sessionId + the wss:// URL the browser connects to.
 *
 * Auth: X-Service-Key header must match SUPABASE_SERVICE_ROLE_KEY.
 */

import type { FastifyInstance } from 'fastify'
import { createSession }        from '../../live/session-manager.js'

interface VoiceConfig {
  voice_name?:              string
  language_code?:           string
  temperature?:             number
  output_transcription?:    boolean
  input_transcription?:     boolean
  enable_affective_dialog?: boolean
}

interface SessionBody {
  workspace_id:    string
  user_id:         string
  role?:           string
  user_name?:      string
  workspace_name?: string
  page_context?:   string
  voice_config?:   VoiceConfig | null
}

export async function liveRoutes(app: FastifyInstance) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  app.post<{ Body: SessionBody }>('/session', async (req, reply) => {
    // Service-key guard — only the dashboard backend may call this
    if (req.headers['x-service-key'] !== serviceKey) {
      return reply.status(401).send({ error: 'Unauthorised' })
    }

    const { workspace_id, user_id, role, user_name, workspace_name, page_context, voice_config } = req.body ?? {}

    if (!workspace_id || !user_id) {
      return reply.status(400).send({ error: 'workspace_id and user_id are required' })
    }

    const sessionId = createSession({
      workspaceId:   workspace_id,
      userId:        user_id,
      role:          role           ?? 'member',
      userName:      user_name      ?? 'Team member',
      workspaceName: workspace_name ?? 'Workspace',
      pageContext:   page_context   ?? 'Dashboard',
      voiceConfig:   voice_config   ?? null,
    })

    // Build the WebSocket URL from API_BASE_URL (http→ws, https→wss)
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001'
    const wsBase  = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws')

    return reply.send({
      sessionId,
      wsUrl: `${wsBase}/live/ws?session=${sessionId}`,
    })
  })
}
