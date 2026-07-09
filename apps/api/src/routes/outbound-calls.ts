/**
 * Outbound Call Routes
 * POST /calls/initiate — Start a single outbound call
 * POST /campaigns — Create a bulk outbound campaign
 * GET /campaigns/:id — Get campaign details
 * PATCH /campaigns/:id — Update campaign status
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../lib/supabase.js'
import { initiateOutboundCall } from '../services/outbound-calls.service.js'

// ── Type definitions ──────────────────────────────────────────────────────────

interface InitiateCallBody {
  workspace_id: string
  voice_agent_id: string
  to_phone_number: string
  contact_id?: string
  contact_data?: Record<string, unknown>
  custom_context?: Record<string, unknown>
}

interface CreateCampaignBody {
  workspace_id: string
  voice_agent_id: string
  name: string
  description?: string
  contact_list_url?: string
  total_contacts?: number
  calls_per_minute?: number
  retry_on_failure?: boolean
  max_retries?: number
  metadata?: Record<string, unknown>
}

// ── Middleware: workspace auth ────────────────────────────────────────────────

async function requireWorkspaceAuth(
  req: any,
  workspaceId: string,
): Promise<boolean> {
  const userId = req.user?.id
  if (!userId) return false

  const { count } = await supabase
    .from('workspace_members' as never)
    .select('id', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  return (count ?? 0) > 0
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function outboundCallRoutes(fastify: FastifyInstance) {
  /**
   * POST /calls/initiate
   * Initiates a single outbound call
   */
  fastify.post<{ Body: InitiateCallBody }>(
    '/calls/initiate',
    async (req, reply) => {
      const { workspace_id, voice_agent_id, to_phone_number, contact_id, contact_data, custom_context } = req.body

      // Validate required fields
      if (!workspace_id || !voice_agent_id || !to_phone_number) {
        return reply.status(400).send({
          error: 'Missing required fields: workspace_id, voice_agent_id, to_phone_number',
        })
      }

      // Auth check
      const authorized = await requireWorkspaceAuth(req, workspace_id)
      if (!authorized) {
        return reply.status(403).send({ error: 'Not authorized to access this workspace' })
      }

      try {
        const result = await initiateOutboundCall({
          toPhoneNumber: to_phone_number,
          voiceAgentId: voice_agent_id,
          workspaceId: workspace_id,
          contactId: contact_id,
          contactData: contact_data,
          customContext: custom_context,
        })

        if (!result) {
          return reply.status(500).send({ error: 'Failed to initiate call' })
        }

        return reply.send({
          ok: true,
          call_session_id: result.callSessionId,
          call_control_id: result.callControlId,
          to_phone_number: result.toPhoneNumber,
        })
      } catch (err) {
        fastify.log.error({ err, workspace_id }, 'initiate outbound call failed')
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  /**
   * POST /campaigns
   * Creates a new outbound campaign
   */
  fastify.post<{ Body: CreateCampaignBody }>(
    '/campaigns',
    async (req, reply) => {
      const {
        workspace_id,
        voice_agent_id,
        name,
        description,
        contact_list_url,
        total_contacts,
        calls_per_minute,
        retry_on_failure,
        max_retries,
        metadata,
      } = req.body

      // Validate
      if (!workspace_id || !voice_agent_id || !name) {
        return reply.status(400).send({
          error: 'Missing required fields: workspace_id, voice_agent_id, name',
        })
      }

      // Auth check
      const authorized = await requireWorkspaceAuth(req, workspace_id)
      if (!authorized) {
        return reply.status(403).send({ error: 'Not authorized to access this workspace' })
      }

      try {
        // Verify voice agent exists
        const { data: agent } = await supabase
          .from('voice_agents' as never)
          .select('id')
          .eq('id', voice_agent_id)
          .eq('workspace_id', workspace_id)
          .maybeSingle()

        if (!agent) {
          return reply.status(404).send({ error: 'Voice agent not found' })
        }

        // Create campaign
        const { data: campaign, error } = await supabase
          .from('outbound_campaigns' as never)
          .insert({
            workspace_id,
            voice_agent_id,
            name,
            description: description || null,
            contact_list_url: contact_list_url || null,
            total_contacts: total_contacts || 0,
            calls_per_minute: calls_per_minute ?? 5,
            retry_on_failure: retry_on_failure ?? true,
            max_retries: max_retries ?? 3,
            metadata: metadata || {},
            status: 'draft',
          })
          .select('id')
          .single() as {
            data: {
              id: string
            } | null
            error: unknown
          }

        if (error || !campaign) {
          fastify.log.error({ err: error }, 'create campaign failed')
          return reply.status(500).send({ error: 'Failed to create campaign' })
        }

        return reply.status(201).send({
          ok: true,
          campaign_id: campaign.id,
          status: 'draft',
        })
      } catch (err) {
        fastify.log.error({ err, workspace_id }, 'create campaign error')
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  /**
   * GET /campaigns/:id
   * Get campaign details and stats
   */
  fastify.get<{ Params: { id: string } }>(
    '/campaigns/:id',
    async (req, reply) => {
      const { id } = req.params

      try {
        const { data: campaign, error } = await supabase
          .from('outbound_campaigns' as never)
          .select(
            `id, workspace_id, voice_agent_id, name, description, status,
             contact_list_url, total_contacts, calls_per_minute,
             calls_initiated, calls_completed, calls_failed,
             avg_duration_sec, scheduled_start, scheduled_end,
             started_at, completed_at, metadata, created_at, updated_at`,
          )
          .eq('id', id)
          .maybeSingle() as {
            data: {
              workspace_id: string
            } | null
            error: unknown
          }

        if (error || !campaign) {
          return reply.status(404).send({ error: 'Campaign not found' })
        }

        // Auth check
        const authorized = await requireWorkspaceAuth(req, campaign.workspace_id)
        if (!authorized) {
          return reply.status(403).send({ error: 'Not authorized' })
        }

        return reply.send(campaign)
      } catch (err) {
        fastify.log.error({ err, id }, 'get campaign failed')
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  /**
   * PATCH /campaigns/:id
   * Update campaign status (draft → scheduled → running, pause, cancel, etc.)
   */
  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/campaigns/:id',
    async (req, reply) => {
      const { id } = req.params
      const updates = req.body

      // Whitelist allowed fields to update
      const allowedFields = [
        'status',
        'name',
        'description',
        'calls_per_minute',
        'retry_on_failure',
        'max_retries',
        'scheduled_start',
        'scheduled_end',
        'metadata',
      ]
      const sanitized = Object.fromEntries(
        Object.entries(updates).filter(([k]) => allowedFields.includes(k)),
      )

      try {
        const { data: campaign } = await supabase
          .from('outbound_campaigns' as never)
          .select('workspace_id')
          .eq('id', id)
          .maybeSingle() as {
            data: {
              workspace_id: string
            } | null
          }

        if (!campaign) {
          return reply.status(404).send({ error: 'Campaign not found' })
        }

        // Auth check
        const authorized = await requireWorkspaceAuth(req, campaign.workspace_id)
        if (!authorized) {
          return reply.status(403).send({ error: 'Not authorized' })
        }

        const { error } = await supabase
          .from('outbound_campaigns' as never)
          .update(sanitized)
          .eq('id', id)

        if (error) {
          const errMsg = error instanceof Error ? error.message : String(error)
          return reply.status(500).send({ error: errMsg })
        }

        return reply.send({ ok: true, id })
      } catch (err) {
        fastify.log.error({ err, id }, 'update campaign failed')
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )
}
