import type { FastifyInstance } from 'fastify'
import { supabase }               from '../lib/supabase.js'
import { validateProfile, validateCampaign, getCompletionScore } from '../modules/compliance/smsComplianceValidationService.js'
import { recordStatusEvent }      from '../modules/compliance/smsComplianceStatusService.js'
import { recordOptOut, recordOptIn } from '../modules/compliance/smsOptOutService.js'
import { recordConsent, hasActiveConsent } from '../modules/compliance/smsConsentService.js'
import { getCountryRules }        from '../modules/compliance/countrySmsRulesService.js'

function authCheck(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  return req.headers['x-service-key'] === process.env.SUPABASE_SERVICE_ROLE_KEY
}

// Strip provider-internal fields from profile before sending to frontend
function sanitizeProfile(row: Record<string, unknown>) {
  const { ...safe } = row
  return safe
}

// Strip provider IDs from campaign
function sanitizeCampaign(row: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { provider_campaign_id, provider_raw_status, ...safe } = row
  return safe
}

export async function complianceRoutes(fastify: FastifyInstance) {

  // ── Profile ──────────────────────────────────────────────────────────────────

  fastify.get<{ Querystring: { workspaceId: string; countryCode?: string; complianceType?: string } }>(
    '/compliance/sms/profile',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId, countryCode = 'US', complianceType = 'A2P_10DLC' } = req.query

      const { data: profile } = await supabase
        .from('sms_compliance_profiles' as never)
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('country_code', countryCode)
        .eq('compliance_type', complianceType)
        .maybeSingle() as { data: Record<string, unknown> | null }

      if (!profile) return reply.send({ profile: null, brand: null, campaigns: [] })

      const [{ data: brandRow }, { data: campaigns }] = await Promise.all([
        supabase
          .from('sms_10dlc_brands' as never)
          .select('id, brand_status, vetting_score, rejection_reason, submitted_at, approved_at')
          .eq('workspace_id', workspaceId)
          .eq('compliance_profile_id', profile['id'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle() as Promise<{ data: Record<string, unknown> | null }>,
        supabase
          .from('sms_10dlc_campaigns' as never)
          .select('id, campaign_name, use_case, campaign_status, rejection_reason, submitted_at, approved_at, campaign_description, message_flow, sample_message_1, sample_message_2, sample_message_3, opt_in_message, opt_out_message, help_message, has_embedded_links, has_embedded_phone_numbers, age_gated_content')
          .eq('workspace_id', workspaceId)
          .eq('compliance_profile_id', profile['id'])
          .order('created_at', { ascending: false }) as Promise<{ data: Record<string, unknown>[] | null }>,
      ])

      return reply.send({
        profile:    sanitizeProfile(profile),
        brand:      brandRow ?? null,
        campaigns:  (campaigns ?? []).map(sanitizeCampaign),
        completionScore: getCompletionScore(profile, campaigns ?? []),
      })
    }
  )

  fastify.post<{ Body: Record<string, unknown> }>(
    '/compliance/sms/profile',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId, countryCode = 'US', complianceType = 'A2P_10DLC', ...fields } = req.body

      const { data: existing } = await supabase
        .from('sms_compliance_profiles' as never)
        .select('id, status')
        .eq('workspace_id', workspaceId as string)
        .eq('country_code', countryCode as string)
        .eq('compliance_type', complianceType as string)
        .maybeSingle() as { data: { id: string; status: string } | null }

      // Don't downgrade status if already in progress
      const protectedStatuses = ['submitted', 'pending_carrier_review', 'approved']
      const newStatus = existing && protectedStatuses.includes(existing.status)
        ? existing.status
        : (fields['status'] as string ?? 'draft')

      const payload = {
        workspace_id:   workspaceId,
        country_code:   countryCode,
        compliance_type: complianceType,
        status:         newStatus,
        updated_at:     new Date().toISOString(),
        ...fields,
      }

      const { data, error } = await supabase
        .from('sms_compliance_profiles' as never)
        .upsert(payload, { onConflict: 'workspace_id,country_code,compliance_type' })
        .select('id, status')
        .single() as { data: { id: string; status: string } | null; error: { message: string } | null }

      if (error) return reply.code(500).send({ error: error.message })
      return reply.send({ id: data!.id, status: data!.status })
    }
  )

  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/compliance/sms/profile/:id',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId, ...fields } = req.body

      const { data, error } = await supabase
        .from('sms_compliance_profiles' as never)
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('workspace_id', workspaceId as string)
        .select('id, status')
        .single() as { data: { id: string; status: string } | null; error: { message: string } | null }

      if (error) return reply.code(500).send({ error: error.message })
      return reply.send(data)
    }
  )

  fastify.post<{ Params: { id: string }; Body: { workspaceId: string } }>(
    '/compliance/sms/profile/:id/submit',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId } = req.body

      const { data: profile } = await supabase
        .from('sms_compliance_profiles' as never)
        .select('*')
        .eq('id', req.params.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle() as { data: Record<string, unknown> | null }

      if (!profile) return reply.code(404).send({ error: 'Profile not found' })

      const { valid, errors } = validateProfile(profile)
      if (!valid) return reply.code(422).send({ errors })

      const oldStatus = profile['status'] as string

      await supabase
        .from('sms_compliance_profiles' as never)
        .update({ status: 'ready_for_review', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', req.params.id)

      // Ensure brand record exists
      const { data: existingBrand } = await supabase
        .from('sms_10dlc_brands' as never)
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('compliance_profile_id', req.params.id)
        .maybeSingle() as { data: { id: string } | null }

      if (!existingBrand) {
        await supabase
          .from('sms_10dlc_brands' as never)
          .insert({ workspace_id: workspaceId, compliance_profile_id: req.params.id, provider: 'telnyx', brand_status: 'not_submitted' })
      }

      await recordStatusEvent({
        workspaceId,
        complianceProfileId: req.params.id,
        entityType:  'profile',
        entityId:    req.params.id,
        oldStatus,
        newStatus:   'ready_for_review',
        actorType:   'user',
      })

      return reply.send({ status: 'ready_for_review' })
    }
  )

  // ── Campaigns ────────────────────────────────────────────────────────────────

  fastify.get<{ Querystring: { workspaceId: string } }>(
    '/compliance/sms/campaigns',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { data } = await supabase
        .from('sms_10dlc_campaigns' as never)
        .select('id, campaign_name, use_case, campaign_status, campaign_description, message_flow, sample_message_1, sample_message_2, sample_message_3, opt_in_message, opt_out_message, help_message, has_embedded_links, has_embedded_phone_numbers, age_gated_content, rejection_reason, submitted_at, approved_at, created_at')
        .eq('workspace_id', req.query.workspaceId)
        .order('created_at', { ascending: false }) as { data: Record<string, unknown>[] | null }

      return reply.send({ campaigns: (data ?? []).map(sanitizeCampaign) })
    }
  )

  fastify.post<{ Body: Record<string, unknown> }>(
    '/compliance/sms/campaigns',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId, complianceProfileId, ...fields } = req.body

      const { data, error } = await supabase
        .from('sms_10dlc_campaigns' as never)
        .insert({ workspace_id: workspaceId, compliance_profile_id: complianceProfileId, campaign_status: 'draft', provider: 'telnyx', ...fields })
        .select('id, campaign_status')
        .single() as { data: { id: string; campaign_status: string } | null; error: { message: string } | null }

      if (error) return reply.code(500).send({ error: error.message })
      return reply.code(201).send(data)
    }
  )

  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/compliance/sms/campaigns/:id',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId, ...fields } = req.body

      const { data, error } = await supabase
        .from('sms_10dlc_campaigns' as never)
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('workspace_id', workspaceId as string)
        .select('id, campaign_status')
        .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

      if (error) return reply.code(500).send({ error: error.message })
      return reply.send(sanitizeCampaign(data!))
    }
  )

  fastify.post<{ Params: { id: string }; Body: { workspaceId: string } }>(
    '/compliance/sms/campaigns/:id/submit',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId } = req.body

      const { data: campaign } = await supabase
        .from('sms_10dlc_campaigns' as never)
        .select('*')
        .eq('id', req.params.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle() as { data: Record<string, unknown> | null }

      if (!campaign) return reply.code(404).send({ error: 'Campaign not found' })

      const { valid, errors } = validateCampaign(campaign)
      if (!valid) return reply.code(422).send({ errors })

      const oldStatus = campaign['campaign_status'] as string
      await supabase
        .from('sms_10dlc_campaigns' as never)
        .update({ campaign_status: 'ready_for_review', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', req.params.id)

      await recordStatusEvent({
        workspaceId,
        entityType: 'campaign',
        entityId:   req.params.id,
        oldStatus,
        newStatus:  'ready_for_review',
        actorType:  'user',
      })

      return reply.send({ campaign_status: 'ready_for_review' })
    }
  )

  // ── Status overview ───────────────────────────────────────────────────────────

  fastify.get<{ Querystring: { workspaceId: string } }>(
    '/compliance/sms/status',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId } = req.query

      const [{ data: profile }, { data: events }] = await Promise.all([
        supabase
          .from('sms_compliance_profiles' as never)
          .select('id, status, country_code, compliance_type, legal_business_name, submitted_at, approved_at, rejection_reason')
          .eq('workspace_id', workspaceId)
          .maybeSingle() as Promise<{ data: Record<string, unknown> | null }>,
        supabase
          .from('sms_compliance_status_events' as never)
          .select('entity_type, old_status, new_status, reason, actor_type, created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(5) as Promise<{ data: Record<string, unknown>[] | null }>,
      ])

      return reply.send({ profile, recentEvents: events ?? [] })
    }
  )

  fastify.get<{ Querystring: { country?: string } }>(
    '/compliance/sms/requirements',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const rules = getCountryRules(req.query.country ?? 'US')
      return reply.send({ rules })
    }
  )

  // ── Consent ───────────────────────────────────────────────────────────────────

  fastify.post<{ Body: Record<string, unknown> }>(
    '/compliance/sms/consent',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const { workspaceId, phoneE164, source, consentText, optInUrl, ipAddress, userAgent } = req.body
      const id = await recordConsent({
        workspaceId:  workspaceId as string,
        phoneE164:    phoneE164  as string,
        source:       source     as string,
        consentText:  consentText  as string | undefined,
        optInUrl:     optInUrl     as string | undefined,
        ipAddress:    ipAddress    as string | undefined,
        userAgent:    userAgent    as string | undefined,
      })
      return reply.send({ id })
    }
  )

  fastify.get<{ Params: { phone: string }; Querystring: { workspaceId: string } }>(
    '/compliance/sms/consent/:phone',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      const hasConsent = await hasActiveConsent(req.query.workspaceId, req.params.phone)
      return reply.send({ hasConsent })
    }
  )

  // ── Opt-out ───────────────────────────────────────────────────────────────────

  fastify.post<{ Body: { workspaceId: string; phoneE164: string; source: 'stop_keyword' | 'manual' | 'api' | 'complaint'; reason?: string } }>(
    '/compliance/sms/opt-out',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      await recordOptOut(req.body)
      return reply.send({ success: true })
    }
  )

  fastify.delete<{ Params: { phone: string }; Querystring: { workspaceId: string } }>(
    '/compliance/sms/opt-out/:phone',
    async (req, reply) => {
      if (!authCheck(req)) return reply.code(401).send({ error: 'Unauthorized' })
      await recordOptIn(req.query.workspaceId, req.params.phone)
      return reply.send({ success: true })
    }
  )

  // ── Telnyx compliance webhook ─────────────────────────────────────────────────

  // TODO: Verify Telnyx webhook signature before processing in production
  // See: https://developers.telnyx.com/docs/v2/call-control/receiving-webhooks
  fastify.post<{ Body: Record<string, unknown> }>(
    '/compliance/sms/webhooks/telnyx',
    async (req, reply) => {
      const event = req.body

      const mapStatus = (s: string): string => {
        if (s === 'REGISTERED' || s === 'VERIFIED') return 'approved'
        if (s === 'REJECTED')  return 'rejected'
        if (s === 'SUSPENDED') return 'suspended'
        if (s === 'PENDING')   return 'submitted'
        return s.toLowerCase()
      }

      const eventType = event['event_type'] as string | undefined

      if (eventType === 'brand.state_change') {
        const data       = event['data'] as Record<string, unknown>
        const brandId    = data?.['telnyx_brand_id'] as string
        const rawStatus  = data?.['status'] as string
        const newStatus  = mapStatus(rawStatus)

        if (brandId) {
          const { data: brand } = await supabase
            .from('sms_10dlc_brands' as never)
            .select('id, workspace_id, brand_status')
            .eq('provider_brand_id', brandId)
            .maybeSingle() as { data: { id: string; workspace_id: string; brand_status: string } | null }

          if (brand) {
            await supabase
              .from('sms_10dlc_brands' as never)
              .update({
                brand_status:       newStatus,
                provider_raw_status: data,
                approved_at:        newStatus === 'approved' ? new Date().toISOString() : null,
                updated_at:         new Date().toISOString(),
              })
              .eq('id', brand.id)

            await recordStatusEvent({
              workspaceId:         brand.workspace_id,
              entityType:          'brand',
              entityId:            brand.id,
              oldStatus:           brand.brand_status,
              newStatus,
              actorType:           'provider_webhook',
            })
          }
        }
      }

      if (eventType === 'campaign.state_change') {
        const data       = event['data'] as Record<string, unknown>
        const campaignId = data?.['telnyx_campaign_id'] as string
        const rawStatus  = data?.['status'] as string
        const newStatus  = mapStatus(rawStatus)

        if (campaignId) {
          const { data: campaign } = await supabase
            .from('sms_10dlc_campaigns' as never)
            .select('id, workspace_id, campaign_status')
            .eq('provider_campaign_id', campaignId)
            .maybeSingle() as { data: { id: string; workspace_id: string; campaign_status: string } | null }

          if (campaign) {
            await supabase
              .from('sms_10dlc_campaigns' as never)
              .update({
                campaign_status:    newStatus,
                provider_raw_status: data,
                approved_at:        newStatus === 'approved' ? new Date().toISOString() : null,
                updated_at:         new Date().toISOString(),
              })
              .eq('id', campaign.id)

            await recordStatusEvent({
              workspaceId: campaign.workspace_id,
              entityType:  'campaign',
              entityId:    campaign.id,
              oldStatus:   campaign.campaign_status,
              newStatus,
              actorType:   'provider_webhook',
            })
          }
        }
      }

      return reply.code(200).send({ received: true })
    }
  )
}
